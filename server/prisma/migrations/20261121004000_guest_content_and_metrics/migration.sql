BEGIN;

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "address_en" TEXT,
ADD COLUMN     "address_ru" TEXT,
ADD COLUMN     "gallery_images" TEXT,
ADD COLUMN     "opening_hours_en" TEXT,
ADD COLUMN     "opening_hours_ru" TEXT,
ADD COLUMN     "tagline_en" TEXT,
ADD COLUMN     "tagline_ru" TEXT;

-- CreateTable
CREATE TABLE "MenuMetric" (
    "restaurant_id" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "item_key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MenuMetric_pkey" PRIMARY KEY ("restaurant_id","day","item_key")
);

-- AddForeignKey
ALTER TABLE "MenuMetric" ADD CONSTRAINT "MenuMetric_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;


COMMIT;
