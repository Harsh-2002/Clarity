"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RecorderControls } from "./recorder-controls"
import { AudioUpload } from "./audio-upload"

interface RecorderContainerProps {
  onAudioReady: (blob: Blob, fileName: string, duration: number) => void
}

export function RecorderContainer({ onAudioReady }: RecorderContainerProps) {
  const [mode, setMode] = useState<"choose" | "record" | "upload">("choose")

  const handleRecordingComplete = (blob: Blob, duration: number) => {
    const timestamp = new Date().toLocaleTimeString().replace(/:/g, "-")
    const fileName = `recording-${timestamp}.webm`
    onAudioReady(blob, fileName, duration)
  }

  const handleFileSelected = (blob: Blob, fileName: string) => {
    onAudioReady(blob, fileName, 0)
  }

  return (
    <div className="space-y-6">
      {mode === "choose" && (
        <div className="flex gap-3 flex-col">
          <Button onClick={() => setMode("record")} size="lg" className="w-full">
            Record Audio
          </Button>
          <Button onClick={() => setMode("upload")} variant="outline" size="lg" className="w-full">
            Upload File
          </Button>
        </div>
      )}

      {mode === "record" && (
        <>
          <Button onClick={() => setMode("choose")} variant="ghost" className="w-full">
            ← Back
          </Button>
          <RecorderControls onRecordingComplete={handleRecordingComplete} />
        </>
      )}

      {mode === "upload" && (
        <>
          <Button onClick={() => setMode("choose")} variant="ghost" className="w-full">
            ← Back
          </Button>
          <AudioUpload onFileSelected={handleFileSelected} />
        </>
      )}
    </div>
  )
}
