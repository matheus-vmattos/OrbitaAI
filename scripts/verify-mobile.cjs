const { mkdtempSync, rmSync } = require("node:fs");
const { chromium } = require("playwright");
const base = process.env.ORBIT_TEST_URL || "http://localhost:3000";
(async () => {
  const profile = mkdtempSync("/tmp/orbit-pwa-profile-");
  const context = await chromium.launchPersistentContext(profile, {
    executablePath: "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page.getByRole("heading", { name: "Iniciar Conexão" }).waitFor();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  const manifestResponse = await page.request.get(
    `${base}/manifest.webmanifest`,
  );
  const manifest = await manifestResponse.json();
  if (manifest.name !== "OrbitAI" || manifest.display !== "standalone")
    throw Error("Manifest incorreto");
  const icons = await page.evaluate(async () => {
    const manifest = await fetch("/manifest.webmanifest").then((r) => r.json());
    return Promise.all(
      manifest.icons.map(
        (icon) =>
          new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () =>
              resolve([image.naturalWidth, image.naturalHeight]);
            image.onerror = reject;
            image.src = icon.src;
          }),
      ),
    );
  });
  if (
    !icons.some(([w, h]) => w === 192 && h === 192) ||
    !icons.some(([w, h]) => w === 512 && h === 512)
  )
    throw Error("Ícones incorretos");
  const apple = await page
    .locator("link[rel=apple-touch-icon]")
    .getAttribute("href");
  if (apple !== "/icons/orbit-180.png") throw Error("Apple icon missing");
  const header = await page.request.get(`${base}/sw.js`);
  if (!header.headers()["cache-control"].includes("no-store"))
    throw Error("SW header cache inadequado");
  await page
    .getByRole("button", { name: "Desativar respostas em voz" })
    .click();
  await page.getByRole("button", { name: "Urgente Hoje", exact: true }).click();
  await page.locator(".spoken-answer").filter({ hasText: "Amanda" }).waitFor();
  if (
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  )
    throw Error("Overflow mobile");
  const client = await context.newCDPSession(page);
  const info = await client.send("Page.getAppManifest");
  if (info.errors.length) throw Error(JSON.stringify(info.errors));
  let installability;
  try {
    installability = await client.send("Page.getInstallabilityErrors");
  } catch {
    installability = { unsupported: true };
  }
  if (installability.installabilityErrors?.length)
    throw Error(JSON.stringify(installability));
  const cached = await page.evaluate(async () => {
    const result = [];
    for (const key of await caches.keys()) {
      if (key.startsWith("orbit-public-")) {
        const cache = await caches.open(key);
        for (const r of await cache.keys())
          result.push(new URL(r.url).pathname);
      }
    }
    return result;
  });
  const allowed = [
    "/offline.html",
    "/icons/orbit-180.png",
    "/icons/orbit-192.png",
    "/icons/orbit-512.png",
  ];
  if (cached.length !== 4 || cached.some((p) => !allowed.includes(p)))
    throw Error("Cache excessivo");
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("heading", { name: "Você está sem conexão." }).waitFor();
  if ((await page.locator("body").innerText()).includes("Amanda"))
    throw Error("Dados em cache");
  await context.setOffline(false);
  await page.goto(base);
  await page.getByRole("heading", { name: "Iniciar Conexão" }).waitFor();
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    JSON.stringify({
      passed: true,
      manifest: true,
      icons,
      appleIcon: true,
      serviceWorker: true,
      cache: cached,
      offlineFallback: true,
      privateContentNotCached: true,
      mobileViewport: true,
      installability,
      scope:
        "Chromium local; instalação em Android/iPhone reais ainda não testada",
    }),
  );
  await context.close();
  rmSync(profile, { recursive: true, force: true });
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
