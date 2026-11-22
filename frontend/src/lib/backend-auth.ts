import crypto from "crypto";

export function getBackendAuthSecret(): string | null {
  const secret = process.env.BACKEND_AUTH_SECRET?.trim();
  return secret || null;
}

export function hasSignedBackendAuth(): boolean {
  return getBackendAuthSecret() !== null;
}

export function buildBackendAuthHeaders(
  userId: string,
  teamId?: string | null,
): Record<string, string> {
  const normalizedTeamId = teamId?.trim() || null;
  const secret = getBackendAuthSecret();
  if (!secret) {
    return {
      "x-pixelclip-user-id": userId,
      ...(normalizedTeamId ? { "x-pixelclip-team-id": normalizedTeamId } : {}),
    };
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const payload = normalizedTeamId
    ? `${userId}:${normalizedTeamId}:${timestamp}`
    : `${userId}:${timestamp}`;
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");

  return {
    "x-pixelclip-user-id": userId,
    ...(normalizedTeamId ? { "x-pixelclip-team-id": normalizedTeamId } : {}),
    "x-pixelclip-ts": timestamp,
    "x-pixelclip-signature": signature,
  };
}
