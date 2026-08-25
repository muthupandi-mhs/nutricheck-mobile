import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useApi } from '../../api/client';
import type { FoodSearchResult } from '../../api/types';
import { Banner, EmptyState } from '../../components/Banner';
import { PressableRow, TextAction } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { Divider, Gap, Gutter, Hairline, HeavyBar, Row, SplitRow } from '../../components/Layout';
import { Screen } from '../../components/Screen';
import { SkeletonItemRow } from '../../components/Skeleton';
import { Body, Eyebrow, Mono, Num, Title } from '../../components/Type';
import { grams, kcal } from '../../lib/format';
import { useTheme } from '../../theme/ThemeProvider';
import type { ScreenProps } from '../../navigation/types';

/**
 * A run of result rows.
 *
 * Hoisted out of the screen deliberately: defined inline, React sees a new
 * component type on every keystroke and tears down the whole list, which on a
 * search field is every character the user types.
 */
function ResultRows({
  rows,
  emphasiseFirst,
  onPick,
}: {
  rows: FoodSearchResult[];
  emphasiseFirst?: boolean;
  onPick: (row: FoodSearchResult) => void;
}) {
  const { c, space } = useTheme();
  return (
    <>
      {rows.map((row, i) => {
        const portion = row.defaultPortion;
        const factor = (portion?.grams ?? 100) / 100;
        return (
          <View key={row.id}>
            <View
              style={{
                height: emphasiseFirst && i === 0 ? 2 : 1,
                backgroundColor: emphasiseFirst && i === 0 ? c.heavy : c.rule,
              }}
            />
            <PressableRow
              onPress={() => onPick(row)}
              accessibilityLabel={`${row.name}, ${Math.round(
                row.kcalPer100g * factor,
              )} calories per ${portion?.label ?? '100 g'}`}
              style={{ paddingVertical: 12 }}>
              <SplitRow align="center">
                <View style={{ flexShrink: 1, gap: 3, paddingRight: space.md }}>
                  {row.familiarity !== 'none' ? (
                    <Title size={15.5} weight="700">
                      {row.name}
                    </Title>
                  ) : (
                    <Body size={15.5}>{row.name}</Body>
                  )}
                  <Mono size={10} tone="ink3">
                    {portion ? `${portion.label} · ${grams(portion.grams)} g` : 'per 100 g'}
                    {row.brand ? ` · ${row.brand}` : ''}
                    {row.familiarity === 'logged' ? ' · your usual portion' : ''}
                  </Mono>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Num size={14} weight={row.familiarity !== 'none' ? '600' : '400'}>
                    {kcal(row.kcalPer100g * factor)}
                  </Num>
                  <Mono size={9.5} tone={row.familiarity !== 'none' ? 'det' : 'ink3'}>
                    P {grams(row.proteinPer100g * factor)} g
                  </Mono>
                </View>
              </SplitRow>
            </PressableRow>
          </View>
        );
      })}
    </>
  );
}

/**
 * Manual search — the route with no model in it.
 *
 * It is the floor under everything else *and* the first log a new user ever
 * makes, so it is built to be genuinely good rather than a grudging fallback.
 * Every failure path in the app lands here, which means search quality caps
 * how gracefully the whole product degrades.
 *
 * The result row carries calories and protein per standard portion. Without
 * them, choosing between four near-identical chicken rows means opening each
 * one — which is most of why manual logging feels like work.
 */
export function SearchScreen({ navigation, route }: ScreenProps<'Search'>) {
  const { c, space } = useTheme();
  const api = useApi();
  const params = route.params ?? {};

  const [q, setQ] = useState(params.prefill ?? '');
  const [results, setResults] = useState<FoodSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);
  const generation = useRef(0);

  useEffect(() => {
    const needle = q.trim();
    if (!needle) {
      setResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    // Debounce, and drop any response that is not from the newest keystroke —
    // otherwise a slow early query can overwrite a fast later one.
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

  const notice = params.notice;

  const pick = (row: FoodSearchResult) =>
    navigation.navigate('Portion', { foodId: row.id, firstLog: params.firstLog });

  return (
    <Screen edges="top">
      <Gutter style={{ paddingBottom: space.md }}>
        <Row gap={10}>
          <Row
            gap={9}
            style={{
              flexGrow: 1,
              backgroundColor: c.surface,
              borderWidth: 1,
              borderColor: c.rule,
              borderBottomWidth: 2,
              borderBottomColor: c.heavy,
              height: 46,
              paddingHorizontal: 12,
            }}>
            <Icon name="search" size={16} color={c.ink2} weight={2} />
            <TextInput
              ref={input}
              value={q}
              onChangeText={setQ}
              autoFocus
              placeholder={params.firstLog ? 'Try one thing you ate today' : 'Search foods'}
              placeholderTextColor={c.ink3}
              selectionColor={c.est}
              returnKeyType="search"
              accessibilityLabel="Search foods"
              style={{ flexGrow: 1, fontSize: 16, color: c.ink, padding: 0 }}
            />
            {q.length > 0 && (
              <TextAction label="Clear" onPress={() => setQ('')} tone="ink2" size={11} />
            )}
          </Row>
          <TextAction label="Cancel" onPress={() => navigation.goBack()} />
        </Row>
      </Gutter>

      <HeavyBar />

      {notice === 'timeout' && (
        <Banner
          icon="clock"
          title="That took too long"
          detail="We tried twice and stopped. Your words are in the box above — search will not fail."
        />
      )}
      {notice === 'unparsed' && (
        <Banner
          icon="alert"
          title="We couldn't read that"
          detail="Nothing in the phrase matched a food. It is here as a query, and we have logged the miss so the corpus improves."
        />
      )}
      {notice === 'quota' && (
        <Banner
          icon="info"
          title="Daily AI limit reached"
          detail="Search and one-tap repeats are unaffected — the app never fully stops."
        />
      )}

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: space.xxl }}>
        {params.firstLog && !q && (
          <Gutter style={{ paddingTop: space.lg }}>
            <Eyebrow size={10.5} tone="ink2">
              STEP 6 OF 6
            </Eyebrow>
            <Gap h={space.sm} />
            <Title size={22} weight="800">
              Log one thing you ate today
            </Title>
            <Gap h={6} />
            <Body size={14.5} tone="ink2">
              Anything at all. Once one meal is in, the strip on your home screen makes the next one
              a single tap.
            </Body>
          </Gutter>
        )}

        {searching && results === null && (
          <Gutter style={{ paddingTop: space.md }}>
            {[0, 1, 2].map(i => (
              <SkeletonItemRow key={i} index={i} widths={['64%', '30%']} />
            ))}
          </Gutter>
        )}

        {known.length > 0 && (
          <>
            <Gutter style={{ paddingTop: 13, paddingBottom: 8 }}>
              <Eyebrow size={10.5} tone="det">
                YOU'VE LOGGED THIS BEFORE
              </Eyebrow>
            </Gutter>
            <Gutter>
              <ResultRows rows={known} emphasiseFirst onPick={pick} />
              <Hairline />
            </Gutter>
          </>
        )}

        {generic.length > 0 && (
          <>
            <Gutter style={{ paddingTop: known.length ? space.lg : 13, paddingBottom: 8 }}>
              <Eyebrow size={10.5} tone="ink2">
                ALL FOODS
              </Eyebrow>
            </Gutter>
            <Gutter>
              <ResultRows rows={generic} onPick={pick} />
              <Hairline />
            </Gutter>
          </>
        )}

        {results !== null && results.length === 0 && !searching && (
          <EmptyState
            title={`Nothing matched “${q.trim()}”`}
            detail="We have recorded the exact words. Meanwhile, adding it yourself takes two fields and it is reusable forever after."
          />
        )}

        {q.trim().length > 0 && !searching && (
          <>
            <Divider />
            <PressableRow
              onPress={() => navigation.navigate('CreateFood', { name: q.trim() })}
              accessibilityLabel="Create a food"
              style={{ paddingVertical: 15, paddingHorizontal: space.gutter }}>
              <Row gap={space.sm}>
                <Icon name="plus" size={14} color={c.ink2} weight={2.2} />
                <Body size={14.5} tone="ink2">
                  Can't find it — create a food
                </Body>
              </Row>
            </PressableRow>
          </>
        )}

        {!q && !params.firstLog && (
          <Gutter style={{ paddingTop: space.xl, gap: space.sm }}>
            <Eyebrow size={10} tone="ink3">
              A NOTE ON SEARCH
            </Eyebrow>
            <Body size={14} tone="ink2">
              Foods you have logged before rank above the generic database, and the numbers are on
              every row — so picking between four similar entries does not mean opening each one.
            </Body>
          </Gutter>
        )}
      </ScrollView>
    </Screen>
  );
}
