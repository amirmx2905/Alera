"""Data maturity checker for habit prediction unlock tiers.

Operates on pre-computed daily_totals_df (from the metrics table) rather than
raw habits_log rows.  The metrics table date column already reflects the
logical (CDMX-adjusted) date, so no timezone conversion is needed here.
"""

from datetime import date, timedelta

import pandas as pd


# ---------------------------------------------------------------------------
# Logged-period counter
# ---------------------------------------------------------------------------

def _count_logged_periods(daily_totals_df: pd.DataFrame, goal_type: str) -> int:
    """Count distinct periods that have at least one metrics row.

    Each row in daily_totals_df represents a day where the user logged
    something (calculate-metrics only writes daily_total when value > 0),
    so counting distinct periods from these dates gives the same result as
    counting from raw logs — with no timezone conversion required.
    """
    if daily_totals_df.empty:
        return 0

    log_dates = pd.to_datetime(daily_totals_df["date"]).dt.date

    if goal_type == "daily":
        return int(log_dates.nunique())

    if goal_type == "weekly":
        # Monday-anchored weeks — same as features._period_start
        weeks: set[date] = set()
        for d in log_dates:
            weeks.add(d - timedelta(days=d.weekday()))
        return len(weeks)

    # monthly
    months: set[tuple[int, int]] = set()
    for d in log_dates:
        months.add((d.year, d.month))
    return len(months)


# ---------------------------------------------------------------------------
# Thresholds
# ---------------------------------------------------------------------------

# Minimum logged periods to unlock each tier, per goal_type.
# A "logged period" is a day/week/month that has at least one log entry —
# it ensures models have enough real signal rows, not just calendar zeros.
_MIN_LOGGED_BASIC: dict[str, int] = {"daily": 5, "weekly": 4, "monthly": 2}
_MIN_LOGGED_FULL: dict[str, int]  = {"daily": 12, "weekly": 8, "monthly": 4}

_MIN_CALENDAR_BASIC = 14
_MIN_CALENDAR_FULL  = 30


def check_maturity(
    daily_totals_df: pd.DataFrame,
    habit_created_at: str,
    goal_type: str = "daily",
) -> tuple[str, int, int]:
    """Check data maturity using dual gating: calendar days AND logged periods.

    A habit must meet BOTH thresholds to advance to the next tier.
    This prevents models from training on mostly-zero feature matrices
    when the user rarely logs (e.g. a habit created 30 days ago with 2 entries
    would have previously received 'full' tier with an essentially useless model).

    Args:
        daily_totals_df:  DataFrame from metrics table (columns: date, value).
                          Can be empty (treated as zero activity).
        habit_created_at: ISO timestamp of when the habit was created.
        goal_type:        'daily' | 'weekly' | 'monthly' — controls period counting.

    Returns:
        (tier, calendar_days, logged_periods)
        - tier:           'locked', 'basic', or 'full'
        - calendar_days:  days elapsed since habit creation (inclusive)
        - logged_periods: distinct periods that have at least one metrics row
    """
    created = pd.to_datetime(habit_created_at, format="ISO8601").date()
    calendar_days = (date.today() - created).days + 1
    logged_periods = _count_logged_periods(daily_totals_df, goal_type)

    min_basic = _MIN_LOGGED_BASIC.get(goal_type, 5)
    min_full  = _MIN_LOGGED_FULL.get(goal_type, 12)

    if calendar_days < _MIN_CALENDAR_BASIC or logged_periods < min_basic:
        return "locked", calendar_days, logged_periods
    elif calendar_days < _MIN_CALENDAR_FULL or logged_periods < min_full:
        return "basic", calendar_days, logged_periods
    else:
        return "full", calendar_days, logged_periods
