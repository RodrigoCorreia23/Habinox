CREATE TABLE "translation_states" (
	"field" text NOT NULL,
	"row_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"source_hash" text NOT NULL,
	"origin" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "translation_states_field_row_id_locale_pk" PRIMARY KEY("field","row_id","locale"),
	CONSTRAINT "translation_states_origin" CHECK ("translation_states"."origin" in ('auto', 'manual'))
);
