import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

const DEFAULT_TEAM_ID = '00000000-0000-0000-0000-000000000001'

export async function GET(request: NextRequest) {
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

  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7)
  const measuredAt = `${month}-01`

  const admin = createAdminClient()

  // 全選手
  const { data: athletes } = await admin
    .from('profiles')
    .select('id, name, number, position, weight')
    .eq('team_id', DEFAULT_TEAM_ID)
    .eq('role', 'athlete')
    .order('number', { ascending: true })

  // 該当月の測定データ
  const { data: measurements } = await admin
    .from('measurements')
    .select(`
      id,
      profile_id,
      measured_at,
      measurement_values ( exercise_id, value ),
      measurement_videos ( id )
    `)
    .eq('team_id', DEFAULT_TEAM_ID)
    .eq('measured_at', measuredAt)

  // 種目
  const { data: exercises } = await admin
    .from('exercises')
    .select('id, name, unit')
    .eq('team_id', DEFAULT_TEAM_ID)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  // ベンチマーク
  const { data: benchmarkLevels } = await admin
    .from('benchmark_levels')
    .select('id, name, sort_order, color')
    .eq('team_id', DEFAULT_TEAM_ID)
    .order('sort_order', { ascending: true })

  const { data: benchmarkValues } = await admin
    .from('benchmark_values')
    .select('benchmark_level_id, exercise_id, position, value')

  // 選手ごとのデータを組み立て
  const playerData = (athletes || []).map((athlete) => {
    const measurement = (measurements || []).find((m) => m.profile_id === athlete.id)
    const values: Record<string, number> = {}
    let hasVideo = false

    if (measurement) {
      for (const mv of measurement.measurement_values) {
        values[mv.exercise_id] = mv.value
      }
      hasVideo = measurement.measurement_videos.length > 0
    }

    // ベンチマーク達成数（チーム目標=最初のレベル）
    const firstLevel = benchmarkLevels?.[0]
    let achieved = 0
    let total = 0

    if (firstLevel && athlete.position && athlete.weight) {
      const posBenchmarks = (benchmarkValues || []).filter(
        (bv) => bv.benchmark_level_id === firstLevel.id && bv.position === athlete.position
      )
      for (const bv of posBenchmarks) {
        if (values[bv.exercise_id] !== undefined) {
          total++
          const target = bv.value * athlete.weight
          if (values[bv.exercise_id] >= target) achieved++
        }
      }
    }

    return {
      ...athlete,
      submitted: !!measurement,
      values,
      hasVideo,
      achieved,
      total,
    }
  })

  const submitted = playerData.filter((p) => p.submitted).length
  const noVideo = playerData.filter((p) => p.submitted && !p.hasVideo).length

  return NextResponse.json({
    players: playerData,
    exercises: exercises || [],
    summary: {
      total: playerData.length,
      submitted,
      notSubmitted: playerData.length - submitted,
      noVideo,
    },
    month,
  })
}
