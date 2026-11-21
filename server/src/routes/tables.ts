import { Router, Response } from 'express';
import QRCode from 'qrcode';
import { z } from 'zod';
import prisma from '../db.js';
import { authenticate, AuthRequest, requireRoles, requireTenantAccess } from '../middleware/auth.js';
import { canManageOrders } from '../services/guestOrders.js';
import { printableRestaurantQr, qrOptions, restaurantQrUrl } from '../services/restaurantQr.js';

const router = Router();
const tableManagers = requireRoles(['RESTAURANT_OWNER', 'MANAGER']);

router.get('/restaurants/:restaurantId/tables', authenticate, requireTenantAccess, async (req, res): Promise<void> => {
  try {
    const { restaurantId } = req.params;
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { slug: true } });
    if (!restaurant) {
      res.status(404).json({ error: 'Restoran topilmadi' });
      return;
    }
    const tables = await prisma.restaurantTable.findMany({
      where: { restaurant_id: restaurantId },
      orderBy: { table_number: 'asc' },
      include: {
        _count: {
          select: {
            orders: {
              where: { status: { in: ['Yangi', 'Qabul qilindi', 'Tayyorlanmoqda', 'Tayyor'] } },
            },
          },
        },
      },
    });

    // Regenerate display codes so existing records with relative URLs remain useful.
    const configured = await Promise.all(tables.map(async table => ({
      ...table,
      qr_code_url: await QRCode.toDataURL(restaurantQrUrl(restaurant.slug, 'menu', table.table_number), qrOptions),
    })));
    res.json(configured);
  } catch {
    res.status(500).json({ error: 'Stollarni yuklashda xatolik' });
  }
});

const toPrint = z.object({
  target: z.enum(['home', 'menu', 'table']).default('menu'),
  format: z.enum(['png', 'pdf']).default('png'),
  table: z.string().trim().min(1).max(60).optional(),
});

router.get('/restaurants/:restaurantId/qr', authenticate, requireTenantAccess, async (req, res) => {
  const parsed = toPrint.safeParse(req.query);
  if (!parsed.success || (parsed.data.target === 'table') !== Boolean(parsed.data.table)) {
    res.status(400).json({ error: 'QR havolasi parametrlarini tekshiring' });
    return;
  }
  const { target, format, table } = parsed.data;
  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: req.params.restaurantId },
      select: { id: true, slug: true, name: true },
    });
    if (!restaurant || (table && !await prisma.restaurantTable.findFirst({
      where: { restaurant_id: restaurant.id, table_number: table, is_active: true },
      select: { id: true },
    }))) {
      res.status(404).json({ error: 'Restoran yoki stol topilmadi' });
      return;
    }
    const url = restaurantQrUrl(restaurant.slug, target === 'home' ? 'home' : 'menu', table);
    const bytes = format === 'pdf'
      ? Buffer.from(await printableRestaurantQr(url, restaurant.name, table))
      : await QRCode.toBuffer(url, qrOptions);
    res.attachment('restaurant-' + target + '.' + format).send(bytes);
  } catch {
    res.status(500).json({ error: 'QR kodni yaratib bo‘lmadi' });
  }
});

const newTable = z.object({
  table_number: z.string().trim().min(1).max(60),
  capacity: z.coerce.number().int().min(1).max(100).default(4),
  section: z.string().trim().min(1).max(120).default('Asosiy zal'),
});

router.post('/restaurants/:restaurantId/tables', authenticate, tableManagers, requireTenantAccess, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { restaurantId } = req.params;
    const parsed = newTable.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Stol ma’lumotlarini tekshiring' });
      return;
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { slug: true },
    });
    if (!restaurant) {
      res.status(404).json({ error: 'Restoran topilmadi' });
      return;
    }

    const qrTarget = restaurantQrUrl(restaurant.slug, 'menu', parsed.data.table_number);
    const table = await prisma.restaurantTable.create({
      data: {
        restaurant_id: restaurantId,
        table_number: parsed.data.table_number,
        capacity: parsed.data.capacity,
        section: parsed.data.section,
        qr_code_url: await QRCode.toDataURL(qrTarget, qrOptions),
      },
    });

    res.status(201).json(table);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      res.status(409).json({ error: 'Bunday stol mavjud' });
      return;
    }
    res.status(500).json({ error: 'Stol yaratishda xatolik' });
  }
});

router.delete(['/:id', '/tables/:id'], authenticate, tableManagers, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const table = await prisma.restaurantTable.findUnique({ where: { id }, select: { restaurant_id: true } });
    if (!table || !await canManageOrders(req.user!.id, req.user!.role, table.restaurant_id)) {
      res.status(404).json({ error: 'Stol topilmadi' });
      return;
    }
    await prisma.restaurantTable.delete({ where: { id } });
    res.json({ message: 'Stol muvaffaqiyatli o‘chirildi' });
  } catch {
    res.status(500).json({ error: 'Stolni o‘chirishda xatolik' });
  }
});

export default router;
