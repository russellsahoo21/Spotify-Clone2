import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Music, Lock, User, Mail, ArrowRight, AlertCircle } from 'lucide-react'
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { auth } from '../firebase'

export default function AuthView() {
  const { login, register, socialLogin } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSocialLogin = async (provider) => {
    setError('')
    setLoading(true)

    if (provider === 'google') {
      try {
        const googleProvider = new GoogleAuthProvider()
        const result = await signInWithPopup(auth, googleProvider)
        const user = result.user
        
        await socialLogin(
          'google',
          user.uid,
          user.displayName || user.email.split('@')[0],
          user.email
        )
      } catch (err) {
        console.error("Firebase Auth Error:", err)
        setError(err.message || "Failed to authenticate with Google.")
        setLoading(false)
      }
    } else {
      // Fallback to simulated login for other social options
      const width = 450
      const height = 520
      const left = window.screenX + (window.outerWidth - width) / 2
      const top = window.screenY + (window.outerHeight - height) / 2

      const popup = window.open(
        'about:blank',
        'social_auth_popup',
        `width=${width},height=${height},left=${left},top=${top},status=no,resizable=no,scrollbars=no`
      )

      if (!popup) {
        setError("Popup window blocked. Please enable popups to authenticate.")
        setLoading(false)
        return
      }

      const capitalizedProvider = provider.charAt(0).toUpperCase() + provider.slice(1)
      let brandColor = "#4285F4"
      if (provider === 'spotify') brandColor = "#1DB954"
      if (provider === 'gaana') brandColor = "#e72c30"

      popup.document.write(`
        <html>
          <head>
            <title>Sign in with ${capitalizedProvider}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">
            <style>
              body { font-family: 'Outfit', sans-serif; background-color: #09090b; color: #fff; }
            </style>
          </head>
          <body class="flex flex-col items-center justify-center h-screen p-6 overflow-hidden">
            <div class="w-full max-w-sm flex flex-col items-center">
              <div class="w-12 h-12 rounded-full flex items-center justify-center mb-5 shadow-lg" style="background-color: ${brandColor}15; border: 1px solid ${brandColor}30">
                <span class="text-xl font-extrabold" style="color: ${brandColor}">
                  ${capitalizedProvider[0]}
                </span>
              </div>
              
              <h2 class="text-lg font-bold mb-1">Simulated Social Login</h2>
              <p class="text-zinc-500 text-[10px] text-center mb-6">Connecting safely to StreamYT social bridge</p>

              <div id="loader" class="flex flex-col items-center my-4">
                <div class="w-8 h-8 border-2 border-zinc-800 border-t-red-500 rounded-full animate-spin mb-3" style="border-top-color: ${brandColor}"></div>
                <p class="text-zinc-400 text-[10px] font-semibold animate-pulse">Establishing secure link...</p>
              </div>

              <div id="credentials" class="hidden w-full space-y-4">
                <div class="bg-zinc-900 border border-zinc-850 p-4 rounded-xl flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-300">R</div>
                  <div class="min-w-0 flex-1">
                    <p class="text-xs font-bold truncate">Russell social</p>
                    <p class="text-[10px] text-zinc-500 truncate">russell_${provider}@streamyt.com</p>
                  </div>
                </div>
                
                <button id="approve-btn" class="w-full py-3 rounded-xl font-bold text-xs text-white transition active:scale-95 shadow-md" style="background-color: ${brandColor}">
                  Sign In & Authorize
                </button>
                <button id="cancel-btn" class="w-full py-3 rounded-xl font-bold text-xs bg-zinc-900 border border-zinc-850 text-zinc-450 hover:text-white transition">
                  Cancel
                </button>
              </div>
            </div>

            <script>
              setTimeout(() => {
                document.getElementById('loader').classList.add('hidden');
                document.getElementById('credentials').classList.remove('hidden');
              }, 1000);

              document.getElementById('approve-btn').addEventListener('click', () => {
                window.opener.postMessage({
                  source: 'social_auth_callback',
                  provider: '${provider}',
                  uid: 'mock_uid_' + Math.random().toString(36).substring(2, 9),
                  username: 'russell_' + '${provider}',
                  email: 'russell_' + '${provider}' + '@streamyt.com'
                }, '*');
                window.close();
              });

              document.getElementById('cancel-btn').addEventListener('click', () => {
                window.close();
              });
            </script>
          </body>
        </html>
      `)
      popup.document.close()

      const handleMessage = async (event) => {
        if (event.data && event.data.source === 'social_auth_callback') {
          window.removeEventListener('message', handleMessage)
          const { provider, uid, username, email } = event.data
          try {
            await socialLogin(provider, uid, username, email)
          } catch (err) {
            setError(err.message || "Failed to authenticate social profile.")
            setLoading(false)
          }
        }
      }

      window.addEventListener('message', handleMessage)

      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed)
          window.removeEventListener('message', handleMessage)
          setLoading(false)
        }
      }, 500)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        await login(username, password)
      } else {
        await register(username, email, password)
      }
    } catch (err) {
      setError(err.message || "An authentication error occurred.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-zinc-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Card */}
      <div className="w-full max-w-md bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-8 backdrop-blur-xl shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4 shadow-lg shadow-red-500/5">
            <Music className="w-8 h-8 text-red-500 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white text-center">
            {isLogin ? 'Sign in to StreamYT' : 'Create your account'}
          </h2>
          <p className="text-zinc-500 text-sm mt-1 text-center">
            {isLogin ? 'Enjoy unlimited music streaming' : 'Join and start creating custom playlists'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-400 font-medium leading-relaxed">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
              />
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-semibold text-sm rounded-xl py-3.5 mt-2 flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 hover:shadow-red-600/30 transition disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{isLogin ? 'Sign In' : 'Get Started'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="relative flex py-5 items-center">
          <div className="flex-grow border-t border-zinc-900"></div>
          <span className="flex-shrink mx-4 text-zinc-600 text-[10px] font-bold uppercase tracking-wider">Or continue with</span>
          <div className="flex-grow border-t border-zinc-900"></div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-2">
          <button
            onClick={() => handleSocialLogin('google')}
            className="flex items-center justify-center gap-1.5 py-3 border border-zinc-900 rounded-xl bg-zinc-950/40 hover:bg-zinc-900/60 text-zinc-400 hover:text-white transition active:scale-95 text-[10px] font-bold"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
            <span>Google</span>
          </button>
          
          <button
            onClick={() => handleSocialLogin('spotify')}
            className="flex items-center justify-center gap-1.5 py-3 border border-zinc-900 rounded-xl bg-zinc-950/40 hover:bg-zinc-900/60 text-zinc-400 hover:text-white transition active:scale-95 text-[10px] font-bold"
          >
            <svg className="w-3.5 h-3.5 text-[#1DB954]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.563.387-.857.207-2.377-1.454-5.37-1.783-8.893-.982-.336.075-.668-.135-.744-.47-.077-.337.136-.669.472-.745 3.858-.88 7.15-.502 9.815 1.13.295.18.387.563.207.86zm1.224-2.72c-.227.367-.707.487-1.074.26-2.72-1.672-6.87-2.157-10.078-1.182-.413.125-.847-.107-.972-.52-.125-.413.107-.847.52-.972 3.676-1.116 8.243-.574 11.343 1.334.368.228.488.708.26 1.08zm.106-2.833C14.492 8.74 8.78 8.55 5.442 9.563c-.51.155-1.058-.135-1.213-.646-.156-.51.135-1.058.647-1.213 3.843-1.167 10.155-.95 14.1 1.393.46.273.61.87.337 1.328-.273.46-.87.61-1.328.337z"/>
            </svg>
            <span>Spotify</span>
          </button>
          
          <button
            onClick={() => handleSocialLogin('gaana')}
            className="flex items-center justify-center gap-1.5 py-3 border border-zinc-900 rounded-xl bg-zinc-950/40 hover:bg-zinc-900/60 text-zinc-400 hover:text-white transition active:scale-95 text-[10px] font-bold"
          >
            <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-red-650 to-orange-500 flex items-center justify-center text-[9px] font-black text-white shrink-0 select-none">G</span>
            <span>Gaana</span>
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-zinc-900 text-center">
          <p className="text-sm text-zinc-500">
            {isLogin ? "New to StreamYT?" : "Already have an account?"}{' '}
            <button
              onClick={() => {
                setIsLogin(!isLogin)
                setError('')
              }}
              className="text-red-500 hover:text-red-400 font-semibold transition"
            >
              {isLogin ? 'Create an account' : 'Sign in here'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
