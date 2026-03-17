import { CalendarRange, DollarSign, Orbit, TimerReset } from 'lucide-react';
import CoinPicker from './CoinPicker';
import { formatCurrency, formatDate, formatFrequency } from '../utils/formatters';

const cadenceOptions = [
  { label: 'Daily', value: '1' },
  { label: 'Weekly', value: '7' },
  { label: 'Monthly', value: '30' },
];

function CalculatorForm({
  values,
  onChange,
  onSubmit,
  isLoading,
  earliestAllowedDate,
  latestAllowedDate,
  marketCoins,
  providerLabel,
  historyWindowDays,
  className = '',
}) {
  const hasDateRangeOutsideWindow = (
    (values.startDate && (values.startDate < earliestAllowedDate || values.startDate > latestAllowedDate))
    || (values.endDate && (values.endDate < earliestAllowedDate || values.endDate > latestAllowedDate))
    || (values.startDate && values.endDate && values.startDate > values.endDate)
  );

  return (
    <section className={`panel-elevated relative overflow-hidden p-5 sm:p-8 lg:p-10 ${className}`}>
      <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,rgba(125,215,255,0.16),transparent_72%)]" />
      <div className="absolute -right-8 top-10 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(240,140,86,0.16),transparent_72%)] blur-3xl" />

      <div className="relative flex h-full flex-col">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <span className="eyebrow">Plan setup</span>
            <h2 className="section-title mt-5 max-w-3xl text-4xl md:text-5xl">Build your DCA plan</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--color-muted-strong)] sm:text-base sm:leading-8">
              Choose the asset, recurring buy size, frequency, and date range. DeltaDCA uses
              supported market data to estimate how that plan would have performed.
            </p>
          </div>

          <div className="w-full rounded-[24px] border border-[rgba(156,175,208,0.12)] bg-[rgba(11,19,36,0.64)] px-5 py-4 text-sm sm:w-auto sm:min-w-[10rem]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">
              Plan pace
            </p>
            <p className="mt-2 font-semibold text-[var(--color-ink)]">
              {formatFrequency(values.frequencyInDays)}
            </p>
            <p className="mt-1 text-[var(--color-muted)]">USD pricing</p>
          </div>
        </div>

        <div className="mt-8 grid gap-3 lg:grid-cols-3">
          <div className="rounded-[24px] border border-[rgba(156,175,208,0.12)] bg-[rgba(11,19,36,0.62)] px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">
              Selected asset
            </p>
            <p className="mt-2 text-base font-semibold text-[var(--color-ink)]">
              {values.coinId || 'Choose an asset'}
            </p>
          </div>

          <div className="rounded-[24px] border border-[rgba(156,175,208,0.12)] bg-[rgba(11,19,36,0.62)] px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">
              Buy size
            </p>
            <p className="mt-2 text-base font-semibold text-[var(--color-ink)]">
              {formatCurrency(values.investmentAmount || 0)} each run
            </p>
          </div>

          <div className="rounded-[24px] border border-[rgba(156,175,208,0.12)] bg-[rgba(11,19,36,0.62)] px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">
              Active window
            </p>
            <p className="mt-2 text-base font-semibold text-[var(--color-ink)]">
              {formatDate(values.startDate)} to {formatDate(values.endDate)}
            </p>
          </div>
        </div>

        <form className="mt-8 space-y-5" onSubmit={onSubmit}>
          <CoinPicker value={values.coinId} onChange={(nextValue) => onChange('coinId', nextValue)} marketCoins={marketCoins} />

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="investmentAmount" className="field-label">Investment amount</label>
              <div className="relative">
                <DollarSign className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
                <input
                  id="investmentAmount"
                  name="investmentAmount"
                  type="number"
                  min="1"
                  step="0.01"
                  className="field-input pl-11"
                  placeholder="250"
                  value={values.investmentAmount}
                  onChange={(event) => onChange('investmentAmount', event.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="frequencyInDays" className="field-label">Buy frequency (days)</label>
              <div className="relative">
                <TimerReset className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
                <input
                  id="frequencyInDays"
                  name="frequencyInDays"
                  type="number"
                  min="1"
                  step="1"
                  className="field-input pl-11"
                  placeholder="7"
                  value={values.frequencyInDays}
                  onChange={(event) => onChange('frequencyInDays', event.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {cadenceOptions.map((option) => {
              const isActive = String(values.frequencyInDays) === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  className={`rounded-full border px-3 py-2 text-sm font-semibold transition duration-300 ${
                    isActive
                      ? 'border-[rgba(240,140,86,0.22)] bg-[rgba(240,140,86,0.12)] text-[var(--color-accent-strong)]'
                      : 'border-[rgba(156,175,208,0.12)] bg-[rgba(11,19,36,0.56)] text-[var(--color-muted-strong)] hover:border-[rgba(125,215,255,0.18)] hover:bg-[rgba(17,28,52,0.82)]'
                  }`}
                  onClick={() => onChange('frequencyInDays', option.value)}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="startDate" className="field-label">Start date</label>
              <div className="relative">
                <CalendarRange className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
                <input
                  id="startDate"
                  name="startDate"
                  type="date"
                  className="field-input pl-11"
                  min={earliestAllowedDate}
                  max={values.endDate || latestAllowedDate}
                  value={values.startDate}
                  onChange={(event) => onChange('startDate', event.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="endDate" className="field-label">End date</label>
              <div className="relative">
                <CalendarRange className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
                <input
                  id="endDate"
                  name="endDate"
                  type="date"
                  className="field-input pl-11"
                  min={values.startDate || earliestAllowedDate}
                  max={latestAllowedDate}
                  value={values.endDate}
                  onChange={(event) => onChange('endDate', event.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-[rgba(156,175,208,0.12)] bg-[rgba(11,19,36,0.64)] px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">
              Available market history
            </p>
            <p className="mt-2 text-sm leading-7 text-[var(--color-muted-strong)]">
              DeltaDCA can currently backtest with daily pricing from
              {' '}
              <span className="font-semibold text-[var(--color-ink)]">{formatDate(earliestAllowedDate)}</span>
              {' '}
              to
              {' '}
              <span className="font-semibold text-[var(--color-ink)]">{formatDate(latestAllowedDate)}</span>
              {' '}
              using {providerLabel}.
            </p>
          </div>

          <div className="rounded-[28px] border border-[rgba(156,175,208,0.12)] bg-[linear-gradient(135deg,rgba(11,19,36,0.88),rgba(19,31,58,0.74))] p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,rgba(240,140,86,0.18),rgba(125,215,255,0.14))] text-[var(--color-accent-strong)]">
                <Orbit className="h-5 w-5" />
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">
                  What this run returns
                </p>
                <p className="mt-2 text-sm leading-7 text-[var(--color-muted-strong)]">
                  Total invested, ending portfolio value, current price anchor, and profit or loss
                  for the selected plan window.
                </p>
              </div>
            </div>
          </div>

          {hasDateRangeOutsideWindow ? (
            <div className="rounded-[24px] border border-[rgba(255,102,125,0.16)] bg-[rgba(255,102,125,0.08)] px-4 py-3 text-sm text-[var(--color-negative)]">
              Pick a start and end date inside the last {historyWindowDays} days, and keep the end date on or after the start date.
            </div>
          ) : null}

          <button type="submit" className="primary-button w-full" disabled={isLoading || hasDateRangeOutsideWindow}>
            {isLoading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                Running plan
              </>
            ) : (
              <>
                <Orbit className="h-4 w-4" />
                Run DeltaDCA plan
              </>
            )}
          </button>
        </form>
      </div>
    </section>
  );
}

export default CalculatorForm;
