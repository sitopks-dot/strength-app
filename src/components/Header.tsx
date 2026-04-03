'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Props = {
  name: string
  role: 'coach' | 'athlete'
  avatarUrl?: string | null
}

export default function Header({ name, role, avatarUrl }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const router = useRouter()

  // メニュー外クリックで閉じる
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initial = name.charAt(0)

  return (
    <header className="bg-primary text-white px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-xl">🏈</span>
        <span className="font-bold">STRENGTH</span>
        {role === 'coach' && (
          <span className="text-xs bg-accent text-primary px-2 py-0.5 rounded font-bold ml-2">
            COACH
          </span>
        )}
      </div>
      <div className="relative flex items-center gap-3" ref={menuRef}>
        <span className="text-sm hidden sm:inline">{name}</span>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-8 h-8 bg-accent rounded-full flex items-center justify-center text-sm font-bold text-primary hover:bg-amber-400 transition overflow-hidden"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            initial
          )}
        </button>

        {/* ドロップダウンメニュー */}
        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border py-1 z-50">
            <div className="px-4 py-2 border-b">
              <p className="text-sm font-bold text-gray-800">{name}</p>
              <p className="text-xs text-gray-500">{role === 'coach' ? 'コーチ' : '選手'}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
            >
              ログアウト
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
