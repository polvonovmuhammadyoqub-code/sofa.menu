import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import jwt from 'jsonwebtoken';
import { PDFDocument } from 'pdf-lib';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import createApp from '../src/app';
import config from '../src/config';
import prisma from '../src/db';
import { restaurantQrUrl } from '../src/services/restaurantQr';

describe('Guest orders and restaurant QR codes', () => {
  const suffix = randomUUID();
  let server: Server;
  let base: string;
  let restaurantId: string;
  let otherRestaurantId: string;
  let menuItemId: string;
  let userId: string;
  let staffToken: string;

  beforeAll(async () => {
    const restaurant = await prisma.restaurant.create({
      data: {
        slug: 'qr-delivery-' + suffix,
        name: 'QR Delivery',
        delivery_enabled: true,
        delivery_fee: 5_000,
        categories: { create: { name: 'Lunch', slug: 'lunch' } },
        tables: { create: { table_number: '12 A' } },
      },
      include: { categories: true },
    });
    restaurantId = restaurant.id;
    const other = await prisma.restaurant.create({ data: { slug: 'qr-other-' + suffix, name: 'Other' } });
    otherRestaurantId = other.id;
    const item = await prisma.menuItem.create({
      data: {
        restaurant_id: restaurantId,
        category_id: restaurant.categories[0].id,
        name: 'Plov',
        price: 35_000,
        options: { create: { name: 'Bread', price_modifier: 2_000, is_required: true } },
      },
    });
    menuItemId = item.id;
    const user = await prisma.user.create({
      data: {
        email: suffix + '@example.test',
        password_hash: 'fixture',
        full_name: 'Test Staff',
        memberships: { create: { restaurant_id: restaurantId } },
      },
    });
    userId = user.id;
    staffToken = jwt.sign({ id: userId }, config.jwtSecret);
    await new Promise<void>(resolve => { server = createApp().listen(0, '127.0.0.1', resolve); });
    base = 'http://127.0.0.1:' + (server.address() as AddressInfo).port + '/api';
  });

  afterAll(async () => {
    if (server) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await prisma.restaurant.deleteMany({ where: { id: { in: [restaurantId, otherRestaurantId].filter(Boolean) } } });
    if (userId) await prisma.user.delete({ where: { id: userId } });
  });

  it('uses tenant prices and the delivery fee, deduplicates retries, and protects customer details', async () => {
    const deliveryUri = base + '/restaurants/' + restaurantId + '/delivery-orders';
    const input = {
      request_id: randomUUID(),
      first_name: 'Alex', last_name: 'Guest', phone: '+998 90 000 00 00', address: 'Private address',
      payment: 'cash', delivery_fee: 0, total_amount: 1,
      items: [{ menu_item_id: menuItemId, price: 1, quantity: 2, selected_options: ['Bread', 'Bread'] }],
    };
    const create = () => fetch(deliveryUri, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
    });

    const created = await create();
    expect(created.status).toBe(201);
    const order = await created.json();
    expect(order).toMatchObject({ total_amount: 79_000, delivery_fee: 5_000, status: 'PENDING' });
    const repeated = await create();
    expect(repeated.status).toBe(200);
    expect(await repeated.json()).toEqual(order);

    const tracked = await fetch(deliveryUri + '/' + order.id);
    expect(await tracked.json()).toEqual(order);
    const unscoped = await fetch(base + '/orders/' + order.id);
    expect(unscoped.status).toBe(404);

    const crossTenantTrack = await fetch(base + '/restaurants/' + otherRestaurantId + '/delivery-orders/' + order.id);
    expect(crossTenantTrack.status).toBe(404);
    const privateList = base + '/orders/restaurants/' + restaurantId + '/list';
    expect((await fetch(privateList)).status).toBe(401);
    const authenticated = await fetch(privateList, { headers: { Authorization: 'Bearer ' + staffToken } });
    expect(await authenticated.json()).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: order.id, notes: expect.stringContaining('Private address') }),
    ]));

    const updated = await fetch(base + '/orders/' + order.id + '/status', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + staffToken },
      body: JSON.stringify({ status: 'Qabul qilindi' }),
    });
    expect(updated.status).toBe(200);
    expect(await (await fetch(deliveryUri + '/' + order.id)).json()).toMatchObject({ status: 'ACCEPTED' });
  });

  it('rejects unrecognized table codes and guest orders for a view-only restaurant', async () => {
    const post = (tenant: string, table: string) => fetch(base + '/orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurant_id: tenant,
        table_number: table,
        items: [{ menu_item_id: menuItemId, quantity: 1, selected_options: ['Bread'] }],
      }),
    });

    expect((await post(restaurantId, '103')).status).toBe(400);
    await prisma.restaurant.update({ where: { id: otherRestaurantId }, data: { menu_ordering_enabled: false } });
    expect((await post(otherRestaurantId, '12 A')).status).toBe(403);
    const tableOrder = await post(restaurantId, '12 A');
    expect(tableOrder.status).toBe(201);
    expect((await tableOrder.json()).order).toMatchObject({ total_amount: 37_000, table: { table_number: '12 A' } });
  });

  it('prints downloadable table PNG and PDF with absolute menu URLs', async () => {
    const url = new URL(restaurantQrUrl('qr-delivery-' + suffix, 'menu', '12 A'));
    expect(url.protocol).toBe('https:');
    expect(url.pathname).toBe('/r/qr-delivery-' + suffix + '/menu');
    expect(url.searchParams.get('table')).toBe('12 A');

    const endpoint = base + '/tables/restaurants/' + restaurantId + '/qr?target=table&table=12%20A&format=';
    expect((await fetch(endpoint + 'png')).status).toBe(401);
    const options = { headers: { Authorization: 'Bearer ' + staffToken } };
    const png = await fetch(endpoint + 'png', options);
    expect(png.headers.get('content-type')).toContain('image/png');
    expect(Buffer.from(await png.arrayBuffer()).subarray(1, 4).toString()).toBe('PNG');

    const pdf = await fetch(endpoint + 'pdf', options);
    expect(pdf.headers.get('content-type')).toContain('application/pdf');
    expect((await PDFDocument.load(await pdf.arrayBuffer())).getPageCount()).toBe(1);
  });
});
