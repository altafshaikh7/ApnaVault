import crypto from 'crypto';

export class TokenService {
  /**
   * Generates a cryptographically secure random token in hex format.
   * Default 32 bytes gives a 64-character hex string.
   */
  public static generateRandomToken(bytes = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }

  /**
   * Computes the SHA-256 hash of a token for secure database storage.
   */
  public static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
