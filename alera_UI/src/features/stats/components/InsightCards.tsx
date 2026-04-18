import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { HabitPredictions } from "../types";

// ---------------------------------------------------------------------------
// Style maps
// ---------------------------------------------------------------------------

const RISK_COLORS = {
  low: {
    bg: "bg-green-500/15",
    border: "border-green-400/30",
    text: "text-green-300",
  },
  medium: {
    bg: "bg-yellow-500/15",
    border: "border-yellow-400/30",
    text: "text-yellow-300",
  },
  high: {
    bg: "bg-red-500/15",
    border: "border-red-400/30",
    text: "text-red-300",
  },
};

const DIRECTION_CONFIG = {
  improving: {
    icon: "trending-up" as const,
    color: "#4ade80",
    label: "Improving",
  },
  declining: {
    icon: "trending-down" as const,
    color: "#f87171",
    label: "Declining",
  },
  stable: {
    icon: "remove-outline" as const,
    color: "#94a3b8",
    label: "Stable",
  },
};

/** Maps internal ML feature names → human-readable labels for streak risk chips. */
const FACTOR_LABELS: Record<string, string> = {
  day_of_week: "Day pattern",
  completion_rate_short: "Recent rate",
  completion_rate_long: "Long-term rate",
  current_streak: "Streak",
  periods_since_last_completion: "Gap",
  trend_slope_short: "Recent trend",
  trend_slope_long: "Overall trend",
  value_variance: "Consistency",
};

const PERIOD_CONFIG = {
  morning: {
    icon: "sunny-outline" as const,
    label: "Morning",
    color: "#fbbf24",
  },
  afternoon: {
    icon: "partly-sunny-outline" as const,
    label: "Afternoon",
    color: "#fb923c",
  },
  evening: {
    icon: "moon-outline" as const,
    label: "Evening",
    color: "#818cf8",
  },
  night: {
    icon: "moon-outline" as const,
    label: "Night",
    color: "#475569",
  },
};

// Hours shown in the distribution mini-chart: 5 AM – 11 PM (indices 5-22)
const DIST_HOUR_START = 5;
const DIST_HOUR_END = 22; // inclusive

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

export function StreakRiskCard({
  risk,
  showFactors = false,
  className = "",
}: {
  risk: HabitPredictions["streakRisk"] & {};
  showFactors?: boolean;
  className?: string;
}) {
  const style = RISK_COLORS[risk.risk_label];
  return (
    <View className={`rounded-2xl border ${style.border} ${style.bg} p-4 ${className}`}>
      <Text className="text-xs text-slate-400">Streak risk</Text>
      <Text className={`mt-1 text-xl font-bold capitalize ${style.text}`}>
        {risk.risk_label}
      </Text>
      <Text className="text-xs text-slate-500">
        {Math.round(risk.risk_score * 100)}% skip probability
      </Text>
      {showFactors && risk.top_factors && risk.top_factors.length > 0 ? (
        <View className="mt-2 flex-row flex-wrap gap-1">
          {risk.top_factors.map((f) => (
            <View key={f} className="rounded-full bg-white/10 px-2 py-0.5">
              <Text className="text-[9px] text-slate-400">
                {FACTOR_LABELS[f] ?? f}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function TrajectoryCard({
  trajectory,
  showConfidence = false,
  habitUnit,
  className = "",
}: {
  trajectory: HabitPredictions["trajectory"] & {};
  showConfidence?: boolean;
  habitUnit?: string;
  className?: string;
}) {
  const config = DIRECTION_CONFIG[trajectory.direction];
  const confidenceSuffix =
    showConfidence && trajectory.confidence !== undefined
      ? `  ·  ${Math.round(trajectory.confidence * 100)}% fit`
      : "";

  const recentLabel =
    habitUnit && trajectory.recent_avg_value !== undefined
      ? `recent avg: ${trajectory.recent_avg_value % 1 === 0 ? trajectory.recent_avg_value : trajectory.recent_avg_value.toFixed(1)} ${habitUnit}${confidenceSuffix}`
      : `recent rate: ${Math.round(trajectory.rate_7d * 100)}%${confidenceSuffix}`;

  return (
    <View className={`rounded-2xl border border-white/10 bg-white/5 p-4 ${className}`}>
      <Text className="text-xs text-slate-400">Trajectory</Text>
      <View className="mt-1 flex-row items-center gap-1.5">
        <Ionicons name={config.icon} size={20} color={config.color} />
        <Text className="text-xl font-bold text-white">{config.label}</Text>
      </View>
      <Text className="text-xs text-slate-500">{recentLabel}</Text>
      {habitUnit &&
      (trajectory.avg_hit_value !== undefined ||
        trajectory.avg_miss_value !== undefined) ? (
        <View className="mt-2 gap-0.5">
          {trajectory.avg_hit_value !== undefined ? (
            <Text className="text-[10px] text-green-400">
              ↑ hit avg: {trajectory.avg_hit_value.toFixed(1)} {habitUnit}
            </Text>
          ) : null}
          {trajectory.avg_miss_value !== undefined ? (
            <Text className="text-[10px] text-red-400">
              ↓ miss avg: {trajectory.avg_miss_value.toFixed(1)} {habitUnit}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function GoalEtaCard({
  eta,
  className = "",
}: {
  eta: HabitPredictions["goalEta"] & {};
  className?: string;
}) {
  const isOnTrack = eta.on_track && eta.estimated_days === 0;
  const hasEta =
    eta.on_track && eta.estimated_days !== null && eta.estimated_days > 0;

  const icon = isOnTrack
    ? ("checkmark-circle-outline" as const)
    : hasEta
      ? ("time-outline" as const)
      : ("remove-circle-outline" as const);
  const iconColor = isOnTrack ? "#4ade80" : hasEta ? "#fbbf24" : "#64748b";
  const title = isOnTrack ? "On track" : hasEta ? `~${eta.estimated_days}d` : "No path yet";
  const subtitle = isOnTrack
    ? "Hitting goal consistently"
    : hasEta
      ? "Est. days to reach goal"
      : "Keep logging to improve";

  return (
    <View className={`rounded-2xl border border-white/10 bg-white/5 p-4 ${className}`}>
      <Text className="text-xs text-slate-400">Goal ETA</Text>
      <View className="mt-1 flex-row items-center gap-1.5">
        <Ionicons name={icon} size={20} color={iconColor} />
        <Text className="text-xl font-bold text-white">{title}</Text>
      </View>
      <Text className="text-xs text-slate-500">{subtitle}</Text>
      <View className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <View
          className="h-full rounded-full bg-purple-500"
          style={{
            width: `${Math.min(Math.round(eta.projected_completion_rate * 100), 100)}%`,
          }}
        />
      </View>
      <Text className="mt-1 text-[10px] text-slate-500">
        {Math.round(eta.projected_completion_rate * 100)}% toward goal
      </Text>
    </View>
  );
}

export function BestReminderCard({
  reminder,
  className = "",
}: {
  reminder: HabitPredictions["bestReminder"] & {};
  className?: string;
}) {
  const config = PERIOD_CONFIG[reminder.best_period] ?? PERIOD_CONFIG.morning;
  const hour12 = reminder.best_hour % 12 || 12;
  const ampm = reminder.best_hour < 12 ? "AM" : "PM";

  const distSlice =
    reminder.distribution.length === 24
      ? reminder.distribution.slice(DIST_HOUR_START, DIST_HOUR_END + 1)
      : [];
  const maxDensity = distSlice.length > 0 ? Math.max(...distSlice) : 1;

  return (
    <View className={`rounded-2xl border border-white/10 bg-white/5 p-4 ${className}`}>
      <Text className="text-xs text-slate-400">Best reminder</Text>
      <View className="mt-1 flex-row items-center gap-1.5">
        <Ionicons name={config.icon} size={20} color={config.color} />
        <Text className="text-xl font-bold text-white">
          {hour12}:00 {ampm}
        </Text>
      </View>
      <Text className="text-xs text-slate-500">
        {config.label} · based on your pattern
      </Text>

      {distSlice.length > 0 ? (
        <View className="mt-3">
          <View className="flex-row items-end gap-px" style={{ height: 24 }}>
            {distSlice.map((density, i) => {
              const hour = i + DIST_HOUR_START;
              const isActive = hour === reminder.best_hour;
              const barHeight = Math.max(2, Math.round((density / maxDensity) * 20));
              return (
                <View
                  key={hour}
                  style={{
                    height: barHeight,
                    flex: 1,
                    borderRadius: 2,
                    backgroundColor: isActive ? "#c4b5fd" : "rgba(255,255,255,0.15)",
                  }}
                />
              );
            })}
          </View>
          <View className="mt-1 flex-row justify-between">
            <Text className="text-[9px] text-slate-600">5 AM</Text>
            <Text className="text-[9px] text-slate-600">10 PM</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
