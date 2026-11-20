import { Router, Response } from 'express';
import prisma from '../db.js';
import { authenticate, AuthRequest, requireTenantAccess } from '../middleware/auth.js';
import { parseMenuFromUrl, parseCsvData, parseJsonData } from '../services/menuImportService.js';

const router = Router();

// 1. Parse menu from URL
router.post('/parse-url', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { restaurant_id, url } = req.body;
    if (!restaurant_id || !url) {
      res.status(400).json({ error: 'Restoran ID va URL kiritilishi shart' });
      return;
    }

    const parseResult = await parseMenuFromUrl(url);

    // Create import job in DB
    const job = await prisma.menuImportJob.create({
      data: {
        restaurant_id,
        source_type: 'URL',
        source_url_or_filename: url,
        status: 'PREVIEW_READY',
        detected_categories_count: parseResult.detected_categories.length,
        detected_items_count: parseResult.items.length,
        raw_data: JSON.stringify(parseResult),
        items: {
          create: parseResult.items.map((item) => ({
            raw_name: item.raw_name,
            clean_name: item.clean_name,
            category_name: item.category_name,
            price: item.price,
            description: item.description,
            image_url: item.image_url,
            confidence: item.confidence,
            status: item.status,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    res.json({
      job,
      warnings: parseResult.warnings,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'URL ni import qilishda xatolik yuz berdi' });
  }
});

// 2. Parse menu from raw CSV or JSON data
router.post('/parse-data', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { restaurant_id, data, format, filename } = req.body;
    if (!restaurant_id || !data) {
      res.status(400).json({ error: 'Restoran ID va ma’lumotlar kiritilishi shart' });
      return;
    }

    let parseResult;
    if (format === 'json') {
      const parsedJson = typeof data === 'string' ? JSON.parse(data) : data;
      parseResult = parseJsonData(parsedJson, filename || 'import.json');
    } else {
      parseResult = parseCsvData(String(data), filename || 'import.csv');
    }

    const job = await prisma.menuImportJob.create({
      data: {
        restaurant_id,
        source_type: format === 'json' ? 'JSON' : 'CSV',
        source_url_or_filename: filename || 'custom_upload',
        status: 'PREVIEW_READY',
        detected_categories_count: parseResult.detected_categories.length,
        detected_items_count: parseResult.items.length,
        raw_data: JSON.stringify(parseResult),
        items: {
          create: parseResult.items.map((item) => ({
            raw_name: item.raw_name,
            clean_name: item.clean_name,
            category_name: item.category_name,
            price: item.price,
            description: item.description,
            image_url: item.image_url,
            confidence: item.confidence,
            status: item.status,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    res.json({
      job,
      warnings: parseResult.warnings,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Ma’lumotlarni tahlil qilishda xatolik' });
  }
});

// 3. Get import job preview
router.get('/jobs/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const job = await prisma.menuImportJob.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { category_name: 'asc' },
        },
      },
    });

    if (!job) {
      res.status(404).json({ error: 'Import vazifasi topilmadi' });
      return;
    }

    res.json(job);
  } catch (err: any) {
    res.status(500).json({ error: 'Import ma’lumotlarini yuklashda xatolik' });
  }
});

// 4. Update import item before commit
router.patch('/items/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { clean_name, category_name, price, description, status } = req.body;

    const updated = await prisma.menuImportItem.update({
      where: { id },
      data: {
        ...(clean_name && { clean_name }),
        ...(category_name && { category_name }),
        ...(price !== undefined && { price: price ? parseInt(price, 10) : null }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
      },
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Import bandini yangilashda xatolik' });
  }
});

// 5. Commit confirmed items into restaurant menu
router.post('/jobs/:id/commit', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const job = await prisma.menuImportJob.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!job) {
      res.status(404).json({ error: 'Import vazifasi topilmadi' });
      return;
    }

    const itemsToImport = job.items.filter((i) => i.status !== 'REJECTED');
    if (itemsToImport.length === 0) {
      res.status(400).json({ error: 'Tasdiqlangan yoki import qilinadigan taomlar topilmadi' });
      return;
    }

    let importedCount = 0;

    // Group items by category
    for (const item of itemsToImport) {
      const catSlug = item.category_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') || 'boshqa';

      // Find or create category
      let category = await prisma.category.findFirst({
        where: {
          restaurant_id: job.restaurant_id,
          name: item.category_name,
        },
      });

      if (!category) {
        const catCount = await prisma.category.count({ where: { restaurant_id: job.restaurant_id } });
        category = await prisma.category.create({
          data: {
            restaurant_id: job.restaurant_id,
            name: item.category_name,
            slug: `${catSlug}-${Date.now().toString().slice(-4)}`,
            sort_order: catCount,
          },
        });
      }

      // Create menu item
      await prisma.menuItem.create({
        data: {
          restaurant_id: job.restaurant_id,
          category_id: category.id,
          name: item.clean_name,
          description: item.description,
          price: item.price || 0,
          image_url: item.image_url,
          is_available: true,
        },
      });

      importedCount++;
    }

    await prisma.menuImportJob.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });

    res.json({
      message: `${importedCount} ta taom muvaffaqiyatli menyuga qo‘shildi!`,
      importedCount,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Menyuga kiritishda xatolik yuz berdi' });
  }
});

export default router;
