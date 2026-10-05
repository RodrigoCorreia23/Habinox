import { expect, test } from "@playwright/test";

test("a raiz redireciona para /pt e mostra a loja", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/pt$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Abinox");
});
