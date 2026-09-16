const API = {

  _sleep(ms) { return new Promise(r => setTimeout(r, ms)); },

  // Sends a request with automatic retry on transient failures (GAS redirect 404 / 5xx / network).
  // A valid JSON error response (success:false, has code) is a real app error and is NOT retried.
  async _send(doFetch) {
    let lastErr;
    for (let attempt = 0; attempt <= 2; attempt++) {
      if (attempt) await this._sleep(700 * attempt);   // 0ms, 700ms, 1400ms
      try {
        const response = await doFetch();
        if (!response.ok) {
          lastErr = new Error(`HTTP Error: ${response.status}`);
          if (response.status === 404 || response.status >= 500) continue;   // transient -> retry
          throw lastErr;
        }
        const result = await response.json();
        if (!result.success) {
          const error = new Error(result.message || 'API Error');
          error.code = result.code || 'API_ERROR';
          throw error;
        }
        return result.data;
      } catch (err) {
        if (err && err.code) throw err;   // real application error -> do not retry
        lastErr = err;                    // network / parse / HTTP error -> retry
      }
    }
    throw lastErr || new Error('Request failed');
  },

  async get(action, params = {}) {
    return this._send(() => {
      const query = new URLSearchParams({ action, ...params, _ts: Date.now() });
      return fetch(`${CONFIG.API_URL}?${query.toString()}`, { cache: 'no-store', redirect: 'follow' });
    });
  },

  async post(action, data = {}) {
    return this._send(() => fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...data })
    }));
  }

};
