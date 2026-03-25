import { test, expect, type APIRequestContext } from "@playwright/test";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function createProjectViaAPI(
  request: APIRequestContext,
  name: string,
  options: { description?: string; languages?: { code: string; name: string }[] } = {}
): Promise<string> {
  const res = await request.post("/api/projects", {
    data: {
      name,
      description: options.description ?? "",
      languages: options.languages ?? [{ code: "en-US", name: "English - United States" }],
    },
  });
  expect(res.ok()).toBeTruthy();
  const project = await res.json();
  return project.id;
}

async function getDefaultLanguageId(request: APIRequestContext, projectId: string): Promise<string> {
  const res = await request.get(`/api/projects/${projectId}/languages`);
  const languages = await res.json();
  const defaultLang = languages.find((l: any) => l.isDefault);
  return defaultLang.id;
}

async function createKeyWithTranslation(
  request: APIRequestContext,
  projectId: string,
  languageId: string,
  key: string,
  value: string
): Promise<string> {
  const keyRes = await request.post("/api/translation-keys", {
    data: { projectId, key },
  });
  expect(keyRes.ok()).toBeTruthy();
  const keyData = await keyRes.json();

  const transRes = await request.post("/api/translations", {
    data: { keyId: keyData.id, languageId, value, status: "draft" },
  });
  expect(transRes.ok()).toBeTruthy();

  return keyData.id;
}

async function deleteProject(request: APIRequestContext, projectId: string) {
  await request.delete(`/api/projects/${projectId}`);
}

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe("Cross-Project Translation Search", () => {
  test.describe.configure({ mode: "serial" });

  let projectAId: string;
  let projectBId: string;
  let langAId: string;
  let langBId: string;

  test.beforeAll(async ({ request }) => {
    // Create two projects - both with en-US and fr-CA
    projectAId = await createProjectViaAPI(request, "SearchTestA " + Date.now(), {
      languages: [
        { code: "en-US", name: "English - United States" },
        { code: "fr-CA", name: "French - Canada" },
      ],
    });
    projectBId = await createProjectViaAPI(request, "SearchTestB " + Date.now(), {
      languages: [
        { code: "en-US", name: "English - United States" },
        { code: "fr-CA", name: "French - Canada" },
      ],
    });
    langAId = await getDefaultLanguageId(request, projectAId);
    langBId = await getDefaultLanguageId(request, projectBId);

    // Get fr-CA language ID for Project A
    const langARes = await request.get(`/api/projects/${projectAId}/languages`);
    const langsA = await langARes.json();
    const frCALangA = langsA.find((l: any) => l.languageCode === "fr-CA");

    // Project A: create keys with translations in both languages
    await createKeyWithTranslation(request, projectAId, langAId, "common.save", "Save");
    await createKeyWithTranslation(request, projectAId, langAId, "common.cancel", "Cancel");

    // Create the unique key with translations in both en-US and fr-CA
    const keyRes = await request.post("/api/translation-keys", {
      data: { projectId: projectAId, key: "xtest.unique.greeting" },
    });
    const greetingKey = await keyRes.json();
    await request.post("/api/translations", {
      data: { keyId: greetingKey.id, languageId: langAId, value: "UniqueTestGreeting123", status: "draft" },
    });
    await request.post("/api/translations", {
      data: { keyId: greetingKey.id, languageId: frCALangA.id, value: "SalutationUniqueTest123", status: "draft" },
    });

    // Project B: create a key with the same value as Project A
    await createKeyWithTranslation(request, projectBId, langBId, "buttons.save", "Save");
  });

  test.afterAll(async ({ request }) => {
    await deleteProject(request, projectAId);
    await deleteProject(request, projectBId);
  });

  // ── API Tests ──────────────────────────────────────────────────────────────

  test("API: should return 400 when q parameter is missing", async ({ request }) => {
    const res = await request.get(`/api/translations/search?excludeProjectId=${projectAId}`);
    expect(res.status()).toBe(400);
  });

  test("API: should return 400 when excludeProjectId is missing", async ({ request }) => {
    const res = await request.get("/api/translations/search?q=save");
    expect(res.status()).toBe(400);
  });

  test("API: should find translations by key name across projects", async ({ request }) => {
    // Search from Project B, should find "common.save" in Project A
    const res = await request.get(
      `/api/translations/search?q=common.save&excludeProjectId=${projectBId}`
    );
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.results.length).toBeGreaterThan(0);
    expect(data.results.some((r: any) => r.key === "common.save")).toBeTruthy();
  });

  test("API: should find translations by value across projects", async ({ request }) => {
    // Search from Project B for value "UniqueTestGreeting123", should find it in Project A
    const res = await request.get(
      `/api/translations/search?q=UniqueTestGreeting123&excludeProjectId=${projectBId}`
    );
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.results.length).toBeGreaterThan(0);
    expect(data.results.some((r: any) => r.value === "UniqueTestGreeting123")).toBeTruthy();
  });

  test("API: should exclude the specified project from results", async ({ request }) => {
    // Search from Project A for "save", should NOT return Project A's own "common.save"
    const res = await request.get(
      `/api/translations/search?q=save&excludeProjectId=${projectAId}`
    );
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    // Should find Project B's "buttons.save" but not Project A's "common.save"
    for (const result of data.results) {
      expect(result.projectId).not.toBe(projectAId);
    }
  });

  test("API: should return empty results for non-matching query", async ({ request }) => {
    const res = await request.get(
      `/api/translations/search?q=xyznonexistent999&excludeProjectId=${projectAId}`
    );
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.results.length).toBe(0);
  });

  test("API: should return projectName, key, value, and languageCode in results", async ({ request }) => {
    const res = await request.get(
      `/api/translations/search?q=save&excludeProjectId=${projectBId}`
    );
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.results.length).toBeGreaterThan(0);
    const result = data.results[0];
    expect(result).toHaveProperty("projectId");
    expect(result).toHaveProperty("projectName");
    expect(result).toHaveProperty("keyId");
    expect(result).toHaveProperty("key");
    expect(result).toHaveProperty("value");
    expect(result).toHaveProperty("languageCode");
  });

  test("API: should return all language translations for a key", async ({ request }) => {
    // First find the key ID by searching
    const searchRes = await request.get(
      `/api/translations/search?q=xtest.unique.greeting&excludeProjectId=${projectBId}`
    );
    const searchData = await searchRes.json();
    const result = searchData.results.find((r: any) => r.key === "xtest.unique.greeting");
    expect(result).toBeTruthy();

    // Fetch all translations for that key
    const res = await request.get(`/api/translation-keys/${result.keyId}/translations-with-languages`);
    expect(res.ok()).toBeTruthy();
    const translations = await res.json();
    expect(translations.length).toBe(2);
    expect(translations.some((t: any) => t.languageCode === "en-US" && t.value === "UniqueTestGreeting123")).toBeTruthy();
    expect(translations.some((t: any) => t.languageCode === "fr-CA" && t.value === "SalutationUniqueTest123")).toBeTruthy();
  });

  test("API: should copy all language translations when using a found result", async ({ request }) => {
    // Search and find the key
    const searchRes = await request.get(
      `/api/translations/search?q=xtest.unique.greeting&excludeProjectId=${projectBId}`
    );
    const searchData = await searchRes.json();
    const result = searchData.results.find((r: any) => r.key === "xtest.unique.greeting");

    // Get translations for the key
    const transRes = await request.get(`/api/translation-keys/${result.keyId}/translations-with-languages`);
    const sourceTranslations = await transRes.json();

    // Create the key in Project B
    const keyRes = await request.post("/api/translation-keys", {
      data: { projectId: projectBId, key: "xtest.unique.greeting.copy" },
    });
    const newKey = await keyRes.json();

    // Get Project B's languages
    const langBRes = await request.get(`/api/projects/${projectBId}/languages`);
    const langsB = await langBRes.json();
    const langCodeToId = new Map(langsB.map((l: any) => [l.languageCode, l.id]));

    // Create translations for all matching languages
    for (const st of sourceTranslations) {
      const langId = langCodeToId.get(st.languageCode);
      if (langId) {
        await request.post("/api/translations", {
          data: { keyId: newKey.id, languageId: langId, value: st.value, status: "draft" },
        });
      }
    }

    // Verify all translations were created
    const projectTransRes = await request.get(`/api/projects/${projectBId}/translations?keyId=${newKey.id}`);
    const projectTranslations = await projectTransRes.json();
    expect(projectTranslations.length).toBe(2);
  });

  // ── UI Tests ───────────────────────────────────────────────────────────────

  test.skip("UI: should show search field in Add Key dialog", async ({ page }) => {
    await page.goto(`/projects/${projectBId}`);
    await page.waitForLoadState("networkidle");
    await page.getByTestId("button-open-editor").click();
    await page.waitForLoadState("networkidle");

    await page.getByTestId("button-add-key").click();
    await expect(page.getByTestId("input-duplicate-search")).toBeVisible();
    await expect(page.getByTestId("button-duplicate-search")).toBeVisible();
  });

  test.skip("UI: should search and display results from other projects", async ({ page }) => {
    await page.goto(`/projects/${projectBId}`);
    await page.waitForLoadState("networkidle");
    await page.getByTestId("button-open-editor").click();
    await page.waitForLoadState("networkidle");

    await page.getByTestId("button-add-key").click();
    await page.getByTestId("input-duplicate-search").fill("UniqueTestGreeting123");
    await page.getByTestId("button-duplicate-search").click();

    // Should show result from Project A
    await expect(page.getByText("xtest.unique.greeting")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("UniqueTestGreeting123")).toBeVisible();
  });

  test.skip("UI: should copy key and value when Use button is clicked", async ({ page }) => {
    await page.goto(`/projects/${projectBId}`);
    await page.waitForLoadState("networkidle");
    await page.getByTestId("button-open-editor").click();
    await page.waitForLoadState("networkidle");

    await page.getByTestId("button-add-key").click();
    await page.getByTestId("input-duplicate-search").fill("UniqueTestGreeting123");
    await page.getByTestId("button-duplicate-search").click();

    // Wait for results
    await expect(page.getByTestId("button-use-duplicate-0")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("button-use-duplicate-0").click();

    // The key input should have the key name
    const keyInput = page.getByTestId("input-key");
    await expect(keyInput).toHaveValue("xtest.unique.greeting");

    // The default value textarea should have the value
    const defaultValueInput = page.getByTestId("input-default-value");
    await expect(defaultValueInput).toHaveValue("UniqueTestGreeting123");
  });

  test.skip("UI: should show no matches message for non-matching search", async ({ page }) => {
    await page.goto(`/projects/${projectBId}`);
    await page.waitForLoadState("networkidle");
    await page.getByTestId("button-open-editor").click();
    await page.waitForLoadState("networkidle");

    await page.getByTestId("button-add-key").click();
    await page.getByTestId("input-duplicate-search").fill("xyznonexistent999");
    await page.getByTestId("button-duplicate-search").click();

    await expect(
      page.getByText("No matching translations found in other projects")
    ).toBeVisible({ timeout: 10000 });
  });
});
