/**
 * CAIRN — Audio Transcription
 *
 * Uses Groq Whisper Large v3 (free, fastest).
 * Same API key as the LLM layer — no additional setup.
 *
 * Groq runs Whisper on LPU hardware:
 * 60-second audio → transcribed in ~1-2 seconds.
 */

import Groq from "groq-sdk";

export interface TranscriptionResult {
  text: string;
  durationMs: number;
}

export async function transcribeAudio(
  audioBlob: Blob,
  mimeType: string
): Promise<TranscriptionResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("No GROQ_API_KEY — transcription unavailable");
  }

  const client = new Groq({ apiKey });
  const start = Date.now();

  // Determine file extension from mimeType for Groq
  const ext = mimeType.includes("mp4") ? "mp4" : "webm";
  const fileName = `journal.${ext}`;

  // Convert Blob to File (Groq SDK expects File-like object)
  const file = new File([audioBlob], fileName, { type: mimeType });

  const transcription = await client.audio.transcriptions.create({
    file,
    model: "whisper-large-v3",
    language: "en",
    response_format: "text",
  });

  const durationMs = Date.now() - start;

  const text = typeof transcription === "string" ? transcription : (transcription as unknown as { text: string }).text || "";

  console.log(
    `[Transcribe] Groq Whisper | ${durationMs}ms | ${audioBlob.size} bytes | "${text.slice(0, 80)}..."`
  );

  return {
    text,
    durationMs,
  };
}
