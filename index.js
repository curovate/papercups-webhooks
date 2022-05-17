// Summary:
// This code uses socket.io for real-time message count update when the user has the app in the background
// It also handles sending notifications to users when they have received a message from Papercups
// It also is used for validating Android subscription receipts

const express = require("express")
const app = express()
const http = require("http")
const server = http.createServer(app)
require("dotenv").config()
const Papercups = require("./papercups")(process.env.PAPERCUPS_API_KEY)
const admin = require("firebase-admin")
const { Sequelize, QueryTypes } = require("sequelize")
const { Server } = require("socket.io")
const io = new Server(server)
const serviceAccountJSON = require("./serviceAccount")
const serviceAccount = JSON.parse(
  JSON.stringify(serviceAccountJSON.serviceAccount)
)
const serviceAccountAndroidJSON = require("./serviceAccountAndroidReceipts")
const serviceAccountAndroidReceipt = JSON.parse(
  JSON.stringify(serviceAccountAndroidJSON.serviceAccountAndroidReceipt)
)
const { google } = require("googleapis")
const mailgun = require("mailgun-js");
const DOMAIN = "curovate.com";
const mg = mailgun({apiKey: process.env.MAILGUN_API_KEY, domain: DOMAIN});
const rateLimit = require('express-rate-limit')
const GhostContentAPI = require('@tryghost/content-api');
// --- SETUP ---

// initialize the DB
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  protocol: "postgres",
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
})

// connect to the DB
const makeConnection = async () => {
  try {
    await sequelize.authenticate()
    console.log("Connection has been established successfully.")
  } catch (error) {
    console.error("Unable to connect to the database:", error)
  }
}

makeConnection()

// Express middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Set up port for listening for events
// process.env.PORT will allow the app to connect to Heroku
const port = process.env.PORT || 3000
server.listen(port, () => {
  console.log(`🚀  Server listening on port ${port}`)
})

// initialize Firebase for notifications
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

// template for notification messages
const message = (token, messageContent) => {
  return {
    notification: {
      title: "You have a new message from Curovate",
      body:
        messageContent.length < 30
          ? messageContent
          : `${messageContent.substring(0, 35)}...`,
    },
    data: {},
    android: {
      notification: {
        sound: "default",
      },
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
        },
      },
    },
    token: token,
  }
}

// template for updating icon badge when a user gets a notification for an unread message
const data = (token, data) => {
  return {
    token: token,
    data: {
      title: "New message from Curovate",
      body: "This message is to update the app icon badge",
      icon: "https://shortcut-test2.s3.amazonaws.com/uploads/role_image/attachment/10461/thumb_image.jpg",
      link: "https://yourapp.com/somewhere",
      unreadMsgs: data.toString(),
    },
  }
}

// the onlineUsers object will store the IDs of users that have Curovate open
let onlineUsers = {}

// initialize socket.io
// socket.io is a library that listens to real time changes im the app
// when a user has Curovate open, their email address will be added to the onlineUsers object
// the onlineUsers object is used to get the user's email to send notifications
io.on("connection", socket => {
  console.log("onlineUsers:", onlineUsers)

  socket.on("online", () => {})

  socket.on("sendEmail", email => {
    onlineUsers[email] = socket.id
    console.log("online users:", onlineUsers)
  })

  io.to(socket.id).emit("private", `hello user with id of ${socket.id}`)

  socket.on("disconnect", () => {
    console.log(`user ${socket.id} has disconnected`)
  })

  socket.on("error", err => {
    console.error(err)
    socket.disconnect()
  })
})

// --- FUNCTIONS ---


// this function will send a notification to the user and increment the app icon badge
const sendNotificationAddUnreadMsgs = async (
  conversation_id,
  messageContent
) => {
  console.log(messageContent)
  try {
    // get the user's email, number of unread messages, and firebase token from the database
    const customer = await sequelize.query(
      `SELECT customer_id FROM conversations WHERE id = '${conversation_id}'`,
      { type: QueryTypes.SELECT }
    )
    const userEmail = await sequelize.query(
      `SELECT email FROM customers WHERE id = '${customer[0].customer_id}'`,
      { type: QueryTypes.SELECT }
    )
    await sequelize.query(
      `UPDATE customers SET unread_msgs = unread_msgs + 1 WHERE id = '${customer[0].customer_id}'`,
      { type: QueryTypes.UPDATE }
    )
    const numberOfUnreadMsgs = await sequelize.query(
      `SELECT unread_msgs FROM customers WHERE id = '${customer[0].customer_id}'`,
      { type: QueryTypes.SELECT }
    )
    const fbToken = await sequelize.query(
      `SELECT token FROM firebase_tokens WHERE email ='${userEmail[0].email}'`,
      { type: QueryTypes.SELECT }
    )
    console.log(
      `sending unread message number ${numberOfUnreadMsgs[0].unread_msgs} to:`,
      onlineUsers[userEmail[0].email],
      ` at email ${userEmail[0].email} at token ${fbToken[0].token}`
    )
    io.to(onlineUsers[userEmail[0].email]).emit(
      "updateUnreadMsgs",
      `${numberOfUnreadMsgs[0].unread_msgs}`
    )
    console.log(fbToken[0].token)

    // send the notification
    admin
      .messaging()
      .send(message(fbToken[0].token, messageContent))
      .then(response => {
        console.log("Successfully sent message:", response)
      })
      .catch(error => {
        console.log("Error sending message: ", error)
      })

    // increment the app icon badge
    admin
      .messaging()
      .send(data(fbToken[0].token, numberOfUnreadMsgs[0].unread_msgs))
      .then(response => {
        console.log("Successfully sent data message:", response)
      })
      .catch(error => {
        console.log("Error sending data message: ", error)
      })

    return {
      unreadMsgs: numberOfUnreadMsgs[0].unread_msgs,
      email: userEmail[0].email,
    }
  } catch (error) {
    console.error(error)
  }
}

// this function will reset the user's number of unread messages to 0
const markMsgsAsRead = async customerEmail => {
  try {
    await sequelize.query(
      `UPDATE customers SET unread_msgs = 0 WHERE email = '${customerEmail}'`,
      { type: QueryTypes.UPDATE }
    )
    console.log("messages have been cleared")
  } catch (error) {
    console.error(error)
  }
}

// --- ROUTES ---

// this is a test route and is used just for testing purposes
// if the app is deployed correctly, then it will return a simple HTML page with the message below
app.get("/", (req, res) => {
  res.send("This is the home for the webhooks for Curovate Chat")
})

// all messages sent through Papercups will run this post request
// the url of this app (curovate-webportal.herokuapp.com) was added to the "event subscriptions" menu in the web portal
app.post("/", (req, res) => {
  const { event, payload } = req.body
  switch (event) {
    case "webhook:verify":
      // TODO: add optional webhook for when an account is verified
      return res.send(payload)
    case "message:created":
      // TODO: add optional webhook for when a message is created

      // if the payload object includes a user attribute, which occurs when a message is sent from the web portal
      // then the sendNotificationAddUnreadMsgs function will run
      if (payload.user) {
        console.log("main endpoint reached. Sending notification to user...")
        sendNotificationAddUnreadMsgs(payload.conversation_id, payload.body)
      }
    case "conversation:created":
    // TODO: add optional webhook for when a conversation is created
    case "customer:created":
    // TODO: add optional webhook for when a customer is created
  }
})

// route to mark all messages as unread, resetting the number of unread messages to 0
// this runs whenever the user opens the Chat screen on Curovate
app.post("/markmsgsasread/:email", (req, res) => {
  const email = req.params.email
  markMsgsAsRead(email)
  res.json({ unreadMsgs: 0 })
})

// route to get the number of unread messages
// this runs when the user opens the app or puts the app in the background state
app.get("/getunreadmsgs/:email", async (req, res) => {
  const email = req.params.email
  const unreadMsgs = await sequelize.query(
    `SELECT unread_msgs FROM customers WHERE email = '${email}'`,
    { type: QueryTypes.SELECT }
  )
  res.json({ unreadMsgs })
})

// route to get the user's Firebase token. This runs when the user reopens the app
app.get("/fbtokens/:email", async (req, res) => {
  const email = req.params.email
  const fbToken = await sequelize.query(
    `SELECT fb_token FROM firebase_tokens WHERE email = '${email}'`,
    { type: QueryTypes.SELECT }
  )
  res.json({ fbToken })
})

// route to post the user's Firebase token on the database. This runs when the user first opens the app
app.post("/fbtokens", async (req, res) => {
  const { email, token } = req.body
  console.log("updating tokens...the body is:", req.body)
  const isToken = await sequelize.query(
    `SELECT EXISTS(SELECT token FROM firebase_tokens WHERE email = '${email}')`,
    { type: QueryTypes.SELECT }
  )
  console.log(isToken[0].exists)

  // if the user already has a token, then overwrite the existing token with the new one
  // if the user does not have a token, then add the token to the database
  if (isToken[0].exists) {
    console.log("updating user with a new token:", token)
    await sequelize.query(
      `UPDATE firebase_tokens SET token = '${token}' WHERE email = '${email}'`,
      { type: QueryTypes.UPDATE }
    )
    res.json({ result: "successfully updated token to the database" })
  } else {
    console.log("inserting a new row for a token:", token)
    const insertTokenRow = await sequelize.query(
      `INSERT INTO firebase_tokens (email, updated_at, token) VALUES ('${email}', current_timestamp, '${token}')`,
      { type: QueryTypes.INSERT }
    )
    console.log(insertTokenRow)
    res.json({ result: "successfully inserted token to the database" })
  }
})


// INCOMPLETE - this is trying to validate Android Play Store receipts on the server side
app.post("/validate_android_receipt", async (req, res) => {
  console.log(req.body)
  const data = req.body
  console.log('validating android receipt')
  const auth = new google.auth.GoogleAuth({
    keyFile: "api-8843549224472406297-496330-0d939b050704.json",
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  })
  console.log("data:", data["productId"], data["purchaseToken"])
  console.log('typeof auth', typeof auth)
  try {
    const result = await google.androidpublisher("v3").purchases.subscriptions.get({
      packageName: "cura.com.cura",
      subscriptionId: 'monthly_subscription',
      token: `hagabpffcjocjmengppdlodd.AO-J1OyNF7d3j8ocOBlbYmjZXMbE4WW2QcE8cU8kd5C1XgB2dESiW7vo-b_I0Pn_kekt_c_SJmZ4CiT2DcMSRotArbeSigF9CQ`,
      auth: auth
    })
    .then((result) => console.log('res from Android validation:', result))

    if (res.status === 200) {
      res.json({ validationSuccess: true })
    } else {
      res.json({ validationSuccess: false })
    }

  } catch (error) {
    console.error('error validating Android receipt:', error)
    res.json({ validationSuccess: false })
  }
})


const newPostLimiter = rateLimit({
	windowMs: 2 * 60 * 1000, // 2 minutes
	max: 1, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})

app.use('/api', newPostLimiter)

// const testMiddleware = () => {
//   console.log('testing middleware')
// }
// app.use('/ghost_new_post', testMiddleware)

const waitForBlogToPublish = (req, res, next) => {
  console.log('starting waitForBlogToPublish')
  setTimeout(() => {
    console.log('finishing waitForBlogToPublish')
    next()
  }, 10000)
}

app.post("/ghost_new_post", newPostLimiter,  async (req, res) => {
  console.log('running ghost webhook')
  res.json({ success: true })

  setTimeout(async () => {
    const api = new GhostContentAPI({
      url: 'https://curovate.com/blog',
      key: 'a0a55dea8c7ed03b59073c0ae4',
      version: "v2"
    });
  
    const newBlogPost = await api.posts
      .browse({
      limit: 1, 
      include: 'tags,authors',
    })

    console.log('latest blogpost:', newBlogPost)
  
    const auth = await google.auth.getClient( { scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']});
    const sheets = google.sheets({ version: 'v4', auth })
  
    const range = `Sheet1!A:A`
    const link = "1DrAhIdjFtpO57FjkMM4_qKLTVrrqrIORSWIbZ62N3S0"
  
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: link,
      range
    })
    
    console.log('google sheets values:', response.data.values)

    response.data.values.forEach(value => {
      const data = {
        from: "Nirtal Shah <nirtal@curovate.com>",
        to: value,
        subject: "Curovate has a new blog!",
        template: "new_blog_post",
        'h:X-Mailgun-Variables': JSON.stringify({blogUrl: newBlogPost[0].url, blogTitle: newBlogPost[0].title})
      };
    
      mg.messages().send(data, function (error, body) {
        if (error) {
          console.error(error)
        } else {
          console.log(body);
        }
      });
    })
  }, 10000)

})

app.post('/test', newPostLimiter, async (req, res) => {
  res.json({ success: true })
  console.log('middleware is complete')
  // res.json({ success: true })
})

