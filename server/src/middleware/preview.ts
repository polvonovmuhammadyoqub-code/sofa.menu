import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

const password = process.env.PREVIEW_PASSWORD;
const cookieName = 'sofa_preview';
const signature = () => createHmac('sha256', process.env.JWT_SECRET || '').update(password || '').digest('hex');
const equal = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};
export const previewAllowed = (cookie = '') => !password || cookie.split(';').some(part => equal(part.trim(), `${cookieName}=${signature()}`));

function destination(value: unknown) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) return '/';
  const url = new URL(value, 'https://sofa.invalid');
  if (url.origin !== 'https://sofa.invalid' || !/^\/(?:$|r\/[^/]+(?:\/(?:menu|reservation|contact|delivery))?\/?|login\/?|dashboard\/?|kitchen\/?|waiter\/?|super-admin\/?)$/.test(url.pathname)) return '/';
  return url.pathname + url.search;
}

export function previewGate(req: Request, res: Response, next: NextFunction) {
  if (!password || previewAllowed(req.headers.cookie)) return next();
  res.setHeader('Cache-Control', 'no-store');
  if (req.path === '/preview' && req.method === 'POST' && typeof req.body.password === 'string' && equal(req.body.password, password)) {
    res.cookie(cookieName, signature(), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 86400000 });
    return res.redirect(303, destination(req.body.returnTo));
  }
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Preview access required' });
  const returnTo = destination(req.originalUrl).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char] || char);
  return res.status(401).type('html').send(`<!doctype html><html lang="uz"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>SOFA preview</title><body style="background:#10100f;color:#f5f0e8;font:18px system-ui;display:grid;place-items:center;min-height:90vh"><form action="/preview" method="post" style="width:min(85vw,360px)"><h1 style="color:#c6a76a">SOFA</h1><p>Private demo — kirish parolini kiriting.</p><input type="hidden" name="returnTo" value="${returnTo}"><input name="password" type="password" required style="padding:12px;width:90%"><button style="margin-top:12px;padding:14px;background:#c6a76a;border:0">Kirish</button></form></body></html>`);
}
