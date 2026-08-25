import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useApi } from '../../api/client';
import { Disclaimer } from '../../components/Banner';
import { IconButton, PrimaryButton } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { TextField } from '../../components/Field';
import { Divider, Gap, Gutter, HeavyBar, Row, SplitRow } from '../../components/Layout';
import { Dock, Screen } from '../../components/Screen';
import { Body, Display, Eyebrow, Mono } from '../../components/Type';
import { useTheme } from '../../theme/ThemeProvider';
import type { ScreenProps } from '../../navigation/types';

/**
 * Custom food creation — the exit from "no database match".
 *
 * Two required fields, not twelve. The corpus behind this app tracks three
 * numbers; asking someone to transcribe a full nutrition label to log a
 * protein bar is asking for nine values that will never be read.
 *
 * Fiber is explicitly optional and defaults to *unknown*, not zero. A user who
 * leaves it blank has told us nothing, and recording that as 0 g would quietly
 * corrupt their fiber history in a way nobody would ever trace back to here.
 */
export function CreateFoodScreen({ navigation, route }: ScreenProps<'CreateFood'>) {
  const { c, space } = useTheme();
  const api = useApi();

  const [name, setName] = useState(route.params?.name ?? '');
  const [brand, setBrand] = useState('');
  const [kcalText, setKcalText] = useState('');
  const [proteinText, setProteinText] = useState('');
  const [fiberText, setFiberText] = useState('');
  const [portionText, setPortionText] = useState('');
  const [saving, setSaving] = useState(false);

  const num = (s: string) => {
    const n = parseFloat(s.replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) ? n : null;
  };

  const kcalValue = num(kcalText);
  const proteinValue = num(proteinText);
  const ready = name.trim().length > 0 && kcalValue !== null && proteinValue !== null;

  const onSave = async () => {
    if (!ready) return;
    setSaving(true);
    const fiberValue = num(fiberText);
    const created = await api.createFood({
      name: name.trim(),
      brand: brand.trim() || null,
      per100g: {
        kcal: kcalValue,
        proteinG: proteinValue,
        fiberG: fiberValue,
        // Left blank means we do not know, and the day view will say so.
        fiberState: fiberValue === null ? 'unknown' : 'known',
      },
      defaultPortionGrams: num(portionText),
    });
    setSaving(false);
    navigation.replace('Portion', { foodId: created.id });
  };

  return (
    <Screen edges="top">
      <Gutter style={{ paddingBottom: space.md }}>
        <SplitRow align="flex-start">
          <View style={{ flexShrink: 1, gap: 4 }}>
            <Eyebrow size={10} tone="ink3">
              NOT IN THE DATABASE
            </Eyebrow>
            <Display size={28}>Add it yourself</Display>
          </View>
          <IconButton name="close" size={20} onPress={() => navigation.goBack()} accessibilityLabel="Close" style={{ marginRight: -10 }} />
        </SplitRow>
      </Gutter>

      <HeavyBar />

      <ScrollView contentContainerStyle={{ paddingBottom: space.xl }} keyboardShouldPersistTaps="handled">
        <Gutter style={{ paddingTop: space.lg, gap: space.lg }}>
          <Body size={14.5} tone="ink2">
            Three numbers off the label, per 100 g. Once it is here it behaves like any other food —
            searchable, repeatable, and yours.
          </Body>

          <TextField label="NAME" value={name} onChangeText={setName} placeholder="e.g. Mum's rajma" autoFocus />
          <TextField label="BRAND (OPTIONAL)" value={brand} onChangeText={setBrand} placeholder="Leave blank for a home dish" />
        </Gutter>

        <Gap h={space.xl} />
        <Divider />

        <Gutter style={{ paddingTop: space.lg, gap: space.lg }}>
          <Row gap={6} align="baseline">
            <Eyebrow size={10} tone="ink2">
              PER 100 G
            </Eyebrow>
            <Mono size={10} tone="ink3">
              — as printed on the label
            </Mono>
          </Row>

          <TextField label="CALORIES" value={kcalText} onChangeText={setKcalText} keyboardType="numeric" suffix="kcal" placeholder="0" />
          <TextField label="PROTEIN" value={proteinText} onChangeText={setProteinText} keyboardType="numeric" suffix="g" placeholder="0" />

          <View style={{ gap: 6 }}>
            <TextField
              label="FIBER (OPTIONAL)"
              value={fiberText}
              onChangeText={setFiberText}
              keyboardType="numeric"
              suffix="g"
              placeholder="leave blank if not shown"
            />
            <Row gap={6}>
              <View style={{ width: 3, alignSelf: 'stretch', backgroundColor: c.est }} />
              <Mono size={10.5} tone="ink3" style={{ flexShrink: 1, lineHeight: 16 }}>
                Blank means unknown, not zero. Unknown is left out of your fiber total; zero would be
                counted as a real zero and drag every day it appears in.
              </Mono>
            </Row>
          </View>
        </Gutter>

        <Gap h={space.xl} />
        <Divider />

        <Gutter style={{ paddingTop: space.lg, gap: space.md }}>
          <TextField
            label="YOUR USUAL PORTION (OPTIONAL)"
            value={portionText}
            onChangeText={setPortionText}
            keyboardType="numeric"
            suffix="g"
            placeholder="e.g. 200"
          />
          <Row gap={6} wrap>
            {['100', '150', '200', '250'].map(g => (
              <Chip key={g} label={`${g} g`} variant={portionText === g ? 'selected' : 'plain'} onPress={() => setPortionText(g)} />
            ))}
          </Row>
        </Gutter>
      </ScrollView>

      <Dock>
        <Disclaimer text="Custom foods are private to your account and are never added to the shared database." />
        <Gap h={space.sm + 2} />
        <PrimaryButton
          label="Save and pick a portion"
          disabled={!ready}
          loading={saving}
          onPress={onSave}
        />
      </Dock>
    </Screen>
  );
}
