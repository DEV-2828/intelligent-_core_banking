export async function postJson<T extends object = Record<string, unknown>>(url: string, body?: unknown, key?: string): Promise<T> {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...(key ? { "Idempotency-Key": key } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json().catch(() => { throw new Error("The service returned an unreadable response. Please retry."); });
  if (!response.ok) throw new Error(data.error ?? "The request failed. Please retry.");
  return data as T;
}
