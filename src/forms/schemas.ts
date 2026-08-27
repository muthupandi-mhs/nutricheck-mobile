import { z } from 'zod';
import { EMAIL_MAX, PASSWORD_MAX, PASSWORD_MIN, type CreateCustomFood } from '../api/types';

/**
 * Form schemas — the client half of the contract in
 * `nutricheck-api/packages/contracts/src`.
 *
 * Two rules hold this file together:
 *
 * 1. **Bounds are copied from the server contract, never invented.** A rule the
 *    client enforces that the server does not is a field the user cannot fill;
 *    a rule the server enforces that the client does not is a 422 they cannot
 *    read. Where a number below has a twin over there, the twin is named.
 * 2. **A schema's output is the wire shape.** `customFoodSchema` parses six
 *    strings out of six text fields and produces a `CreateCustomFood` — so the
 *    screen has nowhere left to do arithmetic on a half-validated value.
 *
 * Messages are written to be read by the person who typed the field, in the
 * app's voice: what is wrong, and what would be right.
 */

// ── primitives ───────────────────────────────────────────────────────────────

/** Text as it left the keyboard, cleaned before anything is decided about it. */
const trimmed = z.string().transform(v => v.trim());

/**
 * A number typed on a phone. `keyboardType="numeric"` is a hint, not a
 * restriction — a paste, a comma, a second decimal point and a hardware
 * keyboard all reach the field — so digits are the only survivors, and what is
 * left over is parsed rather than assumed.
 *
 * `Number('')` is 0 and `Number('1.2.3')` is NaN. Both would be silently wrong
 * numbers in a nutrition log, so the blank case is split off before the parse
 * and NaN is rejected by `z.number()` after it.
 */
const digits = z.string().transform(v => v.replace(/[^0-9.]/g, ''));

function required(message: string, bound: z.ZodNumber) {
  return digits
    .pipe(z.string().min(1, message))
    .transform(Number)
    .pipe(bound);
}

/** The same, except that blank is an answer: "I do not know." */
function optional(bound: z.ZodNumber) {
  return digits.transform(v => (v === '' ? null : Number(v))).pipe(bound.nullable());
}

// ── auth ─────────────────────────────────────────────────────────────────────

/**
 * Lower-cased on the way in, the way `contracts/auth.ts` does it, so the
 * address that is checked is the address that is sent.
 *
 * The blank case is piped ahead of the format check rather than folded in
 * beside it: zod reports every failed check on a value, and "that does not look
 * like an email address" is a strange thing to say about a field nobody typed
 * in yet.
 */
export const emailField = z
  .string()
  .transform(v => v.trim().toLowerCase())
  .pipe(
    z
      .string()
      .min(1, 'Enter the email address you use here.')
      .pipe(
        z
          .email('That does not look like an email address.')
          .max(EMAIL_MAX, 'That is longer than an email address can be.'),
      ),
  );

/**
 * A password being created. Length is the only rule — `contracts/auth.ts` cites
 * NIST SP 800-63B, and composition rules push people to `Password1!`.
 *
 * The count is in the message because a bare minimum is not actionable on a
 * field showing dots — you cannot see how many you typed. Both numbers come
 * from PASSWORD_MIN, so the message follows the rule when the rule moves.
 */
export const newPasswordField = z
  .string()
  .min(1, 'Choose a password.')
  .pipe(
    z
      .string()
      .min(PASSWORD_MIN, {
        error: issue =>
          `${PASSWORD_MIN} characters minimum — that one has ${String(issue.input).length}.`,
      })
      .max(PASSWORD_MAX, `A password cannot be longer than ${PASSWORD_MAX} characters.`),
  );

/**
 * A password that already exists. Deliberately not `newPasswordField`: the
 * minimum applies to a password being set, and applying it at sign-in would
 * lock out an older account and leak the rule to anyone probing.
 */
export const existingPasswordField = z.string().min(1, 'Enter your password.').max(PASSWORD_MAX);

export const registerSchema = z.object({ email: emailField, password: newPasswordField });
export const loginSchema = z.object({ email: emailField, password: existingPasswordField });

/** Both shapes take and produce the same two strings, so one type covers them. */
export type CredentialsValues = z.input<typeof registerSchema>;
export type Credentials = z.output<typeof registerSchema>;

export const credentialsSchema = (mode: 'register' | 'login') =>
  mode === 'register' ? registerSchema : loginSchema;

// ── custom food ──────────────────────────────────────────────────────────────

/** `contracts/food.ts` — `CreateCustomFood.name` and `.brand`. */
export const FOOD_NAME_MAX = 120;

/**
 * Per 100 g, fat is the densest thing there is at 9 kcal/g, so nothing on a
 * label goes past 900; protein and fibre cannot exceed the 100 g they are
 * measured in. These are the bounds of the physical world rather than a policy,
 * which is what makes them safe to enforce ahead of the server.
 */
const KCAL_MAX = 900;
const PER_100G_MAX = 100;
/** A single logged portion. Five kilos is already absurd; the cap is a typo net. */
const PORTION_GRAMS_MAX = 5000;

/**
 * The custom-food form. Eight text fields in, one `CreateCustomFood` out.
 *
 * Calories and protein are required; carbs, fat and fibre are optional, and a
 * blank one means *unknown*, never zero. That is the invariant the whole
 * three-state column depends on — a stored 0 g is a measured zero and would
 * drag down every day the food appears in, invisibly. The mapping lives in the
 * schema so no caller can forget it.
 */
export const customFoodSchema = z
  .object({
    name: trimmed.pipe(
      z
        .string()
        .min(1, 'Give it a name — it is how you will find it again.')
        .max(FOOD_NAME_MAX, `Keep the name under ${FOOD_NAME_MAX} characters.`),
    ),
    brand: trimmed
      .pipe(z.string().max(FOOD_NAME_MAX, `Keep the brand under ${FOOD_NAME_MAX} characters.`))
      .transform(v => v || null),
    kcal: required(
      'Copy the calories off the label.',
      z
        .number('Calories should be a number.')
        .nonnegative('Calories cannot be negative.')
        .max(KCAL_MAX, `Nothing reaches ${KCAL_MAX} kcal per 100 g — check the label is per 100 g.`),
    ),
    proteinG: required(
      'Copy the protein off the label.',
      z
        .number('Protein should be a number.')
        .nonnegative('Protein cannot be negative.')
        .max(PER_100G_MAX, 'There cannot be more than 100 g of protein in 100 g.'),
    ),
    carbsG: optional(
      z
        .number('Carbs should be a number, or blank if the label does not say.')
        .nonnegative('Carbs cannot be negative.')
        .max(PER_100G_MAX, 'There cannot be more than 100 g of carbs in 100 g.'),
    ),
    fatG: optional(
      z
        .number('Fat should be a number, or blank if the label does not say.')
        .nonnegative('Fat cannot be negative.')
        .max(PER_100G_MAX, 'There cannot be more than 100 g of fat in 100 g.'),
    ),
    fiberG: optional(
      z
        .number('Fibre should be a number, or blank if the label does not say.')
        .nonnegative('Fibre cannot be negative.')
        .max(PER_100G_MAX, 'There cannot be more than 100 g of fibre in 100 g.'),
    ),
    defaultPortionGrams: optional(
      z
        .number('A portion should be a number of grams.')
        .positive('A portion has to be more than zero.')
        .max(PORTION_GRAMS_MAX, `${PORTION_GRAMS_MAX} g is not a portion — check the number.`),
    ),
  })
  .transform(
    (v): CreateCustomFood => ({
      name: v.name,
      brand: v.brand,
      per100g: {
        kcal: v.kcal,
        proteinG: v.proteinG,
        carbsG: v.carbsG,
        carbsState: v.carbsG === null ? 'unknown' : 'known',
        fatG: v.fatG,
        fatState: v.fatG === null ? 'unknown' : 'known',
        fiberG: v.fiberG,
        // Blank told us nothing. Storing 0 g would be a measured zero, and it
        // would drag down every day this food appears in, invisibly.
        fiberState: v.fiberG === null ? 'unknown' : 'known',
      },
      defaultPortionGrams: v.defaultPortionGrams,
    }),
  );

export type CustomFoodValues = z.input<typeof customFoodSchema>;

export const EMPTY_CUSTOM_FOOD: CustomFoodValues = {
  name: '',
  brand: '',
  kcal: '',
  proteinG: '',
  carbsG: '',
  fatG: '',
  fiberG: '',
  defaultPortionGrams: '',
};

// ── goal targets ─────────────────────────────────────────────────────────────

/**
 * `contracts/profile.ts` — `SetGoal`. The bounds are exported because the
 * steppers on the goal editor take the same numbers: a stepper that can reach a
 * value the schema rejects is a button that produces an error message.
 */
export const GOAL_BOUNDS = {
  kcal: { min: 800, max: 8000, step: 10 },
  proteinG: { min: 20, max: 500, step: 5 },
  carbsG: { min: 0, max: 1200, step: 5 },
  fatG: { min: 0, max: 400, step: 5 },
  fiberG: { min: 5, max: 120, step: 1 },
} as const;

const goalTarget = (name: string, bounds: { min: number; max: number }) =>
  z
    .number()
    .int(`${name} has to be a whole number.`)
    .min(bounds.min, `${name} cannot go below ${bounds.min}.`)
    .max(bounds.max, `${name} cannot go above ${bounds.max}.`);

export const goalTargetsSchema = z.object({
  kcal: goalTarget('Calories', GOAL_BOUNDS.kcal),
  proteinG: goalTarget('Protein', GOAL_BOUNDS.proteinG),
  carbsG: goalTarget('Carbs', GOAL_BOUNDS.carbsG),
  fatG: goalTarget('Fat', GOAL_BOUNDS.fatG),
  fiberG: goalTarget('Fibre', GOAL_BOUNDS.fiberG),
});

export type GoalTargetsValues = z.infer<typeof goalTargetsSchema>;

// ── portion ──────────────────────────────────────────────────────────────────

/**
 * A gram amount typed on the portion screen. Not a form of its own — the chips
 * beside it write the same value — but the rule for what counts as an amount
 * belongs with every other such rule rather than inline in a screen.
 */
export const portionGramsField = required(
  'Enter an amount to log this.',
  z
    .number('That is not an amount.')
    .positive('An amount has to be more than zero.')
    .max(PORTION_GRAMS_MAX, `${PORTION_GRAMS_MAX} g is not a portion — check the number.`),
);
