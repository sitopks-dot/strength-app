'use client'

import { useState, useEffect, useCallback } from 'react'

type BenchmarkLevel = {
  id: string
  name: string
  sort_order: number
  color: string
}

type BenchmarkValue = {
  id: string
  benchmark_level_id: string
  exercise_id: string
  position: string
  value: number
}

type Exercise = {
  id: string
  name: string
  unit: string
}

const positions = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB', 'K/P']

export default function BenchmarksPage() {
  const [levels, setLevels] = useState<BenchmarkLevel[]>([])
  const [values, setValues] = useState<BenchmarkValue[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [selectedPosition, setSelectedPosition] = useState('LB')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  // ローカル編集用: { `${levelId}_${exerciseId}`: value }
  const [editValues, setEditValues] = useState<Record<string, string>>({})

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/benchmarks')
    if (res.ok) {
      const data = await res.json()
      setLevels(data.levels)
      setValues(data.values)
      setExercises(data.exercises)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // ポジション変更時にeditValuesを初期化
  useEffect(() => {
    const newEdit: Record<string, string> = {}
    for (const level of levels) {
      for (const ex of exercises) {
        const existing = values.find(
          (v) => v.benchmark_level_id === level.id && v.exercise_id === ex.id && v.position === selectedPosition
        )
        newEdit[`${level.id}_${ex.id}`] = existing ? String(existing.value) : ''
      }
    }
    setEditValues(newEdit)
  }, [selectedPosition, levels, exercises, values])

  function handleChange(levelId: string, exerciseId: string, val: string) {
    setEditValues((prev) => ({ ...prev, [`${levelId}_${exerciseId}`]: val }))
  }

  async function handleSave() {
    setSaving(true)
    setMessage('')

    const saveValues = []
    for (const level of levels) {
      for (const ex of exercises) {
        const val = parseFloat(editValues[`${level.id}_${ex.id}`] || '0')
        saveValues.push({
          benchmark_level_id: level.id,
          exercise_id: ex.id,
          value: val,
        })
      }
    }

    const res = await fetch('/api/benchmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ position: selectedPosition, values: saveValues }),
    })

    if (res.ok) {
      setMessage('保存しました')
      fetchData()
    } else {
      const data = await res.json()
      setMessage(`エラー: ${data.error}`)
    }
    setSaving(false)
    setTimeout(() => setMessage(''), 3000)
  }

  const levelColors: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
  }

  if (loading) return <p className="text-gray-500">読み込み中...</p>

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold">ベンチマーク設定</h1>
      </div>

      {/* ポジション選択 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {positions.map((pos) => (
          <button
            key={pos}
            onClick={() => setSelectedPosition(pos)}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition ${
              selectedPosition === pos
                ? 'bg-primary text-white'
                : 'bg-white border text-gray-600 hover:bg-gray-50'
            }`}
          >
            {pos}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-500 mb-4">
        全種目「体重比（倍率）」で設定します。選手の体重に倍率をかけた値がベンチマークとなります。
      </p>

      {/* テーブル */}
      <div className="bg-white rounded-xl shadow-sm border overflow-x-auto mb-4">
        <div className="px-4 py-3 bg-gray-50 font-bold text-sm border-b">{selectedPosition}</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-600">レベル</th>
              {exercises.map((ex) => (
                <th key={ex.id} className="px-4 py-2 text-right font-medium text-gray-600">
                  {ex.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {levels.map((level) => (
              <tr key={level.id}>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${levelColors[level.color] || 'bg-gray-100 text-gray-700'}`}>
                    {level.name}
                  </span>
                </td>
                {exercises.map((ex) => (
                  <td key={ex.id} className="px-4 py-3 text-right">
                    <input
                      type="number"
                      step="0.01"
                      value={editValues[`${level.id}_${ex.id}`] || ''}
                      onChange={(e) => handleChange(level.id, ex.id, e.target.value)}
                      placeholder="0.00"
                      className="w-20 border rounded px-2 py-1 text-right text-sm"
                    />
                    <span className="text-xs text-gray-400 ml-1">倍</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-primary-light transition disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
          <span className="text-xs text-gray-400">
            例: 90kg選手のベンチ1.3倍 → 117kg が目標値
          </span>
          {message && (
            <span className={`text-sm font-bold ${message.startsWith('エラー') ? 'text-red-500' : 'text-green-600'}`}>
              {message}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
