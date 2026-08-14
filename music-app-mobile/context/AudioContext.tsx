import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useAuth } from './AuthContext';
import { API_BASE } from '../constants/api';

const AudioContext = createContext<any>(null);

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

  // Native player references
  const playerRef = useRef<any>(null);

  // Progress tracker interval
  useEffect(() => {
    let interval: any;
    if (isPlaying && playerRef.current) {
      interval = setInterval(async () => {
        try {
          const time = await playerRef.current.getCurrentTime();
          if (typeof time === 'number') {
            setProgress(time);
          }
          const dur = await playerRef.current.getDuration();
          if (typeof dur === 'number' && dur > 0) {
            setDuration(dur);
          }
        } catch (e) {
          // ignore
        }
      }, 500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, currentTrack]);

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

  const playTrack = (track: any, tracksList: any[] = []) => {
    // Normalize: ensure the track always has a video_id
    const videoId = track.id || track.video_id || track.videoId;
    const normalizedTrack = { ...track, id: videoId, video_id: videoId };
    
    setCurrentTrack(normalizedTrack);
    setIsPlaying(true);
    logPlayback(normalizedTrack);

    if (tracksList.length > 0) {
      // Normalize all tracks in the queue too
      const normalizedList = tracksList.map(t => {
        const vid = t.id || t.video_id || t.videoId;
        return { ...t, id: vid, video_id: vid };
      });
      setQueue(normalizedList);
      const idx = normalizedList.findIndex(t => t.id === videoId);
      setQueueIndex(idx >= 0 ? idx : 0);
    } else {
      setQueue([normalizedTrack]);
      setQueueIndex(0);
    }
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const nextTrack = () => {
    if (queue.length === 0) return;
    let nextIdx = queueIndex + 1;
    if (nextIdx >= queue.length) {
      nextIdx = 0; // Wrap around
    }
    setQueueIndex(nextIdx);
    setCurrentTrack(queue[nextIdx]);
    logPlayback(queue[nextIdx]);
  };

  const prevTrack = () => {
    if (queue.length === 0) return;
    let prevIdx = queueIndex - 1;
    if (prevIdx < 0) {
      prevIdx = queue.length - 1; // Wrap around
    }
    setQueueIndex(prevIdx);
    setCurrentTrack(queue[prevIdx]);
    logPlayback(queue[prevIdx]);
  };

  const seekTo = (seconds: number) => {
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

  // Autoplay recommendations pipeline
  const fetchAutoplayQueue = async (trackId: string) => {
    try {
      const res = await fetch(`${API_BASE}/music/recommendations/${trackId}`);
      if (res.ok) {
        const recommendations = await res.json();
        if (recommendations && recommendations.length > 0) {
          // Append recommendations to queue
          setQueue(prev => {
            const currentQueueIds = new Set(prev.map(t => t.id || t.video_id));
            const newTracks = recommendations.filter((t: any) => !currentQueueIds.has(t.id || t.video_id));
            return [...prev, ...newTracks];
          });
        }
      }
    } catch (err) {
      console.error("Failed to load autoplay queue:", err);
    }
  };

  useEffect(() => {
    if (currentTrack) {
      const trackId = currentTrack.id || currentTrack.video_id;
      // Fetch next suggestions when playing
      fetchAutoplayQueue(trackId);
    }
  }, [currentTrack]);

  return (
    <AudioContext.Provider
      value={{
        currentTrack,
        setCurrentTrack,
        isPlaying,
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
        togglePlay,
        playTrack,
        nextTrack,
        prevTrack,
        seekTo,
        toggleLoop,
        toggleShuffle,
        favorites,
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
    </AudioContext.Provider>
  );
}

export function useAudio() {
  return useContext(AudioContext);
}
