export function formatINRPaise(value?: number) {
  if (value == null) {
    return '₹0.00';
  }

  return `₹${(value / 100).toFixed(2)}`;
}

export function formatDateTime(value?: string | Date) {
  if (!value) {
    return '-';
  }
  return new Date(value).toLocaleString();
}
