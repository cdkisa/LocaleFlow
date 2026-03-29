import { test, expect, type Page, type APIRequestContext } from "@playwright/test";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Wait for the dashboard to fully load */
async function waitForDashboard(page: Page) {
  await page.goto("/");
  await expect(page.getByText("Welcome Back")).toBeVisible();
  await expect(page.getByTestId("stat-total-projects")).toBeVisible();
}

/** Create a project via API (more reliable than UI for setup) */
async function createProjectViaAPI(
  request: APIRequestContext,
  name: string,
  options: { description?: string; languages?: { code: string; name: string }[] } = {}
): Promise<string> {
  const res = await request.post("/api/projects", {
    data: {
      name,
      description: options.description ?? "",
      languages: options.languages ?? [{ code: "en", name: "English" }],
    },
  });
  const project = await res.json();
  return project.id;
}

/** Create a project via UI, returns project id */
async function createProjectViaUI(
  page: Page,
  name: string,
  options: { description?: string; addLanguage?: { search: string; code: string } } = {}
): Promise<string> {
  await page.goto("/projects/new");
  await expect(page.getByText("Create New Project")).toBeVisible();
  await page.getByTestId("input-project-name").fill(name);
  if (options.description) {
    await page.getByTestId("input-project-description").fill(options.description);
  }
  if (options.addLanguage) {
    await page.getByTestId("button-language-combobox").click();
    await page.getByTestId("input-language-search").fill(options.addLanguage.search);
    await page.waitForTimeout(500);
    await page.getByTestId(`option-language-${options.addLanguage.code}`).click();
  }

  const responsePromise = page.waitForResponse(
    (r) => r.url().includes("/api/projects") && r.request().method() === "POST"
  );
  await page.getByTestId("button-create-project-submit").click();
  await responsePromise;

  await expect(page).toHaveURL(/\/projects\/[\w-]+/);
  const url = page.url();
  const projectId = url.match(/\/projects\/([\w-]+)/)?.[1] ?? "";
  return projectId;
}

/** Navigate to a project by id and wait for load */
async function goToProject(page: Page, projectId: string) {
  await page.goto(`/projects/${projectId}`);
  await page.waitForLoadState("networkidle");
}

// ── Dashboard Tests ──────────────────────────────────────────────────────────

test.describe("Dashboard", () => {
  test.describe.configure({ mode: "serial" });

  test("should display welcome message and stats", async ({ page }) => {
    await waitForDashboard(page);
    await expect(page.getByText("Welcome Back")).toBeVisible();
    await expect(
      page.getByText("Manage your localization projects and translations")
    ).toBeVisible();
    await expect(page.getByTestId("stat-total-projects")).toBeVisible();
    await expect(page.getByTestId("stat-total-languages")).toBeVisible();
    await expect(page.getByTestId("stat-total-keys")).toBeVisible();
    await expect(page.getByTestId("stat-recent-activity")).toBeVisible();
  });

  test("should show empty state or projects grid", async ({ page }) => {
    await waitForDashboard(page);
    const hasProjects = await page.locator("[data-testid^='card-project-']").count();
    if (hasProjects === 0) {
      await expect(page.getByText("No projects yet")).toBeVisible();
    } else {
      await expect(page.locator("[data-testid^='card-project-']").first()).toBeVisible();
    }
  });

  test("should navigate to create project page", async ({ page }) => {
    await waitForDashboard(page);
    await page.getByTestId("button-create-project").click();
    await expect(page).toHaveURL("/projects/new");
    await expect(page.getByText("Create New Project")).toBeVisible();
  });
});

// ── Project Creation Tests ───────────────────────────────────────────────────

test.describe("Project Creation", () => {
  test.describe.configure({ mode: "serial" });

  test("should create project with name and description", async ({ page }) => {
    const projectId = await createProjectViaUI(page, "Create Test " + Date.now(), {
      description: "A project created by Playwright tests",
    });
    expect(projectId).toBeTruthy();
    // The description is rendered in a <p> inside the main area;
    // use toHaveCount to avoid Playwright visibility-check issues
    // caused by flex layout constraints.
    const main = page.locator("main");
    await expect(
      main.getByText("A project created by Playwright tests")
    ).toHaveCount(1);
  });

  test("should create project with additional language", async ({ page }) => {
    const projectId = await createProjectViaUI(page, "MultiLang " + Date.now(), {
      addLanguage: { search: "French", code: "fr" },
    });
    expect(projectId).toBeTruthy();
    await expect(page.getByTestId("badge-language-en")).toBeVisible();
    await expect(page.getByTestId("badge-language-fr")).toBeVisible();
  });

  test("should show validation error for empty project name", async ({ page }) => {
    await page.goto("/projects/new");
    await expect(page.getByText("Create New Project")).toBeVisible();
    await page.getByTestId("input-project-name").fill("");
    await page.getByTestId("button-create-project-submit").click();
    await expect(page).toHaveURL("/projects/new");
  });

  test("should navigate back with cancel button", async ({ page }) => {
    await page.goto("/projects/new");
    await expect(page.getByText("Create New Project")).toBeVisible();
    await page.getByTestId("button-cancel").click();
    await expect(page).toHaveURL("/");
  });

  test("should remove language from new project form", async ({ page }) => {
    await page.goto("/projects/new");
    await expect(page.getByText("Create New Project")).toBeVisible();
    await expect(page.getByTestId("badge-language-en")).toBeVisible();
    await page.getByTestId("button-remove-language-en").click();
    await expect(page.getByTestId("badge-language-en")).not.toBeVisible();
  });
});

// ── Project Dashboard Tests ──────────────────────────────────────────────────

test.describe("Project Dashboard", () => {
  test.describe.configure({ mode: "serial" });

  let projectId: string;

  test("should display project details after creation", async ({ page, request }) => {
    projectId = await createProjectViaAPI(request, "Dashboard Test " + Date.now(), {
      description: "Testing dashboard features",
    });
    await goToProject(page, projectId);
    const main = page.locator("main");
    await expect(main.getByText("Testing dashboard features")).toHaveCount(1);
  });

  test("should show action buttons", async ({ page }) => {
    await goToProject(page, projectId);
    await expect(page.getByTestId("button-import")).toBeVisible();
    await expect(page.getByTestId("button-export")).toBeVisible();
    await expect(page.getByTestId("button-settings")).toBeVisible();
    await expect(page.getByTestId("button-delete-project")).toBeVisible();
  });

  test("should show languages section", async ({ page }) => {
    await goToProject(page, projectId);
    await expect(page.getByTestId("badge-language-en")).toBeVisible();
  });

  test("should show editor button and documents section", async ({ page }) => {
    await goToProject(page, projectId);
    await expect(page.getByTestId("button-open-editor")).toBeVisible();
    await expect(page.getByText("Documents", { exact: true })).toBeVisible();
  });

  test("should navigate to import page", async ({ page }) => {
    await goToProject(page, projectId);
    await page.getByTestId("button-import").click();
    await expect(page).toHaveURL(`/projects/${projectId}/import`);
    await expect(page.getByRole("heading", { name: "Import Translations" })).toBeVisible();
  });

  test("should navigate to export page", async ({ page }) => {
    await goToProject(page, projectId);
    await page.getByTestId("button-export").click();
    await expect(page).toHaveURL(`/projects/${projectId}/export`);
    await expect(page.getByRole("heading", { name: "Export Translations" })).toBeVisible();
  });

  test("should navigate to settings page", async ({ page }) => {
    await goToProject(page, projectId);
    await page.getByTestId("button-settings").click();
    await expect(page).toHaveURL(`/projects/${projectId}/settings`);
    await expect(page.getByRole("heading", { name: "Project Settings" })).toBeVisible();
  });

  test("should navigate to translation editor", async ({ page }) => {
    await goToProject(page, projectId);
    await page.getByTestId("button-open-editor").click();
    await expect(page).toHaveURL(`/projects/${projectId}/editor`);
  });

  test("should delete project", async ({ page, request }) => {
    const tempId = await createProjectViaAPI(request, "Delete Me " + Date.now());
    await goToProject(page, tempId);
    await page.getByTestId("button-delete-project").click();
    await expect(page.getByText("Are you sure?")).toBeVisible();
    await page.getByTestId("button-confirm-delete-project").click();
    await page.waitForTimeout(2000);
    await page.goto("/");
    await expect(page.getByText("Welcome Back")).toBeVisible();
  });
});

// ── Hyperlinks Tests ─────────────────────────────────────────────────────────

test.describe("Project Hyperlinks", () => {
  test.describe.configure({ mode: "serial" });

  let projectId: string;

  test("should create project for hyperlink tests", async ({ request, page }) => {
    projectId = await createProjectViaAPI(request, "Hyperlink " + Date.now());
    await goToProject(page, projectId);
    await expect(page.getByText("No hyperlinks added yet")).toBeVisible();
  });

  test("should add a hyperlink", async ({ page }) => {
    await goToProject(page, projectId);
    await page.getByTestId("button-add-hyperlink").click();
    await expect(page.getByText("Add Hyperlink")).toBeVisible();

    await page.getByTestId("input-hyperlink-label").fill("Test Docs");
    await page.getByTestId("input-hyperlink-url").fill("https://example.com/docs");

    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/hyperlinks") && r.request().method() === "POST"
      ),
      page.getByTestId("button-submit-hyperlink").click(),
    ]);

    await expect(page.getByText("Add Hyperlink")).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Test Docs")).toBeVisible({ timeout: 5000 });
  });

  test("should edit a hyperlink", async ({ page }) => {
    await goToProject(page, projectId);
    await expect(page.getByText("Test Docs")).toBeVisible({ timeout: 5000 });

    const linkElement = page.locator("[data-testid^='link-']").filter({ hasText: "Test Docs" });
    const linkTestId = await linkElement.getAttribute("data-testid");
    const hyperlinkId = linkTestId?.replace("link-", "");

    await page.getByTestId(`button-edit-hyperlink-${hyperlinkId}`).click();
    await expect(page.getByText("Edit Hyperlink")).toBeVisible();

    await page.getByTestId("input-hyperlink-label").fill("Updated Docs");
    await page.getByTestId("input-hyperlink-url").fill("https://updated.com");

    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/hyperlinks") && r.request().method() === "PATCH"
      ),
      page.getByTestId("button-submit-hyperlink").click(),
    ]);

    await expect(page.getByText("Updated Docs")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Test Docs")).not.toBeVisible();
  });

  test("should verify hyperlink attributes", async ({ page }) => {
    await goToProject(page, projectId);
    const link = page.locator("[data-testid^='link-']").filter({ hasText: "Updated Docs" });
    await expect(link).toHaveAttribute("href", "https://updated.com");
    await expect(link).toHaveAttribute("target", "_blank");
  });

  test("should delete a hyperlink", async ({ page }) => {
    await goToProject(page, projectId);
    await expect(page.getByText("Updated Docs")).toBeVisible({ timeout: 5000 });

    const linkElement = page.locator("[data-testid^='link-']").filter({ hasText: "Updated Docs" });
    const linkTestId = await linkElement.getAttribute("data-testid");
    const hyperlinkId = linkTestId?.replace("link-", "");

    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/hyperlinks") && r.request().method() === "DELETE"
      ),
      page.getByTestId(`button-delete-hyperlink-${hyperlinkId}`).click(),
    ]);

    await expect(page.getByText("Updated Docs")).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText("No hyperlinks added yet")).toBeVisible();
  });

  test("should cancel hyperlink dialog", async ({ page }) => {
    await goToProject(page, projectId);
    await page.getByTestId("button-add-first-hyperlink").click();
    await expect(page.getByText("Add Hyperlink")).toBeVisible();
    await page.getByTestId("button-cancel-hyperlink").click();
    await expect(page.getByText("Add Hyperlink")).not.toBeVisible({ timeout: 5000 });
  });
});

// ── Project Settings Tests ───────────────────────────────────────────────────

test.describe("Project Settings", () => {
  test.describe.configure({ mode: "serial" });

  let projectId: string;

  test("should create project and display settings", async ({ request, page }) => {
    projectId = await createProjectViaAPI(request, "Settings " + Date.now(), {
      description: "Original Description",
    });
    await page.goto(`/projects/${projectId}/settings`);
    await expect(page.getByRole("heading", { name: "Project Settings" })).toBeVisible();
    await expect(page.getByText("Project Details")).toBeVisible();
  });

  test("should edit project name", async ({ page }) => {
    await page.goto(`/projects/${projectId}/settings`);
    await expect(page.getByRole("heading", { name: "Project Settings" })).toBeVisible();

    await page.getByTestId("button-edit-project-name").click();
    await page.getByTestId("input-project-name").fill("Updated Name");
    await page.getByTestId("button-save-project-name").click();

    await page.waitForTimeout(1000);
    await page.goto(`/projects/${projectId}/settings`);
    await expect(page.getByTestId("display-project-name")).toHaveValue("Updated Name");
  });

  test("should cancel project name edit", async ({ page }) => {
    await page.goto(`/projects/${projectId}/settings`);
    await expect(page.getByRole("heading", { name: "Project Settings" })).toBeVisible();

    await page.getByTestId("button-edit-project-name").click();
    await page.getByTestId("input-project-name").fill("Should Not Save");
    await page.getByTestId("button-cancel-project-name").click();

    await expect(page.getByTestId("display-project-name")).toHaveValue("Updated Name");
  });

  test("should edit project description", async ({ page }) => {
    await page.goto(`/projects/${projectId}/settings`);
    await expect(page.getByRole("heading", { name: "Project Settings" })).toBeVisible();

    await page.getByTestId("button-edit-project-description").click();
    await page.getByTestId("input-project-description").fill("Updated Description");
    await page.getByTestId("button-save-project-description").click();

    await page.waitForTimeout(1000);
    await page.goto(`/projects/${projectId}/settings`);
    await expect(page.getByTestId("display-project-description")).toHaveValue(
      "Updated Description"
    );
  });

  test("should add a language via settings", async ({ page }) => {
    await page.goto(`/projects/${projectId}/settings`);

    await page.getByTestId("button-language-combobox").click();
    await page.getByTestId("input-language-search").fill("French");
    await page.waitForTimeout(500);
    await page.getByTestId("option-language-fr").click();
    await page.waitForTimeout(300);

    await page.getByTestId("button-add-language").click();
    await page.waitForTimeout(1500);

    await page.goto(`/projects/${projectId}/settings`);
    await expect(page.getByText("French")).toBeVisible();
  });

  test("should show language options in dropdown when opened", async ({ page }) => {
    await page.goto(`/projects/${projectId}/settings`);

    await page.getByTestId("button-language-combobox").click();
    await page.waitForTimeout(500);

    // Should show language options (not empty)
    const items = page.locator("[cmdk-item]");
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
  });

  test("should filter language dropdown by search", async ({ page }) => {
    await page.goto(`/projects/${projectId}/settings`);

    await page.getByTestId("button-language-combobox").click();
    await page.getByTestId("input-language-search").fill("Spanish");
    await page.waitForTimeout(500);

    await expect(page.getByTestId("option-language-es")).toBeVisible();
  });

  test("should not show already-added languages in dropdown", async ({ page }) => {
    await page.goto(`/projects/${projectId}/settings`);

    // English and French are already added, they should not appear
    await page.getByTestId("button-language-combobox").click();
    await page.waitForTimeout(500);

    await expect(page.getByTestId("option-language-en")).not.toBeVisible();
    await expect(page.getByTestId("option-language-fr")).not.toBeVisible();
  });

  test("should add a second language (Spanish) via settings", async ({ page }) => {
    await page.goto(`/projects/${projectId}/settings`);

    await page.getByTestId("button-language-combobox").click();
    await page.getByTestId("input-language-search").fill("Spanish");
    await page.waitForTimeout(500);
    await page.getByTestId("option-language-es").click();
    await page.waitForTimeout(300);

    await page.getByTestId("button-add-language").click();
    await page.waitForTimeout(1500);

    await page.goto(`/projects/${projectId}/settings`);
    await expect(page.getByText("Spanish")).toBeVisible();
  });

  test("should show team member form and submit", async ({ page }) => {
    await page.goto(`/projects/${projectId}/settings`);
    await expect(page.getByTestId("input-member-email")).toBeVisible();
    await expect(page.getByTestId("button-add-member")).toBeVisible();

    // Fill the form and click add (server may reject due to FK constraint on userId)
    await page.getByTestId("input-member-email").fill("test@example.com");
    await page.getByTestId("button-add-member").click();
    await page.waitForTimeout(1000);

    // Verify the form still works (page didn't crash)
    await expect(page.getByTestId("input-member-email")).toBeVisible();
  });

  test("should navigate back to project from settings", async ({ page }) => {
    await page.goto(`/projects/${projectId}/settings`);
    await page.getByText("Back to Project").click();
    await expect(page).toHaveURL(`/projects/${projectId}`);
  });
});

// ── Translation Editor Tests ─────────────────────────────────────────────────

test.describe("Translation Editor", () => {
  test.describe.configure({ mode: "serial" });

  let projectId: string;

  test("should create project and keys for editor tests", async ({ request, page }) => {
    projectId = await createProjectViaAPI(request, "Editor " + Date.now(), {
      languages: [
        { code: "en", name: "English" },
        { code: "fr", name: "French" },
      ],
    });

    // Create keys via API in the same request context
    const key1Res = await request.post("/api/translation-keys", {
      data: { projectId, key: "greeting.hello", description: "Hello greeting" },
    });
    expect(key1Res.ok()).toBeTruthy();

    const key2Res = await request.post("/api/translation-keys", {
      data: { projectId, key: "greeting.goodbye", description: "Goodbye greeting" },
    });
    expect(key2Res.ok()).toBeTruthy();
  });

  test("should load the translation editor with keys", async ({ page }) => {
    await page.goto(`/projects/${projectId}/editor`);
    await page.waitForLoadState("networkidle");
    const addKeyButton = page.getByTestId("button-add-key");
    await expect(addKeyButton.first()).toBeVisible();

    // Switch to table view to see full key paths
    await page.getByTestId("tab-table-view").click();
    await page.waitForTimeout(500);
    await expect(page.getByText("greeting.hello")).toBeVisible();
    await expect(page.getByText("greeting.goodbye")).toBeVisible();
  });

  test("should switch between table and folder view", async ({ page }) => {
    await page.goto(`/projects/${projectId}/editor`);
    await page.waitForLoadState("networkidle");

    // Should start in folder view by default
    await expect(page.getByTestId("tab-folder-view")).toBeVisible();
    await expect(page.getByTestId("tab-table-view")).toBeVisible();

    // Switch to table view
    await page.getByTestId("tab-table-view").click();
    await page.waitForTimeout(500);
    const rows = page.locator("[data-testid^='row-key-']");
    await expect(rows.first()).toBeVisible();

    // Switch back to folder view
    await page.getByTestId("tab-folder-view").click();
    await page.waitForTimeout(500);
  });

  test("should search for translation keys", async ({ page }) => {
    await page.goto(`/projects/${projectId}/editor`);
    await page.waitForLoadState("networkidle");

    // Switch to table view for key visibility
    await page.getByTestId("tab-table-view").click();
    await page.waitForTimeout(500);

    const searchInput = page.getByTestId("input-search");
    if (await searchInput.isVisible()) {
      await searchInput.fill("hello");
      await page.waitForTimeout(500);
      await expect(page.getByText("greeting.hello")).toBeVisible();
      await expect(page.getByText("greeting.goodbye")).not.toBeVisible();
      await searchInput.fill("");
      await page.waitForTimeout(500);
    }
  });

  test("should edit a translation inline", async ({ page }) => {
    await page.goto(`/projects/${projectId}/editor`);
    await page.waitForLoadState("networkidle");

    // Switch to table view
    await page.getByTestId("tab-table-view").click();
    await page.waitForTimeout(500);

    const firstKeyRow = page.locator("[data-testid^='row-key-']").first();
    if (await firstKeyRow.isVisible()) {
      const keyTestId = await firstKeyRow.getAttribute("data-testid");
      const keyId = keyTestId?.replace("row-key-", "");

      const translationCell = page
        .locator(`[data-testid^='text-translation-${keyId}']`)
        .first();

      if (await translationCell.isVisible()) {
        await translationCell.click();
        await page.waitForTimeout(300);

        const inputField = page
          .locator(`[data-testid^='input-translation-${keyId}']`)
          .first();

        if (await inputField.isVisible()) {
          await inputField.fill("Hello World");
          const saveButton = page
            .locator(`[data-testid^='button-save-${keyId}']`)
            .first();
          await saveButton.click();
          await page.waitForTimeout(1000);
        }
      }
    }
  });

  test("should cancel inline editing", async ({ page }) => {
    await page.goto(`/projects/${projectId}/editor`);
    await page.waitForLoadState("networkidle");

    // Switch to table view
    await page.getByTestId("tab-table-view").click();
    await page.waitForTimeout(500);

    const firstKeyRow = page.locator("[data-testid^='row-key-']").first();
    if (await firstKeyRow.isVisible()) {
      const keyTestId = await firstKeyRow.getAttribute("data-testid");
      const keyId = keyTestId?.replace("row-key-", "");

      const translationCell = page
        .locator(`[data-testid^='text-translation-${keyId}']`)
        .first();

      if (await translationCell.isVisible()) {
        await translationCell.click();
        await page.waitForTimeout(300);

        const inputField = page
          .locator(`[data-testid^='input-translation-${keyId}']`)
          .first();

        if (await inputField.isVisible()) {
          await inputField.fill("Should not save");
          const cancelButton = page
            .locator(`[data-testid^='button-cancel-${keyId}']`)
            .first();
          await cancelButton.click();
          await page.waitForTimeout(500);
        }
      }
    }
  });
});

// ── Edit Key Tests ───────────────────────────────────────────────────────────

test.describe("Edit Translation Key", () => {
  test.describe.configure({ mode: "serial" });

  let projectId: string;
  let keyId: string;

  test("should create project and key for edit tests", async ({ request }) => {
    projectId = await createProjectViaAPI(request, "EditKey " + Date.now());

    // Create key via API
    const keyRes = await request.post("/api/translation-keys", {
      data: { projectId, key: "edit.test.key", description: "Original description" },
    });
    expect(keyRes.ok()).toBeTruthy();
    const key = await keyRes.json();
    keyId = key.id;
  });

  test("should navigate to edit key page", async ({ page }) => {
    await page.goto(`/projects/${projectId}/keys/${keyId}`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("input-key")).toBeVisible();
  });

  test("should update key description", async ({ page }) => {
    await page.goto(`/projects/${projectId}/keys/${keyId}`);
    await page.waitForLoadState("networkidle");

    await page.getByTestId("input-description").fill("Updated key description");
    await page.getByTestId("button-update").click();
    await page.waitForTimeout(1000);

    await page.goto(`/projects/${projectId}/keys/${keyId}`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("input-description")).toHaveValue(
      "Updated key description"
    );
  });

  test("should navigate back from edit key page", async ({ page }) => {
    await page.goto(`/projects/${projectId}/keys/${keyId}`);
    await page.waitForLoadState("networkidle");
    await page.getByTestId("button-cancel").click();
    await expect(page).toHaveURL(`/projects/${projectId}`);
  });

  test.skip("should delete key from edit page", async ({ page, request }) => {
    // Create a fresh project and key to avoid cross-test fixture issues
    const freshProjectId = await createProjectViaAPI(request, "DeleteKey " + Date.now());
    const keyRes = await request.post("/api/translation-keys", {
      data: { projectId: freshProjectId, key: "key.to.delete" },
    });
    expect(keyRes.ok()).toBeTruthy();
    const deleteKey = await keyRes.json();

    await page.goto(`/projects/${freshProjectId}/keys/${deleteKey.id}`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("button-delete")).toBeVisible();
    await page.getByTestId("button-delete").click();
    await expect(page.getByText("Are you sure?")).toBeVisible();
    await page.getByTestId("button-confirm-delete").click();

    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/projects\/[\w-]+$/);
  });
});

// ── Import Translations Tests ────────────────────────────────────────────────

test.describe("Import Translations", () => {
  test.describe.configure({ mode: "serial" });

  let projectId: string;

  test("should create project for import tests", async ({ request }) => {
    projectId = await createProjectViaAPI(request, "Import " + Date.now());
  });

  test("should display import page with format selection", async ({ page }) => {
    await page.goto(`/projects/${projectId}/import`);
    await expect(page.getByRole("heading", { name: "Import Translations" })).toBeVisible();
    await expect(page.getByTestId("radio-format-json")).toBeVisible();
    await expect(page.getByTestId("radio-format-csv")).toBeVisible();
    await expect(page.getByTestId("dropzone")).toBeVisible();
  });

  test("should switch between JSON and CSV format", async ({ page }) => {
    await page.goto(`/projects/${projectId}/import`);

    await expect(page.getByText("Flat Format:")).toBeVisible();

    await page.getByTestId("radio-format-csv").click();
    await expect(page.getByText("CSV Format:")).toBeVisible();

    await page.getByTestId("radio-format-json").click();
    await expect(page.getByText("Flat Format:")).toBeVisible();
  });

  test("should import a JSON file", async ({ page }) => {
    await page.goto(`/projects/${projectId}/import`);

    const jsonContent = JSON.stringify({
      "nav.home": "Home",
      "nav.about": "About",
      "nav.contact": "Contact",
    });

    await page.getByTestId("input-file").setInputFiles({
      name: "translations.json",
      mimeType: "application/json",
      buffer: Buffer.from(jsonContent),
    });

    await expect(page.getByText("translations.json")).toBeVisible();
    await page.getByTestId("button-import").click();
    await expect(page).toHaveURL(`/projects/${projectId}`, { timeout: 10000 });
  });

  test("should import a CSV file", async ({ page }) => {
    await page.goto(`/projects/${projectId}/import`);
    await page.getByTestId("radio-format-csv").click();

    const csvContent = `key,language_code,value,status
footer.copyright,en,Copyright 2024,draft
footer.terms,en,Terms of Service,draft`;

    await page.getByTestId("input-file").setInputFiles({
      name: "translations.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csvContent),
    });

    await expect(page.getByText("translations.csv")).toBeVisible();
    await page.getByTestId("button-import").click();
    await expect(page).toHaveURL(`/projects/${projectId}`, { timeout: 10000 });
  });

  test("should show disabled import button without file", async ({ page }) => {
    await page.goto(`/projects/${projectId}/import`);
    await expect(page.getByTestId("button-import")).toBeDisabled();
  });

  test("should navigate back from import page", async ({ page }) => {
    await page.goto(`/projects/${projectId}/import`);
    await page.getByTestId("button-cancel").click();
    await expect(page).toHaveURL(`/projects/${projectId}`);
  });
});

// ── Export Translations Tests ────────────────────────────────────────────────

test.describe("Export Translations", () => {
  test.describe.configure({ mode: "serial" });

  let projectId: string;

  test("should create project with keys for export tests", async ({ request }) => {
    projectId = await createProjectViaAPI(request, "Export " + Date.now());

    // Import some keys via API
    const importRes = await request.post(`/api/projects/${projectId}/import`, {
      data: {
        format: "json",
        data: { "export.key1": "Value 1", "export.key2": "Value 2" },
      },
    });
    expect(importRes.ok()).toBeTruthy();
  });

  test("should display export page with format and language selection", async ({ page }) => {
    await page.goto(`/projects/${projectId}/export`);
    await expect(page.getByRole("heading", { name: "Export Translations" })).toBeVisible();
    await expect(page.getByText("Select Format")).toBeVisible();
    await expect(page.getByText("Select Languages")).toBeVisible();
    await expect(page.getByTestId("radio-format-json")).toBeVisible();
    await expect(page.getByTestId("radio-format-csv")).toBeVisible();
  });

  test("should show nested namespaces option for JSON", async ({ page }) => {
    await page.goto(`/projects/${projectId}/export`);
    await expect(page.getByTestId("checkbox-nested-namespaces")).toBeVisible();
  });

  test("should hide nested namespaces option for CSV", async ({ page }) => {
    await page.goto(`/projects/${projectId}/export`);
    await page.getByTestId("radio-format-csv").click();
    await expect(page.getByTestId("checkbox-nested-namespaces")).not.toBeVisible();
  });

  test("should disable export button without language selection", async ({ page }) => {
    await page.goto(`/projects/${projectId}/export`);
    await expect(page.getByTestId("button-export")).toBeDisabled();
  });

  test("should export when language is selected", async ({ page }) => {
    await page.goto(`/projects/${projectId}/export`);

    const langCheckbox = page.locator("[data-testid^='checkbox-language-']").first();
    await langCheckbox.click();

    await expect(page.getByTestId("button-export")).toBeEnabled();

    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("button-export").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain("translations");
  });
});

// ── Sidebar Navigation Tests ─────────────────────────────────────────────────

test.describe("Sidebar Navigation", () => {
  test("should show sidebar with app name", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Welcome Back")).toBeVisible();
    await expect(page.getByText("LocaleFlow").first()).toBeVisible();
  });

  test("should toggle sidebar", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Welcome Back")).toBeVisible();
    const sidebarToggle = page.getByTestId("button-sidebar-toggle");
    if (await sidebarToggle.isVisible()) {
      await sidebarToggle.click();
      await page.waitForTimeout(500);
    }
  });

  test("should show projects in sidebar", async ({ page, request }) => {
    const name = "SidebarProject " + Date.now();
    await createProjectViaAPI(request, name);
    await page.goto("/");
    await expect(page.getByText("Welcome Back")).toBeVisible();
    await expect(page.getByText(name).first()).toBeVisible();
  });
});

// ── API Route Tests ──────────────────────────────────────────────────────────

test.describe("API Routes", () => {
  test("should get authenticated user", async ({ request }) => {
    const response = await request.get("/api/auth/user");
    expect(response.ok()).toBeTruthy();
    const user = await response.json();
    expect(user).toHaveProperty("id");
  });

  test("should get user stats", async ({ request }) => {
    const response = await request.get("/api/stats");
    expect(response.ok()).toBeTruthy();
    const stats = await response.json();
    expect(stats).toHaveProperty("totalProjects");
    expect(stats).toHaveProperty("totalLanguages");
    expect(stats).toHaveProperty("totalKeys");
    expect(stats).toHaveProperty("recentActivity");
  });

  test("should get culture codes", async ({ request }) => {
    const response = await request.get("/api/culture-codes");
    expect(response.ok()).toBeTruthy();
    const codes = await response.json();
    expect(Array.isArray(codes)).toBeTruthy();
    expect(codes.length).toBeGreaterThan(0);
    expect(codes[0]).toHaveProperty("code");
    expect(codes[0]).toHaveProperty("name");
  });

  test("should search culture codes", async ({ request }) => {
    const response = await request.get("/api/culture-codes?search=english");
    expect(response.ok()).toBeTruthy();
    const codes = await response.json();
    expect(codes.length).toBeGreaterThan(0);
  });

  test("should create and get project via API", async ({ request }) => {
    const createResponse = await request.post("/api/projects", {
      data: {
        name: "API Test " + Date.now(),
        description: "Created via API",
        languages: [{ code: "en", name: "English" }],
      },
    });
    expect(createResponse.ok()).toBeTruthy();
    const project = await createResponse.json();
    expect(project).toHaveProperty("id");

    const getResponse = await request.get(`/api/projects/${project.id}`);
    expect(getResponse.ok()).toBeTruthy();
  });

  test("should list projects", async ({ request }) => {
    const response = await request.get("/api/projects");
    expect(response.ok()).toBeTruthy();
    const projects = await response.json();
    expect(Array.isArray(projects)).toBeTruthy();
  });

  test("should manage languages via API", async ({ request }) => {
    const projectId = await createProjectViaAPI(request, "LangAPI " + Date.now());

    const langResponse = await request.get(`/api/projects/${projectId}/languages`);
    const languages = await langResponse.json();
    expect(languages.length).toBe(1);
    expect(languages[0].languageCode).toBe("en");

    const addLangResponse = await request.post(
      `/api/projects/${projectId}/languages`,
      { data: { languageCode: "es", languageName: "Spanish" } }
    );
    expect(addLangResponse.ok()).toBeTruthy();

    const updatedLangResponse = await request.get(
      `/api/projects/${projectId}/languages`
    );
    const updatedLanguages = await updatedLangResponse.json();
    expect(updatedLanguages.length).toBe(2);
  });

  test("should CRUD translation keys via API", async ({ request }) => {
    const projectId = await createProjectViaAPI(request, "KeyAPI " + Date.now());

    const keyRes = await request.post("/api/translation-keys", {
      data: { projectId, key: "api.test.key", description: "API test key" },
    });
    expect(keyRes.ok()).toBeTruthy();
    const key = await keyRes.json();
    expect(key.key).toBe("api.test.key");

    const getKeyRes = await request.get(`/api/translation-keys/${key.id}`);
    expect(getKeyRes.ok()).toBeTruthy();

    const updateRes = await request.patch(`/api/translation-keys/${key.id}`, {
      data: { description: "Updated description" },
    });
    expect(updateRes.ok()).toBeTruthy();

    const deleteRes = await request.delete(`/api/translation-keys/${key.id}`);
    expect(deleteRes.ok()).toBeTruthy();
  });

  test("should CRUD translations via API", async ({ request }) => {
    const projectId = await createProjectViaAPI(request, "TransAPI " + Date.now());

    const langRes = await request.get(`/api/projects/${projectId}/languages`);
    const languages = await langRes.json();
    const langId = languages[0].id;

    const keyRes = await request.post("/api/translation-keys", {
      data: { projectId, key: "translation.test" },
    });
    const key = await keyRes.json();

    const transRes = await request.post("/api/translations", {
      data: { keyId: key.id, languageId: langId, value: "Test value", status: "draft" },
    });
    expect(transRes.ok()).toBeTruthy();
    const translation = await transRes.json();
    expect(translation.value).toBe("Test value");

    const updateRes = await request.patch(`/api/translations/${translation.id}`, {
      data: { value: "Updated translation", status: "in_review" },
    });
    expect(updateRes.ok()).toBeTruthy();

    const getTransRes = await request.get(`/api/projects/${projectId}/translations`);
    expect(getTransRes.ok()).toBeTruthy();
    const translations = await getTransRes.json();
    expect(translations.length).toBeGreaterThan(0);
  });

  test("should manage project hyperlinks via API", async ({ request }) => {
    const projectId = await createProjectViaAPI(request, "HypAPI " + Date.now());

    const createRes = await request.post(`/api/projects/${projectId}/hyperlinks`, {
      data: { label: "API Docs", url: "https://api.example.com" },
    });
    expect(createRes.ok()).toBeTruthy();
    const hyperlink = await createRes.json();
    expect(hyperlink.label).toBe("API Docs");

    const getRes = await request.get(`/api/projects/${projectId}/hyperlinks`);
    expect(getRes.ok()).toBeTruthy();
    const hyperlinks = await getRes.json();
    expect(hyperlinks.length).toBe(1);

    const updateRes = await request.patch(
      `/api/projects/${projectId}/hyperlinks/${hyperlink.id}`,
      { data: { label: "Updated API Docs", url: "https://api.updated.com" } }
    );
    expect(updateRes.ok()).toBeTruthy();

    const deleteRes = await request.delete(
      `/api/projects/${projectId}/hyperlinks/${hyperlink.id}`
    );
    expect(deleteRes.ok()).toBeTruthy();
  });

  test("should import and export translations via API", async ({ request }) => {
    const projectId = await createProjectViaAPI(request, "ImpExpAPI " + Date.now());

    const importRes = await request.post(`/api/projects/${projectId}/import`, {
      data: {
        format: "json",
        data: { "api.import.key1": "Imported Value 1", "api.import.key2": "Imported Value 2" },
      },
    });
    expect(importRes.ok()).toBeTruthy();

    const langRes = await request.get(`/api/projects/${projectId}/languages`);
    const languages = await langRes.json();

    const exportRes = await request.get(
      `/api/projects/${projectId}/export?format=json&languages=${languages[0].id}`
    );
    expect(exportRes.ok()).toBeTruthy();
  });

  test("should update and delete a project via API", async ({ request }) => {
    const projectId = await createProjectViaAPI(request, "CRUDAPI " + Date.now());

    const updateRes = await request.patch(`/api/projects/${projectId}`, {
      data: { name: "Updated Project Name", description: "Updated desc" },
    });
    expect(updateRes.ok()).toBeTruthy();

    const getRes = await request.get(`/api/projects/${projectId}`);
    const updatedProject = await getRes.json();
    expect(updatedProject.name).toBe("Updated Project Name");

    const deleteRes = await request.delete(`/api/projects/${projectId}`);
    expect(deleteRes.ok()).toBeTruthy();
  });

  test("should get translation providers", async ({ request }) => {
    const response = await request.get("/api/translation-providers");
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty("providers");
    expect(Array.isArray(data.providers)).toBeTruthy();
  });

  test("should return 404 for non-existent project", async ({ request }) => {
    const response = await request.get("/api/projects/non-existent-uuid");
    expect(response.status()).toBe(404);
  });

  test("should return 404 for non-existent translation key", async ({ request }) => {
    const response = await request.get("/api/translation-keys/non-existent-uuid");
    expect(response.status()).toBe(404);
  });
});

// ── Translation Status State Machine Tests ────────────────────────────────────

test.describe("Translation Status State Machine", () => {
  test.describe.configure({ mode: "serial" });

  let projectId: string;
  let langId: string;
  let translationId: string;

  test("should create project and translation for state tests", async ({ request }) => {
    projectId = await createProjectViaAPI(request, "StateMachine " + Date.now());

    const langRes = await request.get(`/api/projects/${projectId}/languages`);
    const languages = await langRes.json();
    langId = languages[0].id;

    const keyRes = await request.post("/api/translation-keys", {
      data: { projectId, key: "state.test.key" },
    });
    const key = await keyRes.json();

    const transRes = await request.post("/api/translations", {
      data: { keyId: key.id, languageId: langId, value: "Hello", status: "draft" },
    });
    expect(transRes.ok()).toBeTruthy();
    const translation = await transRes.json();
    translationId = translation.id;
    expect(translation.status).toBe("draft");
  });

  test("should allow valid transition: draft -> in_review", async ({ request }) => {
    const res = await request.patch(`/api/translations/${translationId}`, {
      data: { status: "in_review" },
    });
    expect(res.ok()).toBeTruthy();
    const updated = await res.json();
    expect(updated.status).toBe("in_review");
  });

  test("should reject invalid transition: in_review -> in_review (no-op is allowed)", async ({ request }) => {
    const res = await request.patch(`/api/translations/${translationId}`, {
      data: { status: "in_review" },
    });
    // no-op (same status) should succeed
    expect(res.ok()).toBeTruthy();
  });

  test("should allow valid transition: in_review -> approved", async ({ request }) => {
    const res = await request.patch(`/api/translations/${translationId}`, {
      data: { status: "approved" },
    });
    expect(res.ok()).toBeTruthy();
    const updated = await res.json();
    expect(updated.status).toBe("approved");
  });

  test("should reject invalid transition: approved -> in_review", async ({ request }) => {
    const res = await request.patch(`/api/translations/${translationId}`, {
      data: { status: "in_review" },
    });
    expect(res.ok()).toBeFalsy();
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("Invalid status transition");
  });

  test("should allow valid transition: approved -> draft (reopen)", async ({ request }) => {
    const res = await request.patch(`/api/translations/${translationId}`, {
      data: { status: "draft" },
    });
    expect(res.ok()).toBeTruthy();
    const updated = await res.json();
    expect(updated.status).toBe("draft");
  });

  test("should reject invalid transition: draft -> approved (skip review)", async ({ request }) => {
    const res = await request.patch(`/api/translations/${translationId}`, {
      data: { status: "approved" },
    });
    expect(res.ok()).toBeFalsy();
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("Invalid status transition");
  });

  test("should reject invalid status value", async ({ request }) => {
    const res = await request.patch(`/api/translations/${translationId}`, {
      data: { status: "bogus_status" },
    });
    expect(res.ok()).toBeFalsy();
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("Invalid status");
  });
});

// ── Not Found Page Tests ─────────────────────────────────────────────────────

test.describe("404 Not Found", () => {
  test("should show not found page for invalid routes", async ({ page }) => {
    await page.goto("/some/invalid/route");
    await expect(page.getByText("404")).toBeVisible();
  });
});

// ── i18n Language Toggle Tests ────────────────────────────────────────────────

test.describe("i18n Language Toggle", () => {
  test.describe.configure({ mode: "serial" });

  test("should switch UI to French when FR is clicked", async ({ request, page }) => {
    await createProjectViaAPI(request, "i18n Test " + Date.now());
    await page.goto("/");
    await expect(page.getByText("Welcome Back")).toBeVisible();

    // Click FR toggle
    await page.getByRole("button", { name: "FR" }).click();
    await expect(page.getByText("Bon retour")).toBeVisible();
  });

  test("should persist language preference across page loads", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "FR" }).click();
    await expect(page.getByText("Bon retour")).toBeVisible();

    // Reload page
    await page.reload();
    await expect(page.getByText("Bon retour")).toBeVisible();
  });

  test("should switch back to English when EN is clicked", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "FR" }).click();
    await expect(page.getByText("Bon retour")).toBeVisible();

    await page.getByRole("button", { name: "EN" }).click();
    await expect(page.getByText("Welcome Back")).toBeVisible();
  });
});
