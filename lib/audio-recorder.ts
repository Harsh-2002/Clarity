export interface RecordingState {
  isRecording: boolean
  isPaused: boolean
  duration: number
  audioBlob: Blob | null
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private microphone: MediaStreamAudioSourceNode | null = null
  private animationId: number | null = null
  private startTime = 0
  private pausedTime = 0
  private chunks: Blob[] = []

  private onStateChange: ((state: RecordingState) => void) | null = null
  private onVisualize: ((data: Uint8Array) => void) | null = null

  async startRecording(onStateChange: (state: RecordingState) => void, onVisualize: (data: Uint8Array) => void) {
    try {
      this.onStateChange = onStateChange
      this.onVisualize = onVisualize
      this.chunks = []

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 256
      this.microphone = this.audioContext.createMediaStreamSource(stream)
      this.microphone.connect(this.analyser)

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      })

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.chunks.push(e.data)
        }
      }

      this.mediaRecorder.start()
      this.startTime = Date.now()
      this.pausedTime = 0

      this.onStateChange?.({
        isRecording: true,
        isPaused: false,
        duration: 0,
        audioBlob: null,
      })

      this.visualize()
    } catch (error) {
      console.error("Failed to start recording:", error)
      throw error
    }
  }

  pauseRecording() {
    if (this.mediaRecorder?.state === "recording") {
      this.mediaRecorder.pause()
      if (this.animationId) {
        cancelAnimationFrame(this.animationId)
      }

      this.onStateChange?.({
        isRecording: true,
        isPaused: true,
        duration: Math.round((Date.now() - this.startTime - this.pausedTime) / 1000),
        audioBlob: null,
      })
    }
  }

  resumeRecording() {
    if (this.mediaRecorder?.state === "paused") {
      this.pausedTime +=
        Date.now() - (this.startTime + Math.round((Date.now() - this.startTime - this.pausedTime) / 1000) * 1000)
      this.mediaRecorder.resume()

      this.onStateChange?.({
        isRecording: true,
        isPaused: false,
        duration: Math.round((Date.now() - this.startTime - this.pausedTime) / 1000),
        audioBlob: null,
      })

      this.visualize()
    }
  }

  stopRecording(): Promise<Blob> {
    return new Promise((resolve) => {
      if (this.mediaRecorder) {
        this.mediaRecorder.onstop = () => {
          const audioBlob = new Blob(this.chunks, { type: "audio/webm;codecs=opus" })

          this.onStateChange?.({
            isRecording: false,
            isPaused: false,
            duration: Math.round((Date.now() - this.startTime - this.pausedTime) / 1000),
            audioBlob,
          })

          this.cleanup()
          resolve(audioBlob)
        }

        this.mediaRecorder.stop()
        this.mediaRecorder.stream.getTracks().forEach((track) => track.stop())

        if (this.animationId) {
          cancelAnimationFrame(this.animationId)
        }
      }
    })
  }

  private visualize() {
    if (!this.analyser) return

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount)
    this.analyser.getByteFrequencyData(dataArray)
    this.onVisualize?.(dataArray)

    if (this.mediaRecorder?.state === "recording") {
      this.animationId = requestAnimationFrame(() => this.visualize())
    }
  }

  private cleanup() {
    if (this.audioContext) {
      this.audioContext.close()
    }
    this.mediaRecorder = null
    this.audioContext = null
    this.analyser = null
    this.microphone = null
    this.chunks = []
  }
}
