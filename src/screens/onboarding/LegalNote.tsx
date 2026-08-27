import React from 'react';
import { Txt } from '../../components/Text';
import { openLegal } from '../../lib/legal';

/**
 * "By continuing, you accept …", with both documents reachable from it.
 *
 * Nested `Text` rather than a row of separate controls: the links have to wrap
 * with the sentence, and a sentence rebuilt out of laid-out pieces breaks in
 * the wrong places on a narrow screen and reads as three fragments to a screen
 * reader instead of one line.
 *
 * Underlined as well as lightened. Colour alone would not tell anyone who
 * cannot see the difference that these two phrases are the tappable ones.
 */
export function LegalNote({ verb = 'continuing' }: { verb?: string }) {
  return (
    <Txt role="caption" tone="tertiary" style={{ textAlign: 'center' }}>
      By {verb}, you accept our{' '}
      <Txt
        role="caption"
        tone="secondary"
        style={{ textDecorationLine: 'underline' }}
        accessibilityRole="link"
        onPress={() => openLegal('privacy')}>
        Privacy Policy
      </Txt>{' '}
      and{' '}
      <Txt
        role="caption"
        tone="secondary"
        style={{ textDecorationLine: 'underline' }}
        accessibilityRole="link"
        onPress={() => openLegal('terms')}>
        Terms of Use
      </Txt>
      .
    </Txt>
  );
}
