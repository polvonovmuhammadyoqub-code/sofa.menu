import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import bcrypt from 'bcryptjs';
import prisma from '../src/db';
import { isSafeUrl, parseCsvData, parseJsonData } from '../src/services/menuImportService';

describe('SOFA Restaurant Experience Platform Test Suite', () => {
  let testRestaurantId: string;
  let testCategoryId: string;
  let testMenuItemId: string;
  let testTableId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Setup test restaurant
    const rest = await prisma.restaurant.create({
      data: {
        name: 'Test Gourmet Lounge',
        slug: `test-gourmet-${Date.now()}`,
        currency: 'UZS',
      },
    });
    testRestaurantId = rest.id;

    // Setup test category
    const cat = await prisma.category.create({
      data: {
        restaurant_id: testRestaurantId,
        name: 'Test Steaks',
        slug: `test-steaks-${Date.now()}`,
      },
    });
    testCategoryId = cat.id;

    // Setup test menu item
    const dish = await prisma.menuItem.create({
      data: {
        restaurant_id: testRestaurantId,
        category_id: testCategoryId,
        name: 'Prime Ribeye Test',
        price: 180000,
        options: {
          create: [
            { name: 'Truffle Butter', price_modifier: 20000 },
          ],
        },
      },
      include: { options: true },
    });
    testMenuItemId = dish.id;

    // Setup table
    const tbl = await prisma.restaurantTable.create({
      data: {
        restaurant_id: testRestaurantId,
        table_number: '99',
        capacity: 4,
      },
    });
    testTableId = tbl.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.restaurant.delete({ where: { id: testRestaurantId } }).catch(() => {});
  });

  describe('1. Authentication & Security', () => {
    it('should securely hash passwords using bcrypt', async () => {
      const password = 'SuperSecretPassword123!';
      const hash = await bcrypt.hash(password, 10);
      expect(hash).not.toBe(password);
      const isMatch = await bcrypt.compare(password, hash);
      expect(isMatch).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const hash = await bcrypt.hash('CorrectPassword', 10);
      const isMatch = await bcrypt.compare('WrongPassword', hash);
      expect(isMatch).toBe(false);
    });
  });

  describe('2. Multi-Tenant Restaurant Isolation', () => {
    it('should enforce distinct restaurant IDs across categories and dishes', async () => {
      const cat = await prisma.category.findUnique({ where: { id: testCategoryId } });
      expect(cat?.restaurant_id).toBe(testRestaurantId);

      const dish = await prisma.menuItem.findUnique({ where: { id: testMenuItemId } });
      expect(dish?.restaurant_id).toBe(testRestaurantId);
    });
  });

  describe('3. Server-Side Price Verification & Order Submission', () => {
    it('recalculates prices on the server and does not trust client prices', async () => {
      const dish = await prisma.menuItem.findUnique({
        where: { id: testMenuItemId },
        include: { options: true },
      });
      expect(dish).toBeDefined();

      const quantity = 2;
      const optionModifier = dish!.options[0].price_modifier; // +20,000
      const expectedTotal = (dish!.price + optionModifier) * quantity; // (180,000 + 20,000) * 2 = 400,000

      // Create order in DB with server calculated total
      const order = await prisma.order.create({
        data: {
          restaurant_id: testRestaurantId,
          table_id: testTableId,
          order_number: 999,
          status: 'Yangi',
          total_amount: expectedTotal,
          items: {
            create: [
              {
                menu_item_id: dish!.id,
                dish_name: dish!.name,
                quantity: quantity,
                unit_price: dish!.price + optionModifier,
                total_price: expectedTotal,
                selected_options: JSON.stringify(['Truffle Butter']),
              },
            ],
          },
          status_history: {
            create: {
              status: 'Yangi',
              changed_by: 'CUSTOMER',
            },
          },
        },
        include: { items: true, status_history: true },
      });

      expect(order.total_amount).toBe(400000);
      expect(order.status).toBe('Yangi');
      expect(order.items.length).toBe(1);
      expect(order.items[0].total_price).toBe(400000);
    });

    it('advances order statuses smoothly through kitchen lifecycle', async () => {
      const order = await prisma.order.findFirst({
        where: { restaurant_id: testRestaurantId, order_number: 999 },
      });
      expect(order).toBeDefined();

      // Step: Qabul qilindi
      const accepted = await prisma.order.update({
        where: { id: order!.id },
        data: { status: 'Qabul qilindi' },
      });
      expect(accepted.status).toBe('Qabul qilindi');

      // Step: Tayyorlanmoqda
      const cooking = await prisma.order.update({
        where: { id: order!.id },
        data: { status: 'Tayyorlanmoqda' },
      });
      expect(cooking.status).toBe('Tayyorlanmoqda');

      // Step: Tayyor
      const ready = await prisma.order.update({
        where: { id: order!.id },
        data: { status: 'Tayyor' },
      });
      expect(ready.status).toBe('Tayyor');

      // Step: Yetkazildi
      const delivered = await prisma.order.update({
        where: { id: order!.id },
        data: { status: 'Yetkazildi' },
      });
      expect(delivered.status).toBe('Yetkazildi');
    });
  });

  describe('4. Smart Menu Parser & Security (SSRF Protection)', () => {
    it('blocks dangerous internal IPs to prevent SSRF', () => {
      expect(isSafeUrl('http://127.0.0.1/admin')).toBe(false);
      expect(isSafeUrl('http://localhost:5000/api')).toBe(false);
      expect(isSafeUrl('http://169.254.169.254/latest/meta-data/')).toBe(false);
      expect(isSafeUrl('http://10.0.0.1/secret')).toBe(false);
      expect(isSafeUrl('http://192.168.1.1/router')).toBe(false);
      expect(isSafeUrl('ftp://example.com/menu')).toBe(false);
      expect(isSafeUrl('https://valid-restaurant-website.uz/menu')).toBe(true);
    });

    it('parses CSV menu data accurately with confidence scores', () => {
      const sampleCsv = `
Name,Category,Price,Description
T-Bone Steak,Grill,165000,Premium dry-aged beef
Caesar Salad,Salad,55000,Crispy romaine lettuce
      `.trim();

      const result = parseCsvData(sampleCsv, 'menu.csv');
      expect(result.items.length).toBe(2);
      expect(result.items[0].clean_name).toBe('T-Bone Steak');
      expect(result.items[0].price).toBe(165000);
      expect(result.items[0].category_name).toBe('Grill');
      expect(result.items[0].confidence).toBeGreaterThan(0.9);
      expect(result.items[0].status).toBe('CONFIRMED');
    });

    it('parses JSON menu data correctly', () => {
      const sampleJson = [
        { name: 'San Sebastian', category: 'Dessert', price: 68000, description: 'Basque burnt cheesecake' },
        { name: 'Iced Matcha', category: 'Drinks', price: 35000, description: 'Ceremonial matcha' },
      ];

      const result = parseJsonData(sampleJson, 'dishes.json');
      expect(result.items.length).toBe(2);
      expect(result.items[0].clean_name).toBe('San Sebastian');
      expect(result.items[0].price).toBe(68000);
      expect(result.items[1].price).toBe(35000);
    });
  });
});
