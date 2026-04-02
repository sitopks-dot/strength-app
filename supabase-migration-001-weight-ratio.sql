-- =============================================
-- Migration 001: ベンチマーク値を体重比に変更
-- weight_class カラムを削除し、valueを体重比（倍率）として扱う
-- =============================================

-- 1. benchmark_values の UNIQUE 制約を変更
ALTER TABLE benchmark_values DROP CONSTRAINT IF EXISTS benchmark_values_benchmark_level_id_exercise_id_position_w_key;

-- 2. weight_class カラムを削除
ALTER TABLE benchmark_values DROP COLUMN IF EXISTS weight_class;

-- 3. 新しい UNIQUE 制約を追加（ポジション × 種目 × レベル）
ALTER TABLE benchmark_values ADD CONSTRAINT benchmark_values_level_exercise_position_key
  UNIQUE (benchmark_level_id, exercise_id, position);

-- 4. 不要になったインデックスを削除
DROP INDEX IF EXISTS idx_benchmark_values_position_weight;

-- 5. 新しいインデックス
CREATE INDEX idx_benchmark_values_position ON benchmark_values(position);

-- 6. RLS ポリシーは変更なし（カラム参照していないため）
