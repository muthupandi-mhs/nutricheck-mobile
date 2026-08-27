import { Platform } from 'react-native';

/**
 * Which backend the app talks to.
 *
 * There is no mock: the app talks to a real API or to nothing. Switching this
 * constant is the whole mechanism — no env files, no build flavours, no extra
 * dependency to keep current.
 *
 *   'staging' — the deployed box. Works from anywhere, on Wi-Fi or mobile data,
 *               with no cable and no adb. Use this unless you are changing the
 *               backend itself.
 *
 *   'local'   — the API running on your own machine. Needed when the change you
 *               are testing has not been deployed yet.
 */
type Backend = 'staging' | 'local';

// The cast is load-bearing. Without it TypeScript narrows this const to the
// literal 'staging', and every comparison against the other value becomes an
// error about types with no overlap -- so flipping the switch, the one thing
// this file exists to let you do, would not compile.
const BACKEND = 'local' as Backend;

/**
 * Staging, over HTTPS with a real Let's Encrypt certificate.
 *
 * The hostname encodes the instance's static IP: sslip.io resolves
 * 3-6-120-121.sslip.io to 3.6.120.121 with nothing to configure. It is a
 * genuinely resolvable name, which is what lets Caddy hold a real certificate
 * for it — and that matters more than saving the price of a domain.
 * React Native sets android:usesCleartextTraffic true for debug builds and
 * FALSE for release, so a plain-http staging URL would work on your desk and
 * fail in the first release build anyone installed -- with no error beyond a
 * socket that never connects. Avoiding that is worth more than the certificate.
 *
 * If the instance's static IP ever changes, this hostname and DOMAIN in the
 * server's .env.staging must both change with it. Nothing detects the mismatch:
 * the app simply times out, which looks exactly like the server being down.
 */
const STAGING_BASE_URL = 'https://3-6-120-121.sslip.io';

/**
 * Local, and `localhost` here is the DEVICE, never the machine running Metro —
 * so this only works through a tunnel or an alias. Getting it wrong surfaces as
 * "No connection" on the sign-in screen, which looks like a server outage and
 * is not one.
 *
 * **USB device** — `npm run android` and `npm start` bind this for you via
 * scripts/dev-tunnel.js. By hand, and again after any unplug or
 * `adb kill-server`:
 *
 *     adb reverse tcp:3000 tcp:3000
 *
 * That forwards the phone's `localhost:3000` down the cable to the host. It
 * needs no Wi-Fi, crosses no firewall, and works while the phone is on mobile
 * data — which a LAN address cannot do.
 *
 * **Android emulator** — `10.0.2.2` is its alias for the host loopback.
 * **iOS simulator** — shares the host's loopback, so `localhost` is right.
 * **Wi-Fi device, no cable** — put the host's LAN address here instead (find it
 * with `ipconfig`), keep the phone on the same network, and expect to allow
 * inbound TCP 3000 through the host firewall.
 */
const ADB_REVERSE = true;

const LOCAL_BASE_URL = ADB_REVERSE
  ? 'http://localhost:3000'
  : Platform.select({
      android: 'http://10.0.2.2:3000',
      default: 'http://localhost:3000',
    })!;

export const API_BASE_URL =
  BACKEND === 'staging' ? STAGING_BASE_URL : LOCAL_BASE_URL;

/**
 * True when pointed at a machine only reachable over the cable. The tunnel
 * scripts are harmless against staging — dev-tunnel.js exits quietly with no
 * device attached — but this says plainly which mode is live.
 */
export const NEEDS_ADB_TUNNEL = BACKEND === 'local' && ADB_REVERSE;

// Tests use a flat stub in `__tests__/fixtures/stubApi.ts` for rendering, and a
// stubbed `fetch` in `httpApi.test.ts` for behaviour. The old fixtures could
// never prove anything about the transport — they emitted bare problem slugs,
// ignored timezones and never rotated a refresh token, three of the failure
// modes that only appear against the real server (GAP-REPORT.STATUS.md §4).
