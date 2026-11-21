import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

describe('guest-only service', () => {
  const password = 'test-only-guest-preview-password';
  let server: Server;
  let url: string;
  let cookie: string;

  beforeAll(async () => {
    vi.stubEnv('PREVIEW_PASSWORD', password);
    vi.stubEnv('JWT_SECRET', 'test-only-guest-preview-signing-key');
    const { createApp } = await import('../src/app');
    await new Promise<void>((resolve) => {
      server = createApp({ guestOnly: true }).listen(0, '127.0.0.1', resolve);
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Guest preview did not start');
    url = 'http://127.0.0.1:' + address.port;
    const unlock = await fetch(url + '/preview', {
      method: 'POST',
      body: new URLSearchParams({ password, returnTo: '/?table=12&dish=pilaf' }),
      redirect: 'manual',
    });
    expect(unlock.status).toBe(303);
    expect(unlock.headers.get('location')).toBe('/?table=12&dish=pilaf');
    cookie = unlock.headers.get('set-cookie')?.split(';')[0] ?? '';
    expect(cookie).toMatch(/^sofa_preview=/);
  });

  afterAll(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
    vi.unstubAllEnvs();
  });

  it('keeps root and legacy table QR query parameters through preview and restaurant redirects', async () => {
    const locked = await fetch(url + '/?table=12&dish=pilaf', { redirect: 'manual' });
    expect(locked.status).toBe(401);
    expect(await locked.text()).toContain('value="/?table=12&amp;dish=pilaf"');

    for (const [entry, slug] of [['/', 'sofa-signature'], ['/r/second-restaurant', 'second-restaurant']]) {
      const response = await fetch(url + entry + '?table=12&dish=pilaf', { headers: { cookie }, redirect: 'manual' });
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBe('/r/' + slug + '/menu?table=12&dish=pilaf');
    }
  });

  it('rejects all staff pages even with a valid preview cookie', async () => {
    const routes = ['/dashboard', '/login', '/kitchen', '/waiter', '/super-admin', '/dashboard/reports'];
    for (const route of routes) {
      expect((await fetch(url + route)).status).toBe(404);
      const unlocked = await fetch(url + route, { headers: { cookie } });
      expect(unlocked.status).toBe(404);
      expect(await unlocked.text()).not.toContain('id="root"');
    }
  });

  it('does not mount staff routes or booking forms in the guest app', async () => {
    for (const route of ['/api/auth/me', '/api/super-admin/stats', '/api/orders/restaurants/test/list',
      '/api/restaurants/test', '/api/analytics/restaurants/test/stats', '/r/sofa-signature/reservation',
      '/r/sofa-signature/delivery', '/demo/chef.mp4']) {
      expect((await fetch(url + route, { headers: { cookie } })).status).toBe(404);
    }
  });
});
