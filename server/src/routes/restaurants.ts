import { Router } from 'express';
import { z } from 'zod';
import prisma from '../db.js';
import { authenticate, requireRoles, requireTenantAccess } from '../middleware/auth.js';
import { isReservationTimezone, parseReservationSchedule, restaurantIsOpen } from '../services/reservationHours.js';

const router = Router();
export const guestRouter = Router();

const publicProfile = {
  id: true,
  slug: true,
  name: true,
  tagline: true,
  description: true,
  logo_url: true,
  hero_image: true,
  hero_video: true,
  menu_hero_video: true,
  gallery_images: true,
  opening_hours_en: true,
  opening_hours_ru: true,
  address_en: true,
  address_ru: true,
  tagline_en: true,
  tagline_ru: true,
  brand_color: true,
  secondary_color: true,
  accent_color: true,
  phone: true,
  address: true,
  opening_hours: true,
  currency: true,
  is_active: true,
  instagram_url: true,
  telegram_url: true,
  google_maps_url: true,
  yandex_maps_url: true,
  menu_ordering_enabled: true,
  delivery_enabled: true,
  delivery_fee: true,
  delivery_card_enabled: true,
} as const;

guestRouter.get('/by-slug/:slug', async (req, res) => {
  try {
    const restaurant = await prisma.restaurant.findFirst({
      where: { slug: req.params.slug, is_active: true },
      select: {
        ...publicProfile,
        reservation_hours: true,
        reservation_timezone: true,
        categories: {
          where: { is_active: true },
          orderBy: { sort_order: 'asc' },
          include: {
            menu_items: {
              where: { restaurant: { slug: req.params.slug } },
              orderBy: { sort_order: 'asc' },
              include: { options: true, media_gallery: true },
            },
          },
        },
        tables: {
          where: { is_active: true },
          select: { table_number: true },
        },
      },
    });
    if (!restaurant) {
      res.status(404).json({ error: 'Restoran topilmadi' });
      return;
    }
    const { reservation_hours, reservation_timezone, gallery_images, ...profile } = restaurant;
    const gallery = gallery_images ? parseGallery(gallery_images) : [];
    res.json({
      ...profile,
      gallery_images: gallery,
      is_open: restaurantIsOpen({ opening_hours: profile.opening_hours, reservation_hours, reservation_timezone }),
    });
  } catch {
    res.status(500).json({ error: 'Restoran ma’lumotlarini yuklashda xatolik' });
  }
});

router.use(guestRouter);

router.get('/:restaurantId', authenticate, requireTenantAccess, async (req, res) => {
  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: req.params.restaurantId },
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
  } catch {
    res.status(500).json({ error: 'Restoran ma’lumotlarini yuklashda xatolik' });
  }
});

const shortText = z.string().trim().max(500).nullable();
const httpsLink = z.string().trim().max(2048).url().refine(value => value.startsWith('https://')).nullable();
const mediaLink = z.union([httpsLink, z.string().regex(/^\/uploads\/[a-zA-Z0-9._-]+$/), z.literal('')]).nullable();
const galleryList = z.array(mediaLink.unwrap()).max(8);

function parseGallery(value: string) {
  try {
    const gallery = galleryList.safeParse(JSON.parse(value));
    return gallery.success ? gallery.data : [];
  } catch {
    return [];
  }
}

const color = z.string().regex(/^#[a-f0-9]{6}$/i);
const settings = z.object({
  name: z.string().trim().min(1).max(160),
  tagline: shortText,
  gallery_images: galleryList.transform(value => JSON.stringify(value)),
  opening_hours_en: shortText,
  opening_hours_ru: shortText,
  address_en: shortText,
  address_ru: shortText,
  tagline_en: shortText,
  tagline_ru: shortText,
  description: z.string().trim().max(4000).nullable(),
  logo_url: mediaLink,
  hero_image: mediaLink,
  hero_video: mediaLink,
  menu_hero_video: mediaLink,
  brand_color: color,
  secondary_color: color,
  accent_color: color,
  phone: z.string().trim().max(50).nullable(),
  address: shortText,
  opening_hours: shortText,
  currency: z.string().regex(/^[A-Z]{3}$/),
  instagram_url: httpsLink,
  telegram_url: httpsLink,
  google_maps_url: httpsLink,
  yandex_maps_url: httpsLink,
  menu_ordering_enabled: z.boolean(),
  delivery_enabled: z.boolean(),
  delivery_fee: z.number().int().min(0).max(10000000),
  delivery_card_enabled: z.boolean(),
  reservation_hours: z.string().max(4000).refine(value => parseReservationSchedule(value) !== null).nullable(),
  reservation_timezone: z.string().max(100).refine(isReservationTimezone),
}).partial();

router.patch('/:restaurantId', authenticate, requireRoles(['RESTAURANT_OWNER', 'MANAGER']), requireTenantAccess, async (req, res) => {
  const data = settings.safeParse(req.body);
  if (!data.success) {
    res.status(400).json({ error: 'Restoran sozlamalarini tekshiring', field: data.error.issues[0]?.path[0] });
    return;
  }
  try {
    const restaurant = await prisma.restaurant.update({ where: { id: req.params.restaurantId }, data: data.data });
    res.json(restaurant);
  } catch {
    res.status(500).json({ error: 'Restoran sozlamalarini yangilashda xatolik' });
  }
});

export default router;
