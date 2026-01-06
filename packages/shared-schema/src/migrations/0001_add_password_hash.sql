-- Migration: Add password_hash column to users table
-- This migration adds a nullable password_hash column for email/password authentication.

ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
