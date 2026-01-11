import type { ProviderConfig } from "./types"

export const PROVIDER_CONFIGS: Record<string, Omit<ProviderConfig, "apiKey">> = {
  openai: {
    id: "openai",
    name: "OpenAI",
    models: {
      transcription: "whisper-1",
      fineTuning: "gpt-4o-mini",
    },
    limits: {
      maxFileSize: 24 * 1024 * 1024, // 24 MB
      supportedFormats: ["mp3", "wav", "opus", "m4a", "flac"],
    },
  },
  groq: {
    id: "groq",
    name: "Groq",
    models: {
      transcription: "whisper-large-v3-turbo",
      fineTuning: "llama-3.1-70b-versatile",
    },
    limits: {
      maxFileSize: 18 * 1024 * 1024, // 18 MB
      supportedFormats: ["mp3", "wav", "opus", "m4a", "flac"],
    },
  },
  assemblyai: {
    id: "assemblyai",
    name: "AssemblyAI",
    models: {
      transcription: "best",
      fineTuning: "default",
    },
    limits: {
      maxFileSize: 50 * 1024 * 1024, // 50 MB
      supportedFormats: ["mp3", "wav", "opus", "m4a", "flac"],
    },
  },
}

/**
 * Validate API key format for each provider
 */
import { apiFetch } from "./storage"

/**
 * Validate API key format for each provider (via Proxy)
 */
export async function validateApiKey(providerId: string, apiKey: string): Promise<{ valid: boolean; error?: string }> {
  if (!apiKey || apiKey.trim().length === 0) {
    return { valid: false, error: "API key is required" }
  }

  try {
    const res = await apiFetch<{ valid: boolean; error?: string }>("/ai/validate", {
      method: "POST",
      body: JSON.stringify({ providerId, apiKey })
    })
    return res
  } catch (error) {
    return { valid: false, error: "Failed to validate API key" }
  }
}

/**
 * Fetch available models from provider API (via Proxy)
 */
export async function fetchAvailableModels(
  providerId: string,
  apiKey: string, // We accept it to keep signature, but if it's empty we rely on stored key (backend handles logic)
): Promise<{ models: string[]; error?: string }> {

  // If we have an API key (e.g. testing new setting), validate it. 
  // But usually this is called with stored key.
  // The Backend /ai/models endpoint uses STORED key for the providerId.
  // If we are testing a NEW key, we can't use /ai/models easily unless we pass the key.
  // But /ai/models endpoint handles stored key. 

  // TODO: Refactor: If we are in "Settings" and checking a new key, we use validateApiKey to check validity.
  // Then we save. Then we fetch models.
  // This function assumes we are fetching models for a SAVED provider.

  try {
    const res = await apiFetch<{ models: string[] }>("/ai/models", {
      method: "POST",
      body: JSON.stringify({ providerId, apiKey })
    })
    return { models: res.models }
  } catch (error) {
    return { models: [], error: error instanceof Error ? error.message : "Failed to fetch models" }
  }
}

/**
 * Get audio format recommendation for provider
 */
export function getRecommendedFormat(provider: string): string {
  switch (provider) {
    case "openai":
    case "groq":
      return "wav" // Best balance for these providers
    case "assemblyai":
      return "mp3" // AssemblyAI works well with MP3
    default:
      return "wav"
  }
}
