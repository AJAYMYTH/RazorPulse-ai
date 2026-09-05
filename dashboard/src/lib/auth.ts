export interface UserSession {
  id: string;
  name: string;
  email: string;
  merchant_id: string;
  company_name: string;
  role: 'owner' | 'admin' | 'viewer';
  created_at?: string;
}

export const DEMO_USER: UserSession = {
  id: 'usr_demo_apex_01',
  name: 'Ajay Kumar',
  email: 'demo@razorpulse.ai',
  merchant_id: 'mch_apex_gear_001',
  company_name: 'Apex Electronics & Tech Gear',
  role: 'owner',
};

export const TOKEN_KEY = 'razorpulse_auth_token';
export const USER_KEY = 'razorpulse_auth_user';

export function getStoredSession(): { token: string | null; user: UserSession | null } {
  if (typeof window === 'undefined') {
    return { token: null, user: null };
  }
  const token = localStorage.getItem(TOKEN_KEY);
  const userJson = localStorage.getItem(USER_KEY);
  let user: UserSession | null = null;
  if (userJson) {
    try {
      user = JSON.parse(userJson);
    } catch (_) {}
  }
  return { token, user };
}

export function setStoredSession(token: string, user: UserSession): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  // Sync to cookie for seamless persistence
  document.cookie = `${TOKEN_KEY}=${encodeURIComponent(token)}; path=/; max-age=604800; SameSite=Lax`;
  document.cookie = `${USER_KEY}=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=604800; SameSite=Lax`;
}

export function clearStoredSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
  document.cookie = `${USER_KEY}=; path=/; max-age=0; SameSite=Lax`;
}

export function isSessionValid(): boolean {
  if (typeof window === 'undefined') return false;
  const { token, user } = getStoredSession();
  return !!(token && user);
}
