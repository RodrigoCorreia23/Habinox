import { expect, test } from "@playwright/test";

const adminEmail = process.env.SEED_ADMIN_EMAIL;
const adminPassword = process.env.SEED_ADMIN_PASSWORD;

test("sem sessão, /pt/conta redireciona para o login", async ({ page }) => {
  await page.goto("/pt/conta");
  await expect(page).toHaveURL(/\/pt\/entrar\?next=%2Fpt%2Fconta$/);
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
});

test("credenciais erradas mostram erro", async ({ page }) => {
  await page.goto("/pt/entrar");
  await page.getByLabel("Email").fill("ninguem@exemplo.pt");
  await page.getByLabel("Password").fill("password-errada-123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Email ou password incorretos.")).toBeVisible();
});

test("o admin entra e chega ao backoffice", async ({ page }) => {
  test.skip(!adminEmail || !adminPassword, "SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD não definidos");

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/pt\/entrar\?next=%2Fadmin$/);

  await page.getByLabel("Email").fill(adminEmail!);
  await page.getByLabel("Password").fill(adminPassword!);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Painel" })).toBeVisible();
});
