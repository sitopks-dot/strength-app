-- =============================================
-- Migration 002: 学年を削除、生年月日を追加
-- =============================================

-- 1. grade カラムを削除
ALTER TABLE profiles DROP COLUMN IF EXISTS grade;

-- 2. birth_date カラムを追加
ALTER TABLE profiles ADD COLUMN birth_date date;
