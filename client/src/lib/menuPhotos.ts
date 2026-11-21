import type { MenuItem } from '../types';
import { signatureMedia, signatureSlug } from './menuMedia';

// The sample catalog used these stock URLs for many unrelated dishes.
const oldStock = new Set([
  "/photo-1467003909585-2f8a72700288",
  "/photo-1509440159596-0249088772ff",
  "/photo-1512621776951-a57141f2eefd",
  "/photo-1513104890138-7c749659a591",
  "/photo-1513558161293-cdaf765ed2fd",
  "/photo-1514432324607-a09d9b4aefdd",
  "/photo-1514944298352-f67d3b94916a",
  "/photo-1519869325930-281384150729",
  "/photo-1533134242443-d4fd215305ad",
  "/photo-1534422298391-e4f8c172dddb",
  "/photo-1536256263959-770b48d82b0a",
  "/photo-1540420773420-3366772f4999",
  "/photo-1541696432-82c6da8ce7bf",
  "/photo-1544025162-d76694265947",
  "/photo-1547592166-23ac45744acd",
  "/photo-1550304943-4f24f54ddde9",
  "/photo-1551024709-8f23befc6f87",
  "/photo-1551183053-bf91a1d81141",
  "/photo-1555939594-58d7cb561ad1",
  "/photo-1558030006-450675393462",
  "/photo-1565299624946-b28f40a0ae38",
  "/photo-1568901346375-23c9450c58cd",
  "/photo-1571877227200-a0d98ea607e9",
  "/photo-1572695157366-5e585ab2b69f",
  "/photo-1573821663912-569905455b1c",
  "/photo-1576092768241-dec231879fc3",
  "/photo-1576107232684-1279f3908594",
  "/photo-1582878826629-29b7ad1cdc43",
  "/photo-1589301760014-d929f3979dbc",
  "/photo-1592417817098-8f3d6910985c",
  "/photo-1603894584373-5ac82b2ae398",
  "/photo-1604382355076-af4b0eb60143",
  "/photo-1621263764928-df1444c5e859",
  "/photo-1621996346565-e3d5d6281744",
]);

const verifiedPhotos = new Map([
  ["SOFA Signature Wedding Pilaf", "toshkent-toy-oshi.webp"],
  ["Royal Shosh Naryn with Bouillon", "norin.webp"],
  ["Artisan Steamed Manti Duet", "manti.webp"],
  ["Black Angus Ribeye Steak", "ribeye.webp"],
  ["Pan-Seared Atlantic Salmon", "losos.webp"],
  ["Classic Margherita Napoletana", "margherita.webp"],
  ["Gold Wagyu Signature Burger", "burger.webp"],
  ["San Sebastian Burnt Cheesecake", "basque-cheesecake.webp"],
  ["Classic Venetian Tiramisu", "tiramisu.webp"],
  ["Ceremonial Matcha Coconut Latte", "matcha.webp"],
  ['Toshkent to‘y oshi', 'toshkent-toy-oshi.webp'],
  ['Margherita', 'margherita.webp'],
]);

function oldDemoPhoto(source: string) {
  try {
    const url = new URL(source, 'https://sofa.invalid');
    return (url.origin === 'https://sofa.invalid' && url.pathname.startsWith('/demo/'))
      || (url.hostname === 'images.unsplash.com' && oldStock.has(url.pathname));
  } catch {
    return false;
  }
}

export function menuPhoto(dish: MenuItem, restaurantSlug: string) {
  const photos = [
    dish.image_url,
    ...((dish.media_gallery ?? []).filter((media) => media.media_type === 'IMAGE').map((media) => media.url)),
  ].filter((url): url is string => Boolean(url));
  if (restaurantSlug !== signatureSlug) return photos[0];

  const restaurantPhoto = photos.find((url) => !oldDemoPhoto(url));
  if (restaurantPhoto) return restaurantPhoto;
  const filename = verifiedPhotos.get(dish.name_en ?? '') ?? verifiedPhotos.get(dish.name);
  return filename ? signatureMedia + '/' + filename : undefined;
}
