// фейковый SMS: просто лог в консоль и в memory-store
const pendingCodes = new Map<string, { code: string; expiresAt: number }>();

export const sendCodeToPhone = (phone: string) => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const ttl = 5 * 60 * 1000; // 5 минут
  pendingCodes.set(phone, { code, expiresAt: Date.now() + ttl });
  console.log(`[SMS SERVICE] Code for ${phone}: ${code} (valid 5 min)`);
  return code;
};

export const verifyCode = (phone: string, code: string) => {
  const entry = pendingCodes.get(phone);
  if (!entry) return false;
  if (entry.expiresAt < Date.now()) {
    pendingCodes.delete(phone);
    return false;
  }
  const ok = entry.code === code;
  if (ok) pendingCodes.delete(phone);
  return ok;
};
