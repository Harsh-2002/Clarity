import type { FinetuneRequest } from "./types"
import { getProvider, saveFinetuning, getSettings, getTranscripts } from "./storage"

async function fineTuneWithOpenAI(
  apiKey: string,
  originalText: string,
  systemPrompt: string,
  model: string,
): Promise<{ text: string; success: boolean; error?: string }> {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              systemPrompt ||
              "You are an expert transcription editor. Improve the provided transcription text for clarity, grammar, and coherence. Return only the improved text.",
          },
          {
            role: "user",
            content: `Please improve this transcription:\n\n${originalText}`,
          },
        ],
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.log("[v0] OpenAI error:", errorData)
      return { text: "", success: false, error: errorData.error?.message || "OpenAI fine-tuning failed" }
    }

    const data = await response.json()
    const finetunedText = data.choices[0]?.message?.content || ""
    return { text: finetunedText, success: true }
  } catch (error) {
    console.log("[v0] OpenAI catch error:", error)
    return { text: "", success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

async function fineTuneWithGroq(
  apiKey: string,
  originalText: string,
  systemPrompt: string,
  model: string,
): Promise<{ text: string; success: boolean; error?: string }> {
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              systemPrompt ||
              "You are an expert transcription editor. Improve the provided transcription text for clarity, grammar, and coherence. Return only the improved text.",
          },
          {
            role: "user",
            content: `Please improve this transcription:\n\n${originalText}`,
          },
        ],
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.log("[v0] Groq error:", errorData)
      return { text: "", success: false, error: errorData.error?.message || "Groq fine-tuning failed" }
    }

    const data = await response.json()
    const finetunedText = data.choices[0]?.message?.content || ""
    return { text: finetunedText, success: true }
  } catch (error) {
    console.log("[v0] Groq catch error:", error)
    return { text: "", success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

async function fineTuneWithAssemblyAI(
  apiKey: string,
  originalText: string,
  systemPrompt: string,
): Promise<{ text: string; success: boolean; error?: string }> {
  // AssemblyAI doesn't have a direct fine-tuning endpoint
  // Use a generic improvement approach
  try {
    // For now, return a message that AssemblyAI doesn't support fine-tuning
    // In production, you might use a different LLM or post-processing approach
    return {
      text: originalText,
      success: false,
      error: "Fine-tuning not available for AssemblyAI. Consider using OpenAI or Groq for this feature.",
    }
  } catch (error) {
    return { text: "", success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function fineTuneTranscript(
  transcriptId: string,
  customSystemPrompt?: string,
): Promise<{ finetune: FinetuneRequest | null; error?: string }> {
  const settings = getSettings()
  const transcripts = getTranscripts()
  const transcript = transcripts.find((t) => t.id === transcriptId)

  if (!transcript) {
    return { finetune: null, error: "Transcript not found" }
  }

  const provider = getProvider(settings.selectedProvider || "")
  if (!provider) {
    return { finetune: null, error: "Provider not configured" }
  }

  const systemPrompt = customSystemPrompt || settings.customSystemPrompt

  let finetunedResult
  switch (settings.selectedProvider) {
    case "openai":
      finetunedResult = await fineTuneWithOpenAI(
        provider.apiKey,
        transcript.text,
        systemPrompt,
        settings.selectedFinetuneModel || provider.models.fineTuning,
      )
      break
    case "groq":
      finetunedResult = await fineTuneWithGroq(
        provider.apiKey,
        transcript.text,
        systemPrompt,
        settings.selectedFinetuneModel || provider.models.fineTuning,
      )
      break
    case "assemblyai":
      finetunedResult = await fineTuneWithAssemblyAI(provider.apiKey, transcript.text, systemPrompt)
      break
    default:
      return { finetune: null, error: "Unknown provider" }
  }

  if (!finetunedResult.success) {
    return { finetune: null, error: finetunedResult.error }
  }

  const finetune: FinetuneRequest = {
    id: Date.now().toString(),
    transcriptId,
    originalText: transcript.text,
    finetumedText: finetunedResult.text,
    provider: settings.selectedProvider || "",
    model: settings.selectedFinetuneModel || provider.models.fineTuning,
    systemPrompt,
    createdAt: Date.now(),
  }

  saveFinetuning(finetune)
  return { finetune }
}

/**
 * Fine-tune transcript text directly (for auto fine-tune feature)
 */
export async function fineTuneText(
  text: string,
  customSystemPrompt?: string,
): Promise<{ fineTunedText?: string; success: boolean; error?: string }> {
  const settings = getSettings()

  const provider = getProvider(settings.selectedProvider || "")
  if (!provider) {
    return { success: false, error: "Provider not configured" }
  }

  if (!settings.selectedFinetuneModel) {
    return { success: false, error: "Fine-tune model not configured" }
  }

  const systemPrompt = customSystemPrompt || settings.customSystemPrompt

  let finetunedResult
  switch (settings.selectedProvider) {
    case "openai":
      finetunedResult = await fineTuneWithOpenAI(
        provider.apiKey,
        text,
        systemPrompt,
        settings.selectedFinetuneModel,
      )
      break
    case "groq":
      finetunedResult = await fineTuneWithGroq(
        provider.apiKey,
        text,
        systemPrompt,
        settings.selectedFinetuneModel,
      )
      break
    case "assemblyai":
      finetunedResult = await fineTuneWithAssemblyAI(provider.apiKey, text, systemPrompt)
      break
    default:
      return { success: false, error: "Unknown provider" }
  }

  if (!finetunedResult.success) {
    return { success: false, error: finetunedResult.error }
  }

  return { success: true, fineTunedText: finetunedResult.text }
}
