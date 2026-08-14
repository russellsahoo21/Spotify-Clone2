import { useEffect, useState, useRef } from 'react'
import { useAudio } from '../context/AudioContext'
import { useAuth } from '../context/AuthContext'
import { Play, Flame, Music, Disc, Heart, Compass, ChevronLeft, ChevronRight, Sparkles, X } from 'lucide-react'

const MOODS = [
  { name: 'Chill', emoji: '🧘' },
  { name: 'Happy', emoji: '😃' },
  { name: 'Energetic', emoji: '⚡' },
  { name: 'Focus', emoji: '📚' },
  { name: 'Sad', emoji: '😢' }
]

// Dynamic 2x2 Collage Cover Generator for Daily Mixes
function MixCoverCollage({ tracks, mixName, gradientClass = "from-orange-500 to-zinc-950", sizeClass = "w-full h-full" }) {
  const validTracks = (tracks || []).filter(t => t.thumbnail || t.thumbnail_url).slice(0, 4)
  
  if (validTracks.length >= 4) {
    return (
      <div className={`grid grid-cols-2 grid-rows-2 overflow-hidden bg-zinc-950 ${sizeClass}`}>
        {validTracks.map((t, idx) => (
          <img
            key={idx}
            src={t.thumbnail || t.thumbnail_url}
            alt=""
            className="w-full h-full object-cover"
          />
        ))}
      </div>
    )
  }
  
  const fallbackImg = tracks && tracks[0] ? (tracks[0].thumbnail || tracks[0].thumbnail_url) : null
  if (fallbackImg) {
    return (
      <div className={`overflow-hidden bg-zinc-950 ${sizeClass}`}>
        <img src={fallbackImg} alt="" className="w-full h-full object-cover" />
      </div>
    )
  }
  
  return (
    <div className={`bg-gradient-to-br ${gradientClass} flex flex-col justify-between p-4 relative overflow-hidden select-none ${sizeClass}`}>
      <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-15 rotate-12">
        <Music className="w-24 h-24 text-white" />
      </div>
      
      <div className="flex justify-between items-start">
        <Sparkles className="w-4 h-4 text-white/40" />
        <span className="text-[7px] tracking-widest font-black uppercase text-white/50 bg-white/10 px-1.5 py-0.5 rounded border border-white/5">
          StreamYT
        </span>
      </div>

      <div className="space-y-1 z-10">
        <h3 className="text-base font-extrabold text-white tracking-tight leading-none uppercase">
          {mixName || "Daily Mix"}
        </h3>
        <p className="text-[7px] text-white/60 font-semibold tracking-wider uppercase">
          Personal compilation
        </p>
      </div>
    </div>
  )
}

// Shimmering Skeleton Components for layout placeholders
function SkeletonCard() {
  return (
    <div className="w-44 shrink-0 bg-zinc-900/35 border border-zinc-850/40 rounded-xl p-3.5 space-y-4">
      <div className="aspect-square w-full rounded-lg animate-shimmer" />
      <div className="space-y-2">
        <div className="h-3 w-5/6 rounded animate-shimmer" />
        <div className="h-2.5 w-1/2 rounded animate-shimmer opacity-60" />
      </div>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="space-y-4 min-h-[260px] animate-premium-fade-in">
      <div className="h-5 w-44 rounded animate-shimmer mb-1" />
      <div className="flex gap-5 overflow-x-hidden">
        {Array.from({ length: 5 }).map((_, idx) => (
          <SkeletonCard key={idx} />
        ))}
      </div>
    </div>
  )
}

function SkeletonQuickPicks() {
  return (
    <div className="space-y-4 min-h-[320px] animate-premium-fade-in">
      <div className="h-5 w-44 rounded animate-shimmer mb-1" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
        {Array.from({ length: 3 }).map((_, colIdx) => (
          <div key={colIdx} className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="flex items-center gap-3.5 p-2 rounded-xl border border-zinc-900/20">
                <div className="w-14 h-14 rounded-lg animate-shimmer shrink-0" />
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="h-3 w-3/4 rounded animate-shimmer" />
                  <div className="h-2.5 w-1/2 rounded animate-shimmer opacity-60" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function SkeletonSpotlight() {
  return (
    <div className="space-y-4 min-h-[320px] animate-premium-fade-in">
      <div className="h-5 w-44 rounded animate-shimmer mb-1" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 border border-zinc-850/20 p-5 rounded-2xl flex flex-col justify-between h-[300px]">
          <div className="aspect-square w-full rounded-xl animate-shimmer max-h-48" />
          <div className="space-y-2 mt-4">
            <div className="h-2.5 w-20 rounded animate-shimmer bg-red-950/20" />
            <div className="h-4.5 w-5/6 rounded animate-shimmer" />
            <div className="h-3 w-1/2 rounded animate-shimmer opacity-60" />
          </div>
        </div>
        <div className="md:col-span-2 flex flex-col justify-between gap-3">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="flex items-center gap-4 p-2.5 rounded-xl border border-zinc-900/20">
              <div className="w-12 h-12 rounded-lg animate-shimmer shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/2 rounded animate-shimmer" />
                <div className="h-2.5 w-1/4 rounded animate-shimmer opacity-60" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SkeletonSection({ layout }) {
  if (layout === 'quick-picks') return <SkeletonQuickPicks />
  if (layout === 'spotlight') return <SkeletonSpotlight />
  return <SkeletonRow />
}

// Custom Horizontal Scroll Row Component for high-quality reuse
function MusicRow({ title, icon, tracks, playTrack, favorites, toggleFavorite }) {
  const rowRef = useRef(null)

  const scroll = (direction) => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current
      const offset = direction === 'left' ? -clientWidth * 0.7 : clientWidth * 0.7
      rowRef.current.scrollTo({ left: scrollLeft + offset, behavior: 'smooth' })
    }
  }

  return (
    <div className="relative group/row">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon || <Compass className="w-5 h-5 text-red-500" />}
          <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
        </div>
        <div className="flex items-center gap-1.5 opacity-0 group-hover/row:opacity-100 transition duration-300">
          <button
            onClick={() => scroll('left')}
            className="p-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={rowRef}
        className="flex gap-5 overflow-x-auto pb-4 scroll-smooth scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent custom-scrollbar"
      >
        {tracks.map((track) => {
          const trackId = track.id || track.video_id
          const isFav = favorites.has(trackId)
          const imgUrl = track.thumbnail || track.thumbnail_url
          return (
            <div
              key={trackId}
              onClick={() => playTrack(track, tracks)}
              className="w-44 shrink-0 group bg-zinc-900/30 border border-zinc-850 hover:bg-zinc-900/80 rounded-xl p-3.5 cursor-pointer transition duration-355 relative shadow-md"
            >
              <div className="aspect-square w-full relative mb-3.5 overflow-hidden rounded-lg shadow-md">
                {imgUrl ? (
                  <img
                    src={imgUrl}
                    alt={track.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-850 flex items-center justify-center">
                    <Disc className="w-10 h-10 text-zinc-700" />
                  </div>
                )}
                
                {/* Heart Button Overlay */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFavorite(track)
                  }}
                  className={`absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 hover:scale-105 active:scale-95 transition z-10 ${
                    isFav ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-red-500 text-red-500' : 'text-zinc-300'}`} />
                </button>

                {/* Play Button Overlay */}
                <div className="absolute inset-0 bg-black/45 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300">
                  <button className="w-11 h-11 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition">
                    <Play className="w-4.5 h-4.5 fill-white text-white ml-0.5" />
                  </button>
                </div>
              </div>
              <h3 className="text-xs font-bold text-white truncate mb-1" title={track.title}>{track.title}</h3>
              <div className="flex items-center justify-between min-w-0">
                <p className="text-[10px] text-zinc-400 truncate flex-1">{track.artist}</p>
                {track.source && (
                  <span className="text-[8px] uppercase tracking-wider text-red-500/80 bg-red-950/20 px-1.5 py-0.5 rounded border border-red-900/30 shrink-0 font-bold ml-1 scale-90 origin-right">
                    {track.source.split(" ")[0]}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Custom Spotlight Feature Component
function SpotlightRow({ title, tracks, playTrack, favorites, toggleFavorite }) {
  if (tracks.length === 0) return null
  const spotlightTrack = tracks[0]
  const sideTracks = tracks.slice(1, 5)

  const spotlightImg = spotlightTrack.thumbnail || spotlightTrack.thumbnail_url

  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold text-white tracking-tight mb-5">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Spotlight Big Card */}
        <div
          onClick={() => playTrack(spotlightTrack, tracks)}
          className="md:col-span-1 bg-gradient-to-br from-zinc-900 via-zinc-900 to-red-950/20 border border-zinc-850 hover:bg-zinc-850/30 p-5 rounded-2xl cursor-pointer transition duration-300 relative group flex flex-col justify-between"
        >
          <div className="relative aspect-square w-full max-h-48 overflow-hidden rounded-xl shadow-lg mb-4">
            {spotlightImg ? (
              <img src={spotlightImg} alt={spotlightTrack.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-zinc-850 flex items-center justify-center">
                <Disc className="w-12 h-12 text-zinc-700 animate-pulse" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
              <button className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition">
                <Play className="w-6 h-6 fill-white text-white ml-0.5" />
              </button>
            </div>
          </div>
          <div>
            <span className="text-[9px] uppercase tracking-widest font-black text-red-500 bg-red-950/40 border border-red-900/30 px-2 py-0.5 rounded">Featured Spotlight</span>
            <h3 className="text-base font-extrabold text-white mt-2.5 line-clamp-1">{spotlightTrack.title}</h3>
            <p className="text-xs text-zinc-400 mt-1 truncate">{spotlightTrack.artist}</p>
          </div>
        </div>

        {/* Right Stacked Column (4 tracks) */}
        <div className="md:col-span-2 flex flex-col justify-between gap-3">
          {sideTracks.map((track) => {
            const trackId = track.id || track.video_id
            const isFav = favorites.has(trackId)
            const sideImg = track.thumbnail || track.thumbnail_url
            return (
              <div
                key={trackId}
                onClick={() => playTrack(track, tracks)}
                className="flex items-center gap-4 p-2.5 rounded-xl bg-zinc-950/30 border border-zinc-900/60 hover:bg-zinc-900/60 hover:border-zinc-800 transition duration-300 group cursor-pointer"
              >
                <div className="relative w-12 h-12 shrink-0 overflow-hidden rounded-lg shadow">
                  {sideImg ? (
                    <img src={sideImg} alt={track.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-zinc-850 flex items-center justify-center">
                      <Disc className="w-6 h-6 text-zinc-700" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                    <Play className="w-3.5 h-3.5 fill-white text-white ml-0.5" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-white truncate group-hover:text-red-500 transition">{track.title}</h4>
                  <p className="text-[10px] text-zinc-400 truncate mt-0.5">{track.artist}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0 pr-2">
                  <span className="text-[10px] text-zinc-500">{track.duration}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFavorite(track)
                    }}
                    className={`p-1.5 rounded-lg hover:bg-zinc-850 transition ${isFav ? 'text-red-500' : 'text-zinc-500 opacity-0 group-hover:opacity-100 hover:text-white'}`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-red-500' : ''}`} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}

export default function Home({ 
  onSelectMix, 
  trending, 
  songs, 
  trendingIndia, 
  songsIndia, 
  exploreLoading: loading, 
  exploreError: error 
}) {
  const { user, token } = useAuth()
  const { playTrack, favorites, toggleFavorite } = useAudio()

  // Personalized recommendations & dynamic endless feed
  const [feedSections, setFeedSections] = useState([])
  const [feedPage, setFeedPage] = useState(1)
  const [feedLoading, setFeedLoading] = useState(false)
  const [hasMoreFeed, setHasMoreFeed] = useState(true)

  // Mood selector states
  const [selectedMood, setSelectedMood] = useState('Chill')
  const [moodSongs, setMoodSongs] = useState([])
  const [moodLoading, setMoodLoading] = useState(false)

  const sentinelRef = useRef(null)

  const [activeFilter, setActiveFilter] = useState('all') // 'all', 'music', 'podcasts'
  const [podcasts, setPodcasts] = useState({ shows: [], episodes: [] })
  const [podcastsLoading, setPodcastsLoading] = useState(false)

  // Fetch podcasts if Podcasts category chip is selected
  useEffect(() => {
    if (activeFilter === 'podcasts' && podcasts.shows.length === 0) {
      setPodcastsLoading(true)
      fetch(`${window.API_BASE}/explore/podcasts`)
        .then(res => {
          if (res.ok) return res.json()
          throw new Error('Failed to load podcasts')
        })
        .then(data => {
          setPodcasts(data)
        })
        .catch(err => {
          console.error("Error loading podcasts:", err)
        })
        .finally(() => {
          setPodcastsLoading(false)
        })
    }
  }, [activeFilter, podcasts.shows.length])

  // Helper function to query a page from the dynamic infinite endpoint
  const fetchFeedPage = async (pageNum) => {
    try {
      const res = await fetch(`${window.API_BASE}/explore/infinite-feed?page=${pageNum}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (res.ok) {
        return await res.json()
      }
    } catch (err) {
      console.error(`Error fetching infinite page ${pageNum}:`, err)
    }
    return null
  }

  // Load first 2 pages of feed in parallel on start for zero-delay presentation
  useEffect(() => {
    if (!token) return
    async function loadInitialFeed() {
      setFeedLoading(true)
      const [p1, p2] = await Promise.all([fetchFeedPage(1), fetchFeedPage(2)])
      const valid = [p1, p2].filter(Boolean)
      setFeedSections(valid)
      setFeedPage(3)
      setFeedLoading(false)
    }
    loadInitialFeed()
  }, [token])

  // Fetch mood-based mix suggestions
  useEffect(() => {
    async function fetchMoodSongs() {
      setMoodLoading(true)
      try {
        const res = await fetch(`${window.API_BASE}/explore/mood?mood=${encodeURIComponent(selectedMood)}`)
        if (res.ok) {
          const data = await res.json()
          setMoodSongs(data || [])
        }
      } catch (err) {
        console.error("Error fetching mood songs:", err)
      } finally {
        setMoodLoading(false)
      }
    }
    fetchMoodSongs()
  }, [selectedMood])

  // Trigger loading next pages when scrolling close to the bottom
  const loadMoreContent = async () => {
    if (feedLoading || !hasMoreFeed || !token) return
    setFeedLoading(true)
    const nextSection = await fetchFeedPage(feedPage)
    if (nextSection && nextSection.tracks && nextSection.tracks.length > 0) {
      setFeedSections(prev => [...prev, nextSection])
      setFeedPage(prev => prev + 1)
    } else {
      setHasMoreFeed(false) // No more sections
    }
    setFeedLoading(false)
  }

  // Set up the IntersectionObserver with 500px root margin to fetch ahead of time (lag-free prefetching)
  useEffect(() => {
    if (loading || error || feedLoading || !hasMoreFeed) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        loadMoreContent()
      }
    }, { threshold: 0.1, rootMargin: '500px' })

    const currentSentinel = sentinelRef.current
    if (currentSentinel) {
      observer.observe(currentSentinel)
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel)
      }
    }
  }, [loading, error, feedPage, feedLoading, hasMoreFeed, token])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  // Helper to resolve the layout expected for a page number
  const getNextLayout = (page) => {
    if (page === 1) return 'carousel'
    if (page === 2) return 'quick-picks'
    if (page === 3) return 'spotlight'
    if (page === 4) return 'carousel'
    if (page === 5) return 'spotlight'
    const layouts = ["carousel", "quick-picks", "spotlight"]
    return layouts[page % 3]
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

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-gradient-to-b from-zinc-900 to-black select-none font-sans text-white">
      {/* Header Greeting & Filter Capsules */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
          {getGreeting()}, {user?.username || 'Guest'}!
        </h1>
        <p className="text-zinc-400 text-sm">Here is what is popular and trending on StreamYT today.</p>

        {/* Spotify style category pills */}
        <div className="flex gap-2 mt-6">
          <button 
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold hover:scale-105 transition duration-300 ${activeFilter === 'all' ? 'bg-white text-black' : 'bg-zinc-800 text-white hover:bg-zinc-700'}`}
          >
            All
          </button>
          <button 
            onClick={() => setActiveFilter('music')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold hover:scale-105 transition duration-300 ${activeFilter === 'music' ? 'bg-white text-black' : 'bg-zinc-800 text-white hover:bg-zinc-700'}`}
          >
            Music
          </button>
          <button 
            onClick={() => setActiveFilter('podcasts')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold hover:scale-105 transition duration-300 ${activeFilter === 'podcasts' ? 'bg-white text-black' : 'bg-zinc-800 text-white hover:bg-zinc-700'}`}
          >
            Podcasts
          </button>
        </div>
      </div>
      {activeFilter === 'podcasts' ? (
        podcastsLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
            <span className="w-8 h-8 border-2 border-red-500/20 border-t-red-500 rounded-full animate-spin mb-4" />
            <p className="text-xs font-semibold">Tuning into popular podcasts...</p>
          </div>
        ) : (
          <div className="space-y-12 animate-premium-fade-in">
            {/* Podcast Shows */}
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight mb-5">Popular Podcast Shows</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                {podcasts.shows.map((show) => (
                  <div
                    key={show.id}
                    onClick={async () => {
                      try {
                        const res = await fetch(`${window.API_BASE}/explore/playlist-tracks?id=${show.id}`)
                        if (res.ok) {
                          const data = await res.json()
                          if (data.length > 0) {
                            playTrack(data[0], data)
                          }
                        }
                      } catch (err) {
                        console.error("Failed to load show episodes:", err)
                      }
                    }}
                    className="group bg-zinc-900/30 border border-zinc-850/50 hover:bg-zinc-900/80 rounded-xl p-3.5 cursor-pointer transition duration-300 flex flex-col justify-between shadow-md relative"
                  >
                    <div className="aspect-square w-full relative mb-3.5 overflow-hidden rounded-lg shadow-md">
                      <img src={show.thumbnail} alt={show.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300">
                        <button className="w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition">
                          <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white truncate mb-1">{show.title}</h3>
                      <p className="text-[10px] text-zinc-500 truncate">{show.publisher}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trending Episodes */}
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight mb-5">Trending Episodes</h2>
              <div className="grid gap-2 bg-zinc-950/20 border border-zinc-900/50 rounded-2xl p-5 backdrop-blur-md">
                {podcasts.episodes.map((episode, idx) => (
                  <div
                    key={episode.id}
                    onClick={() => playTrack(episode, podcasts.episodes)}
                    className="flex items-center gap-4 p-2.5 rounded-xl bg-zinc-950/20 hover:bg-zinc-900/40 border border-zinc-900/30 hover:border-zinc-800 transition duration-300 group cursor-pointer"
                  >
                    <div className="text-zinc-500 font-mono text-[10px] w-5 text-right pr-1 select-none">
                      {idx + 1}
                    </div>
                    <img src={episode.thumbnail} alt={episode.title} className="w-12 h-12 object-cover rounded shadow shrink-0" />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-white truncate group-hover:text-red-500 transition">{episode.title}</h4>
                      <p className="text-[9px] text-zinc-400 truncate mt-0.5">{episode.artist}</p>
                    </div>
                    <span className="text-[9px] text-zinc-500 font-semibold pr-2">{episode.duration}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      ) : loading ? (
        <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
          <span className="w-8 h-8 border-2 border-red-500/20 border-t-red-500 rounded-full animate-spin mb-4" />
          <p className="text-xs font-semibold">Curating charts from YouTube Music...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-64 text-zinc-500 bg-zinc-900/40 rounded-2xl border border-zinc-800 p-8">
          <Music className="w-12 h-12 stroke-1 text-zinc-600 mb-4" />
          <p className="text-sm font-semibold mb-1">Could not load charts</p>
          <p className="text-xs text-zinc-500">{error}</p>
        </div>
      ) : (
        <div className="space-y-12">
          
          {/* SECTION 1: Getting Started & Daily Mixes (Always visible) */}
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight mb-5">Made For {user?.username || 'You'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              
              {/* Premium Spotify style Hero Card */}
              <div 
                className="md:col-span-1 bg-gradient-to-br from-red-800 via-red-900 to-amber-700/80 rounded-xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:scale-[1.02] transition duration-300 cursor-pointer"
              >
                <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-10 group-hover:scale-110 transition duration-500">
                  <Compass className="w-40 h-40 text-white rotate-12" />
                </div>
                <div>
                  <span className="text-[8px] uppercase tracking-widest font-black text-white/50 bg-white/10 px-1.5 py-0.5 rounded border border-white/5">
                    Start Guide
                  </span>
                  <h3 className="text-lg font-black tracking-tight text-white mb-2 mt-3">Start Playing</h3>
                  <p className="text-red-100 text-[10px] leading-normal max-w-sm">
                    Browse charts, search creators, and build your customized music experience.
                  </p>
                </div>
                <div className="mt-8 z-10">
                  <button className="bg-white text-black font-extrabold text-[10px] px-4 py-2 rounded-full hover:scale-105 active:scale-95 transition shadow-md">
                    Explore Now
                  </button>
                </div>
              </div>

              {dailyMixes.map((mix) => (
                <div
                  key={mix.id}
                  onClick={() => onSelectMix && onSelectMix(mix)}
                  className="group bg-zinc-900/30 border border-zinc-850/50 hover:bg-zinc-900/80 rounded-xl p-3.5 cursor-pointer transition duration-300 flex flex-col justify-between shadow-md relative"
                >
                  <div className="aspect-square w-full relative mb-3.5 overflow-hidden rounded-lg shadow-md">
                    <MixCoverCollage tracks={mix.tracks} mixName={mix.title} gradientClass={mix.gradientFallback} />
                    
                    {/* Play Button Overlay (Spotify Green Style) */}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (mix.tracks.length > 0) playTrack(mix.tracks[0], mix.tracks)
                        }}
                        className="w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition"
                      >
                        <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-white truncate mb-1" title={mix.title}>{mix.title}</h3>
                    <p className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed" title={mix.description}>{mix.description}</p>
                  </div>
                </div>
              ))}

            </div>
          </div>

          {/* STATIC EXPLORE BACKUPS (Moods & Regional Charts) */}
          {trendingIndia.length > 0 && (
            <MusicRow
              title="Trending now in India"
              icon={<Flame className="w-5 h-5 text-red-500 fill-red-500/20" />}
              tracks={trendingIndia}
              playTrack={playTrack}
              favorites={favorites}
              toggleFavorite={toggleFavorite}
            />
          )}

          {songsIndia.length > 0 && (
            <MusicRow
              title="Top Hits in India"
              icon={<Music className="w-5 h-5 text-red-500" />}
              tracks={songsIndia}
              playTrack={playTrack}
              favorites={favorites}
              toggleFavorite={toggleFavorite}
            />
          )}

          {/* Mood Selector Capsules & Mix Row */}
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight mb-5">Explore Mood Mixes</h2>
            <div className="flex gap-2.5 mb-5 overflow-x-auto pb-1 scrollbar-hide shrink-0">
              {MOODS.map(m => (
                <button
                  key={m.name}
                  onClick={() => setSelectedMood(m.name)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-300 border ${
                    selectedMood === m.name
                      ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-600/10 hover:scale-105'
                      : 'bg-zinc-950 border-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-800'
                  }`}
                >
                  <span>{m.emoji}</span>
                  <span>{m.name} Mix</span>
                </button>
              ))}
            </div>

            {moodLoading ? (
              <div className="flex items-center justify-center h-44 text-zinc-500">
                <span className="w-6 h-6 border-2 border-red-500/20 border-t-red-500 rounded-full animate-spin mr-3" />
                <span className="text-xs">Generating your {selectedMood} playlist...</span>
              </div>
            ) : moodSongs.length > 0 ? (
              <MusicRow
                title={`Your ${selectedMood} Mood Mix`}
                icon={<Compass className="w-5 h-5 text-red-500" />}
                tracks={moodSongs}
                playTrack={playTrack}
                favorites={favorites}
                toggleFavorite={toggleFavorite}
              />
            ) : (
              <p className="text-xs text-zinc-500">No suggestions available for this mood.</p>
            )}
          </div>

          {/* DYNAMIC RECOMMENDATION FEED SECTIONS (Appended down at the very bottom!) */}
          {feedSections.map((section, idx) => {
            if (section.layout === 'quick-picks') {
              // Quick Picks columns
              const colSize = 4
              const colTracks = []
              const subset = section.tracks.slice(0, 12)
              for (let i = 0; i < subset.length; i += colSize) {
                colTracks.push(subset.slice(i, i + colSize))
              }
              return (
                <div key={idx} className="mb-8 animate-premium-fade-in">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-red-500 animate-pulse" />
                      <h2 className="text-xl font-bold text-white tracking-tight">{section.title}</h2>
                    </div>
                    <button
                      onClick={() => playTrack(subset[0], subset)}
                      className="bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-white font-bold text-xs px-4 py-2 rounded-full transition"
                    >
                      Play all
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                    {colTracks.map((col, colIdx) => (
                      <div key={colIdx} className="flex flex-col gap-3">
                        {col.map((track) => {
                          const trackId = track.id || track.video_id
                          const isFav = favorites.has(trackId)
                          const pickImg = track.thumbnail || track.thumbnail_url
                          return (
                            <div
                              key={trackId}
                              onClick={() => playTrack(track, subset)}
                              className="flex items-center gap-3.5 p-2 rounded-xl bg-zinc-950/40 border border-zinc-900/60 hover:bg-zinc-900/60 hover:border-zinc-800/80 cursor-pointer transition duration-300 group relative"
                            >
                              <div className="relative w-14 h-14 shrink-0 overflow-hidden rounded-lg shadow">
                                {pickImg ? (
                                  <img src={pickImg} alt={track.title} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-zinc-850 flex items-center justify-center">
                                    <Disc className="w-8 h-8 text-zinc-700" />
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                  <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                                </div>
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-white truncate group-hover:text-red-500 transition">
                                  {track.title}
                                </p>
                                <p className="text-[10px] text-zinc-400 truncate mt-0.5">{track.artist}</p>
                              </div>

                              <div className="flex items-center gap-3.5 shrink-0 pr-1.5">
                                <span className="text-[10px] text-zinc-500 font-semibold">{track.duration}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleFavorite(track)
                                  }}
                                  className={`p-1.5 rounded-lg hover:bg-zinc-850/60 transition ${
                                    isFav ? 'text-red-500 opacity-100' : 'text-zinc-500 opacity-0 group-hover:opacity-100 hover:text-white'
                                  }`}
                                >
                                  <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-red-500' : ''}`} />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )
            } else if (section.layout === 'spotlight') {
              // Spotlight component row with fade-in
              return (
                <div key={idx} className="animate-premium-fade-in">
                  <SpotlightRow
                    title={section.title}
                    tracks={section.tracks}
                    playTrack={playTrack}
                    favorites={favorites}
                    toggleFavorite={toggleFavorite}
                  />
                </div>
              )
            } else {
              // Standard Carousel component row with fade-in
              return (
                <div key={idx} className="animate-premium-fade-in">
                  <MusicRow
                    title={section.title}
                    icon={<Compass className="w-5 h-5 text-red-500 animate-pulse" />}
                    tracks={section.tracks}
                    playTrack={playTrack}
                    favorites={favorites}
                    toggleFavorite={toggleFavorite}
                  />
                </div>
              )
            }
          })}

          {/* BOTTOM DYNAMIC SHIMMERING SKELETON & LOADER SPINNER */}
          {feedLoading && token && (
            <div className="space-y-6 pt-2 animate-premium-fade-in">
              <div className="flex flex-col items-center gap-2.5 py-4">
                <span className="w-6 h-6 border-2 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
                <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 animate-pulse">Curating more recommendations...</span>
              </div>
              <SkeletonSection layout={getNextLayout(feedPage)} />
            </div>
          )}

          {/* Infinite Scroll Sentinel Node */}
          <div ref={sentinelRef} className="pt-8 pb-4 flex justify-center text-zinc-650">
            {hasMoreFeed && token ? (
              !feedLoading && (
                <div className="flex flex-col items-center gap-2 py-4">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-550 animate-pulse">Scroll down for more recommendations</span>
                </div>
              )
            ) : (
              <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 font-sans">You've reached the end of your feed</span>
            )}
          </div>

        </div>
      )}


    </div>
  )
}
