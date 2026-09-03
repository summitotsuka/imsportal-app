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

    const token =
      this.getToken();


    if (token) {

      try {

        await API.post(
          'logout',
          {
            token
          }
        );

      } catch (error) {

        console.warn(
          'Logout API failed:',
          error
        );

      }

    }


    this.clearSession();

    window.location.reload();

  }

};
