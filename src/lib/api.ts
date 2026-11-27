export class ApiError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code = '') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

async function request<T>(method: string, url: string, body?: unknown, init?: RequestInit): Promise<T> {
  const isRaw = body instanceof Blob || body instanceof ArrayBuffer;
  let res: Response;
  try {
    res = await fetch(`/api${url}`, {
      method,
      credentials: 'same-origin',
      headers: body !== undefined && !isRaw ? { 'Content-Type': 'application/json' } : undefined,
      body: body === undefined ? undefined : isRaw ? (body as BodyInit) : JSON.stringify(body),
      ...init,
    });
  } catch {
    throw new ApiError('Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.', 0, 'NETWORK');
  }
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json().catch(() => ({})) : null;
  if (!res.ok) {
    const msg = (data && (data as { error?: string }).error) || `İstek başarısız (${res.status})`;
    const code = (data && (data as { code?: string }).code) || String(res.status);
    if (res.status === 401 && code === 'UNAUTHORIZED' && onUnauthorized) onUnauthorized();
    throw new ApiError(msg, res.status, code);
  }
  return data as T;
}

export const api = {
  get: <T>(url: string) => request<T>('GET', url),
  post: <T>(url: string, body?: unknown) => request<T>('POST', url, body ?? {}),
  put: <T>(url: string, body?: unknown) => request<T>('PUT', url, body ?? {}),
  del: <T>(url: string) => request<T>('DELETE', url),
  upload: async (file: Blob, name = 'dosya'): Promise<{ url: string; size: number }> => {
    const res = await fetch('/api/files', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': file.type || 'application/octet-stream', 'X-File-Name': encodeURIComponent(name) },
      body: file,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(data.error || 'Yükleme başarısız', res.status, data.code);
    return data;
  },
};

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));
