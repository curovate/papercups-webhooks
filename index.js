const express = require('express');
const app = express()

app.use(express.json())
app.use(express.urlencoded({extended: true}))

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀  Server listening on port ${port}`);
});
const api = express.Router();

app.get('/', (req, res) => {
  res.send('home')
})


api.post('/webhook/getCustomerData', (req, res) => {
  console.log('Webhook event:', req.body)

  return res.send('message sent')
})

app.post('/api/webhook', (req, res) => {
  const {event, payload} = req.body;

  switch (event) {
    case 'webhook:verify':
      // Alternatively, this will work as well:
      // return res.json({challenge: payload})

      // Respond with the random string in the payload
      return res.send(payload);
    case 'message:created':
    case 'conversation:created':
    case 'customer:created':
      // TODO: handle events here!
      return res.json({ok: true});
  }
});