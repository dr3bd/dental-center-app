export const YER_CURRENCY = 'YER';

export function ensureYer(amount: number) {
  if (!Number.isInteger(amount)) {
    throw new Error('النظام يدعم مبالغ صحيحة بالريال اليمني فقط');
  }
  if (amount < 0) {
    throw new Error('لا يسمح بالمبالغ السالبة');
  }
  return amount;
}

export function formatYer(amount: number) {
  ensureYer(amount);
  return new Intl.NumberFormat('ar-YE', { maximumFractionDigits: 0 }).format(amount) + ` ${YER_CURRENCY}`;
}
