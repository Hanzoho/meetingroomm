/*
  Warnings:

  - You are about to drop the column `district_id` on the `admin` table. All the data in the column will be lost.
  - You are about to drop the column `province_id` on the `admin` table. All the data in the column will be lost.
  - You are about to drop the column `subdistrict_id` on the `admin` table. All the data in the column will be lost.
  - You are about to drop the column `district_id` on the `executive` table. All the data in the column will be lost.
  - You are about to drop the column `province_id` on the `executive` table. All the data in the column will be lost.
  - You are about to drop the column `subdistrict_id` on the `executive` table. All the data in the column will be lost.
  - You are about to drop the column `district_id` on the `officer` table. All the data in the column will be lost.
  - You are about to drop the column `province_id` on the `officer` table. All the data in the column will be lost.
  - You are about to drop the column `subdistrict_id` on the `officer` table. All the data in the column will be lost.
  - You are about to drop the column `rejected_reason` on the `reservation` table. All the data in the column will be lost.
  - You are about to drop the column `district_id` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `province_id` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `subdistrict_id` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `tb_District` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tb_Province` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tb_Subdistrict` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."admin" DROP CONSTRAINT "admin_district_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."admin" DROP CONSTRAINT "admin_province_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."admin" DROP CONSTRAINT "admin_subdistrict_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."executive" DROP CONSTRAINT "executive_district_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."executive" DROP CONSTRAINT "executive_province_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."executive" DROP CONSTRAINT "executive_subdistrict_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."officer" DROP CONSTRAINT "officer_district_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."officer" DROP CONSTRAINT "officer_province_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."officer" DROP CONSTRAINT "officer_subdistrict_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."tb_District" DROP CONSTRAINT "tb_District_province_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."tb_Subdistrict" DROP CONSTRAINT "tb_Subdistrict_district_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."users" DROP CONSTRAINT "users_district_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."users" DROP CONSTRAINT "users_province_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."users" DROP CONSTRAINT "users_subdistrict_id_fkey";

-- AlterTable
ALTER TABLE "public"."admin" DROP COLUMN "district_id",
DROP COLUMN "province_id",
DROP COLUMN "subdistrict_id";

-- AlterTable
ALTER TABLE "public"."executive" DROP COLUMN "district_id",
DROP COLUMN "province_id",
DROP COLUMN "subdistrict_id";

-- AlterTable
ALTER TABLE "public"."officer" DROP COLUMN "district_id",
DROP COLUMN "province_id",
DROP COLUMN "subdistrict_id";

-- AlterTable
ALTER TABLE "public"."reservation" DROP COLUMN "rejected_reason";

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "district_id",
DROP COLUMN "province_id",
DROP COLUMN "subdistrict_id";

-- DropTable
DROP TABLE "public"."tb_District";

-- DropTable
DROP TABLE "public"."tb_Province";

-- DropTable
DROP TABLE "public"."tb_Subdistrict";
