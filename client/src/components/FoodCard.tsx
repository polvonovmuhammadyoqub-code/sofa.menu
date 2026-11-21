import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { localName, menuCopy } from '../lib/guestMenu';
import { useI18n } from '../lib/i18n';
import type { MenuItem } from '../types';

export default function FoodCard({ item, onSelect }: { item: MenuItem; onSelect: (item: MenuItem) => void }) {
  const { lang, formatPrice } = useI18n();
  const [failedPhoto, setFailedPhoto] = useState<string>();
  const photo = item.image_url !== failedPhoto ? item.image_url : undefined;
  const title = localName(item, lang);

  return (
    <article className="qr-dish-card">
      <button type="button" className="qr-dish-target" onClick={() => onSelect(item)}>
        {photo && (
          <img
            className="qr-dish-photo"
            src={photo}
            alt=""
            width="112"
            height="84"
            loading="lazy"
            decoding="async"
            onError={() => setFailedPhoto(photo)}
          />
        )}
        <span className="qr-dish-copy">
          <span className="qr-dish-name">{title}</span>
          {item.weight_or_portion && <span className="qr-dish-portion">{item.weight_or_portion}</span>}
          <strong className="qr-dish-price">{formatPrice(item.price)}</strong>
          {!item.is_available && <span className="qr-dish-unavailable">{menuCopy(lang).unavailable}</span>}
        </span>
        <ChevronRight size={19} className="qr-dish-chevron" aria-hidden="true" />
      </button>
    </article>
  );
}
