import { URL } from 'url';

export interface ExtractedMenuItem {
  raw_name: string;
  clean_name: string;
  category_name: string;
  price: number | null;
  description?: string;
  image_url?: string;
  confidence: number;
  status: 'CONFIRMED' | 'REQUIRES_REVIEW' | 'REJECTED';
}

export interface ParseResult {
  source_type: string;
  source_url_or_filename: string;
  detected_categories: string[];
  items: ExtractedMenuItem[];
  warnings: string[];
}

// SSRF Protection: verify host is not private/loopback/cloud metadata
export const isSafeUrl = (targetUrl: string): boolean => {
  try {
    const parsed = new URL(targetUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname === '169.254.169.254' || // AWS metadata
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

export const parseMenuFromUrl = async (urlStr: string): Promise<ParseResult> => {
  if (!isSafeUrl(urlStr)) {
    throw new Error('Xavfsizlik cheklovi: Belgilangan URL manziliga so‘rov yuborish taqiqlangan (SSRF himoyasi).');
  }

  const warnings: string[] = [];
  const items: ExtractedMenuItem[] = [];
  const categoriesSet = new Set<string>();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(urlStr, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) SOFA-MenuBot/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/json',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      warnings.push(`Server ${response.status} javobini qaytardi.`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json = await response.json();
      return parseJsonData(json, urlStr);
    }

    const html = await response.text();

    // 1. Check for Schema.org JSON-LD
    const jsonLdRegex = /<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi;
    let match;
    let foundSchema = false;

    while ((match = jsonLdRegex.exec(html)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        const schemaItems = extractFromSchemaOrg(parsed);
        if (schemaItems.length > 0) {
          foundSchema = true;
          for (const item of schemaItems) {
            items.push(item);
            categoriesSet.add(item.category_name);
          }
        }
      } catch {
        // ignore invalid JSON-LD blocks
      }
    }

    // 2. Fallback to HTML heuristic extraction if no Schema.org found
    if (!foundSchema || items.length === 0) {
      warnings.push('Saytda Schema.org strukturalashtirilgan menyu topilmadi. Hevristik HTML parser ishlatildi.');
      
      // Look for dish blocks (class containing dish, item, product, menu-item)
      const dishBlockRegex = /<(?:div|li|article)[^>]*class=["'][^"']*(?:menu-item|dish|food-card|product)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|li|article)>/gi;
      let dishMatch;

      while ((dishMatch = dishBlockRegex.exec(html)) !== null && items.length < 50) {
        const block = dishMatch[1];
        
        // Extract title
        const titleMatch = /<(?:h2|h3|h4|span|div)[^>]*class=["'][^"']*(?:name|title|heading)[^"']*["'][^>]*>(.*?)<\/(?:h2|h3|h4|span|div)>/i.exec(block);
        const name = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';

        // Extract price
        const priceMatch = /(\d{1,3}(?:[.,\s]\d{3})*|\d+)\s*(?:so['‘`]?m|UZS|сум|\$|€)?/i.exec(block);
        let price: number | null = null;
        if (priceMatch) {
          const rawNum = priceMatch[1].replace(/[\s.,]/g, '');
          const parsedNum = parseInt(rawNum, 10);
          if (!isNaN(parsedNum) && parsedNum > 1000) {
            price = parsedNum;
          }
        }

        // Extract description
        const descMatch = /<(?:p|span)[^>]*class=["'][^"']*(?:desc|ingredient|info)[^"']*["'][^>]*>(.*?)<\/(?:p|span)>/i.exec(block);
        const description = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : undefined;

        if (name && name.length > 2 && name.length < 100) {
          const categoryName = 'Asosiy taomlar';
          categoriesSet.add(categoryName);
          items.push({
            raw_name: name,
            clean_name: name,
            category_name: categoryName,
            price: price,
            description: description,
            confidence: price ? 0.85 : 0.65,
            status: price ? 'CONFIRMED' : 'REQUIRES_REVIEW',
          });
        }
      }
    }

    if (items.length === 0) {
      warnings.push('URL manzilidan avtomatik taomlar aniqlanmadi. Namuna sifatida standart struktura yuklanmoqda.');
    }

  } catch (err: any) {
    warnings.push(`URL ni o‘qishda xatolik yuz berdi: ${err.message || 'Tarmoq xatosi'}`);
  }

  // Deduplicate
  const uniqueItemsMap = new Map<string, ExtractedMenuItem>();
  for (const it of items) {
    const key = it.clean_name.toLowerCase();
    if (!uniqueItemsMap.has(key)) {
      uniqueItemsMap.set(key, it);
    }
  }

  return {
    source_type: 'URL',
    source_url_or_filename: urlStr,
    detected_categories: Array.from(categoriesSet),
    items: Array.from(uniqueItemsMap.values()),
    warnings,
  };
};

export const parseJsonData = (json: any, sourceName: string): ParseResult => {
  const items: ExtractedMenuItem[] = [];
  const categoriesSet = new Set<string>();
  const warnings: string[] = [];

  const rawList = Array.isArray(json) ? json : (json.items || json.dishes || json.menu || []);

  for (const item of rawList) {
    const name = String(item.name || item.title || item.clean_name || '').trim();
    if (!name) continue;

    const category = String(item.category || item.category_name || 'Barcha taomlar').trim();
    categoriesSet.add(category);

    const price = typeof item.price === 'number' ? Math.round(item.price) : (parseInt(String(item.price || '').replace(/\D/g, ''), 10) || null);

    items.push({
      raw_name: name,
      clean_name: name,
      category_name: category,
      price: price && price > 0 ? price : null,
      description: item.description || item.desc || undefined,
      image_url: item.image || item.image_url || undefined,
      confidence: price ? 0.98 : 0.70,
      status: price ? 'CONFIRMED' : 'REQUIRES_REVIEW',
    });
  }

  return {
    source_type: 'JSON',
    source_url_or_filename: sourceName,
    detected_categories: Array.from(categoriesSet),
    items,
    warnings,
  };
};

export const parseCsvData = (csvText: string, filename: string): ParseResult => {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  const items: ExtractedMenuItem[] = [];
  const categoriesSet = new Set<string>();
  const warnings: string[] = [];

  if (lines.length < 2) {
    warnings.push('CSV faylda ma’lumotlar yetarli emas.');
    return {
      source_type: 'CSV',
      source_url_or_filename: filename,
      detected_categories: [],
      items: [],
      warnings,
    };
  }

  const header = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  const nameIndex = header.findIndex(h => h.includes('name') || h.includes('nom') || h.includes('taom'));
  const priceIndex = header.findIndex(h => h.includes('price') || h.includes('narx') || h.includes('sum'));
  const catIndex = header.findIndex(h => h.includes('category') || h.includes('kategoriya') || h.includes('bolim'));
  const descIndex = header.findIndex(h => h.includes('desc') || h.includes('tavsif') || h.includes('info'));

  for (let i = 1; i < lines.length; i++) {
    // Basic CSV row parsing
    const row = lines[i].split(',').map(col => col.trim().replace(/^["']|["']$/g, ''));
    const name = nameIndex >= 0 ? row[nameIndex] : row[0];
    if (!name) continue;

    const priceRaw = priceIndex >= 0 ? row[priceIndex] : row[1];
    const priceNum = priceRaw ? parseInt(priceRaw.replace(/\D/g, ''), 10) : null;
    const cat = catIndex >= 0 && row[catIndex] ? row[catIndex] : 'Umumiy';
    const desc = descIndex >= 0 ? row[descIndex] : undefined;

    categoriesSet.add(cat);
    items.push({
      raw_name: name,
      clean_name: name,
      category_name: cat,
      price: priceNum && !isNaN(priceNum) ? priceNum : null,
      description: desc,
      confidence: priceNum ? 0.95 : 0.70,
      status: priceNum ? 'CONFIRMED' : 'REQUIRES_REVIEW',
    });
  }

  return {
    source_type: 'CSV',
    source_url_or_filename: filename,
    detected_categories: Array.from(categoriesSet),
    items,
    warnings,
  };
};

function extractFromSchemaOrg(data: any): ExtractedMenuItem[] {
  const result: ExtractedMenuItem[] = [];
  if (!data) return result;

  const explore = (node: any, currentCategory = 'Barcha taomlar') => {
    if (!node || typeof node !== 'object') return;

    if (Array.isArray(node)) {
      for (const item of node) explore(item, currentCategory);
      return;
    }

    const type = node['@type'];
    if (type === 'MenuSection') {
      const catName = node.name || currentCategory;
      if (node.hasMenuItem) explore(node.hasMenuItem, catName);
      return;
    }

    if (type === 'MenuItem') {
      const name = node.name;
      if (!name) return;
      let price: number | null = null;
      if (node.offers) {
        const offer = Array.isArray(node.offers) ? node.offers[0] : node.offers;
        if (offer && offer.price) {
          price = parseInt(String(offer.price).replace(/\D/g, ''), 10) || null;
        }
      }

      result.push({
        raw_name: name,
        clean_name: name,
        category_name: currentCategory,
        price,
        description: node.description,
        image_url: typeof node.image === 'string' ? node.image : node.image?.url,
        confidence: price ? 0.95 : 0.75,
        status: price ? 'CONFIRMED' : 'REQUIRES_REVIEW',
      });
      return;
    }

    if (node.hasMenuSection) explore(node.hasMenuSection, currentCategory);
    if (node.hasMenuItem) explore(node.hasMenuItem, currentCategory);
  };

  explore(data);
  return result;
}
