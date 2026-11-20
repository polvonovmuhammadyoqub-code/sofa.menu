import { Router, Response } from 'express';
import prisma from '../db.js';
import { authenticate, AuthRequest, requireTenantAccess } from '../middleware/auth.js';

const router = Router();

// Public restaurant view with full categorized menu
router.get('/by-slug/:slug', async (req, res): Promise<void> => {
  try {
    const { slug } = req.params;
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug },
      include: {
        categories: {
          where: { is_active: true },
          orderBy: { sort_order: 'asc' },
          include: {
            menu_items: {
              where: { is_available: true },
              orderBy: { sort_order: 'asc' },
              include: {
                options: true,
                media_gallery: true,
              },
            },
          },
        },
        tables: {
          where: { is_active: true },
          select: { id: true, table_number: true, section: true },
        },
      },
    });

    if (!restaurant) {
      res.status(404).json({ error: 'Restoran topilmadi' });
      return;
    }

    res.json(restaurant);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Restoran ma’lumotlarini yuklashda xatolik' });
  }
});

// Admin get current restaurant
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: {
        categories: { orderBy: { sort_order: 'asc' } },
        tables: { orderBy: { table_number: 'asc' } },
      },
    });

    if (!restaurant) {
      res.status(404).json({ error: 'Restoran topilmadi' });
      return;
    }

    res.json(restaurant);
  } catch (err: any) {
    res.status(500).json({ error: 'Restoran ma’lumotlarini yuklashda xatolik' });
  }
});

// Admin update restaurant branding & settings
router.patch('/:id', authenticate, requireTenantAccess, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      name,
      tagline,
      description,
      logo_url,
      hero_image,
      hero_video,
      brand_color,
      secondary_color,
      accent_color,
      phone,
      address,
      opening_hours,
      currency,
    } = req.body;

    const updated = await prisma.restaurant.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(tagline !== undefined && { tagline }),
        ...(description !== undefined && { description }),
        ...(logo_url !== undefined && { logo_url }),
        ...(hero_image !== undefined && { hero_image }),
        ...(hero_video !== undefined && { hero_video }),
        ...(brand_color && { brand_color }),
        ...(secondary_color && { secondary_color }),
        ...(accent_color && { accent_color }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
        ...(opening_hours !== undefined && { opening_hours }),
        ...(currency && { currency }),
      },
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Restoran sozlamalarini yangilashda xatolik' });
  }
});

export default router;
