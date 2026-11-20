import { Router, Response } from 'express';
import QRCode from 'qrcode';
import prisma from '../db.js';
import { authenticate, AuthRequest, requireTenantAccess } from '../middleware/auth.js';

const router = Router();

router.get('/restaurants/:restaurantId/tables', async (req, res): Promise<void> => {
  try {
    const { restaurantId } = req.params;
    const tables = await prisma.restaurantTable.findMany({
      where: { restaurant_id: restaurantId },
      orderBy: { table_number: 'asc' },
      include: {
        _count: {
          select: {
            orders: {
              where: {
                status: { in: ['Yangi', 'Qabul qilindi', 'Tayyorlanmoqda', 'Tayyor'] },
              },
            },
          },
        },
      },
    });

    res.json(tables);
  } catch (err: any) {
    res.status(500).json({ error: 'Stollarni yuklashda xatolik' });
  }
});

router.post('/restaurants/:restaurantId/tables', authenticate, requireTenantAccess, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { restaurantId } = req.params;
    const { table_number, capacity, section } = req.body;

    if (!table_number) {
      res.status(400).json({ error: 'Stol raqami kiritilishi shart' });
      return;
    }

    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant) {
      res.status(404).json({ error: 'Restoran topilmadi' });
      return;
    }

    const qrTargetUrl = `/r/${restaurant.slug}?table=${encodeURIComponent(table_number)}`;
    const qrDataUrl = await QRCode.toDataURL(qrTargetUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#10100F',
        light: '#FFFFFF',
      },
    });

    const table = await prisma.restaurantTable.create({
      data: {
        restaurant_id: restaurantId,
        table_number,
        capacity: capacity ? parseInt(capacity, 10) : 4,
        section: section || 'Asosiy zal',
        qr_code_url: qrDataUrl,
      },
    });

    res.status(201).json(table);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Stol yaratishda xatolik' });
  }
});

router.delete('/tables/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.restaurantTable.delete({ where: { id } });
    res.json({ message: 'Stol muvaffaqiyatli o‘chirildi' });
  } catch (err: any) {
    res.status(500).json({ error: 'Stolni o‘chirishda xatolik' });
  }
});

export default router;
