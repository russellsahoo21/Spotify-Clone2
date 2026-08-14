import { Home, Search, Library, User, Plus, Link as LinkIcon, Music, Heart, History, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Sidebar({
  activeView,
  setActiveView,
  playlists = [],
  onSelectPlaylist,
  selectedPlaylistId,
  onCreatePlaylist,
  onImportPlaylist
}) {
  const { user, logout } = useAuth()

  return (
    <aside className="w-64 bg-black border-r border-zinc-900 flex flex-col h-full shrink-0 font-sans select-none">
      {/* Logo */}
      <div className="p-6 flex items-center gap-2 cursor-pointer" onClick={() => setActiveView('home')}>
        <Music className="w-8 h-8 text-red-500 fill-red-500/20" />
        <span className="text-xl font-bold tracking-tight text-white">StreamYT</span>
      </div>

      {/* Main Navigation */}
      <div className="px-4 mb-6">
        <h3 className="px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Menu</h3>
        <nav className="space-y-1">
          <button
            onClick={() => setActiveView('home')}
            className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
              activeView === 'home' ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-950'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Home / Explore</span>
          </button>
          
          <button
            onClick={() => setActiveView('search')}
            className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
              activeView === 'search' ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-950'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Search</span>
          </button>

          <button
            onClick={() => setActiveView('library')}
            className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
              activeView === 'library' && !selectedPlaylistId ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-950'
            }`}
          >
            <Library className="w-4 h-4" />
            <span>My Library</span>
          </button>

          <button
            onClick={() => setActiveView('profile')}
            className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
              activeView === 'profile' ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-950'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profile</span>
          </button>
        </nav>
      </div>

      {/* Playlist Actions */}
      <div className="px-4 mb-6">
        <h3 className="px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 flex items-center justify-between">
          <span>Playlists</span>
          <div className="flex gap-2">
            <button
              onClick={onCreatePlaylist}
              title="Create Playlist"
              className="text-zinc-500 hover:text-white transition"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onImportPlaylist}
              title="Import YouTube Playlist"
              className="text-zinc-500 hover:text-white transition"
            >
              <LinkIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </h3>

        <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
          {playlists.length > 0 ? (
            playlists.map((playlist) => (
              <button
                key={playlist.id}
                onClick={() => onSelectPlaylist(playlist.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-left truncate transition ${
                  selectedPlaylistId === playlist.id
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-950'
                }`}
              >
                <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center shrink-0">
                  <Music className="w-3 h-3 text-red-500" />
                </div>
                <span className="truncate flex-1">{playlist.title}</span>
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-[11px] text-zinc-600 italic">No playlists created.</p>
          )}
        </div>
      </div>

      {/* Quick Library Links */}
      <div className="px-4 mt-auto mb-4 border-t border-zinc-900 pt-4">
        <div className="space-y-1">
          <button
            onClick={() => setActiveView('library', 'favorites')}
            className="w-full flex items-center gap-3.5 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-950 transition"
          >
            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500/20" />
            <span>Liked Songs</span>
          </button>
          
          <button
            onClick={() => setActiveView('library', 'history')}
            className="w-full flex items-center gap-3.5 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-950 transition"
          >
            <History className="w-3.5 h-3.5 text-zinc-500" />
            <span>Recently Played</span>
          </button>
        </div>
      </div>

      {/* User Info & Logout */}
      {user && (
        <div className="p-4 bg-zinc-950/60 border-t border-zinc-900 flex items-center justify-between gap-2 mt-auto">
          <div className="min-w-0 flex-1 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center font-bold text-white shrink-0 uppercase">
              {user.username.slice(0, 2)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{user.username}</p>
              <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition shrink-0"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
  )
}
