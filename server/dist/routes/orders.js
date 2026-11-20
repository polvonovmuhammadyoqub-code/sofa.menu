import { Router } from 'express';
import { z } from 'zod';
import prisma from '../db.js';
import { authenticate, requireTenantAccess } from '../middleware/auth.js';
import { emitOrderCreated, emitOrderStatusChanged } from '../services/socket.js';
const router = Router();
const orderItemSchema = z.object({
    menu_item_id: z.string(),
    quantity: z.number().int().min(1),
    selected_options: z.array(z.string()).optional(),
    notes: z.string().optional(),
});
const createOrderSchema = z.object({
    restaurant_id: z.string(),
    table_number: z.string().optional(),
    customer_name: z.string().optional(),
    customer_phone: z.string().optional(),
    notes: z.string().optional(),
    items: z.array(orderItemSchema).min(1, 'Buyurtmada kamida bitta taom bo‘lishi kerak'),
});
// Create order (Customer public endpoint)
router.post('/', async (req, res) => {
    try {
        const parse = createOrderSchema.safeParse(req.body);
        if (!parse.success) {
            res.status(400).json({ error: parse.error.errors[0].message });
            return;
        }
        const { restaurant_id, table_number, customer_name, customer_phone, notes, items } = parse.data;
        // Verify restaurant exists
        const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurant_id } });
        if (!restaurant) {
            res.status(404).json({ error: 'Restoran topilmadi' });
            return;
        }
        // Verify table if provided
        let tableId = null;
        if (table_number) {
            const table = await prisma.restaurantTable.findFirst({
                where: {
                    restaurant_id,
                    table_number,
                },
            });
            if (table) {
                tableId = table.id;
            }
        }
        // Server-side price recalculation — NEVER TRUST CLIENT-CALCULATED PRICES
        const menuItemIds = items.map((i) => i.menu_item_id);
        const dbMenuItems = await prisma.menuItem.findMany({
            where: {
                id: { in: menuItemIds },
                restaurant_id,
                is_available: true,
            },
            include: { options: true },
        });
        const dbItemsMap = new Map(dbMenuItems.map((item) => [item.id, item]));
        let totalAmount = 0;
        const validatedOrderItems = [];
        for (const item of items) {
            const dbItem = dbItemsMap.get(item.menu_item_id);
            if (!dbItem) {
                res.status(400).json({ error: `Tanlangan taomlardan biri mavjud emas yoki qolmagan (ID: ${item.menu_item_id})` });
                return;
            }
            let unitPrice = dbItem.price;
            // Add option modifiers if any
            if (item.selected_options && item.selected_options.length > 0) {
                for (const optName of item.selected_options) {
                    const matchedOpt = dbItem.options.find((o) => o.name === optName);
                    if (matchedOpt) {
                        unitPrice += matchedOpt.price_modifier;
                    }
                }
            }
            const itemTotal = unitPrice * item.quantity;
            totalAmount += itemTotal;
            validatedOrderItems.push({
                menu_item_id: dbItem.id,
                dish_name: dbItem.name,
                quantity: item.quantity,
                unit_price: unitPrice,
                total_price: itemTotal,
                selected_options: item.selected_options ? JSON.stringify(item.selected_options) : undefined,
                notes: item.notes,
            });
        }
        // Generate daily order number
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const todayOrdersCount = await prisma.order.count({
            where: {
                restaurant_id,
                created_at: { gte: startOfDay },
            },
        });
        const orderNumber = 101 + todayOrdersCount;
        // Database transaction to create Order and OrderItems
        const order = await prisma.$transaction(async (tx) => {
            const newOrder = await tx.order.create({
                data: {
                    restaurant_id,
                    table_id: tableId,
                    order_number: orderNumber,
                    status: 'Yangi',
                    customer_name: customer_name || 'Mehmon',
                    customer_phone,
                    total_amount: totalAmount,
                    notes,
                    payment_status: 'PENDING',
                    items: {
                        create: validatedOrderItems,
                    },
                    status_history: {
                        create: {
                            status: 'Yangi',
                            changed_by: 'CUSTOMER',
                            notes: 'Buyurtma mijoz tomonidan joylashtirildi',
                        },
                    },
                },
                include: {
                    items: true,
                    table: true,
                },
            });
            return newOrder;
        });
        // Real-time broadcast
        emitOrderCreated(restaurant_id, order);
        res.status(201).json({
            message: 'Buyurtmangiz muvaffaqiyatli qabul qilindi!',
            order,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Buyurtma qabul qilishda xatolik yuz berdi' });
    }
});
// Get order details by ID (Customer live tracking)
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const order = await prisma.order.findUnique({
            where: { id },
            include: {
                items: true,
                table: true,
                restaurant: {
                    select: { id: true, name: true, slug: true, brand_color: true },
                },
                status_history: { orderBy: { created_at: 'asc' } },
            },
        });
        if (!order) {
            res.status(404).json({ error: 'Buyurtma topilmadi' });
            return;
        }
        res.json(order);
    }
    catch (err) {
        res.status(500).json({ error: 'Buyurtma ma’lumotlarini yuklashda xatolik' });
    }
});
// Admin / Kitchen / Waiter list orders
router.get('/restaurants/:restaurantId/list', authenticate, requireTenantAccess, async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const { status, table_id, limit } = req.query;
        const orders = await prisma.order.findMany({
            where: {
                restaurant_id: restaurantId,
                ...(status && { status: String(status) }),
                ...(table_id && { table_id: String(table_id) }),
            },
            orderBy: { created_at: 'desc' },
            take: limit ? parseInt(String(limit), 10) : 50,
            include: {
                items: true,
                table: true,
                status_history: { orderBy: { created_at: 'asc' } },
            },
        });
        res.json(orders);
    }
    catch (err) {
        res.status(500).json({ error: 'Buyurtmalar ro‘yxatini yuklashda xatolik' });
    }
});
// Update order status (Admin / Kitchen / Waiter)
router.patch('/:id/status', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;
        const allowedStatuses = ['Yangi', 'Qabul qilindi', 'Tayyorlanmoqda', 'Tayyor', 'Yetkazildi', 'Bekor qilindi'];
        if (!allowedStatuses.includes(status)) {
            res.status(400).json({ error: 'Noto‘g‘ri buyurtma holati' });
            return;
        }
        const currentOrder = await prisma.order.findUnique({ where: { id } });
        if (!currentOrder) {
            res.status(404).json({ error: 'Buyurtma topilmadi' });
            return;
        }
        const updated = await prisma.$transaction(async (tx) => {
            const order = await tx.order.update({
                where: { id },
                data: { status },
                include: { items: true, table: true },
            });
            await tx.orderStatusHistory.create({
                data: {
                    order_id: id,
                    status,
                    changed_by: req.user?.email || 'STAFF',
                    notes: notes || `Holat o‘zgartirildi: ${status}`,
                },
            });
            return order;
        });
        // Real-time broadcast
        emitOrderStatusChanged(currentOrder.restaurant_id, updated);
        res.json(updated);
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Holatni yangilashda xatolik' });
    }
});
export default router;
