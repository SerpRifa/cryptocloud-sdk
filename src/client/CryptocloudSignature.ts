import crypto from 'node:crypto';

export const computeHmac = (secret: string, body: string): string => {
  return crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex');
};

export const verifySignature = (secret: string, body: string, providedSignature: string | undefined): boolean => {
  if (!providedSignature) return false;
  const expected = computeHmac(secret, body);
  // timing-safe compare
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(providedSignature, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

