/**
 * Audio chunking utility for handling large audio files
 * Splits audio into manageable chunks with overlap to prevent missing content
 */

export interface AudioChunk {
  blob: Blob
  startTime: number
  endTime: number
  index: number
}

/**
 * Split audio blob into chunks with overlap
 * @param audioBlob The audio blob to split
 * @param maxSizeBytes Maximum size per chunk in bytes
 * @param overlapSeconds Overlap duration in seconds between chunks
 * @returns Array of audio chunks
 */
export async function chunkAudio(
  audioBlob: Blob,
  maxSizeBytes: number,
  overlapSeconds: number = 2,
): Promise<AudioChunk[]> {
  // If audio is smaller than max size, return as single chunk
  if (audioBlob.size <= maxSizeBytes) {
    return [
      {
        blob: audioBlob,
        startTime: 0,
        endTime: 0,
        index: 0,
      },
    ]
  }

  try {
    // Load audio into AudioContext
    const arrayBuffer = await audioBlob.arrayBuffer()
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    
    let audioBuffer
    try {
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    } catch (decodeError) {
      console.error('[Clarity] Audio decode failed:', decodeError)
      // If decode fails, just return as single chunk and let the API handle it
      return [
        {
          blob: audioBlob,
          startTime: 0,
          endTime: 0,
          index: 0,
        },
      ]
    }

    const duration = audioBuffer.duration
    const sampleRate = audioBuffer.sampleRate
    const numberOfChannels = audioBuffer.numberOfChannels

    // Estimate chunk duration based on size
    const bytesPerSecond = audioBlob.size / duration
    const chunkDuration = (maxSizeBytes * 0.8) / bytesPerSecond // 80% of max size for safety

    const chunks: AudioChunk[] = []
    let currentTime = 0
    let chunkIndex = 0

    while (currentTime < duration) {
      const startTime = Math.max(0, currentTime - overlapSeconds)
      const endTime = Math.min(duration, currentTime + chunkDuration)

      // Extract chunk from audio buffer
      const chunkLength = Math.ceil((endTime - startTime) * sampleRate)
      const chunkBuffer = audioContext.createBuffer(numberOfChannels, chunkLength, sampleRate)

      // Copy audio data for each channel
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sourceData = audioBuffer.getChannelData(channel)
        const targetData = chunkBuffer.getChannelData(channel)
        const startSample = Math.floor(startTime * sampleRate)

        for (let i = 0; i < chunkLength; i++) {
          targetData[i] = sourceData[startSample + i] || 0
        }
      }

      // Convert buffer to blob
      const chunkBlob = await audioBufferToBlob(chunkBuffer, audioBlob.type)

      chunks.push({
        blob: chunkBlob,
        startTime,
        endTime,
        index: chunkIndex,
      })

      currentTime += chunkDuration
      chunkIndex++
    }

    await audioContext.close()
    return chunks
  } catch (error) {
    console.error('[Clarity] Audio chunking failed:', error)
    // Fallback: return as single chunk
    return [
      {
        blob: audioBlob,
        startTime: 0,
        endTime: 0,
        index: 0,
      },
    ]
  }
}

/**
 * Convert AudioBuffer to Blob
 */
async function audioBufferToBlob(audioBuffer: AudioBuffer, mimeType: string): Promise<Blob> {
  const numberOfChannels = audioBuffer.numberOfChannels
  const length = audioBuffer.length
  const sampleRate = audioBuffer.sampleRate

  // Create offline context to render audio
  const offlineContext = new OfflineAudioContext(numberOfChannels, length, sampleRate)
  const source = offlineContext.createBufferSource()
  source.buffer = audioBuffer
  source.connect(offlineContext.destination)
  source.start()

  const renderedBuffer = await offlineContext.startRendering()

  // Convert to WAV format
  const wavBlob = audioBufferToWav(renderedBuffer)
  return wavBlob
}

/**
 * Convert AudioBuffer to WAV Blob
 */
function audioBufferToWav(audioBuffer: AudioBuffer): Blob {
  const numberOfChannels = audioBuffer.numberOfChannels
  const length = audioBuffer.length
  const sampleRate = audioBuffer.sampleRate
  const bytesPerSample = 2 // 16-bit
  const blockAlign = numberOfChannels * bytesPerSample

  const buffer = new ArrayBuffer(44 + length * blockAlign)
  const view = new DataView(buffer)

  // Write WAV header
  writeString(view, 0, "RIFF")
  view.setUint32(4, 36 + length * blockAlign, true)
  writeString(view, 8, "WAVE")
  writeString(view, 12, "fmt ")
  view.setUint32(16, 16, true) // PCM format
  view.setUint16(20, 1, true) // Audio format (1 = PCM)
  view.setUint16(22, numberOfChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bytesPerSample * 8, true)
  writeString(view, 36, "data")
  view.setUint32(40, length * blockAlign, true)

  // Write audio data
  const offset = 44
  const channels: Float32Array[] = []
  for (let i = 0; i < numberOfChannels; i++) {
    channels.push(audioBuffer.getChannelData(i))
  }

  let pos = offset
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, channels[channel][i]))
      view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
      pos += 2
    }
  }

  return new Blob([buffer], { type: "audio/wav" })
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}

/**
 * Merge transcriptions from multiple chunks, handling overlap
 */
export function mergeChunkTranscriptions(
  chunks: Array<{ text: string; startTime: number; endTime: number }>,
  overlapSeconds: number,
): string {
  if (chunks.length === 0) return ""
  if (chunks.length === 1) return chunks[0].text

  let merged = chunks[0].text

  for (let i = 1; i < chunks.length; i++) {
    const currentChunk = chunks[i]
    
    // If there's overlap, try to find a good merge point
    // For simplicity, we'll just append with a space
    // In a more sophisticated version, we could use word matching
    merged += " " + currentChunk.text
  }

  // Clean up multiple spaces
  return merged.replace(/\s+/g, " ").trim()
}
