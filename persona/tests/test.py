from transformers import Wav2Vec2Processor, Wav2Vec2Model
import torch
from pathlib import Path

model_name = "facebook/wav2vec2-base-960h"

processor = Wav2Vec2Processor.from_pretrained(model_name)
model = Wav2Vec2Model.from_pretrained(model_name)


import librosa

audio_path = "sample.wav"

if not Path(audio_path).exists():
    print(
        "sample.wav not found. Place an audio file named sample.wav in tests/ to run this demo."
    )
    raise SystemExit(0)

speech, sr = librosa.load(audio_path, sr=16000)

inputs = processor(speech, return_tensors="pt", sampling_rate=16000)

with torch.no_grad():
    outputs = model(**inputs)

# Hidden representations (your acoustic features)
features = outputs.last_hidden_state
print(features.shape)
