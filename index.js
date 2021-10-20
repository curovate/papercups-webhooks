const express = require('express');
const app = express()
const Papercups = require('./papercups')(process.env.PAPERCUPS_API_KEY)

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

const handleMessageCreated = async (res, message) => {
  console.log('messageData:', message)
  const {conversation_id, metadata, name} = message;
  console.log('id and payload', conversation_id, metadata, name)
  try {
    await Papercups.sendMessage({
      conversation_id,
      body: `Hi ${name}! We'll get back to you soon. I understand you had a ${metadata.surgery} of type ${metadata.surgeryType}. Is this correct?`
    })
  } catch (error) {
    console.error(error)
  }
}

app.post('/', (req, res) => {
  const {event, payload} = req.body;

  switch (event) {
    case 'webhook:verify':
      // Alternatively, this will work as well:
      // return res.json({challenge: payload})

      // Respond with the random string in the payload

      return res.send(payload);
    case 'message:created':
      return  handleMessageCreated(res, payload)
    case 'conversation:created':
    case 'customer:created':
      // TODO: handle events here!
      // return res.json({ok: true});
  }
})