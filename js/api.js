const API = {

  // POST actions that are safe to retry automatically because they are read-only /
  // idempotent. EVERY other POST is a mutation (create / update / submit / approve …)
  // and must run at most once — a transient GAS redirect 404 must NOT re-send it,
  // otherwise the server, which already ran the first request, creates duplicate rows.
  _IDEMPOTENT_POST: ['login', 'validateSession', 'logout', 'getMyProfile'],

  _sleep(ms) { return new Promise(r => setTimeout(r, ms)); },

  // Sends a request. Retries transient failures (GAS redirect 404 / 5xx / network) ONLY
  // when allowRetry is true. A valid JSON error (success:false, has code) is a real app
  // error and is never retried.
  async _send(doFetch, allowRetry) {
    let lastErr;
    const max = allowRetry ? 2 : 0;                 // 3 attempts when retrying, 1 otherwise
    for (let attempt = 0; attempt <= max; attempt++) {
      if (attempt) await this._sleep(700 * attempt);   // 0ms, 700ms, 1400ms
      try {
        const response = await doFetch();
        if (!response.ok) {
          lastErr = new Error(`HTTP Error: ${response.status}`);
          if (allowRetry && (response.status === 404 || response.status >= 500)) continue;   // transient -> retry
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
        lastErr = err;                    // network / parse / HTTP error
        if (!allowRetry) throw lastErr;   // mutation -> surface at once, never re-send
      }
    }
    throw lastErr || new Error('Request failed');
  },

  // GET is read-only -> always safe to retry transient failures.
  async get(action, params = {}) {
    return this._send(() => {
      const query = new URLSearchParams({ action, ...params, _ts: Date.now() });
      return fetch(`${CONFIG.API_URL}?${query.toString()}`, { cache: 'no-store', redirect: 'follow' });
    }, true);
  },

  // POST retries only the whitelisted idempotent actions; all mutations run exactly once.
  async post(action, data = {}) {
    const allowRetry = this._IDEMPOTENT_POST.indexOf(action) !== -1;
    return this._send(() => fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...data })
    }), allowRetry);
  }
};
