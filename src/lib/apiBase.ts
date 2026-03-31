function normalizeApiBase(rawBase: string) {
  const trimmed = rawBase.replace(/\/$/, "");
  if (!trimmed) {
    return "";
  }

  if (trimmed.endsWith("/api")) {
    return trimmed;
  }

  return `${trimmed}/api`;
}

const configuredBase =
  import.meta.env.VITE_SECURE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  "";

export const SECURE_API_BASE = normalizeApiBase(configuredBase);
