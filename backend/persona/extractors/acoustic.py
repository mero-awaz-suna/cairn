"""
cairn/extractors/acoustic.py

Acoustic feature extractor using wav2vec2-base as a frozen feature backbone.

Architecture (from the paper):
    Raw audio → CNN Feature Encoder (frozen) → Transformer → Mean Pool → 768-dim embedding
                                                                              ↓
                                                              PCA/MLP projection → 64-dim

Key decisions:
    - Feature encoder is FROZEN (as paper recommends — preserves pretrained knowledge,
      reduces overfitting, actually improves accuracy on small datasets)
    - Transformer layers are used as-is (not fine-tuned — we want general speech
      representations, not depression-classification features)
    - Mean pooling over time dimension (paper shows this beats max pooling)
    - Projection to 64 dims happens here, keeping the persona vector compact

Usage:
    extractor = AcousticExtractor.load()
    features = extractor.extract("path/to/memo.wav")
    # features.embedding → shape (768,) — raw wav2vec2 output
    # extractor.project(features.embedding) → shape (64,) — for persona vector
"""

from __future__ import annotations
import numpy as np
import os
import sys
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from persona.core.models import AcousticFeatures
from persona.core.config import CONFIG


# ─────────────────────────────────────────────
# Projection layer (wav2vec 768 → persona 64)
# ─────────────────────────────────────────────


class PCAProjection:
    """
    Dimensionality reduction: 768 → 64 dims using PCA.

    Use this until you have labeled user data.
    No training required — fit on any speech embeddings
    (even random audio will give you a valid basis).

    Once you have persona labels from real users, replace
    this with MLPProjection (defined below).
    """

    def __init__(self, components: Optional[np.ndarray] = None):
        # components: shape (64, 768) — PCA basis vectors
        # None means not yet fitted — will use random projection as fallback
        self.components = components
        self.mean = None
        self.is_fitted = components is not None

    def fit(self, embeddings: np.ndarray) -> None:
        """
        Fit PCA on a batch of wav2vec2 embeddings.

        embeddings: shape (N, 768) where N is number of audio samples.
        You only need to do this once — save/load the components.

        In practice: collect ~100 voice memos from early users,
        run them through wav2vec2, fit PCA, save components.
        """
        from numpy.linalg import svd

        n_samples = embeddings.shape[0]
        target = CONFIG.projection.projected_dim  # 64

        self.mean = embeddings.mean(axis=0)  # (768,)
        centered = embeddings - self.mean

        # Economy SVD — only compute what we need
        _, _, Vt = svd(centered, full_matrices=False)
        # SVD returns min(N, D) components — pad with random orthogonal
        # directions if we have fewer samples than target dims
        n_components = Vt.shape[0]
        if n_components >= target:
            self.components = Vt[:target]  # (64, 768)
        else:
            # Pad with random directions orthogonal to existing components
            rng = np.random.RandomState(42)
            extra = target - n_components
            padding = rng.randn(extra, embeddings.shape[1]).astype(np.float32)
            # Orthogonalize padding against existing components via Gram-Schmidt
            for i in range(extra):
                v = padding[i]
                for basis in Vt:
                    v = v - np.dot(v, basis) * basis
                norm = np.linalg.norm(v)
                if norm > 1e-9:
                    padding[i] = v / norm
            self.components = np.vstack([Vt, padding[:extra]])  # (64, 768)

        self.is_fitted = True

    def project(self, embedding: np.ndarray) -> np.ndarray:
        """
        Project a single 768-dim embedding to 64 dims.
        embedding: shape (768,)
        returns:   shape (64,)
        """
        if not self.is_fitted:
            # Random projection as bootstrap fallback
            # Deterministic (seeded) so same audio → same projection
            rng = np.random.RandomState(42)
            R = rng.randn(
                CONFIG.projection.projected_dim, CONFIG.projection.wav2vec_dim
            ) / np.sqrt(CONFIG.projection.wav2vec_dim)
            return R @ embedding

        centered = embedding - (self.mean if self.mean is not None else 0)
        return self.components @ centered  # (64, 768) @ (768,) → (64,)

    def save(self, path: str) -> None:
        np.savez(path, components=self.components, mean=self.mean)

    @classmethod
    def load_from_file(cls, path: str) -> "PCAProjection":
        data = np.load(path)
        obj = cls(components=data["components"])
        obj.mean = data.get("mean", None)
        return obj


class MLPProjection:
    """
    Learned projection: 768 → 64 using a small 2-layer MLP.

    Use this once you have real user data with persona labels
    (stress scores, recovery scores from user feedback).

    Training signal: user-reported accuracy of stage labels,
    circle satisfaction ratings, session outcome surveys.

    Swap in by changing CONFIG.projection.projection_type = "mlp"
    and providing a trained weights file.
    """

    def __init__(self, weights_path: Optional[str] = None):
        self.W1 = None  # (256, 768)
        self.b1 = None  # (256,)
        self.W2 = None  # (64, 256)
        self.b2 = None  # (64,)
        self.is_fitted = False

        if weights_path and os.path.exists(weights_path):
            self._load(weights_path)

    def project(self, embedding: np.ndarray) -> np.ndarray:
        if not self.is_fitted:
            raise RuntimeError("MLPProjection not fitted. Use PCAProjection first.")
        # Layer 1: linear + GELU activation
        h = np.tanh(self.W1 @ embedding + self.b1)  # (256,)
        # Layer 2: linear
        return self.W2 @ h + self.b2  # (64,)

    def _load(self, path: str) -> None:
        data = np.load(path)
        self.W1, self.b1 = data["W1"], data["b1"]
        self.W2, self.b2 = data["W2"], data["b2"]
        self.is_fitted = True


# ─────────────────────────────────────────────
# Main extractor
# ─────────────────────────────────────────────


class AcousticExtractor:
    """
    Full acoustic feature extraction pipeline.

    On a real machine with transformers installed:
        extractor = AcousticExtractor.load(use_mock=False)

    In this environment (no network / no GPU):
        extractor = AcousticExtractor.load(use_mock=True)

    The interface is identical either way — swap the flag and nothing
    else in the system changes.
    """

    SAMPLE_RATE = 16_000  # wav2vec2 requires 16kHz audio

    def __init__(
        self,
        model=None,
        processor=None,
        projection: Optional[PCAProjection] = None,
        use_mock: bool = False,
    ):
        self._model = model
        self._processor = processor
        self._use_mock = use_mock
        self.projection = projection or PCAProjection()

    # ── Loading ──────────────────────────────

    @classmethod
    def load(
        cls,
        projection_path: Optional[str] = None,
        use_mock: bool = False,
    ) -> "AcousticExtractor":
        """
        Load the extractor.

        use_mock=False (production):
            Requires: pip install transformers torch torchaudio
            Downloads facebook/wav2vec2-base on first run (~360MB).

        use_mock=True (development / testing):
            No dependencies. Returns deterministic random embeddings.
            Use this to build and test the full pipeline before you
            have the model weights available.
        """
        projection = None
        if projection_path and os.path.exists(projection_path):
            projection = PCAProjection.load_from_file(projection_path)

        if use_mock:
            return cls(use_mock=True, projection=projection)

        # Production path — requires transformers + torch
        try:
            from transformers import Wav2Vec2Model, Wav2Vec2Processor
            import torch

            print("Loading wav2vec2-base...")
            processor = Wav2Vec2Processor.from_pretrained("facebook/wav2vec2-base")
            model = Wav2Vec2Model.from_pretrained("facebook/wav2vec2-base")

            # ── FREEZE the CNN feature encoder ──
            # This is the key finding from the paper:
            # frozen encoder + fine-tuned transformer = better accuracy
            # We go further: we freeze everything since we're using it
            # purely as a feature extractor, not fine-tuning for classification
            for param in model.feature_extractor.parameters():
                param.requires_grad = False

            model.eval()
            print("wav2vec2-base loaded and feature encoder frozen.")

            return cls(
                model=model, processor=processor, projection=projection, use_mock=False
            )

        except ImportError:
            raise ImportError(
                "transformers and torch are required for production use.\n"
                "Run: pip install transformers torch torchaudio\n"
                "Or use AcousticExtractor.load(use_mock=True) for development."
            )

    # ── Core extraction ───────────────────────

    def extract(self, audio_path: str) -> AcousticFeatures:
        """
        Extract acoustic features from a voice memo file.

        audio_path: path to audio file (wav, mp3, m4a)
                    Must be 16kHz mono — resample if needed.

        Returns AcousticFeatures with:
            .embedding    → (768,) wav2vec2 mean-pooled output
            .duration_sec → length of the audio in seconds
        """
        if self._use_mock:
            return self._mock_extract(audio_path)
        return self._real_extract(audio_path)

    def project(self, embedding: np.ndarray) -> np.ndarray:
        """
        Project 768-dim wav2vec2 embedding to 64-dim persona space.
        This is the value that flows into the EMA update.
        """
        projected = self.projection.project(embedding)
        # L2 normalize so different recordings are comparable
        norm = np.linalg.norm(projected)
        return projected / (norm + 1e-9)

    def extract_and_project(
        self, audio_path: str
    ) -> tuple[AcousticFeatures, np.ndarray]:
        """
        Convenience method: extract + project in one call.
        Returns (AcousticFeatures, projected_64dim_vector)
        """
        features = self.extract(audio_path)
        projected = self.project(features.embedding)
        return features, projected

    # ── Real implementation ────────────────────

    def _real_extract(self, audio_path: str) -> AcousticFeatures:
        """
        Production extraction using wav2vec2.

        Pipeline:
        1. Load audio at 16kHz
        2. Run through wav2vec2 processor (normalizes waveform)
        3. Forward pass through frozen encoder + transformer
        4. Mean-pool over time dimension → (768,)
        """
        import torch
        import torchaudio

        # Load and resample to 16kHz
        waveform, sample_rate = torchaudio.load(audio_path)
        if sample_rate != self.SAMPLE_RATE:
            resampler = torchaudio.transforms.Resample(sample_rate, self.SAMPLE_RATE)
            waveform = resampler(waveform)

        # Convert to mono if stereo
        if waveform.shape[0] > 1:
            waveform = waveform.mean(dim=0, keepdim=True)

        duration_sec = waveform.shape[1] / self.SAMPLE_RATE
        waveform_np = waveform.squeeze().numpy()

        # Processor: normalizes the waveform to zero mean, unit variance
        inputs = self._processor(
            waveform_np,
            sampling_rate=self.SAMPLE_RATE,
            return_tensors="pt",
            padding=True,
        )

        with torch.no_grad():
            outputs = self._model(**inputs)

        # outputs.last_hidden_state: (batch=1, time_steps, 768)
        # Mean pool over time dimension → (1, 768) → (768,)
        # Paper shows mean pooling outperforms max pooling for this domain
        hidden_states = outputs.last_hidden_state  # (1, T, 768)
        embedding = hidden_states.mean(dim=1)  # (1, 768)
        embedding_np = embedding.squeeze().numpy()  # (768,)

        return AcousticFeatures(
            embedding=embedding_np,
            duration_sec=duration_sec,
        )

    # ── Mock implementation ────────────────────

    def _mock_extract(self, audio_path: str) -> AcousticFeatures:
        """
        Deterministic mock for testing without model weights.

        Uses the audio path as a seed so:
        - Same file → same embedding (deterministic)
        - Different files → different embeddings
        - Embeddings are unit-normalized (realistic)

        To simulate different emotional states in tests,
        use paths like "test_stressed.wav", "test_calm.wav" —
        the hash of the path determines the embedding direction.
        """
        seed = hash(audio_path) % (2**31)
        rng = np.random.RandomState(seed)

        embedding = rng.randn(768).astype(np.float32)
        embedding /= np.linalg.norm(embedding)  # unit normalize

        # Estimate duration from file if it exists, else use mock value
        duration_sec = 60.0
        if os.path.exists(audio_path):
            try:
                import wave

                with wave.open(audio_path, "r") as f:
                    duration_sec = f.getnframes() / f.getframerate()
            except Exception:
                pass

        return AcousticFeatures(
            embedding=embedding,
            duration_sec=duration_sec,
        )

    # ── Projection fitting ─────────────────────

    def fit_projection(
        self, audio_paths: list[str], save_path: Optional[str] = None
    ) -> None:
        """
        Fit PCA projection on a set of audio files.

        Call this once when you have your first batch of real audio.
        ~100 files is enough for a reasonable PCA basis.

        audio_paths: list of paths to audio files
        save_path:   if provided, saves components for future use
        """
        print(f"Fitting PCA projection on {len(audio_paths)} audio files...")
        embeddings = []

        for i, path in enumerate(audio_paths):
            features = self.extract(path)
            embeddings.append(features.embedding)
            if (i + 1) % 10 == 0:
                print(f"  Processed {i + 1}/{len(audio_paths)}")

        embeddings_matrix = np.stack(embeddings)  # (N, 768)
        self.projection.fit(embeddings_matrix)

        if save_path:
            self.projection.save(save_path)
            print(f"Projection saved to {save_path}")

        print("PCA projection fitted.")
