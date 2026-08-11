const base = 'http://127.0.0.1:3000';
const routes = [
  { method: 'GET', path: '/api/mandals' },
  { method: 'GET', path: '/api/planned-matches' },
  { method: 'GET', path: '/api/matches' },
  { method: 'GET', path: '/api/matches/live' },
  { method: 'GET', path: '/api/matches/upcoming' },
  { method: 'GET', path: '/api/matches/recent' },
  { method: 'GET', path: '/api/matches/stats' },
  { method: 'GET', path: '/api/leaderboard' },
  { method: 'GET', path: '/api/medals' },
  { method: 'GET', path: '/api/news' },
  { method: 'GET', path: '/api/media' },
  { method: 'GET', path: '/api/settings/registration' },
  { method: 'POST', path: '/api/auth/login', body: { username: 'x', password: 'x' } },
  { method: 'GET', path: '/api/auth/me' }
];

(async () => {
  for (const route of routes) {
    const options = { method: route.method };
    if (route.body) {
      options.headers = { 'content-type': 'application/json' };
      options.body = JSON.stringify(route.body);
    }
    try {
      const res = await fetch(base + route.path, options);
      const text = await res.text();
      const preview = text.replace(/\s+/g, ' ').slice(0, 220);
      console.log(`${route.method} ${route.path} => ${res.status} ${preview}`);
    } catch (err) {
      console.log(`${route.method} ${route.path} => ERROR ${err.message}`);
    }
  }
})();
