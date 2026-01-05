import type { ProviderConfig } from "./types"

export const PROVIDER_CONFIGS: Record<string, Omit<ProviderConfig, "apiKey">> = {
  openai: {
    id: "openai",
    name: "OpenAI",
    apiKey: "",
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
    apiKey: "",
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
    apiKey: "",
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
export async function validateApiKey(provider: string, apiKey: string): Promise<{ valid: boolean; error?: string }> {
  if (!apiKey || apiKey.trim().length === 0) {
    return { valid: false, error: "API key is required" }
  }

  try {
    switch (provider) {
      case "openai": {
        const response = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
        })
        if (!response.ok) {
          return { valid: false, error: "Invalid OpenAI API key" }
        }
        return { valid: true }
      }

      case "groq": {
        const response = await fetch("https://api.groq.com/openai/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
        })
        if (!response.ok) {
          return { valid: false, error: "Invalid Groq API key" }
        }
        return { valid: true }
      }

      case "assemblyai": {
        const response = await fetch("https://api.assemblyai.com/v2/account", {
          headers: { Authorization: apiKey },
        })
        if (!response.ok) {
          return { valid: false, error: "Invalid AssemblyAI API key" }
        }
        return { valid: true }
      }

      default:
        return { valid: false, error: "Unknown provider" }
    }
  } catch (error) {
    return { valid: false, error: "Failed to validate API key" }
  }
}

/**
 * Fetch available models from provider API
 */
export async function fetchAvailableModels(
  provider: string,
  apiKey: string,
): Promise<{ models: string[]; error?: string }> {
  if (!apiKey || apiKey.trim().length === 0) {
    return { models: [], error: "API key is required" }
  }

  try {
    switch (provider) {
      case "openai": {
        const response = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
        })
        if (!response.ok) {
          return { models: [], error: "Failed to fetch models from OpenAI" }
        }
        const data = await response.json()
        // Filter for models that support chat/completions
        const models = data.data
          .filter(
            (m: any) =>
              m.id.includes("gpt") ||
              m.id.includes("whisper") ||
              m.id.includes("text-davinci") ||
              m.id.includes("davinci"),
          )
          .map((m: any) => m.id)
          .sort()
        return { models }
      }

      case "groq": {
        const response = await fetch("https://api.groq.com/openai/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
        })
        if (!response.ok) {
          return { models: [], error: "Failed to fetch models from Groq" }
        }
        const data = await response.json()
        const models = data.data.map((m: any) => m.id).sort()
        return { models }
      }

      case "assemblyai": {
        // AssemblyAI doesn't have a models endpoint, return recommended models
        return {
          models: ["best", "default", "nano"],
        }
      }

      default:
        return { models: [], error: "Unknown provider" }
    }
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
