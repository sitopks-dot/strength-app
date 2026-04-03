-- =============================================
-- Migration 003: プロフィール画像対応
-- =============================================

-- 1. avatar_url カラムを追加
ALTER TABLE profiles ADD COLUMN avatar_url text;

-- 2. avatarsバケットを作成（公開：画像はURLで直接表示）
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- 3. Storage RLS: 誰でも閲覧可、コーチのみアップロード・削除
CREATE POLICY "avatars_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND is_coach());

CREATE POLICY "avatars_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND is_coach());
