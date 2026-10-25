export interface User {
  id: string;
  name: string;
  email: string;
  isEmailVerified: boolean;
  avatarUrl?: string;
  phone?: string;
  timezone?: string;
  createdAt: string;
}
