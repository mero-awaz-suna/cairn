"""
cairn/core/models.py

All data models for the Cairn persona system.
These are pure dataclasses — no business logic here.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional
from enum import Enum
import numpy as np
import time

from persona.core.config import CONFIG


# ─────────────────────────────────────────────
# Enums
# ─────────────────────────────────────────────


class Stage(str, Enum):
    """
    The three recovery stages used for circle composition.
    Derived from persona state — never stored directly as user input.
    """

    IN_THE_STORM = "In the storm"
    FINDING_GROUND = "Finding ground"
    THROUGH_IT = "Through it"


class StressorType(str, Enum):
    WORK_PRESSURE = "work_pressure"
    CAREER_UNCERTAINTY = "career_uncertainty"
    RELATIONSHIPS = "relationships"
    IDENTITY = "identity"
    FINANCES = "finances"
    HEALTH = "health"
    ISOLATION = "isolation"
    LOSS = "loss"


class OccupationCategory(str, Enum):
    STUDENT = "student"
    EARLY_CAREER = "early_career"
    MID_CAREER = "mid_career"
    LEADERSHIP = "leadership"
    FREELANCE = "freelance"
    OTHER = "other"


class AgeGroup(str, Enum):
    EARLY_20S = "early_20s"  # 18–23
    LATE_20S = "late_20s"  # 24–29
    THIRTIES = "thirties"  # 30–39
    FORTIES = "forties"  # 40–49
    OLDER = "older"  # 50+


# ─────────────────────────────────────────────
# Vector dimensions (single source of truth)
# ─────────────────────────────────────────────


class Dims:
    ACOUSTIC = 64  # wav2vec2 → projected
    LINGUISTIC = 16  # LLM-extracted scores
    IDENTITY = 16  # demographic embeddings
    BEHAVIORAL = 4  # behavioral scalars
    STRESSOR = 8  # one per StressorType
    TOTAL = 100  # ACOUSTIC + LINGUISTIC + IDENTITY + BEHAVIORAL


# ─────────────────────────────────────────────
# Raw entry (one voice memo, pre-processing)
# ─────────────────────────────────────────────


@dataclass
class RawEntry:
    """
    Everything Cairn receives for a single voice memo submission.
    This is the input boundary of the system.
    """

    user_id: str
    audio_path: str  # path to audio file (wav/mp3)
    transcript: str  # whisper output or manual text
    timestamp: float = field(default_factory=time.time)
    day_number: int = 1  # sequential entry number for this user


# ─────────────────────────────────────────────
# Extracted features (one entry, post-processing)
# ─────────────────────────────────────────────


@dataclass
class AcousticFeatures:
    """
    Raw output from wav2vec2 feature extractor.
    768-dim before projection, stored pre-projection for flexibility.
    """

    embedding: np.ndarray  # shape (768,) — wav2vec2 mean-pooled output
    duration_sec: float  # memo length in seconds

    def __post_init__(self):
        assert self.embedding.shape == (
            768,
        ), f"Expected (768,), got {self.embedding.shape}"


@dataclass
class LinguisticFeatures:
    """
    Structured scores extracted by the LLM from the transcript.
    All values normalized to [0, 1] unless noted.
    """

    # Emotional dimensions
    valence: float  # 0=very negative, 1=very positive
    arousal: float  # 0=very low energy, 1=very high energy

    # Psychological markers
    agency_score: float  # 0=passive/victim language, 1=active/ownership
    distortion_score: float  # 0=clear thinking, 1=heavy cognitive distortions
    coping_score: float  # 0=no coping, 1=active healthy coping

    # Temporal orientation (must sum to 1.0)
    past_orientation: float  # rumination
    present_orientation: float  # groundedness
    future_orientation: float  # anticipation (anxious or hopeful)

    # Stressor distribution (must sum to 1.0)
    stressor_dist: np.ndarray  # shape (8,) — one per StressorType

    # Urgency signals
    urgency_signal: float  # 0=calm, 1=acute crisis signal in language
    help_seeking_signal: float  # 0=none, 1=actively asking for support

    def __post_init__(self):
        assert self.stressor_dist.shape == (
            8,
        ), f"Expected (8,), got {self.stressor_dist.shape}"
        # Soft assertions — log warnings, don't crash
        if not (0.95 <= self.stressor_dist.sum() <= 1.05):
            # Renormalize silently
            self.stressor_dist = self.stressor_dist / (self.stressor_dist.sum() + 1e-9)


@dataclass
class EntryFeatures:
    """
    All features extracted from one voice memo, combined.
    This is what flows into the PersonaEngine for an EMA update.
    """

    user_id: str
    timestamp: float
    day_number: int

    acoustic: AcousticFeatures
    linguistic: LinguisticFeatures

    # Behavioral signals (computed at extraction time)
    memo_length_seconds: float
    hour_of_day: int  # 0–23, recording time

    @property
    def is_crisis_signal(self) -> bool:
        """Fast check used by safety layer."""
        return (
            self.linguistic.urgency_signal > 0.75
            or self.linguistic.distortion_score > 0.85
        )


# ─────────────────────────────────────────────
# User demographics (identity block)
# ─────────────────────────────────────────────


@dataclass
class UserDemographics:
    """
    Declared at onboarding. Rarely changes.
    Used to build the identity vector.
    """

    age_group: AgeGroup
    occupation: OccupationCategory
    industry: str  # free text, clustered downstream
    language_code: str  # ISO 639-1 e.g. "en", "ne", "hi"
    region_code: str  # ISO 3166-1 e.g. "NP", "US", "IN"
    living_situation: str  # "alone", "partner", "family", "roommates"


# ─────────────────────────────────────────────
# The persona — the living user representation
# ─────────────────────────────────────────────


@dataclass
class PersonaVectors:
    """
    The core of the persona system.
    Two EMA speeds per modality: short (reacts fast) and long (stable baseline).
    """

    # Acoustic block — wav2vec2 projected to 64 dims
    acoustic_short: np.ndarray = field(default_factory=lambda: np.zeros(Dims.ACOUSTIC))
    acoustic_long: np.ndarray = field(default_factory=lambda: np.zeros(Dims.ACOUSTIC))

    # Linguistic block — LLM-extracted scores
    linguistic_short: np.ndarray = field(
        default_factory=lambda: np.zeros(Dims.LINGUISTIC)
    )
    linguistic_long: np.ndarray = field(
        default_factory=lambda: np.zeros(Dims.LINGUISTIC)
    )

    # Identity block — demographic embeddings (changes rarely)
    identity: np.ndarray = field(default_factory=lambda: np.zeros(Dims.IDENTITY))

    # Behavioral block — usage pattern signals
    behavioral: np.ndarray = field(default_factory=lambda: np.zeros(Dims.BEHAVIORAL))

    @property
    def trajectory(self) -> np.ndarray:
        """
        Direction of change: short - long.
        Positive = getting worse (on stress dims) or better (on recovery dims).
        Caller must interpret direction based on what each dim means.
        """
        acoustic_traj = self.acoustic_short - self.acoustic_long
        linguistic_traj = self.linguistic_short - self.linguistic_long
        return np.concatenate([acoustic_traj, linguistic_traj])

    @property
    def full_vector(self) -> np.ndarray:
        """
        Concatenated 100-dim vector for similarity computation.
        Uses long-term state (stable, not reactive to single bad day).
        """
        return np.concatenate(
            [
                self.acoustic_long,
                self.linguistic_long,
                self.identity,
                self.behavioral,
            ]
        )

    @property
    def state_vector(self) -> np.ndarray:
        """
        Short-term state for stage classification.
        Uses short-term (reactive to recent entries).
        """
        return np.concatenate(
            [
                self.acoustic_short,
                self.linguistic_short,
            ]
        )


RAW_FEATURE_DIM = 20  # keep in sync with _pack_raw_features() in persona.py


@dataclass
class PersonaBaseline:
    """
    Per-user normalization statistics.
    Built up from the user's own entry history — not population norms.

    Tracks running mean and std of the 20-dim raw feature vector
    (acoustic summary + linguistic scalars + stressor dist + urgency signals)
    using Welford's online algorithm so we never need to store entry history.
    """

    feature_mean: np.ndarray = field(
        default_factory=lambda: np.zeros(RAW_FEATURE_DIM, dtype=np.float32)
    )
    feature_std: np.ndarray = field(
        default_factory=lambda: np.ones(RAW_FEATURE_DIM, dtype=np.float32)
    )
    n_samples: int = 0  # number of entries seen so far

    @property
    def confidence_weight(self) -> float:
        """
        How much to trust this persona. Approaches 1.0 as entry count grows.

        Uses exponential saturation with τ=5 (time constant = 5 entries):
            weight ≈ 0.18 at entry 1
            weight ≈ 0.33 at entry 2
            weight ≈ 0.63 at entry 5
            weight ≈ 0.86 at entry 10
            weight ≈ 0.98 at entry 20

        This dampens the influence of each new entry on the long-term EMA
        until the persona has enough history to be trusted. Early entries
        contribute less — a user's 3rd memo shouldn't permanently define
        their acoustic baseline.
        """
        return float(1.0 - np.exp(-self.n_samples / 5.0))


@dataclass
class StageState:
    """
    Stage with inertia — doesn't flip on a single bad day.
    """

    current: Stage = Stage.FINDING_GROUND
    confidence: float = 0.5  # 0–1, how established this stage is

    def update(self, new_stage: Stage) -> None:
        cfg = CONFIG.stage

        if new_stage == self.current:
            self.confidence += cfg.confidence_reinforce
        else:
            self.confidence -= cfg.confidence_erode
            if self.confidence <= 0.0:
                self.current = new_stage
                self.confidence = cfg.confidence_reset

        self.confidence = float(np.clip(self.confidence, 0.0, 1.0))


@dataclass
class UserPersona:
    """
    The complete persona for one user.
    This is what gets stored in the database and queried at match time.
    """

    user_id: str
    demographics: UserDemographics

    vectors: PersonaVectors = field(default_factory=PersonaVectors)
    baseline: PersonaBaseline = field(default_factory=PersonaBaseline)
    stage: StageState = field(default_factory=StageState)

    # Derived fields — recomputed after each update
    stressor_dist: np.ndarray = field(default_factory=lambda: np.zeros(Dims.STRESSOR))
    cluster_id: Optional[str] = None

    # Metadata
    entry_count: int = 0
    last_entry_time: float = 0.0
    is_available: bool = False  # currently online and not in a session

    @property
    def trajectory_stress(self) -> float:
        """
        Scalar stress trajectory. Positive = getting worse.
        Derived from linguistic trajectory on key stress dims.
        """
        traj = self.vectors.trajectory
        # linguistic trajectory starts at index Dims.ACOUSTIC in trajectory vector
        ling_traj = traj[Dims.ACOUSTIC :]
        # dim 0=valence, 3=distortion — stress goes up when valence drops, distortion rises
        valence_traj = ling_traj[0]  # negative = improving
        distortion_traj = ling_traj[3]  # positive = worsening
        return -valence_traj * 0.5 + distortion_traj * 0.5

    @property
    def trajectory_recovery(self) -> float:
        """
        Scalar recovery trajectory. Positive = improving.
        """
        traj = self.vectors.trajectory
        ling_traj = traj[Dims.ACOUSTIC :]
        agency_traj = ling_traj[2]  # dim 2 = agency
        coping_traj = ling_traj[4]  # dim 4 = coping
        return agency_traj * 0.5 + coping_traj * 0.5


# ─────────────────────────────────────────────
# Circle (the output of matching)
# ─────────────────────────────────────────────


@dataclass
class CircleMember:
    user_id: str
    stage: Stage
    is_synthetic: bool = False  # True = memory wall echo, not a live person


@dataclass
class Circle:
    """
    A matched group, ready for a session.
    4–6 members, stage-balanced.
    """

    circle_id: str
    members: list[CircleMember]
    requester_id: str
    requester_stressor_dist: Optional[np.ndarray] = None
    created_at: float = field(default_factory=time.time)

    @property
    def has_live_through_it(self) -> bool:
        return any(
            m.stage == Stage.THROUGH_IT and not m.is_synthetic for m in self.members
        )

    @property
    def size(self) -> int:
        return len(self.members)

    def stage_summary(self) -> dict:
        counts = {s: 0 for s in Stage}
        for m in self.members:
            counts[m.stage] += 1
        return {s.value: n for s, n in counts.items()}
