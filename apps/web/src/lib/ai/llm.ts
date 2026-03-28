/**
 * CAIRN — Multi-Provider LLM Abstraction
 *
 * Supports: Groq, Gemini, Claude (Anthropic)
 * Switch providers via LLM_PROVIDER env var.
 * Each provider needs its own API key env var.
 *
 * Priority: uses LLM_PROVIDER env var, defaults to first available key.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export type LLMProvider = "groq" | "gemini" | "anthropic";

export interface LLMRequest {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMResponse {
  text: string;
  provider: LLMProvider;
  model: string;
  latencyMs: number;
}

// ── Provider configs ───────────────────────────────────────────────────────

const PROVIDER_MODELS: Record<LLMProvider, string> = {
  groq: "llama-3.3-70b-versatile",      // Fast, free tier, excellent quality
  gemini: "gemini-2.0-flash",            // Google's latest flash model
  anthropic: "claude-sonnet-4-20250514",  // Best quality, paid
};

// ── Resolve which provider to use ──────────────────────────────────────────

export function resolveProvider(): LLMProvider {
  // Explicit override
  const explicit = process.env.LLM_PROVIDER as LLMProvider | undefined;
  if (explicit && ["groq", "gemini", "anthropic"].includes(explicit)) {
    return explicit;
  }

  // Auto-detect from available keys (priority order: groq > gemini > anthropic)
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";

  // No keys at all — will fall back to heuristics
  return "groq";
}

export function hasAnyKey(): boolean {
  return !!(process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY);
}

// ── Unified call ───────────────────────────────────────────────────────────

export async function llmCall(req: LLMRequest): Promise<LLMResponse> {
  const provider = resolveProvider();
  const start = Date.now();

  try {
    let text: string;
    let model: string;

    switch (provider) {
      case "groq":
        ({ text, model } = await callGroq(req));
        break;
      case "gemini":
        ({ text, model } = await callGemini(req));
        break;
      case "anthropic":
        ({ text, model } = await callAnthropic(req));
        break;
    }

    return { text, provider, model, latencyMs: Date.now() - start };
  } catch (error) {
    console.error(`[LLM] ${provider} failed:`, error);
    throw error;
  }
}

// ── Groq (OpenAI-compatible, blazing fast) ─────────────────────────────────

async function callGroq(req: LLMRequest): Promise<{ text: string; model: string }> {
  const Groq = (await import("groq-sdk")).default;
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY! });
  const model = PROVIDER_MODELS.groq;

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: req.system },
      { role: "user", content: req.user },
    ],
    max_tokens: req.maxTokens || 512,
    temperature: req.temperature || 0.7,
    response_format: { type: "json_object" },
  });

  return {
    text: completion.choices[0]?.message?.content || "",
    model,
  };
}

// ── Google Gemini ──────────────────────────────────────────────────────────

async function callGemini(req: LLMRequest): Promise<{ text: string; model: string }> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = PROVIDER_MODELS.gemini;

  const geminiModel = genAI.getGenerativeModel({
    model,
    systemInstruction: req.system,
    generationConfig: {
      maxOutputTokens: req.maxTokens || 512,
      temperature: req.temperature || 0.7,
      responseMimeType: "application/json",
    },
  });

  const result = await geminiModel.generateContent(req.user);
  const text = result.response.text();

  return { text, model };
}

// ── Anthropic (Claude) ─────────────────────────────────────────────────────

async function callAnthropic(req: LLMRequest): Promise<{ text: string; model: string }> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const model = PROVIDER_MODELS.anthropic;

  const message = await client.messages.create({
    model,
    max_tokens: req.maxTokens || 512,
    system: req.system,
    messages: [{ role: "user", content: req.user }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  return { text, model };
}
