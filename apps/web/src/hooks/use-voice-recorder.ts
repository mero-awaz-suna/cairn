"use client";

import { useState, useRef, useCallback } from "react";

export type RecorderState = "idle" | "recording" | "stopped";

interface UseVoiceRecorderReturn {
  state: RecorderState;
  seconds: number;
  mimeType: string;
  startRecording: () => Promise<boolean>;
  stopRecording: () => Blob | null;
  reset: () => void;
}

/**
 * Dynamic format detection — prevents silent iPhone breakage.
 *
 * Priority: webm/opus (all modern browsers including Safari 18.4+)
 * Fallback: plain webm, then mp4 (older Safari)
 */
function getSupportedMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const formats = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ];
  return formats.find((f) => MediaRecorder.isTypeSupported(f)) ?? "";
}

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [state, setState] = useState<RecorderState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [mimeType, setMimeType] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,   // Whisper is trained on 16kHz
          channelCount: 1,     // Mono — Whisper expects this
        },
      });

      const detectedMime = getSupportedMimeType();
      if (!detectedMime) {
        stream.getTracks().forEach((t) => t.stop());
        return false;
      }

      setMimeType(detectedMime);
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream, { mimeType: detectedMime });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start(1000); // Collect data every second for responsive waveform
      mediaRecorderRef.current = recorder;

      setSeconds(0);
      setState("recording");

      // Timer
      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);

      return true;
    } catch {
      // Permission denied or no mic — caller handles fallback to typing
      return false;
    }
  }, []);

  const stopRecording = useCallback((): Blob | null => {
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      setState("stopped");
      return null;
    }

    // Stop recorder synchronously — ondataavailable fires one last time
    recorder.stop();

    // Stop all tracks (releases mic indicator)
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    setState("stopped");

    // Build the blob from collected chunks
    if (chunksRef.current.length === 0) return null;

    const blob = new Blob(chunksRef.current, { type: mimeType });
    return blob;
  }, [mimeType]);

  const reset = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    mediaRecorderRef.current = null;
    streamRef.current = null;
    chunksRef.current = [];
    setSeconds(0);
    setState("idle");
  }, []);

  return { state, seconds, mimeType, startRecording, stopRecording, reset };
}
