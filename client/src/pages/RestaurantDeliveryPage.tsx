import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, CheckCircle2, Minus, Plus, ShoppingBag, Truck } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { dishImage, localName } from '../lib/guestMenu';
import type { MenuItem, Restaurant } from '../types';
import './restaurant-delivery.css';

const copy = {
  uz: {
    title: 'Yetkazib berish', intro: 'Taomlarni tanlang va yetkazib berish manzilini kiriting.',
    back: 'Menyuga qaytish', unavailable: 'Hozir yetkazib berish xizmati mavjud emas.',
    dishes: 'Taom tanlang', summary: 'Savatingiz', empty: 'Savatingiz hozircha bo‘sh.',
    subtotal: 'Taomlar narxi', fee: 'Yetkazib berish', total: 'Jami', details: 'Yetkazib berish ma’lumotlari',
    firstName: 'Ism', lastName: 'Familiya', phone: 'Telefon raqami', address: 'Yetkazib berish manzili',
    apartment: 'Xonadon yoki bino (ixtiyoriy)', instructions: 'Qo‘shimcha izoh (ixtiyoriy)',
    payment: 'To‘lov usuli', cash: 'Yetkazilganda naqd', card: 'Yetkazilganda karta bilan',
    send: 'Buyurtma berish', sending: 'Yuborilmoqda…', privacy: 'Restoran xodimlari buyurtmani yetkazish uchun aloqa va manzil ma’lumotlaringizdan foydalanadi.',
    invalid: 'Buyurtma ma’lumotlarini tekshiring.', itemUnavailable: 'Taom yoki to‘lov usuli endi mavjud emas. Sahifani yangilang.',
    failed: 'Buyurtmani yuborib bo‘lmadi. Qayta urinib ko‘ring.', notFound: 'Buyurtma topilmadi.',
    trackingError: 'Buyurtma holatini yangilab bo‘lmadi. Sahifa qayta urinadi.',
    tracking: 'Buyurtma holati', loading: 'Yuklanmoqda…', number: 'Buyurtma', submitted: 'Buyurtmangiz yuborildi',
    more: 'Soni oshirish', less: 'Soni kamaytirish',
    statuses: {
      PENDING: 'Tasdiqlanishi kutilmoqda', ACCEPTED: 'Qabul qilindi', PREPARING: 'Tayyorlanmoqda',
      READY: 'Tayyor', OUT_FOR_DELIVERY: 'Yo‘lda', DELIVERED: 'Yetkazildi', CANCELLED: 'Bekor qilindi',
    },
  },
  ru: {
    title: 'Доставка', intro: 'Выберите блюда и укажите адрес доставки.',
    back: 'Вернуться в меню', unavailable: 'Доставка сейчас недоступна.',
    dishes: 'Выберите блюда', summary: 'Корзина', empty: 'В корзине пока нет блюд.',
    subtotal: 'Стоимость блюд', fee: 'Доставка', total: 'Итого', details: 'Данные для доставки',
    firstName: 'Имя', lastName: 'Фамилия', phone: 'Телефон', address: 'Адрес доставки',
    apartment: 'Квартира или корпус (необязательно)', instructions: 'Комментарий (необязательно)',
    payment: 'Способ оплаты', cash: 'Наличными при получении', card: 'Картой при получении',
    send: 'Оформить заказ', sending: 'Отправка…', privacy: 'Сотрудники ресторана используют ваш телефон и адрес для доставки.',
    invalid: 'Проверьте данные заказа.', itemUnavailable: 'Блюдо или способ оплаты больше недоступны. Обновите страницу.',
    failed: 'Не удалось отправить заказ. Попробуйте ещё раз.', notFound: 'Заказ не найден.',
    trackingError: 'Статус заказа недоступен. Мы повторим запрос.',
    tracking: 'Статус заказа', loading: 'Загрузка…', number: 'Заказ', submitted: 'Заказ отправлен',
    more: 'Увеличить количество', less: 'Уменьшить количество',
    statuses: {
      PENDING: 'Ожидает подтверждения', ACCEPTED: 'Принят', PREPARING: 'Готовится',
      READY: 'Готов', OUT_FOR_DELIVERY: 'В пути', DELIVERED: 'Доставлен', CANCELLED: 'Отменён',
    },
  },
  en: {
    title: 'Delivery', intro: 'Choose your dishes and tell us where to deliver.',
    back: 'Back to menu', unavailable: 'Delivery is currently unavailable.',
    dishes: 'Choose your dishes', summary: 'Your basket', empty: 'Your basket is empty.',
    subtotal: 'Subtotal', fee: 'Delivery fee', total: 'Total', details: 'Delivery details',
    firstName: 'First name', lastName: 'Last name', phone: 'Phone number', address: 'Delivery address',
    apartment: 'Apartment or building (optional)', instructions: 'Delivery instructions (optional)',
    payment: 'Payment method', cash: 'Cash on delivery', card: 'Card on delivery',
    send: 'Place order', sending: 'Sending…', privacy: 'Restaurant staff use your contact and address details to deliver your order.',
    invalid: 'Check your order details.', itemUnavailable: 'A dish or payment method is no longer available. Refresh the page.',
    failed: 'We couldn’t send your order. Please try again.', notFound: 'Order not found.',
    trackingError: 'Order status is temporarily unavailable. We’ll try again.',
    tracking: 'Order status', loading: 'Loading…', number: 'Order', submitted: 'Your order was sent',
    more: 'Increase quantity', less: 'Decrease quantity',
    statuses: {
      PENDING: 'Awaiting confirmation', ACCEPTED: 'Accepted', PREPARING: 'Preparing',
      READY: 'Ready', OUT_FOR_DELIVERY: 'Out for delivery', DELIVERED: 'Delivered', CANCELLED: 'Cancelled',
    },
  },
};

type Status = keyof typeof copy.en.statuses;
type Tracking = { id: string; order_number: number; status: Status; total_amount: number; delivery_fee: number };
type Selection = { quantity: number; options: string[] };
type Feedback = 'invalid' | 'failed' | 'itemUnavailable' | 'notFound' | 'trackingError';

export default function RestaurantDeliveryPage({ restaurant, linkTo }: {
  restaurant: Restaurant;
  linkTo: (page?: string) => string;
}) {
  const { lang, formatPrice } = useI18n();
  const t = copy[lang];
  const [selection, setSelection] = useState<Record<string, Selection>>({});
  const [trackingId, setTrackingId] = useState(() => new URLSearchParams(location.search).get('order'));
  const [tracking, setTracking] = useState<Tracking>();
  const [error, setError] = useState<Feedback>();
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const requestId = useRef<string>();
  const endpoint = '/api/restaurants/' + encodeURIComponent(restaurant.id) + '/delivery-orders';
  const groups = (restaurant.categories || []).map(category => ({
    category,
    dishes: (category.menu_items || []).filter(dish => dish.is_available),
  })).filter(group => group.dishes.length > 0);
  const lines = groups.flatMap(({ dishes }) => dishes).flatMap(dish => {
    const selected = selection[dish.id];
    if (!selected?.quantity) return [];
    const modifiers = (dish.options || []).filter(option => selected.options.includes(option.name));
    const amount = (dish.price + modifiers.reduce((sum, option) => sum + option.price_modifier, 0)) * selected.quantity;
    return [{ dish, selected, amount }];
  });
  const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);
  const fee = restaurant.delivery_fee ?? 0;

  useEffect(() => {
    if (!trackingId || tracking?.status === 'DELIVERED' || tracking?.status === 'CANCELLED') return;
    const controller = new AbortController();
    let wait: ReturnType<typeof setTimeout>;
    async function update() {
      try {
        const response = await fetch(endpoint + '/' + encodeURIComponent(trackingId!), { signal: controller.signal });
        if (response.status === 404) {
          setError('notFound');
          return;
        }
        if (!response.ok) throw new Error();
        const order: Tracking = await response.json();
        setTracking(order);
        setError(undefined);
        if (order.status === 'DELIVERED' || order.status === 'CANCELLED') return;
      } catch {
        if (controller.signal.aborted) return;
        setError('trackingError');
      }
      if (!controller.signal.aborted) wait = setTimeout(update, 10_000);
    }
    void update();
    return () => {
      clearTimeout(wait);
      controller.abort();
    };
  }, [trackingId, endpoint, tracking?.status]);

  function updateDish(dish: MenuItem, quantity: number, options?: string[]) {
    requestId.current = undefined;
    setSelection(current => ({
      ...current,
      [dish.id]: {
        quantity,
        options: options ?? current[dish.id]?.options ?? dish.options?.filter(option => option.is_required).map(option => option.name) ?? [],
      },
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || lines.length === 0) return;
    submitting.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget));
      requestId.current ??= crypto.randomUUID();
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          request_id: requestId.current,
          items: lines.map(({ dish, selected }) => ({
            menu_item_id: dish.id, quantity: selected.quantity, selected_options: selected.options,
          })),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        const unavailable = ['ORDERING_DISABLED', 'PAYMENT_UNAVAILABLE', 'ITEM_UNAVAILABLE', 'OPTIONS_INVALID'];
        setError(unavailable.includes(result.code) ? 'itemUnavailable' : response.status === 400 ? 'invalid' : 'failed');
        return;
      }
      const order: Tracking = result;
      const url = new URL(location.href);
      url.searchParams.set('order', order.id);
      history.replaceState({}, '', url);
      setTracking(order);
      setTrackingId(order.id);
      setSelection({});
      window.scrollTo(0, 0);
    } catch {
      setError('failed');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  const back = <a className="delivery-back" href={linkTo('menu')}><ArrowLeft size={17} aria-hidden="true" />{t.back}</a>;

  if (trackingId) return (
    <main className="restaurant-delivery">
      {back}
      <section className="delivery-status" aria-live="polite">
        <CheckCircle2 aria-hidden="true" size={38} />
        <h1>{tracking ? t.submitted : t.tracking}</h1>
        {tracking && <>
          <p>{t.number} №{tracking.order_number}</p>
          <p className="delivery-stage">{t.statuses[tracking.status]}</p>
          <p>{t.total} · {formatPrice(tracking.total_amount)}</p>
        </>}
        {error ? <p className="delivery-error">{t[error]}</p> : !tracking && <p>{t.loading}</p>}
      </section>
    </main>
  );

  return (
    <main className="restaurant-delivery">
      {back}
      <header className="delivery-intro">
        <Truck size={25} aria-hidden="true" />
        <h1>{t.title}</h1>
        <p>{restaurant.delivery_enabled && groups.length > 0 ? t.intro : t.unavailable}</p>
      </header>
      {restaurant.delivery_enabled && groups.length > 0 && <div className="delivery-layout">
        <section aria-labelledby="delivery-dishes">
          <h2 id="delivery-dishes">{t.dishes}</h2>
          {groups.map(({ category, dishes }) => <section key={category.id} className="delivery-category">
            <h3>{localName(category, lang)}</h3>
            {dishes.map(dish => {
              const selected = selection[dish.id];
              const quantity = selected?.quantity || 0;
              const title = localName(dish, lang);
              const photo = dishImage(dish);
              return <article className="delivery-dish" key={dish.id}>
                {photo && <img src={photo} alt="" loading="lazy" width="84" height="84" />}
                <div>
                  <h4>{title}</h4>
                  <p>{formatPrice(dish.price)}</p>
                  {quantity > 0 && dish.options?.map(option => (
                    <label key={option.id} className="delivery-option">
                      <input
                        type="checkbox"
                        checked={selected.options.includes(option.name)}
                        disabled={option.is_required || busy}
                        onChange={event => updateDish(dish, quantity, event.target.checked
                          ? [...selected.options, option.name] : selected.options.filter(name => name !== option.name))}
                      />
                      {localName(option, lang)}
                      {option.price_modifier !== 0 && ' · ' + formatPrice(option.price_modifier)}
                    </label>
                  ))}
                </div>
                <div className="delivery-quantity">
                  <button type="button" aria-label={t.less + ' · ' + title} disabled={quantity === 0 || busy} onClick={() => updateDish(dish, quantity - 1)}><Minus size={17} /></button>
                  <span>{quantity}</span>
                  <button type="button" aria-label={t.more + ' · ' + title} disabled={quantity >= 20 || busy} onClick={() => updateDish(dish, quantity + 1)}><Plus size={17} /></button>
                </div>
              </article>;
            })}
          </section>)}
        </section>
        <section className="delivery-checkout" aria-labelledby="delivery-basket">
          <h2 id="delivery-basket"><ShoppingBag size={22} aria-hidden="true" />{t.summary}</h2>
          {lines.length === 0 ? <p>{t.empty}</p> : <>
            <ul>{lines.map(({ dish, selected, amount }) =>
              <li key={dish.id}><span>{selected.quantity} × {localName(dish, lang)}</span><b>{formatPrice(amount)}</b></li>
            )}</ul>
            <dl>
              <div><dt>{t.subtotal}</dt><dd>{formatPrice(subtotal)}</dd></div>
              <div><dt>{t.fee}</dt><dd>{formatPrice(fee)}</dd></div>
              <div className="delivery-total"><dt>{t.total}</dt><dd>{formatPrice(subtotal + fee)}</dd></div>
            </dl>
            <form onSubmit={submit} onChange={() => { requestId.current = undefined; }}>
              <h3>{t.details}</h3>
              <fieldset disabled={busy}>
                <div className="delivery-field-pair">
                  <label>{t.firstName}<input name="first_name" autoComplete="given-name" required maxLength={80} /></label>
                  <label>{t.lastName}<input name="last_name" autoComplete="family-name" required maxLength={80} /></label>
                </div>
                <label>{t.phone}<input name="phone" type="tel" autoComplete="tel" required minLength={9} maxLength={32} /></label>
                <label>{t.address}<input name="address" autoComplete="address-line1" required minLength={5} maxLength={240} /></label>
                <label>{t.apartment}<input name="apartment" autoComplete="address-line2" maxLength={120} /></label>
                <label>{t.instructions}<textarea name="instructions" rows={2} maxLength={400} /></label>
                {restaurant.delivery_card_enabled ? <label>{t.payment}<select name="payment"><option value="cash">{t.cash}</option><option value="card">{t.card}</option></select></label> :
                  <><input type="hidden" name="payment" value="cash" /><p>{t.cash}</p></>}
                <p className="delivery-privacy">{t.privacy}</p>
                {error && <p className="delivery-error" role="alert">{t[error]}</p>}
                <button className="delivery-submit" type="submit" disabled={busy}>{busy ? t.sending : t.send}</button>
              </fieldset>
            </form>
          </>}
        </section>
      </div>}
    </main>
  );
}
