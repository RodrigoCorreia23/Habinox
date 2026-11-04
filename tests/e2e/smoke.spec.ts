import { expect, test } from "@playwright/test";

test("a raiz redireciona para /pt e mostra a apresentação", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/pt$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Especialistas em aço inoxidável.",
  );
});

test("com menos movimento, a página inicial é um documento normal que leva à loja", async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/pt");
  await expect(page.locator("html")).not.toHaveAttribute("data-home", "scrolly");
  await page.getByRole("link", { name: /Entrar na loja/ }).click();
  await expect(page).toHaveURL(/\/pt\/loja$/);
  await context.close();
});
