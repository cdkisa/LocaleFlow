/**
 * Pseudo-localization utility for simulating translated text.
 *
 * Transforms source strings by:
 * 1. Replacing ASCII letters with accented equivalents
 * 2. Expanding the string by ~30% to simulate longer translations
 * 3. Wrapping the result in [[ ]] bracket markers
 *
 * Placeholders like {{name}}, {0}, %s, etc. are preserved untouched.
 */

const accentMap: Record<string, string> = {
  a: "à",
  b: "ƀ",
  c: "ç",
  d: "ð",
  e: "é",
  f: "ƒ",
  g: "ǧ",
  h: "ĥ",
  i: "í",
  j: "ĵ",
  k: "ǩ",
  l: "ĺ",
  m: "ɱ",
  n: "ñ",
  o: "ó",
  p: "þ",
  q: "q",
  r: "ŕ",
  s: "š",
  t: "ţ",
  u: "ú",
  v: "ṽ",
  w: "ŵ",
  x: "ẋ",
  y: "ý",
  z: "ž",
  A: "À",
  B: "Ɓ",
  C: "Ç",
  D: "Ð",
  E: "É",
  F: "Ƒ",
  G: "Ǧ",
  H: "Ĥ",
  I: "Í",
  J: "Ĵ",
  K: "Ǩ",
  L: "Ĺ",
  M: "Ṁ",
  N: "Ñ",
  O: "Ó",
  P: "Þ",
  Q: "Q",
  R: "Ŕ",
  S: "Š",
  T: "Ţ",
  U: "Ú",
  V: "Ṽ",
  W: "Ŵ",
  X: "Ẋ",
  Y: "Ý",
  Z: "Ž",
};

/**
 * Regex to match common placeholder patterns:
 * - {{name}}       — double-brace interpolation (i18next, Handlebars, etc.)
 * - {0}, {name}    — single-brace interpolation (ICU, .NET, Java MessageFormat)
 * - %s, %d, %1$s   — printf-style placeholders
 * - <tag>...</tag>  — HTML/XML tags
 */
const PLACEHOLDER_RE =
  /(\{\{[^}]+\}\}|\{[^}]+\}|%\d*\$?[sdfu]|<\/?[a-zA-Z][^>]*>)/g;

function accentify(text: string): string {
  let result = "";
  for (const ch of text) {
    result += accentMap[ch] ?? ch;
  }
  return result;
}

/**
 * Apply pseudo-localization to a source string.
 *
 * @param text - The original (source language) string.
 * @returns The pseudo-localized string.
 */
export function pseudoLocalize(text: string): string {
  if (!text || text.trim().length === 0) {
    return text;
  }

  // Split text into segments: placeholders (kept intact) and regular text (transformed)
  const parts = text.split(PLACEHOLDER_RE);

  let accented = "";
  for (const part of parts) {
    if (PLACEHOLDER_RE.test(part)) {
      // Reset lastIndex after test because of the global flag
      PLACEHOLDER_RE.lastIndex = 0;
      accented += part; // leave placeholder as-is
    } else {
      accented += accentify(part);
    }
  }

  // Calculate padding length (~30% of the original text length, minimum 2 chars)
  const paddingLength = Math.max(2, Math.ceil(text.length * 0.3));
  const padding = "~".repeat(paddingLength);

  return `[[${accented}${padding}]]`;
}
