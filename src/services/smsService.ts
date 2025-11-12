const pendingCodes = new Map<string, { code: string; expiresAt: number; canResendAt: number }>();

export const sendCodeToPhone = (phone: string) => {
  const now = Date.now();
  const existing = pendingCodes.get(phone);
  if (existing && now < existing.canResendAt) {
    throw new Error(`Подождите ${Math.ceil((existing.canResendAt - now)/1000)} сек`);
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const ttl = 5 * 60 * 1000;
  const resendDelay = 60 * 1000; // 1 минута

  pendingCodes.set(phone, {
    code,
    expiresAt: now + ttl,
    canResendAt: now + resendDelay
  });

  console.log(`[SMS] Code for ${phone}: ${code}`);
  return code;
};