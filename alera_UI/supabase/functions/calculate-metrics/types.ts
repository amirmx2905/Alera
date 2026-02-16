/**
 * Type definitions for Alera Metrics Pipeline
 */

export interface RequestBody {
  habit_id?: string;
  profile_id: string;
  logical_date?: string; // Optional - defaults to today in CDMX
}

export interface HabitLogRecord {
  id: string;
  profile_id: string;
  habit_id: string;
  value: number;
  created_at: string;
  logged_at: string | null;
}

export interface Metric {
  profile_id: string;
  habit_id: string | null;
  date: string;
  metric_type: string;
  granularity: string;
  value: number;
  metadata: Record<string, any>;
}

export interface MetricsResponse {
  success: boolean;
  profile_id: string;
  habit_id: string | null;
  logical_date: string;
  records_found: number;
  metrics_calculated: number;
  metrics_written: number;
  metrics: Array<{ type: string; value: number }>;
}

export interface ErrorResponse {
  success: false;
  error: string;
}
