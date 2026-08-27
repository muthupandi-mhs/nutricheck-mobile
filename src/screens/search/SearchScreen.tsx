import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useApi } from '../../api/client';
import type { FoodSearchResult } from '../../api/types';
import { Button, IconButton, TextButton } from '../../components/Button';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Chip';
import { EmptyState, Notice } from '../../components/Feedback';
import { Field } from '../../components/Field';
import { FoodGlyph } from '../../components/FoodGlyph';
import { Divider, Gap, Gutter, Row, Split, Stack } from '../../components/Layout';
import { Press } from '../../components/Press';
import { Screen } from '../../components/Screen';
import { SkeletonRow } from '../../components/Skeleton';
import { SectionLabel, Txt } from '../../components/Text';
import { grams, kcal } from '../../lib/format';
import { useTheme } from '../../theme/ThemeProvider';
import type { ScreenProps } from '../../navigation/types';

/**
 * Hoisted out of the screen deliberately: defined inline, React sees a new
 * component type every keystroke and tears down the whole list.
 */
function ResultRows({
  rows,
  onPick,
}: {
  rows: FoodSearchResult[];
  onPick: (row: FoodSearchResult) => void;
}) {
  const { space } = useTheme();

  return (
    <Card level="raised" padded={false}>
      {rows.map((row, i) => {
        const portion = row.defaultPortion;
        const factor = (portion?.grams ?? 100) / 100;
        return (
          <View key={row.id}>
            {i > 0 && <Divider inset={space.xl + 44 + space.md} />}
            <Press
              onPress={() => onPick(row)}
              feedback="none"
              accessibilityLabel={`${row.name}, ${Math.round(row.kcalPer100g * factor)} calories per ${
                portion?.label ?? '100 g'
              }`}
              style={{ paddingHorizontal: space.xl, paddingVertical: space.md }}>
              <Row gap={space.md}>
                <FoodGlyph name={row.name} seed={row.id} />

                <Stack gap={4} style={{ flexGrow: 1, flexShrink: 1 }}>
                  <Txt role="h3" numberOfLines={2}>
                    {row.name}
                  </Txt>
                  <Row gap={space.sm} wrap>
                    <Txt role="caption" tone="tertiary">
                      {portion ? `${portion.label} · ${grams(portion.grams)} g` : 'per 100 g'}
                    </Txt>
                    {row.familiarity === 'logged' && <Badge label="your usual" tone="success" />}
                    {row.familiarity === 'custom' && <Badge label="yours" tone="success" />}
                  </Row>
                </Stack>

                <Stack gap={1} align="flex-end">
                  <Txt role="label" numeric>
                    {kcal(row.kcalPer100g * factor)}
                  </Txt>
                  <Txt role="caption" tone="tertiary" numeric>
                    P {grams(row.proteinPer100g * factor)} g
                  </Txt>
                </Stack>
              </Row>
            </Press>
          </View>
        );
      })}
    </Card>
  );
}

/**
 * Manual search — the route with no model in it. Every failure path in the app
 * lands here, so search quality caps how gracefully the product degrades.
 *
 * Rows carry kcal and protein per standard portion; without them, choosing
 * between four near-identical chicken rows means opening each one.
 */
export function SearchScreen({ navigation, route }: ScreenProps<'Search'>) {
  const { space } = useTheme();
  const api = useApi();
  const params = route.params ?? {};

  const [q, setQ] = useState(params.prefill ?? '');
  const [results, setResults] = useState<FoodSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const generation = useRef(0);

  useEffect(() => {
    const needle = q.trim();
    if (!needle) {
      setResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    // Debounce, and drop responses that are not from the newest keystroke, or a
    // slow early query overwrites a fast later one.
    const mine = ++generation.current;
    const t = setTimeout(async () => {
      const rows = await api.searchFoods(needle);
      if (mine !== generation.current) return;
      setResults(rows);
      setSearching(false);
    }, 180);
    return () => clearTimeout(t);
  }, [api, q]);

  const [known, generic] = useMemo(() => {
    const rows = results ?? [];
    return [rows.filter(r => r.familiarity !== 'none'), rows.filter(r => r.familiarity === 'none')];
  }, [results]);

  const pick = (row: FoodSearchResult) =>
    navigation.navigate('Portion', { foodId: row.id, firstLog: params.firstLog });

  const notice = params.notice;

  return (
    <Screen scrollable>
      <Gutter>
        <Split style={{ minHeight: 44 }}>
          <Txt role="h1">{params.firstLog ? 'Your first log' : 'Find a food'}</Txt>
          <IconButton
            name="close"
            onPress={() => navigation.goBack()}
            accessibilityLabel="Close"
            style={{ marginRight: -10 }}
          />
        </Split>
        <Gap h={space.md} />
        <Field
          icon="search"
          value={q}
          onChangeText={setQ}
          // Not on the first log. The keyboard would cover the sentence route
          // below, and offering a choice the user cannot see is not offering it.
          // Every other entry into search is someone who came here to search.
          autoFocus={!params.firstLog}
          placeholder={params.firstLog ? 'Try one thing you ate today' : 'Search foods'}
          returnKeyType="search"
          accessibilityHint="Search the food database"
        />
      </Gutter>

      <Gap h={space.lg} />

      {notice === 'timeout' && (
        <>
          <Notice
            icon="clock"
            title="That took too long"
            detail="We tried twice and stopped. Your words are in the box above — search will not fail."
          />
          <Gap h={space.lg} />
        </>
      )}
      {notice === 'unparsed' && (
        <>
          {/*
            Said "nothing in the phrase matched a food ... so the corpus
            improves", which described a corpus search that no longer happens.
            Nothing is matched against anything now: the model read the
            sentence and could not turn it into foods. Telling someone their
            words failed to match a database they never queried is the kind of
            wrong that makes the next message unbelievable too.
          */}
          <Notice
            icon="alert"
            title="We could not read that"
            detail="The sentence did not come back as food. Your words are in the box above — try naming one food at a time."
          />
          <Gap h={space.lg} />
        </>
      )}
      {notice === 'off' && (
        <>
          {/*
            Distinct from "we could not read that". No key, or a provider
            outage, is not the user having said something unreadable, and the
            two were previously the same message -- which is exactly what was
            shown when the app hit a staging box with no AI key at all.
          */}
          <Notice
            icon="info"
            title="AI is unavailable"
            detail="Reading a whole sentence needs it. Search still works, one food at a time, and nothing you typed is lost."
          />
          <Gap h={space.lg} />
        </>
      )}
      {notice === 'quota' && (
        <>
          <Notice
            icon="info"
            title="Daily AI limit reached"
            detail="Search and one-tap repeats are unaffected — the app never fully stops."
          />
          <Gap h={space.lg} />
        </>
      )}

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: space.huge }}>
        {params.firstLog && !q && (
          <Gutter>
            <Card level="raised" fill="primarySoft">
              <Stack gap={6}>
                <SectionLabel tone="primary">Step 6 of 6</SectionLabel>
                <Txt role="h2">Log one thing you ate today</Txt>
                <Txt role="body" tone="secondary">
                  Anything at all. Once one meal is in, the strip on your home screen makes the next one a
                  single tap.
                </Txt>
              </Stack>
            </Card>

            {/* The sentence route, offered but not taken for them.
                USER-FLOWS §2 puts the first log in search on purpose — it is the
                route with no model in it, so it cannot fail on a bad parse at the
                one moment a new user has no reason to forgive it. That argument
                is about the *default*, not about hiding the feature: a user who
                never sees the composer during onboarding has no idea the app
                accepts a whole meal in one line. So search stays the thing the
                cursor is already in, and this sits under it. */}
            <Gap h={space.md} />
            <Button
              label="Or say the whole meal in one line"
              variant="tonal"
              icon="sparkle"
              onPress={() => navigation.navigate('Composer')}
              accessibilityHint="Type or speak everything you ate, and we work out the foods and amounts"
            />
          </Gutter>
        )}

        {searching && results === null && (
          <Gutter>
            {[0, 1, 2].map(i => (
              <SkeletonRow key={i} index={i} widths={['66%', '32%']} />
            ))}
          </Gutter>
        )}

        {known.length > 0 && (
          <>
            <Gutter>
              <SectionLabel tone="primary">You've logged this before</SectionLabel>
            </Gutter>
            <Gap h={space.sm} />
            <Gutter>
              <ResultRows rows={known} onPick={pick} />
            </Gutter>
            <Gap h={space.xl} />
          </>
        )}

        {generic.length > 0 && (
          <>
            <Gutter>
              <SectionLabel>All foods</SectionLabel>
            </Gutter>
            <Gap h={space.sm} />
            <Gutter>
              <ResultRows rows={generic} onPick={pick} />
            </Gutter>
          </>
        )}

        {results !== null && results.length === 0 && !searching && (
          <EmptyState
            icon="search"
            title={`Nothing matched “${q.trim()}”`}
            detail="We have recorded the exact words. Meanwhile, adding it yourself takes two fields and it is reusable forever after."
            action={{
              label: 'Create this food',
              icon: 'plus',
              onPress: () => navigation.navigate('CreateFood', { name: q.trim() }),
            }}
          />
        )}

        {q.trim().length > 0 && !searching && results !== null && results.length > 0 && (
          <Gutter style={{ paddingTop: space.xl, alignItems: 'center' }}>
            <TextButton
              label="Can't find it — create a food"
              icon="plus"
              tone="secondary"
              onPress={() => navigation.navigate('CreateFood', { name: q.trim() })}
            />
          </Gutter>
        )}

        {!q && !params.firstLog && (
          <Gutter>
            <Card fill="sunken">
              <Stack gap={6}>
                <SectionLabel>A note on search</SectionLabel>
                <Txt role="body" tone="secondary">
                  Foods you have logged before rank above the generic database, and the numbers are on every
                  row — so picking between four similar entries does not mean opening each one.
                </Txt>
              </Stack>
            </Card>
          </Gutter>
        )}
      </ScrollView>
    </Screen>
  );
}
