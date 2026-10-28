const { chromium } = require("playwright");
const { resolve } = require("node:path");
const base = process.env.ORBIT_TEST_URL || "http://localhost:3000";
(async () => {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base);
    await page
      .getByRole("button", { name: "Desativar respostas em voz" })
      .click();
    async function upload(name) {
      const notice = page.getByRole("button", { name: "Fechar aviso" });
      if (await notice.isVisible()) await notice.click();
      await page
        .getByRole("button", { name: "Conversas e privacidade" })
        .click();
      await page.getByLabel("Conversa (contato ou grupo)").fill("Marina");
      await page
        .locator("input[type=file]")
        .setInputFiles(resolve("fixtures/conciliacao", name));
      await page.locator(".notice").waitFor();
      await page.getByRole("button", { name: "Fechar configurações" }).click();
      await page
        .getByRole("textbox", { name: "Mensagem para a órbita" })
        .fill("Urgente Hoje");
      await page.getByRole("button", { name: "Enviar mensagem" }).click();
      await page.getByRole("button", { name: "Ver contexto" }).click();
      await page.locator(".evidence details").first().waitFor();
      if ((await page.locator(".evidence details").count()) !== 1)
        throw Error("Uma obrigação esperada.");
      await page.locator(".evidence summary").click();
    }
    await upload("01-pedido-promessa.txt");
    await page.getByRole("button", { name: "Marcar como concluída" }).click();
    await page.getByRole("button", { name: "Reabrir", exact: true }).waitFor();
    await upload("00-backfill-anterior.txt");
    await page.getByRole("button", { name: "Reabrir", exact: true }).waitFor();
    await upload("04-nova-solicitacao.txt");
    await page
      .getByText(
        "O histórico mudou a associação de uma decisão manual. Confira as evidências.",
        { exact: true },
      )
      .waitFor();
    await page.getByRole("button", { name: "Marcar como concluída" }).waitFor();
    await page
      .locator(".spoken-answer")
      .filter({ hasText: "decisões manuais a revisar" })
      .waitFor();
    if (
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )
    )
      throw Error("Overflow mobile");
    const other = await browser.newPage();
    await other.goto(base);
    await other.getByRole("heading", { name: "Iniciar Conexão" }).waitFor();
    if (await other.locator(".evidence").count())
      throw Error("Dados vazaram entre abas.");
    await other.close();
    await page.getByRole("button", { name: "Conversas e privacidade" }).click();
    await page.getByRole("button", { name: "Limpar dados desta aba" }).click();
    await page
      .getByRole("textbox", { name: "Mensagem para a órbita" })
      .fill("Urgente Hoje");
    await page.getByRole("button", { name: "Enviar mensagem" }).click();
    await page
      .locator(".spoken-answer")
      .filter({ hasText: "desconhecida" })
      .waitFor();
    await page.getByRole("button", { name: "Ver contexto" }).click();
    if (await page.locator(".evidence details").count())
      throw Error("Limpeza incompleta.");
    if (errors.length) throw Error(errors.join("\n"));
    console.log(
      JSON.stringify({
        passed: true,
        mode: "local-synthetic-import",
        manualDecisionPreservedOnBackfill: true,
        newEvidenceRequiresReview: true,
        separateTabs: true,
        clearData: true,
        mobileViewport: true,
        realWhatsApp: false,
        realAI: false,
      }),
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
