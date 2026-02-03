const { randomUUID } = require("crypto");

// NOTE: Genera un request_id para trazabilidad.

function requestId(req, res, next) {
  const id = randomUUID();
  req.requestId = id;
  res.setHeader("x-request-id", id);
  next();
}

module.exports = { requestId };
