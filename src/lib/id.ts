/**
 * RFC 4122 v4 identifiers without a native dependency.
 *
 * `clientId` has to be mintable at the instant the user taps commit, offline,
 * before any module that could fail to load has loaded — so this deliberately
 * has no imports. `Math.random` is not a CSPRNG, but a clientId is a collision
 * key inside one user's account, not a secret.
 */
/* eslint-disable no-bitwise -- hex nibble extraction; the arithmetic form is slower and less clear here */
export function uuid(): string {
  let out = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      out += '-';
    } else if (i === 14) {
      out += '4';
    } else if (i === 19) {
      out += ((Math.random() * 4) | 8).toString(16);
    } else {
      out += ((Math.random() * 16) | 0).toString(16);
    }
  }
  return out;
}
