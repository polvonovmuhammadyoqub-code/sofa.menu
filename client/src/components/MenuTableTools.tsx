import { Bell } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { menuCopy } from '../lib/guestMenu';
import { useI18n } from '../lib/i18n';

type Props = {
  restaurantId: string;
  tableNumber: string;
  orderingEnabled: boolean;
};

export default function MenuTableTools({ restaurantId, tableNumber, orderingEnabled }: Props) {
  const { t, lang } = useI18n();
  const copy = menuCopy(lang);
  const socket = useRef<Socket>();
  const cooldown = useRef<number>();
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');

  useEffect(() => () => {
    socket.current?.disconnect();
    window.clearTimeout(cooldown.current);
  }, []);

  function callWaiter() {
    if (!orderingEnabled || status === 'sending' || status === 'sent') return;
    socket.current ??= io();
    setStatus('sending');
    socket.current.timeout(5000).emit('table:call_waiter', { restaurantId, tableNumber }, (error: Error | null, result?: { ok: boolean }) => {
      if (!error && result?.ok) {
        setStatus('sent');
        cooldown.current = window.setTimeout(() => setStatus('idle'), 30_000);
      } else {
        setStatus('failed');
      }
    });
  }

  return (
    <div className="qr-table">
      <span>{t.table} {tableNumber}</span>
      {orderingEnabled && (
        <button type="button" onClick={callWaiter} disabled={status === 'sending' || status === 'sent'}>
          <Bell size={17} aria-hidden="true" /> {t.callWaiter}
        </button>
      )}
      {status !== 'idle' && (
        <span role="status" className="qr-waiter-status">
          {status === 'sending' ? copy.submitting : status === 'sent' ? copy.waiterSent : copy.waiterError}
        </span>
      )}
    </div>
  );
}
