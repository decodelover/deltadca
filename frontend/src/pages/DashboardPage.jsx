import {
  ArrowRight,
  BarChart3,
  BookmarkPlus,
  CalendarClock,
  DollarSign,
  Radar,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import { Suspense, createElement, lazy, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getApiErrorMessage } from '../api/client';
import { getMarketOverview, getPlannerConfig, searchCoins } from '../api/market';
import { calculateSimulation, saveSimulation } from '../api/simulations';
import AnimatedCounter from '../components/AnimatedCounter';
import CalculatorForm from '../components/CalculatorForm';
import LoadingPanel from '../components/LoadingPanel';
import MarketCarousel from '../components/MarketCarousel';
import ResultMetricCard from '../components/ResultMetricCard';
import { useAuth } from '../context/useAuth';
import { buildPortfolioSeries } from '../utils/chart';
import { formatCurrency, formatDate, formatFrequency } from '../utils/formatters';
import {
  getLocalSavedSimulations,
  replaceLocalSavedSimulations,
} from '../utils/savedSimulationStorage';

const PortfolioChart = lazy(() => import('../components/PortfolioChart'));
const FALLBACK_HISTORY_WINDOW_DAYS = 365;

function formatDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTodayDate() {
  const date = new Date();
  // Keep calculations in local calendar days without UTC rollover issues.
  date.setHours(12, 0, 0, 0);
  return date;
}

function getDateDaysAgo(days) {
  const date = getTodayDate();
  date.setDate(date.getDate() - days);
  return formatDateInputValue(date);
}

function getDefaultStartDate(historyWindowDays) {
  return getDateDaysAgo(historyWindowDays);
}

function getDefaultEndDate() {
  return formatDateInputValue(getTodayDate());
}

function buildDefaultValues(historyWindowDays) {
  return {
    coinId: '',
    investmentAmount: '250',
    frequencyInDays: '7',
    startDate: getDefaultStartDate(historyWindowDays),
    endDate: getDefaultEndDate(),
  };
}

function formatHistoryWindowLabel(historyWindowDays) {
  const years = historyWindowDays / 365;

  if (Number.isInteger(years) && years >= 1) {
    return years === 1 ? '1 year' : `${years} years`;
  }

  return `${historyWindowDays} days`;
}

const featureCards = [
  {
    icon: ShieldCheck,
    label: 'Saved to your account',
    value: 'Keep strong plans attached to your DeltaDCA profile and reopen them whenever you need them.',
  },
  {
    icon: WalletCards,
    label: 'Capital in one view',
    value: 'Review invested amount, ending value, and profit or loss without leaving the planner.',
  },
  {
    icon: BarChart3,
    label: 'Live market context',
    value: 'Check the current market leaders before you decide which asset to backtest next.',
  },
];

function normalizeCoinQuery(value) {
  return String(value || '').trim().toLowerCase();
}

function findCoinMatch(query, coins = []) {
  const normalizedQuery = normalizeCoinQuery(query);

  if (!normalizedQuery) {
    return null;
  }

  return coins.find((coin) => normalizeCoinQuery(coin.id) === normalizedQuery)
    || coins.find((coin) => normalizeCoinQuery(coin.symbol) === normalizedQuery)
    || coins.find((coin) => normalizeCoinQuery(coin.name) === normalizedQuery)
    || null;
}

function formatRefreshLabel(timestamp) {
  if (!timestamp) {
    return '';
  }

  const elapsedMs = Date.now() - new Date(timestamp).getTime();
  const elapsedMinutes = Math.max(0, Math.floor(elapsedMs / 60000));

  if (elapsedMinutes === 0) {
    return 'just now';
  }

  if (elapsedMinutes === 1) {
    return '1 min ago';
  }

  return `${elapsedMinutes} mins ago`;
}

function DashboardPage() {
  const [plannerConfig, setPlannerConfig] = useState({
    marketDataProvider: 'coingecko',
    marketDataProviderLabel: 'CoinGecko',
    historyWindowDays: FALLBACK_HISTORY_WINDOW_DAYS,
  });
  const [formValues, setFormValues] = useState(() => buildDefaultValues(FALLBACK_HISTORY_WINDOW_DAYS));
  const [simulation, setSimulation] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeInsightIndex, setActiveInsightIndex] = useState(0);
  const [marketCoins, setMarketCoins] = useState([]);
  const [isLoadingMarket, setIsLoadingMarket] = useState(true);
  const [marketUpdatedAt, setMarketUpdatedAt] = useState('');
  const statusRef = useRef(null);
  const resultsRef = useRef(null);

  const { isAuthenticated, user } = useAuth();
  const historyWindowDays = plannerConfig.historyWindowDays;
  const providerLabel = plannerConfig.marketDataProviderLabel;
  const earliestAllowedDate = getDateDaysAgo(historyWindowDays);
  const latestAllowedDate = getDefaultEndDate();

  const chartData = buildPortfolioSeries(formValues, simulation);
  const totalInvested = Number(simulation?.totalInvested || 0);
  const finalPortfolioValue = Number(simulation?.finalPortfolioValue || 0);
  const profitOrLoss = Number(simulation?.profitOrLoss || 0);
  const performanceTone = profitOrLoss >= 0 ? 'positive' : 'negative';

  const strategyInsights = [
    {
      icon: Radar,
      eyebrow: 'Supported history',
      title: `Backtest plans across the latest ${formatHistoryWindowLabel(historyWindowDays)} of daily price data.`,
      metricLabel: 'Available dates',
      metricValue: `${formatDate(earliestAllowedDate)} to ${formatDate(latestAllowedDate)}`,
      description: `DeltaDCA checks the selected range before every run so unsupported ${providerLabel} dates never reach the pricing engine.`,
    },
    {
      icon: BarChart3,
      eyebrow: 'Current plan',
      title: `${formatCurrency(formValues.investmentAmount || 0)} buys on a ${formatFrequency(formValues.frequencyInDays).toLowerCase()} schedule.`,
      metricLabel: 'Selected asset',
      metricValue: formValues.coinId || 'Choose an asset',
      description: 'The plan summary updates as you change the amount, buy frequency, and dates so you can review everything before you run it.',
    },
    {
      icon: Sparkles,
      eyebrow: 'Saved plans',
      title: isAuthenticated ? 'Save the next result to your account and compare it later.' : 'Sign in to keep your best scenarios inside your DeltaDCA account.',
      metricLabel: 'Account state',
      metricValue: isAuthenticated ? 'Signed in' : 'Guest',
      description: 'Saved plans stay available from the planner and the saved plans screen whenever you return.',
    },
  ];

  useEffect(() => {
    let isMounted = true;

    const loadPlannerConfig = async () => {
      try {
        const nextConfig = await getPlannerConfig();

        if (!isMounted) {
          return;
        }

        setPlannerConfig(nextConfig);
        setFormValues((current) => {
          const fallbackDefaults = buildDefaultValues(FALLBACK_HISTORY_WINDOW_DAYS);

          if (
            current.coinId === fallbackDefaults.coinId
            && current.investmentAmount === fallbackDefaults.investmentAmount
            && current.frequencyInDays === fallbackDefaults.frequencyInDays
            && current.startDate === fallbackDefaults.startDate
            && current.endDate === fallbackDefaults.endDate
          ) {
            return buildDefaultValues(nextConfig.historyWindowDays);
          }

          return current;
        });
      } catch {
        if (isMounted) {
          setPlannerConfig({
            marketDataProvider: 'coingecko',
            marketDataProviderLabel: 'CoinGecko',
            historyWindowDays: FALLBACK_HISTORY_WINDOW_DAYS,
          });
        }
      }
    };

    void loadPlannerConfig();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveInsightIndex((current) => (current + 1) % strategyInsights.length);
    }, 4200);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [strategyInsights.length]);

  useEffect(() => {
    let isMounted = true;

    const loadMarketOverview = async ({ silent } = { silent: false }) => {
      if (!silent && isMounted) {
        setIsLoadingMarket(true);
      }

      try {
        const marketData = await getMarketOverview();

        if (!isMounted) {
          return;
        }

        setMarketCoins(marketData.coins);
        setMarketUpdatedAt(marketData.refreshedAt);
      } catch {
        if (!isMounted) {
          return;
        }
      } finally {
        if (isMounted) {
          setIsLoadingMarket(false);
        }
      }
    };

    void loadMarketOverview();

    const intervalId = window.setInterval(() => {
      void loadMarketOverview({ silent: true });
    }, 60000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!isLoading && !errorMessage) {
      return;
    }

    statusRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, [errorMessage, isLoading]);

  useEffect(() => {
    if (isLoading || !simulation) {
      return;
    }

    resultsRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, [isLoading, simulation]);

  const handleFieldChange = (field, value) => {
    setFormValues((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const resolveCoinId = async (inputValue) => {
    const normalizedQuery = normalizeCoinQuery(inputValue);

    if (!normalizedQuery) {
      return '';
    }

    const marketMatch = findCoinMatch(normalizedQuery, marketCoins);

    if (marketMatch?.id) {
      return marketMatch.id;
    }

    const searchResults = await searchCoins(normalizedQuery);
    const exactMatch = findCoinMatch(normalizedQuery, searchResults);

    if (exactMatch?.id) {
      return exactMatch.id;
    }

    return searchResults.length === 1 ? searchResults[0].id : '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setSaveMessage('');

    const requestedCoinId = normalizeCoinQuery(formValues.coinId);
    const payload = {
      coinId: requestedCoinId,
      investmentAmount: Number(formValues.investmentAmount),
      startDate: formValues.startDate,
      endDate: formValues.endDate,
      frequencyInDays: Number(formValues.frequencyInDays),
    };

    if (
      !payload.coinId
      || payload.investmentAmount <= 0
      || payload.frequencyInDays <= 0
      || !payload.startDate
      || !payload.endDate
    ) {
      setErrorMessage('Complete all fields with valid values to run a DCA projection.');
      return;
    }

    if (new Date(payload.startDate) > new Date(payload.endDate)) {
      setErrorMessage('End date must be on or after the start date.');
      return;
    }

    if (
      payload.startDate < earliestAllowedDate
      || payload.endDate < earliestAllowedDate
      || payload.startDate > latestAllowedDate
      || payload.endDate > latestAllowedDate
    ) {
      setErrorMessage(
        `Choose dates between ${formatDate(earliestAllowedDate)} and ${formatDate(latestAllowedDate)}. ${providerLabel} is configured for the last ${historyWindowDays} days of historical data.`,
      );
      return;
    }

    setIsLoading(true);

    try {
      const resolvedCoinId = await resolveCoinId(requestedCoinId);

      if (!resolvedCoinId) {
        setSimulation(null);
        setErrorMessage('Select a supported asset from the search results or popular assets list before running the plan.');
        return;
      }

      if (resolvedCoinId !== requestedCoinId) {
        setFormValues((current) => ({
          ...current,
          coinId: resolvedCoinId,
        }));
      }

      const data = await calculateSimulation({
        ...payload,
        coinId: resolvedCoinId,
      });
      setSimulation(data);
    } catch (error) {
      setSimulation(null);
      setErrorMessage(getApiErrorMessage(error, 'Unable to calculate your DCA strategy right now.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSimulation = async () => {
    if (!simulation || !user?.id) {
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setSaveMessage('');

    try {
      const savedRecord = await saveSimulation({
        coinId: formValues.coinId,
        investmentAmount: Number(formValues.investmentAmount),
        frequencyInDays: Number(formValues.frequencyInDays),
        startDate: formValues.startDate,
        endDate: formValues.endDate,
        totalInvested: Number(simulation.totalInvested),
        finalPortfolioValue: Number(simulation.finalPortfolioValue),
      });

      const currentLocalRecords = getLocalSavedSimulations(user.id);
      replaceLocalSavedSimulations(user.id, [
        savedRecord,
        ...currentLocalRecords.filter((record) => record.id !== savedRecord.id),
      ]);

      setSaveMessage('Plan saved to your DeltaDCA account.');
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to save this plan right now.'));
    } finally {
      setIsSaving(false);
    }
  };

  const chartFallback = (
    <section className="panel-elevated p-6 sm:p-8">
      <div className="h-[360px] animate-pulse rounded-[28px] border border-[rgba(156,175,208,0.1)] bg-[rgba(17,28,52,0.68)]" />
    </section>
  );

  const activeInsight = strategyInsights[activeInsightIndex];
  const hasInlineFeedback = Boolean(errorMessage || saveMessage || isLoading);

  return (
    <div className="space-y-8 sm:space-y-10">
      <section className="min-h-[calc(100svh-8rem)]">
        <CalculatorForm
          values={formValues}
          onChange={handleFieldChange}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          earliestAllowedDate={earliestAllowedDate}
          latestAllowedDate={latestAllowedDate}
          marketCoins={marketCoins}
          providerLabel={providerLabel}
          historyWindowDays={historyWindowDays}
          className="min-h-[calc(100svh-8rem)]"
        />
      </section>

      {hasInlineFeedback ? (
        <section ref={statusRef} className="space-y-4">
          {errorMessage ? (
            <div className="rounded-[24px] border border-[rgba(255,102,125,0.16)] bg-[rgba(255,102,125,0.08)] px-5 py-4 text-sm text-[var(--color-negative)]">
              {errorMessage}
            </div>
          ) : null}

          {saveMessage ? (
            <div className="rounded-[24px] border border-[rgba(40,211,155,0.16)] bg-[rgba(40,211,155,0.08)] px-5 py-4 text-sm text-[var(--color-positive)]">
              {saveMessage}
            </div>
          ) : null}

          {isLoading ? <LoadingPanel /> : null}
        </section>
      ) : null}

      {!isLoading && simulation ? (
        <section ref={resultsRef} className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-3">
            <ResultMetricCard
              icon={DollarSign}
              label="Total invested"
              value={<AnimatedCounter value={totalInvested} formatter={formatCurrency} />}
              detail="Total capital deployed across the full modeled strategy."
              tone="neutral"
            />
            <ResultMetricCard
              icon={WalletCards}
              label="Final portfolio value"
              value={<AnimatedCounter value={finalPortfolioValue} formatter={formatCurrency} />}
              detail="Simulated ending value based on the last available price in range."
              tone={performanceTone}
            />
            <ResultMetricCard
              icon={profitOrLoss >= 0 ? TrendingUp : TrendingDown}
              label="Total profit / loss"
              value={<AnimatedCounter value={profitOrLoss} formatter={formatCurrency} />}
              detail={`${profitOrLoss >= 0 ? 'Positive spread' : 'Negative spread'} versus deployed capital.`}
              tone={performanceTone}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),22rem] 2xl:grid-cols-[minmax(0,1fr),24rem]">
            <Suspense fallback={chartFallback}>
              <PortfolioChart data={chartData} tone={performanceTone} />
            </Suspense>

            <section className="panel-elevated p-6 sm:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">
                Plan summary
              </p>
              <h2 className="mt-3 font-['Fraunces'] text-4xl font-semibold text-[var(--color-ink)]">
                {formValues.coinId ? `${formValues.coinId} plan overview` : 'Plan overview'}
              </h2>

              <div className="mt-8 grid gap-4">
                <div className="rounded-[24px] border border-[rgba(156,175,208,0.1)] bg-[rgba(11,19,36,0.64)] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">
                    Date window
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[var(--color-ink)]">
                    {formatDate(formValues.startDate)} to {formatDate(formValues.endDate)}
                  </p>
                </div>

                <div className="rounded-[24px] border border-[rgba(156,175,208,0.1)] bg-[rgba(11,19,36,0.64)] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">
                    Cadence
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[var(--color-ink)]">
                    {formatFrequency(formValues.frequencyInDays)}
                  </p>
                </div>

                <div className="rounded-[24px] border border-[rgba(156,175,208,0.1)] bg-[rgba(11,19,36,0.64)] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">
                    Current price anchor
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[var(--color-ink)]">
                    {formatCurrency(simulation.currentPrice)}
                  </p>
                </div>
              </div>

              <div
                className={`mt-8 rounded-[30px] border p-5 ${
                  profitOrLoss >= 0
                    ? 'border-[rgba(40,211,155,0.18)] bg-[linear-gradient(135deg,rgba(40,211,155,0.09),rgba(9,15,29,0.5))]'
                    : 'border-[rgba(255,102,125,0.18)] bg-[linear-gradient(135deg,rgba(255,102,125,0.09),rgba(9,15,29,0.5))]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-[18px] ${
                      profitOrLoss >= 0
                        ? 'bg-[rgba(40,211,155,0.12)] text-[var(--color-positive)]'
                        : 'bg-[rgba(255,102,125,0.12)] text-[var(--color-negative)]'
                    }`}
                  >
                    {profitOrLoss >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">
                      Performance callout
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[var(--color-muted-strong)]">
                      {profitOrLoss >= 0
                        ? 'This backtest finished above total invested capital, which means the selected cadence captured a favorable move across the chosen period.'
                        : 'This backtest finished below total invested capital, which gives you a downside case to compare before committing real funds.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {isAuthenticated ? (
                  <button
                    type="button"
                    className="primary-button flex-1"
                    onClick={handleSaveSimulation}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                        Saving plan
                      </>
                    ) : (
                      <>
                        <BookmarkPlus className="h-4 w-4" />
                        Save this plan
                      </>
                    )}
                  </button>
                ) : (
                  <Link to="/login" className="secondary-button flex-1">
                    <CalendarClock className="h-4 w-4" />
                    Sign in to save plans
                  </Link>
                )}

                <Link to="/saved" className="ghost-button flex-1">
                  View saved plans
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </section>
          </div>
        </section>
      ) : null}

      {!isLoading && !simulation ? (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr),24rem]">
          <article className="panel-elevated p-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">
              Getting started
            </p>
            <h2 className="mt-3 font-['Fraunces'] text-4xl font-semibold text-[var(--color-ink)]">
              Set the plan, run the backtest, save the setups worth following
            </h2>
            <p className="mt-4 text-sm leading-7 text-[var(--color-muted-strong)]">
              Pick an asset from the live market list or search by name, choose your recurring buy settings, and let DeltaDCA calculate the outcome across the supported price window.
            </p>
          </article>

          <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
            {[
              'Choose the asset, contribution amount, and buy frequency you want to test.',
              'Run the plan against live-backed pricing data for the supported date range.',
              'Save strong scenarios to your account so you can compare them later.',
            ].map((step, index) => (
              <article key={step} className="panel-elevated p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,rgba(240,140,86,0.18),rgba(125,215,255,0.14))] font-['Fraunces'] text-2xl font-semibold text-[var(--color-accent-strong)]">
                  {index + 1}
                </div>
                <p className="mt-5 text-sm leading-7 text-[var(--color-muted-strong)]">{step}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr),22rem] 2xl:grid-cols-[minmax(0,1fr),24rem]">
        <article className="panel-elevated relative overflow-hidden p-6 sm:p-8">
          <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,rgba(240,140,86,0.18),transparent_72%)]" />
          <div className="absolute right-0 top-10 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(125,215,255,0.14),transparent_72%)] blur-3xl" />

          <div className="relative">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">
              Current plan
            </p>
            <h2 className="mt-3 font-['Fraunces'] text-4xl font-semibold text-[var(--color-ink)]">
              Invest {formatCurrency(formValues.investmentAmount || 0)} into {formValues.coinId || 'your selected asset'} on a {formatFrequency(formValues.frequencyInDays).toLowerCase()} cadence.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--color-muted-strong)] sm:text-base sm:leading-8">
              DeltaDCA will backtest this schedule from {formatDate(formValues.startDate)} to {formatDate(formValues.endDate)} and surface invested capital, ending value, and spread.
            </p>

            <div className="mt-8 grid gap-3 md:grid-cols-3">
              <div className="rounded-[24px] border border-[rgba(156,175,208,0.1)] bg-[rgba(11,19,36,0.62)] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">
                  Asset
                </p>
                <p className="mt-2 text-base font-semibold text-[var(--color-ink)]">
                  {formValues.coinId || 'Not selected'}
                </p>
              </div>

              <div className="rounded-[24px] border border-[rgba(156,175,208,0.1)] bg-[rgba(11,19,36,0.62)] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">
                  Frequency
                </p>
                <p className="mt-2 text-base font-semibold text-[var(--color-ink)]">
                  {formatFrequency(formValues.frequencyInDays)}
                </p>
              </div>

              <div className="rounded-[24px] border border-[rgba(156,175,208,0.1)] bg-[rgba(11,19,36,0.62)] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">
                  History window
                </p>
                <p className="mt-2 text-base font-semibold text-[var(--color-ink)]">
                  Latest {formatHistoryWindowLabel(historyWindowDays)}
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-3">
                <div className="rounded-full border border-[rgba(156,175,208,0.12)] bg-[rgba(11,19,36,0.62)] px-4 py-2 text-sm font-medium text-[var(--color-ink-soft)]">
                  {formatCurrency(formValues.investmentAmount || 0)} per buy
                </div>
                <div className="rounded-full border border-[rgba(156,175,208,0.12)] bg-[rgba(11,19,36,0.62)] px-4 py-2 text-sm font-medium text-[var(--color-ink-soft)]">
                  {formatFrequency(formValues.frequencyInDays)}
                </div>
              </div>

              <Link to="/saved" className="secondary-button w-full sm:w-auto">
                View saved plans
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </article>

        <aside className="rounded-[30px] border border-[rgba(156,175,208,0.12)] bg-[linear-gradient(180deg,rgba(10,18,34,0.96),rgba(9,15,29,0.82))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">
                Live plan signal
              </p>
              <h2 className="mt-2 font-['Fraunces'] text-2xl font-semibold text-[var(--color-ink)]">
                What matters next
              </h2>
            </div>

            <div className="rounded-full border border-[rgba(125,215,255,0.16)] bg-[rgba(125,215,255,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-highlight)]">
              Auto
            </div>
          </div>

          <div className="mt-6 rounded-[28px] border border-[rgba(156,175,208,0.1)] bg-[rgba(17,28,52,0.72)] p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,rgba(240,140,86,0.18),rgba(125,215,255,0.14))] text-[var(--color-accent-strong)]">
              {createElement(activeInsight.icon, { className: 'h-5 w-5' })}
            </div>

            <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">
              {activeInsight.eyebrow}
            </p>
            <h3 className="mt-2 font-['Fraunces'] text-[2rem] font-semibold leading-tight text-[var(--color-ink)]">
              {activeInsight.title}
            </h3>
            <p className="mt-4 text-sm leading-7 text-[var(--color-muted-strong)]">
              {activeInsight.description}
            </p>

            <div className="mt-6 rounded-[24px] border border-[rgba(156,175,208,0.08)] bg-[rgba(8,14,28,0.62)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">
                {activeInsight.metricLabel}
              </p>
              <p className="mt-2 text-base font-semibold text-[var(--color-ink)]">
                {activeInsight.metricValue}
              </p>
            </div>

            <div className="mt-6 flex gap-2">
              {strategyInsights.map((insight, index) => (
                <button
                  key={insight.eyebrow}
                  type="button"
                  className={`h-2.5 flex-1 rounded-full transition duration-300 ${
                    index === activeInsightIndex
                      ? 'pulse-line bg-[linear-gradient(90deg,var(--color-accent),var(--color-highlight))]'
                      : 'bg-[rgba(156,175,208,0.16)]'
                  }`}
                  aria-label={`Show ${insight.eyebrow} insight`}
                  onClick={() => setActiveInsightIndex(index)}
                />
              ))}
            </div>
          </div>
        </aside>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {featureCards.map(({ icon: Icon, label, value }) => (
          <article
            key={label}
            className="rounded-[26px] border border-[rgba(156,175,208,0.12)] bg-[rgba(11,19,36,0.62)] p-5 transition duration-300 hover:-translate-y-1 hover:border-[rgba(125,215,255,0.18)] hover:bg-[rgba(17,28,52,0.82)]"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[linear-gradient(135deg,rgba(240,140,86,0.18),rgba(125,215,255,0.14))] text-[var(--color-accent-strong)]">
              {createElement(Icon, { className: 'h-5 w-5' })}
            </div>

            <h2 className="mt-4 font-['Fraunces'] text-[1.7rem] font-semibold leading-[1.08] text-[var(--color-ink)]">
              {label}
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--color-muted-strong)]">{value}</p>
          </article>
        ))}
      </section>

      <MarketCarousel
        marketCoins={marketCoins}
        isLoading={isLoadingMarket}
        onRefresh={() => {
          setIsLoadingMarket(true);
          void getMarketOverview()
            .then((marketData) => {
              setMarketCoins(marketData.coins);
              setMarketUpdatedAt(marketData.refreshedAt);
            })
            .catch(() => {})
            .finally(() => {
              setIsLoadingMarket(false);
            });
        }}
        lastUpdated={formatRefreshLabel(marketUpdatedAt)}
      />
    </div>
  );
}

export default DashboardPage;
