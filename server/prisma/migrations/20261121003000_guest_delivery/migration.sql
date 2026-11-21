ALTER TABLE "Restaurant"
  ADD COLUMN "delivery_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "delivery_fee" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "delivery_card_enabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Order"
  ADD COLUMN "delivery_request_id" TEXT,
  ADD COLUMN "delivery_fee" INTEGER,
  ADD COLUMN "delivery_notification_status" TEXT;

CREATE UNIQUE INDEX "Order_delivery_request_id_key" ON "Order"("delivery_request_id");
