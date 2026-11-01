const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function toFaDigits(value: string | number): string {
  return String(value)
    .replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)])
    .replace(/\./g, "٫");
}

export function toFaNumber(value: number): string {
  return toFaDigits(value.toLocaleString("en-US")).replace(/,/g, "٬");
}

/** seconds -> «۲:۰۵» */
export function formatClock(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) totalSeconds = 0;
  const s = Math.floor(totalSeconds);
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return `${toFaDigits(m)}:${toFaDigits(String(rest).padStart(2, "0"))}`;
}

export function formatBytesFa(bytes: number): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${toFaDigits(bytes)} بایت`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${toFaDigits(kb.toFixed(kb < 10 ? 1 : 0))} کیلوبایت`;
  const mb = kb / 1024;
  return `${toFaDigits(mb.toFixed(2))} مگابایت`;
}

export function formatDateFa(iso: string): string {
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}
