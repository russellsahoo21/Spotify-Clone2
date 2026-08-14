import { useState } from 'react'
import { Sparkles, Music, ChevronRight, Check } from 'lucide-react'

const GENRES = [
  { id: 'Bollywood', name: 'Bollywood', emoji: '🎬' },
  { id: 'Pop', name: 'Pop', emoji: '🎤' },
  { id: 'Hip Hop', name: 'Hip Hop', emoji: '🧢' },
  { id: 'Punjabi', name: 'Punjabi', emoji: '🔥' },
  { id: 'Lo-Fi', name: 'Lo-Fi', emoji: '☕' },
  { id: 'Rock', name: 'Rock', emoji: '🎸' },
  { id: 'Electronic', name: 'Electronic', emoji: '🎛️' },
  { id: 'Acoustic', name: 'Acoustic', emoji: '🏕️' }
]

const ARTISTS = [
  { id: 'Arijit Singh', name: 'Arijit Singh', desc: 'Bollywood Soulful', image: 'https://lh3.googleusercontent.com/W_yOqnKSDYyeVOY_AsXhuAtb6rW3vCL3GtJ9DA1GxWOrJfyeSOqzvTv_TkFHijdkVPXWutASBlRFPg=w120-h120-p-l90-rj' },
  { id: 'Taylor Swift', name: 'Taylor Swift', desc: 'Global Pop Queen', image: 'https://yt3.googleusercontent.com/RCpTA6EXJQyjVFDosWOKa2SMmqkua_lA9mHPDWWciLwgqpZLz-k8rXWRF_367trrQ7up9BUwCbk6kRk=w120-h120-p-l90-rj' },
  { id: 'Diljit Dosanjh', name: 'Diljit Dosanjh', desc: 'Punjabi Wavemaker', image: 'https://yt3.googleusercontent.com/7EYXXMXY594V8y4sZT2aawmdKgDAGTu5jNm9C-HpR3jY9cZJ0NMxS__nZKBdWZ1PUpJPjc2BAA=w120-h120-l90-rj' },
  { id: 'The Weeknd', name: 'The Weeknd', desc: 'R&B / Synthpop', image: 'https://lh3.googleusercontent.com/U-SAmNOu4TynE818gLCfKsuHZ0U5YNEtO9mrjSI9WCCKERs98LzrCal5kajBBTQNwdcisoB2Bn-pHp4=w120-h120-p-l90-rj' },
  { id: 'Drake', name: 'Drake', desc: 'Hip Hop Superstar', image: 'https://yt3.googleusercontent.com/MxNjcRJ-uK4Xvx7u90IhEFLQM8x9LIGTA9VCKHq5U4Wn2jOgiWaMtg-qz329SIzqnCyhdCCB3MpdAGs=w120-h120-p-l90-rj' },
  { id: 'Shreya Ghoshal', name: 'Shreya Ghoshal', desc: 'Melodious Diva', image: 'https://yt3.ggpht.com/PgINZNe0qVxgMSXKG5vF82bNN4WCC12zgWsz9I7OLs4CLF9Cn0Vxq7Xc1ToupnzXrCv0nKfe3VM=w120-c-h120-k-c0x00ffffff-no-l90-rj' },
  { id: 'Billie Eilish', name: 'Billie Eilish', desc: 'Alt-Pop / Indie', image: 'https://lh3.googleusercontent.com/tQC4rOL6xz6FhmFr0ggQExxyGbYSOsyveXVSnPBh2WjEyIzQ9pMHablLJ-0GlMBrLBlBrbWQGmzrV6KN=w120-h120-p-l90-rj' },
  { id: 'Bruno Mars', name: 'Bruno Mars', desc: 'Funk & Soul', image: 'https://lh3.googleusercontent.com/hnefGBrazRhn4Z92bdSZBUENl40ONjRiVDsmZKZh-WZ2iCKE-2c7KKR7SNcZfzLHoRyB3E6as8L87YA=w120-h120-p-l90-rj' }
]

export default function OnboardingWizard({ token, onComplete }) {
  const [step, setStep] = useState(1) // 1: Genres, 2: Artists, 3: Loading
  const [selectedGenres, setSelectedGenres] = useState(new Set())
  const [selectedArtists, setSelectedArtists] = useState(new Set())
  const [saving, setSaving] = useState(false)

  const toggleGenre = (genreId) => {
    const updated = new Set(selectedGenres)
    if (updated.has(genreId)) {
      updated.delete(genreId)
    } else {
      updated.add(genreId)
    }
    setSelectedGenres(updated)
  }

  const toggleArtist = (artistId) => {
    const updated = new Set(selectedArtists)
    if (updated.has(artistId)) {
      updated.delete(artistId)
    } else {
      updated.add(artistId)
    }
    setSelectedArtists(updated)
  }

  const handleNext = () => {
    if (selectedGenres.size === 0) {
      alert("Please choose at least one favorite genre!")
      return
    }
    setStep(2)
  }

  const handleComplete = async () => {
    if (selectedArtists.size === 0) {
      alert("Please select at least one favorite artist to customize recommendations!")
      return
    }

    setStep(3)
    setSaving(true)

    try {
      const res = await fetch('http://localhost:8000/api/auth/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          genres: Array.from(selectedGenres),
          artists: Array.from(selectedArtists)
        })
      })

      if (res.ok) {
        // Small delay for premium loading animation feel
        setTimeout(() => {
          onComplete()
        }, 1500)
      } else {
        alert("Failed to save onboarding preferences. Please try again.")
        setStep(2)
        setSaving(false)
      }
    } catch (err) {
      console.error("Onboarding failed:", err)
      alert("Network error saving onboarding. Verify server status.")
      setStep(2)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/95 z-55 flex items-center justify-center p-6 select-none animate-premium-fade-in font-sans">
      <div className="w-full max-w-lg bg-zinc-950/80 border border-zinc-900 rounded-3xl p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        
        {/* Decorative corner background glows */}
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-red-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />

        {/* Step 1: Genres Selection */}
        {step === 1 && (
          <div className="space-y-6 animate-premium-fade-in">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-650 to-amber-600 flex items-center justify-center mx-auto shadow-lg shadow-red-950/30">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">Personalize StreamYT</h1>
              <p className="text-xs text-zinc-400">Select your favorite genres to customize your home feed</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              {GENRES.map((g) => {
                const active = selectedGenres.has(g.id)
                return (
                  <button
                    key={g.id}
                    onClick={() => toggleGenre(g.id)}
                    className={`py-3.5 px-4 rounded-2xl border text-left transition relative active:scale-98 flex items-center gap-3 ${
                      active
                        ? 'bg-white border-white text-black font-bold shadow-md'
                        : 'bg-zinc-900/60 border-zinc-850 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900'
                    }`}
                  >
                    <span className="text-lg">{g.emoji}</span>
                    <span className="text-xs truncate">{g.name}</span>
                    {active && <Check className="w-3.5 h-3.5 absolute right-4 text-black stroke-[3px]" />}
                  </button>
                )
              })}
            </div>

            <div className="pt-4">
              <button
                onClick={handleNext}
                className="w-full py-4 bg-red-650 hover:bg-red-500 active:scale-98 transition rounded-2xl text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-red-950/30"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Artists Selection */}
        {step === 2 && (
          <div className="space-y-6 animate-premium-fade-in">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-600 to-red-650 flex items-center justify-center mx-auto shadow-lg">
                <Music className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">Pick Your Artists</h1>
              <p className="text-xs text-zinc-400">Choose favorite creators to generate recommendations</p>
            </div>

            <div className="grid grid-cols-2 gap-3 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar pt-2">
              {ARTISTS.map((a) => {
                const active = selectedArtists.has(a.id)
                return (
                  <button
                    key={a.id}
                    onClick={() => toggleArtist(a.id)}
                    className={`p-3 rounded-2xl border text-center transition active:scale-98 relative ${
                      active
                        ? 'bg-red-950/20 border-red-500 text-white font-bold shadow shadow-red-900/10'
                        : 'bg-zinc-900/60 border-zinc-850 text-zinc-400 hover:border-zinc-800 hover:text-white'
                    }`}
                  >
                    {/* Circle avatar badge */}
                    <div className={`w-12 h-12 rounded-full overflow-hidden mx-auto mb-2 shadow border transition duration-300 ${
                      active ? 'border-red-500 scale-105 shadow-md shadow-red-950/20' : 'border-zinc-800'
                    }`}>
                      <img src={a.image} alt={a.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[10px] block truncate font-sans">{a.name}</span>
                    <span className="text-[8px] block opacity-50 truncate mt-0.5 font-sans font-normal">{a.desc}</span>
                    {active && (
                      <span className="absolute top-2 right-2 w-3.5 h-3.5 bg-red-600 rounded-full flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white stroke-[3px]" />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(1)}
                className="w-1/3 py-4 bg-zinc-900 border border-zinc-850 rounded-2xl text-zinc-400 hover:text-white transition font-bold text-xs active:scale-98"
              >
                Back
              </button>
              <button
                onClick={handleComplete}
                className="w-2/3 py-4 bg-red-650 hover:bg-red-500 active:scale-98 transition rounded-2xl text-white text-xs font-bold shadow-lg shadow-red-950/20"
              >
                Complete Setup
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Loading Animation */}
        {step === 3 && (
          <div className="py-12 flex flex-col items-center justify-center space-y-6 animate-premium-fade-in text-center">
            <div className="w-16 h-16 border-3 border-zinc-900 border-t-red-600 rounded-full animate-spin shadow-lg" />
            <div className="space-y-2">
              <h2 className="text-lg font-extrabold text-white tracking-tight">Curation Active</h2>
              <p className="text-xs text-zinc-550 max-w-[280px] mx-auto animate-pulse">
                Personalizing your stream recommendations, layout structures, and mixes...
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
