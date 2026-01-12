-- AlterTable
ALTER TABLE "public"."admin" ADD COLUMN     "district_id" INTEGER,
ADD COLUMN     "province_id" INTEGER,
ADD COLUMN     "subdistrict_id" INTEGER;

-- AlterTable
ALTER TABLE "public"."executive" ADD COLUMN     "district_id" INTEGER,
ADD COLUMN     "province_id" INTEGER,
ADD COLUMN     "subdistrict_id" INTEGER;

-- AlterTable
ALTER TABLE "public"."officer" ADD COLUMN     "district_id" INTEGER,
ADD COLUMN     "province_id" INTEGER,
ADD COLUMN     "subdistrict_id" INTEGER;

-- AlterTable
ALTER TABLE "public"."reservation" ADD COLUMN     "rejected_reason" TEXT;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "district_id" INTEGER,
ADD COLUMN     "province_id" INTEGER,
ADD COLUMN     "subdistrict_id" INTEGER;

-- CreateTable
CREATE TABLE "public"."tb_Province" (
    "province_id" SERIAL NOT NULL,
    "province_name" VARCHAR(255) NOT NULL,

    CONSTRAINT "tb_Province_pkey" PRIMARY KEY ("province_id")
);

-- CreateTable
CREATE TABLE "public"."tb_District" (
    "district_id" SERIAL NOT NULL,
    "province_id" INTEGER NOT NULL,
    "district_name" VARCHAR(255) NOT NULL,

    CONSTRAINT "tb_District_pkey" PRIMARY KEY ("district_id")
);

-- CreateTable
CREATE TABLE "public"."tb_Subdistrict" (
    "subdistrict_id" SERIAL NOT NULL,
    "district_id" INTEGER NOT NULL,
    "subdistrict_name" VARCHAR(255) NOT NULL,
    "zip_code" VARCHAR(10),

    CONSTRAINT "tb_Subdistrict_pkey" PRIMARY KEY ("subdistrict_id")
);

-- AddForeignKey
ALTER TABLE "public"."admin" ADD CONSTRAINT "admin_province_id_fkey" FOREIGN KEY ("province_id") REFERENCES "public"."tb_Province"("province_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."admin" ADD CONSTRAINT "admin_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "public"."tb_District"("district_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."admin" ADD CONSTRAINT "admin_subdistrict_id_fkey" FOREIGN KEY ("subdistrict_id") REFERENCES "public"."tb_Subdistrict"("subdistrict_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."officer" ADD CONSTRAINT "officer_province_id_fkey" FOREIGN KEY ("province_id") REFERENCES "public"."tb_Province"("province_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."officer" ADD CONSTRAINT "officer_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "public"."tb_District"("district_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."officer" ADD CONSTRAINT "officer_subdistrict_id_fkey" FOREIGN KEY ("subdistrict_id") REFERENCES "public"."tb_Subdistrict"("subdistrict_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."executive" ADD CONSTRAINT "executive_province_id_fkey" FOREIGN KEY ("province_id") REFERENCES "public"."tb_Province"("province_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."executive" ADD CONSTRAINT "executive_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "public"."tb_District"("district_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."executive" ADD CONSTRAINT "executive_subdistrict_id_fkey" FOREIGN KEY ("subdistrict_id") REFERENCES "public"."tb_Subdistrict"("subdistrict_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_province_id_fkey" FOREIGN KEY ("province_id") REFERENCES "public"."tb_Province"("province_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "public"."tb_District"("district_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_subdistrict_id_fkey" FOREIGN KEY ("subdistrict_id") REFERENCES "public"."tb_Subdistrict"("subdistrict_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tb_District" ADD CONSTRAINT "tb_District_province_id_fkey" FOREIGN KEY ("province_id") REFERENCES "public"."tb_Province"("province_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tb_Subdistrict" ADD CONSTRAINT "tb_Subdistrict_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "public"."tb_District"("district_id") ON DELETE RESTRICT ON UPDATE CASCADE;
