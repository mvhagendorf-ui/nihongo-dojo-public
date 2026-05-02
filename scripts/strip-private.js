// One-shot: takes the personal data.js, strips private categories + Hebrew fields,
// rewrites the CATEGORIES + CATEGORY_GROUPS exports for the public version.
import { readFileSync, writeFileSync, copyFileSync } from "node:fs";

const PRIVATE_CATS = new Set([
  "MY_WORDS", "CH01_VOCAB", "CH02_VOCAB", "CH04_VOCAB", "CH05_VOCAB",
  "UNIT1_KANJI", "UNIT2_KANJI", "UNIT2_VOCAB",
]);

const PERSONAL_PATH = "C:/Users/mvhag/nihongo-dojo/src/data.js";
const PUBLIC_PATH = "src/data.js";

copyFileSync(PERSONAL_PATH, PUBLIC_PATH);
let src = readFileSync(PUBLIC_PATH, "utf-8");

// 1) Drop entry lines whose cat is in PRIVATE_CATS
const lines = src.split("\n");
const before = lines.filter(l => /^\s+\{\s*jp:/.test(l)).length;
const kept = lines.filter(l => {
  const m = l.match(/cat:\s*"([A-Z_0-9]+)"/);
  return m ? !PRIVATE_CATS.has(m[1]) : true;
});
const after = kept.filter(l => /^\s+\{\s*jp:/.test(l)).length;
console.log(`Removed ${before - after} private entries (${before} -> ${after})`);

let out = kept.join("\n");

// 2) Strip the heb: "..." and exHeb: "..." fields. We need to handle escaped
//    quotes inside the string (Hebrew text can contain \" as " escapes).
function stripField(text, fieldName) {
  const opener = new RegExp(`,\\s*${fieldName}:\\s*"`);
  let result = "";
  let cursor = 0;
  while (cursor < text.length) {
    const slice = text.slice(cursor);
    const m = slice.match(opener);
    if (!m) {
      result += slice;
      break;
    }
    result += slice.slice(0, m.index);
    // Advance to after the opening quote
    let j = cursor + m.index + m[0].length;
    // Walk forward, respecting backslash escapes
    while (j < text.length) {
      const ch = text[j];
      if (ch === "\\") { j += 2; continue; }
      if (ch === '"') { j++; break; }
      j++;
    }
    cursor = j;
  }
  return result;
}

out = stripField(out, "heb");
out = stripField(out, "exHeb");

// 3) Rewrite CATEGORIES + CATEGORY_GROUPS for the public version
out = out.replace(
  /export const CATEGORIES = \{[\s\S]*?\};/,
  `export const CATEGORIES = {
  N2_GRAMMAR: "JLPT N2 文法",
  N1_GRAMMAR: "JLPT N1 文法",
  ELITE_ADVERBS: "Elite Adverbs",
  CONNECTORS: "Connectors",
  BUSINESS_VOCAB: "Business Japanese · ビジネス",
  N2_VERBS: "N2 動詞セット",
  CUSTOM: "Custom Quiz",
};`
);

out = out.replace(
  /export const CATEGORY_GROUPS = \[[\s\S]*?\];/,
  `export const CATEGORY_GROUPS = [
  { label: "Grammar · 文法", cats: ["N2_GRAMMAR", "N1_GRAMMAR"] },
  { label: "Conversation · 会話", cats: ["ELITE_ADVERBS", "CONNECTORS"] },
  { label: "Vocabulary · 語彙", cats: ["BUSINESS_VOCAB", "N2_VERBS"] },
];`
);

writeFileSync(PUBLIC_PATH, out);
const finalEntries = (out.match(/^\s+\{\s*jp:/gm) || []).length;
console.log(`Output: ${out.length} bytes, ${finalEntries} entries`);
