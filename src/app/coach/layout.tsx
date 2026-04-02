import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import Header from '@/components/Header'
import CoachNav from '@/components/CoachNav'

export default async function CoachLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'coach') redirect('/')

  return (
    <>
      <Header name={profile.name} role="coach" />
      <CoachNav />
      <main className="flex-1">
        <div className="max-w-6xl mx-auto p-4">
          {children}
        </div>
      </main>
    </>
  )
}
