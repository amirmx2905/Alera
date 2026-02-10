/**
 * Type definitions for Alera Metrics Pipeline
 */

export interface RequestBody {
  habit_id: string;
  logical_date?: string; // Optional - defaults to today in CDMX
}

export interface HabitLogRecord {
  id: string;
  user_id: string;
  habit_id: string;
  value: number;
  created_at: string;
  logged_at: string | null;
}

export interface Metric {
  user_id: string;
  habit_id: string;
  date: string;
  metric_type: string;
  granularity: string;
  value: number;
  metadata: Record<string, any>;
}

export interface MetricsResponse {
  success: boolean;
  user_id: string;
  habit_id: string;
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
