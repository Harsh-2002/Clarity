import nacl from "tweetnacl"
import type { EncryptedData } from "./types"

/**
 * Derives a 32-byte key from a password using PBKDF2
 * For browser encryption, we use a simple approach with tweetnacl
 */
export async function deriveKeyFromPassword(password: string): Promise<Uint8Array> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)

  // Use SubtleCrypto for key derivation
  const importedKey = await crypto.subtle.importKey("raw", data, { name: "PBKDF2" }, false, ["deriveKey"])

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode("audio-transcription-app"),
      iterations: 100000,
      hash: "SHA-256",
    },
    importedKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  )

  const exported = await crypto.subtle.exportKey("raw", derivedKey)
  return new Uint8Array(exported)
}

/**
 * Encrypt JSON data using a 32-byte key
 */
export function encryptData(data: any, key: Uint8Array): EncryptedData {
  const keyUint8 = key.slice(0, 32)
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength)
  const message = new TextEncoder().encode(JSON.stringify(data))

  const encrypted = nacl.secretbox(message, nonce, keyUint8)

  return {
    ciphertext: Buffer.from(encrypted).toString("base64"),
    nonce: Buffer.from(nonce).toString("base64"),
    algorithm: "nacl",
  }
}

/**
 * Decrypt encrypted data using a 32-byte key
 */
export function decryptData(encrypted: EncryptedData, key: Uint8Array): any {
  try {
    const keyUint8 = key.slice(0, 32)
    const ciphertext = Buffer.from(encrypted.ciphertext, "base64")
    const nonce = Buffer.from(encrypted.nonce, "base64")

    const message = nacl.secretbox.open(ciphertext as any, nonce as any, keyUint8)

    if (!message) {
      throw new Error("Decryption failed")
    }

    return JSON.parse(new TextDecoder().decode(message))
  } catch (error) {
    throw new Error("Failed to decrypt data")
  }
}

/**
 * Generate a random encryption key
 */
export function generateRandomKey(): Uint8Array {
  return nacl.randomBytes(32)
}
