import crypto from 'crypto';

export class SessionManager {
  private static token: string = crypto.randomBytes(6).toString('hex');
  private static pin: string = Math.floor(1000 + Math.random() * 9000).toString();
  private static createdAt: number = Date.now();

  static getToken(): string {
    return this.token;
  }

  static getPin(): string {
    return this.pin;
  }

  static validateToken(token?: string | null): boolean {
    if (!token) return false;
    return token === this.token;
  }

  static rotate(): void {
    this.token = crypto.randomBytes(6).toString('hex');
    this.pin = Math.floor(1000 + Math.random() * 9000).toString();
    this.createdAt = Date.now();
  }
}

