"""
cairn/core/utils.py

Shared utility functions — math, normalization, similarity.
No dependencies on other cairn modules (safe to import anywhere).
"""

import numpy as np
from typing import Optional


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """
    Cosine similarity between two vectors.
    Returns 0.0 if either vector is zero.
    """
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a < 1e-9 or norm_b < 1e-9:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


def ema_update(
    current: np.ndarray,
    new_value: np.ndarray,
    alpha: float,
    confidence_weight: float = 1.0,
) -> np.ndarray:
    """
    Exponential moving average update.

    new_state = α * weight * new_value + (1 - α * weight) * current

    confidence_weight < 1.0 for early entries (persona not yet established).
    This makes early entries contribute less to the long-term state.
    """
    effective_alpha = alpha * confidence_weight
    return effective_alpha * new_value + (1.0 - effective_alpha) * current


def normalize_to_unit(v: np.ndarray) -> np.ndarray:
    """L2 normalize a vector. Returns zero vector if input is zero."""
    norm = np.linalg.norm(v)
    return v / (norm + 1e-9)


def per_user_normalize(
    raw_features: np.ndarray,
    mean: np.ndarray,
    std: np.ndarray,
) -> np.ndarray:
    """
    Normalize features against the user's own historical baseline.
    This is the key step that makes acoustic features meaningful —
    a naturally fast speaker won't look anxious compared to population norms.
    """
    return (raw_features - mean) / (std + 1e-9)


def update_running_stats(
    mean: np.ndarray,
    std: np.ndarray,
    n: int,
    new_value: np.ndarray,
) -> tuple[np.ndarray, np.ndarray, int]:
    """
    Welford's online algorithm for running mean and std.
    Numerically stable, single-pass, no need to store history.

    Returns: (new_mean, new_std, new_n)
    """
    n_new = n + 1
    delta = new_value - mean
    new_mean = mean + delta / n_new
    delta2 = new_value - new_mean

    if n == 0:
        new_var = np.zeros_like(mean)
    else:
        # Running sum of squared deviations (M2)
        # We approximate here — for exact Welford we'd store M2 separately
        # This is sufficient for our use case
        old_var = std**2
        new_var = old_var + (delta * delta2 - old_var) / n_new

    new_std = np.sqrt(np.maximum(new_var, 1e-9))
    return new_mean, new_std, n_new


def softmax(x: np.ndarray) -> np.ndarray:
    """Numerically stable softmax."""
    e = np.exp(x - x.max())
    return e / e.sum()


def clip_normalize(value: float, min_val: float, max_val: float) -> float:
    """Normalize a scalar to [0, 1] given its expected range."""
    return float(np.clip((value - min_val) / (max_val - min_val + 1e-9), 0.0, 1.0))


def encode_hour_of_day(hour: int) -> float:
    """
    Encode hour of day as a single value that captures:
    - late night (0–4): high weight (clinically significant)
    - morning (6–10): low weight
    - evening (20–23): moderate weight
    Returns a 0–1 value where higher = more concerning time.
    """
    # Late night / early morning gets highest weight
    if 0 <= hour <= 4:
        return 1.0
    elif 20 <= hour <= 23:
        return 0.7
    elif 5 <= hour <= 9:
        return 0.2
    else:
        return 0.4


def encode_memo_length(seconds: float) -> float:
    """
    Normalize memo length to [0, 1].
    Very short (<15s) and very long (>120s) both carry signal.
    Returns raw normalized value — caller interprets direction.
    """
    return clip_normalize(seconds, min_val=5.0, max_val=180.0)
