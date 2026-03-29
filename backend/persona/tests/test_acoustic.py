"""
cairn/tests/test_acoustic.py

Tests for the acoustic extractor.
All tests use use_mock=True so they run without model weights.
"""

import sys
import numpy as np
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from extractors.acoustic import AcousticExtractor, PCAProjection
from core.models import AcousticFeatures
from core.config import CONFIG


def test_mock_extraction():
    """Mock extractor returns correct shapes and types."""
    extractor = AcousticExtractor.load(use_mock=True)
    features = extractor.extract("test_memo_day1.wav")

    assert isinstance(features, AcousticFeatures)
    assert features.embedding.shape == (768,)
    assert features.duration_sec > 0.0
    print("  PASS: mock extraction shape and type")


def test_deterministic():
    """Same path always produces same embedding."""
    extractor = AcousticExtractor.load(use_mock=True)
    f1 = extractor.extract("user_001_day1.wav")
    f2 = extractor.extract("user_001_day1.wav")
    assert np.allclose(f1.embedding, f2.embedding), "Same path must give same embedding"
    print("  PASS: deterministic — same path = same embedding")


def test_different_paths_differ():
    """Different paths produce different embeddings."""
    extractor = AcousticExtractor.load(use_mock=True)
    f1 = extractor.extract("user_001_day1.wav")
    f2 = extractor.extract("user_001_day2.wav")
    assert not np.allclose(f1.embedding, f2.embedding), "Different paths should differ"
    print("  PASS: different paths produce different embeddings")


def test_projection_shapes():
    """Projection reduces 768 → 64 and returns unit-normalized vector."""
    extractor = AcousticExtractor.load(use_mock=True)
    features = extractor.extract("test.wav")
    projected = extractor.project(features.embedding)

    assert projected.shape == (
        CONFIG.projection.projected_dim,
    ), f"Expected ({CONFIG.projection.projected_dim},), got {projected.shape}"

    norm = np.linalg.norm(projected)
    assert abs(norm - 1.0) < 1e-5, f"Expected unit norm, got {norm}"
    print(f"  PASS: projection shape {projected.shape}, norm={norm:.6f}")


def test_pca_fit_and_project():
    """PCA fits on batch of embeddings and projects correctly."""
    pca = PCAProjection()

    # Simulate 50 wav2vec2 embeddings
    rng = np.random.RandomState(0)
    embeddings = rng.randn(50, 768).astype(np.float32)

    pca.fit(embeddings)
    assert pca.is_fitted

    single = embeddings[0]
    projected = pca.project(single)
    assert projected.shape == (64,)
    print(f"  PASS: PCA fit on (50, 768), projected to {projected.shape}")


def test_extract_and_project_pipeline():
    """Full pipeline: audio path → 64-dim projected vector."""
    extractor = AcousticExtractor.load(use_mock=True)
    features, projected = extractor.extract_and_project("user_001_day3.wav")

    assert features.embedding.shape == (768,)
    assert projected.shape == (64,)
    print("  PASS: full extract_and_project pipeline")


def test_different_users_different_embeddings():
    """
    Simulate multiple users' day-1 entries.
    Verifies that the system produces distinct embeddings
    for different users — important for matching to work correctly.
    """
    extractor = AcousticExtractor.load(use_mock=True)

    users = ["alice_day1.wav", "bob_day1.wav", "carol_day1.wav", "dan_day1.wav"]
    embeddings = [extractor.extract(u).embedding for u in users]

    for i in range(len(embeddings)):
        for j in range(i + 1, len(embeddings)):
            sim = float(
                np.dot(embeddings[i], embeddings[j])
                / (np.linalg.norm(embeddings[i]) * np.linalg.norm(embeddings[j]))
            )
            assert abs(sim) < 0.99, f"Users {i} and {j} have near-identical embeddings"

    print(f"  PASS: {len(users)} users produce distinct embeddings")


def test_stage_simulation():
    """
    Illustrates how different audio (stress vs calm) should produce
    different embeddings — important conceptual test.

    In mock mode embeddings are random, so this just verifies the
    interface works. With real wav2vec2, stressed vs calm speech
    will cluster in different regions of the 768-dim space.
    """
    extractor = AcousticExtractor.load(use_mock=True)

    # These represent the same user on different days
    paths = [
        "user_alice_day01_stressed.wav",  # high stress
        "user_alice_day07_improving.wav",  # finding ground
        "user_alice_day14_calm.wav",  # through it
    ]

    results = []
    for path in paths:
        features, projected = extractor.extract_and_project(path)
        results.append(projected)
        print(
            f"    {path}: embedding norm={np.linalg.norm(features.embedding):.3f}, "
            f"projected norm={np.linalg.norm(projected):.3f}"
        )

    # With real wav2vec2: day01 and day14 should have low cosine similarity
    # With mock: they'll be random — we just verify the interface works
    print("  PASS: stage simulation interface works")


if __name__ == "__main__":
    print("Running acoustic extractor tests (mock mode)...\n")
    test_mock_extraction()
    test_deterministic()
    test_different_paths_differ()
    test_projection_shapes()
    test_pca_fit_and_project()
    test_extract_and_project_pipeline()
    test_different_users_different_embeddings()
    test_stage_simulation()
    print("\nAll acoustic tests passed.")
