import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

const DEFAULT_TEAM_ID = '00000000-0000-0000-0000-000000000001'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('exercises')
    .select('id, name, unit, sort_order, is_active')
    .eq('team_id', DEFAULT_TEAM_ID)
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

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

  const { name, unit } = await request.json()
  if (!name || !unit) {
    return NextResponse.json({ error: '項目名と単位は必須です' }, { status: 400 })
  }

  const admin = createAdminClient()

  // 現在の最大sort_orderを取得
  const { data: maxSort } = await admin
    .from('exercises')
    .select('sort_order')
    .eq('team_id', DEFAULT_TEAM_ID)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const nextOrder = (maxSort?.sort_order || 0) + 1

  const { data, error } = await admin.from('exercises').insert({
    team_id: DEFAULT_TEAM_ID,
    name,
    unit,
    sort_order: nextOrder,
  }).select('id').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PUT(request: NextRequest) {
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

  const { id, name, unit } = await request.json()
  if (!id || !name || !unit) {
    return NextResponse.json({ error: 'ID、項目名、単位は必須です' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('exercises')
    .update({ name, unit })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
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

  const { id } = await request.json()
  const admin = createAdminClient()
  const { error } = await admin
    .from('exercises')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
