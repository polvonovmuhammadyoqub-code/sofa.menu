import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, Minus, Plus, Trash2, X } from 'lucide-react';
import { MAX_LINE_QUANTITY, useCart } from '../context/CartContext';
import { guestApi } from '../lib/guestApi';
import { localName, menuCopy } from '../lib/guestMenu';
import { useI18n } from '../lib/i18n';
import type { Order } from '../types';

interface CartDrawerProps {
  restaurantId: string;
  onOrderSuccess: (order: Order) => void;
}

export default function CartDrawer({ restaurantId, onOrderSuccess }: CartDrawerProps) {
  const cart = useCart();
  return cart.isCartOpen ? <CartDialog restaurantId={restaurantId} onOrderSuccess={onOrderSuccess} /> : null;
}

function CartDialog({ restaurantId, onOrderSuccess }: CartDrawerProps) {
  const { items, removeFromCart, updateQuantity, clearCart, totalAmount, setIsCartOpen, tableNumber } = useCart();
  const { formatPrice, t, lang } = useI18n();
  const copy = menuCopy(lang);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pending = useRef(false);
  const [customerName, setCustomerName] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  function close() {
    if (!pending.current) setIsCartOpen(false);
  }

  async function checkout(event: FormEvent) {
    event.preventDefault();
    if (!tableNumber || items.length === 0 || pending.current) return;
    pending.current = true;
    setSubmitting(true);
    setFailed(false);
    try {
      const result = await guestApi.createOrder({
        restaurant_id: restaurantId,
        table_number: tableNumber,
        customer_name: customerName.trim() || undefined,
        notes: orderNotes.trim() || undefined,
        items: items.map((line) => ({
          menu_item_id: line.menuItem.id,
          quantity: line.quantity,
          selected_options: line.selectedOptions,
          notes: line.notes,
        })),
      });
      clearCart();
      setIsCartOpen(false);
      onOrderSuccess(result.order);
    } catch {
      setFailed(true);
    } finally {
      pending.current = false;
      setSubmitting(false);
    }
  }

  return (
    <dialog ref={dialogRef} className="qr-dish-dialog qr-cart-dialog" aria-labelledby="qr-cart-title"
      onCancel={(event) => { event.preventDefault(); close(); }}
      onClick={(event) => { if (event.target === event.currentTarget) close(); }}
    >
      <div className="qr-dialog-content">
        <button type="button" className="qr-dialog-close" onClick={close} disabled={submitting} aria-label={copy.close}><X size={22} /></button>
        <div className="qr-dialog-body">
          <h2 id="qr-cart-title">{t.cart}</h2>
          <p>{t.table} {tableNumber}</p>
          {items.length ? (
            <ul className="qr-cart-lines">
              {items.map((line, index) => {
                const photo = line.menuItem.image_url;
                const title = localName(line.menuItem, lang);
                const options = line.menuItem.options?.filter((option) => line.selectedOptions.includes(option.name)).map((option) => localName(option, lang)).join(', ');
                return (
                  <li key={`${line.menuItem.id}:${index}`}>
                    {photo && <img src={photo} alt="" loading="lazy" />}
                    <div className="qr-cart-line-copy">
                      <h3>{title}</h3>
                      {options && <p>{options}</p>}
                      {line.notes && <p>{line.notes}</p>}
                      <strong>{formatPrice(line.itemTotal)}</strong>
                    </div>
                    <div className="qr-quantity" role="group" aria-label={title}>
                      <button type="button" aria-label={line.quantity === 1 ? copy.remove : copy.less} disabled={submitting} onClick={() => line.quantity === 1 ? removeFromCart(index) : updateQuantity(index, line.quantity - 1)}>
                        {line.quantity === 1 ? <Trash2 size={16} /> : <Minus size={17} />}
                      </button>
                      <span>{line.quantity}</span>
                      <button type="button" aria-label={copy.more} disabled={submitting || line.quantity >= MAX_LINE_QUANTITY} onClick={() => updateQuantity(index, line.quantity + 1)}><Plus size={17} /></button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : <p>{t.emptyCart}</p>}
          {items.length > 0 && (
            <form className="qr-cart-form" onSubmit={checkout}>
              <label>
                <span>{copy.orderName}</span>
                <input type="text" autoComplete="given-name" value={customerName} maxLength={80} disabled={submitting} onChange={(event) => setCustomerName(event.target.value)} />
              </label>
              <label className="qr-dialog-note">
                <span>{copy.kitchenNotes}</span>
                <textarea rows={2} value={orderNotes} maxLength={240} disabled={submitting} onChange={(event) => setOrderNotes(event.target.value)} />
              </label>
              {failed && <p role="alert" className="qr-order-error">{copy.orderError}</p>}
              <div className="qr-cart-total"><span>{t.orderTotal}</span><strong>{formatPrice(totalAmount)}</strong></div>
              <button type="submit" className="qr-main-action" disabled={submitting}>
                <span>{submitting ? copy.submitting : t.confirmOrder}</span><ArrowRight size={18} />
              </button>
            </form>
          )}
        </div>
      </div>
    </dialog>
  );
}
