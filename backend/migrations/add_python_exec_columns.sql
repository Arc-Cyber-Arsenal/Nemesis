-- Migration: Add python_exec support columns
-- Run this once against your PostgreSQL database if it already exists.
-- Safe to run multiple times (uses IF NOT EXISTS pattern).

-- command_history: track command type and store raw Python source code
ALTER TABLE command_history
  ADD COLUMN IF NOT EXISTS command_type VARCHAR(20) DEFAULT 'shell',
  ADD COLUMN IF NOT EXISTS source_code TEXT;

-- pending_commands: track command type so approve endpoint routes correctly
ALTER TABLE pending_commands
  ADD COLUMN IF NOT EXISTS command_type VARCHAR(20) DEFAULT 'shell';

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'command_history'
  AND column_name IN ('command_type', 'source_code');
