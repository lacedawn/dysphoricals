import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = `${__dirname}/../src/data/lastfm.json`;

const API_KEY = process.env.LASTFM_API_KEY;
const USER = 'leno727';
const ENDPOINT = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${USER}&api_key=${API_KEY}&format=json&limit=1`;

async function fetchLastPlayed() {
  const res = await fetch(ENDPOINT);
  if (!res.ok) throw new Error(`Last.fm API error: ${res.status}`);

  const data = await res.json();
  const track = data.recenttracks.track[0];

  const result = {
    name: track.name,
    artist: track.artist['#text'],
    album: track.album['#text'],
    image: track.image.find(i => i.size === 'extralarge')?.['#text'] || track.image[track.image.length - 1]['#text'],
    nowPlaying: track['@attr']?.nowplaying === 'true',
    url: track.url,
    fetchedAt: new Date().toISOString()
  };

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, JSON.stringify(result, null, 2) + '\n');
  console.log(`Wrote ${OUTPUT}:`, result);
}

fetchLastPlayed().catch(err => {
  console.error(err);
  process.exit(1);
});
