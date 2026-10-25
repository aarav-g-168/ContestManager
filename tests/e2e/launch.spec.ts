import { test, expect } from "@playwright/test";
test("public help works at both viewport sizes and has no overflow", async ({
  page,
}) => {
  await page.goto("/support");
  await expect(
    page.getByRole("heading", { name: "Help & feedback." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "guptaaarav987@gmail.com" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "Privacy policy" }).click();
  await expect(
    page.getByRole("heading", { name: "Privacy policy." }),
  ).toBeVisible();
});
test("private settings require sign in and APIs deny anonymous access", async ({
  page,
  request,
}) => {
  await page.goto("/settings");
  await expect(
    page.getByRole("heading", { name: "Manage your account." }),
  ).toBeVisible();
  for (const path of [
    "/api/account/settings",
    "/api/account/export",
    "/api/admin/feedback",
  ]) {
    expect((await request.get(path)).status()).toBe(401);
  }
});
test("light is the first-visit default and keyboard navigation has a skip link", async ({
  page,
}) => {
  await page.goto("/terms");
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
});

test("appearance can switch to dark on mobile and desktop", async ({
  page,
}) => {
  await page.goto("/support");
  const toggle = page.getByRole("button", { name: "Switch to dark theme" });
  if (!(await toggle.isVisible()))
    await page.getByRole("button", { name: "Open navigation" }).click();
  await toggle.click();
  await expect(page.locator("html")).toHaveClass(/dark/);
});
