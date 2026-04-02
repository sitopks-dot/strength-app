import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

const DEFAULT_TEAM_ID = '00000000-0000-0000-0000-000000000001'

// GET: ベンチマーク設定を一括取得
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: levels } = await supabase
    .from('benchmark_levels')
    .select('id, name, sort_order, color')
    .eq('team_id', DEFAULT_TEAM_ID)
    .order('sort_order', { ascending: true })

  const { data: values } = await supabase
    .from('benchmark_values')
    .select('id, benchmark_level_id, exercise_id, position, value')

  const { data: exercises } = await supabase
    .from('exercises')
    .select('id, name, unit')
    .eq('team_id', DEFAULT_TEAM_ID)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  return NextResponse.json({
    levels: levels || [],
    values: values || [],
    exercises: exercises || [],
  })
}

// POST: ベンチマーク値を一括保存（upsert）
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

  const { position, values } = await request.json()
  // values: [{ benchmark_level_id, exercise_id, value }]

  if (!position || !values) {
    return NextResponse.json({ error: 'ポジションと値は必須です' }, { status: 400 })
  }

  const admin = createAdminClient()

  // 該当ポジションの既存値を削除して再挿入（シンプルなupsert）
  const levelIds = [...new Set(values.map((v: { benchmark_level_id: string }) => v.benchmark_level_id))]

  for (const levelId of levelIds) {
    await admin
      .from('benchmark_values')
      .delete()
      .eq('benchmark_level_id', levelId)
      .eq('position', position)
  }

  const rows = values
    .filter((v: { value: number }) => v.value > 0)
    .map((v: { benchmark_level_id: string; exercise_id: string; value: number }) => ({
      benchmark_level_id: v.benchmark_level_id,
      exercise_id: v.exercise_id,
      position,
      value: v.value,
    }))

  if (rows.length > 0) {
    const { error } = await admin.from('benchmark_values').insert(rows)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
