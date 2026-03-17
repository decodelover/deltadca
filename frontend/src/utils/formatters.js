const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const longDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const chartDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: '2-digit',
});

const compactCurrencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 2,
});

function parseDateValue(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim();
    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmedValue);

    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch;
      return new Date(Number(year), Number(month) - 1, Number(day), 12);
    }
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

export function formatCurrency(value) {
  const amount = Number(value);
  return currencyFormatter.format(Number.isFinite(amount) ? amount : 0);
}

export function formatPercent(value) {
  const ratio = Number(value);
  return percentFormatter.format(Number.isFinite(ratio) ? ratio : 0);
}

export function formatAxisCurrency(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return '$0';
  }

  const absoluteAmount = Math.abs(amount);

  if (absoluteAmount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}m`;
  }

  if (absoluteAmount >= 1_000) {
    return `$${(amount / 1_000).toFixed(1)}k`;
  }

  return `$${Math.round(amount)}`;
}

export function formatCompactCurrency(value) {
  const amount = Number(value);
  return compactCurrencyFormatter.format(Number.isFinite(amount) ? amount : 0);
}

export function formatSignedPercent(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return '0.00%';
  }

  const prefix = amount > 0 ? '+' : '';
  return `${prefix}${amount.toFixed(2)}%`;
}

export function formatDate(value) {
  const date = parseDateValue(value);
  return date ? longDateFormatter.format(date) : 'N/A';
}

export function formatChartDate(value) {
  const date = parseDateValue(value);
  return date ? chartDateFormatter.format(date) : '';
}

export function formatFrequency(days) {
  if (typeof days === 'string') {
    const normalized = days.trim().toLowerCase();

    if (normalized === 'daily') {
      return 'Daily';
    }

    if (normalized === 'weekly') {
      return 'Weekly';
    }

    if (normalized === 'monthly') {
      return 'Monthly';
    }
  }

  const cadence = Number(days);

  if (!Number.isFinite(cadence) || cadence <= 0) {
    return 'Custom cadence';
  }

  if (cadence === 1) {
    return 'Daily';
  }

  if (cadence === 7) {
    return 'Weekly';
  }

  if (cadence === 30) {
    return 'Monthly';
  }

  return `Every ${cadence} days`;
}

export function getInitials(name = '') {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  return initials || 'DD';
}
