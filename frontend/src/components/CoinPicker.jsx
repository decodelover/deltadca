import { Coins, LoaderCircle, Search } from 'lucide-react';
import { startTransition, useDeferredValue, useEffect, useRef, useState } from 'react';
import { searchCoins } from '../api/market';

const fallbackFeaturedCoins = [
  { id: 'bitcoin', name: 'Bitcoin', symbol: 'btc' },
  { id: 'ethereum', name: 'Ethereum', symbol: 'eth' },
  { id: 'solana', name: 'Solana', symbol: 'sol' },
  { id: 'xrp', name: 'XRP', symbol: 'xrp' },
  { id: 'bnb', name: 'BNB', symbol: 'bnb' },
  { id: 'cardano', name: 'Cardano', symbol: 'ada' },
  { id: 'dogecoin', name: 'Dogecoin', symbol: 'doge' },
  { id: 'tron', name: 'TRON', symbol: 'trx' },
];

function CoinPicker({ value, onChange, marketCoins }) {
  const containerRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const deferredValue = useDeferredValue(value);
  const featuredCoins = marketCoins.length > 0 ? marketCoins.slice(0, 8) : fallbackFeaturedCoins;
  const selectedCoin = [...marketCoins, ...searchResults, ...fallbackFeaturedCoins].find(
    (coin) => coin.id === value,
  );

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen]);

  useEffect(() => {
    let isMounted = true;

    const loadSearchResults = async () => {
      const normalizedQuery = deferredValue.trim().toLowerCase();

      if (!normalizedQuery || normalizedQuery.length < 2) {
        startTransition(() => {
          setSearchResults([]);
        });
        setIsSearching(false);
        return;
      }

      setIsSearching(true);

      try {
        const results = await searchCoins(normalizedQuery);

        if (!isMounted) {
          return;
        }

        startTransition(() => {
          setSearchResults(results);
        });
      } catch {
        if (isMounted) {
          startTransition(() => {
            setSearchResults([]);
          });
        }
      } finally {
        if (isMounted) {
          setIsSearching(false);
        }
      }
    };

    void loadSearchResults();

    return () => {
      isMounted = false;
    };
  }, [deferredValue]);

  const visibleCoins = deferredValue.trim().length >= 2 ? searchResults : featuredCoins;

  return (
    <div ref={containerRef} className="space-y-3">
      <label htmlFor="coinId" className="field-label">Asset</label>

      <div className="relative">
        <Coins className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
        <input
          id="coinId"
          name="coinId"
          className="field-input pl-11 pr-11"
          placeholder="Search by coin name, symbol, or asset id"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          autoComplete="off"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)]">
          {isSearching ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </div>
      </div>

      {selectedCoin ? (
        <div className="rounded-[18px] border border-[rgba(156,175,208,0.1)] bg-[rgba(11,19,36,0.52)] px-4 py-3 text-sm text-[var(--color-muted-strong)]">
          Selected asset:
          {' '}
          <span className="font-semibold text-[var(--color-ink)]">
            {selectedCoin.name}
            {' '}
            ({selectedCoin.symbol?.toUpperCase?.() || 'N/A'})
          </span>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {featuredCoins.map((coin) => {
          const isActive = value === coin.id;

          return (
            <button
              key={coin.id}
              type="button"
              className={`rounded-full border px-3 py-2 text-sm font-semibold transition duration-300 ${
                isActive
                  ? 'border-[rgba(125,215,255,0.24)] bg-[rgba(125,215,255,0.12)] text-[var(--color-highlight)]'
                  : 'border-[rgba(156,175,208,0.12)] bg-[rgba(11,19,36,0.56)] text-[var(--color-muted-strong)] hover:border-[rgba(240,140,86,0.18)] hover:bg-[rgba(17,28,52,0.82)]'
              }`}
              onClick={() => {
                onChange(coin.id);
                setIsOpen(false);
              }}
            >
              {coin.name}
            </button>
          );
        })}
      </div>

      {isOpen ? (
        <div className="rounded-[24px] border border-[rgba(156,175,208,0.12)] bg-[rgba(8,14,28,0.96)] p-3 shadow-[0_24px_60px_-36px_rgba(0,0,0,0.92)]">
          <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">
            {deferredValue.trim().length >= 2 ? 'Search results' : 'Popular assets'}
          </p>

          <div className="space-y-1">
            {visibleCoins.length > 0 ? visibleCoins.map((coin) => (
              <button
                key={coin.id}
                type="button"
                className="flex w-full items-center justify-between rounded-[18px] px-3 py-3 text-left transition duration-300 hover:bg-[rgba(17,28,52,0.82)]"
                onClick={() => {
                  onChange(coin.id);
                  setIsOpen(false);
                }}
              >
                <div className="flex items-center gap-3">
                  {coin.image || coin.thumb || coin.large ? (
                    <img
                      src={coin.image || coin.thumb || coin.large}
                      alt=""
                      className="h-10 w-10 rounded-full border border-[rgba(156,175,208,0.12)] bg-[rgba(11,19,36,0.72)] object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(156,175,208,0.12)] bg-[rgba(11,19,36,0.72)] text-[var(--color-highlight)]">
                      <Coins className="h-4 w-4" />
                    </div>
                  )}

                  <div>
                    <p className="font-semibold text-[var(--color-ink)]">{coin.name}</p>
                    <p className="text-sm text-[var(--color-muted)]">
                      {coin.symbol?.toUpperCase?.() || 'N/A'}
                      {coin.market_cap_rank ? ` | Rank #${coin.market_cap_rank}` : ''}
                    </p>
                  </div>
                </div>

                <span className="rounded-full border border-[rgba(240,140,86,0.16)] bg-[rgba(240,140,86,0.08)] px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-accent-strong)]">
                  Select
                </span>
              </button>
            )) : (
              <div className="rounded-[18px] px-3 py-4 text-sm text-[var(--color-muted-strong)]">
                No matching assets yet. Try a broader search like
                {' '}
                <span className="font-semibold text-[var(--color-ink)]">eth</span>
                {' '}
                or
                {' '}
                <span className="font-semibold text-[var(--color-ink)]">sol</span>
                .
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default CoinPicker;
