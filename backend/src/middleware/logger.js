// NOTE: Logger estructurado por request.

function requestLogger(req, res, next) {
  const start = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - start;
    const log = {
      level: "info",
      message: "request_completed",
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration_ms: durationMs,
      request_id: req.requestId,
      user_id: req.user?.id || null,
      timestamp: new Date().toISOString(),
    };
    console.log(JSON.stringify(log));
  });

  next();
}

module.exports = { requestLogger };
