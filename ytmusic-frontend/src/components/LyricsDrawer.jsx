import { useEffect, useState } from 'react'
import { useAudio } from '../context/AudioContext'
import { X, Music } from 'lucide-react'

export default function LyricsDrawer() {
  const { currentTrack, showLyrics, setShowLyrics } = useAudio()
  const [lyrics, setLyrics] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!currentTrack || !showLyrics) return
    const trackId = currentTrack.id || currentTrack.video_id
    if (!trackId) return

    setLyrics('')
    setLoading(true)

    fetch(`${window.API_BASE}/music/lyrics/${trackId}`)
      .then(res => res.json())
      .then(data => {
        setLyrics(data.lyrics || "No lyrics found for this track.")
      })
      .catch(err => {
        console.error("Error loading lyrics:", err)
        setLyrics("Could not retrieve lyrics. Check network connection.")
      })
      .finally(() => {
        setLoading(false)
      })
  }, [currentTrack, showLyrics])

  if (!showLyrics) return null

  return (
    <aside className="w-80 bg-zinc-950 border-l border-zinc-900 flex flex-col h-full shrink-0 font-sans select-none z-40">
      {/* Header */}
      <div className="p-4 border-b border-zinc-900 flex items-center justify-between">
        <h2 className="text-sm font-bold text-white tracking-tight">Lyrics</h2>
        <button
          onClick={() => setShowLyrics(false)}
          className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-900 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Lyrics Text */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-500">
            <span className="w-6 h-6 border-2 border-red-500/20 border-t-red-500 rounded-full animate-spin mb-3" />
            <p className="text-xs">Fetching lyrics...</p>
          </div>
        ) : currentTrack ? (
          <div className="w-full text-center">
            <h3 className="text-xs font-bold text-white mb-1 truncate">{currentTrack.title}</h3>
            <p className="text-[10px] text-zinc-400 mb-6 truncate">{currentTrack.artist}</p>
            <p className="text-xs text-zinc-300 font-semibold leading-relaxed whitespace-pre-line text-center">
              {lyrics}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-650">
            <Music className="w-10 h-10 stroke-1 mb-2" />
            <p className="text-xs">No song currently playing.</p>
          </div>
        )}
      </div>
    </aside>
  )
}
