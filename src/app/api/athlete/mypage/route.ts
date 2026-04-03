import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const DEFAULT_TEAM_ID = '00000000-0000-0000-0000-000000000001'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // プロフィール
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, number, position, weight, birth_date, avatar_url')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // 測定履歴
  const { data: measurements } = await supabase
    .from('measurements')
    .select(`
      id,
      measured_at,
      measurement_values (
        exercise_id,
        value,
        exercises ( name, unit )
      )
    `)
    .eq('profile_id', user.id)
    .order('measured_at', { ascending: true })

  // ベンチマークレベル
  const { data: benchmarkLevels } = await supabase
    .from('benchmark_levels')
    .select('id, name, sort_order, color')
    .eq('team_id', DEFAULT_TEAM_ID)
    .order('sort_order', { ascending: true })

  // ベンチマーク値（自分のポジション）
  let benchmarkValues: Record<string, unknown>[] = []
  if (profile.position && benchmarkLevels) {
    const levelIds = benchmarkLevels.map((l) => l.id)
    const { data } = await supabase
      .from('benchmark_values')
      .select('benchmark_level_id, exercise_id, value')
      .in('benchmark_level_id', levelIds)
      .eq('position', profile.position)

    benchmarkValues = data || []
  }

  // 種目一覧
  const { data: exercises } = await supabase
    .from('exercises')
    .select('id, name, unit')
    .eq('team_id', DEFAULT_TEAM_ID)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  return NextResponse.json({
    profile,
    measurements: measurements || [],
    benchmarkLevels: benchmarkLevels || [],
    benchmarkValues,
    exercises: exercises || [],
  })
}
