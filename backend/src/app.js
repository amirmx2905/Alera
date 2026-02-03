const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { requestId } = require("./middleware/requestId");
const { requestLogger } = require("./middleware/logger");
const { errorHandler, notFoundHandler } = require("./middleware/error");
const { apiLimiter } = require("./middleware/rateLimit");
const routes = require("./routes");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(requestId);
app.use(requestLogger);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/v1", apiLimiter, routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = { app };
