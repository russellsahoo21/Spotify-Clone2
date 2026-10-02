import { useEffect, useRef, useState } from 'react';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { API_BASE } from '../constants/api';

export default function NativeAudioPlayer({ track, token, audio, attempt }: { track: any; token: string; audio: any; attempt: number }) {
  const player = useAudioPlayer(null, { updateInterval: 500, keepAudioSessionActive: true });
  const update = useAudioPlayerStatus(player);
  const [configured, setConfigured] = useState(false);
  const latest = useRef(audio);
  latest.current = audio;
  const initialPosition = useRef(audio.progress);
  const started = useRef(false);
  const sought = useRef(false);
  const ended = useRef(false);
  const controlsActive = useRef(false);
  const loadingSource = useRef(true);
  const { isPlaying, isLooping, volume, playerRef, setProgress, setDuration, setIsPlaying, setPlaybackError } = audio;

  useEffect(() => {
    let cancelled = false;
    loadingSource.current = true;
    setConfigured(false);
    player.pause();
    started.current = false;
    sought.current = false;
    ended.current = false;
    initialPosition.current = latest.current.progress;
    const controller = {
      seekTo: (seconds: number) => player.seekTo(seconds).catch(() => {
        if (!cancelled) setPlaybackError('Could not seek. Try again.');
      }),
      pause: () => player.pause(),
    };
    playerRef.current = controller;
    async function load() {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: true,
          interruptionMode: 'doNotMix',
        });
        if (cancelled) return;
        const metadata = {
          title: track.title || 'Unknown Song',
          artist: track.artist || 'Unknown Artist',
          artworkUrl: track.thumbnail || track.thumbnail_url,
        };
        // Keep one media service alive across background queue transitions.
        if (controlsActive.current) player.updateLockScreenMetadata(metadata);
        else {
          player.setActiveForLockScreen(true, metadata);
          controlsActive.current = true;
        }
        player.replace({
          uri: `${API_BASE}/music/stream/${encodeURIComponent(track.id)}`,
          headers: { Authorization: `Bearer ${token}` },
        });
        loadingSource.current = false;
        if (latest.current.isPlaying) player.play();
        setConfigured(true);
      } catch {
        if (!cancelled) {
          setPlaybackError('Could not start audio. Tap play to retry.');
          setIsPlaying(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
      // The hook releases the native player on unmount.
      if (playerRef.current === controller) playerRef.current = null;
    };
  }, [player, playerRef, track, token, attempt, setIsPlaying, setPlaybackError]);

  useEffect(() => {
    if (!configured || loadingSource.current) return;
    if (isPlaying) player.play();
    else player.pause();
  }, [configured, isPlaying, player]);

  useEffect(() => {
    player.loop = isLooping;
    player.volume = volume;
  }, [player, isLooping, volume]);

  useEffect(() => {
    if (!configured) return;
    const timeout = setTimeout(() => {
      if (!player.isLoaded) {
        player.pause();
        setIsPlaying(false);
        setPlaybackError('Audio unavailable. Tap play to retry, or switch to Video.');
      }
    }, 45000);
    return () => clearTimeout(timeout);
  }, [configured, track, attempt, player, setIsPlaying, setPlaybackError]);

  useEffect(() => {
    if (!configured || loadingSource.current) return;
    // A queued event can belong to the previous source; read the live native state.
    const status = player.currentStatus;
    if (status.playbackState === 'error' || status.playbackState === 'failed'
      || (started.current && status.playbackState === 'idle')) {
      setPlaybackError('Audio unavailable. Tap play to retry, or switch to Video.');
      setIsPlaying(false);
      return;
    }
    if (!status.isLoaded) return;
    if (!sought.current) {
      sought.current = true;
      if (initialPosition.current > 0) {
        void player.seekTo(initialPosition.current).catch(() => {});
        return;
      }
    }
    setProgress(status.currentTime);
    setDuration(status.duration);
    const timer = latest.current.sleepTimerEndsAt;
    if (timer && Date.now() >= timer) {
      player.pause();
      setIsPlaying(false);
      latest.current.setSleepTimer(null);
      return;
    }
    if (status.didJustFinish && !latest.current.isLooping) {
      if (!ended.current) {
        ended.current = true;
        latest.current.nextTrack('complete');
      }
      return;
    }
    if (status.playing) started.current = true;
    // Reflect headset/lock-screen pauses without treating initial loading as a pause.
    if (started.current && !status.isBuffering) setIsPlaying(status.playing);
  }, [update, configured, player, setProgress, setDuration, setIsPlaying, setPlaybackError]);

  return null;
}
