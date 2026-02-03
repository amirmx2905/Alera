const express = require("express");
const { z } = require("zod");
const {
  createProfile,
  getProfile,
  updateProfile,
} = require("../services/profiles.service");
const { createError } = require("../middleware/error");

// NOTE: Rutas de perfil del usuario.

const router = express.Router();

const createSchema = z.object({
  username: z.string().min(1),
});

const updateSchema = z.object({
  username: z.string().min(1).optional(),
});

router.post("/", async (req, res, next) => {
  try {
    const payload = createSchema.parse(req.body);
    const profile = await createProfile(req.user.id, payload.username);
    res.status(201).json(profile);
  } catch (err) {
    next(err);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const profile = await getProfile(req.user.id);
    res.json(profile || null);
  } catch (err) {
    next(err);
  }
});

router.patch("/", async (req, res, next) => {
  try {
    const payload = updateSchema.parse(req.body);
    if (!payload.username) {
      throw createError(400, "invalid_request", "Nada que actualizar");
    }
    const profile = await updateProfile(req.user.id, payload.username);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
