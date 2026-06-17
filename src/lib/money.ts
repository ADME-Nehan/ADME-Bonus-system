export function formatLKR(value: number, maxDigits = 2) {
  const safeValue = Number(value || 0);
  const safeMaxDigits = Math.max(0, Math.min(Number(maxDigits || 0), 20));

  return safeValue.toLocaleString('en-LK', {
    minimumFractionDigits: safeMaxDigits === 0 ? 0 : 2,
    maximumFractionDigits: safeMaxDigits,
  });
}

export function formatWhole(value: number) {
  return Number(value || 0).toLocaleString('en-LK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}