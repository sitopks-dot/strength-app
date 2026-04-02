'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'

type Profile = {
  id: string
  name: string
  number: number | null
  position: string | null
  weight: number | null
  birth_date: string | null
}

type MeasurementValue = {
  exercise_id: string
  value: number
  exercises: { name: string; unit: string }
}

type Measurement = {
  id: string
  measured_at: string
  measurement_values: MeasurementValue[]
}

type BenchmarkLevel = {
  id: string
  name: string
  sort_order: number
  color: string
}

type BenchmarkValue = {
  benchmark_level_id: string
  exercise_id: string
  value: number
}

type Exercise = {
  id: string
  name: string
  unit: string
}

type MypageData = {
  profile: Profile
  measurements: Measurement[]
  benchmarkLevels: BenchmarkLevel[]
  benchmarkValues: BenchmarkValue[]
  exercises: Exercise[]
}

const colorMap: Record<string, { bar: string; text: string }> = {
  blue: { bar: 'bg-green-500', text: 'text-green-600' },
  amber: { bar: 'bg-amber-400', text: 'text-amber-600' },
  red: { bar: 'bg-red-400', text: 'text-red-500' },
}

function calcAge(birthDate: string): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

export default function MypagePage() {
  const [data, setData] = useState<MypageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedExercise, setSelectedExercise] = useState<string>('')

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/athlete/mypage')
    if (res.ok) {
      const d = await res.json()
      setData(d)
      if (d.exercises.length > 0 && !selectedExercise) {
        setSelectedExercise(d.exercises[0].id)
      }
    }
    setLoading(false)
  }, [selectedExercise])

  useEffect(() => { fetchData() }, [fetchData])

  // 最新の測定値を種目ごとに取得
  const latestValues = useMemo(() => {
    if (!data || data.measurements.length === 0) return {}
    const latest = data.measurements[data.measurements.length - 1]
    const map: Record<string, number> = {}
    for (const mv of latest.measurement_values) {
      map[mv.exercise_id] = mv.value
    }
    return map
  }, [data])

  // 推移グラフ用データ
  const chartData = useMemo(() => {
    if (!data || !selectedExercise) return []
    return data.measurements.map((m) => {
      const mv = m.measurement_values.find((v) => v.exercise_id === selectedExercise)
      const month = new Date(m.measured_at).toLocaleDateString('ja-JP', { month: 'short' })
      return { month, value: mv?.value || 0, measured_at: m.measured_at }
    }).filter((d) => d.value > 0)
  }, [data, selectedExercise])

  const maxChartValue = useMemo(() => {
    if (chartData.length === 0) return 100
    return Math.max(...chartData.map((d) => d.value)) * 1.2
  }, [chartData])

  if (loading) return <p className="text-gray-500">読み込み中...</p>
  if (!data) return <p className="text-red-500">データの取得に失敗しました</p>

  const { profile, exercises, benchmarkLevels, benchmarkValues } = data

  return (
    <div>
      {/* プロフィール */}
      <div className="bg-white rounded-xl p-4 shadow-sm border mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {profile.number || '?'}
          </div>
          <div>
            <h2 className="text-lg font-bold">{profile.name}</h2>
            <p className="text-sm text-gray-500">
              {profile.position || '-'} / {profile.weight ? `${profile.weight}kg` : '-'}
              {profile.birth_date && ` / ${calcAge(profile.birth_date)}歳`}
            </p>
          </div>
        </div>
      </div>

      {/* ベンチマーク達成状況 */}
      {benchmarkLevels.length > 0 && Object.keys(latestValues).length > 0 && (
        <>
          <h3 className="font-bold text-gray-800 mb-3">ベンチマーク達成状況</h3>
          <div className="space-y-4 mb-6">
            {exercises.map((ex) => {
              const currentValue = latestValues[ex.id]
              if (currentValue === undefined) return null

              const exBenchmarks = benchmarkValues
                .filter((bv) => bv.exercise_id === ex.id)
                .map((bv) => {
                  const level = benchmarkLevels.find((l) => l.id === bv.benchmark_level_id)
                  const targetValue = profile.weight ? Math.round(bv.value * profile.weight) : 0
                  const percentage = targetValue > 0 ? Math.round((currentValue / targetValue) * 100) : 0
                  return { level, ratio: bv.value, targetValue, percentage }
                })
                .sort((a, b) => (a.level?.sort_order || 0) - (b.level?.sort_order || 0))

              if (exBenchmarks.length === 0) return null

              return (
                <div key={ex.id} className="bg-white rounded-xl p-4 shadow-sm border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{ex.name}</span>
                    <span className="text-lg font-bold text-primary">
                      {currentValue} {ex.unit}
                    </span>
                  </div>
                  {exBenchmarks.map(({ level, ratio, targetValue, percentage }) => {
                    if (!level) return null
                    const colors = colorMap[level.color] || colorMap.blue
                    const achieved = percentage >= 100
                    return (
                      <div key={level.id} className="mb-2 last:mb-0">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>
                            {level.name}{' '}
                            <span className="text-gray-400">{ratio}倍</span>
                            {' → '}{targetValue}{ex.unit}
                          </span>
                          <span className={`font-bold ${achieved ? 'text-green-600' : colors.text}`}>
                            {percentage}%{achieved ? ' ✓' : ''}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`${achieved ? 'bg-green-500' : colors.bar} rounded-full h-2 transition-all duration-500`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* 推移グラフ */}
      {chartData.length > 0 && (
        <>
          <h3 className="font-bold text-gray-800 mb-3">測定推移</h3>
          <div className="bg-white rounded-xl p-4 shadow-sm border mb-6">
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span>
                {exercises.find((e) => e.id === selectedExercise)?.name || ''}
                {' ('}
                {exercises.find((e) => e.id === selectedExercise)?.unit || ''}
                {')'}
              </span>
              <select
                value={selectedExercise}
                onChange={(e) => setSelectedExercise(e.target.value)}
                className="border rounded px-2 py-1 text-xs"
              >
                {exercises.map((ex) => (
                  <option key={ex.id} value={ex.id}>{ex.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2 h-32 border-b border-l border-gray-200 p-2">
              {chartData.map((d, i) => {
                const height = maxChartValue > 0 ? (d.value / maxChartValue) * 100 : 0
                const isLast = i === chartData.length - 1
                return (
                  <div key={d.measured_at} className="flex-1 flex flex-col items-center justify-end">
                    <div
                      className={`w-full rounded-t transition-all ${isLast ? 'bg-primary' : 'bg-primary/30'}`}
                      style={{ height: `${height}%` }}
                      title={`${d.value}`}
                    />
                    <span className="text-xs text-gray-400 mt-1">{d.month}</span>
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1 px-2">
              {chartData.map((d, i) => (
                <span key={d.measured_at} className={i === chartData.length - 1 ? 'font-bold text-primary' : ''}>
                  {d.value}
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      {/* データなし */}
      {data.measurements.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-gray-500">まだ測定データがありません</p>
          <p className="text-sm text-gray-400 mt-1">「測定入力」タブからデータを入力してください</p>
        </div>
      )}
    </div>
  )
}
