const AUTH_STORAGE_KEY = "mti_auth_user";

const getAuthHeaders = (): Record<string, string> => {
  try {
    const raw = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return {};
    const user = JSON.parse(raw);
    return user?.username ? { "X-Username": user.username } : {};
  } catch {
    return {};
  }
};

export const apiFetch = async (
  url: string,
  options: RequestInit = {},
): Promise<Response> => {
  return fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  });
};

export const apiGet = async <T>(url: string): Promise<T> => {
  const response = await apiFetch(url);
  return response.json();
};

export const apiPost = async <T>(url: string, body: unknown): Promise<T> => {
  const response = await apiFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return response.json();
};

export const apiPut = async <T>(url: string, body: unknown): Promise<T> => {
  const response = await apiFetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return response.json();
};

export const apiDelete = async (url: string): Promise<Response> => {
  return apiFetch(url, { method: "DELETE" });
};
