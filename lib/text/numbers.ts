/**
 * Spanish number words. Speech recognisers often return digits ("3") where the
 * player said "tres", so answers are compared after converting digits to words.
 */

const UNITS = [
  'cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve',
  'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve',
  'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete',
  'veintiocho', 'veintinueve',
];

const TENS: Record<number, string> = {
  30: 'treinta',
  40: 'cuarenta',
  50: 'cincuenta',
  60: 'sesenta',
  70: 'setenta',
  80: 'ochenta',
  90: 'noventa',
};

const HUNDREDS: Record<number, string> = {
  100: 'ciento',
  200: 'doscientos',
  300: 'trescientos',
  400: 'cuatrocientos',
  500: 'quinientos',
  600: 'seiscientos',
  700: 'setecientos',
  800: 'ochocientos',
  900: 'novecientos',
};

function below100(n: number): string {
  if (n < 30) return UNITS[n];
  const tens = Math.floor(n / 10) * 10;
  const unit = n % 10;
  return unit === 0 ? TENS[tens] : `${TENS[tens]} y ${UNITS[unit]}`;
}

function below1000(n: number): string {
  if (n < 100) return below100(n);
  if (n === 100) return 'cien';
  const hundreds = Math.floor(n / 100) * 100;
  const rest = n % 100;
  return rest === 0 ? HUNDREDS[hundreds] : `${HUNDREDS[hundreds]} ${below100(rest)}`;
}

/** 0–999 999 → Spanish words ("uno" form for 1). */
export function numberToSpanish(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 999_999) return String(n);
  if (n < 1000) return below1000(n);
  const thousands = Math.floor(n / 1000);
  const rest = n % 1000;
  const head = thousands === 1 ? 'mil' : `${below1000(thousands).replace(/uno$/, 'un')} mil`;
  return rest === 0 ? head : `${head} ${below1000(rest)}`;
}

/** Replaces every run of digits in `text` with Spanish number words. */
export function digitsToSpanish(text: string): string {
  return text.replace(/\d+/g, (match) => {
    const n = Number(match);
    return Number.isFinite(n) ? numberToSpanish(n) : match;
  });
}
