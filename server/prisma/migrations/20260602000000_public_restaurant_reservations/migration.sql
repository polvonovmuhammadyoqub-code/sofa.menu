BEGIN;

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "google_maps_url" TEXT,
ADD COLUMN     "instagram_url" TEXT,
ADD COLUMN     "menu_hero_video" TEXT,
ADD COLUMN     "menu_ordering_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reservation_hours" TEXT,
ADD COLUMN     "reservation_timezone" TEXT NOT NULL DEFAULT 'Asia/Tashkent',
ADD COLUMN     "telegram_url" TEXT,
ADD COLUMN     "yandex_maps_url" TEXT;

-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "ingredients" TEXT,
ADD COLUMN     "ingredients_en" TEXT,
ADD COLUMN     "ingredients_ru" TEXT;

-- CreateTable
CREATE TABLE "RestaurantArea" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_ru" TEXT,
    "name_en" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RestaurantArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "reservation_number" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "telegram_username" TEXT,
    "guest_count" INTEGER NOT NULL,
    "reservation_date" TEXT NOT NULL,
    "reservation_time" TEXT NOT NULL,
    "area_id" TEXT,
    "area_name" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notification_status" TEXT NOT NULL DEFAULT 'PENDING',
    "notification_attempts" INTEGER NOT NULL DEFAULT 0,
    "notification_next_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantArea_restaurant_id_name_key" ON "RestaurantArea"("restaurant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_reservation_number_key" ON "Reservation"("reservation_number");

-- CreateIndex
CREATE INDEX "Reservation_restaurant_id_reservation_date_status_idx" ON "Reservation"("restaurant_id", "reservation_date", "status");

-- CreateIndex
CREATE INDEX "Reservation_notification_status_notification_next_at_idx" ON "Reservation"("notification_status", "notification_next_at");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_restaurant_id_request_id_key" ON "Reservation"("restaurant_id", "request_id");

-- AddForeignKey
ALTER TABLE "RestaurantArea" ADD CONSTRAINT "RestaurantArea_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "RestaurantArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
