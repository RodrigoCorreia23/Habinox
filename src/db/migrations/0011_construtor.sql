ALTER TABLE "option_definitions" DROP CONSTRAINT "option_definitions_key_unique";--> statement-breakpoint
ALTER TABLE "formula_lines" ADD COLUMN "margin" numeric(5, 4);--> statement-breakpoint
ALTER TABLE "formula_lines" ADD COLUMN "builder" jsonb;--> statement-breakpoint
ALTER TABLE "option_definitions" ADD COLUMN "product_id" uuid;--> statement-breakpoint
ALTER TABLE "option_definitions" ADD CONSTRAINT "option_definitions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "option_definitions_library_key" ON "option_definitions" USING btree ("key") WHERE "option_definitions"."product_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "option_definitions_product_key" ON "option_definitions" USING btree ("product_id","key") WHERE "option_definitions"."product_id" is not null;