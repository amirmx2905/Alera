const { calculateDailyAverageForDate } = require("../services/metrics.service");

function getYesterdayDateString() {
  const now = new Date();
  const yesterday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1),
  );
  return yesterday.toISOString().slice(0, 10);
}

async function runDailyMetricsJob() {
  const date = getYesterdayDateString();
  return calculateDailyAverageForDate(date);
}

module.exports = { runDailyMetricsJob };
