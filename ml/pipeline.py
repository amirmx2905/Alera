"""ML predictions pipeline — main entry point.

Data flow:
    habits_log  ──→  metrics  ──→  ML pipeline  ──→  predictions
                                        │
                               habits_log (only for best_reminder KDE)

The pipeline reads pre-computed daily_total metrics instead of raw logs so
that all feature values are consistent with what the user sees in the
dashboard. Raw logs are fetched only for best_reminder, which needs
individual log timestamps (hour-of-day) that are not stored in metrics.

Usage:
    python pipeline.py              # uses env vars
    python pipeline.py --dry-run    # prints what would be written without upserting
"""

import argparse
import json
import os
import sys
from datetime import date

import pandas as pd
from dotenv import load_dotenv
from supabase import create_client, Client

from maturity import check_maturity
from features import build_feature_matrix
from models import (
    predict_streak_risk,
    predict_trajectory,
    predict_goal_eta,
    predict_best_reminder,
)

load_dotenv()


def get_client() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.")
        sys.exit(1)
    return create_client(url, key)


def fetch_all_profiles(client: Client) -> list[dict]:
    resp = client.table("profiles").select("id").execute()
    return resp.data or []


def fetch_active_habits(client: Client, profile_id: str) -> list[dict]:
    resp = (
        client.table("habits")
        .select("id, type, created_at")
        .eq("profile_id", profile_id)
        .eq("status", "active")
        .execute()
    )
    return resp.data or []


def fetch_daily_totals(client: Client, habit_id: str, profile_id: str) -> pd.DataFrame:
    """Fetch pre-computed daily totals from the metrics table.

    Returns a DataFrame with columns [date, value] where date is the logical
    date (already CDMX-adjusted by calculate-metrics) and value is the
    daily_total. Only rows where the user actually logged exist — missing
    dates imply zero activity and are filled in by build_feature_matrix.
    """
    resp = (
        client.table("metrics")
        .select("date, value")
        .eq("habit_id", habit_id)
        .eq("profile_id", profile_id)
        .eq("metric_type", "daily_total")
        .eq("granularity", "daily")
        .order("date", desc=False)
        .execute()
    )
    if not resp.data:
        return pd.DataFrame()
    return pd.DataFrame(resp.data)


def fetch_raw_logs(client: Client, habit_id: str, profile_id: str) -> pd.DataFrame:
    """Fetch raw log timestamps — used only by best_reminder.

    The KDE model needs the hour-of-day from each individual log entry to
    find peak logging times. This data is not available in the metrics table.
    """
    resp = (
        client.table("habits_log")
        .select("created_at")
        .eq("habit_id", habit_id)
        .eq("profile_id", profile_id)
        .order("created_at", desc=False)
        .execute()
    )
    if not resp.data:
        return pd.DataFrame()
    return pd.DataFrame(resp.data)


def fetch_goal(client: Client, habit_id: str) -> dict | None:
    resp = (
        client.table("user_goals")
        .select("goal_type, target_value")
        .eq("habit_id", habit_id)
        .limit(1)
        .execute()
    )
    if resp.data:
        return resp.data[0]
    return None


def upsert_prediction(
    client: Client,
    profile_id: str,
    habit_id: str,
    prediction_type: str,
    value: dict,
    metadata: dict | None = None,
    dry_run: bool = False,
) -> None:
    row = {
        "profile_id": profile_id,
        "habit_id": habit_id,
        "prediction_type": prediction_type,
        "date": str(date.today()),
        "value": value,
        "metadata": metadata,
    }
    if dry_run:
        print(f"  [dry-run] {prediction_type}: {json.dumps(value)}")
        return

    client.table("predictions").upsert(
        row,
        on_conflict="profile_id,habit_id,prediction_type,date",
    ).execute()


def process_habit(
    client: Client,
    profile_id: str,
    habit: dict,
    dry_run: bool = False,
) -> str:
    """Process a single habit. Returns the tier string."""
    habit_id = habit["id"]
    habit_type = habit["type"]
    habit_created_at = habit["created_at"]

    daily_totals_df = fetch_daily_totals(client, habit_id, profile_id)

    # Fetch goal before maturity check so goal_type can inform period counting
    # (logged-period thresholds differ between daily / weekly / monthly habits).
    goal = fetch_goal(client, habit_id)
    goal_target = float(goal["target_value"]) if goal else None
    goal_type = goal["goal_type"] if goal else "daily"

    tier, calendar_days, logged_periods = check_maturity(daily_totals_df, habit_created_at, goal_type)

    # Locked habits: not enough data, skip entirely
    if tier == "locked":
        return tier

    days_to_full = max(0, 30 - calendar_days)
    metadata = {
        "tier": tier,
        "calendar_days": calendar_days,
        "logged_periods": logged_periods,
        "days_to_full": days_to_full,
    }

    # Build features from pre-computed daily totals
    features_df = build_feature_matrix(daily_totals_df, goal_target, goal_type, tier, habit_created_at)
    if features_df.empty:
        return tier

    # Streak risk (basic + full)
    risk = predict_streak_risk(features_df, tier)
    upsert_prediction(client, profile_id, habit_id, "streak_risk", risk, metadata, dry_run)

    # Trajectory (basic + full)
    traj = predict_trajectory(features_df, tier, goal_type, goal_target, habit_type)
    upsert_prediction(client, profile_id, habit_id, "trajectory", traj, metadata, dry_run)

    # Full-tier only predictions
    if tier == "full":
        if goal_target:
            eta = predict_goal_eta(features_df, goal_target, goal_type, habit_type)
            upsert_prediction(client, profile_id, habit_id, "goal_eta", eta, metadata, dry_run)

        # best_reminder needs raw log timestamps — fetch from habits_log
        raw_logs_df = fetch_raw_logs(client, habit_id, profile_id)
        reminder = predict_best_reminder(raw_logs_df)
        upsert_prediction(client, profile_id, habit_id, "best_reminder", reminder, metadata, dry_run)

    return tier


def main():
    parser = argparse.ArgumentParser(description="Alera ML Predictions Pipeline")
    parser.add_argument("--dry-run", action="store_true", help="Print predictions without writing to DB")
    parser.add_argument("--profile-id", type=str, help="Process only a specific profile")
    args = parser.parse_args()

    client = get_client()
    today = date.today()

    print(f"=== Alera ML Pipeline — {today} ===")

    if args.profile_id:
        profiles = [{"id": args.profile_id}]
    else:
        profiles = fetch_all_profiles(client)

    print(f"Profiles to process: {len(profiles)}")

    stats = {"profiles": 0, "habits": 0, "locked": 0, "basic": 0, "full": 0, "errors": 0}

    for profile in profiles:
        profile_id = profile["id"]
        habits = fetch_active_habits(client, profile_id)

        if not habits:
            continue

        stats["profiles"] += 1
        print(f"\nProfile {profile_id}: {len(habits)} active habit(s)")

        for habit in habits:
            try:
                tier = process_habit(client, profile_id, habit, dry_run=args.dry_run)
                stats["habits"] += 1
                stats[tier] += 1
                print(f"  Habit {habit['id']}: {tier}")
            except Exception as e:
                stats["errors"] += 1
                print(f"  ERROR on habit {habit['id']}: {e}")

    print(f"\n=== Summary ===")
    print(f"Profiles: {stats['profiles']}")
    print(f"Habits:   {stats['habits']} (locked={stats['locked']}, basic={stats['basic']}, full={stats['full']})")
    print(f"Errors:   {stats['errors']}")

    if stats["errors"] > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
