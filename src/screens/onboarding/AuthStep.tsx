import React from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from '../../components/Button';
import { KeyboardAvoid } from '../../components/KeyboardAvoid';
import { Notice } from '../../components/Feedback';
import { Gap, Gutter } from '../../components/Layout';
import { Screen } from '../../components/Screen';
import { Txt } from '../../components/Text';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * The scaffold every auth screen is built on: one question, sat at the bottom
 * of the screen with the empty space above it.
 *
 * Bottom-aligned because the thumb is down there and the keyboard comes up to
 * meet it — a form centred on a tall phone puts its first field under the
 * user's own hand. The space above is left empty on purpose; it is what makes
 * a screen asking for one thing look like a screen asking for one thing.
 *
 * There is no page header. The back chevron floats over the empty space, since
 * a title bar above an empty half-screen would be furniture for its own sake.
 */
export function AuthStep({
  title,
  subtitle,
  error,
  onBack,
  children,
  footer,
}: {
  title: string;
  subtitle?: React.ReactNode;
  /** A rejected call. Shown above the fields, where it is read before retrying. */
  error?: { title: string; detail?: string } | null;
  onBack: () => void;
  children: React.ReactNode;
  /** Pinned to the bottom edge, above the keyboard. */
  footer: React.ReactNode;
}) {
  const { space } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Screen style={{ paddingTop: 0, paddingBottom: 0 }}>
      <KeyboardAvoid>
        <ScrollView
          style={{ flex: 1 }}
          // `flexGrow` plus the spacer below is what pins the content to the
          // bottom while still letting it scroll on a short screen.
          contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 56 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Empty, and doing the only job it has: pushing the copy to the
              bottom. It is also what gives way when the keyboard opens. */}
          <View style={{ flexGrow: 1 }} />

          <Gutter>
            <Txt role="h1">{title}</Txt>
            {subtitle ? (
              <>
                <Gap h={space.sm} />
                {typeof subtitle === 'string' ? (
                  <Txt role="bodyLg" tone="secondary">
                    {subtitle}
                  </Txt>
                ) : (
                  subtitle
                )}
              </>
            ) : null}
          </Gutter>

          <Gap h={space.xxl} />

          {error ? (
            <>
              <Notice
                icon={error.title === 'No connection' ? 'offline' : 'alert'}
                title={error.title}
                detail={error.detail}
              />
              <Gap h={space.lg} />
            </>
          ) : null}

          <Gutter>{children}</Gutter>

          <Gap h={space.xl} />
        </ScrollView>

        <View
          style={{
            paddingTop: space.sm,
            paddingBottom: Math.max(insets.bottom, space.lg) + space.xs,
          }}>
          <Gutter>{footer}</Gutter>
        </View>
      </KeyboardAvoid>

      <View style={{ position: 'absolute', top: insets.top + 4, left: space.gutter - 10 }}>
        <IconButton name="chevronLeft" onPress={onBack} accessibilityLabel="Back" />
      </View>
    </Screen>
  );
}

/**
 * The uppercase, letterspaced caption the reference puts above every field.
 *
 * Its own component rather than a prop on `Field`, because it sits outside the
 * field's own box — the field keeps its internal label for every other form in
 * the app, and this is the auth flow's louder version of the same idea.
 */
export function FieldLabel({ children }: { children: string }) {
  const { space } = useTheme();

  return (
    <>
      <Txt role="labelSm" tone="secondary" caps style={{ letterSpacing: 1.1 }}>
        {children}
      </Txt>
      <Gap h={space.sm} />
    </>
  );
}
