import { Platform } from 'react-native';

/**
 * Where the API lives.
 *
 * `localhost` is the DEVICE, never the machine running Metro — so this only
 * works because of a tunnel or an alias. Pick the one matching how the app is
 * being run; getting it wrong surfaces as "No connection" on the sign-in
 * screen, which looks like a server outage and is not one.
 *
 * **USB device (this setup)** — run once per connect, and again after any
 * unplug or `adb kill-server`:
 *
 *     adb reverse tcp:3000 tcp:3000
 *
 * That forwards the phone's `localhost:3000` down the cable to the host. It
 * needs no Wi-Fi, crosses no firewall, and works while the phone is on mobile
 * data — which a LAN address cannot do.
 *
 * **Android emulator** — `10.0.2.2` is its alias for the host loopback.
 * **iOS simulator** — shares the host's loopback, so `localhost` is already right.
 * **Wi-Fi device, no cable** — put the host's LAN address here instead (find it
 * with `ipconfig`), keep the phone on the same network, and expect to allow
 * inbound TCP 3000 through the host firewall.
 */
const ADB_REVERSE = true;

const EMULATOR_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:3000',
  default: 'http://localhost:3000',
});

export const API_BASE_URL = ADB_REVERSE
  ? 'http://localhost:3000'
  : EMULATOR_BASE_URL;

// There is no mock backend any more. The app talks to the API or to nothing,
// which is the point: the fixtures could never prove anything about the
// transport — they emitted bare problem slugs, ignored timezones and never
// rotated a refresh token, three of the failure modes that only appear against
// the real server (GAP-REPORT.STATUS.md §4). Tests use a flat stub in
// `__tests__/fixtures/stubApi.ts` for rendering, and a stubbed `fetch` in
// `httpApi.test.ts` for behaviour.
