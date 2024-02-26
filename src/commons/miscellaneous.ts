import { createHash } from 'crypto';

export function parseIntExact(string: string): number {
  if (!/^(?:0|-?[1-9]\d*)$/.test(string)) {
    return NaN;
  }
  return +string;
}

export function computeGravatarHash(gravatarEmail: string): string {
  if (gravatarEmail === null) {
    return '00000000000000000000000000000000';
  } else {
    return createHash('md5').update(gravatarEmail.trim().toLowerCase()).digest('hex');
  }
}
