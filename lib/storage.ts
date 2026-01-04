import type { AppSettings, ProviderConfig, Transcript, FinetuneRequest, EncryptedData } from "./types"
import { encryptData, decryptData, generateRandomKey } from "./encryption"

const STORAGE_KEYS = {
  settings: "audio-app:settings",
  providers: "audio-app:providers",
  transcripts: "audio-app:transcripts",
  finetunings: "audio-app:finetunings",
  encryptionKey: "audio-app:encryption-key",
}

let encryptionKey: Uint8Array | null = null

export async function initializeEncryption(password: string, deriveFn: (pwd: string) => Promise<Uint8Array>) {
  encryptionKey = await deriveFn(password)
}

function getEncryptionKey(): Uint8Array {
  if (!encryptionKey) {
    const stored = localStorage.getItem(STORAGE_KEYS.encryptionKey)
    if (stored) {
      encryptionKey = new Uint8Array(JSON.parse(stored))
    } else {
      encryptionKey = generateRandomKey()
      localStorage.setItem(STORAGE_KEYS.encryptionKey, JSON.stringify(Array.from(encryptionKey)))
    }
  }
  return encryptionKey
}

export function saveProvider(provider: ProviderConfig): void {
  const key = getEncryptionKey()
  const providers = getProviders()

  const index = providers.findIndex((p) => p.id === provider.id)
  if (index >= 0) {
    providers[index] = provider
  } else {
    providers.push(provider)
  }

  const allEncrypted = providers.map((p) => encryptData(p, key))
  localStorage.setItem(STORAGE_KEYS.providers, JSON.stringify(allEncrypted))
}

export function getProviders(): ProviderConfig[] {
  const key = getEncryptionKey()
  const stored = localStorage.getItem(STORAGE_KEYS.providers)

  if (!stored) return []

  try {
    const encrypted: EncryptedData[] = JSON.parse(stored)
    return encrypted.map((enc) => decryptData(enc, key))
  } catch {
    return []
  }
}

export function getProvider(id: string): ProviderConfig | null {
  return getProviders().find((p) => p.id === id) || null
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings))
}

export function getSettings(): AppSettings {
  const stored = localStorage.getItem(STORAGE_KEYS.settings)

  const defaults: AppSettings = {
    selectedProvider: null,
    selectedTranscriptionModel: null,
    selectedFinetuneModel: null,
    customSystemPrompt: "",
    encryptionDerived: false,
    theme: "system",
    onboardingComplete: false,
  }

  if (!stored) return defaults

  try {
    return { ...defaults, ...JSON.parse(stored) }
  } catch {
    return defaults
  }
}

export function saveTranscript(transcript: Transcript): void {
  const transcripts = getTranscripts()
  const index = transcripts.findIndex((t) => t.id === transcript.id)

  if (index >= 0) {
    transcripts[index] = transcript
  } else {
    transcripts.push(transcript)
  }

  const key = getEncryptionKey()
  const encrypted = transcripts.map((t) => {
    const { audio, ...rest } = t
    return encryptData(rest, key)
  })

  localStorage.setItem(STORAGE_KEYS.transcripts, JSON.stringify(encrypted))
}

export function getTranscripts(): Transcript[] {
  const key = getEncryptionKey()
  const stored = localStorage.getItem(STORAGE_KEYS.transcripts)

  if (!stored) return []

  try {
    const encrypted: EncryptedData[] = JSON.parse(stored)
    return encrypted.map((enc) => decryptData(enc, key))
  } catch {
    return []
  }
}

export function saveFinetuning(finetune: FinetuneRequest): void {
  const finetunings = getFinetunings()
  const index = finetunings.findIndex((f) => f.id === finetune.id)

  if (index >= 0) {
    finetunings[index] = finetune
  } else {
    finetunings.push(finetune)
  }

  const key = getEncryptionKey()
  const encrypted = finetunings.map((f) => encryptData(f, key))
  localStorage.setItem(STORAGE_KEYS.finetunings, JSON.stringify(encrypted))
}

export function getFinetunings(): FinetuneRequest[] {
  const key = getEncryptionKey()
  const stored = localStorage.getItem(STORAGE_KEYS.finetunings)

  if (!stored) return []

  try {
    const encrypted: EncryptedData[] = JSON.parse(stored)
    return encrypted.map((enc) => decryptData(enc, key))
  } catch {
    return []
  }
}

export function exportAllData(): {
  settings: AppSettings
  providers: ProviderConfig[]
  transcripts: Transcript[]
  finetunings: FinetuneRequest[]
  exportDate: string
} {
  return {
    settings: getSettings(),
    providers: getProviders(),
    transcripts: getTranscripts(),
    finetunings: getFinetunings(),
    exportDate: new Date().toISOString(),
  }
}

export function importData(data: any): void {
  try {
    if (data.settings) saveSettings(data.settings)
    if (data.providers) {
      const providers = data.providers as ProviderConfig[]
      providers.forEach((p) => saveProvider(p))
    }
    if (data.transcripts) {
      const transcripts = data.transcripts as Transcript[]
      transcripts.forEach((t) => saveTranscript(t))
    }
    if (data.finetunings) {
      const finetunings = data.finetunings as FinetuneRequest[]
      finetunings.forEach((f) => saveFinetuning(f))
    }
  } catch (error) {
    throw new Error("Failed to import data")
  }
}

export function clearAllData(): void {
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key)
  })
  encryptionKey = null
}
