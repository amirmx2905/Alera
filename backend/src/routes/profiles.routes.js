const express = require("express");
const { z } = require("zod");
const { createProfile, getProfile } = require("../services/profiles.service");

// NOTE: Rutas de perfil del usuario.

const router = express.Router();

const createSchema = z.object({
  username: z.string().min(1),
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

module.exports = router;
