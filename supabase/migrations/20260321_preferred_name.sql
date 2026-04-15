-- Add preferred_name column to profiles
-- This is what Coach Strong (the AI) uses to address the participant.
-- Separate from full_name so participants can have a nickname/preferred name.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferred_name text;
