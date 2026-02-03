const express = require("express");
const { z } = require("zod");
const { getHabit } = require("../services/habits.service");
const {
  upsertGoal,
  getGoal,
  deleteGoal,
} = require("../services/goals.service");

// NOTE: Rutas de objetivos por hábito.

const router = express.Router();

const goalSchema = z.object({
  target_value: z.number().positive(),
});

router.put("/:id/goal", async (req, res, next) => {
  try {
    const payload = goalSchema.parse(req.body);
    await getHabit(req.user.id, req.params.id);
    const goal = await upsertGoal(
      req.user.id,
      req.params.id,
      payload.target_value,
    );
    res.json(goal);
  } catch (err) {
    next(err);
  }
});

router.get("/:id/goal", async (req, res, next) => {
  try {
    await getHabit(req.user.id, req.params.id);
    const goal = await getGoal(req.user.id, req.params.id);
    res.json(goal || null);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id/goal", async (req, res, next) => {
  try {
    await getHabit(req.user.id, req.params.id);
    await deleteGoal(req.user.id, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
