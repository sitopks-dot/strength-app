import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import Header from '@/components/Header'
import AthleteNav from '@/components/AthleteNav'

export default async function AthleteLayout({
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

  if (!profile || profile.role !== 'athlete') redirect('/')

  return (
    <>
      <Header name={profile.name} role="athlete" />
      <main className="flex-1">
        <div className="max-w-lg mx-auto p-4">
          <AthleteNav />
          {children}
        </div>
      </main>
    </>
  )
}
