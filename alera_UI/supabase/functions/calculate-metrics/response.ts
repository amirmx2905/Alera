type JsonResponseInit = {
  status?: number;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

export const corsPreflightResponse = () =>
  new Response(null, { status: 204, headers: corsHeaders });

export const jsonResponse = (payload: unknown, init: JsonResponseInit = {}) =>
  new Response(JSON.stringify(payload), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
