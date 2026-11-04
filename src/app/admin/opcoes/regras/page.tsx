import type { Metadata } from "next";
import Link from "next/link";
import { describeRule } from "@/components/admin/describe-rule";
import { RuleForm } from "@/components/admin/rule-form";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/server/auth/session";
import { listLibraryOptionInfo } from "@/server/catalog/options";
import { listRules } from "@/server/catalog/rules";
import { removeRuleAction } from "../../rule-actions";

export const metadata: Metadata = { title: "Regras da biblioteca · Habinox" };

export default async function LibraryRulesPage() {
  await requireAdmin("/admin/opcoes/regras");
  const [options, rules] = await Promise.all([listLibraryOptionInfo(), listRules(null)]);
  const values = rules.map((rule) => ({
    conditions: rule.conditions,
    effect: rule.effect,
    message: rule.message?.pt ?? "",
  }));

  return (
    <main className="grid gap-8 px-4 py-6 md:px-6">
      <header>
        <p className="text-steel text-sm">
          <Link href="/admin/opcoes" className="underline-offset-4 hover:underline">
            Opções
          </Link>
        </p>
        <h1 className="text-xl font-semibold tracking-tight">Regras da biblioteca</h1>
        <p className="text-steel mt-1 max-w-3xl text-sm">
          Valem em todos os produtos que usem as opções envolvidas (ex.: “se Material é Inox, o
          Acabamento só pode ser Escovado ou Polido”). Num produto que não use alguma das opções, a
          regra não se aplica. Mudar aqui afeta logo os produtos publicados.
        </p>
      </header>

      {rules.length === 0 ? (
        <p className="text-steel border-line bg-surface border px-4 py-6 text-sm">
          Ainda não há regras da biblioteca.
        </p>
      ) : (
        <ol className="border-line bg-surface divide-line-soft divide-y border">
          {rules.map((rule, index) => (
            <li key={rule.id}>
              <details className="group">
                <summary className="hover:bg-canvas flex cursor-pointer list-none flex-wrap items-center gap-x-4 px-4 py-3 text-sm">
                  <span>{describeRule(values[index]!, options)}</span>
                  <span className="text-brand ml-auto text-xs group-open:hidden">Editar</span>
                </summary>
                <div className="grid gap-3 px-4 pt-1 pb-4">
                  <RuleForm
                    scope={null}
                    ruleId={rule.id}
                    initial={values[index]!}
                    options={options}
                  />
                  <form
                    action={removeRuleAction.bind(null, null, rule.id)}
                    className="flex justify-end"
                  >
                    <Button type="submit" size="sm" variant="ghost">
                      Apagar regra
                    </Button>
                  </form>
                </div>
              </details>
            </li>
          ))}
        </ol>
      )}

      {options.length > 0 && (
        <section aria-labelledby="nova" className="grid gap-3">
          <h2 id="nova" className="font-semibold">
            Nova regra
          </h2>
          <div className="border-line bg-surface border px-4 py-4">
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
          </div>
        </section>
      )}
    </main>
  );
}
