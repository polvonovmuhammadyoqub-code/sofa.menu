import { Router, Response, type NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../db.js';
import { authenticate, AuthRequest, requireRoles, requireTenantAccess } from '../middleware/auth.js';

const router = Router();

const menuManagers = requireRoles(['RESTAURANT_OWNER', 'MANAGER']);

function authorizeMenuResource(model: 'category' | 'menuItem') {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const where = { id: req.params.id };
      const select = { restaurant_id: true } as const;
      const resource = model === 'category'
        ? await prisma.category.findUnique({ where, select })
        : await prisma.menuItem.findUnique({ where, select });
      if (!resource) {
        res.status(404).json({ error: 'Menyu yozuvi topilmadi' });
        return;
      }
      req.params.restaurantId = resource.restaurant_id;
      return requireTenantAccess(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

const categoryAccess = authorizeMenuResource('category');
const itemAccess = authorizeMenuResource('menuItem');

const editableItemFields = [
  'category_id', 'name', 'name_ru', 'name_en', 'description', 'description_ru', 'description_en',
  'price', 'preparation_time', 'weight_or_portion', 'popularity_badge', 'is_available',
  'is_featured', 'is_video_featured', 'image_url', 'video_url', 'video_thumbnail',
  'video_poster', 'calories', 'allergens', 'ingredients', 'ingredients_ru', 'ingredients_en', 'sort_order',
] as const;

const itemTextDetails = z.object({
  ingredients: z.string().trim().max(2000).nullable().optional(),
  ingredients_ru: z.string().trim().max(2000).nullable().optional(),
  ingredients_en: z.string().trim().max(2000).nullable().optional(),
});


// ==================== CATEGORIES ====================

router.get('/restaurants/:restaurantId/categories', async (req, res): Promise<void> => {
  try {
    const { restaurantId } = req.params;
    const categories = await prisma.category.findMany({
      where: { restaurant_id: restaurantId, restaurant: { is_active: true } },
      orderBy: { sort_order: 'asc' },
      include: {
        _count: { select: { menu_items: true } },
      },
    });
    res.json(categories);
  } catch (err: any) {
    res.status(500).json({ error: 'Kategoriyalarni yuklashda xatolik' });
  }
});

router.post('/restaurants/:restaurantId/categories', authenticate, menuManagers, requireTenantAccess, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { restaurantId } = req.params;
    const { name, name_ru, name_en, description, image_url } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Kategoriya nomi kiritilishi shart' });
      return;
    }

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') + '-' + Date.now().toString().slice(-4);

    const count = await prisma.category.count({ where: { restaurant_id: restaurantId } });

    const category = await prisma.category.create({
      data: {
        restaurant_id: restaurantId,
        name,
        name_ru,
        name_en,
        slug,
        description,
        image_url,
        sort_order: count,
      },
    });

    res.status(201).json(category);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Kategoriya yaratishda xatolik' });
  }
});

router.patch('/categories/:id', authenticate, menuManagers, categoryAccess, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, name_ru, name_en, description, image_url, sort_order, is_active } = req.body;

    const updated = await prisma.category.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(name_ru !== undefined && { name_ru }),
        ...(name_en !== undefined && { name_en }),
        ...(description !== undefined && { description }),
        ...(image_url !== undefined && { image_url }),
        ...(sort_order !== undefined && { sort_order }),
        ...(is_active !== undefined && { is_active }),
      },
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Kategoriyani yangilashda xatolik' });
  }
});

router.delete('/categories/:id', authenticate, menuManagers, categoryAccess, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.category.delete({ where: { id } });
    res.json({ message: 'Kategoriya muvaffaqiyatli o‘chirildi' });
  } catch (err: any) {
    res.status(500).json({ error: 'Kategoriyani o‘chirishda xatolik' });
  }
});

// ==================== MENU ITEMS ====================

router.get('/restaurants/:restaurantId/items', async (req, res): Promise<void> => {
  try {
    const { restaurantId } = req.params;
    const { category_id, is_featured, is_video_featured } = req.query;

    const items = await prisma.menuItem.findMany({
      where: {
        restaurant_id: restaurantId,
        restaurant: { is_active: true },
        ...(category_id && { category_id: String(category_id) }),
        ...(is_featured !== undefined && { is_featured: is_featured === 'true' }),
        ...(is_video_featured !== undefined && { is_video_featured: is_video_featured === 'true' }),
      },
      orderBy: { sort_order: 'asc' },
      include: {
        category: true,
        options: true,
        media_gallery: true,
      },
    });

    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: 'Taomlarni yuklashda xatolik' });
  }
});

router.post('/restaurants/:restaurantId/items', authenticate, menuManagers, requireTenantAccess, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { restaurantId } = req.params;
    const {
      category_id,
      name,
      name_ru,
      name_en,
      description,
      description_ru,
      description_en,
      price,
      preparation_time,
      weight_or_portion,
      popularity_badge,
      is_available,
      is_featured,
      is_video_featured,
      image_url,
      video_url,
      video_thumbnail,
      video_poster,
      calories,
      allergens,
      options,
    } = req.body;

    if (!name || price === undefined || !category_id) {
      res.status(400).json({ error: 'Nomi, narxi va kategoriyasi kiritilishi shart' });
      return;
    }

    const [category, details] = [
      await prisma.category.findFirst({ where: { id: category_id, restaurant_id: restaurantId }, select: { id: true } }),
      itemTextDetails.safeParse(req.body),
    ];
    const parsedPrice = Number(price);
    if (!category || !details.success || !Number.isSafeInteger(parsedPrice) || parsedPrice < 0 || parsedPrice > 2147483647) {
      res.status(400).json({ error: 'Taom kategoriyasi, narxi va tarkibini tekshiring' });
      return;
    }

    const item = await prisma.menuItem.create({
      data: {
        restaurant_id: restaurantId,
        category_id,
        name,
        name_ru,
        name_en,
        description,
        description_ru,
        description_en,
        price: parsedPrice,
        ...details.data,
        preparation_time,
        weight_or_portion,
        popularity_badge,
        is_available: is_available !== undefined ? is_available : true,
        is_featured: is_featured || false,
        is_video_featured: is_video_featured || false,
        image_url,
        video_url,
        video_thumbnail,
        video_poster,
        calories: calories ? parseInt(calories, 10) : null,
        allergens,
        ...(options && Array.isArray(options) && {
          options: {
            create: options.map((opt: any) => ({
              name: opt.name,
              name_ru: opt.name_ru,
              name_en: opt.name_en,
              price_modifier: parseInt(opt.price_modifier || '0', 10),
              is_required: opt.is_required || false,
            })),
          },
        }),
      },
      include: {
        category: true,
        options: true,
      },
    });

    res.status(201).json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Taom yaratishda xatolik' });
  }
});

router.patch('/items/:id', authenticate, menuManagers, itemAccess, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data: Record<string, unknown> = {};
    for (const field of editableItemFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) data[field] = req.body[field];
    }
    if (data.price !== undefined) {
      data.price = Number(data.price);
      if (typeof data.price !== 'number' || !Number.isSafeInteger(data.price) || data.price < 0 || data.price > 2147483647) {
        res.status(400).json({ error: 'Taom narxini tekshiring' });
        return;
      }
    }
    if (data.calories !== undefined) data.calories = data.calories ? Number(data.calories) : null;
    if (data.category_id !== undefined) {
      const category = typeof data.category_id === 'string' && await prisma.category.findFirst({
        where: { id: data.category_id, restaurant_id: req.params.restaurantId },
        select: { id: true },
      });
      if (!category) {
        res.status(400).json({ error: 'Taom kategoriyasini tekshiring' });
        return;
      }
    }
    const details = itemTextDetails.safeParse(req.body);
    if (!details.success) {
      res.status(400).json({ error: 'Taom tarkibini tekshiring' });
      return;
    }

    const updated = await prisma.menuItem.update({
      where: { id },
      data: { ...data, ...details.data },
      include: { options: true, category: true },
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Taomni yangilashda xatolik' });
  }
});

router.delete('/items/:id', authenticate, menuManagers, itemAccess, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.menuItem.delete({ where: { id } });
    res.json({ message: 'Taom muvaffaqiyatli o‘chirildi' });
  } catch (err: any) {
    res.status(500).json({ error: 'Taomni o‘chirishda xatolik' });
  }
});

export default router;
