// Convert standard text into small-caps and clan-styled typography

const SMALL_CAPS_MAP: Record<string, string> = {
  a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ғ', g: 'ɢ', h: 'ʜ', i: 'ɪ',
  j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴘ', q: 'ǫ', r: 'ʀ',
  s: 's', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ', z: 'ᴢ',
  A: 'ᴀ', B: 'ʙ', C: 'ᴄ', D: 'ᴅ', E: 'ᴇ', F: 'ғ', G: 'ɢ', H: 'ʜ', I: 'ɪ',
  J: 'ᴊ', K: 'ᴋ', L: 'ʟ', M: 'ᴍ', N: 'ɴ', O: 'ᴏ', P: 'ᴘ', Q: 'ǫ', R: 'ʀ',
  S: 's', T: 'ᴛ', U: 'ᴜ', V: 'ᴠ', W: 'ᴡ', X: 'x', Y: 'ʏ', Z: 'ᴢ',
};

export function toSmallCaps(text: string): string {
  return text
    .split('')
    .map(ch => SMALL_CAPS_MAP[ch] || ch)
    .join('');
}

export interface TagStyleOption {
  id: string;
  label: string;
  format: (name: string, role: string) => string;
}

export const TAG_STYLES: TagStyleOption[] = [
  {
    id: 'official',
    label: 'Official Z.V.R Standard',
    format: (name, role) => `ツ𝐙‧𝐕‧𝐑 ᥫ᭡${role}•${toSmallCaps(name)}`
  },
  {
    id: 'star-flair',
    label: 'Z.V.R Star Edition',
    format: (name, role) => `★𝐙‧𝐕‧𝐑 ᥫ᭡${role}•${toSmallCaps(name)}★`
  },
  {
    id: 'heart-flair',
    label: 'Z.V.R Sweet Edition',
    format: (name, role) => `ᥫ᭡ 𝐙‧𝐕‧𝐑 • ${role} ꨄ ${toSmallCaps(name)}`
  },
  {
    id: 'clean-bracket',
    label: 'Z.V.R Clean Gamer',
    format: (name, role) => `[Z.V.R] ${role} • ${name.toUpperCase()}`
  }
];
