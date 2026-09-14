const AUTH = {

  STORAGE_KEY: 'ims_session',


  getToken() {

    return sessionStorage.getItem(
      this.STORAGE_KEY
    );

  },


  getUser() {

    const raw =
      sessionStorage.getItem(
        'ims_user'
      );

    if (!raw) {
      return null;
    }

    try {

      return JSON.parse(raw);

    } catch (error) {

      return null;

    }

  },


  setSession(data) {

    sessionStorage.setItem(
      this.STORAGE_KEY,
      data.token
    );


    sessionStorage.setItem(
      'ims_user',
      JSON.stringify(
        data.user
      )
    );

  },


  clearSession() {

    sessionStorage.removeItem(
      this.STORAGE_KEY
    );

    sessionStorage.removeItem(
      'ims_user'
    );

  },


  async login(
    username,
    password
  ) {

    const data =
      await API.post(
        'login',
        {
          username,
          password
        }
      );


    this.setSession(data);

    return data;

  },


  async logout() {

    const token = this.getToken();

    // clear local session immediately so the UI can switch without waiting
    this.clearSession();
    if (typeof _profileCache !== 'undefined') { try { _profileCache = null; _profilePromise = null; } catch (e) { } }

    // tell the server without blocking (sendBeacon survives the reload)
    if (token) {
      try {
        const blob = new Blob(
          [JSON.stringify({ action: 'logout', token: token })],
          { type: 'text/plain;charset=utf-8' }
        );
        if (navigator.sendBeacon) navigator.sendBeacon(CONFIG.API_URL, blob);
        else fetch(CONFIG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'logout', token: token }), keepalive: true }).catch(function () { });
      } catch (e) { }
    }

    window.location.reload();

  }

};
