"""Streak risk prediction.

Basic tier: Logistic Regression on 5 features.
Full tier:  Random Forest on 8 features (adds trend slopes + value variance).
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression

# ---------------------------------------------------------------------------
# Feature sets
# ---------------------------------------------------------------------------

_BASIC_FEATURES = [
    "day_of_week",
    "completion_rate_short",
    "completion_rate_long",
    "current_streak",
    "periods_since_last_completion",
]

_FULL_FEATURES = _BASIC_FEATURES + [
    "trend_slope_short",
    "trend_slope_long",
    "value_variance",
]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def predict_streak_risk(features_df: pd.DataFrame, tier: str) -> dict:
    """Predict the probability that the user will skip the next period.

    Returns a dict suitable for the predictions.value JSONB column.
    """
    df = features_df.copy()

    # Target: did the user NOT complete the *next* period?
    df.loc[:, "target"] = (df["completed"].shift(-1) == 0).astype(int)
    df = df.dropna(subset=["target"])

    if len(df) < 5:
        return {"risk_score": 0.5, "risk_label": "medium"}

    cols = _BASIC_FEATURES if tier == "basic" else _FULL_FEATURES
    cols = [c for c in cols if c in df.columns]

    X = df[cols].values
    y = df["target"].values.astype(int)

    if len(np.unique(y)) < 2:
        # Only one class present — cannot train a classifier
        risk = 0.8 if y[0] == 1 else 0.2
        return _format_risk(risk, tier, cols, None)

    if tier == "basic":
        model = LogisticRegression(max_iter=200, solver="lbfgs")
    else:
        model = RandomForestClassifier(n_estimators=50, max_depth=5, random_state=42)

    model.fit(X, y)

    last_row = features_df[cols].iloc[[-1]].values
    risk_score = float(model.predict_proba(last_row)[0][1])

    return _format_risk(risk_score, tier, cols, model)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _format_risk(risk_score: float, tier: str, cols: list, model) -> dict:
    if risk_score < 0.3:
        label = "low"
    elif risk_score < 0.6:
        label = "medium"
    else:
        label = "high"

    result: dict = {"risk_score": round(risk_score, 3), "risk_label": label}

    if tier == "full" and model is not None and hasattr(model, "feature_importances_"):
        importances = model.feature_importances_
        top_idx = np.argsort(importances)[::-1][:3]
        result["top_factors"] = [cols[i] for i in top_idx]

    return result
