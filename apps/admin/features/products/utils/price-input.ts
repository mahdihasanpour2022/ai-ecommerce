export function normalizePriceInput(value: string): string {
  return value.replace(/[^0-9]/gu, '');
}

export function formatPriceInput(value: string): string {
  return normalizePriceInput(value).replace(/\B(?=(\d{3})+(?!\d))/gu, ',');
}
