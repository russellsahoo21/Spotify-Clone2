import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useAudio } from '../context/AudioContext'
import { Music, Heart, History as HistoryIcon, Play, Trash2, Calendar, FolderHeart } from 'lucide-react'

export default function Library({ 
  playlists = [], 
  onSelectPlaylist, 
  onCreatePlaylist, 
  onImportPlaylist,
  activeTab = 'playlists',
  onChangeTab
}) {
  const { token } = useAuth()
  const { playTrack } = useAudio()
  const [favorites, setFavorites] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchFavorites = async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch(`${window.API_BASE}/library/favorites`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        setFavorites(await res.json())
      }
    } catch (err) {
      console.error("Favorites load error:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchHistory = async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch(`${window.API_BASE}/library/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        setHistory(await res.json())
      }
    } catch (err) {
      console.error("History load error:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'favorites') {
      fetchFavorites()
    } else if (activeTab === 'history') {
      fetchHistory()
    }
  }, [activeTab, token])

  const handleRemoveFavorite = async (e, videoId) => {
    e.stopPropagation()
    try {
      const res = await fetch(`${window.API_BASE}/library/favorites/${videoId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        setFavorites(prev => prev.filter(item => item.video_id !== videoId))
      }
    } catch (err) {
      console.error("Remove favorite error:", err)
    }
  }

  const formatPlayedAt = (dateString) => {
    const d = new Date(dateString)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  }

  const handlePlayHistoryMix = () => {
    if (history.length === 0) return
    const normalizedQueue = history.map(h => ({
      id: h.video_id,
      video_id: h.video_id,
      title: h.title,
      artist: h.artist,
      thumbnail: h.thumbnail_url || h.thumbnail,
      thumbnail_url: h.thumbnail_url || h.thumbnail,
      duration: h.duration
    }))
    playTrack(normalizedQueue[0], normalizedQueue)
  }

  const handleClearHistory = async () => {
    if (!window.confirm("Are you sure you want to clear your listening history? This cannot be undone.")) return
    try {
      const res = await fetch(`${window.API_BASE}/library/history`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        setHistory([])
      }
    } catch (err) {
      console.error("Error clearing history:", err)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-gradient-to-b from-zinc-900 to-black select-none font-sans">
      {/* Title */}
      <h1 className="text-3xl font-extrabold tracking-tight text-white mb-6">Your Library</h1>

      {/* Tabs */}
      <div className="flex border-b border-zinc-900 mb-8 gap-6">
        <button
          onClick={() => onChangeTab && onChangeTab('playlists')}
          className={`pb-4 text-sm font-semibold border-b-2 transition ${
            activeTab === 'playlists' ? 'border-red-500 text-white' : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          Playlists
        </button>
        <button
          onClick={() => onChangeTab && onChangeTab('favorites')}
          className={`pb-4 text-sm font-semibold border-b-2 transition ${
            activeTab === 'favorites' ? 'border-red-500 text-white' : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          Liked Songs
        </button>
        <button
          onClick={() => onChangeTab && onChangeTab('history')}
          className={`pb-4 text-sm font-semibold border-b-2 transition ${
            activeTab === 'history' ? 'border-red-500 text-white' : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          Recently Played
        </button>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-48 text-zinc-500">
          <span className="w-6 h-6 border-2 border-red-500/20 border-t-red-500 rounded-full animate-spin mb-3" />
          <p className="text-xs">Loading library details...</p>
        </div>
      ) : activeTab === 'playlists' ? (
        <div>
          {playlists.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {playlists.map((playlist) => (
                <div
                  key={playlist.id}
                  onClick={() => onSelectPlaylist(playlist.id)}
                  className="group bg-zinc-900/40 border border-zinc-850 hover:bg-zinc-900/90 rounded-xl p-4 cursor-pointer transition duration-300"
                >
                  <div className="aspect-square w-full bg-zinc-850 rounded-lg shadow-lg mb-4 flex items-center justify-center relative overflow-hidden group-hover:shadow-red-500/5 transition">
                    <Music className="w-12 h-12 text-red-500 shrink-0" />
                    {playlist.songs && playlist.songs.length > 0 && (
                      <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            playTrack(playlist.songs[0], playlist.songs)
                          }}
                          className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center text-white shadow-md transform hover:scale-105 active:scale-95 transition"
                        >
                          <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <h3 className="text-xs font-bold text-white truncate mb-1">{playlist.title}</h3>
                  <p className="text-[10px] text-zinc-500 truncate">
                    {playlist.songs?.length || 0} {playlist.songs?.length === 1 ? 'song' : 'songs'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-500 bg-zinc-900/20 border border-zinc-900 rounded-2xl p-8">
              <Music className="w-12 h-12 stroke-1 text-zinc-700 mb-4" />
              <p className="text-sm font-semibold mb-1 text-zinc-400">Create your first playlist</p>
              <p className="text-xs text-zinc-600 mb-6 text-center max-w-xs">Organize your music by creating custom collections or importing public playlists from YouTube.</p>
              <div className="flex gap-3">
                <button
                  onClick={onCreatePlaylist}
                  className="bg-red-600 hover:bg-red-700 font-bold text-xs rounded-full px-5 py-2.5 text-white active:scale-95 transition"
                >
                  Create New
                </button>
                <button
                  onClick={onImportPlaylist}
                  className="bg-zinc-850 hover:bg-zinc-800 font-bold text-xs rounded-full px-5 py-2.5 text-white active:scale-95 transition"
                >
                  Import YouTube
                </button>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'favorites' ? (
        <div>
          {favorites.length > 0 ? (
            <div className="grid gap-2">
              {favorites.map((track) => (
                <div
                  key={track.id}
                  onClick={() => playTrack(track, favorites)}
                  className="flex items-center justify-between p-3 rounded-lg bg-zinc-950 border border-zinc-900 hover:bg-zinc-900/50 hover:border-zinc-800 transition cursor-pointer group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <img
                      src={track.thumbnail_url || track.thumbnail}
                      alt={track.title}
                      className="w-12 h-12 object-cover rounded shadow shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate group-hover:text-red-500 transition">
                        {track.title}
                      </p>
                      <p className="text-[10px] text-zinc-400 truncate">{track.artist}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-[10px] text-zinc-500">{track.duration}</span>
                    <button
                      onClick={(e) => handleRemoveFavorite(e, track.video_id)}
                      className="text-zinc-500 hover:text-red-500 p-2 rounded-lg hover:bg-zinc-900/60 transition"
                      title="Remove from Liked"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-500 bg-zinc-900/20 border border-zinc-900 rounded-2xl p-8">
              <FolderHeart className="w-12 h-12 stroke-1 text-zinc-700 mb-4" />
              <p className="text-sm font-semibold mb-1 text-zinc-400">No Liked Songs yet</p>
              <p className="text-xs text-zinc-600 text-center max-w-xs">Tap the heart icon on any song to save it in your library for quick access.</p>
            </div>
          )}
        </div>
      ) : (
        <div>
          {history.length > 0 && (
            <div className="mb-6 flex gap-4">
              <button
                onClick={handlePlayHistoryMix}
                className="bg-red-600 hover:bg-red-500 font-bold text-xs rounded-full px-5 py-2.5 text-white flex items-center gap-2 shadow-lg shadow-red-650/10 hover:scale-105 active:scale-95 transition"
              >
                <Play className="w-3.5 h-3.5 fill-white text-white ml-0.5" />
                <span>Play History Mix</span>
              </button>
              <button
                onClick={handleClearHistory}
                className="bg-zinc-950 border border-zinc-900 hover:bg-red-950/20 hover:border-red-900/60 font-semibold text-xs rounded-full px-5 py-2.5 text-zinc-400 hover:text-red-400 active:scale-95 transition"
              >
                <Trash2 className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" />
                <span>Clear History</span>
              </button>
            </div>
          )}

          {history.length > 0 ? (
            <div className="grid gap-2">
              {history.map((track, i) => (
                <div
                  key={track.id + '-' + i}
                  onClick={() => playTrack(track, history.map(h => ({ ...h, id: h.video_id })))}
                  className="flex items-center justify-between p-3 rounded-lg bg-zinc-950 border border-zinc-900 hover:bg-zinc-900/50 hover:border-zinc-800 transition cursor-pointer group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <img
                      src={track.thumbnail_url || track.thumbnail}
                      alt={track.title}
                      className="w-12 h-12 object-cover rounded shadow shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate group-hover:text-red-500 transition">
                        {track.title}
                      </p>
                      <p className="text-[10px] text-zinc-400 truncate">{track.artist}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 shrink-0 text-zinc-500">
                    <div className="flex items-center gap-1.5 text-[10px] shrink-0 font-medium">
                      <Calendar className="w-3 h-3" />
                      <span>{formatPlayedAt(track.played_at)}</span>
                    </div>
                    <span className="text-[10px] shrink-0 w-8 text-right">{track.duration}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-500 bg-zinc-900/20 border border-zinc-900 rounded-2xl p-8">
              <HistoryIcon className="w-12 h-12 stroke-1 text-zinc-700 mb-4" />
              <p className="text-sm font-semibold mb-1 text-zinc-400">Your Listening History is empty</p>
              <p className="text-xs text-zinc-600 text-center max-w-xs">Play songs from Search or Explore, and they will appear here automatically.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
