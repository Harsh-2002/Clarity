import type { Transcript } from "./types"
import { getProvider, saveTranscript, getSettings } from "./storage"
import { chunkAudio, mergeChunkTranscriptions } from "./audio-chunker"
import { PROVIDER_CONFIGS } from "./providers"
import { retryWithBackoff, isRetryableError, getActionableErrorMessage } from "./retry"

async function transcribeWithOpenAI(
  apiKey: string,
  audioBlob: Blob,
  model: string,
): Promise<{ text: string; success: boolean; error?: string }> {
  try {
    const result = await retryWithBackoff(
      async () => {
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
          const error: any = new Error("OpenAI transcription failed")
          error.status = response.status
          throw error
        }

        const data = await response.json()
        return { text: data.text, success: true }
      },
      { shouldRetry: isRetryableError }
    )
    return result
  } catch (error) {
    return { 
      text: "", 
      success: false, 
      error: getActionableErrorMessage(error, "transcription")
    }
  }
}

async function transcribeWithGroq(
  apiKey: string,
  audioBlob: Blob,
  model: string,
): Promise<{ text: string; success: boolean; error?: string }> {
  try {
    const result = await retryWithBackoff(
      async () => {
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
          const error: any = new Error("Groq transcription failed")
          error.status = response.status
          throw error
        }

        const data = await response.json()
        return { text: data.text, success: true }
      },
      { shouldRetry: isRetryableError }
    )
    return result
  } catch (error) {
    return { 
      text: "", 
      success: false, 
      error: getActionableErrorMessage(error, "transcription")
    }
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

  const providerConfig = PROVIDER_CONFIGS[settings.selectedProvider]
  const maxFileSize = providerConfig.limits.maxFileSize

  // Check if chunking is needed
  let transcriptionText = ""
  
  if (audioBlob.size > maxFileSize) {
    // Split audio into chunks with 2-second overlap
    const chunks = await chunkAudio(audioBlob, maxFileSize, 2)
    const chunkResults: Array<{ text: string; startTime: number; endTime: number }> = []

    for (const chunk of chunks) {
      let chunkResult
      switch (settings.selectedProvider) {
        case "openai":
          chunkResult = await transcribeWithOpenAI(provider.apiKey, chunk.blob, settings.selectedTranscriptionModel)
          break
        case "groq":
          chunkResult = await transcribeWithGroq(provider.apiKey, chunk.blob, settings.selectedTranscriptionModel)
          break
        case "assemblyai":
          chunkResult = await transcribeWithAssemblyAI(provider.apiKey, chunk.blob)
          break
        default:
          return { transcript: null, error: "Unknown provider" }
      }

      if (!chunkResult.success) {
        return { transcript: null, error: `Chunk ${chunk.index + 1} failed: ${chunkResult.error}` }
      }

      chunkResults.push({
        text: chunkResult.text,
        startTime: chunk.startTime,
        endTime: chunk.endTime,
      })
    }

    // Merge chunk transcriptions
    transcriptionText = mergeChunkTranscriptions(chunkResults, 2)
  } else {
    // Process as single file
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

    transcriptionText = transcriptionResult.text
  }

  const transcript: Transcript = {
    id: Date.now().toString(),
    recordingId: Date.now().toString(),
    text: transcriptionText,
    provider: settings.selectedProvider,
    model: settings.selectedTranscriptionModel,
    createdAt: Date.now(),
  }

  saveTranscript(transcript)
  return { transcript }
}
