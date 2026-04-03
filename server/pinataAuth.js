function getPinataAuthStrategies(env = process.env) {
  const strategies = [];
  const jwt = env.PINATA_JWT?.trim();
  if (jwt) {
    strategies.push({
      mode: "jwt",
      headers: { Authorization: `Bearer ${jwt}` },
    });
  }

  const apiKey = env.PINATA_API_KEY?.trim();
  const apiSecret = env.PINATA_API_SECRET?.trim();
  if (apiKey && apiSecret) {
    strategies.push({
      mode: "apiKey",
      headers: {
        pinata_api_key: apiKey,
        pinata_secret_api_key: apiSecret,
      },
    });
  }

  return strategies;
}

function buildPinataAuthHeaders(env = process.env) {
  return getPinataAuthStrategies(env)[0]?.headers ?? null;
}

function getPinataAuthMode(env = process.env) {
  return getPinataAuthStrategies(env)[0]?.mode ?? null;
}

function requirePinataAuthStrategies(env = process.env) {
  const strategies = getPinataAuthStrategies(env);
  if (!strategies.length) {
    throw new Error(
      "Pinata credentials are required. Set PINATA_JWT or PINATA_API_KEY and PINATA_API_SECRET."
    );
  }

  return strategies;
}

function requirePinataAuth(env = process.env) {
  return requirePinataAuthStrategies(env)[0].headers;
}

export {
  buildPinataAuthHeaders,
  getPinataAuthMode,
  getPinataAuthStrategies,
  requirePinataAuth,
  requirePinataAuthStrategies,
};
