import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export class PasswordService {
  /**
   * Hashes a plaintext password using bcrypt with 12 salt rounds.
   */
  public static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  /**
   * Compares a candidate plaintext password against an existing hash.
   */
  public static async verifyPassword(candidatePassword: string, storedHash: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, storedHash);
  }
}
