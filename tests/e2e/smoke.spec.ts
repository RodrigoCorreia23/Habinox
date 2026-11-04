import { expect, test } from "@playwright/test";

test("a raiz redireciona para /pt e abre na loja", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/pt$/);
  await expect(page.getByRole("heading", { level: 1, name: /Metal feito à medida/ })).toBeVisible();
});

test("com menos movimento, a apresentação é um documento normal que leva à loja", async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/pt#inicio");
  await expect(page.locator("html")).not.toHaveAttribute("data-home", "scrolly");
  await expect(page.locator("html")).toHaveAttribute("data-route", "inicio");
  await expect(
    page.getByRole("heading", { name: "Especialistas em aço inoxidável." }),
  ).toBeVisible();
  await page.getByRole("link", { name: /Entrar na loja/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-route", "loja");
  await expect(page.getByRole("heading", { level: 1, name: /Metal feito à medida/ })).toBeVisible();
  await context.close();
});

test("/pt/loja leva às categorias da página inicial", async ({ page }) => {
  await page.goto("/pt/loja");
  await expect(page).toHaveURL(/\/pt#familias$/);
});
