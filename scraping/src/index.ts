import puppeteer from 'puppeteer';
import fs from 'fs';

// Função utilitária para "pausar" a execução por um tempo determinado
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeFutemaxIframe() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  const targetUrl = 'https://futemax.toys/?page_id=68';
  await page.goto(targetUrl, { waitUntil: 'networkidle2' });

  // Espera o botão de stream carregar
  await page.waitForSelector('.stream-option', { timeout: 10000 });

  // Coleta todas as URLs de stream disponíveis
  const streamUrls: string[] = await page.$$eval('.stream-option', buttons =>
    buttons.map(button => button.getAttribute('data-url')).filter(Boolean) as string[]
  );

  console.log(`🎯 ${streamUrls.length} opções de player encontradas.`);

  const m3u8Links: string[] = [];

  for (const streamUrl of streamUrls) {
    console.log(`🔗 Verificando iframe: ${streamUrl}`);

    const iframePage = await browser.newPage();

    try {
      await iframePage.goto(streamUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

      // Espera estática de 3 segundos
      await sleep(3000);

      const m3u8 = await iframePage.evaluate(() => {
        const scripts = Array.from(document.scripts);
        const matches = scripts.flatMap(script =>
          script.textContent?.match(/https?:\/\/[^"']+\.m3u8/g) || []
        );
        return matches[0] || null;
      });

      if (m3u8) {
        console.log(`✅ .m3u8 encontrado: ${m3u8}`);
        m3u8Links.push(m3u8);
      } else {
        console.log(`❌ Nenhum .m3u8 encontrado em ${streamUrl}`);
      }
    } catch (err) {
      console.warn(`⚠️ Erro ao processar ${streamUrl}:`, (err as Error).message);
    }

    await iframePage.close();
  }

  console.log('\n🔗 Todas URLs .m3u8 encontradas:');
  console.log(m3u8Links.join('\n') || 'Nenhuma encontrada.');

  // (Opcional) Salvar em um arquivo local
  fs.writeFileSync('links-m3u8.txt', m3u8Links.join('\n'), 'utf-8');

  await browser.close();
}

scrapeFutemaxIframe().catch(console.error);
