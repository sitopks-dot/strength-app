'use client'

import { useState, useEffect, useCallback } from 'react'

type Exercise = {
  id: string
  name: string
  unit: string
  sort_order: number
  is_active: boolean
}

const units = ['kg', '回', '秒', 'cm', 'm']

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchExercises = useCallback(async () => {
    const res = await fetch('/api/exercises')
    if (res.ok) setExercises(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchExercises() }, [fetchExercises])

  function handleEdit(ex: Exercise) {
    setEditId(ex.id)
    setName(ex.name)
    setUnit(ex.unit)
    setShowForm(true)
    setError('')
  }

  function handleCancel() {
    setShowForm(false)
    setEditId(null)
    setName('')
    setUnit('')
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const method = editId ? 'PUT' : 'POST'
    const payload = editId ? { id: editId, name, unit } : { name, unit }

    const res = await fetch('/api/exercises', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'エラーが発生しました')
      setSubmitting(false)
      return
    }

    handleCancel()
    setSubmitting(false)
    fetchExercises()
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`「${name}」を削除しますか？関連する測定データも削除されます。`)) return

    const res = await fetch('/api/exercises', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })

    if (res.ok) fetchExercises()
  }

  if (loading) return <p className="text-gray-500">読み込み中...</p>

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold">測定項目管理</h1>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setEditId(null); setName(''); setUnit('') }}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary-light transition"
          >
            + 項目を追加
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-blue-50 rounded-xl p-4 border border-blue-200 mb-4">
          <h3 className="font-bold text-sm mb-3">
            {editId ? '測定項目の編集' : '新しい測定項目'}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="項目名（例: 40ヤード走）"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              required
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">単位を選択</option>
              {units.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          <div className="flex gap-2 mt-3">
            <button
              type="submit"
              disabled={submitting}
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary-light transition disabled:opacity-50"
            >
              {submitting ? '処理中...' : editId ? '更新' : '追加'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="bg-white border text-gray-500 px-4 py-2 rounded-lg text-sm"
            >
              キャンセル
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {exercises.length === 0 ? (
          <p className="text-gray-400 text-center py-8">測定項目が登録されていません</p>
        ) : (
          exercises.map((ex) => (
            <div key={ex.id} className="bg-white rounded-xl p-4 shadow-sm border flex items-center justify-between">
              <div>
                <div className="font-bold">{ex.name}</div>
                <div className="text-sm text-gray-500">単位: {ex.unit}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(ex)}
                  className="text-blue-600 text-sm px-3 py-1 border rounded hover:bg-blue-50 transition"
                >
                  編集
                </button>
                <button
                  onClick={() => handleDelete(ex.id, ex.name)}
                  className="text-red-500 text-sm px-3 py-1 border rounded hover:bg-red-50 transition"
                >
                  削除
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
