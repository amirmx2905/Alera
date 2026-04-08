type LogLevel = "info" | "error";

type TelemetryPayload = Record<string, unknown>;

function stringifyPayload(payload: TelemetryPayload) {
  try {
    return JSON.stringify(payload);
  } catch {
    return "{}";
  }
}

export function logEvent(
  level: LogLevel,
  event: string,
  payload: TelemetryPayload = {},
) {
  const message = stringifyPayload({ event, ...payload });
  if (level === "error") {
    console.error(message);
    return;
  }
  console.info(message);
}

export function nowMs() {
  return Date.now();
}
