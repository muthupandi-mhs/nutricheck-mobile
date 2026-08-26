package com.nutricheck.recorder

import android.media.MediaRecorder
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Base64
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.File

/**
 * Audio capture for server-side dictation.
 *
 * Written here rather than pulled from npm on purpose. Two third-party
 * recorders were tried first: one from 2021 that needed five patches to build
 * at all, and a Nitro-based one whose prebuilt `.so` wanted a libc++ symbol its
 * own pinned runtime did not export — that one crashed the app in
 * `PackageList.getPackages()`, before any JS ran. Both failures were ABI
 * mismatches in code we did not control. This module has no native dependency
 * beyond the platform's own MediaRecorder, so there is nothing left to
 * mismatch.
 *
 * Deliberately small: start, stop, cancel. Everything else — when to record,
 * which language, what to do with the words — is a JS decision.
 */
class RecorderModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  /**
   * No `RCT` prefix.
   *
   * The old bridge stripped `RCT`/`RK` from module names natively, so a module
   * called `RCTFoo` was reachable as `NativeModules.Foo`. The New Architecture
   * does not strip it, which is exactly how the voice library ended up null on
   * this app. Naming it plainly means both architectures agree.
   */
  override fun getName() = NAME

  private var recorder: MediaRecorder? = null
  private var outputFile: File? = null
  private var startedAtMs: Long = 0

  private val meterHandler = Handler(Looper.getMainLooper())

  /**
   * Reports how loud the mic is, so JS can tell talking from silence and end
   * the turn without a button.
   *
   * The decision itself deliberately does NOT live here. It is a state machine
   * with real edge cases — a single noise blip must not count as speech, a
   * pause mid-sentence must not count as the end — and in JS it can be unit
   * tested against a plain counter instead of a live microphone. This side only
   * reports a number.
   *
   * `getMaxAmplitude()` returns the peak since the previous call, which makes
   * these samples non-overlapping windows rather than instantaneous readings —
   * exactly what a duration-based detector wants.
   */
  private val meter =
    object : Runnable {
      override fun run() {
        val active = recorder ?: return
        val amplitude = runCatching { active.getMaxAmplitude() }.getOrDefault(0)
        reactApplicationContext
          .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
          .emit(EVENT_AMPLITUDE, amplitude.toDouble())
        meterHandler.postDelayed(this, METER_INTERVAL_MS)
      }
    }

  /**
   * Required by `NativeEventEmitter`, which warns loudly without them. No-ops
   * because the meter runs off the recorder's own lifecycle, not off how many
   * listeners happen to be attached.
   */
  @ReactMethod fun addListener(@Suppress("UNUSED_PARAMETER") eventName: String) = Unit

  @ReactMethod fun removeListeners(@Suppress("UNUSED_PARAMETER") count: Int) = Unit

  /** AAC in ADTS: what the device encodes cheaply, and an accepted upload type. */
  @ReactMethod
  fun start(promise: Promise) {
    if (recorder != null) {
      promise.reject(E_BUSY, "already recording")
      return
    }

    val file = File(reactApplicationContext.cacheDir, "dictation.aac")
    // A clip left behind by a process death must never be uploaded as if it
    // were the thing just said.
    file.delete()

    val created =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        MediaRecorder(reactApplicationContext)
      } else {
        @Suppress("DEPRECATION")
        MediaRecorder()
      }

    try {
      created.apply {
        // VOICE_RECOGNITION, not MIC: it disables the aggressive AGC and noise
        // suppression tuned for phone calls, which chew the consonants a
        // transcriber needs.
        setAudioSource(MediaRecorder.AudioSource.VOICE_RECOGNITION)
        setOutputFormat(MediaRecorder.OutputFormat.AAC_ADTS)
        setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
        // 16 kHz mono at 32 kbps. Speech models resample to 16 kHz anyway, and
        // every extra kilobyte is billed and travels on the user's connection.
        setAudioSamplingRate(16_000)
        setAudioEncodingBitRate(32_000)
        setAudioChannels(1)
        // A hard stop well inside the server's 2 MB limit, so a forgotten
        // recording ends by itself instead of failing on upload.
        setMaxDuration(MAX_DURATION_MS)
        setOutputFile(file.absolutePath)
        prepare()
        start()
      }
    } catch (error: Exception) {
      runCatching { created.release() }
      file.delete()
      promise.reject(E_START, error.message ?: "could not start recording", error)
      return
    }

    recorder = created
    outputFile = file
    startedAtMs = System.currentTimeMillis()
    // First reading is discarded by the detector anyway: getMaxAmplitude() is
    // relative to the previous call, and there has not been one yet.
    meterHandler.postDelayed(meter, METER_INTERVAL_MS)
    promise.resolve(null)
  }

  /**
   * Stop and hand back the clip, base64-encoded.
   *
   * The file is deleted before this resolves, always. A recording of somebody
   * saying what they ate is health-adjacent, and it has no reason to outlive
   * the request that consumes it.
   */
  @ReactMethod
  fun stop(promise: Promise) {
    val active = recorder
    val file = outputFile
    if (active == null || file == null) {
      promise.reject(E_IDLE, "not recording")
      return
    }

    meterHandler.removeCallbacks(meter)
    val durationMs = (System.currentTimeMillis() - startedAtMs).toDouble()
    recorder = null
    outputFile = null

    try {
      // `stop()` throws if the clip is too short to have written a frame —
      // a tap-and-immediately-release. There is nothing to transcribe then,
      // and it is not an error worth showing anyone.
      active.stop()
    } catch (_: Exception) {
      runCatching { active.release() }
      file.delete()
      promise.resolve(null)
      return
    }

    runCatching { active.release() }

    try {
      val bytes = file.readBytes()
      if (bytes.isEmpty()) {
        promise.resolve(null)
        return
      }
      val result = Arguments.createMap().apply {
        putString("base64", Base64.encodeToString(bytes, Base64.NO_WRAP))
        putDouble("durationMs", durationMs)
        putDouble("bytes", bytes.size.toDouble())
      }
      promise.resolve(result)
    } catch (error: Exception) {
      promise.reject(E_READ, error.message ?: "could not read the recording", error)
    } finally {
      file.delete()
    }
  }

  /** Abandon a clip without reading it. Used when the user backs out. */
  @ReactMethod
  fun cancel(promise: Promise) {
    meterHandler.removeCallbacks(meter)
    val active = recorder
    val file = outputFile
    recorder = null
    outputFile = null

    if (active != null) {
      runCatching { active.stop() }
      runCatching { active.release() }
    }
    file?.delete()
    promise.resolve(null)
  }

  /** Releases the mic if JS goes away mid-recording — a reload, a crash. */
  override fun invalidate() {
    meterHandler.removeCallbacks(meter)
    recorder?.let {
      runCatching { it.stop() }
      runCatching { it.release() }
    }
    recorder = null
    outputFile?.delete()
    outputFile = null
    super.invalidate()
  }

  companion object {
    const val NAME = "NutriCheckRecorder"
    const val EVENT_AMPLITUDE = "NutriCheckRecorder:amplitude"
    /** ~10 samples a second: fine enough for a 300ms confirmation, cheap on the bridge. */
    private const val METER_INTERVAL_MS = 100L
    private const val MAX_DURATION_MS = 45_000
    private const val E_BUSY = "E_BUSY"
    private const val E_IDLE = "E_IDLE"
    private const val E_START = "E_START"
    private const val E_READ = "E_READ"
  }
}
