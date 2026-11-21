const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('sofa_token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('sofa_token', token);
}

export function removeAuthToken(): void {
  localStorage.removeItem('sofa_token');
}

export async function request<T>(endpoint: string, options: RequestInit = {}, guest = false): Promise<T> {
  const token = guest ? null : getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = 'Xatolik yuz berdi';
    try {
      const errData = await response.json();
      errorMsg = errData.error || errData.message || errorMsg;
    } catch {
      // fallback
    }
    throw Object.assign(new Error(errorMsg), { status: response.status });
  }

  return response.json();
}
