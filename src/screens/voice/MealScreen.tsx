import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, ScrollView, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApi } from '../../api/client';
import { isProblem, OfflineError, type AiMealDraft, type MealSlot } from '../../api/types';
import { Button, IconButton, TextButton } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { Gap, Gutter, Row } from '../../components/Layout';
import { Press } from '../../components/Press';
import { Screen } from '../../components/Screen';
import { Txt } from '../../components/Text';
import { grams, kcal, MEAL_LABEL, mealSlotFor } from '../../lib/format';
import { uuid } from '../../lib/id';
import { useAppState } from '../../state/AppState';
import { useTheme } from '../../theme/ThemeProvider';
import type { ScreenProps } from '../../navigation/types';

/**
 * Back to Today, by the route that suits what is underneath.
 *
 * Never `navigate('Main')`, whichever it is. From React Navigation 7 a navigate
 * to a screen already in the stack does not walk back to it — without `pop` it
 * either stays put or PUSHES another copy — so that left [Main, Listen,
 * MealDetails, Main] behind, and the back button off Today landed on the
 * details of a meal already logged, one tap from logging it twice.
 *
 * Ending onboarding the whole flow is reset away: it is finished, and there is
 * nothing above Today worth going back to. Arriving from the mic button the
 * stack is popped back to the Today that is already there — a reset would build
 * a new one and lose which tab the user was on and where they had scrolled to.
 */
function toToday(
  navigation: {
    reset: (state: { index: number; routes: { name: 'Main' }[] }) => void;
    popTo: (name: 'Main') => void;
  },
  first: boolean,
) {
  if (first) navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  else navigation.popTo('Main');
}

/**
 * Energy per gram. The spine splits the calories, not the mass — a gram of fat
 * carries more than twice what a gram of protein does, so a bar drawn on mass
 * would show a third of the day's energy as a sliver.
 */
const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 } as const;

/**
 * The order a day happens in.
 *
 * Not `MEAL_ORDER`, which ends with snacks because that is how they read in a
 * list of four fixed sections on Today. Here the groups exist because somebody
 * narrated their day in sequence, and a screen reading that back with the
 * evening bajji after the dinner would be re-ordering the story it was told.
 */
const BY_TIME: readonly MealSlot[] = ['breakfast', 'lunch', 'snack', 'dinner'];

/** What went wrong, in one sentence and no jargon. */
const TROUBLE: Record<'off' | 'unparsed' | 'quota' | 'slow', { title: string; detail: string }> = {
  off: {
    title: 'Not switched on yet',
    detail: 'Reading meals needs a model this app has not been given. Your words are safe.',
  },
  unparsed: {
    title: 'We could not make a meal of that',
    detail: 'Say it once more — the dish, and roughly how much.',
  },
  quota: {
    title: 'That is all the readings today allows',
    detail: 'The limit resets tomorrow. Nothing you said has been lost.',
  },
  slow: {
    title: 'That took too long',
    detail: 'The connection gave up before the words came back. Try it once more.',
  },
};

/**
 * The meal, read back.
 *
 * The second half of the voice route, and its own screen rather than the
 * confirm sheet. The sheet is a working surface — it exists to be corrected, so
 * it is dense, editable, and shaped like a form. This is not that: somebody who
 * has just spoken one sentence is owed the moment of seeing it understood. One
 * meal, laid out like a bill.
 *
 * The composition is built from scratch — a quoted line, one large figure, a
 * spine that splits it, and a ledger of what was heard. No cards, no sheet, no
 * dividers running the full width. It shares only the wash behind it with the
 * screen before, because the two are one flow.
 *
 * Nothing here is editable and nothing auto-commits. Those are not in tension:
 * the numbers are the model's until a deliberate tap makes them the user's. Two
 * ways to change them, and neither is on this screen — say it again, or (after
 * the first meal, where the sheet is not a stranger) open the sheet built for
 * corrections, which is also the app's main sensor for what it gets wrong.
 */
export function MealScreen({ navigation, route }: ScreenProps<'MealDetails'>) {
  const { c, space } = useTheme();
  const insets = useSafeAreaInsets();
  const api = useApi();
  const { commit } = useAppState();
  const { phrase, source } = route.params;
  const first = route.params.first ?? false;

  const [draft, setDraft] = useState<AiMealDraft | null>(null);
  const [failed, setFailed] = useState<keyof typeof TROUBLE | null>(null);
  const [committing, setCommitting] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [reduced, setReduced] = useState(false);

  /** Fixed at mount: the slot is where this lands, and it must not move under a slow read. */
  const [slot] = useState(() => mealSlotFor());

  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(v => alive && setReduced(v));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    // Leaving cancels the call. This is a billed model call counted against a
    // daily ceiling, and a user who walked away has said they do not want it.
    const abort = new AbortController();

    api
      .interpretMeal(phrase, abort.signal)
      .then(d => alive && setDraft(d))
      .catch((err: unknown) => {
        if (!alive || abort.signal.aborted) return;
        setFailed(
          isProblem(err, 'resolver-unavailable')
            ? 'off'
            : isProblem(err, 'quota-exhausted', 'rate-limited')
              ? 'quota'
              : isProblem(err, 'resolver-timeout') || err instanceof OfflineError
                ? 'slow'
                : 'unparsed',
        );
      });

    return () => {
      alive = false;
      abort.abort();
    };
  }, [api, phrase]);

  /**
   * Summed here rather than read off `draft.totals`.
   *
   * The rows on the screen are the claim being made, so the figure above them
   * has to be their sum and not a second number computed elsewhere that agrees
   * with them most of the time.
   */
  const sum = useMemo(() => {
    const items = draft?.items ?? [];
    return items.reduce(
      (t, i) => ({
        kcal: t.kcal + i.kcal,
        proteinG: t.proteinG + i.proteinG,
        carbsG: t.carbsG + i.carbsG,
        fatG: t.fatG + i.fatG,
        fiberG: t.fiberG + i.fiberG,
      }),
      { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 },
    );
  }, [draft]);

  /**
   * The sentence, split into the meals it actually described.
   *
   * People say the day at the end of it — "kalaila lemon rice sambar apram
   * rendu muttai and mathiyam chicken briyani ... iravu 3 chappathi" — and
   * every one of those time words is a fact about when they ate that the app
   * used to throw away, filing the lot as one dinner because that is when they
   * happened to be talking.
   *
   * An item whose words carried no time falls back to `slot`: the clock at the
   * moment this screen opened. That is the honest default and the model is told
   * not to substitute its own — a language model will read idli as breakfast at
   * nine at night, which is a claim about somebody's day that nobody made.
   */
  const groups = useMemo(() => {
    const byMeal = new Map<MealSlot, AiMealDraft['items']>();
    for (const item of draft?.items ?? []) {
      const key = item.meal ?? slot;
      const existing = byMeal.get(key);
      if (existing) existing.push(item);
      else byMeal.set(key, [item]);
    }
    return BY_TIME.filter(m => byMeal.has(m)).map(meal => ({
      meal,
      items: byMeal.get(meal)!,
      kcal: byMeal.get(meal)!.reduce((t, i) => t + i.kcal, 0),
    }));
  }, [draft, slot]);

  /** More than one meal in one sentence is the case this screen was rebuilt for. */
  const split = groups.length > 1;

  const onAdd = async () => {
    if (!draft || committing) return;
    setCommitting(true);

    /**
     * One entry per meal, not one entry for the sentence.
     *
     * Sequential rather than parallel: each commit reloads the day and the
     * suggestions behind it, and four of those racing would have the last
     * answer win at random. Four round trips on the once-a-day path that
     * produces four meals is a fair price for Today grouping them correctly.
     *
     * Every entry keeps the whole phrase. It is the reproducible input behind
     * all of them, and splitting the sentence up to store a piece with each
     * would be storing something the user never said.
     */
    for (const group of groups) {
      await commit({
        clientId: uuid(),
        loggedAt: new Date().toISOString(),
        meal: group.meal,
        source,
        phrase,
        draftId: draft.draftId,
        items: group.items.map(i => ({
          food: i.food,
          grams: i.grams,
          quantityType: 'count' as const,
          quantitySource: 'stated' as const,
          learnedUnitLabel: null,
          // Every one of these is the model's arithmetic on its own estimate.
          // `imputed` is what makes the rest of the app draw them with a '~'.
          nutrients: {
            kcal: i.kcal,
            proteinG: i.proteinG,
            carbsG: i.carbsG,
            carbsState: 'imputed' as const,
            fatG: i.fatG,
            fatState: 'imputed' as const,
            fiberG: i.fiberG,
            fiberState: 'imputed' as const,
          },
        })),
      });
    }

    setCommitting(false);
    // A queued commit is not an error — Today's banner explains the queue.
    toToday(navigation, first);
  };

  return (
    <Screen style={{ paddingTop: 0, paddingBottom: 0 }}>
      <LinearGradient
        colors={[c.wash[1], c.canvas, c.canvas]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />

      <View style={{ flex: 1, paddingTop: insets.top + space.xs }}>
        {/* The bar. A way back and the slot this will land in — which is the
            one fact about the meal that is not in the meal. */}
        <Gutter>
          <Row justify="space-between">
            <IconButton
              name="chevronLeft"
              onPress={() => navigation.goBack()}
              accessibilityLabel="Back"
              style={{ marginLeft: -10 }}
            />
            {/* Where this lands. One meal names itself; a day that was said in
                one go cannot, so it says how many meals it heard rather than
                naming the wrong one. */}
            <Txt role="overline" tone="tertiary" caps style={{ letterSpacing: 1.4 }}>
              {split ? `${groups.length} meals` : MEAL_LABEL[groups[0]?.meal ?? slot]}
            </Txt>
          </Row>
        </Gutter>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: space.huge * 3 }}
          showsVerticalScrollIndicator={false}>
          <Gutter>
            <Gap h={space.lg} />

            {/* The words, kept in front of the numbers for as long as the
                numbers are on the screen. A rule instead of a box: this is a
                quotation, and the app has nothing else that looks like one. */}
            <View style={{ flexDirection: 'row' }}>
              <View
                style={{
                  width: 2,
                  borderRadius: 1,
                  backgroundColor: c.primary,
                  opacity: 0.55,
                  marginRight: space.md,
                }}
              />
              <Txt
                role="h3"
                tone="secondary"
                style={{ flexShrink: 1, fontStyle: 'italic', lineHeight: 25 }}>
                “{phrase}”
              </Txt>
            </View>

            <Gap h={space.xxl} />

            {failed ? (
              <Trouble
                {...TROUBLE[failed]}
                onRetry={() => navigation.goBack()}
                onSkip={() => toToday(navigation, first)}
              />
            ) : draft ? (
              <>
                <Hero sum={sum} />

                <Gap h={space.xxl} />

                {groups.map((group, g) => {
                  // Numbering runs across the whole sentence, not per group:
                  // it is there so somebody can count what they said against
                  // what was heard, and they said one sentence.
                  const before = groups.slice(0, g).reduce((n, x) => n + x.items.length, 0);
                  return (
                    <View key={group.meal}>
                      {split ? (
                        <>
                          <Gap h={g === 0 ? 0 : space.xl} />
                          <Row justify="space-between" align="baseline">
                            <Txt
                              role="labelSm"
                              tone="secondary"
                              caps
                              style={{ letterSpacing: 1.4 }}>
                              {MEAL_LABEL[group.meal]}
                            </Txt>
                            <Row gap={4} align="baseline">
                              <Txt role="labelSm" tone="secondary" numeric>
                                {kcal(group.kcal)}
                              </Txt>
                              <Txt role="caption" tone="tertiary">
                                kcal
                              </Txt>
                            </Row>
                          </Row>
                          <Gap h={space.sm} />
                        </>
                      ) : null}

                      <View style={{ height: 1, backgroundColor: c.border }} />

                      {group.items.map((item, i) => (
                        <ItemRow
                          key={`${item.food.id}-${before + i}`}
                          index={before + i + 1}
                          item={item}
                          open={open === before + i}
                          onToggle={() => setOpen(o => (o === before + i ? null : before + i))}
                        />
                      ))}
                    </View>
                  );
                })}

                {draft.unresolved.length > 0 ? (
                  <>
                    <Gap h={space.xl} />
                    <Row gap={space.sm} align="flex-start">
                      <View style={{ paddingTop: 3 }}>
                        <Icon name="info" size={14} color={c.attention} weight={2.1} />
                      </View>
                      <Txt role="bodySm" tone="attention" style={{ flexShrink: 1 }}>
                        Heard but not counted: {draft.unresolved.map(u => `“${u}”`).join(', ')}.
                      </Txt>
                    </Row>
                  </>
                ) : null}

                <Gap h={space.xl} />

                {/* Said once, at the bottom, where somebody who has read the
                    rows arrives at it. Repeated per row it stops being read by
                    the third one. */}
                <Row gap={space.sm} align="flex-start">
                  <View style={{ paddingTop: 2 }}>
                    <Icon name="sparkle" size={13} color={c.inkTertiary} weight={2} />
                  </View>
                  <Txt role="caption" tone="tertiary" style={{ flexShrink: 1 }}>
                    Estimated from what you said, not measured. Every figure here is an
                    approximation.
                  </Txt>
                </Row>
              </>
            ) : (
              <Reading reduced={reduced} />
            )}
          </Gutter>
        </ScrollView>

        {/* The commit, over a fade rather than a bordered dock — the ledger
            should run under it and out of sight, not stop at a line. */}
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
          <LinearGradient
            colors={[`${c.canvas}00`, c.canvas, c.canvas]}
            pointerEvents="none"
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: -60 }}
          />
          <Gutter style={{ paddingBottom: Math.max(insets.bottom, space.lg) + space.md }}>
            {draft && !failed ? (
              <>
                <Button
                  label={`Add ${kcal(sum.kcal)} kcal to today`}
                  loading={committing}
                  onPress={onAdd}
                  haptic="commit"
                />
                <Gap h={space.md} />
                {/* One repair, and it is the one that fits the flow: go back
                    and say it differently. The other door — the editable
                    confirm sheet — is gone from here. It was a second way to
                    fix the same thing, in a different language, offered at the
                    moment somebody is deciding whether to press Add; two
                    repairs on one screen is a screen asking which kind of
                    wrong it was before anybody has said it is wrong.

                    Named for the door it goes back through. Either way that is
                    the same screen returned to with its contents intact — a
                    typed sentence is still in the box, a spoken one is one tap
                    from being said again. */}
                <View style={{ alignItems: 'center' }}>
                  <TextButton
                    label={source === 'text' ? 'Change the words' : 'Say it again'}
                    tone="secondary"
                    onPress={() => navigation.goBack()}
                  />
                </View>
              </>
            ) : null}
          </Gutter>
        </View>
      </View>
    </Screen>
  );
}

/**
 * The figure, and what it is made of.
 *
 * One number the size of a headline, then a single bar carrying the split. Not
 * four numbers in a row of equal weight: the calories are what the day is
 * measured in, and the macros are the composition of that one figure — drawing
 * them as peers of it says they are five separate facts.
 */
function Hero({ sum }: { sum: { kcal: number; proteinG: number; carbsG: number; fatG: number; fiberG: number } }) {
  const { c, space } = useTheme();

  const energy = {
    protein: sum.proteinG * KCAL_PER_G.protein,
    carbs: sum.carbsG * KCAL_PER_G.carbs,
    fat: sum.fatG * KCAL_PER_G.fat,
  };
  const spent = energy.protein + energy.carbs + energy.fat || 1;

  /**
   * Monochrome, in three weights of ink.
   *
   * A colour per macro would need a categorical palette this app does not have,
   * and inventing one here would collide with the two colours that already mean
   * something: blue for a measured value, amber for an unknown one. Weight of
   * ink carries a three-way split perfectly well.
   */
  const parts = [
    { key: 'Protein', share: energy.protein / spent, g: sum.proteinG, opacity: 1 },
    { key: 'Carbs', share: energy.carbs / spent, g: sum.carbsG, opacity: 0.55 },
    { key: 'Fat', share: energy.fat / spent, g: sum.fatG, opacity: 0.28 },
  ];

  return (
    <View>
      <Row gap={space.sm} align="baseline">
        <Txt role="display" numeric style={{ fontSize: 56, lineHeight: 58 }}>
          {kcal(sum.kcal)}
        </Txt>
        <Txt role="labelSm" tone="tertiary" caps style={{ letterSpacing: 1.4 }}>
          kcal
        </Txt>
      </Row>

      <Gap h={space.lg} />

      {/* The split, by energy. Gaps between the segments rather than butted
          edges, so three weights of the same ink still read as three things. */}
      <Row gap={3} style={{ height: 8 }}>
        {parts.map(p => (
          <View
            key={p.key}
            style={{
              flexGrow: Math.max(p.share, 0.02),
              flexBasis: 0,
              borderRadius: 4,
              backgroundColor: c.ink,
              opacity: p.opacity,
            }}
          />
        ))}
      </Row>

      <Gap h={space.md} />

      <Row gap={space.lg} wrap>
        {parts.map(p => (
          <Row key={p.key} gap={6}>
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: c.ink,
                opacity: p.opacity,
              }}
            />
            <Txt role="caption" tone="tertiary">
              {p.key}
            </Txt>
            <Txt role="caption" numeric>
              ~{grams(p.g)} g
            </Txt>
          </Row>
        ))}

        {/* Fibre is not part of the energy split — it is barely energy at all —
            so it sits in the legend without a segment. It is here because it is
            one of the five targets this app sets. */}
        <Row gap={6}>
          <View
            style={{
              width: 7,
              height: 7,
              borderRadius: 4,
              borderWidth: 1,
              borderColor: c.inkTertiary,
            }}
          />
          <Txt role="caption" tone="tertiary">
            Fibre
          </Txt>
          <Txt role="caption" numeric>
            ~{grams(sum.fiberG)} g
          </Txt>
        </Row>
      </Row>
    </View>
  );
}

/**
 * One line of the bill.
 *
 * The index is not decoration: it is what turns a stack of similar rows into a
 * countable list, so somebody checking "did it get all four things I said" can
 * do it without reading a single food name.
 *
 * Tapping opens the row's own macros. Closed by default — the question on
 * arrival is "is this my meal", and four more numbers per row answers a
 * question nobody has asked yet.
 */
function ItemRow({
  index,
  item,
  open,
  onToggle,
}: {
  index: number;
  item: AiMealDraft['items'][number];
  open: boolean;
  onToggle: () => void;
}) {
  const { c, space } = useTheme();
  const low = item.confidence === 'low';

  return (
    <View>
      <Press
        onPress={onToggle}
        feedback="none"
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${item.food.name}, ${kcal(item.kcal)} kilocalories`}
        accessibilityHint="Shows the protein, carbohydrate, fat and fibre in this item"
        style={{ paddingVertical: space.lg }}>
        <Row gap={space.md} align="flex-start">
          <Txt
            role="caption"
            tone="tertiary"
            numeric
            style={{ width: 22, paddingTop: 4, letterSpacing: 0.6 }}>
            {String(index).padStart(2, '0')}
          </Txt>

          <View style={{ flexGrow: 1, flexShrink: 1 }}>
            <Row gap={space.sm}>
              {/* Amber, for the one thing it is allowed to mean: this number
                  rests on a portion nobody stated. */}
              {low ? (
                <View
                  style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.attention }}
                />
              ) : null}
              <Txt role="h3" style={{ flexShrink: 1 }} numberOfLines={2}>
                {item.food.name}
              </Txt>
            </Row>
            <Gap h={3} />
            <Txt role="caption" tone="tertiary">
              “{item.spokenAs}” · {item.quantity} {item.unit} · {grams(item.grams)} g
              {low ? ' · portion assumed' : ''}
            </Txt>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Txt role="h3" numeric>
              {kcal(item.kcal)}
            </Txt>
            <Txt role="caption" tone="tertiary">
              kcal
            </Txt>
          </View>
        </Row>

        {open ? (
          <Row gap={space.md} style={{ paddingTop: space.md, paddingLeft: 22 + space.md }}>
            <Cell label="Protein" value={item.proteinG} />
            <Cell label="Carbs" value={item.carbsG} />
            <Cell label="Fat" value={item.fatG} />
            <Cell label="Fibre" value={item.fiberG} />
          </Row>
        ) : null}
      </Press>

      {/* Inset to the text column, so the index numerals run down the page
          uninterrupted and the list reads as one object rather than n boxes. */}
      <View style={{ height: 1, backgroundColor: c.border, marginLeft: 22 + space.md }} />
    </View>
  );
}

function Cell({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ flexGrow: 1, flexBasis: 0 }}>
      <Txt role="caption" tone="tertiary">
        {label}
      </Txt>
      <Gap h={2} />
      <Txt role="labelSm" numeric>
        ~{grams(value)} g
      </Txt>
    </View>
  );
}

/**
 * The wait, in the shape of the answer.
 *
 * Ghosts of the rows that are coming rather than a spinner: the screen is
 * already showing the sentence, and what somebody wants to know while they wait
 * is how much of it was understood. Three, because three is the length of an
 * ordinary meal here and the list is what fills in.
 */
function Reading({ reduced }: { reduced: boolean }) {
  const { c, space } = useTheme();
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (reduced) {
      pulse.setValue(0.6);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 720,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 720,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reduced]);

  const bar = (w: number | string, h: number) => (
    <Animated.View
      style={{
        width: w as number,
        height: h,
        borderRadius: h / 2,
        backgroundColor: c.border,
        opacity: pulse,
      }}
    />
  );

  return (
    <View>
      <Row gap={space.sm}>
        <Icon name="sparkle" size={14} color={c.inkTertiary} weight={2} />
        <Txt role="labelSm" tone="tertiary" caps style={{ letterSpacing: 1.4 }}>
          Reading your meal
        </Txt>
      </Row>

      <Gap h={space.xl} />
      {bar(148, 44)}
      <Gap h={space.xxl} />

      {[0, 1, 2].map(i => (
        <View key={i} style={{ paddingVertical: space.lg }}>
          <Row gap={space.md}>
            <View style={{ flexGrow: 1, flexShrink: 1 }}>
              {bar(i === 1 ? 132 : 176, 15)}
              <Gap h={space.sm} />
              {bar(i === 1 ? 104 : 88, 11)}
            </View>
            {bar(42, 15)}
          </Row>
        </View>
      ))}
    </View>
  );
}

/**
 * A read that did not come back, and the two ways out of it.
 *
 * Neither of them is a text box. The sentence is still on the screen above
 * this, so nothing has been lost by failing — and on the one screen in the app
 * that is deliberately voice-only, offering a keyboard as the repair would be
 * teaching the opposite of what the flow is for.
 */
function Trouble({
  title,
  detail,
  onRetry,
  onSkip,
}: {
  title: string;
  detail: string;
  onRetry: () => void;
  onSkip: () => void;
}) {
  const { c, space } = useTheme();

  return (
    <View>
      <Row gap={space.sm}>
        <Icon name="alert" size={16} color={c.attention} weight={2.1} />
        <Txt role="h2" style={{ flexShrink: 1 }}>
          {title}
        </Txt>
      </Row>
      <Gap h={space.md} />
      <Txt role="body" tone="secondary">
        {detail}
      </Txt>
      <Gap h={space.xxl} />
      <Button label="Say it again" onPress={onRetry} haptic="select" />
      <Gap h={space.md} />
      <View style={{ alignItems: 'center' }}>
        <TextButton label="Skip to Today" tone="secondary" onPress={onSkip} />
      </View>
    </View>
  );
}
