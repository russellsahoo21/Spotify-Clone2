import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useAuth } from './AuthContext'

const AudioContext = createContext(null)
const API_BASE = "http://localhost:8000/api"

export function AudioProvider({ children }) {
  const { token } = useAuth()

  const [currentTrack, setCurrentTrack] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [queue, setQueue] = useState([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [volume, setVolume] = useState(0.8)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isLooping, setIsLooping] = useState(false)
  const [isShuffling, setIsShuffling] = useState(false)
  
  // Track-specific recommendations & state panels
  const [recommendations, setRecommendations] = useState([])
  const [showLyrics, setShowLyrics] = useState(false)
  const [showQueue, setShowQueue] = useState(false)

  const [favorites, setFavorites] = useState(new Set())

  const fetchFavorites = async () => {
    if (!token) {
      setFavorites(new Set())
      return
    }
    try {
      const res = await fetch(`${API_BASE}/library/favorites`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setFavorites(new Set(data.map(item => item.video_id)))
      }
    } catch (err) {
      console.error("Error fetching favorites:", err)
    }
  }

  const toggleFavorite = async (track) => {
    if (!token) return
    const trackId = track.id || track.video_id
    const isFav = favorites.has(trackId)

    try {
      if (isFav) {
        const res = await fetch(`${API_BASE}/library/favorites/${trackId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          setFavorites(prev => {
            const next = new Set(prev)
            next.delete(trackId)
            return next
          })
        }
      } else {
        const res = await fetch(`${API_BASE}/library/favorites`, {
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
          setFavorites(prev => {
            const next = new Set(prev)
            next.add(trackId)
            return next
          })
        }
      }
    } catch (err) {
      console.error("Favorite toggle error:", err)
    }
  }

  useEffect(() => {
    fetchFavorites()
  }, [token])

  // Ref for seeking in player
  const playerRef = useRef(null)

  const [ytPlayer, setYtPlayer] = useState(null)

  const onReady = (event) => {
    setYtPlayer(event.target)
    event.target.setVolume(isMuted ? 0 : volume * 100)
  }

  const onStateChange = (event) => {
    if (event.data === 1) setIsPlaying(true)
    if (event.data === 2) setIsPlaying(false)
    if (event.data === 0) {
      if (isLooping) {
        event.target.seekTo(0)
        event.target.playVideo()
      } else {
        nextTrack()
      }
    }
  }

  useEffect(() => {
    let interval
    if (isPlaying && ytPlayer) {
      interval = setInterval(() => {
        try {
          if (typeof ytPlayer.getCurrentTime === 'function') {
            setProgress(ytPlayer.getCurrentTime() || 0)
          }
          if (typeof ytPlayer.getDuration === 'function') {
            setDuration(ytPlayer.getDuration() || 0)
          }
        } catch (err) {
          console.error("Error polling player state:", err)
        }
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isPlaying, ytPlayer])

  useEffect(() => {
    if (ytPlayer && typeof ytPlayer.setVolume === 'function') {
      ytPlayer.setVolume(isMuted ? 0 : volume * 100)
    }
  }, [volume, isMuted, ytPlayer])

  // Sync play history to backend
  const logHistory = async (track) => {
    if (!token) return
    try {
      await fetch(`${API_BASE}/library/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          video_id: track.id || track.video_id,
          title: track.title,
          artist: track.artist,
          thumbnail_url: track.thumbnail || track.thumbnail_url,
          duration: track.duration
        })
      })
    } catch (err) {
      console.error("Error logging history:", err)
    }
  }

  // Load recommendations when currentTrack changes
  useEffect(() => {
    if (!currentTrack) return
    const trackId = currentTrack.id || currentTrack.video_id
    if (!trackId) return

    setRecommendations([])
    logHistory(currentTrack)

    fetch(`${API_BASE}/music/recommendations/${trackId}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setRecommendations(data)
        }
      })
      .catch(err => console.error("Error fetching recommendations:", err))
  }, [currentTrack, token])

  // Play a track
  const playTrack = (track, newQueue = []) => {
    // Normalize track object format
    const normalizedTrack = {
      id: track.id || track.video_id,
      video_id: track.video_id || track.id,
      title: track.title,
      artist: track.artist,
      thumbnail: track.thumbnail || track.thumbnail_url,
      thumbnail_url: track.thumbnail_url || track.thumbnail,
      duration: track.duration
    }

    setCurrentTrack(normalizedTrack)
    setIsPlaying(true)
    setProgress(0)

    if (newQueue.length > 0) {
      const normalizedQueue = newQueue.map(t => ({
        id: t.id || t.video_id,
        video_id: t.video_id || t.id,
        title: t.title,
        artist: t.artist,
        thumbnail: t.thumbnail || t.thumbnail_url,
        thumbnail_url: t.thumbnail_url || t.thumbnail,
        duration: t.duration
      }))
      setQueue(normalizedQueue)
      const idx = normalizedQueue.findIndex(t => t.id === normalizedTrack.id)
      setCurrentIndex(idx >= 0 ? idx : 0)
    } else {
      // Add to queue if not present
      setQueue(prev => {
        const exists = prev.some(t => t.id === normalizedTrack.id)
        if (exists) {
          const idx = prev.findIndex(t => t.id === normalizedTrack.id)
          setCurrentIndex(idx)
          return prev
        }
        const updated = [...prev, normalizedTrack]
        setCurrentIndex(updated.length - 1)
        return updated
      })
    }
  }

  const togglePlay = () => {
    if (ytPlayer) {
      if (isPlaying) {
        ytPlayer.pauseVideo()
      } else {
        ytPlayer.playVideo()
      }
    } else {
      setIsPlaying(prev => !prev)
    }
  }

  const nextTrack = () => {
    if (queue.length === 0) return

    if (isShuffling) {
      const randIndex = Math.floor(Math.random() * queue.length)
      playTrack(queue[randIndex])
      setCurrentIndex(randIndex)
      return
    }

    const nextIndex = currentIndex + 1
    if (nextIndex < queue.length) {
      playTrack(queue[nextIndex])
      setCurrentIndex(nextIndex)
    } else if (recommendations.length > 0) {
      // Autoplay recommendations if we reach the end of the queue
      const nextRec = recommendations[0]
      playTrack(nextRec)
      // Append recommendation to queue
      setQueue(prev => [...prev, {
        id: nextRec.id || nextRec.video_id,
        video_id: nextRec.video_id || nextRec.id,
        title: nextRec.title,
        artist: nextRec.artist,
        thumbnail: nextRec.thumbnail || nextRec.thumbnail_url,
        thumbnail_url: nextRec.thumbnail_url || nextRec.thumbnail,
        duration: nextRec.duration
      }])
      setCurrentIndex(queue.length)
    } else {
      // Loop queue back to start
      playTrack(queue[0])
      setCurrentIndex(0)
    }
  }

  const prevTrack = () => {
    if (queue.length === 0 || currentIndex <= 0) return
    const prevIndex = currentIndex - 1
    playTrack(queue[prevIndex])
    setCurrentIndex(prevIndex)
  }

  const toggleMute = () => {
    setIsMuted(prev => !prev)
  }

  const toggleLoop = () => {
    setIsLooping(prev => !prev)
  }

  const toggleShuffle = () => {
    setIsShuffling(prev => !prev)
  }

  const addToQueue = (track) => {
    const normalized = {
      id: track.id || track.video_id,
      video_id: track.video_id || track.id,
      title: track.title,
      artist: track.artist,
      thumbnail: track.thumbnail || track.thumbnail_url,
      thumbnail_url: track.thumbnail_url || track.thumbnail,
      duration: track.duration
    }
    setQueue(prev => {
      if (prev.some(t => t.id === normalized.id)) return prev
      return [...prev, normalized]
    })
  }

  const seekTo = (seconds) => {
    if (ytPlayer && typeof ytPlayer.seekTo === 'function') {
      ytPlayer.seekTo(seconds, true)
      setProgress(seconds)
    } else if (playerRef.current) {
      playerRef.current.seekTo(seconds, 'seconds')
      setProgress(seconds)
    }
  }

  return (
    <AudioContext.Provider value={{
      currentTrack, setCurrentTrack,
      isPlaying, setIsPlaying, togglePlay,
      queue, setQueue, currentIndex, setCurrentIndex,
      playTrack, nextTrack, prevTrack, addToQueue, seekTo,
      volume, setVolume,
      progress, setProgress,
      duration, setDuration,
      isMuted, toggleMute,
      isLooping, toggleLoop,
      isShuffling, toggleShuffle,
      recommendations,
      showLyrics, setShowLyrics,
      showQueue, setShowQueue,
      playerRef,
      ytPlayer, setYtPlayer,
      onReady, onStateChange,
      favorites, toggleFavorite, fetchFavorites
    }}>
      {children}
    </AudioContext.Provider>
  )
}

export function useAudio() {
  return useContext(AudioContext)
}
