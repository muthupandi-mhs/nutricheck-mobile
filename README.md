# NutriCheck — mobile

React Native client for the tracker. Every screen in the M1/M2 inventory of
[../docs/USER-FLOWS.md](../docs/USER-FLOWS.md), built against the design system in
[../design/](../design/) and a mock backend that behaves like the real one.

## Run it

```bash
npm install
npm start            # Metro
npm run android      # or: npm run ios
```

`react-native-screens` and `react-native-svg` are native modules, so the first run
after pulling these changes needs a rebuild, not just a Metro restart. On iOS,
`cd ios && pod install` first.

```bash
npm run check        # typecheck + lint + tests
```

## The backend seam

Screens talk to one interface — `NutriCheckApi` in
[src/api/client.ts](src/api/client.ts) — and to nothing else. No screen calls
`fetch`, and no screen imports a fixture.

Swapping in the real service is one line in [src/App.tsx](src/App.tsx):

```ts
const api = useMemo(() => createHttpApi(BASE_URL, getToken), []);
```

Every shape crossing that boundary is already the wire shape from
[../nutricheck-api/packages/contracts/](../nutricheck-api/packages/contracts/). They
are mirrored by hand in [src/api/types.ts](src/api/types.ts) only because this
project still has its own git repo — once the two share a workspace, that file is
deleted and replaced by a re-export.

### The mock is not a stub

[src/api/mock/](src/api/mock/) holds real state. A commit lands, undo removes it,
a portion correction trains `user_portions` and the *next* parse of the same word
gets it right. That is deliberate: a fixture that returns the same canned day
forever cannot tell you whether the interaction design survives a session.

`src/api/mock/resolver.ts` stands in for `POST /v1/resolve`. It is not a model,
but it produces the same distribution of shapes — exact masses, counts, standard
measures, learned and unlearned personal units, ambiguous head nouns, and words
that match nothing — so every branch of the confirm sheet is reachable from
something you can type.

### Auth

Email and password only, following
[`contracts/src/auth.ts`](../nutricheck-api/packages/contracts/src/auth.ts). Apple
and Google are in the `auth_provider` enum but not in this build, so the sign-in
screen does not offer buttons the backend cannot honour. Password rules are
length-only, per NIST SP 800-63B — a composition rule measurably reduces entropy
by pushing everyone to `Password1!`.

The mock ships one account: `demo@nutricheck.app` / `correcthorse`. Registering
anything else drops you into onboarding, which is the flow worth exercising.

### Seeing the failure paths

Settings → **Developer — mock backend** switches the scenarios in
[src/api/mock/scenarios.ts](src/api/mock/scenarios.ts) at runtime: offline,
resolver timeout, unparseable phrase, quota exhausted, empty search, first run.

Every row of USER-FLOWS §8 is a screen somebody has to review. If the only way to
see the offline state is to turn off wi-fi at the right moment, it does not get
reviewed.

## Layout

```
src/
  theme/        tokens transcribed from design/*.dc.html; light and dark
  lib/          nutrient arithmetic, formatting, target derivation
  api/          the NutriCheckApi seam, wire types, and the mock behind it
  components/   the design system — type roles, rules, chips, ring, sheet
  navigation/   one stack, no tab bar
  state/        the day store: commits, undo, and the offline queue
  screens/      onboarding · home · search · composer · confirm · entry ·
                insights · settings
```

## Three things that are not style choices

**The ring counts down.** "853 kcal left" answers the question someone opened the
app with. "1,247 of 2,100" makes them do the subtraction, four times a day. Its
stroke has butt caps, not round ones — a round cap overhangs the arc by half the
stroke width and reads as several per cent more progress than there is.

**Unknown fiber is not zero.** A food whose source carries no fiber figure is
excluded from the numerator and counted separately, so the ring can honestly say
"12 of 28 g, 2 items unmeasured". Coercing it to 0 g under-reports every day it
appears in, invisibly. `Nutrients.fiberG` is null exactly when `fiberState` is
`'unknown'`, and `format.gramsOrDash` renders an em dash for it.

**Nothing invents an amount.** "Some nuts" specifies nothing, so the sheet shows
an empty, focused portion chip and waits. An unlearned personal unit — "a bowl" —
gets a range rather than a number, because a range there is honesty and a silent
210 g is where a wrong week starts. Both are enforced by the contract's
invariants and covered in `__tests__/resolver.test.ts`.

## Fonts

The design calls for Archivo, IBM Plex Mono and Source Serif 4. The `.ttf` files
are not committed; until they are, each role falls back to the nearest platform
face and the hierarchy still reads. To bundle them:

1. drop the files into `src/assets/fonts/`
2. `npx react-native-asset`
3. set `BUNDLED = true` at the top of [src/theme/typography.ts](src/theme/typography.ts)

Nothing else changes.
