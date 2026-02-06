const express = require("express");
const { z } = require("zod");
const { getHabit } = require("../services/habits.service");
const {
  listDailyMetrics,
  listMetrics,
} = require("../services/metrics.service");

// NOTE: Rutas de métricas (solo lectura desde tabla metrics).

const router = express.Router();

router.get("/:id/metrics/daily", async (req, res, next) => {
  try {
    await getHabit(req.user.id, req.params.id);
    const { from, to } = req.query;
    const metrics = await listDailyMetrics(
      req.user.id,
      req.params.id,
      from,
      to,
    );
    res.json(metrics);
  } catch (err) {
    next(err);
  }
});

router.get("/:id/metrics", async (req, res, next) => {
  try {
    await getHabit(req.user.id, req.params.id);
    const schema = z.object({
      metric_type: z.string().min(1).optional(),
      granularity: z.enum(["daily", "weekly", "monthly"]).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    });
    const { metric_type, granularity, from, to } = schema.parse(req.query);
    const metrics = await listMetrics(req.user.id, req.params.id, {
      metricType: metric_type,
      granularity,
      from,
      to,
    });
    res.json(metrics);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
