const persianIntegerFormatter = new Intl.NumberFormat('fa-IR', {
  maximumFractionDigits: 0,
  useGrouping: false,
});

export function formatPersianInteger(value: number): string {
  return persianIntegerFormatter.format(value);
}
