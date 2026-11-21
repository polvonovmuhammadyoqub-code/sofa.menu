import { z } from 'zod';

const userId = z.string().regex(/^[1-9]\d{0,15}$/);
const destinationConfig = z.object({
  chat_id: z.string().regex(/^-?[1-9]\d{0,15}$/),
  staff_user_ids: z.array(userId).optional(),
});

type Destination = { chatId: string; staffUserIds: string[] };
type InlineButton = { text: string; callback_data: string };

export function telegramDestination(restaurantSlug: string): Destination | null {
  if (!process.env.TELEGRAM_BOT_TOKEN) return null;
  let entry: unknown;
  const configured = process.env.TELEGRAM_DESTINATIONS_JSON;
  if (configured) {
    try {
      const destinations = z.record(z.unknown()).parse(JSON.parse(configured));
      if (Object.hasOwn(destinations, restaurantSlug)) entry = destinations[restaurantSlug];
    } catch {
      return null;
    }
  }
  if (entry === undefined && restaurantSlug === process.env.TELEGRAM_RESTAURANT_SLUG) {
    entry = {
      chat_id: process.env.TELEGRAM_CHAT_ID,
      staff_user_ids: process.env.TELEGRAM_STAFF_USER_IDS?.split(',').map((id) => id.trim()),
    };
  }
  const result = destinationConfig.safeParse(entry);
  if (!result.success) return null;
  const { chat_id, staff_user_ids } = result.data;
  return {
    chatId: chat_id,
    staffUserIds: staff_user_ids ?? (userId.safeParse(chat_id).success ? [chat_id] : []),
  };
}

async function telegramRequest(method: string, payload: object) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !/^\d+:[\w-]+$/.test(token)) throw new Error('Telegram bot is unconfigured');
  try {
    const response = await fetch('https://api.telegram.org/bot' + token + '/' + method, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok || !(await response.json() as { ok?: boolean }).ok) throw new Error();
  } catch {
    // Fetch errors may include a URL containing the token.
    throw new Error('Telegram request failed');
  }
}

export function sendTelegramMessage(destination: Destination, text: string, inlineKeyboard?: InlineButton[][]) {
  return telegramRequest('sendMessage', {
    chat_id: destination.chatId,
    text,
    ...(inlineKeyboard?.length ? { reply_markup: { inline_keyboard: inlineKeyboard } } : {}),
  });
}

export function answerTelegramCallback(callbackId: string, text: string) {
  return telegramRequest('answerCallbackQuery', { callback_query_id: callbackId, text });
}
