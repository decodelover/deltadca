import { createElement } from 'react';

function ResultMetricCard({ icon: Icon, label, value, detail, tone = 'neutral' }) {
  const toneStyles = {
    neutral: {
      badge: 'bg-[linear-gradient(135deg,rgba(125,215,255,0.16),rgba(125,215,255,0.08))] text-[var(--color-highlight)]',
      line: 'from-[rgba(125,215,255,0.42)] to-transparent',
    },
    positive: {
      badge: 'bg-[linear-gradient(135deg,rgba(40,211,155,0.18),rgba(40,211,155,0.08))] text-[var(--color-positive)]',
      line: 'from-[rgba(40,211,155,0.46)] to-transparent',
    },
    negative: {
      badge: 'bg-[linear-gradient(135deg,rgba(255,102,125,0.18),rgba(255,102,125,0.08))] text-[var(--color-negative)]',
      line: 'from-[rgba(255,102,125,0.42)] to-transparent',
    },
  };

  const palette = toneStyles[tone] || toneStyles.neutral;

  return (
    <article className="panel-elevated p-5 transition duration-300 hover:-translate-y-1">
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">
            {label}
          </p>
          <p className="mt-3 font-['Fraunces'] text-4xl font-semibold tracking-tight text-[var(--color-ink)]">
            {value}
          </p>
          <p className="mt-3 text-sm leading-7 text-[var(--color-muted-strong)]">{detail}</p>
        </div>

        <div className={`flex h-14 w-14 items-center justify-center rounded-[20px] ${palette.badge}`}>
          {createElement(Icon, { className: 'h-6 w-6' })}
        </div>
      </div>

      <div className={`mt-6 h-1 rounded-full bg-gradient-to-r ${palette.line}`} />
    </article>
  );
}

export default ResultMetricCard;
