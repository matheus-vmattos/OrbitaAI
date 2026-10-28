const assert = require("node:assert/strict");
const { chromium } = require("playwright");
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
      serviceWorkers: "block",
    });
    page.setDefaultTimeout(8000);
    const errors = [];
    const externalRequests = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/*", (route) => {
      if (new URL(route.request().url()).origin !== new URL(base).origin) {
        externalRequests.push(route.request().url());
        return route.abort();
      }
      return route.continue();
    });
    await page.goto(base);
    await page
      .getByRole("button", { name: "Desativar respostas em voz" })
      .click();
    const settings = () =>
      page.getByRole("button", { name: "Conversas e privacidade" }).click();
    const start = () =>
      page.getByRole("button", { name: "Experimentar conversa fictícia" }).click();
    const ask = async () => {
      await page
        .getByRole("textbox", { name: "Mensagem para a órbita" })
        .fill("Urgente Hoje");
      await page.getByRole("button", { name: "Enviar mensagem" }).click();
    };
    const inspect = async (status, count) => {
      await page.getByRole("button", { name: "Ver contexto" }).click();
      const summary = page.locator(".evidence summary");
      await summary.filter({ hasText: `· ${status}` }).waitFor();
      assert.equal(await summary.count(), 1, "Deve haver uma única obrigação.");
      await summary.click();
      await page
        .getByText(`${count} evidências vinculadas`, { exact: true })
        .waitFor();
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
      );
    };

    await settings();
    await start();
    await page.getByRole("button", { name: "Teste fictício", exact: true }).waitFor();
    await inspect("Em aberto", 2);
    await page.getByRole("button", { name: "Simular envio do comprovante" }).click();
    await inspect("Conferir conclusão", 3);
    await page
      .getByRole("button", { name: "Simular confirmação de recebimento" })
      .click();
    await inspect("Concluída", 4);
    await page.getByRole("button", { name: "Simular correção da confirmação" }).click();
    await inspect("Conferir conclusão", 5);
    assert.match(
      await page.locator(".spoken-answer").innerText(),
      /precisam de revisão/,
    );
    await page.getByRole("button", { name: "Marcar como concluída" }).click();
    await page
      .locator(".evidence summary")
      .filter({ hasText: "· Concluída" })
      .waitFor();
    assert.doesNotMatch(
      await page.locator(".spoken-answer").innerText(),
      /precisam de revisão/,
    );
    await page.getByRole("button", { name: "Reabrir", exact: true }).click();
    await page.locator(".spoken-answer").filter({ hasText: "possíveis ações" }).waitFor();
    await page.getByRole("button", { name: "Recomeçar teste fictício" }).click();
    await inspect("Em aberto", 2);

    // A importação usa outra sessão e deve sobreviver a entrar/sair do teste.
    await settings();
    await page.getByLabel("Conversa (contato ou grupo)").fill("Contato importado");
    await page.locator("input[type=file]").setInputFiles({
      name: "conversa-ficticia.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("27/10/2026, 11:00 - Luiza: Me envie o contrato amanhã."),
    });
    await page.locator(".notice").waitFor();
    await page.getByRole("button", { name: "Fechar configurações" }).click();
    await page
      .getByRole("button", { name: "Histórico parcial", exact: true })
      .waitFor();
    await ask();
    assert.match(await page.locator(".spoken-answer").innerText(), /Luiza/);
    assert.doesNotMatch(await page.locator(".spoken-answer").innerText(), /Marina/);
    await settings();
    await start();
    await inspect("Em aberto", 2);
    assert.doesNotMatch(await page.locator(".evidence").innerText(), /Luiza/);
    await page.getByRole("button", { name: "Marcar como concluída" }).click();
    await settings();
    await page.getByRole("button", { name: "Voltar às importações" }).click();
    await ask();
    await inspect("Em aberto", 1);
    assert.match(await page.locator(".evidence").innerText(), /Luiza/);
    assert.doesNotMatch(await page.locator(".evidence").innerText(), /Marina/);

    await settings();
    await page.getByRole("button", { name: "Limpar dados desta aba" }).click();
    await ask();
    assert.match(await page.locator(".spoken-answer").innerText(), /desconhecida/);
    await page.getByRole("button", { name: "Ver contexto" }).click();
    assert.equal(await page.locator(".evidence details").count(), 0);
    assert.equal(await page.locator(".sample-guide").count(), 0);
    assert.deepEqual(errors, []);
    assert.deepEqual(externalRequests, []);
    console.log(
      JSON.stringify({
        passed: true,
        mode: "in-app-synthetic-conversation",
        stages: 4,
        correctionRequiresReview: true,
        summaryFollowsManualStatus: true,
        importsPreservedAndSeparate: true,
        clearData: true,
        externalRequests: 0,
        realWhatsApp: false,
        realAI: false,
        physicalPhone: false,
      }),
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
