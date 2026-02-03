const express = require("express");
const { requireAuth } = require("../middleware/auth");
const habitsRoutes = require("./habits.routes");
const logsRoutes = require("./logs.routes");
const metricsRoutes = require("./metrics.routes");
const goalsRoutes = require("./goals.routes");
const goalsRootRoutes = require("./goals.root.routes");
const profilesRoutes = require("./profiles.routes");
const aiRoutes = require("./ai.routes");
const { aiLimiter } = require("../middleware/rateLimit");

// NOTE: Router principal versionado (/api/v1).

const router = express.Router();

router.use(requireAuth);

router.use("/habits", habitsRoutes);
router.use("/habits", logsRoutes);
router.use("/habits", metricsRoutes);
router.use("/habits", goalsRoutes);
router.use("/goals", goalsRootRoutes);
router.use("/profile", profilesRoutes);
router.use("/ai", aiLimiter, aiRoutes);

module.exports = router;
