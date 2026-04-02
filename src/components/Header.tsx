'use client'

import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Props = {
  name: string
  role: 'coach' | 'athlete'
}

export default function Header({ name, role }: Props) {
  const supabase = createClient()
  const router = useRouter()

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
      <div className="flex items-center gap-3">
        <span className="text-sm hidden sm:inline">{name}</span>
        <button
          onClick={handleLogout}
          className="w-8 h-8 bg-accent rounded-full flex items-center justify-center text-sm font-bold text-primary hover:bg-amber-400 transition"
          title="ログアウト"
        >
          {initial}
        </button>
      </div>
    </header>
  )
}
