const express = require('express');
const app = express()

app.use(express.json())
app.use(express.urlencoded({extended: true}))

const api = express.Router();

api.post('/webhook/getCustomerData', (req, res) => {
  console.log('Webhook event:', req.body)
})