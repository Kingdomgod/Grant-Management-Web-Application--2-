export function formatCurrency(amount: string | number, opts?: {
  locale?: string;
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}) {
  const locale = opts?.locale ?? 'en-ZA';
  const currency = opts?.currency ?? 'ZAR';
  const minF = opts?.minimumFractionDigits ?? 0;
  const maxF = opts?.maximumFractionDigits ?? 0;
  const value = typeof amount === 'string' ? parseFloat(amount) || 0 : (amount as number) || 0;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: minF,
    maximumFractionDigits: maxF,
  }).format(value);
}

export default formatCurrency;
