require("dotenv").config();
const cron = require("node-cron");
const { app } = require("./app");
const { runDailyMetricsJob } = require("./jobs/daily-metrics.job");

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(
    JSON.stringify({
      level: "info",
      message: `Alera backend running on port ${PORT}`,
      timestamp: new Date().toISOString(),
    }),
  );
});

// Cron Job se ejecuta a las 00:00 CDMX hrs todos los días
cron.schedule(
  "0 0 * * *",
  async () => {
    try {
      await runDailyMetricsJob();
    } catch (error) {
      console.error(
        JSON.stringify({
          level: "error",
          message: "Daily metrics job failed",
          error: error.message,
          timestamp: new Date().toISOString(),
        }),
      );
    }
  },
  { timezone: "America/Mexico_City" },
);
