import os
import json
import sys
import numpy as np
import google.generativeai as genai
from pydantic import BaseModel, Field
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from persona.core.models import LinguisticFeatures

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")

genai.configure(api_key=GOOGLE_API_KEY)


# ---------------------------------------------------------------------------
# 1. Pydantic Schema (Forces Gemini to return the exact fields)
# ---------------------------------------------------------------------------
class LinguisticExtraction(BaseModel):
    """Temporary schema to strictly type the LLM JSON output."""

    # Emotional dimensions
    valence: float = Field(description="0.0 (negative) to 1.0 (positive)")
    arousal: float = Field(description="0.0 (low energy) to 1.0 (high energy)")

    # Psychological markers
    agency_score: float = Field(description="0.0 (passive) to 1.0 (active/ownership)")
    distortion_score: float = Field(
        description="0.0 (clear) to 1.0 (heavy distortion/catastrophizing)"
    )
    coping_score: float = Field(description="0.0 (no coping) to 1.0 (healthy coping)")

    # Temporal orientation (Prompt instructs model to ensure these sum to 1.0)
    past_orientation: float = Field(
        description="Focus on past/rumination. Value from 0.0 to 1.0"
    )
    present_orientation: float = Field(
        description="Focus on present/groundedness. Value from 0.0 to 1.0"
    )
    future_orientation: float = Field(
        description="Focus on future/anticipation. Value from 0.0 to 1.0"
    )

    # Stressor distribution (Maps to StressorType enum, sums to 1.0)
    stressor_work_pressure: float = Field(
        description="Weight of work pressure. 0.0 to 1.0"
    )
    stressor_career_uncertainty: float = Field(
        description="Weight of career uncertainty. 0.0 to 1.0"
    )
    stressor_relationships: float = Field(
        description="Weight of relationship stress. 0.0 to 1.0"
    )
    stressor_identity: float = Field(
        description="Weight of identity stress. 0.0 to 1.0"
    )
    stressor_finances: float = Field(
        description="Weight of financial stress. 0.0 to 1.0"
    )
    stressor_health: float = Field(description="Weight of health stress. 0.0 to 1.0")
    stressor_isolation: float = Field(
        description="Weight of isolation/loneliness. 0.0 to 1.0"
    )
    stressor_loss: float = Field(description="Weight of grief/loss. 0.0 to 1.0")

    # Urgency signals
    urgency_signal: float = Field(description="0.0 (calm) to 1.0 (acute crisis)")
    help_seeking_signal: float = Field(
        description="0.0 (venting) to 1.0 (explicitly asking for support)"
    )


# ---------------------------------------------------------------------------
# 2. The Extractor Function
# ---------------------------------------------------------------------------
def extract_linguistic_features(transcript: str) -> LinguisticFeatures:
    """
    Extracts features via Gemini and returns an instantiated LinguisticFeatures dataclass.
    """
    if not GOOGLE_API_KEY:
        raise RuntimeError(
            "Missing GOOGLE_API_KEY. Set it in your environment before running lingustic.py."
        )

    model = genai.GenerativeModel("gemini-2.5-flash")

    system_instruction = """
    You are an expert clinical linguistic analyzer processing transcripts of voice memos.
    Extract the 18 specific psychological dimensions from the text.
    
    CRITICAL CONSTRAINTS:
    1. The temporal orientation fields (past, present, future) MUST sum to exactly 1.0.
    2. The 8 stressor fields MUST sum to exactly 1.0. Apportion the weight based on what the user is talking about.
    """

    prompt = f"Analyze this transcript:\n\n{transcript}"

    try:
        response = model.generate_content(
            contents=[
                {"role": "user", "parts": [{"text": system_instruction}]},
                {"role": "user", "parts": [{"text": prompt}]},
            ],
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                response_schema=LinguisticExtraction,
                temperature=0.1,
            ),
        )

        # Parse the guaranteed JSON
        raw_data = json.loads(response.text)

        # Pack the 8 stressors into the numpy array required by models.py
        # Order matters here! It must match your StressorType Enum order.
        stressor_array = np.array(
            [
                raw_data["stressor_work_pressure"],
                raw_data["stressor_career_uncertainty"],
                raw_data["stressor_relationships"],
                raw_data["stressor_identity"],
                raw_data["stressor_finances"],
                raw_data["stressor_health"],
                raw_data["stressor_isolation"],
                raw_data["stressor_loss"],
            ],
            dtype=np.float32,
        )

        # Instantiate and return the actual dataclass
        # (The __post_init__ in your model will handle any slight normalization errors)
        return LinguisticFeatures(
            valence=raw_data["valence"],
            arousal=raw_data["arousal"],
            agency_score=raw_data["agency_score"],
            distortion_score=raw_data["distortion_score"],
            coping_score=raw_data["coping_score"],
            past_orientation=raw_data["past_orientation"],
            present_orientation=raw_data["present_orientation"],
            future_orientation=raw_data["future_orientation"],
            stressor_dist=stressor_array,
            urgency_signal=raw_data["urgency_signal"],
            help_seeking_signal=raw_data["help_seeking_signal"],
        )

    except Exception as e:
        print(f"Extraction failed: {e}")
        # In production, raise a custom exception or return a zeroed baseline
        raise


# ---------------------------------------------------------------------------
# 3. Example Usage
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    transcript = " don’t know how to explain it, but studying has become this constant uphill battle. I sit down with good intentions, telling myself I’ll focus, I’ll get through it… but within minutes I’m overwhelmed. The notes pile up, deadlines creep closer, and I feel like I’m drowning in expectations. It’s not just about grades anymore — it’s about how heavy it feels inside. I catch myself thinking, ‘Why can’t I just get it together?’ And that thought alone makes me sink deeper. It’s frustrating, because I want to do better, I want to feel motivated, but instead I’m stuck in this cycle of stress and self‑doubt. Honestly, it’s depressing. But maybe admitting it, saying it out loud, is the first step to breaking free from it. Maybe that’s where change begins."

    features = extract_linguistic_features(transcript)

    print("Extracted Linguistic Features:")
    print(features)

    print(f"Valence: {features.valence}")
    print(f"Stressor Dist Shape: {features.stressor_dist.shape}")
    print(f"Is Crisis Signal: {features.urgency_signal > 0.75}")
