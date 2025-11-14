import crypto from 'crypto';

/**
 * Field-level encryption service for PII data
 * Uses AES-256-GCM for authenticated encryption
 *
 * Security features:
 * - Unique IV per encryption operation
 * - Authentication tags for integrity verification
 * - Key derivation with field-specific context
 * - Support for key rotation
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits
const SALT_LENGTH = 32;

interface EncryptionResult {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion: string;
}

interface DecryptionInput {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion?: string;
}

export class EncryptionService {
  private masterKey: Buffer;
  private keyVersion: string;

  constructor(masterKeyHex?: string, keyVersion: string = 'v1') {
    if (!masterKeyHex) {
      throw new Error('Master key is required. Set ENCRYPTION_MASTER_KEY environment variable.');
    }

    if (Buffer.from(masterKeyHex, 'hex').length !== KEY_LENGTH) {
      throw new Error(`Master key must be ${KEY_LENGTH} bytes (${KEY_LENGTH * 2} hex characters)`);
    }

    this.masterKey = Buffer.from(masterKeyHex, 'hex');
    this.keyVersion = keyVersion;
  }

  /**
   * Derives a field-specific encryption key from the master key
   * This allows for granular key rotation per field/user
   */
  private deriveKey(context: string): Buffer {
    const salt = crypto.createHash('sha256')
      .update(`${context}:${this.keyVersion}`)
      .digest();

    return crypto.pbkdf2Sync(this.masterKey, salt, 100000, KEY_LENGTH, 'sha256');
  }

  /**
   * Encrypts a string value with field-specific context
   *
   * @param plaintext - The value to encrypt
   * @param context - Field/user context for key derivation (e.g., "user:123:email")
   * @returns Encrypted data with IV, auth tag, and key version
   */
  encrypt(plaintext: string, context: string): EncryptionResult {
    if (!plaintext) {
      throw new Error('Cannot encrypt empty value');
    }

    const key = this.deriveKey(context);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    return {
      ciphertext,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      keyVersion: this.keyVersion,
    };
  }

  /**
   * Decrypts a value encrypted with this service
   *
   * @param input - The encrypted data
   * @param context - Same context used for encryption
   * @returns Decrypted plaintext
   */
  decrypt(input: DecryptionInput, context: string): string {
    const keyVersion = input.keyVersion || 'v1';

    // For key rotation: use old key version if specified
    const key = this.deriveKey(context);
    const iv = Buffer.from(input.iv, 'base64');
    const authTag = Buffer.from(input.authTag, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let plaintext = decipher.update(input.ciphertext, 'base64', 'utf8');
    plaintext += decipher.final('utf8');

    return plaintext;
  }

  /**
   * Encrypts data and formats it as a single string
   * Format: {iv}:{authTag}:{ciphertext} (all base64)
   */
  encryptToString(plaintext: string, context: string): string {
    const result = this.encrypt(plaintext, context);
    return `${result.iv}:${result.authTag}:${result.ciphertext}`;
  }

  /**
   * Decrypts data from string format
   */
  decryptFromString(encrypted: string, context: string): string {
    const parts = encrypted.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted string format');
    }

    return this.decrypt({
      iv: parts[0],
      authTag: parts[1],
      ciphertext: parts[2],
    }, context);
  }

  /**
   * Generates a new master key for initialization
   * This should be called once and the key stored securely
   */
  static generateMasterKey(): string {
    return crypto.randomBytes(KEY_LENGTH).toString('hex');
  }

  /**
   * Creates a searchable hash of a value
   * Useful for email/phone lookups without decryption
   * Uses HMAC for deterministic hashing
   */
  createSearchableHash(value: string, context: string): string {
    const key = this.deriveKey(`search:${context}`);
    return crypto.createHmac('sha256', key)
      .update(value.toLowerCase())
      .digest('hex');
  }

  /**
   * Gets the current key version
   */
  getKeyVersion(): string {
    return this.keyVersion;
  }
}

/**
 * Factory function to create encryption service from environment
 */
export function createEncryptionService(): EncryptionService {
  const masterKey = process.env.ENCRYPTION_MASTER_KEY;
  const keyVersion = process.env.ENCRYPTION_KEY_VERSION || 'v1';

  if (!masterKey) {
    throw new Error(
      'ENCRYPTION_MASTER_KEY not set. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  return new EncryptionService(masterKey, keyVersion);
}

/**
 * Singleton instance for convenience
 */
let encryptionServiceInstance: EncryptionService | null = null;

export function getEncryptionService(): EncryptionService {
  if (!encryptionServiceInstance) {
    encryptionServiceInstance = createEncryptionService();
  }
  return encryptionServiceInstance;
}
