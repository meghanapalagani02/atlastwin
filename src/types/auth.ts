export type UserRole = 'CISO' | 'Security Analyst' | 'Auditor';

export type AuthMethod = 'password' | 'sso' | 'hardware-key' | 'demo';

export interface UserSession {
  name: string;
  email: string;
  role: UserRole;
  initials: string;
  authMethod: AuthMethod;
}

export function deriveDisplayNameFromEmail(email: string): string {
  const localPart = email.split('@')[0]?.trim() ?? '';
  if (!localPart) return 'Analyst';
  const parts = localPart
    .split(/[._-]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return 'Analyst';
  return parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export function deriveInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  if (words.length === 1 && words[0].length >= 2) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0]?.[0] ?? 'A').toUpperCase();
}
