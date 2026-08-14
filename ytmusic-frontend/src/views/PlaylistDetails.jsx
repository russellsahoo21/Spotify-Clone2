import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useAudio } from '../context/AudioContext'
import { Music, Play, Trash2, ArrowLeft, Disc, Clock, Heart } from 'lucide-react'

export default function PlaylistDetails({ playlistId, onBack, onPlaylistDeleted }) {
  const { token } = useAuth()
  const { playTrack, favorites, toggleFavorite } = useAudio()
  
  const [playlist, setPlaylist] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchPlaylistDetails = async () => {
    if (!token || !playlistId) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`http://localhost:8000/api/playlists/${playlistId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setPlaylist(data)
      } else {
        setError("Playlist not found or access denied.")
      }
    } catch (err) {
      console.error("Playlist details fetch error:", err)
      setError("Failed to load playlist.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlaylistDetails()
  }, [playlistId, token])

  const handleDeletePlaylist = async () => {
    if (!window.confirm("Are you sure you want to delete this playlist? This action cannot be undone.")) return
    try {
      const res = await fetch(`http://localhost:8000/api/playlists/${playlistId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        onPlaylistDeleted()
      }
    } catch (err) {
      console.error("Delete playlist error:", err)
    }
  }

  const handleRemoveSong = async (e, videoId) => {
    e.stopPropagation()
    try {
      const res = await fetch(`http://localhost:8000/api/playlists/${playlistId}/songs/${videoId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        // Remove track from local state
        setPlaylist(prev => ({
          ...prev,
          songs: prev.songs.filter(song => song.video_id !== videoId)
        }))
      }
    } catch (err) {
      console.error("Remove song error:", err)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-gradient-to-b from-zinc-900 to-black select-none font-sans text-white">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 font-semibold text-sm transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Library</span>
      </button>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
          <span className="w-8 h-8 border-2 border-red-500/20 border-t-red-500 rounded-full animate-spin mb-4" />
          <p className="text-xs">Loading playlist tracks...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-64 text-zinc-500 bg-zinc-900/40 rounded-2xl border border-zinc-800 p-8">
          <Music className="w-12 h-12 stroke-1 text-zinc-600 mb-4" />
          <p className="text-sm font-semibold mb-1">Error Loading Playlist</p>
          <p className="text-xs text-zinc-600">{error}</p>
        </div>
      ) : playlist ? (
        <div>
          {/* Header Card */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 mb-8 bg-zinc-900/20 border border-zinc-900 rounded-2xl p-6 backdrop-blur-md">
            <div className="w-40 h-40 bg-zinc-850 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-black/40">
              <Music className="w-16 h-16 text-red-500" />
            </div>
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <span className="text-[10px] font-extrabold uppercase text-red-500 tracking-widest">Playlist</span>
              <h1 className="text-3xl font-extrabold tracking-tight text-white mt-1 mb-2 truncate">{playlist.title}</h1>
              {playlist.description && (
                <p className="text-xs text-zinc-400 mb-4 line-clamp-2">{playlist.description}</p>
              )}
              <div className="flex flex-wrap justify-center sm:justify-start items-center gap-3 text-xs text-zinc-500 font-medium">
                <span className="text-zinc-300 font-bold">You</span>
                <span>•</span>
                <span>{playlist.songs?.length || 0} {playlist.songs?.length === 1 ? 'song' : 'songs'}</span>
              </div>
            </div>
            <button
              onClick={handleDeletePlaylist}
              className="bg-zinc-950 border border-zinc-850 hover:bg-red-950/20 hover:border-red-900/60 font-semibold text-xs rounded-full px-5 py-2.5 text-zinc-400 hover:text-red-400 transition shrink-0 self-center sm:self-end"
            >
              Delete Playlist
            </button>
          </div>

          {/* Controls */}
          {playlist.songs && playlist.songs.length > 0 && (
            <div className="mb-6 flex gap-4">
              <button
                onClick={() => playTrack(playlist.songs[0], playlist.songs)}
                className="bg-red-600 hover:bg-red-500 font-bold text-sm rounded-full px-6 py-3 text-white flex items-center gap-2 shadow-lg shadow-red-600/10 hover:scale-105 active:scale-95 transition"
              >
                <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                <span>Play Playlist</span>
              </button>
            </div>
          )}

          {/* Songs List */}
          {playlist.songs && playlist.songs.length > 0 ? (
            <div className="border border-zinc-900 rounded-xl overflow-hidden bg-zinc-950/40">
              <div className="grid grid-cols-12 gap-3 px-6 py-3 border-b border-zinc-900 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                <span className="col-span-1 text-center">#</span>
                <span className="col-span-7">Title</span>
                <span className="col-span-3">Artist</span>
                <span className="col-span-1 text-right"><Clock className="w-3.5 h-3.5 inline-block" /></span>
              </div>

              <div className="divide-y divide-zinc-900">
                {playlist.songs.map((song, index) => {
                  const trackId = song.id || song.video_id
                  const isFav = favorites.has(trackId)
                  
                  return (
                    <div
                      key={song.id}
                      onClick={() => playTrack(song, playlist.songs)}
                      className="grid grid-cols-12 gap-3 px-6 py-3.5 items-center hover:bg-zinc-900/50 cursor-pointer transition group"
                    >
                      <span className="col-span-1 text-center text-xs font-semibold text-zinc-500 group-hover:hidden">
                        {index + 1}
                      </span>
                      <span className="col-span-1 text-center text-xs font-semibold text-red-500 hidden group-hover:inline-block">
                        <Play className="w-3.5 h-3.5 fill-red-500 inline-block -mt-0.5" />
                      </span>

                      <div className="col-span-7 flex items-center gap-3 min-w-0">
                        {song.thumbnail_url ? (
                          <img src={song.thumbnail_url} alt={song.title} className="w-10 h-10 object-cover rounded shadow shrink-0" />
                        ) : (
                          <div className="w-10 h-10 bg-zinc-800 rounded flex items-center justify-center shrink-0">
                            <Disc className="w-5 h-5 text-zinc-650" />
                          </div>
                        )}
                        <p className="text-xs font-bold text-white truncate group-hover:text-red-500 transition">
                          {song.title}
                        </p>
                      </div>

                      <span className="col-span-3 text-xs text-zinc-400 truncate font-semibold">
                        {song.artist || 'Unknown Artist'}
                      </span>

                      <div className="col-span-1 flex items-center justify-end gap-2 text-right">
                        <span className="text-[11px] text-zinc-500 font-medium mr-1">
                          {song.duration}
                        </span>
                        
                        {/* Heart Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleFavorite(song)
                          }}
                          className="p-1.5 rounded-lg hover:bg-zinc-900/60 transition shrink-0"
                          title={isFav ? "Unlike" : "Like"}
                        >
                          <Heart className={`w-3.5 h-3.5 transition ${isFav ? 'fill-red-500 text-red-500 hover:scale-105' : 'text-zinc-500 hover:text-white'}`} />
                        </button>

                        <button
                          onClick={(e) => handleRemoveSong(e, song.video_id)}
                          className="text-zinc-600 hover:text-red-500 p-1.5 rounded hover:bg-zinc-900 transition opacity-0 group-hover:opacity-100"
                          title="Remove track"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-zinc-500 bg-zinc-900/10 border border-zinc-900 rounded-xl p-8">
              <Disc className="w-10 h-10 text-zinc-750 mb-3" />
              <p className="text-xs font-semibold text-zinc-400">This playlist is empty</p>
              <p className="text-[10px] text-zinc-600 mt-1">Search for songs and add them here to start listening.</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
