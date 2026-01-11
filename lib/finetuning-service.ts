import type { FinetuneRequest } from "./types"
import { getProvider, saveFinetuning, getSettings, getTranscripts, apiFetch } from "./storage"

/**
 * Parse tags from AI response in format "TAGS: tag1, tag2, tag3"
 * Returns the text without tags and extracted tags array
 */
function parseTagsFromResponse(text: string): { cleanedText: string; tags: string[] } {
  const tagRegex = /TAGS:\s*(.+?)(?:\n|$)/i
  const match = text.match(tagRegex)

  if (match) {
    const tagsString = match[1]
    const tags = tagsString.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
    const cleanedText = text.replace(tagRegex, '').trim()
    console.log('[Clarity] Parsed tags:', tags, 'from:', tagsString)
    return { cleanedText, tags }
  }

  console.log('[Clarity] No tags found in response')
  return { cleanedText: text, tags: [] }
}

async function fineTuneWithProxy(
  providerId: string,
  text: string,
  systemPrompt: string,
  model: string,
): Promise<{ text: string; success: boolean; error?: string }> {
  try {
    const data = await apiFetch<{ text: string }>("/ai/finetune", {
      method: "POST",
      body: JSON.stringify({
        providerId,
        model,
        text,
        systemPrompt,
      }),
    })

    return { text: data.text, success: true }
  } catch (error) {
    console.error(`[Clarity] ${providerId} fine-tuning error:`, error)
    return {
      text: "",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }
  }
}

export async function fineTuneTranscript(
  transcriptId: string,
  customSystemPrompt?: string,
): Promise<{ finetune: FinetuneRequest | null; error?: string }> {
  const settings = await getSettings()
  const transcripts = await getTranscripts()
  const transcript = transcripts.find((t) => t.id === transcriptId)

  if (!transcript) {
    return { finetune: null, error: "Transcript not found" }
  }

  const provider = await getProvider(settings.selectedProvider || "")
  if (!provider) {
    return { finetune: null, error: "Provider not configured" }
  }

  const systemPrompt = customSystemPrompt || settings.customSystemPrompt

  let finetunedResult
  switch (settings.selectedProvider) {
    case "openai":
    case "groq":
      finetunedResult = await fineTuneWithProxy(
        settings.selectedProvider,
        transcript.text,
        systemPrompt,
        settings.selectedFinetuneModel || provider.models.fineTuning
      )
      break
    default:
      return { finetune: null, error: "Provider not supported yet" }
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

  await saveFinetuning(finetune)
  return { finetune }
}

/**
 * Fine-tune transcript text directly (for auto fine-tune feature)
 */
export async function fineTuneText(
  text: string,
  customSystemPrompt?: string,
): Promise<{ fineTunedText?: string; tags?: string[]; success: boolean; error?: string }> {
  const settings = await getSettings()

  const provider = await getProvider(settings.selectedProvider || "")
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
    case "groq":
      finetunedResult = await fineTuneWithProxy(
        settings.selectedProvider,
        text,
        systemPrompt,
        settings.selectedFinetuneModel
      )
      break
    default:
      return { success: false, error: "Provider not supported or configured" }
  }

  if (!finetunedResult.success) {
    return { success: false, error: finetunedResult.error }
  }

  // Parse tags from AI response
  const { cleanedText, tags } = parseTagsFromResponse(finetunedResult.text)

  return { success: true, fineTunedText: cleanedText, tags }
}
