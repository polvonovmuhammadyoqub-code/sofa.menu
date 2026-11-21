import type { RequestHandler } from 'express';

const periodMs = 60_000;

function guestRateLimit(limit: number): RequestHandler {
  const active = new Map<string, { count: number; expiresAt: number }>();
  let nextSweep = 0;
  return (req, res, next) => {
    const now = Date.now();
    if (now >= nextSweep) {
      for (const [ip, current] of active) if (current.expiresAt <= now) active.delete(ip);
      nextSweep = now + periodMs;
    }

    const ip = req.ip || '';
    let window = active.get(ip);
    if (!window || window.expiresAt <= now) {
      if (!window && active.size >= 10_000) {
        res.status(429).json({ code: 'RATE_LIMIT', error: 'Keyinroq qayta urinib ko‘ring' });
        return;
      }
      window = { count: 0, expiresAt: now + periodMs };
      active.set(ip, window);
    }
    if (++window.count > limit) {
      res.set('Retry-After', String(Math.ceil((window.expiresAt - now) / 1000)));
      res.status(429).json({ code: 'RATE_LIMIT', error: 'Keyinroq qayta urinib ko‘ring' });
      return;
    }
    next();
  };
}

export const guestOrderRateLimit = guestRateLimit(16);
export const guestMenuEventRateLimit = guestRateLimit(90);
