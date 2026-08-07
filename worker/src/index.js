export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
		};

		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		try {
			if (url.pathname === '/lastfm') {
				return handleLastfm(env, corsHeaders);
			} else if (url.pathname === '/letterboxd') {
				return handleLetterboxd(env, corsHeaders);
			} else if (url.pathname === '/tmdb') {
				const title = url.searchParams.get('title');
				const year = url.searchParams.get('year');
				if (!title || !year) {
					return jsonResponse({ error: 'Missing title or year' }, 400, corsHeaders);
				}
				return handleTmdb(env, title, year, corsHeaders);
			}

			return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
		} catch (error) {
			return jsonResponse({ error: error.message }, 500, corsHeaders);
		}
	}
};

async function handleLastfm(env, corsHeaders) {
	const endpoint = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${env.LASTFM_USER}&api_key=${env.LASTFM_API_KEY}&format=json&limit=1`;
	
	const res = await fetch(endpoint);
	if (!res.ok) throw new Error('Last.fm API failed');
	
	const data = await res.json();
	return jsonResponse(data, 200, corsHeaders);
}

async function handleLetterboxd(env, corsHeaders) {
	const rssUrl = `https://letterboxd.com/${env.LETTERBOXD_USER}/rss/`;
	
	const res = await fetch(rssUrl);
	if (!res.ok) throw new Error('Letterboxd RSS failed');
	
	const xml = await res.text();
	
	const titleMatch = xml.match(/<letterboxd:filmTitle>([^<]+)<\/letterboxd:filmTitle>/);
	const yearMatch = xml.match(/<letterboxd:filmYear>([^<]+)<\/letterboxd:filmYear>/);
	const linkMatch = xml.match(/<link>([^<]+)<\/link>/);
	const ratingMatch = xml.match(/<letterboxd:memberRating>([^<]+)<\/letterboxd:memberRating>/);
	const descMatch = xml.match(/<description><!\[CDATA\[([^\]]+)\]\]><\/description>/);
	
	const imageMatch = descMatch ? descMatch[1].match(/<img src="([^"]+)"/) : null;
	
	const data = {
		title: titleMatch ? titleMatch[1] : '',
		year: yearMatch ? yearMatch[1] : '',
		url: linkMatch ? linkMatch[1] : '',
		rating: ratingMatch ? parseFloat(ratingMatch[1]) : null,
		image: imageMatch ? imageMatch[1] : ''
	};
	
	return jsonResponse(data, 200, corsHeaders);
}

async function handleTmdb(env, title, year, corsHeaders) {
	const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${env.TMDB_API_KEY}&query=${encodeURIComponent(title)}&year=${year}`;
	
	const searchRes = await fetch(searchUrl);
	if (!searchRes.ok) throw new Error('TMDB search failed');
	
	const searchData = await searchRes.json();
	if (!searchData.results || searchData.results.length === 0) {
		return jsonResponse({ directors: [] }, 200, corsHeaders);
	}
	
	const movieId = searchData.results[0].id;
	const creditsUrl = `https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${env.TMDB_API_KEY}`;
	
	const creditsRes = await fetch(creditsUrl);
	if (!creditsRes.ok) throw new Error('TMDB credits failed');
	
	const creditsData = await creditsRes.json();
	const directors = creditsData.crew
		.filter(person => person.job === 'Director')
		.map(d => d.name);
	
	return jsonResponse({ directors }, 200, corsHeaders);
}

function jsonResponse(data, status, corsHeaders) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'Content-Type': 'application/json',
			...corsHeaders
		}
	});
}
