/**
 * PII Encryption SDK
 *
 * Field-level encryption for personally identifiable information (PII).
 * Uses AES-256-GCM with key derivation for enhanced security.
 *
 * Features:
 * - AES-256-GCM encryption (authenticated encryption)
 * - Key derivation per user/field (prevents key reuse)
 * - Key rotation support with version tracking
 * - IV (initialization vector) per encryption
 * - Base64 encoding for storage
 *
 * Format: {iv}:{authTag}:{ciphertext} (all base64-encoded)
 */

import crypto from 'crypto';

/**
 * Encryption configuration
 */
export interface EncryptionConfig {
  masterKey: string; // Base64-encoded 32-byte key
  keyVersion: string; // e.g., "v1", "v2"
}

/**
 * Encrypted data format
 */
export interface EncryptedData {
  iv: string; // Base64-encoded IV
  authTag: string; // Base64-encoded authentication tag
  ciphertext: string; // Base64-encoded ciphertext
  keyVersion: string;
}

/**
 * PII Encryption Service
 */
export class PiiEncryption {
  private config: EncryptionConfig;
  private algorithm = 'aes-256-gcm';
  private ivLength = 16; // 128 bits
  private keyLength = 32; // 256 bits
  private saltLength = 32; // 256 bits

  constructor(config: EncryptionConfig) {
    this.config = config;
    this.validateMasterKey();
  }

  /**
   * Validate master key format and length
   */
  private validateMasterKey(): void {
    try {
      const keyBuffer = Buffer.from(this.config.masterKey, 'base64');
      if (keyBuffer.length !== this.keyLength) {
        throw new Error(
          `Master key must be ${this.keyLength} bytes (${this.keyLength * 8} bits), got ${keyBuffer.length} bytes`
        );
      }
    } catch (error) {
      throw new Error(`Invalid master key: ${error}`);
    }
  }

  /**
   * Derive encryption key for specific user and field
   * Uses PBKDF2 for key derivation with user/field-specific salt
   */
  private deriveKey(userId: string, fieldName: string): Buffer {
    const masterKeyBuffer = Buffer.from(this.config.masterKey, 'base64');

    // Create deterministic salt from userId + fieldName + keyVersion
    const saltString = `${userId}:${fieldName}:${this.config.keyVersion}`;
    const salt = crypto.createHash('sha256').update(saltString).digest();

    // Derive key using PBKDF2
    return crypto.pbkdf2Sync(masterKeyBuffer, salt, 100000, this.keyLength, 'sha256');
  }

  /**
   * Encrypt a field value
   */
  encrypt(value: string, userId: string, fieldName: string): string {
    if (!value) {
      return '';
    }

    try {
      // Derive field-specific key
      const key = this.deriveKey(userId, fieldName);

      // Generate random IV
      const iv = crypto.randomBytes(this.ivLength);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);

      // Encrypt
      let ciphertext = cipher.update(value, 'utf8', 'base64');
      ciphertext += cipher.final('base64');

      // Get authentication tag
      const authTag = cipher.getAuthTag().toString('base64');

      // Format: {iv}:{authTag}:{ciphertext}
      return `${iv.toString('base64')}:${authTag}:${ciphertext}`;
    } catch (error) {
      throw new Error(`Encryption failed: ${error}`);
    }
  }

  /**
   * Decrypt a field value
   */
  decrypt(encryptedValue: string, userId: string, fieldName: string): string {
    if (!encryptedValue) {
      return '';
    }

    try {
      // Parse encrypted data
      const parts = encryptedValue.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const [ivBase64, authTagBase64, ciphertext] = parts;

      // Decode components
      const iv = Buffer.from(ivBase64, 'base64');
      const authTag = Buffer.from(authTagBase64, 'base64');

      // Derive field-specific key
      const key = this.deriveKey(userId, fieldName);

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);

      // Decrypt
      let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
      plaintext += decipher.final('utf8');

      return plaintext;
    } catch (error) {
      throw new Error(`Decryption failed: ${error}`);
    }
  }

  /**
   * Encrypt an object with multiple PII fields
   */
  encryptObject(
    obj: Record<string, any>,
    userId: string,
    fieldsToEncrypt: string[]
  ): Record<string, string> {
    const encrypted: Record<string, string> = {};

    for (const field of fieldsToEncrypt) {
      if (obj[field] !== undefined && obj[field] !== null) {
        const value = typeof obj[field] === 'string' ? obj[field] : JSON.stringify(obj[field]);
        encrypted[`encrypted${field.charAt(0).toUpperCase() + field.slice(1)}`] = this.encrypt(
          value,
          userId,
          field
        );
      }
    }

    return encrypted;
  }

  /**
   * Decrypt an object with multiple PII fields
   */
  decryptObject(
    encryptedObj: Record<string, any>,
    userId: string,
    fieldMappings: Record<string, string> // { encryptedEmail: 'email' }
  ): Record<string, any> {
    const decrypted: Record<string, any> = {};

    for (const [encryptedField, originalField] of Object.entries(fieldMappings)) {
      if (encryptedObj[encryptedField]) {
        try {
          decrypted[originalField] = this.decrypt(encryptedObj[encryptedField], userId, originalField);
        } catch (error) {
          console.error(`Failed to decrypt field ${originalField}:`, error);
          decrypted[originalField] = null;
        }
      }
    }

    return decrypted;
  }

  /**
   * Re-encrypt data with new key version (for key rotation)
   */
  async rotateKey(
    encryptedValue: string,
    userId: string,
    fieldName: string,
    newConfig: EncryptionConfig
  ): Promise<string> {
    // Decrypt with old key
    const plaintext = this.decrypt(encryptedValue, userId, fieldName);

    // Encrypt with new key
    const newEncryption = new PiiEncryption(newConfig);
    return newEncryption.encrypt(plaintext, userId, fieldName);
  }

  /**
   * Generate a new master key
   */
  static generateMasterKey(): string {
    return crypto.randomBytes(32).toString('base64');
  }

  /**
   * Hash PII for verification (one-way)
   * Useful for deletion verification
   */
  hashForVerification(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }
}

/**
 * Create PII encryption instance from environment
 */
export function createPiiEncryption(config?: EncryptionConfig): PiiEncryption {
  const finalConfig = config || {
    masterKey: process.env.PII_MASTER_KEY || PiiEncryption.generateMasterKey(),
    keyVersion: process.env.PII_KEY_VERSION || 'v1',
  };

  return new PiiEncryption(finalConfig);
}

/**
 * Common PII field names
 */
export const PII_FIELDS = {
  EMAIL: 'email',
  PHONE: 'phone',
  ADDRESS: 'address',
  DATE_OF_BIRTH: 'dateOfBirth',
  NATIONAL_ID: 'nationalId',
  EMERGENCY_CONTACT: 'emergencyContact',
} as const;

/**
 * Field mappings for encryption/decryption
 */
export const PII_FIELD_MAPPINGS = {
  encryptedEmail: PII_FIELDS.EMAIL,
  encryptedPhone: PII_FIELDS.PHONE,
  encryptedAddress: PII_FIELDS.ADDRESS,
  encryptedDateOfBirth: PII_FIELDS.DATE_OF_BIRTH,
  encryptedNationalId: PII_FIELDS.NATIONAL_ID,
  encryptedEmergencyContact: PII_FIELDS.EMERGENCY_CONTACT,
} as const;

/**
 * Example usage:
 *
 * ```typescript
 * // Setup
 * const piiEncryption = createPiiEncryption({
 *   masterKey: process.env.PII_MASTER_KEY,
 *   keyVersion: 'v1'
 * });
 *
 * // Encrypt single field
 * const encryptedEmail = piiEncryption.encrypt('user@example.com', userId, 'email');
 *
 * // Decrypt single field
 * const email = piiEncryption.decrypt(encryptedEmail, userId, 'email');
 *
 * // Encrypt multiple fields
 * const encrypted = piiEncryption.encryptObject(
 *   { email: 'user@example.com', phone: '+1234567890' },
 *   userId,
 *   ['email', 'phone']
 * );
 *
 * // Decrypt multiple fields
 * const decrypted = piiEncryption.decryptObject(
 *   encrypted,
 *   userId,
 *   PII_FIELD_MAPPINGS
 * );
 * ```
 */
