import { formatChartDate } from './formatters';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function roundToCurrency(value) {
  return Number(value.toFixed(2));
}

export function buildPortfolioSeries(formValues, simulation) {
  if (!simulation) {
    return [];
  }

  const startDate = new Date(formValues.startDate);
  const endDate = new Date(formValues.endDate);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return [];
  }

  const totalInvested = Number(simulation.totalInvested);
  const finalPortfolioValue = Number(simulation.finalPortfolioValue);
  const frequencyInDays = Math.max(1, Number(formValues.frequencyInDays) || 1);
  const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / MS_PER_DAY));
  const estimatedPoints = Math.max(4, Math.floor(totalDays / frequencyInDays) + 1);
  const pointCount = Math.min(estimatedPoints, 36);
  const totalDelta = finalPortfolioValue - totalInvested;

  const points = Array.from({ length: pointCount }, (_, index) => {
    const progress = index / (pointCount - 1);
    const timestamp = startDate.getTime() + ((endDate.getTime() - startDate.getTime()) * progress);
    const invested = totalInvested * progress;
    const profitCurve = 1 - ((1 - progress) ** 1.65);
    const wave = totalDelta * 0.07 * Math.sin(progress * Math.PI * 2.5) * progress * (1 - progress);
    const portfolio = Math.max(0, invested + (totalDelta * profitCurve) + wave);

    return {
      date: new Date(timestamp).toISOString(),
      label: formatChartDate(timestamp),
      invested: roundToCurrency(invested),
      portfolio: roundToCurrency(portfolio),
    };
  });

  points[0].invested = 0;
  points[0].portfolio = 0;
  points[points.length - 1].invested = roundToCurrency(totalInvested);
  points[points.length - 1].portfolio = roundToCurrency(finalPortfolioValue);

  return points;
}
