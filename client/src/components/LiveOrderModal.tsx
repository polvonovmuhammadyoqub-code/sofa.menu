import { useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { io } from 'socket.io-client';
import { guestApi } from '../lib/guestApi';
import { localName, menuCopy } from '../lib/guestMenu';
import { useI18n } from '../lib/i18n';
import type { MenuItem, Order, OrderStatus } from '../types';

interface LiveOrderModalProps {
  initialOrder: Order;
  dishes: MenuItem[];
  onClose: () => void;
}

export default function LiveOrderModal({ initialOrder, dishes, onClose }: LiveOrderModalProps) {
  const [order, setOrder] = useState(initialOrder);
  const { lang, formatPrice, t } = useI18n();
  const copy = menuCopy(lang);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const orderId = initialOrder.id;

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  useEffect(() => {
    let active = true;
    const socket = io();
    socket.on('connect', () => socket.emit('join:order', orderId));
    socket.on('order:status_update', (update: Order) => {
      if (update.id === orderId) setOrder((current) => ({ ...current, ...update }));
    });

    const interval = window.setInterval(async () => {
      try {
        const fresh = await guestApi.getOrderById(orderId);
        if (active && fresh) setOrder(fresh);
      } catch {
        // Keep the last known status when the network is unavailable.
      }
    }, 10000);

    return () => {
      active = false;
      socket.disconnect();
      window.clearInterval(interval);
    };
  }, [orderId]);

  const stages: { value: OrderStatus; label: string }[] = [
    { value: 'Yangi', label: t.statusYangi },
    { value: 'Qabul qilindi', label: t.statusQabul },
    { value: 'Tayyorlanmoqda', label: t.statusTayyorlanmoqda },
    { value: 'Tayyor', label: t.statusTayyor },
    { value: 'Yetkazildi', label: t.statusYetkazildi },
  ];
  const stageIndex = stages.findIndex((stage) => stage.value === order.status);
  const status = order.status === 'Bekor qilindi' ? t.statusBekor : stages[stageIndex]?.label;

  return (
    <dialog ref={dialogRef} className="qr-dish-dialog qr-track-dialog" aria-labelledby="qr-order-title"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="qr-dialog-content">
        <button type="button" className="qr-dialog-close" onClick={onClose} aria-label={copy.close}><X size={22} /></button>
        <div className="qr-dialog-body">
          <p className="qr-dialog-tag">{copy.orderNumber} #{order.order_number}</p>
          <h2 id="qr-order-title">{t.orderStatus}</h2>
          {order.table?.table_number && <p>{t.table} {order.table.table_number}</p>}
          <p className="qr-track-status" role="status">{status}</p>
          {stageIndex >= 0 && (
            <ol className="qr-track-steps">
              {stages.map((stage, index) => (
                <li key={stage.value} aria-current={index === stageIndex ? 'step' : undefined}>
                  <span className="qr-track-step-icon">{index < stageIndex ? <Check size={15} /> : index + 1}</span>
                  {stage.label}
                </li>
              ))}
            </ol>
          )}
          <ul className="qr-track-items" aria-label={copy.items}>
            {order.items?.map((item) => {
              const dish = dishes.find((candidate) => candidate.id === item.menu_item_id);
              const title = dish ? localName(dish, lang) : item.dish_name;
              return <li key={item.id}><span>{item.quantity} × {title}</span><strong>{formatPrice(item.total_price)}</strong></li>;
            })}
          </ul>
          <div className="qr-cart-total"><span>{t.orderTotal}</span><strong>{formatPrice(order.total_amount)}</strong></div>
        </div>
      </div>
    </dialog>
  );
}
