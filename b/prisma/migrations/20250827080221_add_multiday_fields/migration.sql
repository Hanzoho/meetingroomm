-- CreateTable
CREATE TABLE "public"."admin" (
    "admin_id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "first_name" VARCHAR(255) NOT NULL,
    "last_name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "citizen_id" CHAR(13),
    "position" VARCHAR(255),
    "department" VARCHAR(255),
    "zip_code" INTEGER,
    "profile_image" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_pkey" PRIMARY KEY ("admin_id")
);

-- CreateTable
CREATE TABLE "public"."equipment" (
    "equipment_id" SERIAL NOT NULL,
    "room_id" INTEGER NOT NULL,
    "equipment_n" VARCHAR(255) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("equipment_id")
);

-- CreateTable
CREATE TABLE "public"."meeting_room" (
    "room_id" SERIAL NOT NULL,
    "room_name" VARCHAR(255) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "location_m" VARCHAR(255) NOT NULL,
    "department" VARCHAR(255) NOT NULL,
    "status_m" VARCHAR(255),
    "image" VARCHAR(255),
    "details_m" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meeting_room_pkey" PRIMARY KEY ("room_id")
);

-- CreateTable
CREATE TABLE "public"."officer" (
    "officer_id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "first_name" VARCHAR(255) NOT NULL,
    "last_name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "citizen_id" CHAR(13),
    "position" VARCHAR(255),
    "department" VARCHAR(255),
    "zip_code" INTEGER,
    "profile_image" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "officer_pkey" PRIMARY KEY ("officer_id")
);

-- CreateTable
CREATE TABLE "public"."reservation" (
    "reservation_id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "room_id" INTEGER,
    "start_at" DATE NOT NULL,
    "end_at" DATE NOT NULL,
    "start_time" TIMESTAMP(6),
    "end_time" TIMESTAMP(6),
    "status_r" VARCHAR(255) DEFAULT 'pending',
    "officer_id" INTEGER,
    "details_r" VARCHAR(255),
    "booking_dates" TEXT,
    "is_multi_day" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservation_pkey" PRIMARY KEY ("reservation_id")
);

-- CreateTable
CREATE TABLE "public"."review" (
    "review_id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "room_id" INTEGER,
    "comment" TEXT,
    "rating" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_pkey" PRIMARY KEY ("review_id")
);

-- CreateTable
CREATE TABLE "public"."roles" (
    "role_id" SERIAL NOT NULL,
    "role_name" VARCHAR(50) NOT NULL,
    "role_status" VARCHAR(50) DEFAULT 'active',

    CONSTRAINT "roles_pkey" PRIMARY KEY ("role_id")
);

-- CreateTable
CREATE TABLE "public"."executive" (
    "executive_id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "first_name" VARCHAR(255) NOT NULL,
    "last_name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "citizen_id" CHAR(13),
    "position" VARCHAR(255) NOT NULL,
    "department" VARCHAR(255) NOT NULL,
    "zip_code" INTEGER,
    "profile_image" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "executive_pkey" PRIMARY KEY ("executive_id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "user_id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "first_name" VARCHAR(255) NOT NULL,
    "last_name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "citizen_id" CHAR(13),
    "position" VARCHAR(255),
    "department" VARCHAR(255),
    "zip_code" INTEGER,
    "profile_image" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_email_key" ON "public"."admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admin_citizen_id_key" ON "public"."admin"("citizen_id");

-- CreateIndex
CREATE UNIQUE INDEX "officer_email_key" ON "public"."officer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "officer_citizen_id_key" ON "public"."officer"("citizen_id");

-- CreateIndex
CREATE UNIQUE INDEX "executive_email_key" ON "public"."executive"("email");

-- CreateIndex
CREATE UNIQUE INDEX "executive_citizen_id_key" ON "public"."executive"("citizen_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_citizen_id_key" ON "public"."users"("citizen_id");

-- AddForeignKey
ALTER TABLE "public"."admin" ADD CONSTRAINT "admin_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("role_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."equipment" ADD CONSTRAINT "equipment_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."meeting_room"("room_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."officer" ADD CONSTRAINT "officer_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("role_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."reservation" ADD CONSTRAINT "reservation_officer_id_fkey" FOREIGN KEY ("officer_id") REFERENCES "public"."officer"("officer_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."reservation" ADD CONSTRAINT "reservation_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."meeting_room"("room_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."reservation" ADD CONSTRAINT "reservation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."review" ADD CONSTRAINT "review_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."meeting_room"("room_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."review" ADD CONSTRAINT "review_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."executive" ADD CONSTRAINT "executive_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("role_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "user_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("role_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
