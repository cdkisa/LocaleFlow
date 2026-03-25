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
  a: "\u00e0",
  b: "\u0180",
  c: "\u00e7",
  d: "\u00f0",
  e: "\u00e9",
  f: "\u0192",
  g: "\u01e7",
  h: "\u0125",
  i: "\u00ed",
  j: "\u0135",
  k: "\u01e9",
  l: "\u013a",
  m: "\u0271",
  n: "\u00f1",
  o: "\u00f3",
  p: "\u00fe",
  q: "q",
  r: "\u0155",
  s: "\u0161",
  t: "\u0163",
  u: "\u00fa",
  v: "\u1ebd",
  w: "\u0175",
  x: "\u1e8b",
  y: "\u00fd",
  z: "\u017e",
  A: "\u00c0",
  B: "\u0181",
  C: "\u00c7",
  D: "\u00d0",
  E: "\u00c9",
  F: "\u0191",
  G: "\u01e6",
  H: "\u0124",
  I: "\u00cd",
  J: "\u0134",
  K: "\u01e8",
  L: "\u0139",
  M: "\u1e40",
  N: "\u00d1",
  O: "\u00d3",
  P: "\u00de",
  Q: "Q",
  R: "\u0154",
  S: "\u0160",
  T: "\u0162",
  U: "\u00da",
  V: "\u1ebc",
  W: "\u0174",
  X: "\u1e8a",
  Y: "\u00dd",
  Z: "\u017d",
};

/**
 * Regex to match common placeholder patterns:
 * - {{name}}       -- double-brace interpolation (i18next, Handlebars, etc.)
 * - {0}, {name}    -- single-brace interpolation (ICU, .NET, Java MessageFormat)
 * - %s, %d, %1$s   -- printf-style placeholders
 * - <tag>...</tag>  -- HTML/XML tags
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
