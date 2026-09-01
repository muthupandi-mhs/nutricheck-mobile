import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useApi } from '../../api/client';
import { isProblem, OfflineError, type FoodIdea, type FoodIdeas } from '../../api/types';
import { Card } from '../../components/Card';
import { Chip } from '../../components/Chip';
import { Disclaimer, EmptyState } from '../../components/Feedback';
import { FoodGlyph } from '../../components/FoodGlyph';
import { Icon } from '../../components/Icon';
import { Divider, Gap, Gutter, Row, Split, Stack } from '../../components/Layout';
import { Header, Screen } from '../../components/Screen';
import { Shimmer } from '../../components/Skeleton';
import { SectionLabel, Txt } from '../../components/Text';
import { grams, kcal, localDate, untilReset } from '../../lib/format';
import { useTheme } from '../../theme/ThemeProvider';
import { useAppState } from '../../state/AppState';
import type { TabScreenProps } from '../../navigation/types';

/**
 * Ideas. Food that suits how this person eats and what they are working toward.
 *
 * **The subject is the person, not the day.** That was rewritten once: the
 * first version led with today's remaining targets, which made the tab a
 * gap-filling calculator — it answered "what closes the arithmetic" rather than
 * "what should someone like me be eating", and on a day with nothing logged it
 * had nothing to say. The day's gap is still here, and still shown first,
 * because it is the constraint that sizes the answer and the evidence the list
 * was built against. It is just not the point of the screen.
 *
 * This is also the one screen that shows numbers a model produced without a
 * user having asked a question, so the layout is arranged to make that visible
 * rather than to make the suggestions look authoritative:
 *
 * - **The gap is shown above the list.** Same figures as Home, from the same
 *   day totals. A user who disagrees with a suggestion can see what it was
 *   working from before they read it.
 * - **Every figure carries a `~`.** The mark the app already uses for an
 *   imputed nutrient, for the same reason. Not one of these was measured.
 * - **Each idea states its own reason.** A list with no arguments in it is
 *   indistinguishable from a shuffle, and this one claims to be personal.
 * - **Tapping opens the portion screen, and logs nothing.** These are the least
 *   trustworthy numbers in the app; committing one on a single tap would be the
 *   wrong place to save a step.
 *
 * When something goes wrong the screen says WHICH thing — see `Failure`. It
 * used to say "a model was not reachable" for every cause including a 404, and
 * that sentence was wrong in the one case somebody actually hit.
 */
export function IdeasScreen({ navigation }: TabScreenProps<'Ideas'>) {
  const { c, space } = useTheme();
  const api = useApi();
  const { date } = useAppState();

  const [ideas, setIdeas] = useState<FoodIdeas | null>(null);
  /**
   * Why there is nothing to show — never merged into "no ideas".
   *
   * Four causes reach this screen and they call for four different sentences
   * and four different next actions. Collapsing them into one message is how
   * the first build of this screen told a user their model was unreachable when
   * the truth was a server that had not been restarted. If the app cannot tell
   * which happened, it says the honest small thing rather than the confident
   * wrong one — see `failure` below.
   */
  const [failure, setFailure] = useState<Failure | null>(null);

  /**
   * Refetched on focus, not once on mount.
   *
   * The gap moves every time something is logged, and logging happens on
   * another tab. A list built against 900 kcal left, still on screen after
   * dinner was logged, is advice about a day that no longer exists.
   *
   * The server caches on the bucketed gap, so returning to this tab without
   * having logged anything costs a request and not a model call.
   */
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      const controller = new AbortController();

      setIdeas(null);
      setFailure(null);

      api
        .getFoodIdeas(date || localDate(), controller.signal)
        .then(next => {
          if (alive) setIdeas(next);
        })
        .catch((error: unknown) => {
          if (!alive) return;
          setIdeas(null);
          setFailure(classify(error));
        });

      return () => {
        alive = false;
        // A billed call the user has navigated away from is a call they no
        // longer want. `alive` alone stops the RESULT being used, not the
        // request — the same trap the confirm sheet hit.
        controller.abort();
      };
    }, [api, date]),
  );

  const remaining = ideas?.remaining;
  const kcalLeft = remaining?.kcal ?? null;
  const proteinLeft = remaining?.proteinG ?? null;
  const fibreLeft = remaining?.fiberG ?? null;

  return (
    <Screen scrollable>
      <Header title="Ideas" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space.huge }}>
        {failure !== null ? (
          <FailureState failure={failure} navigation={navigation} />
        ) : ideas === null ? (
          <Gutter>
            <Stack gap={space.md}>
              <Shimmer width="100%" height={96} />
              <Shimmer width="100%" height={104} delay={120} />
              <Shimmer width="100%" height={104} delay={240} />
            </Stack>
          </Gutter>
        ) : (
          <Gutter>
            <Stack gap={space.lg}>
              {/* The evidence, before the advice. Same figures as Home. */}
              <Card fill="sunken">
                <Stack gap={space.md}>
                  <SectionLabel>What is left today</SectionLabel>
                  <Split align="flex-start">
                    {[
                      { label: 'Calories', value: kcalLeft, unit: '' },
                      { label: 'Protein', value: proteinLeft, unit: 'g' },
                      { label: 'Fibre', value: fibreLeft, unit: 'g' },
                    ].map(stat => (
                      <Stack key={stat.label} gap={3} style={{ flexGrow: 1, flexBasis: 0 }}>
                        <Txt role="caption" tone="tertiary">
                          {stat.label}
                        </Txt>
                        {stat.value === null ? (
                          <Txt role="h3" tone="tertiary">
                            not set
                          </Txt>
                        ) : (
                          <Row gap={2} align="baseline">
                            <Txt role="h2" numeric tone={stat.value < 0 ? 'attention' : 'ink'}>
                              {stat.unit === 'g'
                                ? grams(Math.abs(stat.value))
                                : kcal(Math.abs(stat.value))}
                            </Txt>
                            {stat.unit ? (
                              <Txt role="bodySm" tone="secondary">
                                {stat.unit}
                              </Txt>
                            ) : null}
                          </Row>
                        )}
                        {/* "over" said out loud. A minus sign in a column of
                            targets is read past, and reading past it is what
                            makes somebody eat further past their target. */}
                        {stat.value !== null && stat.value < 0 ? (
                          <Txt role="caption" tone="attention">
                            over
                          </Txt>
                        ) : null}
                      </Stack>
                    ))}
                  </Split>
                </Stack>
              </Card>

              {ideas.note ? (
                <Row gap={space.sm} align="flex-start">
                  <View style={{ paddingTop: 3 }}>
                    <Icon name="sparkle" size={14} color={c.inkTertiary} weight={2} />
                  </View>
                  <Txt role="body" tone="secondary" style={{ flexShrink: 1 }}>
                    {ideas.note}
                  </Txt>
                </Row>
              ) : null}

              {ideas.ideas.length === 0 ? (
                // Reached only when the SERVER answered and had nothing to
                // offer — every transport failure is handled above, by name.
                // So this can say what it actually means without guessing.
                <EmptyState
                  icon="sparkle"
                  title="Nothing to suggest yet"
                  detail="The server answered, but had no suggestions to make right now. This usually clears on its own — pull down or come back after your next meal."
                  action={{ label: 'Log something', onPress: () => navigation.navigate('Composer', { autoStart: true }) }}
                />
              ) : (
                <Stack gap={space.md}>
                  {/* Names the person, not the arithmetic. The list is built
                      from how they eat and what they are working toward; the
                      day's gap sizes it, which the card above already shows. */}
                  <SectionLabel>Worth eating, for your goal</SectionLabel>

                  {ideas.ideas.map(idea => (
                    <IdeaCard
                      key={idea.food.id}
                      idea={idea}
                      onPress={() => navigation.navigate('Portion', { foodId: idea.food.id })}
                    />
                  ))}

                  <Gap h={space.xs} />
                  <Disclaimer text="Every figure here is an estimate, not a measurement — the foods were described by a model rather than looked up in the food tables. Check the portion before you log one, and treat these as ideas rather than advice." />
                </Stack>
              )}
            </Stack>
          </Gutter>
        )}
      </ScrollView>
    </Screen>
  );
}

/**
 * Why the tab has nothing on it.
 *
 * A closed set, and each member exists because it needs a DIFFERENT sentence
 * and a different next action — not because the causes are technically
 * distinct. `unknown` is a real member rather than a fallback to one of the
 * others: the app saying "something went wrong and I cannot tell you what" is
 * worth more than the app confidently naming the wrong cause, which is the bug
 * this type was written to prevent.
 */
type Failure =
  | { kind: 'offline' }
  | { kind: 'quota'; resetAt: string | null }
  | { kind: 'noProfile' }
  | { kind: 'unknown' };

function classify(error: unknown): Failure {
  if (error instanceof OfflineError) return { kind: 'offline' };

  if (isProblem(error, 'quota-exhausted')) {
    return { kind: 'quota', resetAt: error.problem.resetAt ?? null };
  }

  // The server 404s this route in two entirely different situations: no
  // profile row for this user, and an API that predates the route. They are
  // indistinguishable from here — same status, same problem type — so this
  // deliberately reports the one the USER can act on, and the empty-state copy
  // is written so it stays true if the cause was actually the other one.
  if (isProblem(error, 'not-found')) return { kind: 'noProfile' };

  return { kind: 'unknown' };
}

function FailureState({
  failure,
  navigation,
}: {
  failure: Failure;
  navigation: TabScreenProps<'Ideas'>['navigation'];
}) {
  switch (failure.kind) {
    case 'offline':
      return (
        <EmptyState
          icon="offline"
          title="No connection"
          detail="Ideas are worked out on the server, so this one screen needs a connection. Everything else — logging, search, your day — keeps working offline."
          action={{ label: 'Back to home', onPress: () => navigation.navigate('Home') }}
        />
      );

    case 'quota':
      return (
        <EmptyState
          icon="clock"
          title="That is today's AI allowance"
          detail={
            failure.resetAt
              ? `Ideas cost a model call each time your day moves. This resets in ${untilReset(
                  failure.resetAt,
                )} — search and the repeat strip are unaffected.`
              : 'Ideas cost a model call each time your day moves. Search and the repeat strip are unaffected.'
          }
          action={{ label: 'Back to home', onPress: () => navigation.navigate('Home') }}
        />
      );

    case 'noProfile':
      return (
        <EmptyState
          icon="user"
          title="Nothing to build a list from"
          detail="Ideas are built from your details and your targets, and the server could not find them. Check your profile — if it looks right, the app may be newer than the server it is talking to."
          action={{ label: 'Open your profile', onPress: () => navigation.navigate('You') }}
        />
      );

    default:
      return (
        <EmptyState
          icon="alert"
          title="Could not load ideas"
          detail="The request failed and the app cannot tell you why — which is worth saying plainly rather than guessing at a cause. Nothing about your day is affected."
          action={{ label: 'Back to home', onPress: () => navigation.navigate('Home') }}
        />
      );
  }
}

/**
 * One idea.
 *
 * The reason sits under the name and above the numbers, deliberately: it is the
 * part that makes this a suggestion rather than a search result, and putting it
 * below the figures would leave the figures to speak for themselves — which is
 * exactly what estimates should not be allowed to do.
 */
function IdeaCard({ idea, onPress }: { idea: FoodIdea; onPress: () => void }) {
  const { c, space } = useTheme();

  return (
    <Card
      onPress={onPress}
      haptic="select"
      accessibilityLabel={`${idea.food.name}, ${idea.servingLabel}, about ${kcal(idea.kcal)} calories`}
      accessibilityHint="Opens the portion picker. Nothing is logged until you confirm there.">
      <Stack gap={space.md}>
        <Row gap={space.md} align="flex-start">
          {/* Round, matching the buttons, rather than the rounded square
              every other food row uses. The whole card is one target here and
              the tile is the only thing on it that could be mistaken for a
              separate control, so it takes the button shape instead. */}
          <FoodGlyph name={idea.food.name} seed={idea.food.id} size={44} shape="round" />
          <Stack gap={3} style={{ flexShrink: 1 }}>
            <Txt role="h3">{idea.food.name}</Txt>
            <Row gap={space.sm} align="center">
              <Txt role="caption" tone="tertiary">
                {idea.servingLabel} · {grams(idea.grams)} g
              </Txt>
              {/* Said on the card, not just in the footnote. A reader who
                  scrolls straight to a suggestion never reaches the footnote. */}
              {idea.confidence === 'low' ? (
                <Chip label="rough estimate" variant="default" />
              ) : null}
            </Row>
          </Stack>
        </Row>

        <Txt role="bodySm" tone="secondary">
          {idea.reason}
        </Txt>

        <Divider />

        {/* The `~` on every figure, including calories. It is the mark the app
            already uses for an imputed nutrient, and nothing here is anything
            else — a number shown clean would be claiming a measurement. */}
        <Row gap={space.lg} align="baseline">
          {[
            { label: 'kcal', value: kcal(idea.kcal) },
            { label: 'protein', value: `${grams(idea.proteinG)} g` },
            { label: 'carbs', value: `${grams(idea.carbsG)} g` },
            { label: 'fat', value: `${grams(idea.fatG)} g` },
          ].map(cell => (
            <Stack key={cell.label} gap={2}>
              <Txt role="labelSm" numeric color={c.ink}>
                ~{cell.value}
              </Txt>
              <Txt role="caption" tone="tertiary">
                {cell.label}
              </Txt>
            </Stack>
          ))}
        </Row>
      </Stack>
    </Card>
  );
}
