import type { EnvConfig } from './env.js';

export function getCookieSecurityOptions(nodeEnv: EnvConfig['NODE_ENV']) {
  const isProduction = nodeEnv === 'production';
  return {
    secure: isProduction,
    sameSite: isProduction ? ('none' as const) : ('lax' as const),
  };
}
