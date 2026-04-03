function buildPinataAuthHeaders(env = process.env) {
  const jwt = env.PINATA_JWT?.trim();
  if (jwt) {
    return { Authorization: `Bearer ${jwt}` };
  }

  const apiKey = env.PINATA_API_KEY?.trim();
  const apiSecret = env.PINATA_API_SECRET?.trim();
  if (apiKey && apiSecret) {
    return {
      pinata_api_key: apiKey,
      pinata_secret_api_key: apiSecret,
    };
  }

  return null;
}

function getPinataAuthMode(env = process.env) {
  if (env.PINATA_JWT?.trim()) {
    return "jwt";
  }

  if (env.PINATA_API_KEY?.trim() && env.PINATA_API_SECRET?.trim()) {
    return "apiKey";
  }

  return null;
}

function requirePinataAuth(env = process.env) {
  const headers = buildPinataAuthHeaders(env);
  if (!headers) {
    throw new Error(
      "Pinata credentials are required. Set PINATA_JWT or PINATA_API_KEY and PINATA_API_SECRET."
    );
  }

  return headers;
}

export { buildPinataAuthHeaders, getPinataAuthMode, requirePinataAuth };
