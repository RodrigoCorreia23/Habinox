import { describe, expect, it } from "vitest";
import { FakeErpClient, SAMPLE_ARTICLES } from "@/server/sync/odoo/fake";
import { planSync, type LocalMaterial } from "@/server/sync/odoo/plan";

const local = (code: string, cost: string, extra: Partial<LocalMaterial> = {}): LocalMaterial => {
  const sample = SAMPLE_ARTICLES.find((article) => article.code === code)!;
  return {
    id: `id-${code}`,
    erpCode: code,
    name: sample.name,
    unit: sample.unit,
    cost,
    weightPerUnit: sample.weightPerUnit,
    erpMissingAt: null,
    ...extra,
  };
};

/** Cópia local igual ao ERP de exemplo (custos com 4 casas, como vêm do numeric). */
const inSync = () => SAMPLE_ARTICLES.map((article) => local(article.code, article.cost));

describe("planSync", () => {
  it("primeira sincronização cria todos os artigos", async () => {
    const plan = planSync([], await new FakeErpClient().listArticles());
    expect(plan.inserts.map((article) => article.code)).toEqual(
      SAMPLE_ARTICLES.map((article) => article.code),
    );
    expect(plan.updates).toEqual([]);
    expect(plan.missing).toEqual([]);
    expect(plan.errors).toEqual([]);
  });

  it("correr outra vez sem mudanças não muda nada (idempotente)", async () => {
    const plan = planSync(inSync(), await new FakeErpClient().listArticles());
    expect(plan).toEqual({ inserts: [], updates: [], missing: [], errors: [] });
  });

  it("compara custos como decimais, não como texto", () => {
    const plan = planSync([local("TF4040", "3.2")], [{ ...SAMPLE_ARTICLES[0], cost: "3.2000" }]);
    expect(plan.updates).toEqual([]);
  });

  it("custo diferente: atualiza e marca para o histórico", () => {
    const erp = new FakeErpClient(
      SAMPLE_ARTICLES.map((article) =>
        article.code === "TI4040" ? { ...article, cost: "13.1000" } : article,
      ),
    );
    return erp.listArticles().then((remote) => {
      const plan = planSync(inSync(), remote);
      expect(plan.updates).toEqual([
        {
          id: "id-TI4040",
          article: expect.objectContaining({ code: "TI4040", cost: "13.1000" }),
          costChanged: true,
          returned: false,
        },
      ]);
    });
  });

  it("mudança só no nome não conta como mudança de custo", () => {
    const remote = SAMPLE_ARTICLES.map((article) =>
      article.code === "LAC" ? { ...article, name: "Lacagem RAL" } : article,
    );
    const plan = planSync(inSync(), remote);
    expect(plan.updates.map((update) => [update.id, update.costChanged])).toEqual([
      ["id-LAC", false],
    ]);
  });

  it("artigo que desaparece fica marcado, nunca apagado", () => {
    const remote = SAMPLE_ARTICLES.filter((article) => article.code !== "TFB20");
    const plan = planSync(inSync(), remote);
    expect(plan.missing).toEqual(["id-TFB20"]);
    expect(plan.updates).toEqual([]);

    // Já marcado: não volta a marcar.
    const marked = inSync().map((material) =>
      material.erpCode === "TFB20" ? { ...material, erpMissingAt: new Date() } : material,
    );
    expect(planSync(marked, remote).missing).toEqual([]);
  });

  it("artigo que volta a aparecer deixa de estar marcado", () => {
    const marked = inSync().map((material) =>
      material.erpCode === "TFB20" ? { ...material, erpMissingAt: new Date() } : material,
    );
    const plan = planSync(marked, SAMPLE_ARTICLES);
    expect(plan.updates).toEqual([
      expect.objectContaining({ id: "id-TFB20", costChanged: false, returned: true }),
    ]);
  });

  it("ignora artigos inválidos e regista o erro", () => {
    const plan = planSync(
      [],
      [
        SAMPLE_ARTICLES[0],
        { code: "X1", name: "Sem custo", unit: "m", cost: "", weightPerUnit: null },
        { code: "X2", name: "Custo negativo", unit: "m", cost: "-1", weightPerUnit: null },
        { code: "X3", name: "Custo com 5 casas", unit: "m", cost: "1.00001", weightPerUnit: null },
        null,
      ],
    );
    expect(plan.inserts.map((article) => article.code)).toEqual(["TF4040"]);
    expect(plan.errors.map((error) => error.code)).toEqual(["X1", "X2", "X3", undefined]);
  });

  it("referência repetida no ERP: não mexe nesse artigo", () => {
    const repeated = { ...SAMPLE_ARTICLES[0]!, cost: "99.0000" };
    const plan = planSync(inSync(), [...SAMPLE_ARTICLES, repeated]);
    expect(plan.updates).toEqual([]);
    expect(plan.missing).toEqual([]);
    expect(plan.errors).toEqual([{ code: "TF4040", message: "Referência repetida no ERP" }]);
  });

  it("resposta vazia do ERP não marca tudo como desaparecido", () => {
    const plan = planSync(inSync(), []);
    expect(plan.missing).toEqual([]);
    expect(plan.errors).toHaveLength(1);
  });

  it("o fake pode simular falha do ERP", async () => {
    const erp = new FakeErpClient();
    erp.failWith(new Error("timeout"));
    await expect(erp.listArticles()).rejects.toThrow("timeout");
  });
});
