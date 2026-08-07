import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = `${__dirname}/../src/data/letterboxd.json`;
const USER = 'lacedawn';
const ENDPOINT = `https://letterboxd.com/${USER}/rss/`;

async function fetchLetterboxd() {
  const res = await fetch(ENDPOINT, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LetterboxdFetcher/1.0)' }
  });
  if (!res.ok) throw new Error(`Letterboxd RSS error: ${res.status}`);

  const xml = await res.text();
  const itemMatch = xml.match(/<item>([\s\S]*?)<\/item>/);
  if (!itemMatch) throw new Error('No items found in Letterboxd RSS feed');

  const itemXml = itemMatch[1];

  const titleMatch = itemXml.match(/<letterboxd:filmTitle>(.*?)<\/letterboxd:filmTitle>/);
  const yearMatch = itemXml.match(/<letterboxd:filmYear>(.*?)<\/letterboxd:filmYear>/);
  const ratingMatch = itemXml.match(/<letterboxd:memberRating>(.*?)<\/letterboxd:memberRating>/);
  const linkMatch = itemXml.match(/<link>(.*?)<\/link>/);
  const imgMatch = itemXml.match(/<img src="([^"]+)"/);

  let director = '';
  let localImagePath = '';
  
  if (linkMatch) {
    const filmUrl = linkMatch[1];
    const baseFilmUrl = filmUrl.replace(`/${USER}`, '');
    const filmRes = await fetch(baseFilmUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LetterboxdFetcher/1.0)' }
    });
    if (filmRes.ok) {
      const filmHtml = await filmRes.text();
      const dirMatch = filmHtml.match(/<meta name="twitter:data1" content="([^"]+)"/);
      if (dirMatch) director = dirMatch[1];
    }
  }

  const result = {
    title: titleMatch ? titleMatch[1] : '',
    year: yearMatch ? yearMatch[1] : '',
    rating: ratingMatch ? parseFloat(ratingMatch[1]) : null,
    image: imgMatch ? imgMatch[1] : '',
    director: director,
    url: linkMatch ? linkMatch[1] : '',
    fetchedAt: new Date().toISOString()
  };

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, JSON.stringify(result, null, 2) + '\n');
  console.log(`Wrote ${OUTPUT}:`, result);
}

fetchLetterboxd().catch(err => {
  console.error(err);
  process.exit(1);
});
