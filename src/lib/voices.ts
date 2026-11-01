export type VoiceId = "female" | "male" | "narrator";
export type ToneId = "happy" | "friendly" | "news" | "story" | "emotional";

/* ------------------------------------------------------------------ */
/* Characters — each one is a REAL, different Persian voice model      */
/* (measured pitch: Mana ≈ 216 Hz female · Amir ≈ 140 Hz young male ·  */
/*  Ganji-Adabi ≈ 99 Hz deep literary male)                            */
/* ------------------------------------------------------------------ */

export interface VoiceDef {
  id: VoiceId;
  /** Persian display title, e.g. «صدای زن» */
  title: string;
  /** character name */
  name: string;
  desc: string;
  image: string;
  /** pre-rendered sample shipped with the app (instant preview) */
  sampleUrl: string;
  /** text of that sample */
  sampleText: string;
  /** shaping applied on top of the voice model */
  lengthScale: number;
  pitchRatio: number;
}

export const VOICES: VoiceDef[] = [
  {
    id: "female",
    title: "صدای زن",
    name: "مانا",
    desc: "صدای زنانهٔ واقعی؛ گرم، روشن و روان، مناسب آموزش، تبلیغ و پیام",
    image: "/voices/female.jpg",
    sampleUrl: "/samples/female.mp3",
    sampleText:
      "سلام! من مانا هستم. هر متنی را که بنویسید، با صدایی گرم و طبیعی برایتان می‌خوانم.",
    lengthScale: 1.0,
    pitchRatio: 1.0,
  },
  {
    id: "male",
    title: "صدای مرد",
    name: "امیر",
    desc: "صدای مردانهٔ جوان؛ پرانرژی، مطمئن و صمیمی، مناسب پادکست و معرفی",
    image: "/voices/male.jpg",
    sampleUrl: "/samples/male.mp3",
    sampleText:
      "سلام! من امیر هستم. متن شما را با انرژی و اطمینان برای مخاطبانتان می‌خوانم.",
    lengthScale: 0.98,
    pitchRatio: 1.0,
  },
  {
    id: "narrator",
    title: "راوی",
    name: "استاد راوی",
    desc: "صدایی بم و ادبی با لحن کتاب‌خوانی؛ مناسب داستان، شعر و مستند",
    image: "/voices/narrator.jpg",
    sampleUrl: "/samples/narrator.mp3",
    sampleText:
      "و این‌گونه بود که قصهٔ ما آغاز شد؛ در شبی آرام، زیر نور مهتاب، کنار آتشی گرم و روشن.",
    lengthScale: 1.04,
    pitchRatio: 0.99,
  },
];

export const voiceById = (id: string): VoiceDef =>
  VOICES.find((v) => v.id === id) ?? VOICES[0];

/* ------------------------------------------------------------------ */
/* Tones — expression comes from rhythm, variation, pauses, breathing  */
/* and EQ (see audio/master.ts), not from extreme pitch bending.       */
/* ------------------------------------------------------------------ */

export interface ToneDef {
  id: ToneId;
  title: string;
  desc: string;
  /** VITS voice-model controls: lengthScale > 1 means slower speech. */
  lengthScale: number;
  noiseScale: number;
  noiseW: number;
  /** restrained overall pitch colour; a small shift keeps Persian consonants clear */
  pitchRatio: number;
  /** extra pitch lift on interrogative / exclamatory phrase endings */
  questionLift: number;
  exclamationLift: number;
  /** tiny sentence-to-sentence pitch contour variation */
  contourRange: number;
}

export const TONES: ToneDef[] = [
  {
    id: "happy",
    title: "شاد و پرانرژی",
    desc: "ریتم چابک، زیرتر و با اوج محسوس روی جمله‌های هیجانی",
    lengthScale: 0.82,
    noiseScale: 0.77,
    noiseW: 0.98,
    pitchRatio: 1.07,
    questionLift: 0.03,
    exclamationLift: 0.05,
    contourRange: 0.016,
  },
  {
    id: "friendly",
    title: "صمیمی و گرم",
    desc: "ریتم میانه، نرم و دوستانه؛ مثل گفت‌وگو با یک دوست",
    lengthScale: 1.0,
    noiseScale: 0.69,
    noiseW: 0.84,
    pitchRatio: 1.005,
    questionLift: 0.018,
    exclamationLift: 0.012,
    contourRange: 0.008,
  },
  {
    id: "news",
    title: "خبری و رسمی",
    desc: "تخت‌تر، شمرده و منظم؛ بدون فراز و فرودهای نمایشی",
    lengthScale: 1.08,
    noiseScale: 0.57,
    noiseW: 0.62,
    pitchRatio: 0.97,
    questionLift: 0.002,
    exclamationLift: 0.003,
    contourRange: 0.002,
  },
  {
    id: "story",
    title: "داستانی و نمایشی",
    desc: "آهسته و بم‌تر، با مکث‌های بلند و فراز و فرود قصه‌گو",
    lengthScale: 1.15,
    noiseScale: 0.73,
    noiseW: 0.96,
    pitchRatio: 0.92,
    questionLift: 0.04,
    exclamationLift: 0.028,
    contourRange: 0.021,
  },
  {
    id: "emotional",
    title: "احساسی و شاعرانه",
    desc: "آهسته‌تر و نرم‌تر، با پایان‌های کشیده و مکث‌های پررنگ",
    lengthScale: 1.32,
    noiseScale: 0.68,
    noiseW: 0.9,
    pitchRatio: 1.005,
    questionLift: 0.014,
    exclamationLift: 0.012,
    contourRange: 0.011,
  },
];

export const toneById = (id: string): ToneDef =>
  TONES.find((t) => t.id === id) ?? TONES[1];

/* ------------------------------------------------------------------ */
/* On-device voice models (Piper / VITS, open-source)                  */
/* ------------------------------------------------------------------ */

export interface PiperVoiceDef {
  characterId: VoiceId;
  piperId: string;
  /** direct links (CORS-enabled) to the model + config */
  modelUrl: string;
  configUrl: string;
  /** exact size, used for the progress bar */
  sizeBytes: number;
  /** attribution shown in the app */
  credit: string;
}

const RHASSPY =
  "https://huggingface.co/rhasspy/piper-voices/resolve/main/fa/fa_IR";

export const PIPER_VOICES: PiperVoiceDef[] = [
  {
    characterId: "female",
    piperId: "fa_IR-mana-medium",
    modelUrl:
      "https://huggingface.co/MahtaFetrat/Mana-Persian-Piper/resolve/main/fa_IR-mana-medium.onnx",
    configUrl:
      "https://huggingface.co/MahtaFetrat/Mana-Persian-Piper/resolve/main/fa_IR-mana-medium.onnx.json",
    sizeBytes: 63531379,
    credit: "مانا — مدل Mana-Persian-Piper (مجوز MIT) بر پایهٔ دادگان ManaTTS (CC0)",
  },
  {
    characterId: "male",
    piperId: "fa_IR-amir-medium",
    modelUrl: `${RHASSPY}/amir/medium/fa_IR-amir-medium.onnx`,
    configUrl: `${RHASSPY}/amir/medium/fa_IR-amir-medium.onnx.json`,
    sizeBytes: 63531379,
    credit: "امیر — صدای امیر سوءاخشی، دادگان Datacula (CC0)",
  },
  {
    characterId: "narrator",
    piperId: "fa_IR-ganji_adabi-medium",
    modelUrl: `${RHASSPY}/ganji_adabi/medium/fa_IR-ganji_adabi-medium.onnx`,
    configUrl: `${RHASSPY}/ganji_adabi/medium/fa_IR-ganji_adabi-medium.onnx.json`,
    sizeBytes: 63516050,
    credit: "استاد راوی — صدای احمد گنجی (نسخهٔ ادبی)، دادگان Datacula (CC0)",
  },
];

export const piperByCharacter = (id: string): PiperVoiceDef =>
  PIPER_VOICES.find((v) => v.characterId === id) ?? PIPER_VOICES[0];

/* ------------------------------------------------------------------ */
/* Sample texts & misc                                                 */
/* ------------------------------------------------------------------ */

export interface SampleText {
  title: string;
  tone: ToneId;
  voice: VoiceId;
  text: string;
}

export const SAMPLE_TEXTS: SampleText[] = [
  {
    title: "شاد و هیجانی",
    tone: "happy",
    voice: "female",
    text: "وای خدای من! بالاخره موفق شدیم! امروز بهترین روز زندگی‌مان است. بیایید همه با هم جشن بگیریم، بخندیم و از این لحظه‌های قشنگ لذت ببریم!",
  },
  {
    title: "گزارش خبری",
    tone: "news",
    voice: "male",
    text: "به گزارش خبرنگار ما از تهران، صبح امروز نمایشگاه بین‌المللی کتاب با حضور هزاران بازدیدکننده گشایش یافت. مسئولان اعلام کردند این رویداد تا پایان هفته ادامه خواهد داشت و ورود برای عموم آزاد است.",
  },
  {
    title: "قصه شب",
    tone: "story",
    voice: "narrator",
    text: "در دل شب، وقتی ماه پشت ابرهای سیاه پنهان شده بود، پیرمرد قصه‌گو چراغ نفتی را روشن کرد و با صدایی آرام گفت: [مکث] یکی بود، یکی نبود. در سرزمینی دور، پسری زندگی می‌کرد که آرزوی پرواز داشت...",
  },
  {
    title: "پیام صمیمی",
    tone: "friendly",
    voice: "female",
    text: "سلام دوست خوبم! چقدر دلم برات تنگ شده بود. امروز داشتم به خاطره‌های قشنگ‌مون فکر می‌کردم و گفتم حتماً بهت زنگ بزنم. امیدوارم همیشه سلامت و شاد باشی عزیزم.",
  },
  {
    title: "شعر احساسی",
    tone: "emotional",
    voice: "narrator",
    text: "امشب، زیر باران خاطره‌ها، دلم برای صدای تو تنگ شده است. کاش باد، عطر حضورت را تا پنجرهٔ اتاقم بیاورد... تا بدانم هنوز جایی در این جهان، قلبی برای من می‌تپد.",
  },
];

export const MAX_TEXT_LENGTH = 6000;

/** Rough speaking-time estimate for Persian (~13 chars/sec incl. pauses). */
export function estimateSeconds(text: string, ratePercent = 0): number {
  const chars = text.trim().length;
  if (!chars) return 0;
  const base = chars / 13;
  return Math.max(1, Math.round(base / (1 + ratePercent / 100)));
}
