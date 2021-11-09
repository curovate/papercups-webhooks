const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
require('dotenv').config();
const Papercups = require('./papercups')(process.env.PAPERCUPS_API_KEY)
const { Sequelize, QueryTypes } = require('sequelize');
const { Server } = require("socket.io");
const io = new Server(server);

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: {
      ssl: {
          require: true,
          rejectUnauthorized: false
      }
  }
});

app.use(express.json())
app.use(express.urlencoded({extended: true}))

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`🚀  Server listening on port ${port}`);
});
const api = express.Router();

let onlineUsers = {}

io.on('connection', (socket) => {
  console.log('onlineUsers:', onlineUsers)

  socket.on("sendEmail", (email) => {
    console.log('online users:', onlineUsers)
  })

  io.to(socket.id).emit('private', `hello user with id of ${socket.id}`)

  socket.on("disconnect", () => {
    console.log(`user ${socket.id} has disconnected`)
  })

  socket.on("error", (err) => {
    console.error(err)
    socket.disconnect();
  })

});

const makeConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}

makeConnection()

app.get('/', (req, res) => {
  res.send('This is the home for the webhooks for Curovate Chat')
})

const sendNotificationAddUnreadMsgs = async (conversation_id) => {
  try {
    const customer =  await sequelize.query(`SELECT customer_id FROM conversations WHERE id = '${conversation_id}'`, { type: QueryTypes.SELECT });
    const userEmail = await sequelize.query(`SELECT email FROM customers WHERE id = '${customer[0].customer_id}'`, { type: QueryTypes.SELECT})
    await sequelize.query(`UPDATE customers SET unread_msgs = unread_msgs + 1 WHERE id = '${customer[0].customer_id}'`, { type: QueryTypes.UPDATE})
    const numberOfUnreadMsgs = await sequelize.query(`SELECT unread_msgs FROM customers WHERE id = '${customer[0].customer_id}'`, { type: QueryTypes.SELECT})
    console.log('sending message to: ', onlineUsers[userEmail[0].email], ` at email ${userEmail[0].email}`)
    io.to(onlineUsers[userEmail[0].email]).emit('updateUnreadMsgs', `${numberOfUnreadMsgs[0].unread_msgs}`)
    return {
      unreadMsgs: numberOfUnreadMsgs[0].unread_msgs,
      email: userEmail[0].email,
    }
  } catch (error) {
    console.error(error)
  }
}

const markMsgsAsRead = async (customerEmail) => {
  try {
    await sequelize.query(`UPDATE customers SET unread_msgs = 0 WHERE email = '${customerEmail}'`, { type: QueryTypes.UPDATE})
    console.log('messages have been cleared')
  } catch (error) {
    console.error(error)
  }
}


app.post('/', (req, res) => {
  const {event, payload} = req.body;

  switch (event) {
    case 'webhook:verify':

      return res.send(payload);
    case 'message:created':
      // console.log('PAYLOAD INFO:', payload)
      // console.log('CUSTOMER INFO:', payload.customer ? payload.customer : null)
      // console.log('USER INFO:', payload.user ? payload.user : null)
    if (payload.user) {
      sendNotificationAddUnreadMsgs(payload.conversation_id)
    }
    case 'conversation:created':

    case 'customer:created':
  }
})

app.post('/markmsgsasread/:email', (req, res) => {
  const email = req.params.email
  markMsgsAsRead(email)
  res.json({ unreadMsgs: 0})
})

app.get('/getunreadmsgs/:email', async (req, res) => {
  const email = req.params.email
  const unreadMsgs = await sequelize.query(`SELECT unread_msgs FROM customers WHERE email = '${email}'`, { type: QueryTypes.SELECT})
  res.json({ unreadMsgs })
})