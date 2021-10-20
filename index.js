const express = require('express');
const app = express()

app.use(express.json())
app.use(express.urlencoded({extended: true}))

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀  Server listening on port ${port}`);
});
const api = express.Router();



api.post('/webhook/getCustomerData', (req, res) => {
  console.log('Webhook event:', req.body)
  return res.send(req.body)
})