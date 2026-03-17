import { createElement } from 'react';
import { Fingerprint, Radar, ShieldCheck } from 'lucide-react';

const highlights = [
  {
    icon: ShieldCheck,
    title: 'Secure account access',
    description: 'Protected routes and token-based sessions keep planning history tied to the right account.',
  },
  {
    icon: Radar,
    title: 'Saved plans stay synced',
    description: 'Your plans reload from PostgreSQL so they are still there when you refresh or sign in again.',
  },
  {
    icon: Fingerprint,
    title: 'Fast plan recovery',
    description: 'Jump back into planning without rebuilding the scenarios you already decided to keep.',
  },
];

function AuthPanel({ eyebrow, title, description, footer, children }) {
  return (
    <div className="mx-auto grid max-w-[96rem] items-start gap-6 xl:grid-cols-[1.02fr,0.98fr]">
      <aside className="panel-elevated relative hidden overflow-hidden p-8 xl:block xl:sticky xl:top-32">
        <div className="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top_left,rgba(240,140,86,0.16),transparent_72%)]" />
        <div className="absolute -right-24 top-6 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(125,215,255,0.18),transparent_68%)] blur-3xl" />

        <div className="relative">
          <span className="eyebrow">DeltaDCA account</span>
          <h1 className="mt-6 max-w-xl font-['Fraunces'] text-[3.4rem] font-semibold leading-[1.02] text-[var(--color-ink)]">
            Keep your saved DCA plans secure and ready when you return.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-8 text-[var(--color-muted-strong)]">
            Your account is where saved plans, session recovery, and private planning history all come together.
          </p>

          <div className="mt-10 grid gap-4">
            {highlights.map(({ icon: Icon, title: itemTitle, description: itemDescription }, index) => (
              <div
                key={itemTitle}
                className={`rounded-[28px] border border-[rgba(156,175,208,0.12)] bg-[rgba(11,19,36,0.7)] p-5 ${
                  index === 1 ? 'floating-card' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,rgba(240,140,86,0.18),rgba(125,215,255,0.14))] text-[var(--color-accent-strong)]">
                    {createElement(Icon, { className: 'h-5 w-5' })}
                  </div>

                  <div>
                    <h2 className="font-['Fraunces'] text-2xl font-semibold text-[var(--color-ink)]">
                      {itemTitle}
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-[var(--color-muted-strong)]">
                      {itemDescription}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <section className="panel-elevated relative min-h-[calc(100svh-7.5rem)] overflow-hidden p-5 sm:p-8 lg:min-h-0 lg:p-10">
        <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_left,rgba(240,140,86,0.14),transparent_72%)]" />

        <div className="relative mx-auto max-w-2xl xl:max-w-none">
          <span className="eyebrow">{eyebrow}</span>
          <h1 className="mt-5 max-w-3xl font-['Fraunces'] text-3xl font-semibold leading-[1.06] text-[var(--color-ink)] sm:text-4xl lg:text-[3.1rem]">
            {title}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--color-muted-strong)]">
            {description}
          </p>

          <div className="mt-8">{children}</div>

          {footer ? (
            <div className="mt-6 border-t border-[rgba(156,175,208,0.1)] pt-5 text-sm text-[var(--color-muted)]">
              {footer}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export default AuthPanel;
