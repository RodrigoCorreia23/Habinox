CREATE TABLE "material_costs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"material_id" uuid NOT NULL,
	"cost" numeric(12, 4) NOT NULL,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"erp_code" text NOT NULL,
	"name" text NOT NULL,
	"unit" text NOT NULL,
	"cost" numeric(12, 4) NOT NULL,
	"weight_per_unit" numeric(12, 4),
	"margin" numeric(5, 4),
	"cost_updated_at" timestamp with time zone NOT NULL,
	"erp_missing_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "materials_erpCode_unique" UNIQUE("erp_code"),
	CONSTRAINT "materials_cost_not_negative" CHECK ("materials"."cost" >= 0),
	CONSTRAINT "materials_margin_not_negative" CHECK ("materials"."margin" >= 0)
);
--> statement-breakpoint
CREATE TABLE "sync_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"status" text DEFAULT 'running' NOT NULL,
	"items" integer DEFAULT 0 NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "sync_runs_status" CHECK ("sync_runs"."status" in ('running', 'succeeded', 'partial', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"slug" text NOT NULL,
	"name" jsonb NOT NULL,
	"description" jsonb,
	"image_url" text,
	"position" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" jsonb NOT NULL,
	"cost_cents" integer NOT NULL,
	"margin" numeric(5, 4),
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "components_cost_not_negative" CHECK ("components"."cost_cents" >= 0),
	CONSTRAINT "components_margin_not_negative" CHECK ("components"."margin" >= 0)
);
--> statement-breakpoint
CREATE TABLE "formula_line_materials" (
	"formula_line_id" uuid NOT NULL,
	"option_value_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	CONSTRAINT "formula_line_materials_formula_line_id_option_value_id_pk" PRIMARY KEY("formula_line_id","option_value_id")
);
--> statement-breakpoint
CREATE TABLE "formula_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_version_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"label" text NOT NULL,
	"kind" text NOT NULL,
	"quantity_expr" text NOT NULL,
	"unit" text NOT NULL,
	"conditions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"material_id" uuid,
	"article_option_id" uuid,
	"sector_id" uuid,
	"component_id" uuid,
	CONSTRAINT "formula_lines_kind" CHECK ("formula_lines"."kind" in ('material', 'labour', 'external', 'component')),
	CONSTRAINT "formula_lines_source" CHECK (case "formula_lines"."kind"
        when 'labour' then "formula_lines"."sector_id" is not null and "formula_lines"."material_id" is null and "formula_lines"."article_option_id" is null and "formula_lines"."component_id" is null
        when 'component' then "formula_lines"."component_id" is not null and "formula_lines"."material_id" is null and "formula_lines"."article_option_id" is null and "formula_lines"."sector_id" is null
        else "formula_lines"."sector_id" is null and "formula_lines"."component_id" is null and (("formula_lines"."material_id" is null) <> ("formula_lines"."article_option_id" is null))
      end)
);
--> statement-breakpoint
CREATE TABLE "formula_variables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_version_id" uuid NOT NULL,
	"name" text NOT NULL,
	"expr" text NOT NULL,
	"position" integer NOT NULL,
	"label" jsonb,
	"show_to_customer" boolean DEFAULT false NOT NULL,
	CONSTRAINT "formula_variables_version_name" UNIQUE("product_version_id","name")
);
--> statement-breakpoint
CREATE TABLE "option_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" jsonb NOT NULL,
	"type" text NOT NULL,
	"unit" text,
	"display" text,
	"help_text" jsonb,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "option_definitions_key_unique" UNIQUE("key"),
	CONSTRAINT "option_definitions_type" CHECK ("option_definitions"."type" in ('dimension', 'number', 'choice', 'boolean')),
	CONSTRAINT "option_definitions_display" CHECK ("option_definitions"."display" in ('pills', 'list', 'swatches')),
	CONSTRAINT "option_definitions_key" CHECK ("option_definitions"."key" ~ '^[a-z][a-z0-9_]*$')
);
--> statement-breakpoint
CREATE TABLE "option_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_version_id" uuid,
	"position" integer DEFAULT 0 NOT NULL,
	"conditions" jsonb NOT NULL,
	"effect" jsonb NOT NULL,
	"message" jsonb
);
--> statement-breakpoint
CREATE TABLE "option_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"option_id" uuid NOT NULL,
	"key" text NOT NULL,
	"label" jsonb NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ral_code" text,
	"swatch_hex" text,
	"component_id" uuid,
	"asks_text" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "option_values_option_key" UNIQUE("option_id","key"),
	CONSTRAINT "option_values_key" CHECK ("option_values"."key" ~ '^[a-z][a-z0-9_]*$')
);
--> statement-breakpoint
CREATE TABLE "product_option_values" (
	"product_option_id" uuid NOT NULL,
	"option_value_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	CONSTRAINT "product_option_values_product_option_id_option_value_id_pk" PRIMARY KEY("product_option_id","option_value_id")
);
--> statement-breakpoint
CREATE TABLE "product_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_version_id" uuid NOT NULL,
	"option_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"var" text,
	"required" boolean DEFAULT true NOT NULL,
	"min" integer,
	"max" integer,
	"step" integer,
	"default_value" jsonb,
	CONSTRAINT "product_options_version_option" UNIQUE("product_version_id","option_id"),
	CONSTRAINT "product_options_version_var" UNIQUE("product_version_id","var"),
	CONSTRAINT "product_options_range" CHECK ("product_options"."min" is null or "product_options"."max" is null or "product_options"."min" <= "product_options"."max"),
	CONSTRAINT "product_options_step" CHECK ("product_options"."step" is null or "product_options"."step" > 0)
);
--> statement-breakpoint
CREATE TABLE "product_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"consumables_rate" numeric(5, 4) DEFAULT '0' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"validated_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	CONSTRAINT "product_versions_product_version" UNIQUE("product_id","version"),
	CONSTRAINT "product_versions_status" CHECK ("product_versions"."status" in ('draft', 'validated', 'published')),
	CONSTRAINT "product_versions_consumables" CHECK ("product_versions"."consumables_rate" >= 0)
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" jsonb NOT NULL,
	"description" jsonb,
	"model_glb_url" text,
	"published_version_id" uuid,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sectors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"hourly_rate_cents" integer NOT NULL,
	"margin" numeric(5, 4),
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sectors_rate_not_negative" CHECK ("sectors"."hourly_rate_cents" >= 0),
	CONSTRAINT "sectors_margin_not_negative" CHECK ("sectors"."margin" >= 0)
);
--> statement-breakpoint
ALTER TABLE "material_costs" ADD CONSTRAINT "material_costs_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formula_line_materials" ADD CONSTRAINT "formula_line_materials_formula_line_id_formula_lines_id_fk" FOREIGN KEY ("formula_line_id") REFERENCES "public"."formula_lines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formula_line_materials" ADD CONSTRAINT "formula_line_materials_option_value_id_option_values_id_fk" FOREIGN KEY ("option_value_id") REFERENCES "public"."option_values"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formula_line_materials" ADD CONSTRAINT "formula_line_materials_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formula_lines" ADD CONSTRAINT "formula_lines_product_version_id_product_versions_id_fk" FOREIGN KEY ("product_version_id") REFERENCES "public"."product_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formula_lines" ADD CONSTRAINT "formula_lines_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formula_lines" ADD CONSTRAINT "formula_lines_article_option_id_option_definitions_id_fk" FOREIGN KEY ("article_option_id") REFERENCES "public"."option_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formula_lines" ADD CONSTRAINT "formula_lines_sector_id_sectors_id_fk" FOREIGN KEY ("sector_id") REFERENCES "public"."sectors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formula_lines" ADD CONSTRAINT "formula_lines_component_id_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."components"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formula_variables" ADD CONSTRAINT "formula_variables_product_version_id_product_versions_id_fk" FOREIGN KEY ("product_version_id") REFERENCES "public"."product_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "option_rules" ADD CONSTRAINT "option_rules_product_version_id_product_versions_id_fk" FOREIGN KEY ("product_version_id") REFERENCES "public"."product_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "option_values" ADD CONSTRAINT "option_values_option_id_option_definitions_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."option_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "option_values" ADD CONSTRAINT "option_values_component_id_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."components"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_option_values" ADD CONSTRAINT "product_option_values_product_option_id_product_options_id_fk" FOREIGN KEY ("product_option_id") REFERENCES "public"."product_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_option_values" ADD CONSTRAINT "product_option_values_option_value_id_option_values_id_fk" FOREIGN KEY ("option_value_id") REFERENCES "public"."option_values"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_options" ADD CONSTRAINT "product_options_product_version_id_product_versions_id_fk" FOREIGN KEY ("product_version_id") REFERENCES "public"."product_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_options" ADD CONSTRAINT "product_options_option_id_option_definitions_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."option_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_versions" ADD CONSTRAINT "product_versions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_versions" ADD CONSTRAINT "product_versions_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_published_version_id_product_versions_id_fk" FOREIGN KEY ("published_version_id") REFERENCES "public"."product_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "material_costs_material_idx" ON "material_costs" USING btree ("material_id","observed_at");--> statement-breakpoint
CREATE INDEX "sync_runs_source_idx" ON "sync_runs" USING btree ("source","started_at");--> statement-breakpoint
CREATE INDEX "categories_parent_idx" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "formula_lines_version_idx" ON "formula_lines" USING btree ("product_version_id");--> statement-breakpoint
CREATE INDEX "option_rules_version_idx" ON "option_rules" USING btree ("product_version_id");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category_id");