const { supabase } = require("../db/supabase");
const { createError } = require("./error");

// NOTE: Middleware de autenticación JWT (Supabase).

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      throw createError(401, "unauthorized", "Token requerido");
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      throw createError(401, "unauthorized", "Token inválido");
    }

    req.user = { id: data.user.id, email: data.user.email || null };
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireAuth };
