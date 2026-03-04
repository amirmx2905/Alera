export function formatPeriodUnit(
  value: number,
  unit: "days" | "weeks" | "months",
) {
  if (value === 1) {
    if (unit === "days") return "day";
    if (unit === "weeks") return "week";
    return "month";
  }

  return unit;
}

export function formatCompletionWindow(
  completed: number,
  total: number,
  unit: "days" | "weeks" | "months",
) {
  return `${completed}/${total} ${formatPeriodUnit(total, unit)}`;
}
