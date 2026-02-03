const express = require("express");
const { z } = require("zod");
const {
  createHabit,
  listHabits,
  updateHabit,
  deleteHabit,
} = require("../services/habits.service");

// NOTE: Rutas CRUD de hábitos.

const router = express.Router();

const createSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["numeric", "json"]),
  unit: z.string().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["numeric", "json"]).optional(),
  unit: z.string().nullable().optional(),
});

router.post("/", async (req, res, next) => {
  try {
    const payload = createSchema.parse(req.body);
    const habit = await createHabit(req.user.id, payload);
    res.status(201).json(habit);
  } catch (err) {
    next(err);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const habits = await listHabits(req.user.id);
    res.json(habits);
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const payload = updateSchema.parse(req.body);
    const habit = await updateHabit(req.user.id, req.params.id, payload);
    res.json(habit);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await deleteHabit(req.user.id, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
