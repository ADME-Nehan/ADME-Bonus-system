export function formatLKR(value: number, maxDigits = 2) {
  return Number(value || 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: maxDigits,
  });
}

export function formatWhole(value: number) {
  return Number(value || 0).toLocaleString('en-LK', {
    maximumFractionDigits: 0,
  });
}