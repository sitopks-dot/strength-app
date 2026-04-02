'use client'

import { useState, useEffect, useCallback } from 'react'

type Exercise = { id: string; name: string; unit: string }

type PlayerData = {
  id: string
  name: string
  number: number | null
  position: string | null
  weight: number | null
  submitted: boolean
  values: Record<string, number>
  hasVideo: boolean
  achieved: number
  total: number
}

type Summary = {
  total: number
  submitted: number
  notSubmitted: number
  noVideo: number
}

export default function DashboardPage() {
  const [players, setPlayers] = useState<PlayerData[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [summary, setSummary] = useState<Summary>({ total: 0, submitted: 0, notSubmitted: 0, noVideo: 0 })
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [posFilter, setPosFilter] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/coach/dashboard?month=${month}`)
    if (res.ok) {
      const data = await res.json()
      setPlayers(data.players)
      setExercises(data.exercises)
      setSummary(data.summary)
    }
    setLoading(false)
  }, [month])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = posFilter
    ? players.filter((p) => p.position === posFilter)
    : players

  const positions = [...new Set(players.map((p) => p.position).filter(Boolean))]

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">ダッシュボード</h1>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border text-center">
          <div className="text-2xl font-bold text-primary">{summary.total}</div>
          <div className="text-xs text-gray-500">登録選手数</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border text-center">
          <div className="text-2xl font-bold text-green-600">{summary.submitted}</div>
          <div className="text-xs text-gray-500">入力済み</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border text-center">
          <div className="text-2xl font-bold text-amber-500">{summary.notSubmitted}</div>
          <div className="text-xs text-gray-500">未入力</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border text-center">
          <div className="text-2xl font-bold text-red-500">{summary.noVideo}</div>
          <div className="text-xs text-gray-500">動画未提出</div>
        </div>
      </div>

      {/* フィルター */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={posFilter}
          onChange={(e) => setPosFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">全ポジション</option>
          {positions.map((p) => <option key={p} value={p!}>{p}</option>)}
        </select>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        />
      </div>

      {/* 選手一覧テーブル */}
      {loading ? (
        <p className="text-gray-500">読み込み中...</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">#</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">選手名</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Pos</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">体重</th>
                {exercises.map((ex) => (
                  <th key={ex.id} className="px-4 py-3 text-right font-medium text-gray-600">
                    {ex.name}
                  </th>
                ))}
                <th className="px-4 py-3 text-center font-medium text-gray-600">動画</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">BM達成</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5 + exercises.length + 2} className="px-4 py-8 text-center text-gray-400">
                    選手がいません
                  </td>
                </tr>
              ) : (
                filtered.map((player) => (
                  <tr
                    key={player.id}
                    className={`hover:bg-blue-50 ${!player.submitted ? 'bg-amber-50' : ''}`}
                  >
                    <td className="px-4 py-3 font-bold text-primary">{player.number || '-'}</td>
                    <td className="px-4 py-3 font-medium">{player.name}</td>
                    <td className="px-4 py-3">
                      {player.position && (
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                          {player.position}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">{player.weight ? `${player.weight}kg` : '-'}</td>
                    {exercises.map((ex) => (
                      <td key={ex.id} className="px-4 py-3 text-right font-mono">
                        {player.values[ex.id] !== undefined ? player.values[ex.id] : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center">
                      {!player.submitted ? (
                        <span className="text-gray-300">—</span>
                      ) : player.hasVideo ? (
                        <span className="text-green-600">✓</span>
                      ) : (
                        <span className="text-red-500">✗</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {!player.submitted ? (
                        <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs">未入力</span>
                      ) : player.total > 0 ? (
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          player.achieved === player.total
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {player.achieved}/{player.total}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
