// Frontend API Service
const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('hostel_auth_token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('hostel_auth_token', token);
}

export function removeAuthToken(): void {
  localStorage.removeItem('hostel_auth_token');
  localStorage.removeItem('hostel_user');
}

export function getStoredUser(): any | null {
  const data = localStorage.getItem('hostel_user');
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function setStoredUser(user: any): void {
  localStorage.setItem('hostel_user', JSON.stringify(user));
}

export async function apiRequest<T = any>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  body?: any
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({
    success: false,
    message: 'Invalid response from server',
  }));

  if (!response.ok) {
    if (response.status === 401) {
      removeAuthToken();
      // Only redirect if window is available
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        // window.location.reload();
      }
    }
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data as T;
}
