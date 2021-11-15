const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
require('dotenv').config();
const Papercups = require('./papercups')(process.env.PAPERCUPS_API_KEY)
const admin = require("firebase-admin")
const { Sequelize, QueryTypes } = require('sequelize');
const { Server } = require("socket.io");
const io = new Server(server);
const serviceAccountJSON = require('./serviceAccount')
const serviceAccount = JSON.parse(JSON.stringify(serviceAccountJSON.serviceAccount))

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
// const api = express.Router();

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
  // NOTE: requiring a database is optional
  // databaseURL: 
})

const message = (token, messageContent) => {
  return (
    {
  notification: {
    title: 'You have a new message from Curovate',
    body: messageContent.length < 30 ? messageContent : `${messageContent.substring(0, 30)}...`
  },
  data: {

  },
  android: {
    notification: {
      sound: 'default'
    }
  },
  apns: {
    payload: {
      aps: {
        sound: 'default'
      }
    }
  }, 
  token: token
}
)}

const data = (token, data) => {
  return (
    {
      "token": token,
        "data": {
          "title": "New message from Curovate",
          "body": "This message is to update the app icon badge",
          "icon": "https://shortcut-test2.s3.amazonaws.com/uploads/role_image/attachment/10461/thumb_image.jpg",
          "link": "https://yourapp.com/somewhere",
          "unreadMsgs": data.toString()
        }
    }
)} 

admin.messaging().send(data("fYZqenUdlUWVq5aVz6crUZ:APA91bG06o_FISQNzsyFTt0-gZnvitU4rH4qfISPJkC4Kiyi5KDMd0wgAdSV0_Bt3dWwaZjXsSDPU7Un9PN4VJW5_x_ekaXFMZ3L175UFrd5EXQ7usBshkCzgkT0mszTNhB5u-ZQ38dg", "5"))
  .then(response => {
    console.log('Successfully sent message:', response)
  })
  .catch(error => {
    console.log('Error sending message: ', error)
  })

// admin.messaging().send(message("fYZqenUdlUWVq5aVz6crUZ:APA91bG06o_FISQNzsyFTt0-gZnvitU4rH4qfISPJkC4Kiyi5KDMd0wgAdSV0_Bt3dWwaZjXsSDPU7Un9PN4VJW5_x_ekaXFMZ3L175UFrd5EXQ7usBshkCzgkT0mszTNhB5u-ZQ38dg"))
//   .then(response => {
//     console.log('Successfully sent message:', response)
//   })
//   .catch(error => {
//     console.log('Error sending message: ', error)
//   })


let onlineUsers = {}

io.on('connection', (socket) => {
  console.log('onlineUsers:', onlineUsers)

  socket.on('online',()=>{
    //do nothing
  })

  socket.on("sendEmail", (email) => {
    onlineUsers[email] = socket.id
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

const sendNotificationAddUnreadMsgs = async (conversation_id, messageContent) => {
  console.log(messageContent)
  try {
    const customer =  await sequelize.query(`SELECT customer_id FROM conversations WHERE id = '${conversation_id}'`, { type: QueryTypes.SELECT });
    const userEmail = await sequelize.query(`SELECT email FROM customers WHERE id = '${customer[0].customer_id}'`, { type: QueryTypes.SELECT})
    await sequelize.query(`UPDATE customers SET unread_msgs = unread_msgs + 1 WHERE id = '${customer[0].customer_id}'`, { type: QueryTypes.UPDATE})
    const numberOfUnreadMsgs = await sequelize.query(`SELECT unread_msgs FROM customers WHERE id = '${customer[0].customer_id}'`, { type: QueryTypes.SELECT})
    const fbToken = await sequelize.query(`SELECT token FROM firebase_tokens WHERE email ='${userEmail[0].email}'`, { type: QueryTypes.SELECT })
    console.log(`sending unread message number ${numberOfUnreadMsgs[0].unread_msgs} to:`, onlineUsers[userEmail[0].email], ` at email ${userEmail[0].email} at token ${fbToken[0].token}`)
    io.to(onlineUsers[userEmail[0].email]).emit('updateUnreadMsgs', `${numberOfUnreadMsgs[0].unread_msgs}`)
    console.log(fbToken[0].token)
    admin.messaging().send(message(fbToken[0].token, messageContent))
    .then(response => {
      console.log('Successfully sent message:', response)
    })
    .catch(error => {
      console.log('Error sending message: ', error)
    })

    admin.messaging().send(data(fbToken[0].token), numberOfUnreadMsgs)
    .then(response => {
      console.log('Successfully sent data message:', response)
    })
    .catch(error => {
      console.log('Error sending data message: ', error)
    })

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
      sendNotificationAddUnreadMsgs(payload.conversation_id, payload.body)
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

app.get('/fbtokens/:email', async (req, res) => {
  const email = req.params.email
  const fbToken = await sequelize.query(`SELECT fb_token FROM firebase_tokens WHERE email = '${email}'`, { type: QueryTypes.SELECT})
  res.json({ fbToken })
})

app.post('/fbtokens', async (req, res) => {
  const { email, token }  = req.body
  console.log('updating tokens...the body is:', req.body)
  const isToken = await sequelize.query(`SELECT EXISTS(SELECT token FROM firebase_tokens WHERE email = '${email}')`, { type: QueryTypes.SELECT })
  console.log(isToken[0].exists)
  if (isToken[0].exists) {
    console.log('updating user with a new token:', token)
    await sequelize.query(`UPDATE firebase_tokens SET token = '${token}' WHERE email = '${email}'`, { type: QueryTypes.UPDATE })
    res.json({ result: 'successfully updated token to the database' })
  } else {
    console.log('inserting a new row for a token:', token)
    const insertTokenRow = await sequelize.query(`INSERT INTO firebase_tokens (email, updated_at, token) VALUES ('${email}', current_timestamp, '${token}')`, { type: QueryTypes.INSERT })
    console.log(insertTokenRow)
    res.json({ result: 'successfully inserted token to the database' })
  }
})

