import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, LoaderCircle, MapPin } from 'lucide-react';
import { useI18n, type Language } from '../lib/i18n';
import { getGuestCopy, type GuestCopy } from './restaurantGuestCopy';
import { demoGallery, openingHours, restaurantAddress, restaurantHeroPoster, type GuestPageProps } from './restaurantGuestData';

import './restaurantGuestPages.css';

type Area = { id: string; name: string; name_ru?: string | null; name_en?: string | null };
type Availability = { areas: Area[]; today: string; timezone: string; max_guests: number };
type ReservationResponse = { reservation_number: string; status: 'PENDING' };
type FormValues = {
  first_name: string;
  last_name: string;
  phone: string;
  guest_count: string;
  reservation_date: string;
  reservation_time: string;
  area_id: string;
  telegram_username: string;
  notes: string;
};
type Field = keyof FormValues;
type Errors = Partial<Record<Field, keyof GuestCopy>>;

const initialValues: FormValues = {
  first_name: '',
  last_name: '',
  phone: '',
  guest_count: '2',
  reservation_date: '',
  reservation_time: '',
  area_id: '',
  telegram_username: '',
  notes: '',
};

class ReservationError extends Error {
  constructor(readonly code?: string, readonly field?: string) {
    super('Reservation request failed');
  }
}

async function reservationRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new ReservationError(result.code, result.field);
  }
  return response.json();
}

const fieldErrors: Errors = {
  first_name: 'required',
  last_name: 'required',
  phone: 'invalidPhone',
  guest_count: 'invalidGuests',
  reservation_date: 'invalidDate',
  reservation_time: 'invalidTime',
  area_id: 'invalidArea',
  telegram_username: 'invalidTelegram',
};

function endDate(today?: string) {
  if (!today) return undefined;
  const result = new Date(today + 'T00:00:00Z');
  result.setUTCDate(result.getUTCDate() + 90);
  return result.toISOString().slice(0, 10);
}

function areaName(area: Area, lang: Language) {
  if (lang === 'ru') return area.name_ru || area.name;
  if (lang === 'en') return area.name_en || area.name;
  return area.name;
}

export function RestaurantReservationPage({ restaurant, linkTo }: GuestPageProps) {
  const { lang } = useI18n();
  const copy = getGuestCopy(lang);
  const [values, setValues] = useState(initialValues);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [times, setTimes] = useState<string[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [timesError, setTimesError] = useState(false);
  const [reload, setReload] = useState(0);
  const [slotReload, setSlotReload] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<keyof GuestCopy | null>(null);
  const [sending, setSending] = useState(false);
  const [reservation, setReservation] = useState<ReservationResponse | null>(null);
  const submitting = useRef(false);
  const request = useRef<{ payload: string; id: string } | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const confirmation = useRef<HTMLHeadingElement>(null);
  const endpoint = '/api/restaurants/' + encodeURIComponent(restaurant.id);
  const minDate = availability?.today;
  const maxDate = endDate(minDate);
  const hasDateInRange = Boolean(minDate && maxDate && values.reservation_date >= minDate && values.reservation_date <= maxDate);
  const poster = restaurantHeroPoster(restaurant);
  const hours = openingHours(restaurant, lang);
  const address = restaurantAddress(restaurant, lang);

  useEffect(() => {
    const controller = new AbortController();
    setLoadError(false);
    reservationRequest<Availability>(endpoint + '/areas', { signal: controller.signal })
      .then(data => {
        setAvailability(data);
        setValues(previous => ({
          ...previous,
          reservation_date: previous.reservation_date || data.today,
          guest_count: previous.guest_count ? String(Math.min(Number(previous.guest_count), data.max_guests)) : '',
          area_id: data.areas.length === 1 ? data.areas[0].id : previous.area_id,
        }));
      })
      .catch(() => { if (!controller.signal.aborted) setLoadError(true); });
    return () => controller.abort();
  }, [endpoint, reload]);

  useEffect(() => {
    if (!values.reservation_date || !hasDateInRange) {
      setLoadingTimes(false);
      return;
    }
    const controller = new AbortController();
    setLoadingTimes(true);
    setTimesError(false);
    setTimes([]);
    const date = encodeURIComponent(values.reservation_date);
    reservationRequest<{ times: string[] }>(endpoint + '/reservation-times?date=' + date, { signal: controller.signal })
      .then(data => setTimes(data.times))
      .catch(() => { if (!controller.signal.aborted) setTimesError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoadingTimes(false); });
    return () => controller.abort();
  }, [endpoint, hasDateInRange, slotReload, values.reservation_date]);

  useEffect(() => {
    if (reservation) confirmation.current?.focus();
  }, [reservation]);

  function change(field: Field, value: string) {
    setValues(previous => ({
      ...previous,
      [field]: value,
      ...(field === 'reservation_date' && { reservation_time: '' }),
    }));
    setErrors(previous => ({
      ...previous,
      [field]: undefined,
      ...(field === 'reservation_date' && { reservation_time: undefined }),
    }));
    if (field === 'reservation_date') {
      setTimes([]);
      setTimesError(false);
      const inRange = minDate && maxDate && value >= minDate && value <= maxDate;
      if (value && !inRange) setErrors(previous => ({ ...previous, reservation_date: 'invalidDate' }));
      setLoadingTimes(Boolean(inRange));
    }
    setSubmitError(null);
  }

  function focusField(field?: string) {
    if (!field) return;
    requestAnimationFrame(() => {
      const input = form.current?.elements.namedItem(field);
      if (input instanceof HTMLElement) input.focus();
    });
  }

  function validate() {
    const next: Errors = {};
    if (!values.first_name.trim()) next.first_name = 'required';
    if (!values.last_name.trim()) next.last_name = 'required';
    if (!/^\+?\d{9,15}$/.test(values.phone.trim().replace(/[ ().-]/g, ''))) next.phone = 'invalidPhone';
    const guests = Number(values.guest_count);
    if (!Number.isInteger(guests) || guests < 1 || guests > (availability?.max_guests ?? 0)) next.guest_count = 'invalidGuests';
    if (!hasDateInRange) next.reservation_date = 'invalidDate';
    if (!times.includes(values.reservation_time)) next.reservation_time = 'invalidTime';
    if (!availability?.areas.some(area => area.id === values.area_id)) next.area_id = 'invalidArea';
    if (values.telegram_username.trim() && !/^@?[\w]{5,32}$/.test(values.telegram_username.trim())) {
      next.telegram_username = 'invalidTelegram';
    }
    return next;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !availability?.areas.length || loadingTimes || timesError) return;
    setSubmitError(null);
    const validation = validate();
    setErrors(validation);
    if (Object.keys(validation).length) {
      focusField(Object.keys(validation)[0]);
      return;
    }

    submitting.current = true;
    setSending(true);
    try {
      const payload = {
        ...values,
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        phone: values.phone.trim(),
        guest_count: Number(values.guest_count),
        telegram_username: values.telegram_username.trim() || undefined,
        notes: values.notes.trim() || undefined,
      };
      const encoded = JSON.stringify(payload);
      if (request.current?.payload !== encoded) request.current = { payload: encoded, id: crypto.randomUUID() };
      const response = await reservationRequest<ReservationResponse>(endpoint + '/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, request_id: request.current.id }),
      });
      setReservation(response);
    } catch (error) {
      if (error instanceof ReservationError) {
        const field = error.field as Field;
        const message = fieldErrors[field];
        if (message) {
          setErrors({ [field]: message });
          focusField(field);
          if (error.code === 'UNAVAILABLE_TIME') {
            setValues(previous => ({ ...previous, reservation_time: '' }));
            setSlotReload(previous => previous + 1);
          }
        } else {
          setSubmitError(error.code === 'TOO_MANY_REQUESTS' ? 'tooMany' : 'submitError');
        }
      } else {
        setSubmitError('submitError');
      }
    } finally {
      submitting.current = false;
      setSending(false);
    }
  }

  function fieldProps(field: Field) {
    return {
      name: field,
      id: 'reservation-' + field,
      value: values[field],
      'aria-labelledby': 'reservation-label-' + field,
      'aria-invalid': Boolean(errors[field]),
      'aria-describedby': errors[field] ? 'reservation-error-' + field : undefined,
    };
  }

  function fieldError(field: Field) {
    const message = errors[field];
    return message && <small id={'reservation-error-' + field} className="guest-field-error">{copy[message]}</small>;
  }

  return (
    <main className="guest-pages guest-container guest-inner-page">
      <a className="guest-text-link guest-back" href={linkTo()}><ArrowLeft size={18} />{copy.backHome}</a>
      <div className="guest-reservation-layout">
        <aside className="guest-booking-photo">
          {poster && <img src={poster === demoGallery[0] ? '/demo/interior-small.webp' : poster} alt="" onError={event => { event.currentTarget.hidden = true; }} />}
          <div>
            <span className="guest-booking-photo-name">{restaurant.name}</span>
            {hours && <span><Clock3 size={17} />{hours}</span>}
            {address && <span><MapPin size={17} />{address}</span>}
          </div>
        </aside>

        <section className="guest-booking-panel" aria-labelledby="reservation-title">
          {reservation ? (
            <div className="guest-confirmation">
              <span className="guest-confirmation-icon"><Check size={26} aria-hidden="true" /></span>
              <h1 id="reservation-title" ref={confirmation} tabIndex={-1}>{copy.success}</h1>
              <p>{copy.successDetail}</p>
              <div className="guest-reservation-number">
                {copy.reference}<strong>{reservation.reservation_number}</strong>
              </div>
              <a className="guest-button guest-button-dark" href={linkTo('menu')}>{copy.menu}<ArrowRight size={18} /></a>
            </div>
          ) : (
            <>
              <h1 id="reservation-title">{copy.reserve}</h1>
              <p className="guest-panel-intro">{copy.reserveSubtitle}</p>

              {loadError ? (
                <div role="alert" className="guest-booking-notice">
                  <p>{copy.loadError}</p>
                  <button type="button" onClick={() => setReload(value => value + 1)} className="guest-text-link">{copy.retry}</button>
                </div>
              ) : !availability ? (
                <div role="status" className="guest-booking-notice"><LoaderCircle className="guest-spinner" size={18} />{copy.loading}</div>
              ) : !availability.areas.length ? (
                <div role="status" className="guest-booking-notice">{copy.noAreas}</div>
              ) : (
                <form ref={form} onSubmit={submit} noValidate className="guest-booking-form">
                  <fieldset disabled={sending} className="guest-booking-fields">
                    <label htmlFor="reservation-first_name">
                      <span id="reservation-label-first_name">{copy.firstName}</span>
                      <input {...fieldProps('first_name')} onChange={event => change('first_name', event.target.value)} autoComplete="given-name" maxLength={80} required />
                      {fieldError('first_name')}
                    </label>
                    <label htmlFor="reservation-last_name">
                      <span id="reservation-label-last_name">{copy.lastName}</span>
                      <input {...fieldProps('last_name')} onChange={event => change('last_name', event.target.value)} autoComplete="family-name" maxLength={80} required />
                      {fieldError('last_name')}
                    </label>
                    <label htmlFor="reservation-phone">
                      <span id="reservation-label-phone">{copy.phone}</span>
                      <input {...fieldProps('phone')} onChange={event => change('phone', event.target.value)} type="tel" autoComplete="tel" placeholder="+998" maxLength={30} required />
                      {fieldError('phone')}
                    </label>
                    <label htmlFor="reservation-guest_count">
                      <span id="reservation-label-guest_count">{copy.guestCount}</span>
                      <input {...fieldProps('guest_count')} onChange={event => change('guest_count', event.target.value)} type="number" inputMode="numeric" min={1} max={availability.max_guests} required />
                      {fieldError('guest_count')}
                    </label>
                    <label htmlFor="reservation-reservation_date">
                      <span id="reservation-label-reservation_date">{copy.date}</span>
                      <input {...fieldProps('reservation_date')} onChange={event => change('reservation_date', event.target.value)} type="date" min={minDate} max={maxDate} required />
                      {fieldError('reservation_date')}
                    </label>
                    <label htmlFor="reservation-reservation_time">
                      <span id="reservation-label-reservation_time">{copy.time}</span>
                      <select {...fieldProps('reservation_time')} onChange={event => change('reservation_time', event.target.value)} disabled={loadingTimes || !times.length} required>
                        <option value="">{loadingTimes ? copy.loading : copy.chooseTime}</option>
                        {times.map(time => <option key={time} value={time}>{time}</option>)}
                      </select>
                      {fieldError('reservation_time')}
                    </label>
                    {timesError && (
                      <div role="alert" className="guest-form-wide guest-booking-notice">
                        <p>{copy.loadError}</p>
                        <button type="button" className="guest-text-link" onClick={() => setSlotReload(value => value + 1)}>{copy.retry}</button>
                      </div>
                    )}
                    {!timesError && !loadingTimes && hasDateInRange && !times.length && (
                      <p role="status" className="guest-form-wide guest-field-hint">{copy.noTimes}</p>
                    )}
                    <label htmlFor="reservation-area_id">
                      <span id="reservation-label-area_id">{copy.area}</span>
                      <select {...fieldProps('area_id')} onChange={event => change('area_id', event.target.value)} required>
                        <option value="">{copy.chooseArea}</option>
                        {availability.areas.map(area => <option key={area.id} value={area.id}>{areaName(area, lang)}</option>)}
                      </select>
                      {fieldError('area_id')}
                    </label>
                    <label htmlFor="reservation-telegram_username">
                      <span id="reservation-label-telegram_username">{copy.telegram} <small>({copy.optional})</small></span>
                      <input {...fieldProps('telegram_username')} onChange={event => change('telegram_username', event.target.value)} autoCapitalize="off" spellCheck={false} maxLength={33} placeholder="@username" />
                      {fieldError('telegram_username')}
                    </label>
                    <label htmlFor="reservation-notes" className="guest-form-wide">
                      <span id="reservation-label-notes">{copy.notes} <small>({copy.optional})</small></span>
                      <textarea {...fieldProps('notes')} onChange={event => change('notes', event.target.value)} maxLength={500} rows={3} />
                    </label>
                  </fieldset>
                  <p className="guest-booking-privacy">{copy.privacy}</p>
                  {submitError && <p role="alert" className="guest-field-error">{copy[submitError]}</p>}
                  <button className="guest-button guest-button-dark guest-booking-submit" type="submit" disabled={sending || loadingTimes || timesError || !times.length}>
                    {sending ? <LoaderCircle className="guest-spinner" size={18} /> : <CalendarDays size={18} />}
                    {sending ? copy.sending : copy.reserve}
                  </button>
                </form>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
