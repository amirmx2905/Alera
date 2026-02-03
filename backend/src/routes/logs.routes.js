const express = require("express");
const { z } = require("zod");
const { getHabit } = require("../services/habits.service");
const {
  createLog,
  listLogs,
  updateLog,
  deleteLog,
  upsertLogByDate,
} = require("../services/logs.service");
const { createError } = require("../middleware/error");

// NOTE: Rutas de registros diarios por hábito.

const router = express.Router();

const createSchema = z.object({
  value: z.any(),
  metadata: z.record(z.any()).optional(),
  created_at: z.string().datetime().optional(),
});

const updateSchema = z.object({
  value: z.any().optional(),
  metadata: z.record(z.any()).optional(),
});

const upsertByDateSchema = z.object({
  date: z.string().min(10),
  value: z.any(),
  metadata: z.record(z.any()).optional(),
});

function normalizeDateOnly(input) {
  const dateOnly = input.length >= 10 ? input.slice(0, 10) : input;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    throw createError(400, "invalid_request", "date debe ser YYYY-MM-DD");
  }
  return dateOnly;
}

function validateLogValue(habit, value) {
  if (habit.type === "numeric") {
    if (
      typeof value !== "number" ||
      Number.isNaN(value) ||
      !Number.isFinite(value)
    ) {
      throw createError(400, "invalid_request", "El valor debe ser numérico");
    }
    if (value < 0) {
      throw createError(
        400,
        "invalid_request",
        "El valor no puede ser negativo",
      );
    }
  } else if (habit.type === "json") {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw createError(
        400,
        "invalid_request",
        "El valor debe ser un objeto JSON",
      );
    }
  } else {
    throw createError(400, "invalid_request", "Tipo de hábito no soportado");
  }
}

router.post("/:id/logs", async (req, res, next) => {
  try {
    const payload = createSchema.parse(req.body);
    const habit = await getHabit(req.user.id, req.params.id);
    validateLogValue(habit, payload.value);
    const log = await createLog(req.user.id, req.params.id, payload);
    res.status(201).json(log);
  } catch (err) {
    next(err);
  }
});

router.get("/:id/logs", async (req, res, next) => {
  try {
    await getHabit(req.user.id, req.params.id);
    const { from, to } = req.query;
    const logs = await listLogs(req.user.id, req.params.id, from, to);
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/logs/:logId", async (req, res, next) => {
  try {
    const payload = updateSchema.parse(req.body);
    if (payload.value === undefined && payload.metadata === undefined) {
      throw createError(400, "invalid_request", "Nada que actualizar");
    }
    const habit = await getHabit(req.user.id, req.params.id);
    if (payload.value !== undefined) {
      validateLogValue(habit, payload.value);
    }
    const updated = await updateLog(
      req.user.id,
      req.params.id,
      req.params.logId,
      payload,
    );
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id/logs/:logId", async (req, res, next) => {
  try {
    await getHabit(req.user.id, req.params.id);
    await deleteLog(req.user.id, req.params.id, req.params.logId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.put("/:id/logs/by-date", async (req, res, next) => {
  try {
    const payload = upsertByDateSchema.parse(req.body);
    const habit = await getHabit(req.user.id, req.params.id);
    const date = normalizeDateOnly(payload.date);
    validateLogValue(habit, payload.value);
    const result = await upsertLogByDate(
      req.user.id,
      req.params.id,
      date,
      payload,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
