import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import prisma from './db.js';

export const seedDatabase = async () => {
  console.log('🚀 Seeding SOFA Luxury Restaurant Experience Platform...');

  // 1. Clean existing records safely
  await prisma.auditLog.deleteMany({});
  await prisma.orderStatusHistory.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.menuImportItem.deleteMany({});
  await prisma.menuImportJob.deleteMany({});
  await prisma.menuItemMedia.deleteMany({});
  await prisma.menuItemOption.deleteMany({});
  await prisma.menuItem.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.restaurantTable.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.subscriptionPlan.deleteMany({});
  await prisma.restaurantMembership.deleteMany({});
  await prisma.restaurant.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Subscription plans
  console.log('📦 Creating subscription plans...');
  const starterPlan = await prisma.subscriptionPlan.create({
    data: {
      name: 'Starter Plan',
      code: 'STARTER',
      price_monthly: 490000, // 490,000 UZS / oy
      max_dishes: 50,
      max_tables: 15,
      video_menu_enabled: false,
      analytics_enabled: true,
      custom_branding_enabled: false,
    },
  });

  const proPlan = await prisma.subscriptionPlan.create({
    data: {
      name: 'Pro Experience',
      code: 'PRO',
      price_monthly: 1290000, // 1,290,000 UZS / oy
      max_dishes: 200,
      max_tables: 50,
      video_menu_enabled: true,
      analytics_enabled: true,
      custom_branding_enabled: true,
    },
  });

  const enterprisePlan = await prisma.subscriptionPlan.create({
    data: {
      name: 'Signature Enterprise',
      code: 'ENTERPRISE',
      price_monthly: 2900000, // 2,900,000 UZS / oy
      max_dishes: 1000,
      max_tables: 200,
      video_menu_enabled: true,
      analytics_enabled: true,
      custom_branding_enabled: true,
    },
  });

  // 3. Demo Users
  console.log('👤 Creating users...');
  const adminPassword = await bcrypt.hash('admin123', 10);
  const ownerPassword = await bcrypt.hash('owner123', 10);
  const chefPassword = await bcrypt.hash('chef123', 10);
  const waiterPassword = await bcrypt.hash('waiter123', 10);

  const superAdmin = await prisma.user.create({
    data: {
      email: 'admin@sofa.uz',
      password_hash: adminPassword,
      full_name: 'SOFA Platform Administrator',
      phone: '+998901234567',
      role: 'SUPER_ADMIN',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    },
  });

  const ownerUser = await prisma.user.create({
    data: {
      email: 'owner@sofa.uz',
      password_hash: ownerPassword,
      full_name: 'Jasur Beknazarov (Restoran Rahbari)',
      phone: '+998971112233',
      role: 'RESTAURANT_OWNER',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    },
  });

  const chefUser = await prisma.user.create({
    data: {
      email: 'chef@sofa.uz',
      password_hash: chefPassword,
      full_name: 'Chef Sherzod Akramov (Bosh Oshpaz)',
      phone: '+998935556677',
      role: 'KITCHEN_STAFF',
      avatar_url: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=400&q=80',
    },
  });

  const waiterUser = await prisma.user.create({
    data: {
      email: 'waiter@sofa.uz',
      password_hash: waiterPassword,
      full_name: 'Dilshod Rahmatov (Bosh Ofitsiant)',
      phone: '+998998889900',
      role: 'WAITER',
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    },
  });

  // 4. Spectacular Demo Restaurant: SOFA Signature
  console.log('🍽️ Creating SOFA Signature luxury demo restaurant...');
  const restaurant = await prisma.restaurant.create({
    data: {
      name: 'SOFA Signature',
      slug: 'sofa-signature',
      tagline: 'Oliy darajadagi gastronomik tajriba va nafis muhit',
      description: 'SOFA Signature — jahon oshxonasi va an’anaviy o‘zbek lazzatlarining yuksak uyg‘unligi. Har bir taom bizning oshpazlarimiz mahorati va ehtirosi bilan tayyorlanadi.',
      logo_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=300&q=80',
      hero_image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1600&q=85',
      hero_video: 'https://assets.mixkit.co/videos/preview/mixkit-chef-garnishing-a-gourmet-dish-41528-large.mp4',
      brand_color: '#C6A76A', // Luxury gold
      secondary_color: '#10100F', // Rich obsidian
      accent_color: '#D8B98A',
      phone: '+998 71 200 88 00',
      address: 'Toshkent shahri, Amir Temur shoh ko‘chasi, 108',
      opening_hours: 'Dushanba - Yakshanba: 11:00 — 23:30',
      currency: 'UZS',
      is_active: true,
    },
  });

  // Link memberships
  await prisma.restaurantMembership.createMany({
    data: [
      { restaurant_id: restaurant.id, user_id: ownerUser.id, role: 'RESTAURANT_OWNER' },
      { restaurant_id: restaurant.id, user_id: chefUser.id, role: 'KITCHEN_STAFF' },
      { restaurant_id: restaurant.id, user_id: waiterUser.id, role: 'WAITER' },
    ],
  });

  // Activate Pro Subscription
  await prisma.subscription.create({
    data: {
      restaurant_id: restaurant.id,
      plan_id: proPlan.id,
      status: 'ACTIVE',
      started_at: new Date(),
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  // 5. Create Tables (15 tables with real QR codes)
  console.log('🪑 Generating tables with QR codes...');
  const tableConfigs = [
    { num: '1', sec: 'Asosiy zal', cap: 2 },
    { num: '2', sec: 'Asosiy zal', cap: 4 },
    { num: '3', sec: 'Asosiy zal', cap: 4 },
    { num: '4', sec: 'Asosiy zal', cap: 6 },
    { num: '5', sec: 'Asosiy zal', cap: 4 },
    { num: '6', sec: 'Terrasa', cap: 2 },
    { num: '7', sec: 'Terrasa', cap: 4 },
    { num: '8', sec: 'Terrasa', cap: 4 },
    { num: '9', sec: 'Terrasa', cap: 6 },
    { num: '10', sec: 'Terrasa', cap: 8 },
    { num: '11', sec: 'VIP Xona 1', cap: 6 },
    { num: '12', sec: 'VIP Xona 2', cap: 8 },
    { num: '13', sec: 'VIP Xona 3', cap: 10 },
    { num: '14', sec: 'Lounge Bar', cap: 2 },
    { num: '15', sec: 'Lounge Bar', cap: 4 },
  ];

  const createdTables: any[] = [];
  for (const t of tableConfigs) {
    const targetUrl = `/r/${restaurant.slug}?table=${t.num}`;
    const qrDataUrl = await QRCode.toDataURL(targetUrl, {
      width: 400,
      margin: 2,
      color: { dark: '#10100F', light: '#FFFFFF' },
    });

    const tbl = await prisma.restaurantTable.create({
      data: {
        restaurant_id: restaurant.id,
        table_number: t.num,
        capacity: t.cap,
        section: t.sec,
        qr_code_url: qrDataUrl,
      },
    });
    createdTables.push(tbl);
  }

  // 6. Categories (8 Rich Categories)
  console.log('📂 Creating rich categories...');
  const categoriesData = [
    {
      name: 'Milliy taomlar',
      name_ru: 'Национальная кухня',
      name_en: 'Uzbek Signature Heritage',
      slug: 'milliy-taomlar',
      description: 'Asrlar davomida sayqallangan an’anaviy o‘zbek taomlarining oliy darajadagi talqini.',
      image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
      sort_order: 1,
    },
    {
      name: 'Asosiy taomlar & Grill',
      name_ru: 'Основные блюда и Гриль',
      name_en: 'Steaks & Premium Mains',
      slug: 'asosiy-taomlar-grill',
      description: 'Black Angus steyklari, yangi dengiz mahsulotlari va olovda pishirilgan gourmet taomlar.',
      image_url: 'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=600&q=80',
      sort_order: 2,
    },
    {
      name: 'Pizza & Italiya pastasi',
      name_ru: 'Пицца и Паста',
      name_en: 'Artisan Pizza & Pasta',
      slug: 'pizza-pasta',
      description: 'Italiya unidan 48 soat achitilgan xamir va haqiqiy yog‘och pechda pishirilgan pitsalar.',
      image_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
      sort_order: 3,
    },
    {
      name: 'Salatlar',
      name_ru: 'Салаты',
      name_en: 'Gourmet Salads',
      slug: 'salatlar',
      description: 'Yangi uzilgan sara sabzavotlar, Italiya burratasi va nozik mualliflik souslari.',
      image_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
      sort_order: 4,
    },
    {
      name: 'Sho‘rvalar',
      name_ru: 'Супы',
      name_en: 'Refined Soups',
      slug: 'shorvalar',
      description: 'Nozik quyuq qaymoqli krem-sho‘rvalar va boy ta’mli an’anaviy qaynatmalar.',
      image_url: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=80',
      sort_order: 5,
    },
    {
      name: 'Fast & Finger Food',
      name_ru: 'Бургеры и Закуски',
      name_en: 'Signature Burgers & Bites',
      slug: 'fast-food',
      description: 'Wagyu go‘shtli mualliflik burgerlari, qarsildoq truffle frilari va gazaklar.',
      image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
      sort_order: 6,
    },
    {
      name: 'Desertlar',
      name_ru: 'Десерты',
      name_en: 'Artisan Desserts',
      slug: 'desertlar',
      description: 'Fransuz qandolatchiligi durdonalari, nozik pishiriqlar va shokoladli mo‘jizalar.',
      image_url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80',
      sort_order: 7,
    },
    {
      name: 'Ichimliklar & Bar',
      name_ru: 'Напитки и Бар',
      name_en: 'Beverages & Mocktails',
      slug: 'ichimliklar',
      description: 'Mualliflik limonadlari, sarxush etuvchi damlamalar va maxsus sharq choylari.',
      image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80',
      sort_order: 8,
    },
  ];

  const categoryMap = new Map<string, any>();
  for (const c of categoriesData) {
    const cat = await prisma.category.create({
      data: {
        restaurant_id: restaurant.id,
        ...c,
      },
    });
    categoryMap.set(c.slug, cat);
  }

  // 7. Populate 52 Exquisite Menu Items across all 8 Categories
  console.log('🍲 Creating 52 exquisite dishes with luxury photography & short videos...');

  const sampleDishes = [
    // Milliy taomlar (Uzbek Cuisine)
    {
      catSlug: 'milliy-taomlar',
      name: 'Palov "SOFA Signature" (Toshkent To‘y Oshi)',
      name_ru: 'Плов "SOFA Signature" (Ташкентский свадебный)',
      name_en: 'SOFA Signature Wedding Pilaf',
      desc: 'Devzira guruchi, sara qo‘zichoq go‘shti, sariq sabzi, no‘xat, mayiz, bedana tuxumi va qazi bilan bezatilgan shohona palov.',
      desc_ru: 'Рис девзира, отборная ягнятина, желтая морковь, нут, изюм, перепелиные яйца и казы.',
      desc_en: 'Devzira rice, prime lamb cuts, yellow carrots, chickpeas, raisins, quail eggs, and cured horsemeat slices.',
      price: 88000,
      time: '15-20 daq',
      weight: '450 g',
      badge: "Chef's Choice",
      featured: true,
      videoFeatured: true,
      image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1000&q=85',
      video: 'https://assets.mixkit.co/videos/preview/mixkit-chef-garnishing-a-gourmet-dish-41528-large.mp4',
      calories: 680,
      allergens: 'Bedana tuxumi, kashnich',
      options: [
        { name: 'Qo‘shimcha Qazi', price: 15000 },
        { name: 'Achchiq-chuchuk salati bilan', price: 12000 },
        { name: 'Suzma qo‘shimchasi', price: 8000 },
      ],
    },
    {
      catSlug: 'milliy-taomlar',
      name: 'Samarqandcha Tandir Kabob',
      name_ru: 'Тандыр кабоб по-самаркандски',
      name_en: 'Samarkand Clay-Oven Roast Lamb',
      desc: 'Archa barglarida 3 soat davomida maxsus tandirda dimlangan nozik qo‘zi go‘shti. Og‘izda eriydigan to‘q ta’m.',
      desc_ru: 'Нежнейшая ягнятина, запеченная в тандыре на ветках можжевельника в течение 3 часов.',
      desc_en: 'Tender baby lamb slow-roasted for 3 hours in a clay oven with wild juniper needles.',
      price: 145000,
      time: '25 daq',
      weight: '400 g',
      badge: 'Bestseller',
      featured: true,
      videoFeatured: true,
      image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1000&q=85',
      video: 'https://assets.mixkit.co/videos/preview/mixkit-cutting-a-steaming-piece-of-meat-43339-large.mp4',
      calories: 720,
      allergens: 'Zira, piyoz',
    },
    {
      catSlug: 'milliy-taomlar',
      name: 'Narin "Shosh Shoxona"',
      name_ru: 'Нарын "Шаш Шахона"',
      name_en: 'Royal Shosh Naryn with Bouillon',
      desc: 'Qo‘lda o‘ta yupqa kesilgan xamir, ot va mol go‘shti, qazi qatlamlari hamda issiq xushbo‘y go‘sht suvi.',
      price: 78000,
      time: '15 daq',
      weight: '350 g',
      badge: 'Signature',
      image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=1000&q=85',
      calories: 540,
    },
    {
      catSlug: 'milliy-taomlar',
      name: 'Mantilar To‘plami (Qo‘zi va Qovoq)',
      name_ru: 'Ассорти манты (ягненок и тыква)',
      name_en: 'Artisan Steamed Manti Duet',
      desc: 'Yupqa xamir ichida mayda to‘g‘ralgan qo‘zi go‘shti va asal ta’mli qovoq. Qaymoqli sous bilan tortiladi.',
      price: 64000,
      time: '20 daq',
      weight: '4 dona (360 g)',
      image: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=1000&q=85',
      calories: 490,
    },
    {
      catSlug: 'milliy-taomlar',
      name: 'Qo‘zichoq Qovurma Pomidor Sousida',
      name_ru: 'Ковурма из ягненка в томатах',
      name_en: 'Braised Lamb with Roasted Tomatoes',
      desc: 'Qo‘zi go‘shti bo‘laklari xushbo‘y ziravorlar, pomidor va shirin piyoz bilan cho‘g‘da pishiriladi.',
      price: 95000,
      time: '20 daq',
      weight: '380 g',
      image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1000&q=85',
      calories: 610,
    },
    {
      catSlug: 'milliy-taomlar',
      name: 'Sho‘rva "Zarafshon" (Qaynatma Sho‘rva)',
      name_ru: 'Шурпа "Зарафшан"',
      name_en: 'Zarafshan Lamb Broth Soup',
      desc: 'Tiniq go‘sht suvi, suyakli qo‘zichoq qovurg‘asi, butun sabzi va no‘xat bilan pishirilgan quvvatbaxsh sho‘rva.',
      price: 58000,
      time: '15 daq',
      weight: '400 ml',
      image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1000&q=85',
      calories: 430,
    },
    {
      catSlug: 'milliy-taomlar',
      name: 'Jizza & Nozik Chuchvara',
      name_ru: 'Чучвара по-бухарски',
      name_en: 'Mini Dumplings in Clarified Broth',
      desc: 'Kichik nozik chuchvaralar tiniq bulonda, yangi ko‘katlar va qatiq bilan.',
      price: 52000,
      time: '15 daq',
      weight: '350 ml',
      image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=1000&q=85',
      calories: 390,
    },

    // Asosiy taomlar & Grill (Steaks & European Mains)
    {
      catSlug: 'asosiy-taomlar-grill',
      name: 'Ribeye Steak Black Angus (Prime 250 kun)',
      name_ru: 'Рибай стейк Black Angus',
      name_en: 'Black Angus Ribeye Steak',
      desc: 'Marmar go‘shtning yuksak darajasi. Xospos pechda olovda qovurilgan, rozmarin va sarimsoq moyi bilan.',
      price: 245000,
      time: '20-25 daq',
      weight: '350 g',
      badge: "Chef's Choice",
      featured: true,
      videoFeatured: true,
      image: 'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=1000&q=85',
      video: 'https://assets.mixkit.co/videos/preview/mixkit-cutting-a-steaming-piece-of-meat-43339-large.mp4',
      calories: 820,
      options: [
        { name: 'Pishirish: Medium Rare', price: 0 },
        { name: 'Pishirish: Medium', price: 0 },
        { name: 'Pishirish: Medium Well', price: 0 },
        { name: 'Truffle sousi qo‘shish', price: 25000 },
      ],
    },
    {
      catSlug: 'asosiy-taomlar-grill',
      name: 'Filet Mignon Truffle Qaylasi Bilan',
      name_ru: 'Филе Миньон с трюфельным соусом',
      name_en: 'Filet Mignon with Black Truffle Jus',
      desc: 'Eng nozik mol go‘shti filesi, sariyog‘da qovurilgan ismaloq va qora truffle glyasi bilan tortiladi.',
      price: 220000,
      time: '20 daq',
      weight: '280 g',
      badge: 'Signature',
      featured: true,
      image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1000&q=85',
      calories: 640,
    },
    {
      catSlug: 'asosiy-taomlar-grill',
      name: 'Atlantika Losos Steyki Limon-Zanjabil Bilan',
      name_ru: 'Стейк из атлантического лосося',
      name_en: 'Pan-Seared Atlantic Salmon',
      desc: 'Yangi losos filesi, brokkoli va sarsabil (asparagus) bilan, tsitrus-zanjabil qaylasi ostida.',
      price: 195000,
      time: '18 daq',
      weight: '300 g',
      badge: 'Bestseller',
      videoFeatured: true,
      image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=1000&q=85',
      video: 'https://assets.mixkit.co/videos/preview/mixkit-chef-garnishing-a-gourmet-dish-41528-large.mp4',
      calories: 510,
    },
    {
      catSlug: 'asosiy-taomlar-grill',
      name: 'Qo‘zi Qovurg‘alari (Rack of Lamb)',
      name_ru: 'Каре ягненка на гриле',
      name_en: 'Herb-Crusted Rack of Lamb',
      desc: 'Xushbo‘y ko‘katlar qobig‘idagi nozik qo‘zi qovurg‘alari, qizil vino reduktsiyasi bilan.',
      price: 210000,
      time: '25 daq',
      weight: '360 g',
      image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1000&q=85',
      calories: 740,
    },
    {
      catSlug: 'asosiy-taomlar-grill',
      name: 'O‘rdak Ko‘kragi (Magret de Canard)',
      name_ru: 'Утиная грудка Магре',
      name_en: 'Pan-Roasted Duck Breast',
      desc: 'Qarsildoq terili nozik o‘rdak filesi, shaftoli va olcha qaylasi uyg‘unligida.',
      price: 165000,
      time: '22 daq',
      weight: '270 g',
      image: 'https://images.unsplash.com/photo-1514944298352-f67d3b94916a?auto=format&fit=crop&w=1000&q=85',
      calories: 590,
    },
    {
      catSlug: 'asosiy-taomlar-grill',
      name: 'Dengiz Mahsulotlari Grili (Platter)',
      name_ru: 'Плато морепродуктов на гриле',
      name_en: 'Grand Seafood Platter',
      desc: 'Qirol krevetkalari, kalamar, midiya va losos bo‘laklari olovda pishirilgan. Limon va sarimsoqli sous.',
      price: 285000,
      time: '25 daq',
      weight: '600 g (2 kishilik)',
      badge: 'Signature',
      image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=1000&q=85',
      calories: 680,
    },

    // Pizza & Pasta
    {
      catSlug: 'pizza-pasta',
      name: 'Truffle & Burrata Artisan Pizza',
      name_ru: 'Пицца с трюфелем и бурратой',
      name_en: 'Black Truffle & Burrata Pizza',
      desc: 'Yog‘och pechda pishirilgan nozik xamir, yangi burrata pishlog‘i, qora truffle pastasi va rukola barglari.',
      price: 145000,
      time: '15 daq',
      weight: '550 g',
      badge: "Chef's Choice",
      featured: true,
      videoFeatured: true,
      image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1000&q=85',
      video: 'https://assets.mixkit.co/videos/preview/mixkit-top-shot-of-a-pizza-with-vegetables-43343-large.mp4',
      calories: 890,
    },
    {
      catSlug: 'pizza-pasta',
      name: 'Pizza Di Mare (Dengiz ne’matlari)',
      name_ru: 'Пицца Ди Маре',
      name_en: 'Pizza Di Mare (Seafood)',
      desc: 'San Marzano pomidor sousi, mozzarella fior di latte, saralangan krevetkalar, kalamar va rayhon.',
      price: 155000,
      time: '15 daq',
      weight: '580 g',
      image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1000&q=85',
      calories: 840,
    },
    {
      catSlug: 'pizza-pasta',
      name: 'Quattro Formaggi Con Miele (4 Pishloq)',
      name_ru: 'Пицца Четыре Сыра с медом',
      name_en: 'Four Cheeses with Truffle Honey',
      desc: 'Mozzarella, Gorgonzola DOP, Parmesan Reggiano, Ricotta pishloqlari va tog‘ asali bilan.',
      price: 125000,
      time: '12 daq',
      weight: '520 g',
      badge: 'Bestseller',
      image: 'https://images.unsplash.com/photo-1573821663912-569905455b1c?auto=format&fit=crop&w=1000&q=85',
      calories: 910,
    },
    {
      catSlug: 'pizza-pasta',
      name: 'Tagliatelle Al Tartufo Fresco',
      name_ru: 'Тальятелле со свежим трюфелем',
      name_en: 'Fresh Truffle Tagliatelle',
      desc: 'Qo‘lda tayyorlangan yangi pasta, qaymoqli Parmesan sousi va ustidan qirilgan yangi qora truffle.',
      price: 135000,
      time: '18 daq',
      weight: '320 g',
      badge: 'Signature',
      image: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281744?auto=format&fit=crop&w=1000&q=85',
      calories: 620,
    },
    {
      catSlug: 'pizza-pasta',
      name: 'Fettuccine Gamberi & Zucchine',
      name_ru: 'Феттучини с креветками и цукини',
      name_en: 'Tiger Prawn Fettuccine',
      desc: 'Yo‘lbars krevetkalari, nozik sukini, pomidor cherri va oq vino qaylasi.',
      price: 120000,
      time: '16 daq',
      weight: '340 g',
      image: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1000&q=85',
      calories: 580,
    },
    {
      catSlug: 'pizza-pasta',
      name: 'Margherita Verace Napoletana',
      name_ru: 'Пицца Маргарита Неаполитана',
      name_en: 'Classic Margherita Napoletana',
      desc: 'Klassik neapolitan retsepti: pomidor sousi, yangi mozzarella, zaytun moyi va rayhon.',
      price: 85000,
      time: '12 daq',
      weight: '480 g',
      image: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=1000&q=85',
      calories: 760,
    },

    // Salatlar (Salads)
    {
      catSlug: 'salatlar',
      name: 'Burrata Con Pomodori Heirloom',
      name_ru: 'Буррата с томатами Heirloom',
      name_en: 'Burrata with Heirloom Tomatoes',
      desc: 'Italiya qaymoqli burratasi, sara rang-barang pomidorlar, yong‘oqli pesto va balzamiko kremi.',
      price: 98000,
      time: '10 daq',
      weight: '300 g',
      badge: "Chef's Choice",
      featured: true,
      image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1000&q=85',
      calories: 420,
    },
    {
      catSlug: 'salatlar',
      name: 'Qarsildoq Baqlajon & Stracciatella',
      name_ru: 'Хрустящие баклажаны со страчателлой',
      name_en: 'Crispy Eggplant & Sweet Chili Stracciatella',
      desc: 'Kraxmalda qarsildoq qovurilgan baqlajon, shirin-achchiq chili sousi, sedana va stracciatella pishlog‘i.',
      price: 76000,
      time: '12 daq',
      weight: '280 g',
      badge: 'Bestseller',
      videoFeatured: true,
      image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1000&q=85',
      video: 'https://assets.mixkit.co/videos/preview/mixkit-chef-garnishing-a-gourmet-dish-41528-large.mp4',
      calories: 360,
    },
    {
      catSlug: 'salatlar',
      name: 'Caesar Royal Yo‘lbars Krevetkalari Bilan',
      name_ru: 'Цезарь Рояль с тигровыми креветками',
      name_en: 'Royal Caesar with Tiger Prawns',
      desc: 'Romano salat barglari, grilda pishirilgan krevetkalar, qotirilgan kroutonlar va anjous sousi.',
      price: 92000,
      time: '12 daq',
      weight: '320 g',
      image: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=1000&q=85',
      calories: 410,
    },
    {
      catSlug: 'salatlar',
      name: 'Avokado, Kinua & Mangoli Salat',
      name_ru: 'Салат с киноа, авокадо и манго',
      name_en: 'Superfood Quinoa & Mango Bowl',
      desc: 'Yangi pishgan avokado, qizil kinua, mango bo‘laklari, qovoq urug‘i va laym-zaytun sousi.',
      price: 84000,
      time: '10 daq',
      weight: '290 g',
      image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1000&q=85',
      calories: 330,
    },
    {
      catSlug: 'salatlar',
      name: 'Achchiq-Chuchuk Vintage (Toshkent Pomidori)',
      name_ru: 'Ачик-чучук винтаж',
      name_en: 'Heritage Sweet Tomato Achik-Chuchuk',
      desc: 'Yupqa kesilgan Yusufxona pomidorlari, Marg‘ilon shirin piyoni, rayhon va o‘tkir ko‘k qalampir.',
      price: 38000,
      time: '8 daq',
      weight: '250 g',
      image: 'https://images.unsplash.com/photo-1592417817098-8f3d6910985c?auto=format&fit=crop&w=1000&q=85',
      calories: 110,
    },
    {
      catSlug: 'salatlar',
      name: 'Rukola, Grush & Gorgonzola Salati',
      name_ru: 'Салат с руколой, грушей и горгонзолой',
      name_en: 'Wild Arugula with Caramelized Pear',
      desc: 'Karamellangan nok, Gorgonzola pishlog‘i, qovurilgan yong‘oq va asal-xantalli doriq.',
      price: 78000,
      time: '10 daq',
      weight: '260 g',
      image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1000&q=85',
      calories: 380,
    },

    // Sho‘rvalar (Soups)
    {
      catSlug: 'shorvalar',
      name: 'Tom Yum Goong Royal (Dengiz sho‘rvasi)',
      name_ru: 'Том Ям Рояль с морепродуктами',
      name_en: 'Tom Yum Goong Supreme',
      desc: 'Qirol krevetkalari, kalamar, qo‘ziqorin, laym barglari va kokos suti bilan tayyorlangan nordon-achchiq sho‘rva.',
      price: 115000,
      time: '15 daq',
      weight: '420 ml',
      badge: 'Bestseller',
      featured: true,
      image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1000&q=85',
      calories: 440,
    },
    {
      catSlug: 'shorvalar',
      name: 'Qaymoqli Oq Qo‘ziqorin Krem-Sho‘rvasi',
      name_ru: 'Крем-суп из белых грибов',
      name_en: 'Porcini Mushroom Bisque',
      desc: 'Sara porcini qo‘ziqorinlari, parijcha qaymoq, truffle moyi va qarsildoq kroutonlar.',
      price: 68000,
      time: '12 daq',
      weight: '350 ml',
      badge: "Chef's Choice",
      videoFeatured: true,
      image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1000&q=85',
      video: 'https://assets.mixkit.co/videos/preview/mixkit-chef-garnishing-a-gourmet-dish-41528-large.mp4',
      calories: 360,
    },
    {
      catSlug: 'shorvalar',
      name: 'Fransuzcha Pishloqli Piyoz Sho‘rvasi',
      name_ru: 'Французский луковый суп',
      name_en: 'Traditional French Onion Gratinée',
      desc: 'Sekin karamellangan shirin piyoz, boy go‘sht suvi, ustida eritilgan Gruyer pishlog‘i bilan baget noni.',
      price: 72000,
      time: '18 daq',
      weight: '360 ml',
      image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=1000&q=85',
      calories: 420,
    },
    {
      catSlug: 'shorvalar',
      name: 'Qovoqcha Krem-Sho‘rva Krevetka Bilan',
      name_ru: 'Тыквенный суп с тигровыми креветками',
      name_en: 'Roasted Pumpkin & Prawn Soup',
      desc: 'Pechda pishirilgan asal qovoq, zanjabil, qovoq urug‘lari va grilda pishirilgan krevetkalar.',
      price: 65000,
      time: '12 daq',
      weight: '350 ml',
      image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1000&q=85',
      calories: 310,
    },
    {
      catSlug: 'shorvalar',
      name: 'Ko‘za Sho‘rva "Piti Oliy"',
      name_ru: 'Пити в глиняном горшочке',
      name_en: 'Clay-Pot Slow-Cooked Lamb Piti',
      desc: 'Loy ko‘zada 4 soat pechda pishirilgan qo‘zichoq go‘shti, kashtan, no‘xat va za’faronli shaffof sho‘rva.',
      price: 85000,
      time: '15 daq',
      weight: '450 ml',
      badge: 'Signature',
      image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1000&q=85',
      calories: 520,
    },

    // Fast & Finger Food
    {
      catSlug: 'fast-food',
      name: 'Wagyu Burger Gold Edition',
      name_ru: 'Бургер с говядиной Вагю Gold',
      name_en: 'Gold Wagyu Signature Burger',
      desc: 'Yapon marmar Wagyu go‘shtidan suvli kotlet, briosh noni, karamellangan piyoz, cheddor va truffle mayonezi.',
      price: 135000,
      time: '18 daq',
      weight: '420 g',
      badge: "Chef's Choice",
      featured: true,
      videoFeatured: true,
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1000&q=85',
      video: 'https://assets.mixkit.co/videos/preview/mixkit-hands-holding-a-huge-hamburger-43338-large.mp4',
      calories: 950,
      options: [
        { name: 'Truffle kartoshka frisi bilan', price: 20000 },
        { name: 'Qo‘shimcha Cheddar pishlog‘i', price: 12000 },
        { name: 'Xalapenyo (achchiq)', price: 6000 },
      ],
    },
    {
      catSlug: 'fast-food',
      name: 'Truffle Parmesan Fri (Kartoshka)',
      name_ru: 'Картофель фри с трюфелем и пармезаном',
      name_en: 'Truffle & Aged Parmesan Fries',
      desc: 'Oltin qarsildoq kartoshka, oq truffle moyi, yangi maydalangan Parmigiano Reggiano va petrushka.',
      price: 48000,
      time: '10 daq',
      weight: '250 g',
      badge: 'Bestseller',
      image: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=1000&q=85',
      calories: 480,
    },
    {
      catSlug: 'fast-food',
      name: 'Bruschetta Trio (Losos, Pomidor, Prosciutto)',
      name_ru: 'Трио брускетт',
      name_en: 'Artisan Bruschetta Trio',
      desc: 'Xushbo‘y ciabatta nonida 3 xil nozik ta’m: chevi-losos, burrata-pomidor va anjirli prosciutto.',
      price: 74000,
      time: '10 daq',
      weight: '3 dona (280 g)',
      image: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?auto=format&fit=crop&w=1000&q=85',
      calories: 390,
    },
    {
      catSlug: 'fast-food',
      name: 'Qisqichbaqa & Krevetka Koptokchalari',
      name_ru: 'Крокеты из креветок и краба',
      name_en: 'Crispy Prawn & Crab Croquettes',
      desc: 'Panko non talqonida qarsildoq qovurilgan dengiz ne’matlari koptokchalari, wasabi-mayo bilan.',
      price: 88000,
      time: '12 daq',
      weight: '240 g',
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1000&q=85',
      calories: 450,
    },
    {
      catSlug: 'fast-food',
      name: 'Qovurilgan Camembert Pishlog‘i',
      name_ru: 'Запеченный камамбер с брусникой',
      name_en: 'Baked Camembert with Cranberry Jam',
      desc: 'Pechda nozik eritilgan Camembert butun pishlog‘i, qora smorodina-brusnika jemasi va issiq krakerlar.',
      price: 94000,
      time: '14 daq',
      weight: '260 g',
      image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=1000&q=85',
      calories: 580,
    },

    // Desertlar (Desserts)
    {
      catSlug: 'desertlar',
      name: 'Pistachio Fondant & Vanil Muzqaymogi',
      name_ru: 'Фисташковый фондан с мороженым',
      name_en: 'Molten Pistachio Lava Cake',
      desc: 'Issiq pishirilgan xamir ichidan quyiluvchi yashil pista kremi, yonida qo‘lbola Madagaskar vanili muzqaymog‘i.',
      price: 78000,
      time: '15 daq',
      weight: '220 g',
      badge: "Chef's Choice",
      featured: true,
      videoFeatured: true,
      image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=1000&q=85',
      video: 'https://assets.mixkit.co/videos/preview/mixkit-pouring-chocolate-sauce-on-dessert-43340-large.mp4',
      calories: 560,
    },
    {
      catSlug: 'desertlar',
      name: 'San Sebastian Bask Chizkeyki',
      name_ru: 'Чизкейк Сан-Себастьян',
      name_en: 'San Sebastian Burnt Cheesecake',
      desc: 'Karamellangan qoramtir qobiqli nozik qaymoqli chizkeyk. Belgiya iliq shokoladi bilan taqdim etiladi.',
      price: 68000,
      time: '8 daq',
      weight: '200 g',
      badge: 'Bestseller',
      videoFeatured: true,
      image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=1000&q=85',
      video: 'https://assets.mixkit.co/videos/preview/mixkit-pouring-chocolate-sauce-on-dessert-43340-large.mp4',
      calories: 520,
    },
    {
      catSlug: 'desertlar',
      name: 'Tiramisu Tradizionale (Savoiardi & Mascarpone)',
      name_ru: 'Тирамису Традиционале',
      name_en: 'Classic Venetian Tiramisu',
      desc: 'Espresso qahvasi bilan to‘yintirilgan savoiardi pechenyelari, havodor mascarpone kremi va Valrhona kakaosi.',
      price: 62000,
      time: '5 daq',
      weight: '190 g',
      image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=1000&q=85',
      calories: 440,
    },
    {
      catSlug: 'desertlar',
      name: 'Oltin Yong‘oqli Paxlava "SOFA Royale"',
      name_ru: 'Пахлава SOFA Royale',
      name_en: 'Golden Royale Baklava with Clotted Cream',
      desc: '40 qatlamli yupqa xamir, sara yong‘oq va pista mag‘zi, qarsildoq qiyom va qaymoq (kaymak) bilan.',
      price: 72000,
      time: '6 daq',
      weight: '180 g',
      badge: 'Signature',
      image: 'https://images.unsplash.com/photo-1519869325930-281384150729?auto=format&fit=crop&w=1000&q=85',
      calories: 610,
    },
    {
      catSlug: 'desertlar',
      name: 'Mango & Marakuya Nozik Moussi',
      name_ru: 'Мусс манго-маракуйя',
      name_en: 'Exotic Mango & Passion Fruit Mousse',
      desc: 'Tropik mevalarning tetiklantiruvchi ta’mi, yengil kikos biskviti ustida porloq oyna glazuri.',
      price: 58000,
      time: '5 daq',
      weight: '160 g',
      image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1000&q=85',
      calories: 320,
    },

    // Ichimliklar & Bar (Beverages)
    {
      catSlug: 'ichimliklar',
      name: 'Marokash Zafaron Choyi',
      name_ru: 'Марокканский чай с шафраном',
      name_en: 'Royal Moroccan Saffron & Mint Tea',
      desc: 'Yangi yalpiz, dolchin, badyan, apelsin po‘stlog‘i va Eron za’faroni bilan damlangan shohona choy.',
      price: 45000,
      time: '8 daq',
      weight: '800 ml (choynak)',
      badge: "Chef's Choice",
      featured: true,
      image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=1000&q=85',
      calories: 45,
    },
    {
      catSlug: 'ichimliklar',
      name: 'O‘rmon Mevalari Limonadi (Yovvoyi malina)',
      name_ru: 'Лимонад из лесных ягод',
      name_en: 'Wild Forest Berry Sparkling Lemonade',
      desc: 'Yovvoyi malina, ko‘katlar, laym sharbati, gazlangan tog‘ suvi va xushbo‘y rozmarin butog‘i.',
      price: 42000,
      time: '6 daq',
      weight: '450 ml',
      badge: 'Bestseller',
      image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=1000&q=85',
      calories: 120,
    },
    {
      catSlug: 'ichimliklar',
      name: 'Anor & Tsitrus Fresh (Yangi siqilgan)',
      name_ru: 'Фреш из граната и цитрусов',
      name_en: 'Fresh Pomegranate & Citrus Elixir',
      desc: 'Quva anorining yangi siqilgan sharbati, qizil apelsin va yangi laym lazzati.',
      price: 48000,
      time: '5 daq',
      weight: '350 ml',
      image: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?auto=format&fit=crop&w=1000&q=85',
      calories: 140,
    },
    {
      catSlug: 'ichimliklar',
      name: 'Matcha Latte Kokos Suti Bilan',
      name_ru: 'Матча латте на кокосовом молоке',
      name_en: 'Ceremonial Matcha Coconut Latte',
      desc: 'Yaponiyaning Uji viloyatidan marosim matchasi, yengil bug‘langan organik kokos suti bilan.',
      price: 38000,
      time: '5 daq',
      weight: '300 ml',
      image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=1000&q=85',
      calories: 110,
    },
    {
      catSlug: 'ichimliklar',
      name: 'Espresso Romano & Belgiyalik Shokolad',
      name_ru: 'Эспрессо Романо',
      name_en: 'Espresso Romano with Artisanal Truffle',
      desc: '100% Arabica donlaridan tayyorlangan quyuq espresso, limon po‘sti va qo‘lbola shokolad bo‘lagi.',
      price: 28000,
      time: '3 daq',
      weight: '60 ml',
      image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1000&q=85',
      calories: 20,
    },
  ];

  let dishCount = 0;
  for (const d of sampleDishes) {
    const cat = categoryMap.get(d.catSlug);
    if (!cat) continue;

    const menuItem = await prisma.menuItem.create({
      data: {
        restaurant_id: restaurant.id,
        category_id: cat.id,
        name: d.name,
        name_ru: d.name_ru,
        name_en: d.name_en,
        description: d.desc,
        description_ru: d.desc_ru,
        description_en: d.desc_en,
        price: d.price,
        preparation_time: d.time,
        weight_or_portion: d.weight,
        popularity_badge: d.badge,
        is_available: true,
        is_featured: d.featured || false,
        is_video_featured: d.videoFeatured || false,
        image_url: d.image,
        video_url: d.video,
        video_thumbnail: d.image,
        video_poster: d.image,
        calories: d.calories,
        allergens: d.allergens,
        sort_order: dishCount++,
        ...(d.options && {
          options: {
            create: d.options.map((opt) => ({
              name: opt.name,
              price_modifier: opt.price,
            })),
          },
        }),
      },
    });

    // Add media gallery
    await prisma.menuItemMedia.create({
      data: {
        menu_item_id: menuItem.id,
        media_type: d.video ? 'VIDEO' : 'IMAGE',
        url: d.video || d.image,
        thumbnail_url: d.image,
        caption: d.name,
      },
    });
  }

  // 8. Sample orders to populate realistic dashboard & kitchen screens
  console.log('📝 Creating sample active and past orders for dashboard and kitchen demo...');

  // Order 1: Table 4 (Yangi / New)
  const order1 = await prisma.order.create({
    data: {
      restaurant_id: restaurant.id,
      table_id: createdTables[3].id,
      order_number: 101,
      status: 'Yangi',
      customer_name: 'Bobur Mirzayev',
      customer_phone: '+998901239988',
      total_amount: 321000,
      notes: 'Iltimos, palovni issiq keltiring, achchiq-chuchukni alohida idishda.',
      items: {
        create: [
          {
            dish_name: 'Palov "SOFA Signature" (Toshkent To‘y Oshi)',
            quantity: 2,
            unit_price: 88000,
            total_price: 176000,
            selected_options: '["Qo‘shimcha Qazi"]',
            status: 'PENDING',
          },
          {
            dish_name: 'Achchiq-Chuchuk Vintage (Toshkent Pomidori)',
            quantity: 1,
            unit_price: 38000,
            total_price: 38000,
            status: 'PENDING',
          },
          {
            dish_name: 'Marokash Zafaron Choyi',
            quantity: 1,
            unit_price: 45000,
            total_price: 45000,
            status: 'PENDING',
          },
          {
            dish_name: 'Pistachio Fondant & Vanil Muzqaymogi',
            quantity: 1,
            unit_price: 78000,
            total_price: 78000,
            notes: 'Ovqatdan so‘ng tortilsin',
            status: 'PENDING',
          },
        ],
      },
      status_history: {
        create: {
          status: 'Yangi',
          changed_by: 'CUSTOMER',
          notes: 'Mijoz QR kod orqali buyurtma qildi',
        },
      },
    },
  });

  // Order 2: Table 7 (Tayyorlanmoqda / Cooking)
  const order2 = await prisma.order.create({
    data: {
      restaurant_id: restaurant.id,
      table_id: createdTables[6].id,
      order_number: 102,
      status: 'Tayyorlanmoqda',
      customer_name: 'Nodira Karimova',
      customer_phone: '+998933334455',
      total_amount: 485000,
      notes: 'Steyk Medium Rare pishirilsin.',
      items: {
        create: [
          {
            dish_name: 'Ribeye Steak Black Angus (Prime 250 kun)',
            quantity: 1,
            unit_price: 245000,
            total_price: 245000,
            selected_options: '["Pishirish: Medium Rare"]',
            status: 'COOKING',
          },
          {
            dish_name: 'Burrata Con Pomodori Heirloom',
            quantity: 1,
            unit_price: 98000,
            total_price: 98000,
            status: 'COOKING',
          },
          {
            dish_name: 'Truffle & Burrata Artisan Pizza',
            quantity: 1,
            unit_price: 145000,
            total_price: 145000,
            status: 'COOKING',
          },
        ],
      },
      status_history: {
        createMany: {
          data: [
            { status: 'Yangi', changed_by: 'CUSTOMER' },
            { status: 'Qabul qilindi', changed_by: 'chef@sofa.uz', notes: 'Oshpaz qabul qildi' },
            { status: 'Tayyorlanmoqda', changed_by: 'chef@sofa.uz', notes: 'Grillda pishirilmoqda' },
          ],
        },
      },
    },
  });

  // Order 3: Table 11 VIP (Tayyor / Ready)
  const order3 = await prisma.order.create({
    data: {
      restaurant_id: restaurant.id,
      table_id: createdTables[10].id,
      order_number: 103,
      status: 'Tayyor',
      customer_name: 'Ulug‘bek Shokirov (VIP)',
      customer_phone: '+998991110022',
      total_amount: 720000,
      notes: 'VIP mehmonlar, zudlik bilan yetkazilsin.',
      items: {
        create: [
          {
            dish_name: 'Samarqandcha Tandir Kabob',
            quantity: 2,
            unit_price: 145000,
            total_price: 290000,
            status: 'READY',
          },
          {
            dish_name: 'Dengiz Mahsulotlari Grili (Platter)',
            quantity: 1,
            unit_price: 285000,
            total_price: 285000,
            status: 'READY',
          },
          {
            dish_name: 'San Sebastian Bask Chizkeyki',
            quantity: 2,
            unit_price: 68000,
            total_price: 136000,
            status: 'READY',
          },
        ],
      },
      status_history: {
        createMany: {
          data: [
            { status: 'Yangi', changed_by: 'CUSTOMER' },
            { status: 'Qabul qilindi', changed_by: 'chef@sofa.uz' },
            { status: 'Tayyorlanmoqda', changed_by: 'chef@sofa.uz' },
            { status: 'Tayyor', changed_by: 'chef@sofa.uz', notes: 'Oshxona tayyorladi, ofitsiant kutilmoqda' },
          ],
        },
      },
    },
  });

  // Order 4: Delivered historical order from 2 hours ago
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  await prisma.order.create({
    data: {
      restaurant_id: restaurant.id,
      table_id: createdTables[1].id,
      order_number: 100,
      status: 'Yetkazildi',
      customer_name: 'Alisher Qosimov',
      customer_phone: '+998905551234',
      total_amount: 213000,
      payment_status: 'PAID',
      created_at: twoHoursAgo,
      items: {
        create: [
          {
            dish_name: 'Wagyu Burger Gold Edition',
            quantity: 1,
            unit_price: 135000,
            total_price: 135000,
            status: 'SERVED',
          },
          {
            dish_name: 'Truffle Parmesan Fri (Kartoshka)',
            quantity: 1,
            unit_price: 48000,
            total_price: 48000,
            status: 'SERVED',
          },
          {
            dish_name: 'Espresso Romano & Belgiyalik Shokolad',
            quantity: 1,
            unit_price: 28000,
            total_price: 28000,
            status: 'SERVED',
          },
        ],
      },
      status_history: {
        createMany: {
          data: [
            { status: 'Yangi', changed_by: 'CUSTOMER', created_at: twoHoursAgo },
            { status: 'Yetkazildi', changed_by: 'waiter@sofa.uz', created_at: new Date(twoHoursAgo.getTime() + 30 * 60 * 1000) },
          ],
        },
      },
    },
  });

  console.log('✅ SOFA Database successfully seeded with 52 dishes, tables, QR codes and users!');
};

// Auto-run if executed directly
if (process.argv[1]?.includes('seed.ts') || process.argv[1]?.includes('seed.js')) {
  seedDatabase()
    .catch((e) => {
      console.error('❌ Seed error:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
