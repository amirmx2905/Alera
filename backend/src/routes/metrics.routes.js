const express = require("express");
const { z } = require("zod");
const { getHabit } = require("../services/habits.service");
const {
  listDailyMetrics,
  listWeeklyMetrics,
  listMonthlyMetrics,
  comparePeriods,
  predictNextDailyAverage,
} = require("../services/metrics.service");
const { createError } = require("../middleware/error");

// NOTE: Rutas de métricas y análisis básico.

const router = express.Router();

function ensureNumericHabit(habit) {
  if (habit.type !== "numeric") {
    throw createError(
      400,
      "invalid_request",
      "Las métricas numéricas requieren hábitos tipo numeric",
    );
  }
}

router.get("/:id/metrics/daily", async (req, res, next) => {
  try {
    const habit = await getHabit(req.user.id, req.params.id);
    ensureNumericHabit(habit);
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

router.get("/:id/metrics/weekly", async (req, res, next) => {
  try {
    const habit = await getHabit(req.user.id, req.params.id);
    ensureNumericHabit(habit);
    const { from, to } = req.query;
    const metrics = await listWeeklyMetrics(
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

router.get("/:id/metrics/monthly", async (req, res, next) => {
  try {
    const habit = await getHabit(req.user.id, req.params.id);
    ensureNumericHabit(habit);
    const { from, to } = req.query;
    const metrics = await listMonthlyMetrics(
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

router.get("/:id/metrics/compare", async (req, res, next) => {
  try {
    const habit = await getHabit(req.user.id, req.params.id);
    ensureNumericHabit(habit);
    const schema = z.object({
      fromA: z.string().min(1),
      toA: z.string().min(1),
      fromB: z.string().min(1),
      toB: z.string().min(1),
    });
    const { fromA, toA, fromB, toB } = schema.parse(req.query);
    const result = await comparePeriods(
      req.user.id,
      req.params.id,
      fromA,
      toA,
      fromB,
      toB,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/:id/metrics/predict", async (req, res, next) => {
  try {
    const habit = await getHabit(req.user.id, req.params.id);
    ensureNumericHabit(habit);
    const schema = z.object({
      days: z.string().optional(),
    });
    const { days } = schema.parse(req.query);
    const daysNum = days ? Number(days) : 7;
    if (!Number.isFinite(daysNum) || daysNum < 2) {
      throw createError(
        400,
        "invalid_request",
        "days debe ser un número mayor o igual a 2",
      );
    }
    const result = await predictNextDailyAverage(
      req.user.id,
      req.params.id,
      daysNum,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
