import { useAudio } from '../context/AudioContext'
import { Music, Play, ArrowLeft, Disc, Heart, Sparkles } from 'lucide-react'

// Dynamic 2x2 Collage Cover Generator for Daily Mixes
function MixCoverCollage({ tracks, mixName, gradientClass = "from-orange-600 to-zinc-950", sizeClass = "w-full h-full" }) {
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

export default function MixDetails({ mix, onBack }) {
  const { playTrack, favorites, toggleFavorite } = useAudio()
  
  if (!mix) return null

  const gradientClass = mix.id === 'mix1' 
    ? 'from-orange-950/80 to-zinc-900' 
    : mix.id === 'mix2' 
      ? 'from-purple-950/80 to-zinc-900' 
      : 'from-emerald-950/80 to-zinc-900'

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-gradient-to-b from-zinc-900 to-black select-none font-sans text-white">
      {/* Navigation Header */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 font-semibold text-sm transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Home</span>
      </button>

      {/* Playlist Top Header Details Banner */}
      <div className={`p-6 bg-gradient-to-b ${gradientClass} border border-zinc-850/30 rounded-2xl flex flex-col sm:flex-row gap-6 items-center sm:items-end shadow-xl backdrop-blur-md mb-8`}>
        <div className="w-40 h-40 shrink-0 rounded-xl overflow-hidden shadow-lg shadow-black/50 group">
          <MixCoverCollage tracks={mix.tracks} mixName={mix.title} gradientClass={mix.gradientFallback} />
        </div>
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <span className="text-[9px] uppercase tracking-widest font-black text-red-500 bg-red-950/40 border border-red-900/30 px-2.5 py-0.5 rounded">
            Daily Compilation
          </span>
          <h2 className="text-3xl font-black tracking-tight text-white mt-3 leading-none">{mix.title}</h2>
          <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{mix.description}</p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 mt-5">
            <button
              onClick={() => {
                if (mix.tracks && mix.tracks.length > 0) {
                  playTrack(mix.tracks[0], mix.tracks)
                }
              }}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold text-xs shadow-lg hover:scale-105 active:scale-95 transition"
            >
              <Play className="w-3.5 h-3.5 fill-white text-white ml-0.5" />
              <span>PLAY MIX</span>
            </button>
            <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-widest">{mix.tracks ? mix.tracks.length : 0} songs</span>
          </div>
        </div>
      </div>

      {/* Track List Container */}
      <div className="bg-zinc-950/20 border border-zinc-900/50 rounded-2xl p-5 backdrop-blur-md">
        <h3 className="text-sm font-black text-zinc-400 uppercase tracking-wider mb-4 px-2">Tracks list</h3>
        
        {mix.tracks && mix.tracks.length > 0 ? (
          <div className="flex flex-col gap-2">
            {mix.tracks.map((track, idx) => {
              const trackId = track.id || track.video_id
              const isFav = favorites.has(trackId)
              return (
                <div
                  key={trackId}
                  onClick={() => playTrack(track, mix.tracks)}
                  className="flex items-center gap-4 p-2.5 rounded-xl bg-zinc-950/20 hover:bg-zinc-900/40 border border-zinc-900/30 hover:border-zinc-800 transition duration-300 group cursor-pointer"
                >
                  <div className="text-zinc-500 font-mono text-[10px] w-5 text-right pr-1 select-none">
                    {idx + 1}
                  </div>
                  
                  <div className="relative w-11 h-11 shrink-0 overflow-hidden rounded-lg shadow">
                    {track.thumbnail || track.thumbnail_url ? (
                      <img src={track.thumbnail || track.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-zinc-850 flex items-center justify-center">
                        <Disc className="w-5 h-5 text-zinc-700" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                      <Play className="w-3.5 h-3.5 fill-white text-white ml-0.5" />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-white truncate group-hover:text-red-500 transition">{track.title}</h4>
                    <p className="text-[9px] text-zinc-400 truncate mt-0.5">{track.artist}</p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 pr-2">
                    <span className="text-[9px] text-zinc-500 font-semibold">{track.duration}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFavorite(track)
                      }}
                      className={`p-1.5 rounded-lg hover:bg-zinc-800 transition ${isFav ? 'text-red-500' : 'text-zinc-500 opacity-0 group-hover:opacity-100 hover:text-white'}`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-red-500' : ''}`} />
                    </button>
                  </div>

                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
            <Music className="w-10 h-10 stroke-1 text-zinc-650 mb-3" />
            <p className="text-xs font-bold">This mix is empty</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">Explore popular charts to populate compiled mixes.</p>
          </div>
        )}
      </div>

    </div>
  )
}
