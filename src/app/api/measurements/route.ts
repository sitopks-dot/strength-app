import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const DEFAULT_TEAM_ID = '00000000-0000-0000-0000-000000000001'

// POST: 測定データ送信（既存があれば上書き）
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { measured_at, values, video_paths } = body

  if (!measured_at || !values || values.length === 0) {
    return NextResponse.json({ error: '測定月と測定値は必須です' }, { status: 400 })
  }

  // 既存の測定を確認
  const { data: existing } = await supabase
    .from('measurements')
    .select('id')
    .eq('profile_id', user.id)
    .eq('measured_at', measured_at)
    .single()

  // 既存があれば削除（CASCADE で values, videos も消える）
  if (existing) {
    await supabase.from('measurements').delete().eq('id', existing.id)
  }

  // measurement 作成
  const { data: measurement, error: mError } = await supabase
    .from('measurements')
    .insert({
      profile_id: user.id,
      team_id: DEFAULT_TEAM_ID,
      measured_at,
    })
    .select('id')
    .single()

  if (mError) {
    return NextResponse.json({ error: mError.message }, { status: 500 })
  }

  // measurement_values 一括挿入
  const valueRows = values.map((v: { exercise_id: string; value: number }) => ({
    measurement_id: measurement.id,
    exercise_id: v.exercise_id,
    value: v.value,
  }))

  const { error: vError } = await supabase
    .from('measurement_values')
    .insert(valueRows)

  if (vError) {
    return NextResponse.json({ error: vError.message }, { status: 500 })
  }

  // 動画メタデータ登録
  if (video_paths && video_paths.length > 0) {
    const videoRows = video_paths.map((v: { storage_path: string; file_name: string; file_size: number }) => ({
      measurement_id: measurement.id,
      storage_path: v.storage_path,
      file_name: v.file_name,
      file_size: v.file_size,
    }))

    await supabase.from('measurement_videos').insert(videoRows)
  }

  return NextResponse.json({
    id: measurement.id,
    updated: !!existing,
  }, { status: 201 })
}

// GET: 自分の測定履歴取得
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
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
    .order('measured_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
