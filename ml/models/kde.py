"""Best reminder prediction.

Uses Kernel Density Estimation (Gaussian kernel) on the user's historical
logging hours to find the optimal time of day to send a reminder.
"""

import numpy as np
import pandas as pd
from sklearn.neighbors import KernelDensity

from features import get_logging_hours


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def predict_best_reminder(logs_df: pd.DataFrame) -> dict:
    """Find the best hour of day to remind the user based on logging patterns."""
    hours = get_logging_hours(logs_df)

    if not hours:
        return {"best_hour": 9, "best_period": "morning", "distribution": [0.0] * 24}

    hour_array = np.array(hours, dtype=float).reshape(-1, 1)
    kde = KernelDensity(kernel="gaussian", bandwidth=1.5)
    kde.fit(hour_array)

    x_range = np.arange(24).reshape(-1, 1)
    log_density = kde.score_samples(x_range)
    density = np.exp(log_density)
    density = density / density.sum()  # Normalize to probabilities

    best_hour = int(np.argmax(density))
    distribution = [round(float(d), 4) for d in density]

    return {
        "best_hour": best_hour,
        "best_period": _hour_to_period(best_hour),
        "distribution": distribution,
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _hour_to_period(hour: int) -> str:
    if 5 <= hour <= 11:
        return "morning"
    elif 12 <= hour <= 16:
        return "afternoon"
    elif 17 <= hour <= 20:
        return "evening"
    return "night"
