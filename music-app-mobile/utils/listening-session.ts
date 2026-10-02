export type ListeningProgress = {
  seconds: number;
  previousPosition: number | null;
  previousTime: number;
  wasPlaying: boolean;
};

export function createListeningProgress(now: number): ListeningProgress {
  return { seconds: 0, previousPosition: null, previousTime: now, wasPlaying: false };
}

export function measureListening(session: ListeningProgress, position: number, playing: boolean, now: number) {
  if (!Number.isFinite(position) || position < 0) return;
  const elapsed = Math.max(0, (now - session.previousTime) / 1000);
  const advance = session.previousPosition === null ? 0 : position - session.previousPosition;
  // Seeking and paused wall-clock time are not listening. Delayed background samples may be.
  if (playing && session.wasPlaying && advance > 0 && advance <= elapsed + 1) {
    session.seconds += Math.min(advance, elapsed);
  }
  session.previousPosition = position;
  session.previousTime = now;
  session.wasPlaying = playing;
}

export function resetListeningPosition(session: ListeningProgress, position: number, now: number) {
  session.previousPosition = position;
  session.previousTime = now;
}
