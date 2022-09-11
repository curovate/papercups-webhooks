const request = require('superagent');

const BASE_URL = process.env.PAPERCUPS_BASE_URL || 'https://app.papercups.io';

// TODO: this is just a hacky wrapper around the Papercups API
class Papercups {
  constructor(token) {
    this.token = token;
  }

  static init = (token) => {
    return new Papercups(token);
  };

  sendMessage = async (params) => {
    const token = this.token;

    if (!token) {
      throw new Error('Invalid token!');
    }

    return request
      .post(`${BASE_URL}/api/v1/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({message: params})
      .then((res) => res.body.data);
  };

  fetchConversation = async (conversationId) => {
    const token = this.token;

    if (!token) {
      throw new Error('Invalid token!');
    }

    return request
      .get(`${BASE_URL}/api/v1/conversations/${conversationId}`)
      .set('Authorization', `Bearer ${token}`)
      .then((res) => res.body.data);
  };
}

module.exports = Papercups.init;