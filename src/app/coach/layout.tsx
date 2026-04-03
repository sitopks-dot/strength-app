import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import Header from '@/components/Header'
import CoachNav from '@/components/CoachNav'

export const dynamic = 'force-dynamic'

export default async function CoachLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let profile: { name: string; role: string; avatar_url: string | null } | null = null

  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data } = await supabase
      .from('profiles')
      .select('name, role, avatar_url')
      .eq('id', user.id)
      .single()

    profile = data
  } catch {
    redirect('/login')
  }

  if (!profile || profile.role !== 'coach') redirect('/login')

  return (
    <>
      <Header name={profile.name} role="coach" avatarUrl={profile.avatar_url} />
      <CoachNav />
      <main className="flex-1">
        <div className="max-w-6xl mx-auto p-4">
          {children}
        </div>
      </main>
    </>
  )
}
