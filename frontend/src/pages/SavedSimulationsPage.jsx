import {
  ArchiveRestore,
  BookmarkCheck,
  CalendarRange,
  Coins,
  RefreshCw,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getApiErrorMessage } from '../api/client';
import { deleteSavedSimulation, getSavedSimulations } from '../api/simulations';
import AnimatedCounter from '../components/AnimatedCounter';
import { useAuth } from '../context/useAuth';
import { formatCurrency, formatDate, formatFrequency } from '../utils/formatters';
import {
  deleteLocalSimulation,
  getLocalSavedSimulations,
  normalizeSavedSimulation,
  replaceLocalSavedSimulations,
} from '../utils/savedSimulationStorage';

function SavedSimulationsPage() {
  const { user } = useAuth();
  const [simulations, setSimulations] = useState([]);
  const [statusMessage, setStatusMessage] = useState('Loading your saved plans...');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [activeDeleteId, setActiveDeleteId] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadSimulations = async () => {
      const localSimulations = getLocalSavedSimulations(user?.id);

      if (isMounted) {
        setSimulations(localSimulations);
        setIsLoading(true);
        setStatusMessage(localSimulations.length > 0
          ? 'Refreshing plans from your account...'
          : 'Checking your saved plans...');
      }

      try {
        const remoteSimulations = await getSavedSimulations();
        const normalizedRemoteSimulations = Array.isArray(remoteSimulations)
          ? remoteSimulations.map(normalizeSavedSimulation)
          : [];

        if (!isMounted) {
          return;
        }

        if (normalizedRemoteSimulations.length > 0) {
          replaceLocalSavedSimulations(user?.id, normalizedRemoteSimulations);
          setSimulations(normalizedRemoteSimulations);
          setStatusMessage('Saved plans synced from your account.');
        } else if (localSimulations.length > 0) {
          setSimulations(localSimulations);
          setStatusMessage('No account-synced plans yet, so you are seeing the last plans stored on this device.');
        } else {
          setSimulations([]);
          setStatusMessage('No saved plans yet. Run a projection and save it from the planner.');
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setSimulations(localSimulations);
        setStatusMessage(localSimulations.length > 0
          ? 'Showing plans stored on this device while account sync is temporarily unavailable.'
          : getApiErrorMessage(error, 'The saved plans endpoint is unavailable right now.'));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadSimulations();

    return () => {
      isMounted = false;
    };
  }, [refreshNonce, user?.id]);

  const handleDelete = async (simulation) => {
    if (!user?.id) {
      return;
    }

    setActiveDeleteId(simulation.id);

    try {
      if (simulation.source === 'remote') {
        await deleteSavedSimulation(simulation.id);
      }

      deleteLocalSimulation(user.id, simulation.id);
      const nextSimulations = simulations
        .filter((item) => item.id !== simulation.id)
        .map(normalizeSavedSimulation);

      setSimulations(nextSimulations);

      setStatusMessage(nextSimulations.length > 0
        ? 'Plan removed from your saved list.'
        : 'No saved plans left. Run a new plan to save another scenario.');
    } catch (error) {
      setStatusMessage(getApiErrorMessage(error, 'Unable to remove that saved plan right now.'));
    } finally {
      setActiveDeleteId(null);
    }
  };

  const profitableStrategies = simulations.filter((simulation) => simulation.profitOrLoss >= 0).length;
  const totalCapitalTracked = simulations.reduce(
    (total, simulation) => total + Number(simulation.totalInvested || 0),
    0,
  );
  const getSourceLabel = (source) => (source === 'remote' ? 'Synced to account' : 'Stored on this device');

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.04fr,0.96fr]">
        <div className="panel-elevated relative overflow-hidden p-6 sm:p-8 lg:p-10">
          <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,rgba(125,215,255,0.14),transparent_72%)]" />

          <div className="relative">
            <span className="eyebrow">Saved plans</span>
            <h1 className="mt-5 font-['Fraunces'] text-5xl font-semibold text-[var(--color-ink)]">
              Compare the DeltaDCA plans you decided to keep
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--color-muted-strong)]">
              Review recurring-buy scenarios, compare how different cadences performed, and refresh
              the list from your account whenever you need it.
            </p>

            <div className="mt-8 rounded-[28px] border border-[rgba(156,175,208,0.12)] bg-[rgba(11,19,36,0.68)] px-5 py-4 text-sm text-[var(--color-muted-strong)]">
              {statusMessage}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setRefreshNonce((value) => value + 1)}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh plans
              </button>
              <Link to="/" className="ghost-button">
                <ArchiveRestore className="h-4 w-4" />
                Build a new plan
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1 xl:grid-rows-3">
          <article className="panel-elevated p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">
              Saved plans
            </p>
            <p className="mt-3 font-['Fraunces'] text-5xl font-semibold text-[var(--color-ink)]">
              <AnimatedCounter value={simulations.length} formatter={(value) => Math.round(value).toString()} />
            </p>
          </article>

          <article className="panel-elevated p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">
              Above cost
            </p>
            <p className="mt-3 font-['Fraunces'] text-5xl font-semibold text-[var(--color-positive)]">
              <AnimatedCounter value={profitableStrategies} formatter={(value) => Math.round(value).toString()} />
            </p>
          </article>

          <article className="panel-elevated p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">
              Capital tracked
            </p>
            <p className="mt-3 font-['Fraunces'] text-4xl font-semibold text-[var(--color-ink)]">
              <AnimatedCounter value={totalCapitalTracked} formatter={formatCurrency} />
            </p>
          </article>
        </div>
      </section>

      {isLoading ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              className="panel-elevated h-72 animate-pulse border-[rgba(156,175,208,0.1)] bg-[rgba(17,28,52,0.68)]"
            />
          ))}
        </section>
      ) : null}

      {!isLoading && simulations.length === 0 ? (
        <section className="panel-elevated p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-[linear-gradient(135deg,rgba(240,140,86,0.18),rgba(125,215,255,0.14))] text-[var(--color-accent-strong)]">
            <BookmarkCheck className="h-7 w-7" />
          </div>
          <h2 className="mt-6 font-['Fraunces'] text-4xl font-semibold text-[var(--color-ink)]">
            No saved plans yet
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[var(--color-muted-strong)]">
            Run a DeltaDCA plan on the dashboard and save it here once you find a setup worth keeping.
          </p>
          <Link to="/" className="primary-button mt-8">
            Build your first plan
          </Link>
        </section>
      ) : null}

      {!isLoading && simulations.length > 0 ? (
        <section className="grid gap-5 xl:grid-cols-2">
          {simulations.map((simulation, index) => {
            const inProfit = simulation.profitOrLoss >= 0;

            return (
              <article
                key={simulation.id}
                className={`panel-elevated p-6 transition duration-300 hover:-translate-y-1 hover:border-[rgba(125,215,255,0.18)] ${
                  index % 3 === 1 ? 'floating-card' : ''
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(156,175,208,0.12)] bg-[rgba(11,19,36,0.58)] px-3 py-1 text-xs uppercase tracking-[0.24em] text-[var(--color-muted-strong)]">
                      <Coins className="h-3.5 w-3.5" />
                      {simulation.coinId}
                    </div>
                    <h2 className="mt-4 font-['Fraunces'] text-3xl font-semibold text-[var(--color-ink)]">
                      {simulation.frequencyLabel || formatFrequency(simulation.frequencyInDays)}
                    </h2>
                    <p className="mt-2 text-sm text-[var(--color-muted)]">
                      Created {formatDate(simulation.createdAt)}
                    </p>
                  </div>

                  <div className="flex flex-col items-start gap-3 lg:items-end">
                    <div
                      className={`status-chip ${
                        inProfit
                          ? 'border-[rgba(40,211,155,0.18)] bg-[rgba(40,211,155,0.08)] text-[var(--color-positive)]'
                          : 'border-[rgba(255,102,125,0.18)] bg-[rgba(255,102,125,0.08)] text-[var(--color-negative)]'
                      }`}
                    >
                      {inProfit ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      {inProfit ? 'Above cost' : 'Below cost'}
                    </div>

                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => handleDelete(simulation)}
                      disabled={activeDeleteId === simulation.id}
                    >
                      {activeDeleteId === simulation.id ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[rgba(156,175,208,0.2)] border-t-[var(--color-ink)]" />
                          Removing
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-[22px] border border-[rgba(156,175,208,0.1)] bg-[rgba(11,19,36,0.62)] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">
                      Invested
                    </p>
                    <p className="mt-2 font-['Fraunces'] text-3xl font-semibold text-[var(--color-ink)]">
                      {formatCurrency(simulation.totalInvested)}
                    </p>
                  </div>

                  <div className="rounded-[22px] border border-[rgba(156,175,208,0.1)] bg-[rgba(11,19,36,0.62)] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">
                      Final value
                    </p>
                    <p className="mt-2 font-['Fraunces'] text-3xl font-semibold text-[var(--color-ink)]">
                      {formatCurrency(simulation.finalPortfolioValue)}
                    </p>
                  </div>

                  <div className="rounded-[22px] border border-[rgba(156,175,208,0.1)] bg-[rgba(11,19,36,0.62)] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">
                      Profit / Loss
                    </p>
                    <p className={`mt-2 font-['Fraunces'] text-3xl font-semibold ${inProfit ? 'text-[var(--color-positive)]' : 'text-[var(--color-negative)]'}`}>
                      {formatCurrency(simulation.profitOrLoss)}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3 text-xs text-[var(--color-muted-strong)]">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(156,175,208,0.1)] bg-[rgba(11,19,36,0.54)] px-3 py-2">
                    <CalendarRange className="h-3.5 w-3.5 text-[var(--color-muted)]" />
                    {formatDate(simulation.startDate)} to {formatDate(simulation.endDate)}
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(156,175,208,0.1)] bg-[rgba(11,19,36,0.54)] px-3 py-2">
                    <BookmarkCheck className="h-3.5 w-3.5 text-[var(--color-muted)]" />
                    {getSourceLabel(simulation.source)}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : null}
    </div>
  );
}

export default SavedSimulationsPage;
