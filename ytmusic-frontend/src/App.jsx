import React, { useState, useEffect, useRef } from 'react'
import YouTube from 'react-youtube'
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, ListMusic, Languages, Heart, Repeat, Shuffle, Compass, Video, Columns, Maximize2, Share } from 'lucide-react'

// Import Contexts
import { AuthProvider, useAuth } from './context/AuthContext'
import { AudioProvider, useAudio } from './context/AudioContext'

// Import Views & Components
import Sidebar from './components/Sidebar'
import AuthView from './components/AuthView'
import Home from './views/Home'
import SearchResults from './views/SearchResults'
import Library from './views/Library'
import PlaylistDetails from './views/PlaylistDetails'
import MixDetails from './views/MixDetails'
import QueueDrawer from './components/QueueDrawer'
import LyricsDrawer from './components/LyricsDrawer'
import OnboardingWizard from './components/OnboardingWizard'

function AppContent() {
  const { user, token, loading, logout, checkAuth } = useAuth()
  const {
    currentTrack,
    isPlaying,
    togglePlay,
    nextTrack,
    prevTrack,
    volume,
    setVolume,
    progress,
    setProgress,
    duration,
    setDuration,
    isMuted,
    toggleMute,
    isLooping,
    toggleLoop,
    isShuffling,
    toggleShuffle,
    showLyrics,
    setShowLyrics,
    showQueue,
    setShowQueue,
    playerRef,
    seekTo,
    onReady,
    onStateChange,
    favorites,
    toggleFavorite
  } = useAudio()

  const [activeView, setActiveView] = useState('home')
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null)
  const [selectedMix, setSelectedMix] = useState(null)
  const [libraryTab, setLibraryTab] = useState('playlists')
  const [playlists, setPlaylists] = useState([])
  const [showVideo, setShowVideo] = useState(false)
  const [isVerticalPlayer, setIsVerticalPlayer] = useState(false)
  const [showFullLyrics, setShowFullLyrics] = useState(false)
  const [sidebarLyrics, setSidebarLyrics] = useState('')
  const [sidebarLyricsLoading, setSidebarLyricsLoading] = useState(false)

  useEffect(() => {
    if (!currentTrack) return
    const trackId = currentTrack.id || currentTrack.video_id
    if (!trackId) return

    setSidebarLyrics('')
    setSidebarLyricsLoading(true)

    fetch(`${window.API_BASE}/music/lyrics/${trackId}`)
      .then(res => res.json())
      .then(data => {
        setSidebarLyrics(data.lyrics || "No lyrics found for this track.")
      })
      .catch(err => {
        console.error("Error loading sidebar lyrics:", err)
        setSidebarLyrics("Could not retrieve lyrics.")
      })
      .finally(() => {
        setSidebarLyricsLoading(false)
      })
  }, [currentTrack])
  const videoTargetRef = useRef(null)
  const lyricsCardRef = useRef(null)
  const [playerRect, setPlayerRect] = useState({ top: -9999, left: -9999, width: 280, height: 157, opacity: 0, scale: 0.95 })

  useEffect(() => {
    const updateRect = () => {
      if (currentTrack && showVideo) {
        if (isVerticalPlayer) {
          const w = 380
          const h = 214
          setPlayerRect({
            top: 57,
            left: window.innerWidth - w,
            width: w,
            height: h,
            opacity: 1,
            scale: 1
          })
        } else {
          const w = 280
          const h = 157
          setPlayerRect({
            top: window.innerHeight - h - 100,
            left: window.innerWidth - w - 24,
            width: w,
            height: h,
            opacity: 1,
            scale: 1
          })
        }
      } else {
        if (isVerticalPlayer) {
          const w = 380
          const h = 214
          setPlayerRect({
            top: 57,
            left: window.innerWidth - w,
            width: w,
            height: h,
            opacity: 0,
            scale: 0.95
          })
        } else {
          const w = 280
          const h = 157
          setPlayerRect({
            top: window.innerHeight - h - 100,
            left: window.innerWidth - w - 24,
            width: w,
            height: h,
            opacity: 0,
            scale: 0.95
          })
        }
      }
    }

    updateRect()
    window.addEventListener('resize', updateRect)
    return () => window.removeEventListener('resize', updateRect)
  }, [currentTrack, showVideo, isVerticalPlayer])

  // Custom Create Playlist Modal State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('')
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('')

  // Fetch explore charts in parent state to support route parameters loading
  const [trending, setTrending] = useState([])
  const [songs, setSongs] = useState([])
  const [trendingIndia, setTrendingIndia] = useState([])
  const [songsIndia, setSongsIndia] = useState([])
  const [exploreLoading, setExploreLoading] = useState(true)
  const [exploreError, setExploreError] = useState('')

  const isCurrentFav = currentTrack ? favorites.has(currentTrack.id || currentTrack.video_id) : false

  const toggleCurrentFav = (e) => {
    if (e) e.stopPropagation()
    if (currentTrack) {
      toggleFavorite(currentTrack)
    }
  }

  // Pre-compiled Daily Mixes using local/fetched song pools
  const dailyMixes = [
    {
      id: 'mix1',
      title: 'Daily Mix 1',
      description: 'Pritam, Vishal-Shekhar, and local favorites.',
      gradient: 'from-orange-650/40 to-zinc-900',
      gradientFallback: 'from-orange-600 to-zinc-950',
      tracks: songsIndia
    },
    {
      id: 'mix2',
      title: 'Daily Mix 2',
      description: 'Emiway Bantai, DIVINE, and regional charts.',
      gradient: 'from-purple-650/40 to-zinc-900',
      gradientFallback: 'from-purple-600 to-zinc-950',
      tracks: trendingIndia
    },
    {
      id: 'mix3',
      title: 'Daily Mix 3',
      description: 'Global pop hits and trending tracks.',
      gradient: 'from-emerald-650/40 to-zinc-900',
      gradientFallback: 'from-emerald-600 to-zinc-950',
      tracks: songs
    }
  ]

  // Helper to change views and sync with URL search params (Back button navigation)
  const navigateTo = (view, playlistId = null, mixId = null, tab = null) => {
    const params = new URLSearchParams()
    params.set('view', view)
    if (playlistId) params.set('playlistId', playlistId)
    if (mixId) params.set('mixId', mixId)
    if (tab) params.set('tab', tab)

    const newUrl = `${window.location.pathname}?${params.toString()}`
    window.history.pushState({ view, playlistId, mixId, tab }, '', newUrl)

    setActiveView(view)
    setSelectedPlaylistId(playlistId)
    setLibraryTab(tab || 'playlists')
    if (mixId) {
      const foundMix = dailyMixes.find(m => m.id === mixId)
      setSelectedMix(foundMix || null)
    } else {
      setSelectedMix(null)
    }
  }

  // Synchronize state with URL on mount and browser back/forward navigation
  useEffect(() => {
    const syncStateWithUrl = () => {
      const params = new URLSearchParams(window.location.search)
      const view = params.get('view') || 'home'
      const playlistId = params.get('playlistId')
      const mixId = params.get('mixId')
      const tab = params.get('tab') || 'playlists'

      setActiveView(view)
      setSelectedPlaylistId(playlistId ? (parseInt(playlistId) || playlistId) : null)
      setLibraryTab(tab)

      if (mixId) {
        const foundMix = dailyMixes.find(m => m.id === mixId)
        setSelectedMix(foundMix || null)
      } else {
        setSelectedMix(null)
      }
    }

    syncStateWithUrl()

    window.addEventListener('popstate', syncStateWithUrl)
    return () => window.removeEventListener('popstate', syncStateWithUrl)
  }, [songs, songsIndia, trendingIndia]) // Re-run if song lists load so selectedMix tracks populate!

  // Fetch explore charts statically
  useEffect(() => {
    async function fetchExplore() {
      try {
        const res = await fetch(`${window.API_BASE}/explore`)
        if (res.ok) {
          const data = await res.json()
          setTrending(data.trending || [])
          setSongs(data.songs || [])
          setTrendingIndia(data.trending_india || [])
          setSongsIndia(data.songs_india || [])
        } else {
          setExploreError('Failed to load explore charts.')
        }
      } catch (err) {
        console.error("Explore fetch error:", err)
        setExploreError('Error connecting to Server.')
      } finally {
        setExploreLoading(false)
      }
    }
    fetchExplore()
  }, [])

  // Fetch playlists for the user
  const fetchPlaylists = async () => {
    if (!token) return
    try {
      const res = await fetch(`${window.API_BASE}/playlists`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setPlaylists(data)
      }
    } catch (err) {
      console.error("Error fetching playlists:", err)
    }
  }

  useEffect(() => {
    fetchPlaylists()
  }, [token])

  const handleCreatePlaylist = () => {
    setNewPlaylistTitle('')
    setNewPlaylistDesc('')
    setShowCreateModal(true)
  }

  const submitCreatePlaylist = async (e) => {
    if (e) e.preventDefault()
    if (!newPlaylistTitle.trim()) {
      alert("Playlist title is required.")
      return
    }
    try {
      const res = await fetch(`${window.API_BASE}/playlists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newPlaylistTitle.trim(),
          description: newPlaylistDesc.trim()
        })
      })
      if (res.ok) {
        fetchPlaylists()
        setShowCreateModal(false)
      } else {
        const errData = await res.json()
        alert(`Failed to create playlist: ${errData.detail || "Server error"}`)
      }
    } catch (err) {
      console.error("Error creating playlist:", err)
      alert("An error occurred while creating the playlist.")
    }
  }

  const handleImportPlaylist = async () => {
    const url = prompt("Paste public YouTube or YouTube Music playlist URL:")
    if (!url) return

    alert("Playlist import started in the background. Tracks will import shortly...")
    try {
      const res = await fetch(`${window.API_BASE}/youtube/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ playlist_url: url })
      })
      const data = await res.json()
      if (res.ok) {
        alert(`Successfully imported playlist "${data.title}" with ${data.imported_tracks_count} songs!`)
        fetchPlaylists()
        navigateTo('library')
      } else {
        alert(`Failed to import playlist: ${data.detail || "Server error"}`)
      }
    } catch (err) {
      console.error("Import error:", err)
      alert("An error occurred during playlist import.")
    }
  }

  const handlePlaylistDeleted = () => {
    navigateTo('library')
    fetchPlaylists()
  }

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  // Splash Screen Loader
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-zinc-500 font-sans">
        <Compass className="w-12 h-12 text-red-500 animate-spin mb-4" />
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">StreamYT Loading...</p>
      </div>
    )
  }

  // Not Logged In
  if (!user) {
    return <AuthView />
  }

  // Onboarding wizard for new users
  if (user && !user.onboarded) {
    return <OnboardingWizard token={token} onComplete={checkAuth} />
  }

  // Render Sub-Views
  const renderView = () => {
    switch (activeView) {
      case 'home':
        return (
          <Home
            onSelectMix={(mix) => navigateTo('mix-details', null, mix.id)}
            trending={trending}
            songs={songs}
            trendingIndia={trendingIndia}
            songsIndia={songsIndia}
            exploreLoading={exploreLoading}
            exploreError={exploreError}
          />
        )
      case 'mix-details':
        return (
          <MixDetails
            mix={selectedMix}
            onBack={() => navigateTo('home')}
          />
        )
      case 'search':
        return (
          <SearchResults
            playlists={playlists}
            onPlaylistUpdated={fetchPlaylists}
          />
        )
      case 'library':
        return (
          <Library
            activeTab={libraryTab}
            onChangeTab={(tab) => navigateTo('library', null, null, tab)}
            playlists={playlists}
            onSelectPlaylist={(id) => navigateTo('playlist-details', id)}
            onCreatePlaylist={handleCreatePlaylist}
            onImportPlaylist={handleImportPlaylist}
          />
        )
      case 'playlist-details':
        return (
          <PlaylistDetails
            playlistId={selectedPlaylistId}
            onBack={() => navigateTo('library')}
            onPlaylistDeleted={handlePlaylistDeleted}
          />
        )
      case 'profile':
        return (
          <div className="flex-1 overflow-y-auto p-8 bg-gradient-to-b from-zinc-900 to-black select-none font-sans text-white">
            <h1 className="text-3xl font-extrabold tracking-tight text-white mb-8">User Profile</h1>
            <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-8 backdrop-blur-md max-w-xl shadow-2xl">
              <div className="flex items-center gap-6 mb-8">
                <div className="w-20 h-20 rounded-full bg-red-650 flex items-center justify-center text-3xl font-bold uppercase text-white shadow-lg shrink-0">
                  {user.username.slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <h2 className="text-2xl font-bold text-white truncate">{user.username}</h2>
                  <p className="text-sm text-zinc-400 mt-1 truncate">{user.email}</p>
                </div>
              </div>

              <div className="border-t border-zinc-900 pt-6 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500 font-semibold">Account Status</span>
                  <span className="text-green-500 font-bold">Active</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500 font-semibold">Library Playlists</span>
                  <span className="text-zinc-300 font-bold">{playlists.length} created</span>
                </div>
              </div>

              <button
                onClick={logout}
                className="mt-8 w-full bg-zinc-950 border border-zinc-800 hover:bg-red-950/20 hover:border-red-900/60 font-bold text-sm text-zinc-400 hover:text-red-400 rounded-xl py-3.5 transition active:scale-[0.98]"
              >
                Logout of Account
              </button>
            </div>
          </div>
        )
      default:
        return (
          <Home
            onSelectMix={(mix) => navigateTo('mix-details', null, mix.id)}
            trending={trending}
            songs={songs}
            trendingIndia={trendingIndia}
            songsIndia={songsIndia}
            exploreLoading={exploreLoading}
            exploreError={exploreError}
          />
        )
    }
  }

  const progressPercent = duration ? (progress / duration) * 100 : 0
  const volumePercent = (isMuted ? 0 : volume) * 100

  return (
    <div className="h-screen bg-black text-white flex flex-col font-sans overflow-hidden">
      {/* Workspace Core Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          activeView={activeView}
          setActiveView={(view, tab) => navigateTo(view, null, null, tab)}
          playlists={playlists}
          onSelectPlaylist={(id) => navigateTo('playlist-details', id)}
          selectedPlaylistId={selectedPlaylistId}
          onCreatePlaylist={handleCreatePlaylist}
          onImportPlaylist={handleImportPlaylist}
        />

        {/* Content Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#070707] relative overflow-hidden">
          {renderView()}
        </main>

        {/* Floating/Slide-out Panels on the Right */}
        <LyricsDrawer />
        <QueueDrawer />

        {/* Docked Vertical Player Panel */}
        {currentTrack && isVerticalPlayer && (
          <aside className="w-[380px] bg-[#080808] border-l border-zinc-900 flex flex-col h-full shrink-0 select-none animate-premium-fade-in relative">
            {/* Header / Layout Toggle & Song/Video Pill Switcher */}
            <div className="p-4 border-b border-zinc-900 flex items-center justify-between shrink-0">
              <button
                onClick={() => setIsVerticalPlayer(false)}
                className="text-zinc-400 hover:text-white transition p-1.5 rounded-lg hover:bg-zinc-900"
                title="Switch to Bottom Player Layout"
              >
                <Columns className="w-4 h-4" />
              </button>

              {/* Song / Video Pill Toggle */}
              <div className="flex bg-zinc-900/60 p-0.5 rounded-full border border-zinc-800">
                <button
                  onClick={() => setShowVideo(false)}
                  className={`px-3 py-1 rounded-full text-[9px] font-extrabold tracking-wider uppercase transition duration-300 ${
                    !showVideo ? 'bg-white text-black shadow-md' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Song
                </button>
                <button
                  onClick={() => setShowVideo(true)}
                  className={`px-3 py-1 rounded-full text-[9px] font-extrabold tracking-wider uppercase transition duration-300 ${
                    showVideo ? 'bg-white text-black shadow-md' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Video
                </button>
              </div>

              {/* Right spacer to keep switcher centered */}
              <div className="w-8" />
            </div>

            {/* Scrollable Media, Controls & Lyrics Area */}
            <div className={`flex-1 p-6 space-y-6 ${showVideo || showFullLyrics ? 'overflow-hidden' : 'overflow-y-auto custom-scrollbar'}`}>
              
              {/* If full lyrics mode is active, render only lyrics view */}
              {showFullLyrics ? (
                <div className="space-y-4 animate-premium-fade-in text-center font-sans h-full flex flex-col">
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-3 shrink-0">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">Full Lyrics</span>
                    <button
                      onClick={() => setShowFullLyrics(false)}
                      className="text-zinc-400 hover:text-white transition text-[9px] uppercase font-bold bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-full"
                    >
                      Close ✕
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar pt-2">
                    <p className="text-sm text-zinc-300 font-semibold leading-relaxed whitespace-pre-line text-center px-4 pb-6">
                      {sidebarLyricsLoading ? "Loading lyrics..." : sidebarLyrics}
                    </p>
                  </div>
                </div>
              ) : (
                /* Standard Cover / Video, Controls & Lyrics Card view */
                <div className="space-y-6">
                  
                  {/* Upper Section: Full-width Video Target or Square Thumbnail */}
                  <div className="w-full flex justify-center items-center shrink-0">
                    {showVideo ? (
                      /* Widescreen Video placeholder spacer */
                      <div className="w-full h-[214px] bg-black border-b border-zinc-900 shrink-0" />
                    ) : (
                      /* Square Thumbnail cover */
                      <div className="w-72 h-72 rounded-2xl overflow-hidden shadow-2xl border border-zinc-850 bg-zinc-950 animate-premium-fade-in">
                        <img 
                          src={currentTrack.thumbnail} 
                          alt={currentTrack.title} 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                    )}
                  </div>

                  {/* Middle Section: Metadata */}
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="min-w-0 w-full space-y-1.5 px-2">
                      <p className="text-base font-black text-white truncate" title={currentTrack.title}>
                        {currentTrack.title}
                      </p>
                      <p className="text-xs text-zinc-400 truncate">
                        {currentTrack.artist}
                      </p>
                    </div>
                    
                    <button
                      onClick={toggleCurrentFav}
                      className="p-2.5 rounded-xl bg-zinc-900/40 border border-zinc-850 hover:bg-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-white transition"
                      title={isCurrentFav ? "Remove from Liked" : "Like Song"}
                    >
                      <Heart className={`w-4 h-4 ${isCurrentFav ? 'fill-red-500 text-red-500' : ''}`} />
                    </button>
                  </div>

                  {/* Controls & Progress (The Playback Track) */}
                  <div className="p-5 rounded-2xl bg-zinc-950/40 border border-zinc-900 space-y-5">
                    {/* Seekbar */}
                    <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-semibold">
                      <span className="w-8 text-right shrink-0">{formatTime(progress)}</span>
                      <input
                        type="range"
                        min={0}
                        max={duration || 1}
                        value={progress}
                        onChange={(e) => seekTo(parseFloat(e.target.value))}
                        className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-red-650 transition"
                        style={{
                          background: `linear-gradient(to right, #ffffff ${progressPercent}%, #27272a ${progressPercent}%)`
                        }}
                      />
                      <span className="w-8 shrink-0">{formatTime(duration)}</span>
                    </div>

                    {/* Playback Buttons */}
                    <div className="flex items-center justify-center gap-5">
                      <button
                        onClick={toggleShuffle}
                        className={`transition p-1 ${isShuffling ? 'text-red-500 hover:text-red-400' : 'text-zinc-400 hover:text-white'}`}
                        title="Shuffle"
                      >
                        <Shuffle className="w-4 h-4" />
                      </button>

                      <button
                        onClick={prevTrack}
                        className="text-zinc-400 hover:text-white disabled:opacity-40 transition"
                        title="Previous"
                      >
                        <SkipBack className="w-4.5 h-4.5" />
                      </button>

                      <button
                        onClick={togglePlay}
                        className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition"
                        title={isPlaying ? "Pause" : "Play"}
                      >
                        {isPlaying ? <Pause className="w-5 h-5 fill-black" /> : <Play className="w-5 h-5 fill-black ml-0.5" />}
                      </button>

                      <button
                        onClick={nextTrack}
                        className="text-zinc-400 hover:text-white transition"
                        title="Next"
                      >
                        <SkipForward className="w-4.5 h-4.5" />
                      </button>

                      <button
                        onClick={toggleLoop}
                        className={`transition p-1 ${isLooping ? 'text-red-500 hover:text-red-400' : 'text-zinc-400 hover:text-white'}`}
                        title="Repeat"
                      >
                        <Repeat className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Volume & Utility drawer controls */}
                    <div className="flex items-center justify-between gap-4 pt-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (lyricsCardRef.current) {
                              lyricsCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                            }
                          }}
                          className="p-2 rounded-lg hover:bg-zinc-900/50 transition text-zinc-400 hover:text-white"
                          title="Lyrics"
                        >
                          <Languages className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setShowQueue(!showQueue)}
                          className={`p-2 rounded-lg hover:bg-zinc-900/50 transition ${showQueue ? 'text-red-500' : 'text-zinc-400 hover:text-white'}`}
                          title="Play Queue"
                        >
                          <ListMusic className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 max-w-[100px] w-full">
                        <button
                          onClick={toggleMute}
                          className="text-zinc-400 hover:text-white transition shrink-0"
                        >
                          {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </button>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={isMuted ? 0 : volume}
                          onChange={(e) => setVolume(parseFloat(e.target.value))}
                          className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-red-650 transition"
                          style={{
                            background: `linear-gradient(to right, #ffffff ${volumePercent}%, #27272a ${volumePercent}%)`
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Premium Spotify Style Lyrics Card */}
                  <div 
                    ref={lyricsCardRef}
                    className="rounded-2xl p-5 bg-gradient-to-br from-amber-950/40 via-zinc-900/40 to-amber-950/20 border border-amber-900/20 shadow-lg space-y-4 animate-premium-fade-in relative overflow-hidden select-none"
                    style={{ minHeight: '190px' }}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black tracking-wide text-white font-sans">Lyrics</span>
                      <button
                        onClick={() => setShowFullLyrics(true)}
                        className="flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 border border-white/5 rounded-full text-[9px] font-black text-white uppercase tracking-wider transition"
                      >
                        <span>More</span>
                        <Maximize2 className="w-2.5 h-2.5" />
                      </button>
                    </div>

                    <div className="relative text-xs font-semibold text-amber-100/90 leading-relaxed font-sans text-left space-y-2 max-h-24 overflow-hidden">
                      {sidebarLyricsLoading ? (
                        <p className="text-zinc-500 italic">Fetching lyrics...</p>
                      ) : (
                        <p className="whitespace-pre-line line-clamp-4">
                          {sidebarLyrics}
                        </p>
                      )}
                      {/* Gradient Bottom Fade Mask to preview more */}
                      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#151515] to-transparent pointer-events-none" />
                    </div>

                    <div className="flex justify-end pt-1">
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(`${currentTrack.title} Lyrics:\n\n${sidebarLyrics}`)
                          alert("Lyrics copied to clipboard!")
                        }}
                        className="flex items-center gap-1.5 border border-white/10 hover:bg-white/5 px-3 py-1 rounded-full text-[8px] font-bold text-zinc-400 hover:text-white uppercase transition"
                      >
                        <Share className="w-2.5 h-2.5" />
                        <span>Share</span>
                      </button>
                    </div>
                  </div>

                </div>
              )}

            </div>
          </aside>
        )}
      </div>

      {/* Persistent Audio Controls Footer */}
      {currentTrack && !isVerticalPlayer && (
        <footer className="border-t border-zinc-900 bg-black p-4 flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-0 z-50 select-none">
          {/* Left panel: Track Info */}
          <div className="flex items-center gap-4 w-full sm:w-1/3 min-w-0">
            <img src={currentTrack.thumbnail} alt={currentTrack.title} className="w-14 h-14 object-cover rounded shadow-lg shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{currentTrack.title}</p>
              <p className="text-xs text-zinc-400 truncate mt-0.5">{currentTrack.artist}</p>
            </div>
            <button
              onClick={toggleCurrentFav}
              className="p-2 rounded-lg hover:bg-zinc-900/50 transition shrink-0 ml-1"
              title={isCurrentFav ? "Remove from Liked" : "Like Song"}
            >
              <Heart className={`w-4 h-4 transition ${isCurrentFav ? 'fill-red-500 text-red-500 hover:scale-105' : 'text-zinc-500 hover:text-white'}`} />
            </button>
          </div>

          {/* Central panel: Controls & Slider Progress */}
          <div className="flex flex-col items-center gap-2.5 w-full sm:w-1/3">
            <div className="flex items-center gap-5">
              {/* Shuffle */}
              <button
                onClick={toggleShuffle}
                className={`transition p-1 ${isShuffling ? 'text-red-500 hover:text-red-400' : 'text-zinc-400 hover:text-white'}`}
                title="Shuffle"
              >
                <Shuffle className="w-4 h-4" />
              </button>

              {/* Prev */}
              <button
                onClick={prevTrack}
                className="text-zinc-400 hover:text-white disabled:opacity-40 transition"
                title="Previous"
              >
                <SkipBack className="w-4.5 h-4.5" />
              </button>

              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause className="w-4.5 h-4.5 fill-black" /> : <Play className="w-4.5 h-4.5 fill-black ml-0.5" />}
              </button>

              {/* Next */}
              <button
                onClick={nextTrack}
                className="text-zinc-400 hover:text-white transition"
                title="Next"
              >
                <SkipForward className="w-4.5 h-4.5" />
              </button>

              {/* Repeat */}
              <button
                onClick={toggleLoop}
                className={`transition p-1 ${isLooping ? 'text-red-500 hover:text-red-400' : 'text-zinc-400 hover:text-white'}`}
                title="Repeat"
              >
                <Repeat className="w-4 h-4" />
              </button>
            </div>

            {/* Slider Seekbar */}
            <div className="flex items-center gap-3 w-full max-w-md text-[10px] text-zinc-500 font-semibold">
              <span className="w-8 text-right shrink-0">{formatTime(progress)}</span>
              <input
                type="range"
                min={0}
                max={duration || 1}
                value={progress}
                onChange={(e) => seekTo(parseFloat(e.target.value))}
                className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-red-650 transition"
                style={{
                  background: `linear-gradient(to right, #ffffff ${progressPercent}%, #27272a ${progressPercent}%)`
                }}
              />
              <span className="w-8 shrink-0">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right panel: Volume & Drawer toggles */}
          <div className="w-full sm:w-1/3 flex justify-end items-center gap-3 shrink-0">
            {/* Layout Switch Toggle */}
            <button
              onClick={() => setIsVerticalPlayer(true)}
              className="p-2 rounded-lg hover:bg-zinc-900/50 text-zinc-400 hover:text-white transition"
              title="Switch to Vertical Player Layout"
            >
              <Columns className="w-4 h-4 rotate-90" />
            </button>

            {/* Video Player Toggle */}
            <button
              onClick={() => setShowVideo(!showVideo)}
              className={`p-2 rounded-lg hover:bg-zinc-900/50 transition ${showVideo ? 'text-red-500' : 'text-zinc-400 hover:text-white'}`}
              title="Toggle Video Player"
            >
              <Video className="w-4 h-4" />
            </button>

            {/* Lyrics Drawer Toggle */}
            <button
              onClick={() => setShowLyrics(!showLyrics)}
              className={`p-2 rounded-lg hover:bg-zinc-900/50 transition ${showLyrics ? 'text-red-500' : 'text-zinc-400 hover:text-white'}`}
              title="Lyrics"
            >
              <Languages className="w-4 h-4" />
            </button>

            {/* Queue Drawer Toggle */}
            <button
              onClick={() => setShowQueue(!showQueue)}
              className={`p-2 rounded-lg hover:bg-zinc-900/50 transition ${showQueue ? 'text-red-500' : 'text-zinc-400 hover:text-white'}`}
              title="Play Queue"
            >
              <ListMusic className="w-4 h-4" />
            </button>

            {/* Volume controls */}
            <div className="flex items-center gap-2 max-w-[120px] w-full ml-2">
              <button
                onClick={toggleMute}
                className="text-zinc-400 hover:text-white transition shrink-0"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4.5 h-4.5" /> : <Volume2 className="w-4.5 h-4.5" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-red-650 transition"
                style={{
                  background: `linear-gradient(to right, #ffffff ${volumePercent}%, #27272a ${volumePercent}%)`
                }}
              />
            </div>
          </div>
        </footer>
      )}

      {/* YouTube Video Player - Always mounted to prevent unmount/remount crashes in StrictMode */}
      <div
        style={{
          position: 'fixed',
          top: `${playerRect.top}px`,
          left: `${playerRect.left}px`,
          width: `${playerRect.width}px`,
          height: `${playerRect.height}px`,
          zIndex: 50,
          borderRadius: isVerticalPlayer ? '0px' : '12px',
          overflow: 'hidden',
          border: isVerticalPlayer ? 'none' : '1px solid #27272a',
          boxShadow: isVerticalPlayer ? 'none' : '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
          backgroundColor: '#000000',
          transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
          opacity: playerRect.opacity,
          transform: `scale(${playerRect.scale})`,
          pointerEvents: currentTrack && showVideo ? 'auto' : 'none',
          visibility: currentTrack && showVideo ? 'visible' : 'hidden',
        }}
      >
        {/* Transparent Click & Hover Blocker Overlay */}
        <div 
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 60,
            background: 'transparent',
            pointerEvents: 'auto',
          }}
        />
        {currentTrack && (
          <YouTube
            id="youtube-player"
            videoId={currentTrack.id || currentTrack.video_id}
            opts={{
              width: '100%',
              height: '100%',
              playerVars: {
                autoplay: 1,
                controls: 0,
                modestbranding: 1,
                rel: 0,
                showinfo: 0,
                iv_load_policy: 3,
                disablekb: 1,
                origin: window.location.origin,
              }
            }}
            onReady={onReady}
            onStateChange={onStateChange}
            className="w-full h-full"
          />
        )}
      </div>

      {/* Custom Create Playlist Modal Dialog */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-premium-fade-in font-sans">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-800/40">
              <h3 className="text-base font-extrabold text-white">Create playlist</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-zinc-500 hover:text-white text-xs font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitCreatePlaylist} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Playlist Name</label>
                <input
                  type="text"
                  placeholder="My awesome playlist"
                  value={newPlaylistTitle}
                  onChange={(e) => setNewPlaylistTitle(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 focus:border-red-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-650 transition focus:outline-none"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Description (Optional)</label>
                <textarea
                  placeholder="Give your playlist a description..."
                  value={newPlaylistDesc}
                  onChange={(e) => setNewPlaylistDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-zinc-950 border border-zinc-850 focus:border-red-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-650 transition resize-none focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 text-zinc-400 hover:text-white text-xs font-bold px-5 py-2.5 rounded-full transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-450 text-white text-xs font-bold px-5 py-2.5 rounded-full hover:scale-[1.02] active:scale-[0.98] transition"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AudioProvider>
        <AppContent />
      </AudioProvider>
    </AuthProvider>
  )
}
