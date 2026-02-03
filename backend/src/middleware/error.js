// NOTE: Middlewares de errores y utilidades.

function notFoundHandler(req, res, next) {
  res.status(404).json({
    error: "not_found",
    message: "Ruta no encontrada",
    request_id: req.requestId,
  });
}

function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const code = err.code || "internal_error";

  console.error(
    JSON.stringify({
      level: "error",
      message: err.message || "Unhandled error",
      code,
      status,
      request_id: req.requestId,
      timestamp: new Date().toISOString(),
    }),
  );

  res.status(status).json({
    error: code,
    message: err.message || "Error interno",
    request_id: req.requestId,
  });
}

function createError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

module.exports = { notFoundHandler, errorHandler, createError };
