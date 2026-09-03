const API = {

  async get(action, params = {}) {

    const query = new URLSearchParams({
      action,
      ...params
    });

    const url =
      `${CONFIG.API_URL}?${query.toString()}`;

    const response =
      await fetch(url);

    if (!response.ok) {
      throw new Error(
        `HTTP Error: ${response.status}`
      );
    }

    const result =
      await response.json();

    if (!result.success) {
      throw new Error(
        result.message || 'API Error'
      );
    }

    return result.data;
  },


  async post(action, data = {}) {

    const response =
      await fetch(
        CONFIG.API_URL,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'text/plain;charset=utf-8'
          },

          body: JSON.stringify({
            action,
            ...data
          })
        }
      );


    if (!response.ok) {

      throw new Error(
        `HTTP Error: ${response.status}`
      );

    }


    const result =
      await response.json();


    if (!result.success) {

      const error =
        new Error(
          result.message ||
          'API Error'
        );

      error.code =
        result.code || '';

      throw error;

    }


    return result.data;

  }

};
