import { ArrowDownRight, ArrowUpRight, BarChart3, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import AnimatedCounter from './AnimatedCounter';
import { formatCompactCurrency, formatCurrency, formatSignedPercent } from '../utils/formatters';

function MarketCarousel({ marketCoins, isLoading, onRefresh, lastUpdated }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const displayedCoins = marketCoins.slice(0, 6);

  useEffect(() => {
    if (displayedCoins.length === 0) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % displayedCoins.length);
    }, 3600);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [displayedCoins.length]);

  const safeActiveIndex = displayedCoins.length > 0
    ? Math.min(activeIndex, displayedCoins.length - 1)
    : 0;
  const activeCoin = displayedCoins[safeActiveIndex];

  return (
    <section className="panel-elevated relative overflow-hidden p-6 sm:p-8 lg:p-10">
      <div className="absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_top_left,rgba(125,215,255,0.14),transparent_72%)]" />

      <div className="relative">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="eyebrow">Live market</span>
            <h2 className="mt-5 font-['Fraunces'] text-4xl font-semibold text-[var(--color-ink)]">
              Market snapshot before you plan
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--color-muted-strong)]">
              Use current leaders, price moves, and volume to decide what you want to backtest next.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-full border border-[rgba(156,175,208,0.12)] bg-[rgba(11,19,36,0.62)] px-4 py-2 text-sm text-[var(--color-muted-strong)]">
              {lastUpdated ? `Synced ${lastUpdated}` : 'Waiting for market data'}
            </div>
            <button type="button" className="ghost-button" onClick={onRefresh} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {isLoading && marketCoins.length === 0 ? (
          <div className="mt-8 h-72 animate-pulse rounded-[30px] border border-[rgba(156,175,208,0.1)] bg-[rgba(17,28,52,0.68)]" />
        ) : null}

        {!isLoading && activeCoin ? (
          <div className="mt-8 grid gap-6 xl:grid-cols-[1.08fr,0.92fr]">
            <article className="rounded-[30px] border border-[rgba(156,175,208,0.12)] bg-[linear-gradient(135deg,rgba(11,19,36,0.9),rgba(17,28,52,0.82))] p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(125,215,255,0.16)] bg-[rgba(125,215,255,0.08)] px-3 py-1 text-xs uppercase tracking-[0.24em] text-[var(--color-highlight)]">
                    <BarChart3 className="h-3.5 w-3.5" />
                    Rank #{activeCoin.market_cap_rank}
                  </div>

                  <div className="mt-5 flex items-center gap-4">
                    {activeCoin.image ? (
                      <img
                        src={activeCoin.image}
                        alt=""
                        className="h-14 w-14 rounded-full border border-[rgba(156,175,208,0.14)] bg-[rgba(8,14,28,0.64)] object-cover"
                      />
                    ) : null}

                    <div>
                      <h3 className="font-['Fraunces'] text-4xl font-semibold text-[var(--color-ink)] sm:text-5xl">
                        {activeCoin.name}
                      </h3>
                      <p className="mt-2 text-sm uppercase tracking-[0.28em] text-[var(--color-muted)]">
                        {activeCoin.symbol?.toUpperCase()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={`rounded-[24px] border px-4 py-3 text-sm font-semibold ${
                  activeCoin.price_change_percentage_24h >= 0
                    ? 'border-[rgba(40,211,155,0.18)] bg-[rgba(40,211,155,0.08)] text-[var(--color-positive)]'
                    : 'border-[rgba(255,102,125,0.18)] bg-[rgba(255,102,125,0.08)] text-[var(--color-negative)]'
                }`}>
                  <span className="inline-flex items-center gap-2">
                    {activeCoin.price_change_percentage_24h >= 0 ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4" />
                    )}
                    {formatSignedPercent(activeCoin.price_change_percentage_24h)}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-2">
                {displayedCoins.map((coin, index) => (
                  <button
                    key={coin.id}
                    type="button"
                    className={`h-2.5 rounded-full transition duration-300 ${
                      coin.id === activeCoin.id
                        ? 'w-12 bg-[linear-gradient(90deg,var(--color-accent),var(--color-highlight))]'
                        : 'w-6 bg-[rgba(156,175,208,0.18)] hover:bg-[rgba(156,175,208,0.32)]'
                    }`}
                      aria-label={`Show ${coin.name} market slide`}
                    onClick={() => setActiveIndex(index)}
                  />
                ))}
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-[24px] border border-[rgba(156,175,208,0.1)] bg-[rgba(8,14,28,0.64)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">
                    Current price
                  </p>
                  <p className="mt-2 font-['Fraunces'] text-3xl font-semibold text-[var(--color-ink)]">
                    <AnimatedCounter value={activeCoin.current_price} formatter={formatCurrency} />
                  </p>
                </div>

                <div className="rounded-[24px] border border-[rgba(156,175,208,0.1)] bg-[rgba(8,14,28,0.64)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">
                    Market cap
                  </p>
                  <p className="mt-2 font-['Fraunces'] text-3xl font-semibold text-[var(--color-ink)]">
                    {formatCompactCurrency(activeCoin.market_cap)}
                  </p>
                </div>

                <div className="rounded-[24px] border border-[rgba(156,175,208,0.1)] bg-[rgba(8,14,28,0.64)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">
                    24h volume
                  </p>
                  <p className="mt-2 font-['Fraunces'] text-3xl font-semibold text-[var(--color-ink)]">
                    {formatCompactCurrency(activeCoin.total_volume)}
                  </p>
                </div>
              </div>
            </article>

            <div className="grid gap-3">
              {displayedCoins.map((coin, index) => {
                const isActive = coin.id === activeCoin.id;

                return (
                  <button
                    key={coin.id}
                    type="button"
                    className={`rounded-[24px] border px-5 py-4 text-left transition duration-300 ${
                      isActive
                        ? 'border-[rgba(240,140,86,0.22)] bg-[rgba(240,140,86,0.08)]'
                        : 'border-[rgba(156,175,208,0.12)] bg-[rgba(11,19,36,0.56)] hover:border-[rgba(125,215,255,0.18)] hover:bg-[rgba(17,28,52,0.82)]'
                    }`}
                    onClick={() => setActiveIndex(index)}
                    onMouseEnter={() => setActiveIndex(index)}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {coin.image ? (
                          <img
                            src={coin.image}
                            alt=""
                            className="h-11 w-11 rounded-full border border-[rgba(156,175,208,0.12)] bg-[rgba(8,14,28,0.64)] object-cover"
                          />
                        ) : null}

                        <div>
                          <p className="font-semibold text-[var(--color-ink)]">{coin.name}</p>
                          <p className="mt-1 text-sm text-[var(--color-muted)]">
                            {coin.symbol?.toUpperCase()}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-semibold text-[var(--color-ink)]">{formatCurrency(coin.current_price)}</p>
                        <p className={`mt-1 text-sm ${
                          coin.price_change_percentage_24h >= 0
                            ? 'text-[var(--color-positive)]'
                            : 'text-[var(--color-negative)]'
                        }`}>
                          {formatSignedPercent(coin.price_change_percentage_24h)}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {!isLoading && displayedCoins.length === 0 ? (
          <div className="mt-8 rounded-[28px] border border-[rgba(156,175,208,0.12)] bg-[rgba(11,19,36,0.56)] px-5 py-6 text-sm leading-7 text-[var(--color-muted-strong)]">
            Market data is temporarily unavailable. Refresh to try again as soon as the upstream feed responds.
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default MarketCarousel;
