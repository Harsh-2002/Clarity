// Type definitions for audio transcription app

export interface ProviderConfig {
  id: "openai" | "groq" | "assemblyai"
  name: string
  apiKey: string
  models: {
    transcription: string
    fineTuning: string
  }
  limits: {
    maxFileSize: number // in bytes
    supportedFormats: string[]
  }
}

export interface Recording {
  id: string
  blob: Blob
  duration: number
  createdAt: number
  fileName: string
}

export interface Transcript {
  id: string
  recordingId: string
  text: string
  fineTunedText?: string
  provider: string
  model: string
  createdAt: number
  audio?: Blob
  tags?: string[]
  isDraft?: boolean
  status?: 'completed' | 'failed'
  duration?: number // Duration in seconds
} // New status field

export interface FinetuneRequest {
  id: string
  transcriptId: string
  originalText: string
  finetumedText: string
  provider: string
  model: string
  systemPrompt?: string
  createdAt: number
}

export interface AppSettings {
  selectedProvider: "openai" | "groq" | "assemblyai" | null
  selectedTranscriptionModel: string | null
  selectedFinetuneModel: string | null
  customSystemPrompt: string
  autoFineTune: boolean
  encryptionDerived: boolean
  theme: "light" | "dark" | "system"
  accentColor?: string
  onboardingComplete: boolean
}

export interface EncryptedData {
  ciphertext: string
  nonce: string
  algorithm: "nacl"
}

export interface Session {
  id: string
  deviceName: string
  createdAt: number
  expiresAt: number
  isCurrent: boolean
}
