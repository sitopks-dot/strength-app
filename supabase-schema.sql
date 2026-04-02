-- =============================================
-- ストレングス管理システム スキーマ定義
-- =============================================

-- 1. teams
CREATE TABLE teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- デフォルトチームを作成（v1用）
INSERT INTO teams (id, name) VALUES ('00000000-0000-0000-0000-000000000001', 'デフォルトチーム');

-- 2. profiles
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id),
  role text NOT NULL CHECK (role IN ('athlete', 'coach')),
  name text NOT NULL,
  number integer,
  position text,
  weight numeric,
  grade text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. exercises
CREATE TABLE exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id),
  name text NOT NULL,
  unit text NOT NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- デフォルト測定項目
INSERT INTO exercises (team_id, name, unit, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000001', 'ベンチプレス', 'kg', 1),
  ('00000000-0000-0000-0000-000000000001', 'スクワット', 'kg', 2),
  ('00000000-0000-0000-0000-000000000001', '懸垂', '回', 3);

-- 4. measurements
CREATE TABLE measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id),
  measured_at date NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (profile_id, measured_at)
);

-- 5. measurement_values
CREATE TABLE measurement_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  measurement_id uuid NOT NULL REFERENCES measurements(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES exercises(id),
  value numeric NOT NULL,
  UNIQUE (measurement_id, exercise_id)
);

-- 6. measurement_videos
CREATE TABLE measurement_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  measurement_id uuid NOT NULL REFERENCES measurements(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  created_at timestamptz DEFAULT now()
);

-- 7. benchmark_levels
CREATE TABLE benchmark_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id),
  name text NOT NULL,
  sort_order integer DEFAULT 0,
  color text DEFAULT 'blue',
  created_at timestamptz DEFAULT now()
);

-- デフォルトベンチマークレベル
INSERT INTO benchmark_levels (team_id, name, sort_order, color) VALUES
  ('00000000-0000-0000-0000-000000000001', 'チーム目標', 1, 'blue'),
  ('00000000-0000-0000-0000-000000000001', 'Xリーグ上位', 2, 'amber'),
  ('00000000-0000-0000-0000-000000000001', '米国カレッジ', 3, 'red');

-- 8. benchmark_values
CREATE TABLE benchmark_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  benchmark_level_id uuid NOT NULL REFERENCES benchmark_levels(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES exercises(id),
  position text NOT NULL,
  weight_class text NOT NULL,
  value numeric NOT NULL,
  UNIQUE (benchmark_level_id, exercise_id, position, weight_class)
);

-- =============================================
-- インデックス
-- =============================================
CREATE INDEX idx_profiles_team_id ON profiles(team_id);
CREATE INDEX idx_measurements_profile_id ON measurements(profile_id);
CREATE INDEX idx_measurements_measured_at ON measurements(measured_at);
CREATE INDEX idx_measurement_values_measurement_id ON measurement_values(measurement_id);
CREATE INDEX idx_benchmark_values_position_weight ON benchmark_values(position, weight_class);

-- =============================================
-- RLS（Row Level Security）
-- =============================================

-- ヘルパー関数: 現在のユーザーのプロフィールを取得
CREATE OR REPLACE FUNCTION get_my_profile()
RETURNS profiles AS $$
  SELECT * FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ヘルパー関数: 現在のユーザーがコーチか判定
CREATE OR REPLACE FUNCTION is_coach()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ヘルパー関数: 現在のユーザーのチームID
CREATE OR REPLACE FUNCTION my_team_id()
RETURNS uuid AS $$
  SELECT team_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (
    team_id = my_team_id()
    AND (is_coach() OR id = auth.uid())
  );

CREATE POLICY "profiles_insert" ON profiles FOR INSERT
  WITH CHECK (is_coach() AND team_id = my_team_id());

CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  USING (is_coach() AND team_id = my_team_id());

CREATE POLICY "profiles_delete" ON profiles FOR DELETE
  USING (is_coach() AND team_id = my_team_id());

-- 自分自身のプロフィールは常に読める
CREATE POLICY "profiles_select_self" ON profiles FOR SELECT
  USING (id = auth.uid());

-- exercises
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exercises_select" ON exercises FOR SELECT
  USING (team_id = my_team_id());

CREATE POLICY "exercises_modify" ON exercises FOR ALL
  USING (is_coach() AND team_id = my_team_id());

-- measurements
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "measurements_select" ON measurements FOR SELECT
  USING (
    team_id = my_team_id()
    AND (is_coach() OR profile_id = auth.uid())
  );

CREATE POLICY "measurements_insert" ON measurements FOR INSERT
  WITH CHECK (
    profile_id = auth.uid()
    AND team_id = my_team_id()
  );

CREATE POLICY "measurements_update" ON measurements FOR UPDATE
  USING (is_coach() AND team_id = my_team_id());

CREATE POLICY "measurements_delete" ON measurements FOR DELETE
  USING (is_coach() AND team_id = my_team_id());

-- measurement_values
ALTER TABLE measurement_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "measurement_values_select" ON measurement_values FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM measurements m
      WHERE m.id = measurement_id
      AND m.team_id = my_team_id()
      AND (is_coach() OR m.profile_id = auth.uid())
    )
  );

CREATE POLICY "measurement_values_insert" ON measurement_values FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM measurements m
      WHERE m.id = measurement_id
      AND m.profile_id = auth.uid()
    )
  );

CREATE POLICY "measurement_values_modify" ON measurement_values FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM measurements m
      WHERE m.id = measurement_id
      AND m.team_id = my_team_id()
      AND is_coach()
    )
  );

CREATE POLICY "measurement_values_delete" ON measurement_values FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM measurements m
      WHERE m.id = measurement_id
      AND m.team_id = my_team_id()
      AND is_coach()
    )
  );

-- measurement_videos
ALTER TABLE measurement_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "measurement_videos_select" ON measurement_videos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM measurements m
      WHERE m.id = measurement_id
      AND m.team_id = my_team_id()
      AND is_coach()
    )
  );

CREATE POLICY "measurement_videos_insert" ON measurement_videos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM measurements m
      WHERE m.id = measurement_id
      AND m.profile_id = auth.uid()
    )
  );

CREATE POLICY "measurement_videos_delete" ON measurement_videos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM measurements m
      WHERE m.id = measurement_id
      AND m.team_id = my_team_id()
      AND is_coach()
    )
  );

-- benchmark_levels
ALTER TABLE benchmark_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "benchmark_levels_select" ON benchmark_levels FOR SELECT
  USING (team_id = my_team_id());

CREATE POLICY "benchmark_levels_modify" ON benchmark_levels FOR ALL
  USING (is_coach() AND team_id = my_team_id());

-- benchmark_values
ALTER TABLE benchmark_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "benchmark_values_select" ON benchmark_values FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM benchmark_levels bl
      WHERE bl.id = benchmark_level_id
      AND bl.team_id = my_team_id()
    )
  );

CREATE POLICY "benchmark_values_modify" ON benchmark_values FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM benchmark_levels bl
      WHERE bl.id = benchmark_level_id
      AND bl.team_id = my_team_id()
      AND is_coach()
    )
  );

-- =============================================
-- Storage バケット
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', false);

-- Storage RLS
CREATE POLICY "videos_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'videos' AND auth.uid() IS NOT NULL);

CREATE POLICY "videos_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'videos' AND is_coach());

CREATE POLICY "videos_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'videos' AND is_coach());
