import express from "express"
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const router = express.Router()

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface Match {
  teams: string | null;
  date: string | null;
  title: string;
  url: string;
  images: string[];
}

interface MatchWithStreams extends Match {
  streams: StreamInfo[];
}

interface StreamInfo {
  iframeUrl: string;
  m3u8Url: string | null;
}

interface MatchWithStreams extends Match {
  streams: StreamInfo[];
}

async function scrapeStreamsForMatches(): Promise<MatchWithStreams[]> {
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

      await page.waitForSelector('.stream-option', { timeout: 10000 });

      const streamUrls: string[] = await page.$$eval('.stream-option', buttons =>
        buttons.map(b => b.getAttribute('data-url')).filter(Boolean) as string[]
      );

      console.log(`🔗 Encontradas ${streamUrls.length} opções de player.`);

      const streams: StreamInfo[] = [];

      for (const iframeUrl of streamUrls) {
        console.log(`   ▶️ Verificando iframe: ${iframeUrl}`);

        const iframePage = await browser.newPage();
        try {
          await iframePage.goto(iframeUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
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
            streams.push({ iframeUrl, m3u8Url: m3u8 });
          } else {
            console.log(`     ❌ Nenhum .m3u8 encontrado.`);
            streams.push({ iframeUrl, m3u8Url: null });
          }
        } catch (err) {
          console.warn(`     ⚠️ Erro ao abrir iframe:`, (err as Error).message);
          streams.push({ iframeUrl, m3u8Url: null });
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

  fs.writeFileSync('futeboldehoje.json', JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\n✅ Todos os dados salvos em futeboldehoje.json`);

  return results;
}

async function scrapeMatchesWithImages() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const targetUrl = 'https://futemax.toys/?page_id=68';
  await page.goto(targetUrl, { waitUntil: 'networkidle2' });

  const matchData = await page.$$eval('a[href*="?match=assistir-"]', (links) => {
    const regex = /assistir-([a-z0-9-]+)-ao-vivo-online-([0-9]{2}-[0-9]{2}-[0-9]{4})/i;

    return links.map(link => {
      const href = link.href;
      const title = link.textContent?.trim() || 'Sem título';

      const match = href.match(regex);
      const teams = match ? match[1] : null;
      const date = match ? match[2] : null;

      let imgs = Array.from(link.querySelectorAll('img')).map(img => img.src);

      if (imgs.length === 0 && link.parentElement) {
        imgs = Array.from(link.parentElement.querySelectorAll('img')).map(img => img.src);
      }

      imgs = Array.from(new Set(imgs));

      return {
        teams,
        date,
        title,
        url: href,
        images: imgs
      };
    });
  });

  await browser.close();

  // Também salvar no arquivo se quiser
  fs.writeFileSync('matches-com-imagens.json', JSON.stringify(matchData, null, 2), 'utf-8');

  return matchData;
}

router.get('/scrape', async (req, res) => {
  try {
    const data = await scrapeMatchesWithImages();
    res.json({ success: true, matches: data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Erro ao fazer scraping', error: (error as Error).message });
  }
});

router.get('/scrape-streams', async (req, res) => {
  try {
    const result = await scrapeStreamsForMatches();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Erro ao coletar streams', error: (error as Error).message });
  }
});

// Rota para retornar o conteúdo do futeboldehoje.json
router.get('/futeboldehoje', (req, res) => {
  // Caminho absoluto para o arquivo JSON, subindo um nível da pasta routes
  //const filePath = path.resolve(__dirname, '..', 'futeboldehoje.json');
  const filePath = path.resolve(__dirname, '..', '..', 'futeboldehoje.json');


  console.log('Lendo arquivo:', filePath);

  // Verifica se o arquivo existe antes de ler
  fs.access(filePath, fs.constants.F_OK, (accessErr) => {
    if (accessErr) {
      console.error('Arquivo não encontrado:', filePath);
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    fs.readFile(filePath, 'utf-8', (readErr, data) => {
      if (readErr) {
        console.error('Erro ao ler arquivo:', readErr);
        return res.status(500).json({ error: 'Erro ao ler arquivo de dados' });
      }
      try {
        const jsonData = JSON.parse(data);
        res.json(jsonData);
      } catch (parseErr) {
        console.error('Erro ao parsear JSON:', parseErr);
        res.status(500).json({ error: 'Erro ao processar JSON' });
      }
    });
  });
});

export { router }