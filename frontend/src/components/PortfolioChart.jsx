import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatAxisCurrency, formatCurrency, formatDate } from '../utils/formatters';

function PortfolioChart({ data, tone }) {
  const positive = tone !== 'negative';
  const strokeColor = positive ? '#28d39b' : '#ff667d';
  const mutedStrokeColor = positive ? 'rgba(125, 215, 255, 0.54)' : 'rgba(240, 140, 86, 0.5)';

  return (
    <section className="panel-elevated p-6 sm:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">
            Portfolio projection
          </p>
          <h3 className="mt-2 font-['Fraunces'] text-3xl font-semibold text-[var(--color-ink)]">
            Simulated capital growth curve
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--color-muted-strong)]">
            The model blends deployed capital with the final result returned by the pricing engine
            so you can read the overall trajectory at a glance.
          </p>
        </div>

        <div
          className={`status-chip ${
            positive
              ? 'border-[rgba(40,211,155,0.18)] bg-[rgba(40,211,155,0.1)] text-[var(--color-positive)]'
              : 'border-[rgba(255,102,125,0.18)] bg-[rgba(255,102,125,0.08)] text-[var(--color-negative)]'
          }`}
        >
          {positive ? 'Profit trajectory' : 'Drawdown trajectory'}
        </div>
      </div>

      <div className="mt-8 h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="portfolioFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.34} />
                <stop offset="60%" stopColor={strokeColor} stopOpacity={0.14} />
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
              </linearGradient>

              <linearGradient id="investedFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#7dd7ff" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#7dd7ff" stopOpacity={0} />
              </linearGradient>

              <filter id="portfolioGlow">
                <feDropShadow dx="0" dy="0" stdDeviation="9" floodColor={strokeColor} floodOpacity="0.24" />
              </filter>
            </defs>

            <CartesianGrid stroke="rgba(156, 175, 208, 0.08)" vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="label"
              minTickGap={24}
              tick={{ fill: '#8090b3', fontSize: 12 }}
              tickLine={false}
            />
            <YAxis
              axisLine={false}
              tick={{ fill: '#8090b3', fontSize: 12 }}
              tickFormatter={formatAxisCurrency}
              tickLine={false}
              width={72}
            />
            <Tooltip
              cursor={{ stroke: 'rgba(156, 175, 208, 0.24)', strokeDasharray: '4 4' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) {
                  return null;
                }

                const point = payload[0]?.payload;

                return (
                  <div className="rounded-[22px] border border-[rgba(156,175,208,0.12)] bg-[rgba(8,14,28,0.96)] p-4 shadow-[0_24px_60px_-36px_rgba(0,0,0,0.92)] backdrop-blur-xl">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">
                      {formatDate(point.date)}
                    </p>
                    <p className="mt-2 text-sm text-[var(--color-muted-strong)]">Portfolio</p>
                    <p className="font-['Fraunces'] text-2xl font-semibold text-[var(--color-ink)]">
                      {formatCurrency(point.portfolio)}
                    </p>
                    <p className="mt-3 text-xs text-[var(--color-muted)]">
                      Capital deployed:
                      {' '}
                      <span className="font-semibold text-[var(--color-ink)]">
                        {formatCurrency(point.invested)}
                      </span>
                    </p>
                  </div>
                );
              }}
            />

            <Area
              dataKey="invested"
              fill="url(#investedFill)"
              fillOpacity={1}
              stroke={mutedStrokeColor}
              strokeWidth={2}
              type="monotone"
            />
            <Area
              dataKey="portfolio"
              fill="url(#portfolioFill)"
              fillOpacity={1}
              filter="url(#portfolioGlow)"
              stroke={strokeColor}
              strokeWidth={3}
              type="monotone"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export default PortfolioChart;
