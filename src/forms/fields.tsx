import React from 'react';
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { Field, Stepper, type FieldProps, type StepperProps } from '../components/Field';

/**
 * The bridge between react-hook-form and the design system.
 *
 * Screens do not import `Controller` and they do not read `formState.errors` by
 * hand: a field's error is the field's `problem`, wired once here, so the amber
 * ring and the message under it cannot come apart from the schema that decided
 * them. Everything else about `Field` — the icon, the reveal, the keyboard
 * type — passes straight through.
 */

/**
 * Validation timing, decided once for every form in the app.
 *
 * Nothing is said until they have tried to submit, and from then on it is said
 * as they type. Validating earlier means telling somebody their email address
 * is wrong while they are still on the second character of it; validating only
 * on submit means making them press the button again to find out whether the
 * fix worked.
 */
export const REVEAL_ON_SUBMIT = {
  mode: 'onSubmit',
  reValidateMode: 'onChange',
} as const;

/**
 * `Context` and `Parsed` are carried through rather than defaulted away: a
 * schema with a transform in it — `customFoodSchema` turns six strings into a
 * `CreateCustomFood` — gives the form a parsed type that differs from the type
 * of the fields, and a wrapper that assumes they are the same rejects the very
 * forms it exists to serve.
 */
type ControlledProps<
  T extends FieldValues,
  Context = unknown,
  Parsed extends FieldValues = T,
> = {
  control: Control<T, Context, Parsed>;
  name: FieldPath<T>;
};

export function FormField<
  T extends FieldValues,
  Context = unknown,
  Parsed extends FieldValues = T,
>({
  control,
  name,
  sanitize,
  ...rest
}: ControlledProps<T, Context, Parsed> &
  Omit<FieldProps, 'value' | 'onChangeText' | 'onBlur' | 'problem'> & {
    /**
     * Applied to every keystroke before it reaches the form state. For dropping
     * characters that should never have been typed — not for validation, which
     * belongs in the schema where the message can explain itself.
     */
    sanitize?: (v: string) => string;
  }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field
          {...rest}
          // Form values for text fields are strings; the coercion is here so a
          // number default cannot render as the literal "undefined".
          value={field.value == null ? '' : String(field.value)}
          onChangeText={v => field.onChange(sanitize ? sanitize(v) : v)}
          onBlur={field.onBlur}
          problem={fieldState.error?.message ?? null}
        />
      )}
    />
  );
}

/**
 * A stepper bound to a numeric field. It has no `problem` slot of its own —
 * the ± buttons stop at `min`/`max`, so a stepper cannot reach a value the
 * schema would reject, and an error under it would be unreachable furniture.
 * Take the bounds from the schema (`GOAL_BOUNDS`) and that stays true.
 */
export function FormStepper<
  T extends FieldValues,
  Context = unknown,
  Parsed extends FieldValues = T,
>({
  control,
  name,
  ...rest
}: ControlledProps<T, Context, Parsed> & Omit<StepperProps, 'value' | 'onChange'>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Stepper {...rest} value={Number(field.value)} onChange={field.onChange} />
      )}
    />
  );
}
