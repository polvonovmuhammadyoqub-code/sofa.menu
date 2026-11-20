import jwt from 'jsonwebtoken';
import config from '../config.js';
import prisma from '../db.js';
export const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Avtorizatsiyadan o‘tilmagan. Token topilmadi.' });
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, config.jwtSecret);
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            include: { memberships: true },
        });
        if (!user) {
            res.status(401).json({ error: 'Foydalanuvchi topilmadi yoki hisob o‘chirilgan.' });
            return;
        }
        const primaryRestaurantId = decoded.restaurantId || (user.memberships.length > 0 ? user.memberships[0].restaurant_id : undefined);
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            restaurantId: primaryRestaurantId,
        };
        next();
    }
    catch (err) {
        res.status(401).json({ error: 'Yaroqsiz yoki muddati o‘tgan token.' });
    }
};
export const requireRoles = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: 'Avtorizatsiya talab qilinadi.' });
            return;
        }
        if (req.user.role === 'SUPER_ADMIN') {
            return next();
        }
        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({ error: 'Ushbu amalni bajarish uchun sizda ruxsat yo‘q.' });
            return;
        }
        next();
    };
};
export const requireTenantAccess = async (req, res, next) => {
    if (!req.user) {
        res.status(401).json({ error: 'Avtorizatsiya talab qilinadi.' });
        return;
    }
    if (req.user.role === 'SUPER_ADMIN') {
        return next();
    }
    const restaurantId = req.params.restaurantId || req.body.restaurant_id || req.query.restaurantId;
    if (!restaurantId) {
        return next();
    }
    const membership = await prisma.restaurantMembership.findFirst({
        where: {
            restaurant_id: restaurantId,
            user_id: req.user.id,
        },
    });
    if (!membership && req.user.restaurantId !== restaurantId) {
        res.status(403).json({ error: 'Siz faqat o‘z restoraningiz ma’lumotlarini boshqarishingiz mumkin.' });
        return;
    }
    next();
};
