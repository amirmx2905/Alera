type JsonResponseInit = {
  status?: number;
};

export const jsonResponse = (payload: unknown, init: JsonResponseInit = {}) =>
  new Response(JSON.stringify(payload), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json" },
  });
