import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 12 bytes standard for AES-GCM
const TAG_LENGTH = 16; // 16 bytes standard tag length

/**
 * Gets or derives a 32-byte (256-bit) encryption key.
 * Prioritizes process.env.FINGERPRINT_ENCRYPTION_KEY (hashed if not exactly 32 bytes/64 hex chars).
 * Falls back to process.env.AUTH_SECRET (hashed to 32 bytes).
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env.FINGERPRINT_ENCRYPTION_KEY;
  if (envKey) {
    // If it's a 64-character hex string (32 bytes), parse it directly
    if (/^[0-9a-fA-F]{64}$/.test(envKey)) {
      return Buffer.from(envKey, "hex");
    }
    // Otherwise, hash the string to guarantee a 32-byte output
    return crypto.createHash("sha256").update(envKey).digest();
  }

  // Fallback to hashing the AUTH_SECRET environment variable
  const fallbackKey = process.env.AUTH_SECRET || "default-fallback-barangay-secret";
  return crypto.createHash("sha256").update(fallbackKey).digest();
}

/**
 * Encrypts a fingerprint template using AES-256-GCM.
 * Output format: "iv_hex:ciphertext_hex:tag_hex"
 */
export function encryptTemplate(plaintext: string): string {
  if (!plaintext) return "";
  
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let ciphertext = cipher.update(plaintext, "utf8", "hex");
  ciphertext += cipher.final("hex");
  
  const tag = cipher.getAuthTag();
  
  return `${iv.toString("hex")}:${ciphertext}:${tag.toString("hex")}`;
}

/**
 * Decrypts an AES-256-GCM encrypted fingerprint template.
 * If the template is unencrypted (legacy data), returns the input as-is.
 */
export function decryptTemplate(encryptedValue: string): string {
  if (!encryptedValue) return "";

  // Legacy check: unencrypted templates are raw base64 strings (contain no colons)
  const parts = encryptedValue.split(":");
  if (parts.length !== 3) {
    return encryptedValue;
  }

  const [ivHex, ciphertextHex, tagHex] = parts;

  // Validate format to ensure they are valid hex strings of the correct lengths
  if (ivHex.length !== IV_LENGTH * 2 || tagHex.length !== TAG_LENGTH * 2) {
    return encryptedValue;
  }

  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const ciphertext = Buffer.from(ciphertextHex, "hex");
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString("utf8");
  } catch (error) {
    console.error("[decryptTemplate] Decryption failed, returning value as-is for fallback compatibility:", error);
    return encryptedValue;
  }
}
