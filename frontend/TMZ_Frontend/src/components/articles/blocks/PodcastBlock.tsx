import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import type { PodcastBlock as PodcastBlockType } from '@/types';

export function PodcastBlock({ podcast }: { podcast: PodcastBlockType }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setProgress(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnd = () => setPlaying(false);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnd);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    setMuted(audio.muted);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * duration;
  };

  const fmt = (s: number) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const isValidMediaUrl = (value: string) => {
    if (!value || !value.trim()) return false;
    try {
      const parsed = new URL(value, window.location.origin);
      const okProtocol = ['http:', 'https:'].includes(parsed.protocol);
      const okExt = /(\.(mp3|wav|m4a|aac|ogg|oga|mp4|m4v|webm))(\?.*)?$|audio|video/i.test(value);
      const okPath = !parsed.pathname.endsWith('/');
      return okProtocol && (okExt || okPath);
    } catch {
      return false;
    }
  };

  const audioSource = podcast.audio_url?.trim();
  const hasValidAudioSource = Boolean(audioSource && isValidMediaUrl(audioSource));
  const pct = duration ? (progress / duration) * 100 : 0;

  return (
    <div className="article-surface p-6 md:p-8 my-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 rounded-xl bg-brand-accent/20 flex items-center justify-center">
          <Volume2 className="w-5 h-5 text-brand-primary" />
        </div>
        <div>
          <p className="text-xs text-muted uppercase tracking-wider">Podcast</p>
          <h3 className="font-display text-lg" style={{ color: 'var(--article-text)' }}>{podcast.title}</h3>
        </div>
      </div>

      {podcast.description && (
        <p className="text-sm mb-5" style={{ color: 'var(--article-muted)' }}>{podcast.description}</p>
      )}

      <audio ref={audioRef} src={audioSource || undefined} preload="metadata" />

      {!hasValidAudioSource && (
        <p className="text-sm" style={{ color: 'var(--article-muted)' }}>Audio is unavailable.</p>
      )}

      {hasValidAudioSource && (
        <a
          href={audioSource}
          target="_blank"
          rel="noreferrer"
          className="inline-block mt-3 text-sm underline text-brand-primary"
        >
          Open audio source
        </a>
      )}

      {/* Player */}
      <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>
        <button
          onClick={togglePlay}
          className="w-12 h-12 rounded-full bg-brand-primary text-white flex items-center justify-center flex-shrink-0 transition-transform hover:scale-110"
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>

        <div className="flex-1 min-w-0">
          <div
            onClick={seek}
            className="h-2 rounded-full cursor-pointer mb-2"
            style={{ background: 'var(--border-default)' }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, background: 'var(--brand-primary)' }}
            />
          </div>
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--article-muted)' }}>
            <span>{fmt(progress)}</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>

        <button
          onClick={toggleMute}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
          style={{ color: 'var(--article-muted)' }}
          aria-label={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
