import { useAudio } from '../context/AudioContext'
import { Play, Disc, X, Music } from 'lucide-react'

export default function QueueDrawer() {
  const {
    queue,
    currentIndex,
    isPlaying,
    playTrack,
    recommendations,
    showQueue,
    setShowQueue
  } = useAudio()

  if (!showQueue) return null

  return (
    <aside className="w-80 bg-zinc-950 border-l border-zinc-900 flex flex-col h-full shrink-0 font-sans select-none z-40">
      {/* Header */}
      <div className="p-4 border-b border-zinc-900 flex items-center justify-between">
        <h2 className="text-sm font-bold text-white tracking-tight">Play Queue</h2>
        <button
          onClick={() => setShowQueue(false)}
          className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-900 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Now Playing */}
        {currentIndex >= 0 && currentIndex < queue.length && (
          <div>
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Now Playing</h3>
            <div className="flex items-center gap-3 p-2 bg-zinc-900/40 border border-zinc-850 rounded-lg">
              <img
                src={queue[currentIndex].thumbnail}
                alt={queue[currentIndex].title}
                className="w-10 h-10 object-cover rounded shadow shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-red-500 truncate">{queue[currentIndex].title}</p>
                <p className="text-[10px] text-zinc-400 truncate mt-0.5">{queue[currentIndex].artist}</p>
              </div>
            </div>
          </div>
        )}

        {/* Up Next in Queue */}
        <div>
          <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Up Next</h3>
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {queue.slice(currentIndex + 1).length > 0 ? (
              queue.slice(currentIndex + 1).map((track, idx) => {
                const absoluteIndex = currentIndex + 1 + idx
                return (
                  <div
                    key={track.id + '-' + absoluteIndex}
                    onClick={() => playTrack(track, queue)}
                    className="flex items-center gap-3 p-1.5 rounded hover:bg-zinc-900/60 cursor-pointer transition group"
                  >
                    <div className="relative shrink-0 overflow-hidden rounded">
                      <img src={track.thumbnail} alt={track.title} className="w-8 h-8 object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                        <Play className="w-3 h-3 fill-white text-white ml-0.5" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-white truncate group-hover:text-red-500 transition">
                        {track.title}
                      </p>
                      <p className="text-[9px] text-zinc-400 truncate mt-0.5">{track.artist}</p>
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-[10px] text-zinc-600 italic px-2">Queue is empty</p>
            )}
          </div>
        </div>

        {/* Autoplay Recommendations */}
        {recommendations.length > 0 && (
          <div>
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Recommended (Autoplay)</h3>
            <div className="space-y-1.5">
              {recommendations.map((track) => (
                <div
                  key={track.id}
                  onClick={() => playTrack(track)}
                  className="flex items-center gap-3 p-1.5 rounded hover:bg-zinc-900/60 cursor-pointer transition group"
                >
                  <div className="relative shrink-0 overflow-hidden rounded">
                    <img src={track.thumbnail} alt={track.title} className="w-8 h-8 object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                      <Play className="w-3 h-3 fill-white text-white ml-0.5" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-white truncate group-hover:text-red-500 transition">
                      {track.title}
                    </p>
                    <p className="text-[9px] text-zinc-400 truncate mt-0.5">{track.artist}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
