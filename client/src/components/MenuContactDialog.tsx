import { Phone, Send, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { menuContacts } from '../lib/menuContacts';
import { menuCopy } from '../lib/guestMenu';
import { useI18n } from '../lib/i18n';
import type { Restaurant } from '../types';

export default function MenuContactDialog({ restaurant, onClose }: { restaurant: Restaurant; onClose: () => void }) {
  const { lang } = useI18n();
  const copy = menuCopy(lang);
  const { phone, telegram } = menuContacts(restaurant);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className="qr-dish-dialog qr-contact-dialog"
      aria-labelledby="qr-contact-title"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="qr-dialog-content">
        <button type="button" className="qr-dialog-close" aria-label={copy.close} onClick={onClose}><X size={22} /></button>
        <div className="qr-dialog-body">
          <h2 id="qr-contact-title">{copy.contactTitle}</h2>
          <div className="qr-contact-links">
            {phone && (
              <a href={phone.href}>
                <Phone size={22} aria-hidden="true" />
                <span>{copy.call}<strong>{phone.text}</strong></span>
              </a>
            )}
            {telegram && (
              <a href={telegram.href} target="_blank" rel="noopener noreferrer">
                <Send size={22} aria-hidden="true" />
                <span>{copy.writeTelegram}<strong>{telegram.text}</strong></span>
              </a>
            )}
            {!phone && !telegram && <p>{copy.contactMissing}</p>}
          </div>
        </div>
      </div>
    </dialog>
  );
}
