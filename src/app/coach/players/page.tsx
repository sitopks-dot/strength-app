'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'

type Player = {
  id: string
  name: string
  number: number | null
  position: string | null
  weight: number | null
  birth_date: string | null
  avatar_url: string | null
}

type PlayerForm = {
  name: string
  email: string
  password: string
  number: string
  position: string
  weight: string
  birth_date: string
}

const emptyForm: PlayerForm = {
  name: '', email: '', password: '', number: '', position: '', weight: '', birth_date: '',
}

const positions = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB', 'K/P']

function calcAge(birthDate: string): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<PlayerForm>(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [avatarUploadId, setAvatarUploadId] = useState<string | null>(null)
  const supabase = createClient()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchPlayers = useCallback(async () => {
    const res = await fetch('/api/players')
    if (res.ok) {
      setPlayers(await res.json())
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchPlayers() }, [fetchPlayers])

  function handleEdit(player: Player) {
    setEditId(player.id)
    setForm({
      name: player.name,
      email: '',
      password: '',
      number: player.number?.toString() || '',
      position: player.position || '',
      weight: player.weight?.toString() || '',
      birth_date: player.birth_date || '',
    })
    setShowForm(true)
    setError('')
  }

  function handleCancel() {
    setShowForm(false)
    setEditId(null)
    setForm(emptyForm)
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const payload = {
      name: form.name,
      email: form.email || undefined,
      password: form.password || undefined,
      number: form.number ? parseInt(form.number) : null,
      position: form.position || null,
      weight: form.weight ? parseFloat(form.weight) : null,
      birth_date: form.birth_date || null,
    }

    let res: Response
    if (editId) {
      res = await fetch(`/api/players/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } else {
      if (!form.email || !form.password) {
        setError('新規登録にはメールアドレスとパスワードが必要です')
        setSubmitting(false)
        return
      }
      res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'エラーが発生しました')
      setSubmitting(false)
      return
    }

    handleCancel()
    setSubmitting(false)
    fetchPlayers()
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`${name} を削除しますか？この操作は取り消せません。`)) return

    const res = await fetch(`/api/players/${id}`, { method: 'DELETE' })
    if (res.ok) {
      fetchPlayers()
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || !e.target.files[0] || !avatarUploadId) return
    const file = e.target.files[0]
    if (file.size > 2 * 1024 * 1024) {
      alert('画像サイズは2MB以下にしてください')
      return
    }

    const ext = file.name.split('.').pop()
    const path = `${avatarUploadId}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      alert(`アップロードに失敗しました: ${uploadError.message}`)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)

    await fetch(`/api/players/${avatarUploadId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar_url: `${publicUrl}?t=${Date.now()}` }),
    })

    setAvatarUploadId(null)
    e.target.value = ''
    fetchPlayers()
  }

  if (loading) {
    return <p className="text-gray-500">読み込み中...</p>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold">選手管理</h1>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm) }}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary-light transition"
          >
            + 選手を追加
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-blue-50 rounded-xl p-4 border border-blue-200 mb-4">
          <h3 className="font-bold text-sm mb-3">
            {editId ? '選手情報の編集' : '新規選手の登録'}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <input
              placeholder="名前 *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="border rounded-lg px-3 py-2 text-sm"
            />
            {!editId && (
              <>
                <input
                  placeholder="メールアドレス *"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  className="border rounded-lg px-3 py-2 text-sm"
                />
                <input
                  placeholder="初期パスワード *"
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  className="border rounded-lg px-3 py-2 text-sm"
                />
              </>
            )}
            <input
              placeholder="背番号"
              type="number"
              value={form.number}
              onChange={(e) => setForm({ ...form, number: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <select
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">ポジション選択</option>
              {positions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <input
              placeholder="体重 (kg)"
              type="number"
              step="0.1"
              value={form.weight}
              onChange={(e) => setForm({ ...form, weight: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <div>
              <input
                type="date"
                value={form.birth_date}
                onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                className="border rounded-lg px-3 py-2 text-sm w-full"
                title="生年月日"
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

          <div className="flex gap-2 mt-3">
            <button
              type="submit"
              disabled={submitting}
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary-light transition disabled:opacity-50"
            >
              {submitting ? '処理中...' : editId ? '更新' : '登録'}
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

      <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">#</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">名前</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Pos</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">体重</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">年齢</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {players.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  選手が登録されていません
                </td>
              </tr>
            ) : (
              players.map((player) => (
                <tr key={player.id} className="hover:bg-blue-50">
                  <td className="px-4 py-3 font-bold text-primary">{player.number || '-'}</td>
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setAvatarUploadId(player.id); avatarInputRef.current?.click() }}
                        className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 hover:bg-gray-300 transition overflow-hidden shrink-0"
                        title="写真を変更"
                      >
                        {player.avatar_url ? (
                          <img src={player.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          player.name.charAt(0)
                        )}
                      </button>
                      {player.name}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {player.position && (
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                        {player.position}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">{player.weight ? `${player.weight}kg` : '-'}</td>
                  <td className="px-4 py-3">{player.birth_date ? `${calcAge(player.birth_date)}歳` : '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleEdit(player)}
                      className="text-blue-600 text-xs mr-2 hover:underline"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(player.id, player.name)}
                      className="text-red-500 text-xs hover:underline"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* アバターアップロード用hidden input */}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        onChange={handleAvatarUpload}
        className="hidden"
      />

      <p className="text-xs text-gray-400 mt-3">登録選手数: {players.length} / 63</p>
    </div>
  )
}
