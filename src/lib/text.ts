/**
 * Persian text preparation for natural, human-like speech.
 * Pure functions (no DOM / Node APIs) so they run in the phone's WebView
 * and can also be unit-tested in plain Node.
 */

/* ------------------------------------------------------------------ */
/* 1) Normalisation — improves pronunciation accuracy                  */
/* ------------------------------------------------------------------ */

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const DIGIT = "[0-9۰-۹]";

export function normalizePersian(input: string): string {
  let t = input
    // Arabic presentation forms -> Persian letters
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/[أإٱ]/g, "ا")
    // Arabic-Indic digits -> Persian digits
    .replace(/[٠-٩]/g, (d) => FA_DIGITS[d.charCodeAt(0) - 0x0660])
    // remove kashida (tatweel)
    .replace(/ـ/g, "")
    // unify quotes
    .replace(/[“”«»]/g, " ")
    .replace(/[‘’]/g, "'")
    // ellipsis
    .replace(/\.\.\./g, "…")
    // drop characters that confuse the reader
    .replace(/[*_#~`>|\\^]/g, " ")
    .replace(/https?:\/\/\S+/g, " ");

  // numbers: 12,500 -> 12500 · 50% -> 50 درصد · 3.5 -> 3 ممیز 5
  t = t
    .replace(new RegExp(`(${DIGIT})[,٬](?=${DIGIT}{3}(?!${DIGIT}))`, "g"), "$1")
    .replace(new RegExp(`(${DIGIT}+)\\s*[%٪]`, "g"), "$1 درصد")
    .replace(new RegExp(`(${DIGIT}+)[.٫](${DIGIT}+)`, "g"), "$1 ممیز $2");

  t = t
    // no space before punctuation, one space after sentence enders
    .replace(/\s+([،؛.!؟?:؛])/g, "$1")
    .replace(/([.!؟?…])([^\s.!؟?…])/g, "$1 $2")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Make sure the text ends with a sentence terminator so the voice
  // finishes the last sentence with a natural falling intonation.
  if (t && !/[.!؟?…:]$/.test(t)) t += ".";
  return t;
}

/** Final clean-up of one chunk right before it is sent to the voice model. */
export function forPiper(text: string): string {
  return text
    .replace(/…/g, "...")
    .replace(/[—–]/g, "،")
    .replace(/[“”«»"()\[\]{}<>]/g, " ")
    .replace(/[\u{1F000}-\u{1FFFF}\u2600-\u27BF]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* ------------------------------------------------------------------ */
/* 2) Explicit pause markers typed by the user                         */
/*    [مکث] / [نفس]  -> short breath pause                             */
/*    [مکث طولانی]   -> paragraph break (long pause)                   */
/* ------------------------------------------------------------------ */

export function applyPauseMarkers(input: string): string {
  return input
    .replace(/\[\s*مکث\s+طولانی\s*\]|\[\s*long\s*pause\s*\]/gi, "\n\n")
    .replace(/\[\s*(?:مکث|نفس|pause|breath)\s*\]/gi, " … ");
}

/** Pretty text for the UI (pause markers shown as an ellipsis). */
export function stripMarkersForDisplay(input: string): string {
  return input
    .replace(/\[\s*مکث\s+طولانی\s*\]|\[\s*long\s*pause\s*\]/gi, " … ")
    .replace(/\[\s*(?:مکث|نفس|pause|breath)\s*\]/gi, "…")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/* ------------------------------------------------------------------ */
/* 3) Automatic "breathing" — insert light commas inside very long,    */
/*    punctuation-less sentences at natural clause boundaries, so the  */
/*    voice takes short breaths like a human instead of rushing.       */
/* ------------------------------------------------------------------ */

const CLAUSE_WORDS = new Set([
  "و",
  "اما",
  "ولی",
  "چون",
  "زیرا",
  "که",
  "سپس",
  "بعد",
  "همچنین",
  "بنابراین",
  "درنتیجه",
  "یعنی",
  "مثلاً",
  "مثلا",
  "اگر",
  "وقتی",
  "هنگامی",
  "تا",
  "بلکه",
  "هرچند",
  "بااین‌حال",
  "ازطرفی",
  "نخست",
  "سرانجام",
]);

const cleanWord = (w: string) =>
  w.replace(/[ً-ٰٟ]/g, "").replace(/[،؛.!؟?:؛«»()"]/g, "");

function breatheSentence(sentence: string): string {
  const words = sentence.split(/\s+/).filter(Boolean);
  if (words.length < 16) return sentence;
  // already punctuated inside — leave the author's rhythm alone
  const core = sentence.replace(/[.!؟?…\s]+$/, "");
  if (/[،؛:]/.test(core)) return sentence;

  const out: string[] = [];
  let sinceBreak = 0;
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const isLast = i === words.length - 1;
    if (
      !isLast &&
      sinceBreak >= 8 &&
      CLAUSE_WORDS.has(cleanWord(word)) &&
      out.length > 0 &&
      !/[،؛]$/.test(out[out.length - 1])
    ) {
      out[out.length - 1] += "،";
      sinceBreak = 0;
    } else if (!isLast && sinceBreak >= 15) {
      // hard breath point even without a conjunction
      out.push(word + "،");
      sinceBreak = 0;
      continue;
    }
    out.push(word);
    sinceBreak++;
  }
  return out.join(" ");
}

function breatheParagraph(paragraph: string): string {
  const sentences = paragraph.match(/[^.!؟?…]+[.!؟?…]*/g) ?? [paragraph];
  return sentences
    .map((s) => breatheSentence(s.trim()))
    .join(" ")
    .trim();
}

/**
 * Full humanising pipeline: markers → normalise → breathing commas.
 * Paragraph breaks are preserved (the mastering stage adds real pauses).
 */
export function humanizeForSpeech(input: string): string {
  const marked = applyPauseMarkers(input);
  const normalised = normalizePersian(marked);
  return normalised
    .split(/\n{2,}/)
    .map((p) => breatheParagraph(p))
    .filter(Boolean)
    .join("\n\n");
}

/* ------------------------------------------------------------------ */
/* 4) Chunking — roughly one sentence per chunk (very short sentences  */
/*    are merged), never across paragraphs. Each chunk remembers how   */
/*    it ends so the mastering stage can place a fitting pause.        */
/* ------------------------------------------------------------------ */

export type EndMark = "" | "." | "!" | "؟" | "…" | ":" | "؛" | "،";

export interface SpeechChunk {
  text: string;
  endMark: EndMark;
  /** true when a paragraph (long) pause should follow this chunk */
  paragraphBreakAfter: boolean;
}

function endMarkOf(text: string): EndMark {
  const last = text.trim().slice(-1);
  if (last === "?" || last === "؟") return "؟";
  if (".!…:؛،".includes(last) && last) return last as EndMark;
  return "";
}

function splitLong(sentence: string, maxChars: number): string[] {
  const parts: string[] = [];
  let rest = sentence;
  while (rest.length > maxChars) {
    let cut = rest.lastIndexOf("،", maxChars);
    if (cut < maxChars * 0.4) cut = rest.lastIndexOf("؛", maxChars);
    if (cut < maxChars * 0.4) cut = rest.lastIndexOf(" ", maxChars);
    if (cut <= 0) cut = maxChars;
    parts.push(rest.slice(0, cut + 1).trim());
    rest = rest.slice(cut + 1).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}

export function buildSpeechChunks(
  text: string,
  opts: { maxChars?: number; softChars?: number } = {},
): SpeechChunk[] {
  const maxChars = opts.maxChars ?? 260;
  const softChars = opts.softChars ?? 110;

  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: SpeechChunk[] = [];

  paragraphs.forEach((paragraph, pIdx) => {
    const sentences = paragraph
      .split(/(?<=[.!؟?…])\s+|\n+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const local: string[] = [];
    let current = "";
    for (const sentence of sentences) {
      if (sentence.length > maxChars) {
        if (current) local.push(current);
        current = "";
        local.push(...splitLong(sentence, maxChars));
        continue;
      }
      const explicitPause = /…$/.test(current);
      if (
        current &&
        !explicitPause &&
        current.length + 1 + sentence.length <= softChars
      ) {
        current = `${current} ${sentence}`;
      } else {
        if (current) local.push(current);
        current = sentence;
      }
    }
    if (current) local.push(current);

    local.forEach((chunkText, cIdx) => {
      chunks.push({
        text: chunkText,
        endMark: endMarkOf(chunkText),
        paragraphBreakAfter:
          cIdx === local.length - 1 && pIdx < paragraphs.length - 1,
      });
    });
  });

  return chunks;
}
