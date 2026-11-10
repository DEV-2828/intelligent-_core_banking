export function errorMessage(error: unknown, fallback = "Request failed") {
  if (error instanceof Error) return error.message;
  return fallback;
}
