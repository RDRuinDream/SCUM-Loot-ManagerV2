

export interface User {
  id?: number;
  username: string;
  password?: string; // Only used for sending to API
  name?: string;
  email?: string;
  role?: 'admin' | 'user';
  is_active?: number;
  created_at?: number;
}

export interface SecurityLog {
  ip: string;
  attempts: number;
  lock_until: number;
}

export interface AccessLog {
    id: number;
    username: string;
    action: string;
    ip: string;
    timestamp: number;
}

// ⚠️ IMPORTANT: Replace this URL with your actual Cloudflare Worker URL
const API_BASE_URL = "https://scumauthworker.huimeng.qzz.io".replace(/\/+$/, ""); 

const TOKEN_KEY = "scum_jwt_token";

const getHeaders = (): Record<string, string> => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

// --- Public API ---

export const setupDatabase = async (): Promise<string> => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/setup`, { headers: getHeaders() });
        const text = await res.text();
        return res.ok ? text : "Setup Failed: " + text;
    } catch(e) { return "Setup failed: " + e; }
};

export const getUsers = async (): Promise<User[]> => {
  const res = await fetch(`${API_BASE_URL}/api/users`, { headers: getHeaders() });
  if (res.ok) return await res.json();
  throw new Error((await res.json()).error || "Failed to fetch users");
};

export const getSecurityLogs = async (): Promise<SecurityLog[]> => {
  const res = await fetch(`${API_BASE_URL}/api/logs`, { headers: getHeaders() });
  if (res.ok) return await res.json();
  throw new Error((await res.json()).error || "Failed to fetch logs");
};

export const getAccessHistory = async (): Promise<AccessLog[]> => {
    const res = await fetch(`${API_BASE_URL}/api/history`, { headers: getHeaders() });
    if (res.ok) return await res.json();
    throw new Error((await res.json()).error || "Failed to fetch history");
};

export const unlockIp = async (ip: string): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/logs/${encodeURIComponent(ip)}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return res.ok;
  } catch (e) { return false; }
};

export const addUser = async (user: User): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(user)
    });
    return res.ok;
  } catch (e) { return false; }
};

export const removeUser = async (username: string): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/users/${username}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return res.ok;
  } catch (e) { return false; }
};

export const toggleUserStatus = async (username: string, active: boolean): Promise<boolean> => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/users/${username}/status`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ active })
        });
        return res.ok;
    } catch(e) { return false; }
};

export const resetUserPassword = async (username: string, newPassword: string): Promise<boolean> => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/users/${username}/reset`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ newPassword })
        });
        return res.ok;
    } catch(e) { return false; }
};

export const revokeUserSessions = async (username: string): Promise<boolean> => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/users/${username}/sessions`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        return res.ok;
    } catch(e) { return false; }
};

// Returns object instead of boolean to convey error message
export const login = async (username: string, password: string): Promise<{ success: boolean, error?: string }> => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (res.ok) {
      const data = await res.json();
      sessionStorage.setItem(TOKEN_KEY, data.token);
      sessionStorage.setItem("scum_user_info", JSON.stringify(data.user));
      return { success: true };
    }
    
    const errData = await res.json();
    return { success: false, error: errData.error || "Login Failed" };
  } catch (e: any) { 
      console.error("Login error", e); 
      return { success: false, error: e.message || "Network Error" }; 
  }
};

export const logout = async () => {
  try {
      await fetch(`${API_BASE_URL}/api/logout`, { method: 'POST', headers: getHeaders() });
  } catch(e) {}
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem("scum_user_info");
  window.location.reload(); 
};

export const checkSession = async (): Promise<boolean> => {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) return false;
  try {
    const headers: Record<string, string> = { 'Authorization': `Bearer ${token}` };
    const res = await fetch(`${API_BASE_URL}/api/me`, { headers });
    if (!res.ok) {
        // If 401/403, token is invalid, clear it
        sessionStorage.removeItem(TOKEN_KEY);
        return false;
    }
    return true;
  } catch (e) { return false; }
};

export const getCurrentUser = () => {
  const info = sessionStorage.getItem("scum_user_info");
  return info ? JSON.parse(info) : null;
};
