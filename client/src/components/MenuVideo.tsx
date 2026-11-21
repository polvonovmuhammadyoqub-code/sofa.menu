import { Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { menuCopy } from '../lib/guestMenu';
import { useI18n } from '../lib/i18n';
import type { MenuClip } from '../lib/menuMedia';
import useReducedMotion from '../lib/useReducedMotion';

type Props = {
  clips: MenuClip[];
  fallbackPoster?: string;
  covered: boolean;
};

export default function MenuVideo({ clips, fallbackPoster, covered }: Props) {
  const copy = menuCopy(useI18n().lang);
  const reducedMotion = useReducedMotion();
  const container = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [index, setIndex] = useState(0);
  const [intent, setIntent] = useState<'auto' | 'play' | 'pause'>('auto');
  const [blocked, setBlocked] = useState(false);
  const [visible, setVisible] = useState(true);
  const [started, setStarted] = useState(false);
  const [visibleFrame, setVisibleFrame] = useState<string>();
  const [playing, setPlaying] = useState(false);
  const clip = clips[index];
  const wanted = intent === 'play' || (intent === 'auto' && !reducedMotion);
  const shouldPlay = wanted && !blocked && visible && !covered;
  const shouldLoad = wanted || started;

  useEffect(() => {
    const hero = container.current;
    if (!hero || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  function attemptPlayback(target: HTMLVideoElement) {
    target.muted = true;
    target.defaultMuted = true;
    void target.play().catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setBlocked(true);
    });
  }

  useEffect(() => {
    const element = video.current;
    if (!element || !clip) return;
    if (shouldPlay) attemptPlayback(element);
    else element.pause();
  }, [clip, shouldPlay]);

  function toggle() {
    const element = video.current;
    if (!element || !clip) return;
    if (!element.paused && !element.ended) {
      setIntent('pause');
      element.pause();
      return;
    }

    setIntent('play');
    setStarted(true);
    if (!element.getAttribute('src')) element.src = clip.src;
    if (element.error) element.load();
    setBlocked(false);
    // Play directly from the tap, including on mobile browsers that require a gesture.
    attemptPlayback(element);
  }

  function advance() {
    if (!shouldPlay || !video.current) return;
    if (clips.length === 1) {
      video.current.currentTime = 0;
      attemptPlayback(video.current);
    } else {
      setIndex((current) => (current + 1) % clips.length);
    }
  }

  const poster = clip?.poster || fallbackPoster;
  if (!clip && !poster) return null;

  return (
    <div className="qr-video" ref={container}>
      {poster && <img className="qr-video-poster" src={poster} alt="" fetchPriority="high" decoding="async" />}
      {clip && (
        <>
          <video
            ref={video}
            className="qr-video-player"
            data-frame={visibleFrame === clip.src && !blocked ? 'visible' : undefined}
            src={shouldLoad ? clip.src : undefined}
            poster={poster}
            autoPlay={shouldPlay}
            muted
            playsInline
            preload="none"
            aria-hidden="true"
            onPlaying={() => {
              setStarted(true);
              setPlaying(true);
              setVisibleFrame(clip.src);
            }}
            onPause={() => setPlaying(false)}
            onEnded={() => { setPlaying(false); advance(); }}
            onError={() => { setPlaying(false); setBlocked(true); }}
          />
          <button type="button" className="qr-video-toggle" onClick={toggle}>
            {playing ? <Pause size={19} aria-hidden="true" /> : <Play size={19} aria-hidden="true" />}
            <span>{playing ? copy.pause : copy.play}</span>
          </button>
        </>
      )}
    </div>
  );
}
