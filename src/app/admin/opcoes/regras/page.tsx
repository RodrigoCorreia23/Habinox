import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { describeRule } from "@/components/admin/describe-rule";
import { EmptyState } from "@/components/admin/empty-state";
import { PageBody } from "@/components/admin/page-body";
import { PageHeader } from "@/components/admin/page-header";
import { RuleForm } from "@/components/admin/rule-form";
import { Section } from "@/components/admin/section";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/server/auth/session";
import { listLibraryOptionInfo } from "@/server/catalog/options";
import { listLibraryRuleProducts, listRules } from "@/server/catalog/rules";
import { removeRuleAction } from "../../rule-actions";

export const metadata: Metadata = { title: "Regras da biblioteca · Habinox" };

/** «Portão de correr, Portão batente e mais 2». */
function names(products: { name: string }[], max = 4) {
  const shown = products.slice(0, max).map((product) => product.name);
  const rest = products.length - shown.length;
  return rest > 0 ? `${shown.join(", ")} e mais ${rest}` : shown.join(", ");
}

export default async function LibraryRulesPage() {
  await requireAdmin("/admin/opcoes/regras");
  const [options, rules] = await Promise.all([listLibraryOptionInfo(), listRules(null)]);
  const affected = await listLibraryRuleProducts(rules);
  const items = rules.map((rule) => {
    const values = {
      conditions: rule.conditions,
      effect: rule.effect,
      message: rule.message?.pt ?? "",
    };
    return {
      id: rule.id,
      values,
      sentence: describeRule(values, options),
      products: affected.get(rule.id) ?? [],
    };
  });

  return (
    <PageBody>
      <PageHeader
        crumbs={[{ href: "/admin/opcoes", label: "Opções" }]}
        title="Regras da biblioteca"
        description="Valem em todos os produtos que usam as opções envolvidas, também nos que já estão na loja."
        help={
          <>
            <p>
              Uma regra diz o que acontece quando o cliente escolhe certas opções. Por exemplo: «Se
              Material for Inox, então Acabamento só pode ser Escovado ou Polido».
            </p>
            <p>
              Num produto que não use alguma das opções da regra, ela não se aplica. As regras de um
              só produto fazem-se na ficha desse produto.
            </p>
          </>
        }
      />

      <div className="grid gap-12">
        <Section id="regras" title="Regras" count={items.length}>
          {items.length === 0 ? (
            <EmptyState
              title="Ainda não há regras da biblioteca"
              action={
                options.length > 0 ? (
                  <Button asChild>
                    <a href="#nova">Criar a primeira regra</a>
                  </Button>
                ) : (
                  <Button asChild>
                    <Link href="/admin/opcoes/nova">Criar uma opção</Link>
                  </Button>
                )
              }
            >
              Sem regras, o cliente pode combinar todas as opções. Use uma regra para impedir o que
              a oficina não fabrica, por exemplo: «Se Material for Inox, então Cor só pode ser
              Natural ou Preto».
              {options.length === 0 && " Primeiro precisa de opções."}
            </EmptyState>
          ) : (
            <ol className="bg-surface border-line divide-line-soft divide-y rounded-[2px] border">
              {items.map((item) => (
                <li key={item.id}>
                  <details className="group/regra">
                    <summary className="hover:bg-surface-alt/60 focus-visible:ring-amber-ink flex min-h-12 cursor-pointer list-none items-start gap-3 px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
                      <ChevronRight
                        aria-hidden
                        className="text-steel mt-0.5 size-4 shrink-0 transition-transform duration-150 group-open/regra:rotate-90"
                        strokeWidth={1.75}
                      />
                      <span className="grid min-w-0 gap-0.5">
                        <span className="text-ink">{item.sentence}</span>
                        {item.products.length > 0 ? (
                          <span className="text-steel text-[13px]">
                            Aplica-se a: {names(item.products)}
                          </span>
                        ) : (
                          <span className="text-steel-light text-[13px]">
                            Nenhum produto usa estas opções
                          </span>
                        )}
                      </span>
                    </summary>
                    <div className="border-line-soft grid gap-6 border-t px-4 py-5 md:pl-11">
                      <RuleForm
                        scope={null}
                        ruleId={item.id}
                        initial={item.values}
                        options={options}
                        affectedProducts={item.products.map((product) => product.name)}
                      />
                      <form
                        action={removeRuleAction.bind(null, null, item.id)}
                        className="border-line-soft border-t pt-4"
                      >
                        <ConfirmButton
                          label="Apagar regra"
                          question={`Apagar a regra «${item.sentence}»?`}
                          consequence={
                            item.products.length > 0
                              ? `Deixa de valer já em ${item.products.length} ${item.products.length === 1 ? "produto" : "produtos"} (${names(item.products, 3)}), também na loja. Não se pode desfazer.`
                              : "Nenhum produto a usa agora. Não se pode desfazer."
                          }
                          confirmLabel="Apagar"
                        />
                      </form>
                    </div>
                  </details>
                </li>
              ))}
            </ol>
          )}
        </Section>

        {options.length > 0 && (
          <Section
            id="nova"
            title="Nova regra"
            description="Diga primeiro quando se aplica e depois o que faz. A frase final aparece antes de guardar."
            panel
          >
            <RuleForm
              scope={null}
              ruleId={null}
              initial={{
                conditions: [],
                effect: { type: "restrict", option: "", values: [] },
                message: "",
              }}
              options={options}
            />
          </Section>
        )}
      </div>
    </PageBody>
  );
}
