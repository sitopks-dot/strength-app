import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export default async function Home() {
  let redirectTo = '/login'

  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'coach') {
        redirectTo = '/coach/dashboard'
      } else {
        redirectTo = '/athlete/mypage'
      }
    }
  } catch {
    // Supabase接続エラー時はログインへ
  }

  redirect(redirectTo)
}
