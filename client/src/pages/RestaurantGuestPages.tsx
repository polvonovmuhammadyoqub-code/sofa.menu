import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Bike, CalendarDays, Clock3,
  Instagram, MapPin, Pause, Phone, Play, Send, Utensils,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import type { Restaurant } from '../types';
import { getGuestCopy } from './restaurantGuestCopy';
import {
  demoGallery, demoSlug, demoVideo, getPhone, localizedName, openingHours, restaurantAddress,
  restaurantDishPhoto, restaurantHeroPoster, restaurantWelcome, safeExternalUrl,
  type GuestPageProps,
} from './restaurantGuestData';
import './restaurantGuestPages.css';

function HeroMedia({ restaurant }: { restaurant: Restaurant }) {
  const { lang } = useI18n();
  const copy = getGuestCopy(lang);
  const video = useRef<HTMLVideoElement>(null);
  const [autoPlay, setAutoPlay] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const pausedByGuest = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [failed, setFailed] = useState(false);
  const poster = restaurantHeroPoster(restaurant);
  const videoUrl = restaurant.slug === demoSlug && restaurant.hero_video === demoVideo ? '/demo/chef.mp4' : restaurant.hero_video;

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const data = window.matchMedia('(prefers-reduced-data: reduce)');
    const checkPreferences = () => {
      const enabled = !motion.matches && !data.matches;
      setAutoPlay(enabled);
      if (!enabled) video.current?.pause();
    };
    checkPreferences();
    motion.addEventListener('change', checkPreferences);
    data.addEventListener('change', checkPreferences);
    return () => {
      motion.removeEventListener('change', checkPreferences);
      data.removeEventListener('change', checkPreferences);
    };
  }, []);

  useEffect(() => {
    const player = video.current;
    if (!player) return;
    const watcher = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), { threshold: 0.2 });
    watcher.observe(player);
    return () => watcher.disconnect();
  }, [videoUrl]);

  useEffect(() => {
    if (!isVisible) video.current?.pause();
    else if (autoPlay && !pausedByGuest.current) video.current?.play().catch(() => {});
  }, [autoPlay, isVisible]);

  function togglePlayback() {
    const player = video.current;
    if (!player) return;
    if (!player.paused) {
      pausedByGuest.current = true;
      player.pause();
      return;
    }
    pausedByGuest.current = false;
    if (!player.getAttribute('src') && videoUrl) player.src = videoUrl;
    player.play().catch(() => {});
  }

  return (
    <>
      {poster && (
        <img
          className="guest-hero-media"
          src={poster}
          srcSet={poster === demoGallery[0] ? '/demo/interior-small.webp 900w, /demo/interior.webp 1600w' : undefined}
          sizes="100vw"
          alt=""
          fetchPriority="high"
          onError={event => { event.currentTarget.hidden = true; }}
        />
      )}
      {videoUrl && !failed && (
        <video
          ref={video}
          className={`guest-hero-media guest-hero-video ${started ? 'guest-hero-video-ready' : ''}`}
          src={(autoPlay && isVisible) || started ? videoUrl : undefined}
          aria-hidden="true"
          muted
          playsInline
          loop
          preload="none"
          onPlaying={() => { setStarted(true); setPlaying(true); }}
          onPause={() => setPlaying(false)}
          onError={() => setFailed(true)}
        />
      )}
      <div className="guest-hero-shade" />
      {videoUrl && !failed && (
        <button className="guest-media-toggle" aria-label={playing ? copy.pause : copy.play} onClick={togglePlayback} type="button">
          {playing ? <Pause size={18} /> : <Play size={18} />}
        </button>
      )}
    </>
  );
}

export function RestaurantHomepage({ restaurant, linkTo }: GuestPageProps) {
  const { lang, formatPrice } = useI18n();
  const copy = getGuestCopy(lang);
  const phone = getPhone(restaurant);
  const hours = openingHours(restaurant, lang);
  const categories = restaurant.categories ?? [];
  const available = categories.flatMap(category => category.menu_items ?? []).filter(item => item.is_available);
  const featuredByCategory = categories.flatMap(category => {
    const item = category.menu_items?.find(candidate => candidate.is_available && candidate.is_featured);
    return item ? [item] : [];
  });
  const featured = [...new Set([...featuredByCategory, ...available.filter(item => item.is_featured || item.popularity_badge)])].slice(0, 3);
  const gallery = restaurant.gallery_images?.length
    ? restaurant.gallery_images
    : restaurant.slug === demoSlug ? demoGallery : [];

  return (
    <main className="guest-pages">
      <section className="guest-hero" aria-labelledby="guest-home-title">
        <HeroMedia restaurant={restaurant} />
        <div className="guest-hero-inner">
          <div className="guest-hero-intro">
            <span
              className="guest-hero-rule"
              style={/^#[\da-f]{6}$/i.test(restaurant.brand_color) ? { backgroundColor: restaurant.brand_color } : undefined}
              aria-hidden="true"
            />
            <h1 id="guest-home-title">{restaurant.name}</h1>
            <p>{restaurantWelcome(restaurant, lang)}</p>
          </div>
          <div className="guest-hero-actions">
            <a href={linkTo('menu')} className="guest-button guest-button-gold"><Utensils size={18} />{copy.menu}</a>
            <a href={linkTo('reservation')} className="guest-button guest-button-glass"><CalendarDays size={18} />{copy.reserve}</a>
            {restaurant.delivery_enabled && (
              <a href={linkTo('delivery')} className="guest-button guest-button-glass"><Bike size={19} />{copy.delivery}</a>
            )}
            {phone ? (
              <a href={`tel:${phone}`} className="guest-button guest-button-glass"><Phone size={17} />{copy.contact}</a>
            ) : null}
          </div>
          {(hours || typeof restaurant.is_open === 'boolean') && (
            <div className="guest-hero-hours">
              {typeof restaurant.is_open === 'boolean' && (
                <span className={`guest-status ${restaurant.is_open ? 'guest-status-open' : ''}`}>
                  {restaurant.is_open ? copy.open : copy.closed}
                </span>
              )}
              {hours && <span><Clock3 size={16} />{hours}</span>}
            </div>
          )}
        </div>
      </section>

      {featured.length > 0 && (
        <section className="guest-container guest-section" aria-labelledby="popular-heading">
          <div className="guest-section-heading">
            <h2 id="popular-heading">{copy.popular}</h2>
            <a className="guest-text-link" href={linkTo('menu')}>{copy.allMenu}<ArrowRight size={18} /></a>
          </div>
          <div className="guest-featured">
            {featured.map(item => {
              const image = restaurantDishPhoto(restaurant, item.image_url);
              const menu = new URL(linkTo('menu'), window.location.origin);
              menu.searchParams.set('dish', item.id);
              return (
                <a className="guest-dish" key={item.id} href={menu.pathname + menu.search}>
                  <div className="guest-dish-media">
                    <Utensils size={36} aria-hidden="true" />
                    {image && <img src={image} alt="" loading="lazy" decoding="async" onError={event => { event.currentTarget.hidden = true; }} />}
                  </div>
                  <div className="guest-dish-info">
                    <h3>{localizedName(item, lang)}</h3>
                    <span>{formatPrice(item.price)}</span>
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      )}

      {gallery.length > 0 && (
        <section className="guest-container guest-section" aria-labelledby="atmosphere-heading">
          <div className="guest-section-heading">
            <h2 id="atmosphere-heading">{copy.atmosphere}</h2>
            <a className="guest-text-link" href="#guest-visit">{copy.address}<ArrowDown size={17} /></a>
          </div>
          <div className="guest-gallery">
            {gallery.slice(0, 3).map((image) => (
              <img key={image} src={image === demoGallery[0] ? '/demo/interior-small.webp' : image} alt="" loading="lazy" decoding="async" />
            ))}
          </div>
          {restaurant.slug === demoSlug && !restaurant.gallery_images?.length && (
            <p className="guest-gallery-note">{copy.illustration}</p>
          )}
        </section>
      )}

      <section className="guest-visit" id="guest-visit" aria-labelledby="guest-visit-title">
        <div className="guest-container guest-visit-inner">
          <h2 id="guest-visit-title">{copy.contact}</h2>
          <ContactDetails restaurant={restaurant} />
        </div>
      </section>
    </main>
  );
}

export function RestaurantContactPage({ restaurant, linkTo }: GuestPageProps) {
  const { lang } = useI18n();
  const copy = getGuestCopy(lang);
  return (
    <main className="guest-pages guest-container guest-inner-page">
      <a className="guest-text-link guest-back" href={linkTo()}><ArrowLeft size={18} />{copy.backHome}</a>
      <div className="guest-contact-panel">
        <h1>{copy.contact}</h1>
        <ContactDetails restaurant={restaurant} />
      </div>
    </main>
  );
}

function ContactDetails({ restaurant }: { restaurant: Restaurant }) {
  const { lang } = useI18n();
  const copy = getGuestCopy(lang);
  const phone = getPhone(restaurant);
  const hours = openingHours(restaurant, lang);
  const address = restaurantAddress(restaurant, lang);
  const query = restaurant.address ? encodeURIComponent(restaurant.address) : undefined;
  const google = safeExternalUrl(restaurant.google_maps_url) || (query && `https://www.google.com/maps/search/?api=1&query=${query}`);
  const yandex = safeExternalUrl(restaurant.yandex_maps_url) || (query && `https://yandex.com/maps/?text=${query}`);
  const instagram = safeExternalUrl(restaurant.instagram_url);
  const telegram = safeExternalUrl(restaurant.telegram_url);

  if (!phone && !hours && !address && !instagram && !telegram && !google && !yandex) return <p>{copy.contactMissing}</p>;

  return (
    <div className="guest-contact-details">
      <dl>
        {address && <div><dt><MapPin size={20} />{copy.address}</dt><dd>{address}</dd></div>}
        {hours && <div><dt><Clock3 size={20} />{copy.hours}</dt><dd>{hours}</dd></div>}
        {phone && <div><dt><Phone size={19} />{copy.phone}</dt><dd><a href={`tel:${phone}`}>{restaurant.phone}</a></dd></div>}
      </dl>
      <div className="guest-contact-links">
        {google && <a className="guest-text-link" href={google} target="_blank" rel="noreferrer">{copy.google}<ArrowUpRight size={16} /></a>}
        {yandex && <a className="guest-text-link" href={yandex} target="_blank" rel="noreferrer">{copy.yandex}<ArrowUpRight size={16} /></a>}
        {instagram && <a className="guest-text-link" href={instagram} target="_blank" rel="noreferrer"><Instagram size={17} />Instagram</a>}
        {telegram && <a className="guest-text-link" href={telegram} target="_blank" rel="noreferrer"><Send size={17} />Telegram</a>}
      </div>
    </div>
  );
}
