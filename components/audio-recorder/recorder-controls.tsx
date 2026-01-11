"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { AudioRecorder } from "@/lib/audio-recorder"
import type { RecordingState } from "@/lib/audio-recorder"
import { AudioVisualizer } from "./audio-visualizer"

interface RecorderControlsProps {
  onRecordingComplete: (blob: Blob, duration: number) => void
}

export function RecorderControls({ onRecordingComplete }: RecorderControlsProps) {
  const [recorder, setRecorder] = useState<AudioRecorder | null>(null)
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioBlob: null,
  })
  const [frequencyData, setFrequencyData] = useState<Uint8Array | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setRecorder(new AudioRecorder())
  }, [])

  useEffect(() => {
    if (!recordingState.isRecording) return

    const interval = setInterval(() => {
      setRecordingState((prev) => ({
        ...prev,
        duration: prev.duration + 1,
      }))
    }, 1000)

    return () => clearInterval(interval)
  }, [recordingState.isRecording])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    }
    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
  }

  const handleStartRecording = async () => {
    setError(null)
    try {
      await recorder?.startRecording(setRecordingState, setFrequencyData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start recording")
    }
  }

  const handlePauseResume = () => {
    if (recordingState.isPaused) {
      recorder?.resumeRecording()
    } else {
      recorder?.pauseRecording()
    }
  }

  const handleStopRecording = async () => {
    if (!recorder) return

    try {
      const audioBlob = await recorder.stopRecording()
      const { id: fileId } = await import('@/lib/storage').then(m => m.uploadAudio(audioBlob))

      // We pass the uploaded file ID as the "blob" url for now or modify the handler to accept ID
      // But the cleaner way is to keep the blob for immediate local playback if needed,
      // and pass the file ID as an additional param.
      // However, the interface demands (blob, duration). 
      // Let's modify the interface in a separate step if needed, but for now we can attach the ID to the blob?
      // No, let's just upload here and pass the blob props.
      // Wait, the parent component handles the "saveTranscript". 
      // We need to change the parent to expect a fileId OR change the interface here.

      // Let's attach the fileId to the blob object to avoid breaking signature immediately
      // (audioBlob as any).fileId = fileId; 

      // Actually, let's update the prop signature. It's cleaner.
      onRecordingComplete(audioBlob, recordingState.duration, fileId)
    } catch (err) {
      setError("Failed to upload recording")
      console.error(err)
    }

    setRecordingState({
      isRecording: false,
      isPaused: false,
      duration: 0,
      audioBlob: null,
    })
    setFrequencyData(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="text-4xl font-bold tabular-nums">{formatTime(recordingState.duration)}</div>

        {recordingState.isRecording && <AudioVisualizer frequencyData={frequencyData} isRecording={true} />}
      </div>

      {error && <div className="text-sm text-destructive text-center">{error}</div>}

      <div className="flex gap-3 justify-center">
        {!recordingState.isRecording ? (
          <Button onClick={handleStartRecording} size="lg" className="gap-2">
            <span className="w-2 h-2 rounded-full bg-current" /> Record
          </Button>
        ) : (
          <>
            <Button onClick={handlePauseResume} variant="outline" size="lg">
              {recordingState.isPaused ? "Resume" : "Pause"}
            </Button>
            <Button onClick={handleStopRecording} variant="destructive" size="lg">
              Stop
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
