import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { API_BASE } from '../constants/api';
import { Alert, AppState, Platform } from 'react-native';
import { randomUUID } from 'expo-crypto';
import NativeAudioPlayer from '../components/NativeAudioPlayer';
import { createListeningProgress, measureListening, resetListeningPosition } from '../utils/listening-session';

const AudioContext = createContext<any>(null);

const AD_TEXT_RE = /\b(ad|ads|advert|advertisement|sponsored|sponsor|promo|promoted|commercial|yt\s*ad|youtube\s*ad|skip\s*ad|includes\s*paid\s*promotion)\b/i;
const MUSIC_DURATION_RE = /^\d{1,2}:\d{2}(?::\d{2})?$/;

function normalizeTrack(track: any) {
  if (!track) return null;
  const videoId = track.id || track.video_id || track.videoId;
  if (!videoId) return null;
  return { ...track, id: videoId, video_id: videoId };
}

function isPlayableMusicTrack(track: any) {
  const normalizedTrack = normalizeTrack(track);
  if (!normalizedTrack) return false;

  const text = [
    normalizedTrack.title,
    normalizedTrack.artist,
    normalizedTrack.author,
    normalizedTrack.description,
  ]
    .filter(Boolean)
    .join(' ');

  if (AD_TEXT_RE.test(text)) return false;

  if (normalizedTrack.duration && !MUSIC_DURATION_RE.test(String(normalizedTrack.duration))) {
    return false;
  }

  return true;
}

function normalizePlayableQueue(tracks: any[]) {
  return tracks
    .map(normalizeTrack)
    .filter((track: any) => track && isPlayableMusicTrack(track));
}

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState<any[]>([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [volume, setVolume] = useState(1.0);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLooping, setIsLooping] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<any[]>([]);
  const [isVideoMode, setIsVideoMode] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [sleepTimerEndsAt, setSleepTimerEndsAt] = useState<number | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [playbackAttempt, setPlaybackAttempt] = useState(0);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [recommendationsRevision, setRecommendationsRevision] = useState(0);
  const listeningSession = useRef<any>(null);
  const queueRef = useRef(queue);
  queueRef.current = queue;
  const queueGeneration = useRef(0);
  const currentToken = useRef(token);
  currentToken.current = token;
  const nativePlayback = Platform.OS !== 'web' && !isVideoMode;

  // Native player references
  const playerRef = useRef<any>(null);

  // Progress tracker interval
  useEffect(() => {
    let interval: any;
    let cancelled = false;
    if (isPlaying && !nativePlayback && playerRef.current) {
      interval = setInterval(async () => {
        try {
          const time = await playerRef.current.getCurrentTime();
          if (cancelled) return;
          if (typeof time === 'number') {
            setProgress(time);
          }
          const dur = await playerRef.current.getDuration();
          if (cancelled) return;
          if (typeof dur === 'number' && dur > 0) {
            setDuration(dur);
          }
        } catch (e) {
          // ignore
        }
      }, 500);
    }
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, currentTrack, nativePlayback]);

  useEffect(() => {
    if (!sleepTimerEndsAt) return;

    const expire = () => {
      if (Date.now() < sleepTimerEndsAt) return;
      playerRef.current?.pause?.();
      setIsPlaying(false);
      setSleepTimerMinutes(null);
      setSleepTimerEndsAt(null);
    };
    const timeout = setTimeout(expire, Math.max(0, sleepTimerEndsAt - Date.now()));
    const subscription = AppState.addEventListener('change', expire);

    return () => {
      clearTimeout(timeout);
      subscription.remove();
    };
  }, [sleepTimerEndsAt]);

  useEffect(() => {
    setPlaybackError(null);
  }, [currentTrack, isVideoMode]);

  // Load favorites and history on startup/token change
  const fetchFavorites = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/library/favorites`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFavorites(new Set(data.map((f: any) => f.id || f.video_id)));
      }
    } catch (err) {
      console.error("Failed to load favorites:", err);
    }
  };

  const fetchHistory = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/library/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  };

  useEffect(() => {
    fetchFavorites();
    fetchHistory();
  }, [token]);

  const toggleFavorite = async (track: any) => {
    if (!token) return;
    const trackId = track.id || track.video_id;
    const isFav = favorites.has(trackId);
    
    // Optimistic UI updates
    const updated = new Set(favorites);
    if (isFav) {
      updated.delete(trackId);
    } else {
      updated.add(trackId);
    }
    setFavorites(updated);

    try {
      const method = isFav ? 'DELETE' : 'POST';
      const endpoint = isFav 
        ? `${API_BASE}/library/favorites/${trackId}`
        : `${API_BASE}/library/favorites`;
        
      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: isFav ? undefined : JSON.stringify({
          video_id: trackId,
          title: track.title,
          artist: track.artist,
          thumbnail_url: track.thumbnail || track.thumbnail_url,
          duration: track.duration
        })
      });
      
      if (!res.ok) {
        // Rollback
        fetchFavorites();
      } else if (currentToken.current === token) {
        setRecommendationsRevision(value => value + 1);
      }
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
      fetchFavorites();
    }
  };

  const logPlayback = async (track: any) => {
    if (!token) return;
    const trackId = track.id || track.video_id;
    try {
      await fetch(`${API_BASE}/library/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          video_id: trackId,
          title: track.title,
          artist: track.artist,
          thumbnail_url: track.thumbnail || track.thumbnail_url,
          duration: track.duration
        })
      });
      fetchHistory();
    } catch (err) {
      console.error("Failed to log playback history:", err);
    }
  };

  const sendListening = (outcome: 'progress' | 'skip' | 'complete') => {
    const session = listeningSession.current;
    if (!session || session.token !== token || session.measurement.seconds < 2) return;
    session.reportedSeconds = session.measurement.seconds;
    void fetch(`${API_BASE}/recommendations/listening`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` },
      body: JSON.stringify({
        session_id: session.id, video_id: session.track.id,
        title: String(session.track.title || 'Unknown Song').slice(0, 255),
        artist: String(session.track.artist || '').slice(0, 255),
        thumbnail_url: session.track.thumbnail || session.track.thumbnail_url || null,
        duration: session.track.duration ? String(session.track.duration) : null,
        listened_seconds: Math.min(86400, session.measurement.seconds),
        duration_seconds: Math.min(86400, session.duration || 0), outcome,
      }),
    }).catch(() => {});
  };

  const beginListening = (track: any) => {
    listeningSession.current = {
      id: randomUUID(), token, track, duration: 0, reportedSeconds: 0, historyLogged: false,
      measurement: createListeningProgress(Date.now()),
    };
  };

  useEffect(() => {
    const session = listeningSession.current;
    if (!session || session.token !== token || session.track.id !== currentTrack?.id) return;
    measureListening(session.measurement, progress, isPlaying && !playbackError, Date.now());
    session.duration = duration;
    const seconds = session.measurement.seconds;
    if (!session.historyLogged && seconds >= 2 && seconds >= Math.min(30, duration > 0 ? duration / 2 : 30)) {
      session.historyLogged = true;
      void logPlayback(session.track);
    }
    if (seconds - session.reportedSeconds >= 30 || (!isPlaying && seconds > session.reportedSeconds)) {
      sendListening('progress');
    }
  }, [progress, duration, isPlaying, playbackError, currentTrack, token]);

  useEffect(() => {
    listeningSession.current = null;
    queueGeneration.current += 1;
    setDismissedIds(new Set());
    setQueue([]);
    setQueueIndex(-1);
    setCurrentTrack(null);
    setIsPlaying(false);
    if (!token) return;
    let cancelled = false;
    fetch(`${API_BASE}/recommendations/dismissed`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.ok ? res.json() : [])
      .then(ids => { if (!cancelled) setDismissedIds(new Set(ids)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [token]);

  const toggleDismissed = async (track: any) => {
    if (!token) return;
    const id = track.id || track.video_id;
    const wasDismissed = dismissedIds.has(id);
    setDismissedIds(previous => {
      const updated = new Set(previous);
      if (wasDismissed) updated.delete(id); else updated.add(id);
      return updated;
    });
    try {
      const res = await fetch(`${API_BASE}/recommendations/dismissed/${encodeURIComponent(id)}`, {
        method: wasDismissed ? 'DELETE' : 'PUT', headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Preference not saved');
      if (currentToken.current === token) setRecommendationsRevision(value => value + 1);
    } catch {
      if (currentToken.current !== token) return;
      setDismissedIds(previous => {
        const updated = new Set(previous);
        if (wasDismissed) updated.add(id); else updated.delete(id);
        return updated;
      });
      Alert.alert('Preference not saved', 'Please try again.');
    }
  };

  const playTrack = (track: any, tracksList: any[] = []) => {
    const normalizedTrack = normalizeTrack(track);
    if (!normalizedTrack || !isPlayableMusicTrack(normalizedTrack)) return;
    sendListening(playbackError ? 'progress' : 'skip');
    queueGeneration.current += 1;
    beginListening(normalizedTrack);
    setPlaybackAttempt(value => value + 1);
    setPlaybackError(null);
    
    setCurrentTrack(normalizedTrack);
    setIsPlaying(true);
    setProgress(0);
    setDuration(0);

    if (tracksList.length > 0) {
      const normalizedList = normalizePlayableQueue(tracksList);
      const queueWithTrack = normalizedList.some(t => t.id === normalizedTrack.id)
        ? normalizedList
        : [normalizedTrack, ...normalizedList];
      setQueue(queueWithTrack);
      const idx = queueWithTrack.findIndex(t => t.id === normalizedTrack.id);
      setQueueIndex(idx >= 0 ? idx : 0);
    } else {
      setQueue([normalizedTrack]);
      setQueueIndex(0);
    }
  };

  const togglePlay = () => {
    if (playbackError) {
      setPlaybackError(null);
      setPlaybackAttempt(value => value + 1);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const nextTrack = (reason?: unknown) => {
    if (queue.length === 0) return;
    sendListening(reason === 'complete' ? 'complete' : reason === 'error' || playbackError ? 'progress' : 'skip');

    if (isShuffling && queue.length > 1) {
      const playableIndexes = queue
        .map((track, index) => ({ track, index }))
        .filter(({ track, index }) => index !== queueIndex && isPlayableMusicTrack(track) && !dismissedIds.has(track.id));

      if (playableIndexes.length > 0) {
        const randomPick = playableIndexes[Math.floor(Math.random() * playableIndexes.length)];
        setPlaybackAttempt(value => value + 1);
        setQueueIndex(randomPick.index);
        setCurrentTrack(randomPick.track);
        setIsPlaying(true);
        setProgress(0);
        setDuration(0);
        beginListening(randomPick.track);
        return;
      }
    }

    for (let offset = 1; offset <= queue.length; offset += 1) {
      const nextIdx = (queueIndex + offset) % queue.length;
      const next = queue[nextIdx];
      if (!isPlayableMusicTrack(next) || dismissedIds.has(next.id)) continue;
      setPlaybackAttempt(value => value + 1);

      setQueueIndex(nextIdx);
      setCurrentTrack(next);
      setIsPlaying(true);
      setProgress(0);
      setDuration(0);
      beginListening(next);
      return;
    }
    setIsPlaying(false);
  };

  const prevTrack = () => {
    if (queue.length === 0) return;
    sendListening(playbackError ? 'progress' : 'skip');
    for (let offset = 1; offset <= queue.length; offset += 1) {
      const prevIdx = (queueIndex - offset + queue.length) % queue.length;
      const previous = queue[prevIdx];
      if (!isPlayableMusicTrack(previous) || dismissedIds.has(previous.id)) continue;
      setPlaybackAttempt(value => value + 1);

      setQueueIndex(prevIdx);
      setCurrentTrack(previous);
      setIsPlaying(true);
      setProgress(0);
      setDuration(0);
      beginListening(previous);
      return;
    }
  };

  const seekTo = (seconds: number) => {
    if (listeningSession.current) resetListeningPosition(listeningSession.current.measurement, seconds, Date.now());
    if (playerRef.current) {
      try {
        playerRef.current.seekTo(seconds, true);
        setProgress(seconds);
      } catch (err) {
        console.error("Player seek error:", err);
      }
    }
  };

  const toggleLoop = () => {
    setIsLooping(!isLooping);
  };

  const toggleShuffle = () => {
    setIsShuffling(!isShuffling);
  };

  const setSleepTimer = (minutes: number | null) => {
    if (!minutes) {
      setSleepTimerMinutes(null);
      setSleepTimerEndsAt(null);
      return;
    }

    setSleepTimerMinutes(minutes);
    setSleepTimerEndsAt(Date.now() + minutes * 60 * 1000);
  };

  // Refill near the end, using this user's profile and the active queue as exclusions.
  useEffect(() => {
    if (!currentTrack || !token) return;
    if (queueIndex > 40) {
      const removeCount = queueIndex - 20;
      setQueue(previous => previous.slice(removeCount));
      setQueueIndex(20);
      return;
    }
    if (queueRef.current.length - queueIndex > 6) return;
    const controller = new AbortController();
    const generation = queueGeneration.current;
    const excluded = queueRef.current.map(track => track.id).slice(-150).join(',');
    const trackId = currentTrack.id || currentTrack.video_id;
    fetch(`${API_BASE}/recommendations/autoplay/${encodeURIComponent(trackId)}?exclude=${encodeURIComponent(excluded)}`, {
      headers: { Authorization: `Bearer ${token}` }, signal: controller.signal,
    })
      .then(res => res.ok ? res.json() : [])
      .then(tracks => {
        if (controller.signal.aborted || generation !== queueGeneration.current || currentToken.current !== token) return;
        setQueue(previous => {
          const ids = new Set(previous.map(track => track.id));
          const additions = normalizePlayableQueue(tracks).filter(track => {
            if (ids.has(track.id) || dismissedIds.has(track.id)) return false;
            ids.add(track.id);
            return true;
          });
          return [...previous, ...additions];
        });
      })
      .catch(() => {});
    return () => controller.abort();
  }, [currentTrack, token, queueIndex, recommendationsRevision, dismissedIds]);

  return (
    <AudioContext.Provider
      value={{
        currentTrack,
        setCurrentTrack,
        isPlaying,
        nativePlayback,
        playbackError,
        setPlaybackError,
        setIsPlaying,
        queue,
        setQueue,
        queueIndex,
        setQueueIndex,
        volume,
        setVolume,
        progress,
        setProgress,
        duration,
        setDuration,
        isLooping,
        isShuffling,
        sleepTimerMinutes,
        sleepTimerEndsAt,
        togglePlay,
        playTrack,
        nextTrack,
        prevTrack,
        seekTo,
        toggleLoop,
        toggleShuffle,
        setSleepTimer,
        favorites,
        dismissedIds,
        toggleDismissed,
        recommendationsRevision,
        toggleFavorite,
        history,
        playerRef,
        fetchFavorites,
        fetchHistory,
        isVideoMode,
        setIsVideoMode,
        playerOpen,
        setPlayerOpen
      }}
    >
      {children}
      {nativePlayback && currentTrack && token && (
        <NativeAudioPlayer
          track={currentTrack}
          token={token}
          attempt={playbackAttempt}
          audio={{
            isPlaying, isLooping, volume, progress, playerRef,
            setProgress, setDuration, setIsPlaying, setPlaybackError,
            sleepTimerEndsAt, setSleepTimer, nextTrack,
          }}
        />
      )}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  return useContext(AudioContext);
}
