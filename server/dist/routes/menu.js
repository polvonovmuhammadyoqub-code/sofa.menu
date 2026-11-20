import { Router } from 'express';
import prisma from '../db.js';
import { authenticate, requireTenantAccess } from '../middleware/auth.js';
const router = Router();
// ==================== CATEGORIES ====================
router.get('/restaurants/:restaurantId/categories', async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const categories = await prisma.category.findMany({
            where: { restaurant_id: restaurantId },
            orderBy: { sort_order: 'asc' },
            include: {
                _count: { select: { menu_items: true } },
            },
        });
        res.json(categories);
    }
    catch (err) {
        res.status(500).json({ error: 'Kategoriyalarni yuklashda xatolik' });
    }
});
router.post('/restaurants/:restaurantId/categories', authenticate, requireTenantAccess, async (req, res) => {
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
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Kategoriya yaratishda xatolik' });
    }
});
router.patch('/categories/:id', authenticate, async (req, res) => {
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
    }
    catch (err) {
        res.status(500).json({ error: 'Kategoriyani yangilashda xatolik' });
    }
});
router.delete('/categories/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.category.delete({ where: { id } });
        res.json({ message: 'Kategoriya muvaffaqiyatli o‘chirildi' });
    }
    catch (err) {
        res.status(500).json({ error: 'Kategoriyani o‘chirishda xatolik' });
    }
});
// ==================== MENU ITEMS ====================
router.get('/restaurants/:restaurantId/items', async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const { category_id, is_featured, is_video_featured } = req.query;
        const items = await prisma.menuItem.findMany({
            where: {
                restaurant_id: restaurantId,
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
    }
    catch (err) {
        res.status(500).json({ error: 'Taomlarni yuklashda xatolik' });
    }
});
router.post('/restaurants/:restaurantId/items', authenticate, requireTenantAccess, async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const { category_id, name, name_ru, name_en, description, description_ru, description_en, price, preparation_time, weight_or_portion, popularity_badge, is_available, is_featured, is_video_featured, image_url, video_url, video_thumbnail, video_poster, calories, allergens, options, } = req.body;
        if (!name || price === undefined || !category_id) {
            res.status(400).json({ error: 'Nomi, narxi va kategoriyasi kiritilishi shart' });
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
                price: parseInt(price, 10),
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
                        create: options.map((opt) => ({
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
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Taom yaratishda xatolik' });
    }
});
router.patch('/items/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const data = { ...req.body };
        if (data.price !== undefined)
            data.price = parseInt(data.price, 10);
        if (data.calories !== undefined)
            data.calories = data.calories ? parseInt(data.calories, 10) : null;
        delete data.options;
        delete data.category;
        delete data.media_gallery;
        const updated = await prisma.menuItem.update({
            where: { id },
            data,
            include: { options: true, category: true },
        });
        res.json(updated);
    }
    catch (err) {
        res.status(500).json({ error: 'Taomni yangilashda xatolik' });
    }
});
router.delete('/items/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.menuItem.delete({ where: { id } });
        res.json({ message: 'Taom muvaffaqiyatli o‘chirildi' });
    }
    catch (err) {
        res.status(500).json({ error: 'Taomni o‘chirishda xatolik' });
    }
});
export default router;
