const express = require("express");
const { z } = require("zod");
const { createHabit, findHabitByName } = require("../services/habits.service");
const { upsertGoal } = require("../services/goals.service");

// NOTE: Ruta raíz para crear objetivo y crear hábito si no existe.

const router = express.Router();

const createGoalSchema = z.object({
  habit: z.object({
    name: z.string().min(1),
    type: z.enum(["numeric", "json"]),
    unit: z.string().optional(),
  }),
  target_value: z.number().positive(),
});

router.post("/", async (req, res, next) => {
  try {
    const payload = createGoalSchema.parse(req.body);
    const existing = await findHabitByName(req.user.id, payload.habit.name);
    const habit = existing || (await createHabit(req.user.id, payload.habit));
    const goal = await upsertGoal(req.user.id, habit.id, payload.target_value);
    res.status(201).json({ habit, goal });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
