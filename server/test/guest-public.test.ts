import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import jwt from 'jsonwebtoken';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import config from '../src/config';
import prisma from '../src/db';

describe('Restaurant guest pages and protected settings', () => {
  const tag = randomUUID();
  let server: ReturnType<ReturnType<typeof createApp>['listen']>;
  let origin: string;
  let tenant: string;
  let inactive: string;
  let dish: string;
  let owner: string;
  let token: string;
  let filename: string | undefined;

  beforeAll(async () => {
    const restaurant = await prisma.restaurant.create({
      data: {
        slug: tag,
        name: 'Guest restaurant',
        opening_hours: '24/7',
        categories: { create: { name: 'Seasonal', slug: 'seasonal' } },
        tables: { create: [{ table_number: '4' }, { table_number: '9', is_active: false }] },
      },
      include: { categories: true },
    });
    tenant = restaurant.id;
    inactive = (await prisma.restaurant.create({
      data: { slug: tag + '-inactive', name: 'Inactive restaurant', is_active: false },
    })).id;
    dish = (await prisma.menuItem.create({
      data: { restaurant_id: tenant, category_id: restaurant.categories[0].id, name: 'Seasonal pasta', price: 10000, is_available: false },
    })).id;
    owner = (await prisma.user.create({
      data: {
        email: tag + '@example.test',
        full_name: 'Guest API test owner',
        password_hash: 'unused',
        memberships: { create: { restaurant_id: tenant, role: 'RESTAURANT_OWNER' } },
      },
    })).id;
    token = jwt.sign({ id: owner }, config.jwtSecret);
    server = createApp().listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing test address');
    origin = 'http://127.0.0.1:' + address.port;
  });

  afterAll(async () => {
    if (server) await new Promise<void>(resolve => server.close(() => resolve()));
    await prisma.restaurant.deleteMany({ where: { slug: { in: [tag, tag + '-inactive'] } } });
    if (owner) await prisma.user.delete({ where: { id: owner } });
    if (filename) await rm(path.join(config.uploadsDir, filename), { force: true });
    await prisma.$disconnect();
  });

  it('serves an active menu to guests and restricts settings to the tenant', async () => {
    const result = await fetch(origin + '/api/restaurants/by-slug/' + tag);
    expect(result.status).toBe(200);
    const profile = await result.json();
    expect(profile.is_open).toBe(true);
    expect(profile.categories[0].menu_items[0].is_available).toBe(false);
    expect(profile.tables).toEqual([{ table_number: '4' }]);
    expect(profile).not.toHaveProperty('memberships');
    expect(profile).not.toHaveProperty('reservation_timezone');
    expect((await fetch(origin + '/api/restaurants/by-slug/' + tag + '-inactive')).status).toBe(404);
    expect((await fetch(origin + '/api/restaurants/' + tenant)).status).toBe(401);

    const update = (restaurantId: string, data: object) => fetch(origin + '/api/restaurants/' + restaurantId, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    expect((await update(inactive, { menu_ordering_enabled: false })).status).toBe(403);
    expect((await update(tenant, { delivery_fee: -10 })).status).toBe(400);
    expect((await update(tenant, { tagline_en: 'Seasonal cooking', gallery_images: ['https://example.test/pasta.webp'], menu_ordering_enabled: false })).status).toBe(200);
    const updated = await (await fetch(origin + '/api/restaurants/by-slug/' + tag)).json();
    expect(updated.menu_ordering_enabled).toBe(false);
    expect(updated.tagline_en).toBe('Seasonal cooking');
    expect(updated.gallery_images).toEqual(['https://example.test/pasta.webp']);
  });

  it('aggregates menu activity without persisting guest identifiers', async () => {
    const metric = (data: object) => fetch(origin + '/api/analytics/restaurants/' + tenant + '/menu-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    expect((await metric({})).status).toBe(204);
    expect((await metric({ itemId: dish })).status).toBe(204);
    expect((await metric({ itemId: 'from-another-tenant' })).status).toBe(404);
    expect((await metric({ customerId: 'unexpected' })).status).toBe(400);
    const stats = await (await fetch(origin + '/api/analytics/restaurants/' + tenant + '/stats', {
      headers: { Authorization: 'Bearer ' + token },
    })).json();
    expect(stats.menuViews).toBe(1);
    expect(stats.mostViewedDishes).toEqual([{ itemId: dish, views: 1 }]);
  });

  it('restricts uploads and validates the media signature', async () => {
    const upload = (bytes: Uint8Array<ArrayBuffer>, authorized = true) => {
      const data = new FormData();
      data.set('file', new Blob([bytes], { type: 'image/png' }), 'menu.png');
      return fetch(origin + '/api/uploads', {
        method: 'POST',
        headers: authorized ? { Authorization: 'Bearer ' + token } : {},
        body: data,
      });
    };
    const invalid = new TextEncoder().encode('invalid image');
    expect((await upload(invalid, false)).status).toBe(401);
    expect((await upload(invalid)).status).toBe(400);
    if (process.env.SUPABASE_URL || config.nodeEnv === 'production') return;
    const png = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+e/3kAAAAASUVORK5CYII=', 'base64'));
    const response = await upload(png);
    expect(response.status).toBe(200);
    const media = await response.json();
    filename = media.filename;
    const image = await fetch(origin + media.url);
    expect(image.status).toBe(200);
    expect(new Uint8Array(await image.arrayBuffer())).toEqual(png);
  });
});
