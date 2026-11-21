import { useState } from 'react';
import { ArrowUpRight, Clock, Heart, Play, Utensils } from 'lucide-react';
import { dishCollection, dishImage, dishVideo, localDescription, localName, menuCopy } from '../lib/guestMenu';
import { useI18n } from '../lib/i18n';
import type { MenuItem } from '../types';

interface FoodCardProps {
  item: MenuItem;
  onSelect: (item: MenuItem) => void;
  favorite: boolean;
  onToggleFavorite: () => void;
}

export default function FoodCard({ item, onSelect, favorite, onToggleFavorite }: FoodCardProps) {
  const { lang, formatPrice } = useI18n();
  const copy = menuCopy(lang);
  const title = localName(item, lang);
  const description = localDescription(item, lang);
  const [failedPhoto, setFailedPhoto] = useState<string>();
  const photo = dishImage(item);
  const collection = dishCollection(item);

  return (
    <article className="qr-dish-card">
      <button type="button" className="qr-dish-target" onClick={() => onSelect(item)} aria-label={title}>
        <div className="qr-dish-photo">
          {photo && photo !== failedPhoto ? (
            <img src={photo} alt="" loading="lazy" decoding="async" onError={() => setFailedPhoto(photo)} />
          ) : (
            <Utensils size={32} aria-hidden="true" />
          )}
          <div className="qr-dish-tags">
            {!item.is_available && <span className="qr-dish-status">{copy.unavailable}</span>}
            {item.is_available && collection && <span className="qr-dish-badge">{copy[collection]}</span>}
            {dishVideo(item) && <span className="qr-dish-film" title={copy.video}><Play size={13} fill="currentColor" /><span className="sr-only">{copy.video}</span></span>}
          </div>
        </div>
        <div className="qr-dish-card-copy">
          <h3>{title}</h3>
          {description && <p>{description}</p>}
          {(item.weight_or_portion || item.preparation_time) && (
            <div className="qr-dish-meta">
              {item.weight_or_portion && <span>{item.weight_or_portion}</span>}
              {item.preparation_time && <span><Clock size={13} />{item.preparation_time}</span>}
            </div>
          )}
          <div className="qr-dish-card-bottom">
            <strong>{formatPrice(item.price)}</strong>
            <ArrowUpRight size={20} aria-hidden="true" />
          </div>
        </div>
      </button>
      <button
        type="button"
        className="qr-favorite"
        onClick={onToggleFavorite}
        aria-label={favorite ? copy.removeFavorite : copy.addFavorite}
        aria-pressed={favorite}
      >
        <Heart size={19} fill={favorite ? 'currentColor' : 'none'} />
      </button>
    </article>
  );
}
