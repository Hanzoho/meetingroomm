-- AlterTable
ALTER TABLE "public"."admin" ADD COLUMN     "reset_token" VARCHAR(255),
ADD COLUMN     "reset_token_expiry" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "public"."executive" ADD COLUMN     "reset_token" VARCHAR(255),
ADD COLUMN     "reset_token_expiry" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "public"."officer" ADD COLUMN     "reset_token" VARCHAR(255),
ADD COLUMN     "reset_token_expiry" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "reset_token" VARCHAR(255),
ADD COLUMN     "reset_token_expiry" TIMESTAMPTZ(6);
