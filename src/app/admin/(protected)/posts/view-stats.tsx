import type { ViewStats } from '@/lib/views';

const numberFormat = new Intl.NumberFormat('cs-CZ');

const dateFormat = new Intl.DateTimeFormat('cs-CZ', {
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
});

type Props = {
  stats: ViewStats;
  isDraft: boolean;
};

export function ViewStatsPanel({ stats, isDraft }: Props) {
  const items = [
    { label: 'Celkem', value: stats.total },
    { label: 'Posledních 30 dní', value: stats.last30Days },
    { label: 'Posledních 7 dní', value: stats.last7Days },
    { label: 'Dnes', value: stats.today },
  ];

  return (
    <section aria-labelledby="view-stats-heading" className="mb-8">
      <h2 id="view-stats-heading" className="mb-2 text-sm font-medium">
        Zobrazení
      </h2>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-neutral-200 bg-neutral-200 sm:grid-cols-4 dark:border-neutral-800 dark:bg-neutral-800">
        {items.map((item) => (
          <div key={item.label} className="bg-white px-4 py-3 dark:bg-neutral-900">
            <dt className="text-xs text-neutral-500">{item.label}</dt>
            <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
              {numberFormat.format(item.value)}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-2 text-xs text-neutral-500">
        Vidíš je jen tady.{' '}
        {stats.since
          ? `Počítá se od ${dateFormat.format(new Date(`${stats.since}T00:00:00`))}.`
          : 'Zatím žádné zobrazení.'}{' '}
        {isDraft ? 'Koncept se nepočítá. ' : null}
        Návštěvník se u postu počítá nejvýš jednou za 30 minut, tvoje vlastní zobrazení ani roboti
        se nepočítají.
      </p>
    </section>
  );
}
