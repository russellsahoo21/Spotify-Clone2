import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useAudio } from '../context/AudioContext'
import { Search, Play, Heart, Plus, Disc, Check, ChevronDown } from 'lucide-react'

export default function SearchResults({ playlists = [], onPlaylistUpdated }) {
  const { token } = useAuth()
  const { playTrack, favorites, toggleFavorite } = useAudio()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Active playlist dropdown tracker
  const [activeDropdownTrack, setActiveDropdownTrack] = useState(null)

  const handleSearch = async (e) => {
    if (e) e.preventDefault()
    if (!query) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`http://localhost:8000/api/music/search?q=${encodeURIComponent(query)}`)
      if (res.ok) {
        const data = await res.json()
        setResults(data)
      } else {
        setError('Failed to fetch search results.')
      }
    } catch (err) {
      console.error("Search error:", err)
      setError('Error connecting to Server.')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleFavorite = (e, track) => {
    e.stopPropagation()
    toggleFavorite(track)
  }

  const handleAddToPlaylist = async (e, playlistId, track) => {
    e.stopPropagation()
    setActiveDropdownTrack(null)
    const trackId = track.id || track.video_id

    try {
      const res = await fetch(`http://localhost:8000/api/playlists/${playlistId}/songs`, {
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
      })
      if (res.ok) {
        if (onPlaylistUpdated) onPlaylistUpdated()
        alert("Track added to playlist!")
      }
    } catch (err) {
      console.error("Add to playlist error:", err)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-gradient-to-b from-zinc-900 to-black select-none font-sans text-white relative">
      {/* Search Header */}
      <div className="max-w-2xl mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-6">Search</h1>
        <form onSubmit={handleSearch} className="flex relative shadow-lg shadow-black/10">
          <input
            type="text"
            placeholder="Search artists, songs, and albums..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl py-3.5 pl-5 pr-12 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm text-white placeholder-zinc-500 transition"
          />
          <button type="submit" className="absolute right-4 top-4 text-zinc-400 hover:text-white transition">
            <Search className="w-5 h-5" />
          </button>
        </form>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
          <span className="w-8 h-8 border-2 border-red-500/20 border-t-red-500 rounded-full animate-spin mb-4" />
          <p className="text-xs">Searching YouTube Music...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-64 text-zinc-500 bg-zinc-900/40 rounded-2xl border border-zinc-800 p-8">
          <Check className="w-12 h-12 stroke-1 text-zinc-650 mb-4" />
          <p className="text-sm font-semibold mb-1">Search Failed</p>
          <p className="text-xs text-zinc-600">{error}</p>
        </div>
      ) : results.length > 0 ? (
        <div>
          <h2 className="text-xs font-extrabold text-zinc-500 mb-4 uppercase tracking-widest">Results</h2>
          
          <div className="border border-zinc-900 rounded-xl overflow-hidden bg-zinc-950/40">
            <div className="divide-y divide-zinc-900">
              {results.map((track) => {
                const trackId = track.id || track.video_id
                const isFav = favorites.has(trackId)
                const isDropdownOpen = activeDropdownTrack === trackId

                return (
                  <div
                    key={trackId}
                    onClick={() => playTrack(track, results)}
                    className="flex items-center justify-between p-3.5 hover:bg-zinc-900/50 cursor-pointer transition group relative"
                  >
                    {/* Song Details */}
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="relative shrink-0 overflow-hidden rounded shadow">
                        {track.thumbnail ? (
                          <img src={track.thumbnail} alt={track.title} className="w-12 h-12 object-cover" />
                        ) : (
                          <div className="w-12 h-12 bg-zinc-850 flex items-center justify-center"><Disc className="w-5 h-5 text-zinc-700" /></div>
                        )}
                        {/* Play Icon on hover */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                          <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate group-hover:text-red-500 transition">
                          {track.title}
                        </p>
                        <p className="text-[10px] text-zinc-400 truncate mt-0.5">{track.artist}</p>
                      </div>
                    </div>

                    {/* Metadata & Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-zinc-500 mr-2">{track.duration}</span>
                      
                      {/* Heart Button */}
                      <button
                        onClick={(e) => handleToggleFavorite(e, track)}
                        className="p-2 rounded-lg hover:bg-zinc-900/60 transition shrink-0"
                        title={isFav ? "Unlike" : "Like"}
                      >
                        <Heart className={`w-4 h-4 transition ${isFav ? 'fill-red-500 text-red-500 hover:scale-105' : 'text-zinc-500 hover:text-white'}`} />
                      </button>

                      {/* Add-to-Playlist Trigger */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveDropdownTrack(isDropdownOpen ? null : trackId)
                          }}
                          className="p-2 rounded-lg hover:bg-zinc-900/60 text-zinc-500 hover:text-white transition shrink-0 flex items-center gap-0.5"
                          title="Add to Playlist"
                        >
                          <Plus className="w-4 h-4" />
                          <ChevronDown className="w-3 h-3" />
                        </button>

                        {/* Dropdown Menu */}
                        {isDropdownOpen && (
                          <div className="absolute right-0 mt-2 w-48 bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl py-1 z-55">
                            <h4 className="px-3 py-1.5 text-[9px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-900 mb-1">
                              Add to Playlist
                            </h4>
                            {playlists.length > 0 ? (
                              playlists.map(playlist => (
                                <button
                                  key={playlist.id}
                                  onClick={(e) => handleAddToPlaylist(e, playlist.id, track)}
                                  className="w-full text-left px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900 transition truncate"
                                >
                                  {playlist.title}
                                </button>
                              ))
                            ) : (
                              <p className="px-3 py-2 text-[10px] text-zinc-600 italic">No playlists found</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 text-zinc-650">
          <Search className="w-12 h-12 stroke-1 mb-2" />
          <p className="text-xs">Find songs, artists, and playlists to queue up.</p>
        </div>
      )}
    </div>
  )
}
