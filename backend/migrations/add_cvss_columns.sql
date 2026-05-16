-- Migration: Add CVSS 4.0 columns to cards table
-- Run this once against your PostgreSQL database if it already exists.
-- Safe to run multiple times (uses IF NOT EXISTS pattern).

ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS cvss_vector VARCHAR(255),
  ADD COLUMN IF NOT EXISTS cvss_score FLOAT;

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'cards'
  AND column_name IN ('cvss_vector', 'cvss_score');
