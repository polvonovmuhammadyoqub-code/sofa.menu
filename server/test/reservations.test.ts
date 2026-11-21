import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import jwt from 'jsonwebtoken';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import createApp from '../src/app.js';
import config from '../src/config.js';
import prisma from '../src/db.js';
import { restaurantIsOpen, restaurantReservationTimes, reservationDateValid } from '../src/services/reservationHours.js';
import { deliverReservationNotifications } from '../src/services/reservationNotifications.js';

const hours = {
  opening_hours: 'Dushanba - Yakshanba: 11:00 — 23:30',
  reservation_hours: null,
  reservation_timezone: 'Asia/Tashkent',
};

describe('restaurant booking hours', () => {
  it('calculates the current day and filters elapsed times in the restaurant timezone', () => {
    const now = new Date('2026-11-20T18:30:00Z');
    expect(restaurantIsOpen(hours, now)).toBe(false);
    expect(restaurantReservationTimes(hours, '2026-11-20', now)).toEqual([]);
    expect(restaurantReservationTimes(hours, '2026-11-21', now).slice(0, 2)).toEqual(['11:00', '11:30']);
    expect(reservationDateValid('2026-02-29', '2026-02-20')).toBe(false);
    expect(reservationDateValid('2027-01-01', '2026-01-01')).toBe(false);
  });

  it('handles overnight hours from the previous weekday and limits booking hours to opening hours', () => {
    const now = new Date('2026-11-20T19:10:00Z'); // Saturday 00:10 in Uzbekistan
    const overnight = { ...hours, opening_hours: 'Fri: 22:00-01:00' };
    expect(restaurantIsOpen(overnight, now)).toBe(true);
    expect(restaurantReservationTimes(overnight, '2026-11-21', now)).toEqual(['00:30']);
    const custom = { ...hours, reservation_hours: '{"6":[["10:30","12:00"]]}' };
    expect(restaurantReservationTimes(custom, '2026-11-21', now)).toEqual(['11:00', '11:30']);
    expect(restaurantReservationTimes({ ...hours, opening_hours: 'By appointment' }, '2026-11-21', now)).toEqual([]);
  });
});

describe('guest reservations and staff authorization', () => {
  let server: Server;
  let origin: string;
  let restaurantId: string;
  let restaurantSlug: string;
  let otherId: string;
  let ownerId: string;
  let waiterId: string;
  let ownerToken: string;
  let waiterToken: string;
  let areaId: string;

  beforeAll(async () => {
    const nonce = randomUUID();
    const [restaurant, otherRestaurant, owner, waiter] = await Promise.all([
      prisma.restaurant.create({
        data: { slug: 'reservation-' + nonce, name: 'Reservation Cafe', opening_hours: hours.opening_hours },
      }),
      prisma.restaurant.create({ data: { slug: 'other-' + nonce, name: 'Other Cafe' } }),
      prisma.user.create({ data: { email: 'owner-' + nonce + '@example.test', full_name: 'Owner', role: 'RESTAURANT_OWNER', password_hash: 'test-only' } }),
      prisma.user.create({ data: { email: 'waiter-' + nonce + '@example.test', full_name: 'Waiter', role: 'WAITER', password_hash: 'test-only' } }),
    ]);
    restaurantId = restaurant.id;
    restaurantSlug = restaurant.slug;
    otherId = otherRestaurant.id;
    ownerId = owner.id;
    waiterId = waiter.id;
    await prisma.restaurantMembership.createMany({ data: [
      { user_id: owner.id, restaurant_id: restaurant.id, role: 'RESTAURANT_OWNER' },
      { user_id: waiter.id, restaurant_id: restaurant.id, role: 'WAITER' },
    ] });
    const area = await prisma.restaurantArea.create({ data: { restaurant_id: restaurant.id, name: 'Test Hall' } });
    areaId = area.id;
    ownerToken = jwt.sign({ id: owner.id, restaurantId: restaurant.id }, config.jwtSecret);
    waiterToken = jwt.sign({ id: waiter.id, restaurantId: restaurant.id }, config.jwtSecret);
    server = createApp().listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server.once('listening', resolve));
    origin = 'http://127.0.0.1:' + (server.address() as AddressInfo).port;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.restaurant.deleteMany({ where: { id: { in: [restaurantId, otherId].filter(Boolean) } } });
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, waiterId].filter(Boolean) } } });
    await prisma.$disconnect();
  });

  async function api(path: string, options: { method?: string; token?: string; body?: unknown; secret?: string } = {}) {
    const headers: Record<string, string> = {};
    if (options.token) headers.Authorization = 'Bearer ' + options.token;
    if (options.secret) headers['X-Telegram-Bot-Api-Secret-Token'] = options.secret;
    if (options.body) headers['Content-Type'] = 'application/json';
    return fetch(origin + '/api' + path, {
      method: options.method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  }

  async function validSubmission() {
    const response = await api('/restaurants/' + restaurantId + '/areas');
    expect(response.status).toBe(200);
    const { today, areas } = await response.json();
    expect(areas).toEqual([{ id: areaId, name: 'Test Hall', name_en: null, name_ru: null }]);
    const tomorrow = new Date(Date.parse(today + 'T00:00:00Z') + 86_400_000).toISOString().slice(0, 10);
    const times = await api('/restaurants/' + restaurantId + '/reservation-times?date=' + tomorrow);
    expect((await times.json()).times).toContain('18:30');
    return {
      first_name: 'Guest',
      last_name: 'One',
      phone: '+998 90 123 45 67',
      guest_count: 4,
      reservation_date: tomorrow,
      reservation_time: '18:30',
      area_id: areaId,
      request_id: randomUUID(),
    };
  }

  it('validates time, phone and tenant areas, then saves a pending guest request only once', async () => {
    const path = '/restaurants/' + restaurantId + '/reservations';
    const body = await validSubmission();
    const submit = (payload: typeof body) => api(path, { method: 'POST', body: payload });

    for (const [invalid, code] of [
      [{ ...body, reservation_time: '09:00' }, 'UNAVAILABLE_TIME'],
      [{ ...body, area_id: 'wrong-room' }, 'INVALID_AREA'],
      [{ ...body, phone: 'abc' }, 'INVALID_INPUT'],
    ] as const) {
      const result = await submit(invalid);
      expect(result.status).toBe(400);
      expect((await result.json()).code).toBe(code);
    }

    const responses = await Promise.all([submit(body), submit(body)]);
    expect(responses.map((result) => result.status).sort()).toEqual([200, 201]);
    const [first, second] = await Promise.all(responses.map((result) => result.json()));
    expect(first).toEqual(second);
    expect(first).toEqual({ reservation_number: expect.stringMatching(/^SOFA-[A-F0-9]{16}$/), status: 'PENDING' });
    expect((await submit({ ...body, guest_count: 5 })).status).toBe(409);
    expect(await prisma.reservation.count({ where: { restaurant_id: restaurantId, request_id: body.request_id } })).toBe(1);

    const staff = '/admin/restaurants/' + restaurantId + '/reservations';
    expect((await api(staff)).status).toBe(401);
    expect((await api(staff, { token: waiterToken })).status).toBe(403);
    expect((await api('/admin/restaurants/' + otherId + '/reservations', { token: ownerToken })).status).toBe(403);
    const records = await (await api(staff, { token: ownerToken })).json();
    expect(records).toEqual([expect.objectContaining({ status: 'PENDING', phone: '+998901234567', notification_status: 'NOT_CONFIGURED' })]);
    const update = (status: string) => api(staff + '/' + records[0].id + '/status', { method: 'PATCH', token: ownerToken, body: { status } });
    expect((await update('COMPLETED')).status).toBe(409);
    expect((await update('CONFIRMED')).status).toBe(200);
    expect((await update('CONFIRMED')).status).toBe(200);
    expect((await update('COMPLETED')).status).toBe(200);
    expect(await prisma.auditLog.count({ where: { restaurant_id: restaurantId, action: 'RESERVATION_STATUS' } })).toBe(2);
  });

  it('persists failed notifications, retries and authenticates Telegram callbacks', async () => {
    const secret = 's'.repeat(32);
    vi.stubEnv('TELEGRAM_BOT_TOKEN', '123:test-token');
    vi.stubEnv('TELEGRAM_WEBHOOK_SECRET', secret);
    vi.stubEnv('TELEGRAM_DESTINATIONS_JSON', JSON.stringify({
      [restaurantSlug]: { chat_id: '-1001234567890', staff_user_ids: ['12345'] },
    }));
    const originalFetch = fetch;
    const telegramCalls: { method: string; body: Record<string, unknown> }[] = [];
    let healthy = false;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (!url.startsWith('https://api.telegram.org/')) return originalFetch(input, init);
      telegramCalls.push({ method: url.split('/').pop()!, body: JSON.parse(String(init?.body)) });
      return Response.json({ ok: healthy }, { status: healthy ? 200 : 503 });
    });

    const body = await validSubmission();
    const response = await api('/restaurants/' + restaurantId + '/reservations', { method: 'POST', body });
    expect(response.status).toBe(201);
    const where = { restaurant_id_request_id: { restaurant_id: restaurantId, request_id: body.request_id } };
    await deliverReservationNotifications();
    const failed = await prisma.reservation.findUniqueOrThrow({ where });
    expect(failed).toMatchObject({ status: 'PENDING', notification_status: 'RETRYING', notification_attempts: 1 });
    expect(failed.notification_next_at.getTime()).toBeGreaterThan(Date.now());

    await prisma.reservation.update({ where, data: { notification_next_at: new Date() } });
    healthy = true;
    await Promise.all([deliverReservationNotifications(), deliverReservationNotifications()]);
    expect(await prisma.reservation.findUniqueOrThrow({ where })).toMatchObject({ notification_status: 'SENT', notification_attempts: 2 });
    const sends = telegramCalls.filter((call) => call.method === 'sendMessage');
    expect(sends).toHaveLength(2);
    expect(sends[1].body.chat_id).toBe('-1001234567890');
    expect(sends[1].body.text).toContain(failed.reservation_number);
    expect(sends[1].body.reply_markup).toMatchObject({ inline_keyboard: [[{ callback_data: 'reservation:confirm:' + failed.id }, { callback_data: 'reservation:reject:' + failed.id }]] });

    const webhook = '/integrations/telegram/webhook';
    const click = (key: string, user: number, action = 'confirm') => api(webhook, {
      method: 'POST',
      secret: key,
      body: {
        callback_query: {
          id: 'callback', data: 'reservation:' + action + ':' + failed.id, from: { id: user },
          message: { chat: { id: -1001234567890 } },
        },
      },
    });
    expect((await click('wrong', 12345)).status).toBe(401);
    expect((await click(secret, 99999)).status).toBe(200);
    expect((await prisma.reservation.findUniqueOrThrow({ where })).status).toBe('PENDING');
    await click(secret, 12345);
    await click(secret, 12345);
    await click(secret, 12345, 'reject');
    expect((await prisma.reservation.findUniqueOrThrow({ where })).status).toBe('CONFIRMED');
    expect(await prisma.auditLog.count({
      where: { restaurant_id: restaurantId, details: { contains: failed.id } },
    })).toBe(1);
  });
});
