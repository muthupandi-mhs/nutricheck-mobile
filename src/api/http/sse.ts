/**
 * A minimal SSE reader built on XMLHttpRequest.
 *
 * React Native's `fetch` is a polyfill over XHR and does not give you a
 * readable `response.body`, so the standard streaming idiom does not work here.
 * XHR's `onprogress` does: `responseText` grows as frames arrive, and reading
 * the delta each time yields the stream.
 *
 * `EventSource` is not an option either — it is GET-only and cannot carry an
 * Authorization header, and /v1/resolve is an authenticated POST.
 */

export type SseFrame = { event: string; data: string };

export type SseOptions = {
  url: string;
  body: unknown;
  headers?: Record<string, string>;
  onFrame: (frame: SseFrame) => void;
  signal?: AbortSignal;
};

/**
 * Resolves when the stream ends cleanly. Rejects with the HTTP status and body
 * when the server refused before streaming started — a 429 from the quota
 * guard arrives that way, and the sheet needs it as a problem document rather
 * than as an empty stream.
 */
export function streamSse(options: SseOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', options.url, true);

    xhr.setRequestHeader('content-type', 'application/json');
    // Asking for the stream explicitly: the same route returns a single JSON
    // draft when the Accept header says application/json.
    xhr.setRequestHeader('accept', 'text/event-stream');
    for (const [key, value] of Object.entries(options.headers ?? {})) {
      xhr.setRequestHeader(key, value);
    }

    // How much of responseText has already been turned into frames. XHR hands
    // back the WHOLE body every time, not the delta.
    let consumed = 0;

    const drain = () => {
      const text = xhr.responseText;
      if (text.length === consumed) return;

      const pending = text.slice(consumed);
      // A frame ends at a blank line. Anything after the last one is a partial
      // frame still arriving, so leave it in the buffer for the next progress
      // event rather than parsing half a JSON payload.
      const lastBreak = pending.lastIndexOf('\n\n');
      if (lastBreak === -1) return;

      const complete = pending.slice(0, lastBreak);
      consumed += lastBreak + 2;

      for (const block of complete.split('\n\n')) {
        const frame = parseFrame(block);
        if (frame) options.onFrame(frame);
      }
    };

    xhr.onprogress = () => {
      if (xhr.status >= 400) return; // handled once onload has the full body
      drain();
    };

    xhr.onload = () => {
      if (xhr.status >= 400) {
        reject({ status: xhr.status, body: safeJson(xhr.responseText) });
        return;
      }
      drain();
      resolve();
    };

    xhr.onerror = () => reject({ status: 0, body: null });
    xhr.ontimeout = () => reject({ status: 0, body: null });
    xhr.onabort = () => reject({ status: 0, body: null, aborted: true });

    options.signal?.addEventListener('abort', () => xhr.abort());

    xhr.send(JSON.stringify(options.body));
  });
}

/**
 * One `event:` line and one `data:` line is all this server emits, so this
 * handles that shape and ignores comments and `id:`/`retry:` rather than
 * implementing the whole grammar for frames that never arrive.
 */
function parseFrame(block: string): SseFrame | null {
  let event = 'message';
  const data: string[] = [];

  for (const line of block.split('\n')) {
    if (line.startsWith(':')) continue; // keep-alive comment
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) data.push(line.slice(5).trim());
  }

  if (data.length === 0) return null;
  return { event, data: data.join('\n') };
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
