/** "Sep 5, 2023" — matches the design and the English public side. */
const shortDate = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export function formatDate(value: Date): string {
  return shortDate.format(value);
}

/** ISO date for <time datetime="..."> */
export function isoDate(value: Date): string {
  return value.toISOString();
}
