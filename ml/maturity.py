"""Data maturity checker for habit prediction unlock tiers."""

from datetime import date

import pandas as pd


def check_maturity(logs_df: pd.DataFrame, habit_created_at: str) -> tuple[str, int]:
    """Check how many calendar days of data a habit has and return the unlock tier.

    Counts ALL days from the habit's creation to today, including days
    with zero activity — those are still valid data points for the model.

    Args:
        logs_df: DataFrame of habits_log rows (can be empty).
        habit_created_at: ISO timestamp of when the habit was created.

    Returns:
        (tier, total_days) where tier is 'locked', 'basic', or 'full'.
    """
    created = pd.to_datetime(habit_created_at).date()
    total_days = (date.today() - created).days + 1  # inclusive

    if total_days < 14:
        return "locked", total_days
    elif total_days < 30:
        return "basic", total_days
    else:
        return "full", total_days
