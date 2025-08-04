import puppeteer from 'puppeteer';
import fs from 'fs';

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

      // Tenta pegar imagens no link direto
      let imgs = Array.from(link.querySelectorAll('img')).map(img => img.src);

      // Se não achou, tenta pegar imagens no container pai próximo
      if (imgs.length === 0 && link.parentElement) {
        imgs = Array.from(link.parentElement.querySelectorAll('img')).map(img => img.src);
      }

      // Remove possíveis URLs duplicadas
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

  fs.writeFileSync('matches-com-imagens.json', JSON.stringify(matchData, null, 2), 'utf-8');

  console.log(`✅ ${matchData.length} partidas salvas em matches-com-imagens.json`);

  await browser.close();
}

scrapeMatchesWithImages().catch(console.error);
