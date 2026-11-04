-- Os componentes (motores, comandos…) passam a ser artigos do ERP, como os materiais.
-- Ordem corrigida à mão: o drizzle-kit apagava a tabela (CASCADE) antes das FKs que dependem dela.
ALTER TABLE "formula_lines" DROP CONSTRAINT "formula_lines_source";--> statement-breakpoint
ALTER TABLE "formula_lines" DROP CONSTRAINT "formula_lines_component_id_components_id_fk";
--> statement-breakpoint
ALTER TABLE "option_values" DROP CONSTRAINT "option_values_component_id_components_id_fk";
--> statement-breakpoint
ALTER TABLE "formula_lines" DROP COLUMN "component_id";--> statement-breakpoint
ALTER TABLE "option_values" DROP COLUMN "component_id";--> statement-breakpoint
DROP TABLE "components";--> statement-breakpoint
ALTER TABLE "formula_lines" ADD CONSTRAINT "formula_lines_source" CHECK (case "formula_lines"."kind"
        when 'labour' then "formula_lines"."sector_id" is not null and "formula_lines"."material_id" is null and "formula_lines"."article_option_id" is null
        else "formula_lines"."sector_id" is null and (("formula_lines"."material_id" is null) <> ("formula_lines"."article_option_id" is null))
      end);
