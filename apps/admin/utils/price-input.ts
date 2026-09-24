export function normalizePriceInput(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[۰-۹٠-٩]/gu, (digit) => {
      const codePoint = digit.codePointAt(0);
      if (codePoint === undefined) return '';
      return String(codePoint >= 0x06f0 ? codePoint - 0x06f0 : codePoint - 0x0660);
    })
    .replace(/[^0-9]/gu, '');
}

export function formatPriceInput(value: string): string {
  return normalizePriceInput(value).replace(/\B(?=(\d{3})+(?!\d))/gu, ',');
}
