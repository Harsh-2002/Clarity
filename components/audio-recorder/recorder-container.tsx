"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { AudioRecorder } from "@/lib/audio-recorder"
import type { RecordingState } from "@/lib/audio-recorder"
import { AudioVisualizer } from "./audio-visualizer"
import { Mic, Upload, Square, Pause, Play, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { PROVIDER_CONFIGS } from "@/lib/providers"
import { getSettings } from "@/lib/storage"

interface RecorderContainerProps {
  onAudioReady: (blob: Blob, fileName: string, duration: number) => void
}

export function RecorderContainer({ onAudioReady }: RecorderContainerProps) {
  const [recorder, setRecorder] = useState<AudioRecorder | null>(null)
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioBlob: null,
  })
  const [frequencyData, setFrequencyData] = useState<Uint8Array | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showDurationWarning, setShowDurationWarning] = useState(false)
  const [isHoldingSpace, setIsHoldingSpace] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setRecorder(new AudioRecorder())
  }, [])

  // Lock orientation to landscape on mobile when recording
  useEffect(() => {
    if (!recordingState.isRecording) return

    const lockOrientation = async () => {
      try {
        if (screen.orientation && screen.orientation.lock && window.innerWidth < 768) {
          await screen.orientation.lock("landscape").catch(() => {
            // Orientation lock might fail, that's OK
            console.log("[Orientation] Lock not supported or permission denied")
          })
        }
      } catch (err) {
        // Silently fail - not all browsers support this
      }
    }

    const unlockOrientation = () => {
      try {
        if (screen.orientation && screen.orientation.unlock) {
          screen.orientation.unlock()
        }
      } catch (err) {
        // Silently fail
      }
    }

    lockOrientation()

    return () => {
      unlockOrientation()
    }
  }, [recordingState.isRecording])

  // Keyboard shortcut: Spacebar to start/stop recording (with hold-to-record support)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.repeat) return // Ignore key repeat events
      
      if (e.code === "Space") {
        e.preventDefault()
        
        if (!recordingState.isRecording && !isHoldingSpace) {
          setIsHoldingSpace(true)
          
          // Start recording immediately on press
          handleStartRecording()
          
          // Set a timeout - if they hold for more than 500ms, it's "hold mode"
          holdTimeoutRef.current = setTimeout(() => {
            // They're holding it - recording will continue until release
          }, 500)
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      
      if (e.code === "Space" && isHoldingSpace) {
        e.preventDefault()
        setIsHoldingSpace(false)
        
        // Clear the hold timeout
        if (holdTimeoutRef.current) {
          clearTimeout(holdTimeoutRef.current)
          holdTimeoutRef.current = null
        }
        
        // Stop recording when spacebar is released
        if (recordingState.isRecording) {
          handleStopRecording()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
      if (holdTimeoutRef.current) {
        clearTimeout(holdTimeoutRef.current)
      }
    }
  }, [recordingState.isRecording, isHoldingSpace])

  useEffect(() => {
    if (!recordingState.isRecording || recordingState.isPaused) return

    const interval = setInterval(() => {
      setRecordingState((prev) => {
        const newDuration = prev.duration + 1
        
        // Show warning at 30 minutes (1800 seconds)
        if (newDuration === 1800) {
          setShowDurationWarning(true)
          setTimeout(() => setShowDurationWarning(false), 5000)
        }
        
        return {
          ...prev,
          duration: newDuration,
        }
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [recordingState.isRecording, recordingState.isPaused])

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
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

    const audioBlob = await recorder.stopRecording()
    handleRecordingComplete(audioBlob, recordingState.duration)
    setRecordingState({
      isRecording: false,
      isPaused: false,
      duration: 0,
      audioBlob: null,
    })
    setFrequencyData(null)
  }

  const handleRecordingComplete = (blob: Blob, duration: number) => {
    const timestamp = new Date().toLocaleTimeString().replace(/:/g, "-")
    const fileName = `recording-${timestamp}.webm`
    onAudioReady(blob, fileName, duration)
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const file = event.target.files?.[0]

    if (!file) return

    const settings = getSettings()
    const provider = settings.selectedProvider
    const providerConfig = provider ? PROVIDER_CONFIGS[provider] : null

    if (!providerConfig) {
      setError("Provider not configured")
      return
    }

    // Validate file size (soft check, chunking handles larger files)
    // We'll just warn if it's huge, but let it pass to the chunker
    
    // Validate file type
    const fileType = file.type.split("/")[1]
    // Basic check, but we can be lenient as the service handles most
    
    onAudioReady(file, file.name, 0)

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto min-h-[400px] relative">
      
      {/* Error Message */}
      {error && (
        <div className="absolute top-0 left-0 right-0 text-center p-4 animate-in fade-in slide-in-from-top-4">
          <div className="bg-destructive/10 text-destructive text-sm px-4 py-2 rounded-full inline-block">
            {error}
          </div>
        </div>
      )}

      {/* Duration Warning */}
      {showDurationWarning && (
        <div className="absolute top-16 left-0 right-0 text-center p-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm px-4 py-2 rounded-full inline-block">
            ⏱️ 30 minutes reached – Consider stopping soon
          </div>
        </div>
      )}

      {/* Hold-to-Record Indicator */}
      {isHoldingSpace && recordingState.isRecording && (
        <div className="absolute bottom-4 left-0 right-0 text-center p-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="bg-primary/10 text-primary text-sm px-4 py-2 rounded-full inline-block border border-primary/20">
            🎙️ Release spacebar to stop
          </div>
        </div>
      )}

      {/* Main Interaction Area */}
      <div className="relative z-10 flex flex-col items-center gap-8 transition-all duration-500">
        
        {recordingState.isRecording ? (
          // Active Recording State
          <div className="flex flex-col items-center gap-8 animate-in fade-in zoom-in-95 duration-300">
            <div className="text-6xl font-light tracking-tighter tabular-nums text-foreground/80">
              {formatTime(recordingState.duration)}
            </div>
            
            <div className="h-32 w-full flex items-center justify-center">
               <AudioVisualizer frequencyData={frequencyData} isRecording={true} />
            </div>

            <div className="flex items-center gap-6">
              <Button
                onClick={handlePauseResume}
                variant="outline"
                size="icon"
                className="h-14 w-14 rounded-full border-2 hover:bg-secondary transition-all"
              >
                {recordingState.isPaused ? (
                  <Play className="w-6 h-6 fill-current" />
                ) : (
                  <Pause className="w-6 h-6 fill-current" />
                )}
              </Button>
              
              <Button
                onClick={handleStopRecording}
                variant="destructive"
                size="icon"
                className="h-16 w-16 rounded-full shadow-lg hover:scale-105 transition-all"
              >
                <Square className="w-6 h-6 fill-current" />
              </Button>
            </div>
          </div>
        ) : (
          // Idle State
          <div className="flex flex-col items-center gap-8 animate-in fade-in zoom-in-95 duration-300">
            <button
              onClick={handleStartRecording}
              className="group relative flex items-center justify-center h-32 w-32 rounded-full bg-primary text-primary-foreground shadow-xl transition-all hover:scale-105 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-primary/20"
            >
              <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20 group-hover:opacity-30 duration-1000" />
              <Mic className="w-12 h-12" />
            </button>
            
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-medium tracking-tight">Tap to Record</h2>
              <p className="text-muted-foreground text-sm">
                or{" "}
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="text-primary hover:underline underline-offset-4 font-medium"
                >
                  upload an audio file
                </button>
              </p>
              <p className="text-muted-foreground/60 text-xs pt-2">
                <kbd className="px-2 py-1 rounded bg-secondary border border-border text-xs font-mono">Space</kbd> to hold & record
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input 
        ref={fileInputRef} 
        type="file" 
        accept="audio/*" 
        onChange={handleFileSelect} 
        className="hidden" 
      />
    </div>
  )
}
