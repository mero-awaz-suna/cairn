"""
cairn/core/config.py

All tunable parameters in one place.
Change here, affects the entire system.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class EMAConfig:
    """
    Exponential moving average decay rates.
    Higher alpha = reacts faster to new entries (shorter memory).
    """

    acoustic_short: float = 0.50  # half-life ≈ 2 entries
    acoustic_long: float = 0.15  # half-life ≈ 6 entries
    linguistic_short: float = 0.50
    linguistic_long: float = 0.15
    behavioral: float = 0.30  # medium speed


@dataclass(frozen=True)
class StageConfig:
    """
    Thresholds for rule-based stage classification.
    These are starting values — tune based on real user feedback.
    """

    # Score thresholds
    storm_threshold: float = 0.65  # stress_score above this → In the storm
    recovery_threshold: float = 0.60  # recovery_score above this → Through it

    # Inertia settings
    confidence_reinforce: float = 0.20  # added when stage is confirmed
    confidence_erode: float = 0.30  # subtracted when stage contradicts
    confidence_reset: float = 0.50  # value after a stage transition

    # Trajectory gate — must be improving to reach "Through it"
    require_improving_for_recovery: bool = True


@dataclass(frozen=True)
class MatchingConfig:
    """
    Thresholds for circle formation.
    """

    # Minimum similarity to be in the same match pool
    min_identity_similarity: float = 0.55
    min_stressor_similarity: float = 0.40

    # Trajectory safety gate
    # Anyone with trajectory_stress above this is excluded from circles
    # (they need 1:1 crisis support, not a group)
    max_trajectory_stress_for_circle: float = 0.35

    # Circle size
    min_circle_size: int = 3
    max_circle_size: int = 6

    # Scoring weights for ranking candidates within a stage bucket
    stressor_similarity_weight: float = 0.50
    entry_count_weight: float = 0.30
    trajectory_recovery_weight: float = 0.20

    # Max entry count for normalization in scoring
    max_entry_count_norm: int = 30


@dataclass(frozen=True)
class ProjectionConfig:
    """
    wav2vec2 → persona space projection settings.
    """

    wav2vec_dim: int = 768
    projected_dim: int = 64  # Dims.ACOUSTIC

    # Whether to use PCA (no training needed) or learned MLP projection
    # Use "pca" until you have labeled user data, then switch to "mlp"
    projection_type: str = "pca"  # "pca" | "mlp"


@dataclass(frozen=True)
class CairnConfig:
    """Master config — single instance used throughout the system."""

    ema: EMAConfig = EMAConfig()
    stage: StageConfig = StageConfig()
    matching: MatchingConfig = MatchingConfig()
    projection: ProjectionConfig = ProjectionConfig()

    # LLM model for linguistic extraction
    llm_model: str = "claude-sonnet-4-20250514"
    llm_max_tokens: int = 1000


# Singleton — import this everywhere
CONFIG = CairnConfig()
