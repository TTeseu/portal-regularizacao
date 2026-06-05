const EXPECTED_PRODUCTION_CALLBACK = "https://portal-regularizacao.vercel.app/api/auth/callback/google";

function filled(value?: string) {
  return typeof value === "string" && value.trim().length > 0;
}

export function getAuthEnvStatus() {
  const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const nextAuthUrl = process.env.NEXTAUTH_URL?.trim();
  const nextAuthSecret = process.env.NEXTAUTH_SECRET?.trim() || process.env.AUTH_SECRET?.trim();
  const superAdminEmails = process.env.SUPER_ADMIN_EMAILS?.trim();

  return {
    googleClientId,
    googleClientSecret,
    nextAuthUrl,
    nextAuthSecret,
    superAdminEmails,
    googleConfigured: filled(googleClientId) && filled(googleClientSecret),
    nextAuthConfigured: filled(nextAuthSecret),
    expectedProductionCallback: EXPECTED_PRODUCTION_CALLBACK
  };
}

export function logAuthEnvStatus(context: string) {
  const status = getAuthEnvStatus();

  if (!filled(status.googleClientId)) {
    console.warn(`[auth:${context}] GOOGLE_CLIENT_ID nao configurado.`);
  }
  if (!filled(status.googleClientSecret)) {
    console.warn(`[auth:${context}] GOOGLE_CLIENT_SECRET nao configurado.`);
  }
  if (!filled(status.nextAuthUrl)) {
    console.warn(`[auth:${context}] NEXTAUTH_URL nao configurado. Callback esperado em producao: ${EXPECTED_PRODUCTION_CALLBACK}`);
  } else if (status.nextAuthUrl !== "https://portal-regularizacao.vercel.app" && process.env.VERCEL_ENV === "production") {
    console.warn("[auth:%s] NEXTAUTH_URL difere do dominio principal de producao.", context);
  }
  if (!filled(status.nextAuthSecret)) {
    console.warn(`[auth:${context}] NEXTAUTH_SECRET/AUTH_SECRET nao configurado.`);
  }
  if (!filled(status.superAdminEmails)) {
    console.warn("[auth:%s] SUPER_ADMIN_EMAILS nao configurado. O fallback jabasff159@gmail.com continua ativo no codigo.", context);
  }

  return status;
}

export function isGoogleAuthConfigured() {
  return getAuthEnvStatus().googleConfigured;
}
