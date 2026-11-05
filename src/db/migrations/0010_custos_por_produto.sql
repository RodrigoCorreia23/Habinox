CREATE TABLE "product_cost_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_version_id" uuid NOT NULL,
	"material_id" uuid,
	"sector_id" uuid,
	"unit_cost" numeric(12, 4),
	"hourly_rate_cents" integer,
	"margin" numeric(5, 4),
	"reference_cost" numeric(12, 4),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_cost_overrides_material" UNIQUE("product_version_id","material_id"),
	CONSTRAINT "product_cost_overrides_sector" UNIQUE("product_version_id","sector_id"),
	CONSTRAINT "product_cost_overrides_target" CHECK (("product_cost_overrides"."material_id" is null) <> ("product_cost_overrides"."sector_id" is null)),
	CONSTRAINT "product_cost_overrides_values" CHECK (coalesce("product_cost_overrides"."unit_cost", 0) >= 0 and coalesce("product_cost_overrides"."hourly_rate_cents", 0) >= 0 and coalesce("product_cost_overrides"."margin", 0) >= 0)
);
--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "erp_family" text;--> statement-breakpoint
ALTER TABLE "product_cost_overrides" ADD CONSTRAINT "product_cost_overrides_product_version_id_product_versions_id_fk" FOREIGN KEY ("product_version_id") REFERENCES "public"."product_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_cost_overrides" ADD CONSTRAINT "product_cost_overrides_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_cost_overrides" ADD CONSTRAINT "product_cost_overrides_sector_id_sectors_id_fk" FOREIGN KEY ("sector_id") REFERENCES "public"."sectors"("id") ON DELETE no action ON UPDATE no action;