-- Add status column to all user tables for approval system
ALTER TABLE "admin" ADD COLUMN "status" VARCHAR(20) DEFAULT 'pending';
ALTER TABLE "officer" ADD COLUMN "status" VARCHAR(20) DEFAULT 'pending';
ALTER TABLE "executive" ADD COLUMN "status" VARCHAR(20) DEFAULT 'pending';
ALTER TABLE "users" ADD COLUMN "status" VARCHAR(20) DEFAULT 'pending';

-- Update existing users to approved status (so they can continue using the system)
UPDATE "admin" SET "status" = 'approved' WHERE "status" IS NULL OR "status" = 'pending';
UPDATE "officer" SET "status" = 'approved' WHERE "status" IS NULL OR "status" = 'pending';
UPDATE "executive" SET "status" = 'approved' WHERE "status" IS NULL OR "status" = 'pending';
UPDATE "users" SET "status" = 'approved' WHERE "status" IS NULL OR "status" = 'pending';