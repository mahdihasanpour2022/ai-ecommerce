const persianDateTime = new Intl.DateTimeFormat('fa-IR', {
  calendar: 'persian',
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Tehran',
});

export function formatPersianDateTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : persianDateTime.format(date);
}
