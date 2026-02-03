const express = require("express");
const { z } = require("zod");
const { createChatResponse } = require("../services/ai.service");

// NOTE: Rutas de IA (mock actual).

const router = express.Router();

const chatSchema = z.object({
  message: z.string().min(1),
});

router.post("/chat", async (req, res, next) => {
  try {
    const payload = chatSchema.parse(req.body);
    const result = await createChatResponse(req.user.id, payload.message);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
