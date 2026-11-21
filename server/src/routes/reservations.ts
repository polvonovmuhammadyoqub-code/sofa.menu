import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../db.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { restaurantClock, reservationDateValid, restaurantReservationTimes } from '../services/reservationHours.js';
import { answerTelegramCallback, telegramDestination } from '../services/telegram.js';

const roomSelect = { id: true, name: true, name_ru: true, name_en: true } as const;
const maxGuests = 20;
const phone = z.string().trim().max(30).regex(/^\+?[\d ().-]+$/)
  .transform((value) => value.replace(/[ ().-]/g, ''))
  .refine((value) => /^\+?\d{9,15}$/.test(value));
const reservationBody = z.object({
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  phone,
  guest_count: z.number().int().min(1).max(maxGuests),
  reservation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reservation_time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  area_id: z.string().min(1).max(180),
  telegram_username: z.string().trim().regex(/^@?[a-z\d_]{5,32}$/i)
    .transform((value) => value.replace(/^@/, '')).or(z.literal('')).optional(),
  notes: z.string().trim().max(500).optional(),
  request_id: z.string().uuid(),
}).strict();

const errorMessages = {
  INVALID_INPUT: 'Kiritilgan ma’lumotlarni tekshiring.',
  INVALID_DATE: 'Bron uchun mavjud sanani tanlang.',
  UNAVAILABLE_TIME: 'Restoran ish vaqtidan mavjud vaqtni tanlang.',
  INVALID_AREA: 'Restorandagi mavjud joylardan birini tanlang.',
  DUPLICATE_REQUEST: 'Bu so‘rov raqami allaqachon ishlatilgan.',
  TOO_MANY_REQUESTS: 'Juda ko‘p so‘rov yuborildi. Birozdan keyin qayta urinib ko‘ring.',
  RESTAURANT_NOT_FOUND: 'Restoran topilmadi.',
  RESERVATION_NOT_FOUND: 'Bron topilmadi.',
  INVALID_STATUS: 'Bronni ushbu holatga o‘tkazib bo‘lmaydi.',
  FORBIDDEN: 'Ushbu amal uchun ruxsat berilmagan.',
  SERVER_ERROR: 'Bron xizmatida xatolik yuz berdi.',
};

function fail(res: Response, status: number, code: keyof typeof errorMessages, field?: string) {
  res.status(status).json({ code, error: errorMessages[code], ...(field ? { field } : {}) });
}

function handled(handler: (req: AuthRequest, res: Response) => Promise<unknown>) {
  return (req: AuthRequest, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    void handler(req, res).catch(() => {
      console.error('Reservation request failed');
      if (!res.headersSent) fail(res, 500, 'SERVER_ERROR');
    });
  };
}

function throttle(req: Request, res: Response, next: NextFunction) {
  const now = Date.now();
  const key = req.ip ?? 'unknown';
  if (now >= nextCleanup || attempts.size >= 5_000) {
    for (const [ip, attempt] of attempts) {
      if (attempt.expires <= now) attempts.delete(ip);
    }
    nextCleanup = now + windowDuration;
  }
  const attempt = attempts.get(key);
  if (attempt && attempt.expires > now) {
    if (attempt.count >= 20) {
      res.setHeader('Retry-After', Math.ceil((attempt.expires - now) / 1000));
      return fail(res, 429, 'TOO_MANY_REQUESTS');
    }
    attempt.count++;
  } else {
    if (attempts.size >= 5_000) {
      res.setHeader('Retry-After', 60);
      return fail(res, 429, 'TOO_MANY_REQUESTS');
    }
    attempts.set(key, { count: 1, expires: now + windowDuration });
  }
  next();
}

const windowDuration = 10 * 60_000;
const attempts = new Map<string, { count: number; expires: number }>();
let nextCleanup = 0;

const publicRestaurant = (id: string) => prisma.restaurant.findFirst({
  where: { id, is_active: true },
  select: { id: true, slug: true, opening_hours: true, reservation_hours: true, reservation_timezone: true },
});

async function areasFor(restaurantId: string) {
  const areas = await prisma.restaurantArea.findMany({
    where: { restaurant_id: restaurantId },
    orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    select: { ...roomSelect, is_active: true },
  });
  if (areas.length) {
    return areas.filter((area) => area.is_active).map(({ is_active, ...area }) => ({ ...area, storedId: area.id }));
  }

  const tables = await prisma.restaurantTable.findMany({
    where: { restaurant_id: restaurantId, is_active: true },
    distinct: ['section'],
    select: { section: true },
    orderBy: { section: 'asc' },
  });
  const sections = new Set(tables.map((table) => table.section?.trim()).filter(
    (section): section is string => Boolean(section && section.length <= 120),
  ));
  if (!sections.size) sections.add('Asosiy zal');
  return [...sections].map((name) => ({
    id: name === 'Asosiy zal' ? 'main-hall' : 'table-section:' + createHash('sha256').update(name).digest('hex').slice(0, 24),
    name,
    name_ru: name === 'Asosiy zal' ? 'Основной зал' : null,
    name_en: name === 'Asosiy zal' ? 'Main dining room' : null,
    storedId: null,
  }));
}

const publicRouter = Router();

publicRouter.get('/:id/areas', handled(async (req, res) => {
  const restaurant = await publicRestaurant(req.params.id);
  if (!restaurant) return fail(res, 404, 'RESTAURANT_NOT_FOUND');
  const areas = await areasFor(restaurant.id);
  res.json({
    areas: areas.map(({ storedId, ...area }) => area),
    timezone: restaurant.reservation_timezone,
    today: restaurantClock(restaurant.reservation_timezone).date,
    max_guests: maxGuests,
  });
}));

publicRouter.get('/:id/reservation-times', handled(async (req, res) => {
  const restaurant = await publicRestaurant(req.params.id);
  if (!restaurant) return fail(res, 404, 'RESTAURANT_NOT_FOUND');
  const date = req.query.date;
  const now = new Date();
  if (typeof date !== 'string' || !reservationDateValid(date, restaurantClock(restaurant.reservation_timezone, now).date)) {
    return fail(res, 400, 'INVALID_DATE', 'reservation_date');
  }
  res.json({ times: restaurantReservationTimes(restaurant, date, now) });
}));

publicRouter.post('/:id/reservations', throttle, handled(async (req, res) => {
  const parsed = reservationBody.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, 'INVALID_INPUT', parsed.error.issues[0]?.path[0]?.toString());
  const restaurant = await publicRestaurant(req.params.id);
  if (!restaurant) return fail(res, 404, 'RESTAURANT_NOT_FOUND');

  const { area_id, telegram_username, notes, ...rest } = parsed.data;
  const submission = {
    first_name: rest.first_name,
    last_name: rest.last_name,
    phone: rest.phone,
    guest_count: rest.guest_count,
    reservation_date: rest.reservation_date,
    reservation_time: rest.reservation_time,
    request_id: rest.request_id,
    telegram_username: telegram_username || null,
    notes: notes || null,
  };
  const requestHash = createHash('sha256').update(JSON.stringify({ ...submission, area_id })).digest('hex');
  const where = { restaurant_id_request_id: { restaurant_id: restaurant.id, request_id: submission.request_id } };
  const select = { reservation_number: true, request_hash: true } as const;
  const existing = await prisma.reservation.findUnique({ where, select });
  const response = (record: { reservation_number: string; request_hash: string }, status: number) => {
    if (record.request_hash !== requestHash) return fail(res, 409, 'DUPLICATE_REQUEST');
    res.status(status).json({ reservation_number: record.reservation_number, status: 'PENDING' });
  };
  if (existing) return response(existing, 200);

  const now = new Date();
  if (!reservationDateValid(submission.reservation_date, restaurantClock(restaurant.reservation_timezone, now).date)) {
    return fail(res, 400, 'INVALID_DATE', 'reservation_date');
  }
  if (!restaurantReservationTimes(restaurant, submission.reservation_date, now).includes(submission.reservation_time)) {
    return fail(res, 400, 'UNAVAILABLE_TIME', 'reservation_time');
  }
  const area = (await areasFor(restaurant.id)).find((candidate) => candidate.id === area_id);
  if (!area) return fail(res, 400, 'INVALID_AREA', 'area_id');

  try {
    const reservation = await prisma.reservation.create({
      data: {
        ...submission,
        request_hash: requestHash,
        restaurant_id: restaurant.id,
        reservation_number: 'SOFA-' + randomBytes(8).toString('hex').toUpperCase(),
        area_id: area.storedId,
        area_name: area.name,
        notification_status: telegramDestination(restaurant.slug) ? 'PENDING' : 'NOT_CONFIGURED',
      },
      select,
    });
    response(reservation, 201);
  } catch (err) {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) throw err;
    const duplicate = await prisma.reservation.findUnique({ where, select });
    if (!duplicate) throw err;
    response(duplicate, 200);
  }
}));

const status = z.enum(['PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'COMPLETED']);
type Status = z.infer<typeof status>;
const transitions: Record<Status, Status[]> = {
  PENDING: [],
  CONFIRMED: ['PENDING'],
  REJECTED: ['PENDING'],
  CANCELLED: ['PENDING', 'CONFIRMED'],
  COMPLETED: ['CONFIRMED'],
};

const reservationSelect = {
  id: true, reservation_number: true, first_name: true, last_name: true, phone: true,
  guest_count: true, reservation_date: true, reservation_time: true, area_name: true,
  area_id: true, telegram_username: true, notes: true, status: true, notification_status: true,
  notification_attempts: true, created_at: true, updated_at: true,
} as const;

async function updateStatus(restaurantId: string, id: string, nextStatus: Status, actor: { user_id: string } | { telegram_user_id: string }) {
  return prisma.$transaction(async (tx) => {
    const previous = await tx.reservation.updateMany({
      where: { id, restaurant_id: restaurantId, status: { in: transitions[nextStatus] } },
      data: { status: nextStatus },
    });
    if (previous.count) {
      await tx.auditLog.create({
        data: {
          action: 'RESERVATION_STATUS',
          restaurant_id: restaurantId,
          user_id: 'user_id' in actor ? actor.user_id : null,
          details: JSON.stringify({ reservation_id: id, status: nextStatus, ...actor }),
        },
      });
    }
    return tx.reservation.findFirst({ where: { id, restaurant_id: restaurantId }, select: reservationSelect });
  });
}

async function hasStaffAccess(restaurantId: string, userId: string) {
  return Boolean(await prisma.restaurantMembership.findFirst({
    where: { restaurant_id: restaurantId, user_id: userId, role: { in: ['RESTAURANT_OWNER', 'MANAGER'] } },
    select: { id: true },
  }));
}

const staffRouter = Router();
staffRouter.use(authenticate);

staffRouter.get('/:id/reservations', handled(async (req, res) => {
  const restaurantId = req.params.id;
  if (!req.user || !await hasStaffAccess(restaurantId, req.user.id)) return fail(res, 403, 'FORBIDDEN');
  const filter = z.object({
    status: status.optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    page: z.coerce.number().int().min(1).max(1_000).default(1),
  }).safeParse(req.query);
  if (!filter.success) return fail(res, 400, 'INVALID_INPUT');
  const { status: desiredStatus, date, page } = filter.data;
  const reservations = await prisma.reservation.findMany({
    where: { restaurant_id: restaurantId, status: desiredStatus, reservation_date: date },
    select: reservationSelect,
    take: 50,
    skip: (page - 1) * 50,
    orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
  });
  res.json(reservations);
}));

staffRouter.patch('/:id/reservations/:reservationId/status', handled(async (req, res) => {
  const restaurantId = req.params.id;
  if (!req.user || !await hasStaffAccess(restaurantId, req.user.id)) return fail(res, 403, 'FORBIDDEN');
  const parsed = status.exclude(['PENDING']).safeParse(req.body?.status);
  if (!parsed.success) return fail(res, 400, 'INVALID_INPUT', 'status');
  const reservation = await updateStatus(restaurantId, req.params.reservationId, parsed.data, { user_id: req.user.id });
  if (!reservation) return fail(res, 404, 'RESERVATION_NOT_FOUND');
  if (reservation.status !== parsed.data) return fail(res, 409, 'INVALID_STATUS');
  res.json(reservation);
}));

const telegramRouter = Router();
const callback = z.object({
  id: z.string().max(128),
  data: z.string().regex(/^reservation:(confirm|reject):[a-f\d-]{36}$/i),
  from: z.object({ id: z.number().int().safe() }),
  message: z.object({ chat: z.object({ id: z.number().int().safe() }) }),
});

telegramRouter.post('/webhook', handled(async (req, res) => {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET ?? '';
  const provided = Buffer.from(req.get('X-Telegram-Bot-Api-Secret-Token') ?? '');
  if (!/^[A-Za-z0-9_-]{32,256}$/.test(secret) || secret.length !== provided.length
    || !timingSafeEqual(Buffer.from(secret), provided)) {
    return fail(res, 401, 'FORBIDDEN');
  }

  const parsed = callback.safeParse(req.body?.callback_query);
  if (!parsed.success) return res.sendStatus(200);
  const { id: callbackId, data, from, message } = parsed.data;
  const [, action, reservationId] = data.split(':');
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: { restaurant_id: true, restaurant: { select: { slug: true, is_active: true } } },
  });
  const destination = reservation?.restaurant.is_active && telegramDestination(reservation.restaurant.slug);
  let reply = 'Ushbu amal uchun ruxsat berilmagan.';
  if (reservation && destination?.chatId === String(message.chat.id) && destination.staffUserIds.includes(String(from.id))) {
    const target = action === 'confirm' ? 'CONFIRMED' : 'REJECTED';
    const result = await updateStatus(reservation.restaurant_id, reservationId, target, { telegram_user_id: String(from.id) });
    reply = result?.status === target ? (target === 'CONFIRMED' ? 'Bron tasdiqlandi.' : 'Bron rad etildi.') : 'Bron holati allaqachon o‘zgargan.';
  }
  await answerTelegramCallback(callbackId, reply).catch(() => {});
  res.sendStatus(200);
}));

export { publicRouter, staffRouter, telegramRouter };
