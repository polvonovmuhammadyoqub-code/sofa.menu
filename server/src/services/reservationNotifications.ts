import type { Reservation } from '@prisma/client';
import prisma from '../db.js';
import { sendTelegramMessage, telegramDestination } from './telegram.js';

const retryDelays = [60_000, 5 * 60_000, 30 * 60_000, 2 * 60 * 60_000];
const maxAttempts = retryDelays.length + 1;
const leaseTime = 2 * 60_000;
const notificationInterval = 15_000;

export async function deliverReservationNotifications() {
  if (!process.env.TELEGRAM_BOT_TOKEN) return;
  const now = new Date();
  await prisma.reservation.updateMany({
    where: {
      notification_status: 'DELIVERING',
      notification_next_at: { lte: now },
      notification_attempts: { gte: maxAttempts },
    },
    data: { notification_status: 'FAILED' },
  });
  const due = await prisma.reservation.findMany({
    where: {
      notification_status: { in: ['PENDING', 'RETRYING', 'DELIVERING'] },
      notification_next_at: { lte: now },
      notification_attempts: { lt: maxAttempts },
    },
    orderBy: { notification_next_at: 'asc' },
    include: { restaurant: { select: { name: true, slug: true, is_active: true } } },
    take: 10,
  });

  for (const reservation of due) {
    const { id, notification_attempts } = reservation;
    const destination = reservation.restaurant.is_active && telegramDestination(reservation.restaurant.slug);
    const dueCondition = {
      id,
      notification_attempts,
      notification_status: reservation.notification_status,
      notification_next_at: reservation.notification_next_at,
    };
    if (!destination) {
      await prisma.reservation.updateMany({ where: dueCondition, data: { notification_status: 'NOT_CONFIGURED' } });
      continue;
    }

    const attempt = notification_attempts + 1;
    const claim = await prisma.reservation.updateMany({
      where: dueCondition,
      data: {
        notification_status: 'DELIVERING',
        notification_attempts: attempt,
        notification_next_at: new Date(Date.now() + leaseTime),
      },
    });
    if (!claim.count) continue;

    let status = 'SENT';
    let nextAttempt = new Date();
    try {
      const allowCallbacks = reservation.status === 'PENDING' && destination.staffUserIds.length > 0
        && /^[A-Za-z0-9_-]{32,256}$/.test(process.env.TELEGRAM_WEBHOOK_SECRET ?? '');
      await sendTelegramMessage(destination, notificationText(reservation, reservation.restaurant.name), allowCallbacks ? [[
        { text: 'Tasdiqlash', callback_data: 'reservation:confirm:' + id },
        { text: 'Rad etish', callback_data: 'reservation:reject:' + id },
      ]] : undefined);
    } catch {
      status = attempt < maxAttempts ? 'RETRYING' : 'FAILED';
      nextAttempt = new Date(Date.now() + (retryDelays[attempt - 1] ?? 0));
    }
    await prisma.reservation.updateMany({
      where: { id, notification_attempts: attempt, notification_status: 'DELIVERING' },
      data: { notification_status: status, notification_next_at: nextAttempt },
    });
  }
}

function notificationText(reservation: Reservation, restaurantName: string) {
  const statusLabels: Record<string, string> = {
    PENDING: 'Tasdiqlanishi kutilmoqda',
    CONFIRMED: 'Tasdiqlangan',
    REJECTED: 'Rad etilgan',
    CANCELLED: 'Bekor qilingan',
    COMPLETED: 'Yakunlangan',
  };
  return [
    '🍽 SOFA — YANGI STOL BRONI',
    '',
    'Bron raqami: #' + reservation.reservation_number,
    'Restoran: ' + restaurantName,
    '',
    '👤 Mijoz: ' + reservation.first_name + ' ' + reservation.last_name,
    '📞 Telefon: ' + reservation.phone,
    '📅 Sana: ' + reservation.reservation_date,
    '🕐 Vaqt: ' + reservation.reservation_time,
    '👥 Mehmonlar: ' + reservation.guest_count,
    '📍 Joy: ' + reservation.area_name,
    '💬 Telegram: ' + (reservation.telegram_username ? '@' + reservation.telegram_username : '—'),
    '📝 Izoh: ' + (reservation.notes || '—'),
    '',
    'Holat: ' + (statusLabels[reservation.status] ?? '—'),
  ].join('\n');
}

export function startReservationNotifications() {
  let running = false;
  const poll = async () => {
    if (running) return;
    running = true;
    try {
      await deliverReservationNotifications();
    } catch {
      console.error('Reservation notification worker failed');
    } finally {
      running = false;
    }
  };
  void poll();
  const timer = setInterval(poll, notificationInterval);
  timer.unref();
  return timer;
}
