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
  res.send('This is the home for the webhooks for Curovate Chat')
})

// app.post('/token/:id', (req, res) => {
//   const secret = req.params.id
//   console.log(secret)
//   axios.request({
//     method: 'POST',
//     url: 'https://dev-e8dt7y4d.auth0.com/oauth/token',
//     headers: {'content-type': 'application/x-www-form-urlencoded'},
//     data: {
//       grant_type: 'client_credentials',
//       client_id: 'yANAa51nVd7oKwdD3keAIeqKAjbUMqPx',
//       client_secret: secret,
//       audience: 'https://dev-e8dt7y4d.auth0.com/api/v2/'
//     }
//   })
//   .then(function (response) {
//     console.log(response.data);
//   }).catch(function (error) {
//     console.error(error);
//   });
// })



api.post('/webhook/getCustomerData', (req, res) => {
  console.log('Webhook event:', req.body)

  return res.send('message sent')
})

// const handleMessageCreated = async (res, message) => {
//   console.log('messageData:', message)
//   const {conversation_id, customer, body} = message;
//   const surgeryDetails = customer.email.split(',')
//   if (body.toLowerCase() === 'physio') {
//     try {
//       await Papercups.sendMessage({
//         conversation_id,
//         body: `Hi ${customer.name}. We'll get back to you soon! Just to verify, you had a ${surgeryDetails[0]}-${surgeryDetails[1]}. Is this correct?`
//         // body: `Hi ${name}! We'll get back to you soon. I understand you had a ${metadata.surgery} of type ${metadata.surgeryType}. Is this correct?`
//       })
//     } catch (error) {
//       console.error(error)
//     }
//   } else if (body.toLowerCase() === 'app') {
//     try {
//       await Papercups.sendMessage({
//         conversation_id,
//         body: `Hi ${customer.name}. We'll get back to you soon! In the meantime, can you describe what you need help with?`
//       })
//     } catch (error) {
//       console.error(error)
//     }
//   }
// }

const sendNotification = () => {
  console.log('this is where we should write to the DB')
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
      console.log(payload.customer)
      if (payload.user.toLowerCase().includes('Physical Therapist')) {
        sendNotification()
      }
    case 'conversation:created':

    case 'customer:created':
      // TODO: handle events here!
      // return res.json({ok: true});
  }
})