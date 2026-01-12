-- CreateTable
CREATE TABLE "public"."email_log" (
    "id" SERIAL NOT NULL,
    "recipient" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(500) NOT NULL,
    "email_type" VARCHAR(50) NOT NULL,
    "sent_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(20) NOT NULL DEFAULT 'sent',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_email_log_sent_date" ON "public"."email_log"("sent_date");

-- CreateIndex
CREATE INDEX "idx_email_log_type" ON "public"."email_log"("email_type");
