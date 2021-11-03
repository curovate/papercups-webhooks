var axios = require("axios").default;

var options = {
  method: 'POST',
  url: 'https://dev-e8dt7y4d.auth0.com/dbconnections/change_password',
  headers: {'content-type': 'application/json'},
  data: {
    client_id: 'yANAa51nVd7oKwdD3keAIeqKAjbUMqPx',
    email: 'wilsonfong1002@outlook.com',
    connection: 'Username-Password-Authentication'
  }
};

axios.request(options).then(function (response) {
  console.log(response.data);
}).catch(function (error) {
  console.error(error);
});