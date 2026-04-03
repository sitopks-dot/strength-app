'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'

type Exercise = {
  id: string
  name: string
  unit: string
}

const MAX_VIDEO_SIZE_MB = 50
const MAX_VIDEO_SIZE = MAX_VIDEO_SIZE_MB * 1024 * 1024

export default function InputPage() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [values, setValues] = useState<Record<string, string>>({})
  const [measuredAt, setMeasuredAt] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [videos, setVideos] = useState<File[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [updated, setUpdated] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const fetchExercises = useCallback(async () => {
    const res = await fetch('/api/exercises')
    if (res.ok) {
      const data = await res.json()
      setExercises(data.filter((e: Exercise & { is_active: boolean }) => e.is_active))
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchExercises() }, [fetchExercises])

  function handleValueChange(exerciseId: string, val: string) {
    setValues((prev) => ({ ...prev, [exerciseId]: val }))
  }

  function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setVideos(Array.from(e.target.files))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    // 測定値をまとめる
    const measurementValues = exercises
      .filter((ex) => values[ex.id] && values[ex.id] !== '')
      .map((ex) => ({
        exercise_id: ex.id,
        value: parseFloat(values[ex.id]),
      }))

    if (measurementValues.length === 0) {
      setError('少なくとも1つの測定値を入力してください')
      setSubmitting(false)
      return
    }

    // 動画サイズチェック
    for (const video of videos) {
      if (video.size > MAX_VIDEO_SIZE) {
        setError(`「${video.name}」のサイズが${MAX_VIDEO_SIZE_MB}MBを超えています（${(video.size / 1024 / 1024).toFixed(1)}MB）。動画を圧縮してから再度アップロードしてください。`)
        setSubmitting(false)
        return
      }
    }

    // 動画アップロード
    const videoPaths: { storage_path: string; file_name: string; file_size: number }[] = []

    for (const video of videos) {
      const path = `${measuredAt}/${Date.now()}_${video.name}`
      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(path, video)

      if (uploadError) {
        setError(`動画アップロードに失敗しました: ${uploadError.message}`)
        setSubmitting(false)
        return
      }

      videoPaths.push({
        storage_path: path,
        file_name: video.name,
        file_size: video.size,
      })
    }

    // 測定データ送信
    const res = await fetch('/api/measurements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        measured_at: `${measuredAt}-01`,
        values: measurementValues,
        video_paths: videoPaths,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'エラーが発生しました')
      setSubmitting(false)
      return
    }

    const resData = await res.json()
    setUpdated(!!resData.updated)
    setSuccess(true)
    setSubmitting(false)
    setValues({})
    setVideos([])
  }

  if (loading) return <p className="text-gray-500">読み込み中...</p>

  if (success) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-field mb-2">{updated ? '更新完了！' : '送信完了！'}</h2>
        <p className="text-gray-500 mb-6">{updated ? '測定結果を上書き更新しました' : '測定結果が登録されました'}</p>
        <button
          onClick={() => setSuccess(false)}
          className="bg-primary text-white px-6 py-2 rounded-lg font-bold hover:bg-primary-light transition"
        >
          続けて入力
        </button>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-800 mb-1">月次測定の入力</h2>
      <p className="text-sm text-gray-500 mb-6">測定結果を入力してください</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 測定月 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">測定月</label>
          <input
            type="month"
            value={measuredAt}
            onChange={(e) => setMeasuredAt(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-4 py-3"
          />
        </div>

        {/* 各種目の入力 */}
        {exercises.map((ex) => (
          <div key={ex.id} className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <label className="font-medium text-gray-800">{ex.name}</label>
              <span className="text-xs text-gray-400">{ex.unit}</span>
            </div>
            <input
              type="number"
              step="any"
              placeholder={`例: ${ex.unit === 'kg' ? '100' : ex.unit === '回' ? '15' : '5.0'}`}
              value={values[ex.id] || ''}
              onChange={(e) => handleValueChange(ex.id, e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-2xl font-bold text-center"
            />
          </div>
        ))}

        {/* 動画アップロード */}
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <label className="font-medium text-gray-800 block mb-2">トレーニング動画</label>
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition cursor-pointer"
          >
            {videos.length > 0 ? (
              <div>
                <div className="text-3xl mb-2">🎬</div>
                <p className="text-sm text-gray-700 font-medium">{videos.length}件の動画を選択中</p>
                <ul className="text-xs text-gray-500 mt-1">
                  {videos.map((v, i) => (
                    <li key={i}>{v.name} ({(v.size / 1024 / 1024).toFixed(1)}MB)</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div>
                <div className="text-4xl mb-2">📹</div>
                <p className="text-sm text-gray-500">タップして動画を選択<br />または撮影</p>
                <p className="text-xs text-gray-400 mt-2">MP4 / MOV（複数可）</p>
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            multiple
            onChange={handleVideoChange}
            className="hidden"
          />
        </div>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-field text-white py-4 rounded-xl font-bold text-lg hover:bg-green-800 transition shadow-lg disabled:opacity-50"
        >
          {submitting ? '送信中...' : '測定結果を送信'}
        </button>
      </form>
    </div>
  )
}
