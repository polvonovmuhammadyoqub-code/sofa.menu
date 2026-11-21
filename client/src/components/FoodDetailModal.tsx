import { useEffect, useRef, useState } from 'react';
import { Clock, Heart, Minus, Plus, ShoppingBag, X } from 'lucide-react';
import { MAX_LINE_QUANTITY, useCart } from '../context/CartContext';
import { localDescription, localIngredients, localName, menuCopy } from '../lib/guestMenu';
import { useI18n } from '../lib/i18n';
import type { MenuItem } from '../types';

interface FoodDetailModalProps {
  item: MenuItem;
  onClose: () => void;
  orderingEnabled: boolean;
  favorite: boolean;
  onToggleFavorite: () => void;
}

export default function FoodDetailModal({ item, onClose, orderingEnabled, favorite, onToggleFavorite }: FoodDetailModalProps) {
  const { addToCart } = useCart();
  const { formatPrice, t, lang } = useI18n();
  const copy = menuCopy(lang);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState(() => item.options?.filter((option) => option.is_required).map((option) => option.name) || []);
  const [notes, setNotes] = useState('');
  const [photoFailed, setPhotoFailed] = useState(false);
  const title = localName(item, lang);
  const description = localDescription(item, lang);
  const ingredients = localIngredients(item, lang);
  const photo = !photoFailed ? item.image_url : undefined;
  const canOrder = orderingEnabled && item.is_available;
  const options = item.options || [];
  const unitPrice = options.reduce((total, option) => selectedOptions.includes(option.name) ? total + option.price_modifier : total, item.price);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  function toggleOption(name: string) {
    setSelectedOptions((current) => current.includes(name) ? current.filter((option) => option !== name) : [...current, name]);
  }

  function addDish() {
    if (!canOrder) return;
    addToCart(item, quantity, selectedOptions, notes.trim() || undefined);
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className="qr-dish-dialog"
      aria-labelledby="qr-dish-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="qr-dialog-content">
        <button type="button" className="qr-dialog-close" aria-label={copy.close} onClick={onClose}><X size={22} /></button>
        {photo && (
          <div className="qr-dialog-photo">
            <img src={photo} alt={title} width="960" height="720" onError={() => setPhotoFailed(true)} />
          </div>
        )}
        <div className="qr-dialog-body">
          {!item.is_available && <p className="qr-dialog-status">{copy.unavailable}</p>}
          <h2 id="qr-dish-title">{title}</h2>
          <strong className="qr-dialog-price">{formatPrice(item.price)}</strong>
          {description && <p>{description}</p>}
          {(item.weight_or_portion || item.preparation_time || item.calories || item.allergens || ingredients) && (
            <dl className="qr-dialog-specs">
              {item.weight_or_portion && <div><dt>{t.portion}</dt><dd>{item.weight_or_portion}</dd></div>}
              {item.preparation_time && <div><dt>{t.prepTime}</dt><dd><Clock size={14} />{item.preparation_time}</dd></div>}
              {item.calories && <div><dt>{t.calories}</dt><dd>{item.calories}</dd></div>}
              {item.allergens && <div><dt>{t.allergens}</dt><dd>{item.allergens}</dd></div>}
              {ingredients && <div><dt>{copy.ingredients}</dt><dd>{ingredients}</dd></div>}
            </dl>
          )}
          {options.length > 0 && (
            <section className="qr-dialog-options">
              <h3>{t.options}</h3>
              {options.map((option) => (
                <label key={option.id}>
                  <span>
                    {canOrder && <input type="checkbox" checked={selectedOptions.includes(option.name)} disabled={option.is_required} onChange={() => toggleOption(option.name)} />}
                    {localName(option, lang)}
                    {option.is_required && <small>{copy.required}</small>}
                  </span>
                  {option.price_modifier !== 0 && <strong>{option.price_modifier > 0 && '+'}{formatPrice(option.price_modifier)}</strong>}
                </label>
              ))}
            </section>
          )}
          {canOrder && (
            <label className="qr-dialog-note">
              <span>{copy.kitchenNotes}</span>
              <textarea rows={2} maxLength={240} value={notes} onChange={(event) => setNotes(event.target.value)} />
            </label>
          )}
          <button type="button" className="qr-detail-favorite" aria-pressed={favorite} onClick={onToggleFavorite}>
            <Heart size={19} fill={favorite ? 'currentColor' : 'none'} aria-hidden="true" />
            {favorite ? copy.removeFavorite : copy.addFavorite}
          </button>
        </div>
        {canOrder && (
          <div className="qr-dialog-footer">
            <div className="qr-quantity" aria-label={copy.quantity} role="group">
              <button type="button" aria-label={copy.less} disabled={quantity <= 1} onClick={() => setQuantity(quantity - 1)}><Minus size={18} /></button>
              <span>{quantity}</span>
              <button type="button" aria-label={copy.more} disabled={quantity >= MAX_LINE_QUANTITY} onClick={() => setQuantity(quantity + 1)}><Plus size={18} /></button>
            </div>
            <button type="button" className="qr-main-action" onClick={addDish}>
              <ShoppingBag size={18} /><span>{t.addToCart}</span><strong>{formatPrice(unitPrice * quantity)}</strong>
            </button>
          </div>
        )}
      </div>
    </dialog>
  );
}
