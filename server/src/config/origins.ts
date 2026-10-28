export function getAllowedOrigins(clientUrl: string, frontendUrl: string): string[] {
  return Array.from(new Set([clientUrl, frontendUrl].map((url) => new URL(url).origin)));
}
