import puppeteer from 'puppeteer';
import fs from 'fs';

// Pausa útil
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface Match {
  teams: string | null;
  date: string | null;
  title: string;
  url: string;
  images: string[];
}

interface MatchWithStreams extends Match {
  streams: string[];
}

async function scrapeStreamsForMatches() {
  // Lê JSON com os jogos e dados básicos
  const matches: Match[] = JSON.parse(fs.readFileSync('matches-com-imagens.json', 'utf-8'));

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const results: MatchWithStreams[] = [];

  for (const match of matches) {
    console.log(`\n🎯 Processando partida: ${match.title}`);

    const page = await browser.newPage();
    try {
      await page.goto(match.url, { waitUntil: 'networkidle2', timeout: 20000 });

      // Espera o seletor dos players
      await page.waitForSelector('.stream-option', { timeout: 10000 });

      // Extrai URLs dos iframes dos players
      const streamUrls: string[] = await page.$$eval('.stream-option', buttons =>
        buttons.map(b => b.getAttribute('data-url')).filter(Boolean) as string[]
      );

      console.log(`🔗 Encontradas ${streamUrls.length} opções de player.`);

      const streams: string[] = [];

      for (const streamUrl of streamUrls) {
        console.log(`   ▶️ Verificando iframe: ${streamUrl}`);

        const iframePage = await browser.newPage();
        try {
          await iframePage.goto(streamUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
          await sleep(3000);

          const m3u8 = await iframePage.evaluate(() => {
            const scripts = Array.from(document.scripts);
            const matches = scripts.flatMap(script =>
              script.textContent?.match(/https?:\/\/[^"']+\.m3u8/g) || []
            );
            return matches[0] || null;
          });

          if (m3u8) {
            console.log(`     ✅ .m3u8 encontrado: ${m3u8}`);
            streams.push(m3u8);
          } else {
            console.log(`     ❌ Nenhum .m3u8 encontrado.`);
          }
        } catch (err) {
          console.warn(`     ⚠️ Erro ao abrir iframe:`, (err as Error).message);
        }
        await iframePage.close();
      }

      results.push({ ...match, streams });
    } catch (err) {
      console.warn(`⚠️ Erro ao processar a partida ${match.title}:`, (err as Error).message);
      results.push({ ...match, streams: [] });
    }
    await page.close();
  }

  await browser.close();

  // Salva JSON completo formatado
  fs.writeFileSync('futeboldehoje.json', JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\n✅ Todos os dados salvos em futeboldehoje.json`);
}

scrapeStreamsForMatches().catch(console.error);
