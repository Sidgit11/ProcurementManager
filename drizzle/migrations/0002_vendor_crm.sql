-- DESTRUCTIVE: this migration drops and recreates vendor_contact with a richer shape.
-- For fresh DBs this is a no-op (the old shape was unused). For DBs with data in vendor_contact,
-- export the old (kind, value) rows first and import them as (kind=email|phone|whatsapp → corresponding column on the new shape) before applying.
DROP TABLE IF EXISTS "vendor_contact";--> statement-breakpoint
CREATE TABLE "vendor_contact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_id" uuid NOT NULL,
	"name" text NOT NULL,
	"role" text,
	"email" text,
	"phone" text,
	"whatsapp" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"preferred_channel" text,
	"language" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vendor" ADD COLUMN "preferences" jsonb DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "vendor_contact" ADD CONSTRAINT "vendor_contact_vendor_id_vendor_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vendor_contact_vendor_idx" ON "vendor_contact" USING btree ("vendor_id");
