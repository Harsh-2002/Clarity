import type { Transcript } from "./types"
import { getProvider, saveTranscript, getSettings, apiFetch } from "./storage"
import { chunkAudio, mergeChunkTranscriptions } from "./audio-chunker"
import { PROVIDER_CONFIGS } from "./providers"
import { retryWithBackoff, isRetryableError, getActionableErrorMessage } from "./retry"

async function transcribeWithProxy(
  providerId: string,
  audioBlob: Blob,
  model: string,
  fileName: string = "audio.webm",
): Promise<{ text: string; success: boolean; error?: string }> {
  try {
    const result = await retryWithBackoff(
      async () => {
        const formData = new FormData()
        formData.append("file", audioBlob, fileName)
        formData.append("model", model)
        formData.append("providerId", providerId)

        // Use apiFetch to handle Auth. apiFetch in storage.ts has been updated to handle FormData
        // (stripping Content-Type header so browser sets boundary)
        const data = await apiFetch<{ text: string }>("/ai/transcribe", {
          method: "POST",
          body: formData,
        })

        return { text: data.text, success: true }
      },
      { shouldRetry: isRetryableError }
    )
    return result
  } catch (error) {
    console.error(`[Clarity] ${providerId} transcription error:`, error)
    return {
      text: "",
      success: false,
      error: getActionableErrorMessage(error, "transcription")
    }
  }
}

export async function transcribeAudio(
  audioBlob: Blob,
  audioFileName: string,
  duration: number, // Added duration
  fileId?: string, // Added optional fileId linked to server storage
): Promise<{ transcript: Transcript | null; error?: string }> {
  const settings = await getSettings()

  if (!settings.selectedProvider || !settings.selectedTranscriptionModel) {
    return { transcript: null, error: "Provider not configured" }
  }

  // We don't strictly *need* the provider details here anymore since the proxy resolves keys, 
  // but we should verify the provider exists in our local cache or fetch it to fail early/get nice errors.
  const provider = await getProvider(settings.selectedProvider)
  if (!provider) {
    return { transcript: null, error: "Provider not found" }
  }

  const providerConfig = PROVIDER_CONFIGS[settings.selectedProvider]
  const maxFileSize = providerConfig.limits.maxFileSize

  let transcriptionText = ""
  let isSuccess = false
  let errorMessage = ""

  // Simplified logic: Always use Proxy.
  try {
    if (audioBlob.size > maxFileSize) {
      // For now, fail fast or try anyway? 
      // Let's rely on standard chunking but calling the proxy for each chunk.
      // This is safe because proxy just forwards the file.
      const chunks = await chunkAudio(audioBlob, maxFileSize, 2)
      const chunkResults: Array<{ text: string; startTime: number; endTime: number }> = []

      for (const chunk of chunks) {
        const chunkResult = await transcribeWithProxy(
          settings.selectedProvider,
          chunk.blob,
          settings.selectedTranscriptionModel,
          audioFileName
        )

        if (!chunkResult.success) {
          throw new Error(`Chunk ${chunk.index + 1} failed: ${chunkResult.error}`);
        }

        chunkResults.push({
          text: chunkResult.text,
          startTime: chunk.startTime,
          endTime: chunk.endTime,
        })
      }
      transcriptionText = mergeChunkTranscriptions(chunkResults, 2)
      isSuccess = true;
    } else {
      const result = await transcribeWithProxy(
        settings.selectedProvider,
        audioBlob,
        settings.selectedTranscriptionModel,
        audioFileName
      )

      if (!result.success) {
        throw new Error(result.error);
      }
      transcriptionText = result.text;
      isSuccess = true;
    }
  } catch (e) {
    isSuccess = false;
    errorMessage = e instanceof Error ? e.message : "Unknown error";
    console.error("Transcription failed check:", e);
  }

  // Create transcript object even if failed (Failsafe)
  const transcript: Transcript = {
    id: Date.now().toString(),
    recordingId: fileId || Date.now().toString(), // Use the server fileId if available!
    text: transcriptionText,
    provider: settings.selectedProvider,
    model: settings.selectedTranscriptionModel,
    createdAt: Date.now(),
    status: isSuccess ? 'completed' : 'failed',
    duration: duration,
  }

  // Save it
  saveTranscript(transcript);

  if (!isSuccess) {
    return { transcript, error: errorMessage }; // Return transcript AND error
  }

  return { transcript };
}
