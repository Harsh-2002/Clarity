import type { Transcript } from "./types"
import { getProvider, saveTranscript, getSettings } from "./storage"

async function transcribeWithOpenAI(
  apiKey: string,
  audioBlob: Blob,
  model: string,
): Promise<{ text: string; success: boolean; error?: string }> {
  try {
    const formData = new FormData()
    formData.append("file", audioBlob, "audio.webm")
    formData.append("model", model)

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    })

    if (!response.ok) {
      return { text: "", success: false, error: "OpenAI transcription failed" }
    }

    const data = await response.json()
    return { text: data.text, success: true }
  } catch (error) {
    return { text: "", success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

async function transcribeWithGroq(
  apiKey: string,
  audioBlob: Blob,
  model: string,
): Promise<{ text: string; success: boolean; error?: string }> {
  try {
    const formData = new FormData()
    formData.append("file", audioBlob, "audio.webm")
    formData.append("model", model)

    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    })

    if (!response.ok) {
      return { text: "", success: false, error: "Groq transcription failed" }
    }

    const data = await response.json()
    return { text: data.text, success: true }
  } catch (error) {
    return { text: "", success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

async function transcribeWithAssemblyAI(
  apiKey: string,
  audioBlob: Blob,
): Promise<{ text: string; success: boolean; error?: string }> {
  try {
    // Upload to AssemblyAI
    const uploadResponse = await fetch("https://api.assemblyai.com/v2/upload", {
      method: "POST",
      headers: {
        Authorization: apiKey,
      },
      body: audioBlob,
    })

    if (!uploadResponse.ok) {
      return { text: "", success: false, error: "AssemblyAI upload failed" }
    }

    const uploadData = await uploadResponse.json()
    const uploadUrl = uploadData.upload_url

    // Request transcription
    const transcriptResponse = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        audio_url: uploadUrl,
      }),
    })

    if (!transcriptResponse.ok) {
      return { text: "", success: false, error: "AssemblyAI transcription request failed" }
    }

    const transcriptData = await transcriptResponse.json()
    const transcriptId = transcriptData.id

    // Poll for completion
    let completed = false
    let transcript = transcriptData
    let attempts = 0
    const maxAttempts = 60

    while (!completed && attempts < maxAttempts) {
      const pollResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: {
          Authorization: apiKey,
        },
      })

      if (pollResponse.ok) {
        transcript = await pollResponse.json()
        if (transcript.status === "completed") {
          completed = true
        } else if (transcript.status === "error") {
          return { text: "", success: false, error: "AssemblyAI transcription error" }
        } else {
          await new Promise((resolve) => setTimeout(resolve, 1000))
          attempts++
        }
      }
    }

    if (!completed) {
      return { text: "", success: false, error: "AssemblyAI transcription timeout" }
    }

    return { text: transcript.text || "", success: true }
  } catch (error) {
    return { text: "", success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function transcribeAudio(
  audioBlob: Blob,
  audioFileName: string,
): Promise<{ transcript: Transcript | null; error?: string }> {
  const settings = getSettings()

  if (!settings.selectedProvider || !settings.selectedTranscriptionModel) {
    return { transcript: null, error: "Provider not configured" }
  }

  const provider = getProvider(settings.selectedProvider)
  if (!provider) {
    return { transcript: null, error: "Provider not found" }
  }

  let transcriptionResult
  switch (settings.selectedProvider) {
    case "openai":
      transcriptionResult = await transcribeWithOpenAI(provider.apiKey, audioBlob, settings.selectedTranscriptionModel)
      break
    case "groq":
      transcriptionResult = await transcribeWithGroq(provider.apiKey, audioBlob, settings.selectedTranscriptionModel)
      break
    case "assemblyai":
      transcriptionResult = await transcribeWithAssemblyAI(provider.apiKey, audioBlob)
      break
    default:
      return { transcript: null, error: "Unknown provider" }
  }

  if (!transcriptionResult.success) {
    return { transcript: null, error: transcriptionResult.error }
  }

  const transcript: Transcript = {
    id: Date.now().toString(),
    recordingId: Date.now().toString(),
    text: transcriptionResult.text,
    provider: settings.selectedProvider,
    model: settings.selectedTranscriptionModel,
    createdAt: Date.now(),
  }

  saveTranscript(transcript)
  return { transcript }
}
