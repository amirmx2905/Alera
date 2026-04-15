"""Feature engineering for habit prediction models.

Features are computed at the *period* granularity that matches the habit's
goal type so that a weekly habit logging 0,0,0,0,40,30,40 is correctly
recognised as a completed week, not four missed days.

Public API
----------
build_feature_matrix(logs_df, goal_target, goal_type, tier, habit_created_at)
    → period-indexed DataFrame used by every model.
get_logging_hours(logs_df)
    → list of ints used by predict_best_reminder.
"""

import warnings
from datetime import date, timedelta

import numpy as np
import pandas as pd

warnings.filterwarnings("ignore", category=FutureWarning, module="pandas")

# ---------------------------------------------------------------------------
# Period helpers
# ---------------------------------------------------------------------------

def _period_start(d: date, goal_type: str) -> date:
    """Return the first day of the period that contains *d*."""
    if goal_type == "daily":
        return d
    if goal_type == "weekly":
        return d - timedelta(days=d.weekday())  # Monday
    # monthly
    return d.replace(day=1)


def _build_period_spine(
    habit_created_at: str,
    goal_type: str,
) -> pd.DataFrame:
    """Return one row per *complete-or-current* period from creation to today."""
    start_day = pd.to_datetime(habit_created_at, format='ISO8601').date()
    today = date.today()

    period_starts: list[date] = []
    cursor = _period_start(start_day, goal_type)
    while cursor <= today:
        period_starts.append(cursor)
        if goal_type == "daily":
            cursor += timedelta(days=1)
        elif goal_type == "weekly":
            cursor += timedelta(weeks=1)
        else:
            # advance one month
            month = cursor.month + 1 if cursor.month < 12 else 1
            year = cursor.year if cursor.month < 12 else cursor.year + 1
            cursor = date(year, month, 1)

    return pd.DataFrame({"period_start": period_starts})


def _period_end(ps: date, goal_type: str) -> date:
    """Last day (inclusive) of the period starting at *ps*."""
    if goal_type == "daily":
        return ps
    if goal_type == "weekly":
        return ps + timedelta(days=6)
    # monthly — last day of month
    month = ps.month + 1 if ps.month < 12 else 1
    year = ps.year if ps.month < 12 else ps.year + 1
    return date(year, month, 1) - timedelta(days=1)


# ---------------------------------------------------------------------------
# Main feature builder
# ---------------------------------------------------------------------------

def build_feature_matrix(
    logs_df: pd.DataFrame,
    goal_target: float | None,
    goal_type: str,
    tier: str,
    habit_created_at: str,
) -> pd.DataFrame:
    """Transform raw habit logs into a *period-aware* feature matrix.

    Each row represents one period (day / week / month) and whether the
    habit goal was met during that period, so models never confuse
    "no log on Tuesday" with "missed the weekly goal".

    Args:
        logs_df:          DataFrame with columns [value, logged_at, created_at].
        goal_target:      Numeric goal threshold (None → any log counts).
        goal_type:        'daily' | 'weekly' | 'monthly'.
        tier:             'basic' | 'full' — controls optional features.
        habit_created_at: ISO timestamp of habit creation.

    Returns:
        DataFrame with one row per period and computed features.
    """
    today = date.today()

    # ── 1. Aggregate raw logs by calendar day ─────────────────────────────
    if logs_df.empty:
        daily = pd.DataFrame(columns=["log_date", "daily_total", "log_count"])
    else:
        logs = logs_df.copy()
        # Prefer logged_at (user-selected date) over created_at
        effective_ts = logs["logged_at"].fillna(logs["created_at"])
        logs.loc[:, "log_date"] = pd.to_datetime(effective_ts, format='ISO8601').dt.date
        logs.loc[:, "value"] = pd.to_numeric(logs["value"], errors="coerce").fillna(0)
        daily = logs.groupby("log_date", as_index=False).agg(
            daily_total=("value", "sum"),
            log_count=("value", "count"),
        )

    # ── 2. Build period spine and sum logs into each period ───────────────
    spine = _build_period_spine(habit_created_at, goal_type).copy()

    period_totals: list[float] = []
    period_counts: list[int] = []

    for ps in spine["period_start"]:
        pe = _period_end(ps, goal_type)
        if daily.empty:
            period_totals.append(0.0)
            period_counts.append(0)
        else:
            mask = (daily["log_date"] >= ps) & (daily["log_date"] <= pe)
            period_totals.append(float(daily.loc[mask, "daily_total"].sum()))
            period_counts.append(int(daily.loc[mask, "log_count"].sum()))

    spine["period_total"] = period_totals
    spine["period_count"] = period_counts

    # ── 3. Period-level completion ────────────────────────────────────────
    # A period is "completed" when the *period total* meets the goal.
    # For daily goals the goal is the per-day target.
    # For weekly/monthly goals the goal is the full-period target.
    effective_threshold = goal_target if goal_target and goal_target > 0 else None

    if effective_threshold is not None:
        spine["completed"] = (spine["period_total"] >= effective_threshold).astype(int)
    else:
        # No numeric goal → any log in the period counts
        spine["completed"] = (spine["period_count"] > 0).astype(int)

    # Mark current (incomplete) period — models should treat it carefully
    spine["is_current_period"] = spine["period_start"].apply(
        lambda ps: _period_end(ps, goal_type) >= today
    ).astype(int)

    # ── 4. Rolling features over periods (not days) ───────────────────────
    n_periods_short = 4   # ~4 weeks for weekly, ~4 days for daily
    n_periods_long = 8

    spine["completion_rate_short"] = (
        spine["completed"].rolling(n_periods_short, min_periods=1).mean()
    )
    spine["completion_rate_long"] = (
        spine["completed"].rolling(n_periods_long, min_periods=1).mean()
    )
    spine["avg_value_short"] = (
        spine["period_total"].rolling(n_periods_short, min_periods=1).mean()
    )

    # Consecutive completed periods (streak)
    streaks: list[int] = []
    current = 0
    for c in spine["completed"]:
        current = current + 1 if c == 1 else 0
        streaks.append(current)
    spine["current_streak"] = streaks

    # Periods since last completion
    last_done: date | None = None
    gaps: list[int] = []
    for i, row in spine.iterrows():
        if row["completed"] == 1:
            gaps.append(0)
            last_done = row["period_start"]
        elif last_done is None:
            gaps.append(i)
        else:
            gaps.append(i - spine.index[spine["period_start"] == last_done][0])
    spine["periods_since_last_completion"] = gaps

    # day_of_week retained for streak-risk model (still useful for daily habits)
    spine["day_of_week"] = pd.to_datetime(spine["period_start"]).dt.weekday

    # ── 5. Full-tier extras ───────────────────────────────────────────────
    if tier == "full":
        spine["trend_slope_short"] = _rolling_slope(spine["completion_rate_short"], n_periods_short)
        spine["trend_slope_long"] = _rolling_slope(spine["completion_rate_short"], n_periods_long)
        spine["value_variance"] = (
            spine["period_total"].rolling(n_periods_short, min_periods=1).var().fillna(0)
        )
        if effective_threshold is not None:
            spine["goal_distance"] = effective_threshold - spine["period_total"]
        else:
            spine["goal_distance"] = 0.0

    return spine.reset_index(drop=True)


def _rolling_slope(series: pd.Series, window: int) -> pd.Series:
    """Compute rolling linear regression slope over a window."""
    slopes = []
    for i in range(len(series)):
        if i < window - 1:
            slopes.append(0.0)
            continue
        y = series.iloc[i - window + 1: i + 1].values
        x = np.arange(window, dtype=float)
        if np.std(y) == 0:
            slopes.append(0.0)
        else:
            slopes.append(float(np.polyfit(x, y, 1)[0]))
    return pd.Series(slopes, index=series.index)


def get_logging_hours(logs_df: pd.DataFrame) -> list[int]:
    """Extract the hour-of-day from each log's created_at timestamp."""
    if logs_df.empty:
        return []
    hours = pd.to_datetime(logs_df["created_at"], format='ISO8601').dt.hour.tolist()
    return [int(h) for h in hours]
