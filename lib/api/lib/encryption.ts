import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

import { keystore } from './keystore';

function getEncryptionKey(): Buffer {
    return keystore.getEncryptionKey();
}

/**
 * Encrypt a plaintext string using AES-256-GCM
 * Returns format: iv:authTag:ciphertext (all hex encoded)
 */
export function encrypt(plaintext: string): string {
    const key = getEncryptionKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt a ciphertext string encrypted with encrypt()
 */
export function decrypt(ciphertext: string): string {
    const key = getEncryptionKey();
    const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':');

    if (!ivHex || !authTagHex || !encryptedHex) {
        throw new Error('Invalid ciphertext format');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    return decipher.update(encrypted) + decipher.final('utf8');
}
