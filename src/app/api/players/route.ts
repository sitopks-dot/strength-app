import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

const DEFAULT_TEAM_ID = '00000000-0000-0000-0000-000000000001'

// GET: 選手一覧取得
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'coach') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, number, position, weight, birth_date, avatar_url, role')
    .eq('team_id', DEFAULT_TEAM_ID)
    .eq('role', 'athlete')
    .order('number', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST: 選手作成（Auth + Profile）
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'coach') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { name, email, password, number, position, weight, birth_date } = body

  if (!name || !email || !password) {
    return NextResponse.json({ error: '名前、メール、パスワードは必須です' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Auth ユーザー作成
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  // Profile 作成
  const { error: profileError } = await admin.from('profiles').insert({
    id: authData.user.id,
    team_id: DEFAULT_TEAM_ID,
    role: 'athlete',
    name,
    number: number || null,
    position: position || null,
    weight: weight || null,
    birth_date: birth_date || null,
  })

  if (profileError) {
    // ロールバック: Auth ユーザーも削除
    await admin.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ id: authData.user.id }, { status: 201 })
}
