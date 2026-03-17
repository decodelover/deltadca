function LoadingPanel() {
  return (
    <section className="panel-elevated p-6 sm:p-8">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,rgba(240,140,86,0.2),rgba(125,215,255,0.16))]">
            <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-[rgba(240,140,86,0.22)] border-t-[var(--color-accent)]" />
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">
              Running live pricing request
            </p>
            <h3 className="mt-1 font-['Fraunces'] text-3xl font-semibold text-[var(--color-ink)]">
              Building your DeltaDCA plan
            </h3>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-[24px] border border-[rgba(156,175,208,0.1)] bg-[rgba(17,28,52,0.68)]"
            />
          ))}
        </div>

        <div className="h-[360px] animate-pulse rounded-[28px] border border-[rgba(156,175,208,0.1)] bg-[linear-gradient(135deg,rgba(11,19,36,0.92),rgba(19,31,58,0.7))]" />
      </div>
    </section>
  );
}

export default LoadingPanel;
