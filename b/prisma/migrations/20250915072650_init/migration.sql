/*
  Warnings:

  - The `profile_image` column on the `admin` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `profile_image` column on the `executive` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `image` column on the `meeting_room` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `profile_image` column on the `officer` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `profile_image` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "public"."admin" DROP COLUMN "profile_image",
ADD COLUMN     "profile_image" BYTEA;

-- AlterTable
ALTER TABLE "public"."executive" DROP COLUMN "profile_image",
ADD COLUMN     "profile_image" BYTEA;

-- AlterTable
ALTER TABLE "public"."meeting_room" DROP COLUMN "image",
ADD COLUMN     "image" BYTEA;

-- AlterTable
ALTER TABLE "public"."officer" DROP COLUMN "profile_image",
ADD COLUMN     "profile_image" BYTEA;

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "profile_image",
ADD COLUMN     "profile_image" BYTEA;
