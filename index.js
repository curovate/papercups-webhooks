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
const cors = require('cors')
const moment = require('moment')
const { v4: uuidv4 } = require('uuid');
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
  omitNull: true
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

// NOTE: when creating a customer row for a non-existent customer, it adds Nirtal's Papercups account_id for the Heroku-deployed version.
//  If creating a new version of the portal then the account_id needs to be changed
app.post("/create_conversation", async (req, res) => {
  const { name, email, account_id, surgery } = req.body
  const messageName = name.split('---')[0].includes("@") ? name.split('---')[0].split("@")[0] : name.split('---')[0].split(" ")[0]

  const customer = await sequelize.query(
    `SELECT * FROM customers WHERE name = '${name}'`,
    { type: QueryTypes.SELECT }
  )
    let customerId
    let conversationId
    let message
    try {
      if (customer.length === 0) {
        customerId = await sequelize.query(`INSERT INTO customers(
          id, first_seen, account_id, inserted_at, updated_at, email, name, external_id) 
          VALUES (
            '${uuidv4()}', '${moment().utc().format("YYYY-MM-DD")}', '4833cee6-6440-4524-a0f2-cf6ad20f9737', '${moment().utc().format("YYYY-MM-DD HH:mm:ss")}', '${moment().utc().format("YYYY-MM-DD HH:mm:ss")}', '${email}', '${name}', '${account_id}') RETURNING id;
            `)
        conversationId = await sequelize.query(`INSERT INTO conversations(
          id, inserted_at, updated_at, assignee_id, account_id, customer_id, source, inbox_id, read) 
          VALUES ('${uuidv4()}', '${moment().utc().format("YYYY-MM-DD HH:mm:ss")}', '${moment().utc().format("YYYY-MM-DD HH:mm:ss")}', 1, '4833cee6-6440-4524-a0f2-cf6ad20f9737', '${customerId[0][0].id}', 'chat', '30b841e1-1a39-49a4-a81b-41e964be699c', 'true') RETURNING id;
          `)
        message = await sequelize.query(`INSERT INTO messages(
          id, inserted_at, updated_at, body, conversation_id, account_id, user_id, source) 
          VALUES (
            '${uuidv4()}', '${moment().utc().format("YYYY-MM-DD HH:mm:ss")}', '${moment().utc().format("YYYY-MM-DD HH:mm:ss")}', 'Hi ${messageName}, do you have any questions about your ${surgery ? surgery : ''} recovery?', '${conversationId[0][0].id}', '4833cee6-6440-4524-a0f2-cf6ad20f9737', 1, 'chat')`)
      } else {
        console.log(`the customer ${name} exists`)
      }
    } catch (error) {
      console.error(error)
    }

  res.json({ customer, customerId, conversationId, message })
})

/*
These are automated messages that are created when a user first opens the app, completes their first day of exercise, or completes their first measurement
*/
app.post("/automated_message", async (req, res) => {
  console.log('request body:', req.body )
  const { name, email, extension, flexion, type } = req.body
  try {
    const customer = await sequelize.query(
      `SELECT * FROM customers WHERE name = '${name}'`,
      { type: QueryTypes.SELECT }
    ) 
    
    let message
    if (customer.length === 0) {
      const customerId = await sequelize.query(`SELECT * FROM customers WHERE email = '${email}' FETCH FIRST ROW ONLY`,  { type: QueryTypes.SELECT })
      const conversationId = await sequelize.query(`SELECT * FROM conversations WHERE customer_id = '${customerId[0].id}' FETCH FIRST ROW ONLY`,  { type: QueryTypes.SELECT })
      
      const messageName = name.includes("@") ? name.split("@")[0] : name.split(" ")[0]

      await sequelize.query(`UPDATE conversations SET updated_at = '${moment().utc().format("YYYY-MM-DD HH:mm:ss")}', last_activity_at = '${moment().utc().format("YYYY-MM-DD HH:mm:ss")}' WHERE id = '${conversationId[0].id}'`)
      
      if (type === 'first_knee_measurement') {
        
        let submessage
        if (flexion === false) {
          submessage = `your knee extension is ${extension}`
        } else if (extension === false) {
          submessage = `your knee flexion is ${flexion}`
        } else {
          submessage = `your knee flexion is ${flexion} and your knee extension is ${extension}`
        }

        message = await sequelize.query(`INSERT INTO messages(
          id, inserted_at, updated_at, body, conversation_id, account_id, user_id, source) 
          VALUES (
            '${uuidv4()}', '${moment().utc().format("YYYY-MM-DD HH:mm:ss")}', '${moment().utc().format("YYYY-MM-DD HH:mm:ss")}', 'Hi ${messageName}, great job completing your first measurement. It looks like ${submessage}. Send me a message if you have any questions about your knee measurements.', '${conversationId[0].id}', '4833cee6-6440-4524-a0f2-cf6ad20f9737', 1, 'chat')`)
        
        // NEW CODE --- 11/09/2022 - commented out the update for the conversations table so that the automated message does not show up as a new message in the web portal 
        // await sequelize.query(`UPDATE conversations SET updated_at = '${moment().utc().format("YYYY-MM-DD HH:mm:ss")}' WHERE customer_id = '${customerId[0].id}'`)

        await sequelize.query(
          `UPDATE customers SET unread_msgs = unread_msgs + 1 WHERE id = '${customerId[0].id}'`,
          { type: QueryTypes.UPDATE }
        )
        res.json({ message })
      } else if (type === 'first_hip_measurement') {
        
        let submessage
        if (flexion === false) {
          submessage = `your hip extension is ${extension}`
        } else if (extension === false) {
          submessage = `your hip flexion is ${flexion}`
        } else {
          submessage = `your hip flexion is ${flexion} and your hip extension is ${extension}`
        }

        message = await sequelize.query(`INSERT INTO messages(
          id, inserted_at, updated_at, body, conversation_id, account_id, user_id, source) 
          VALUES (
            '${uuidv4()}', '${moment().utc().format("YYYY-MM-DD HH:mm:ss")}', '${moment().utc().format("YYYY-MM-DD HH:mm:ss")}', 'Hi ${messageName}, great job completing your first measurement. It looks like ${submessage}. Send me a message if you have any questions about your hip measurements.', '${conversationId[0].id}', '4833cee6-6440-4524-a0f2-cf6ad20f9737', 1, 'chat')`)
        await sequelize.query(
          `UPDATE customers SET unread_msgs = unread_msgs + 1 WHERE id = '${customerId[0].id}'`,
          { type: QueryTypes.UPDATE }
        )

        // NEW CODE --- 11/09/2022 - commented out the update for the conversations table so that the automated message does not show up as a new message in the web portal 
        // await sequelize.query(`UPDATE conversations SET updated_at = '${moment().utc().format("YYYY-MM-DD HH:mm:ss")}' WHERE customer_id = '${customerId[0].id}'`)

        res.json({ message })
      } else if (type === 'first_day_of_exercise') {
        message = await sequelize.query(`INSERT INTO messages(
          id, inserted_at, updated_at, body, conversation_id, account_id, user_id, source) 
          VALUES (
            '${uuidv4()}', '${moment().utc().format("YYYY-MM-DD HH:mm:ss")}', '${moment().utc().format("YYYY-MM-DD HH:mm:ss")}', 'Hi ${messageName}, you just finished your first exercise session using Curovate. Send me a message if you have any questions about your exercises or just to let me know how the first session went.', '${conversationId[0].id}', '4833cee6-6440-4524-a0f2-cf6ad20f9737', 1, 'chat')`)
        await sequelize.query(
          `UPDATE customers SET unread_msgs = unread_msgs + 1 WHERE id = '${customerId[0].id}'`,
          { type: QueryTypes.UPDATE }
        )

        // NEW CODE --- 11/09/2022 - commented out the update for the conversations table so that the automated message does not show up as a new message in the web portal 
        // await sequelize.query(`UPDATE conversations SET updated_at = '${moment().utc().format("YYYY-MM-DD HH:mm:ss")}' WHERE customer_id = '${customerId[0].id}'`)

        res.json({ message })

      } else {
        res.json({ error: 'no message type specified' })
      }
    } else {
      res.json({error: 'no such customer exists'})
    }
  } catch (error) {
    console.error(error)
    res.json({ error })
  }
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
    res.json({ result: "successfully inserted token to the database" })
  }
})

app.post("/update_metadata", async (req, res) => {
  const { email, age, gender, surgery, surgeryType, daysSinceSurgery, injuryDate, daysSinceInjury, isPaid, isFirstDay, subscriberType, planPrice, devicePlatform, country, city, timeSpent, openTimes, complianceAverage, flexionAverage, extensionAverage, daysOfExercise, sessionsOfExercise, stagesCompleted, DOB} = req.body

  const isConversationExists = await sequelize.query(
    `SELECT * FROM customers WHERE email = '${email}'`, { type: QueryTypes.SELECT }
  ).catch(err => console.error(err))

  if (isConversationExists.length === 1) {
    try {
      await sequelize.query(
        `UPDATE customers SET metadata = 
          '{"age": "${age}", "gender": "${gender}", "surgery": "${surgery}", "surgeryType": "${surgeryType}", "daysSinceSurgery": "${daysSinceSurgery}", "injuryDate": "${injuryDate}", "daysSinceInjury": "${daysSinceInjury}", "isPaid": "${isPaid}", "isFirstDay": "${isFirstDay}", "subscriberType": "${subscriberType}", "planPrice": "${planPrice}", "devicePlatform": "${devicePlatform}", "country": "${country}", "city": "${city}", "timeSpent": "${timeSpent}", "openTimes": "${openTimes}", "complianceAverage": "${complianceAverage}", "flexionAverage": "${flexionAverage}", "extensionAverage": "${extensionAverage}", "daysOfExercise": "${daysOfExercise}", "sessionsOfExercise": "${sessionsOfExercise}", "stagesCompleted": "${stagesCompleted}", "DOB": "${DOB}"}' 
          WHERE email = '${email}'`, { type: QueryTypes.UPDATE }  
      )
      res.json({ result: "successfully updated metadata in Papercups profile"})
    } catch (error) {
      res.json({ error: `Error updating metadata in Papercups profile: ${error}` })
    }
  } else {
    res.json({ result: "Did not update metadata. No such user exists"})
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

app.use(cors())

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
    const link = process.env.GOOGLE_SHEETS_ID
  
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

app.post('/subscribe', newPostLimiter, async (req, res) => {

  const { subscriptionEmail } = req.body
  console.log(subscriptionEmail)
  
  const auth = await google.auth.getClient( { scopes: ['https://www.googleapis.com/auth/spreadsheets']});
  const sheets = google.sheets({ version: 'v4', auth })

  const range = `Sheet1!A1`
  const link = process.env.GOOGLE_SHEETS_ID
  

  const response = await sheets.spreadsheets.values.append({
    spreadsheetId: link,
    range,
    valueInputOption: "RAW",
    resource: {
      "majorDimension": "COLUMNS",
      "values": [[subscriptionEmail]] 
    }
  }, (err, result) => {
    if (err) {
      console.log(err);
    } else {
      console.log(`${result.data.tableRange} cells appended.`);
    }
  })

  const data = {
    from: "Nirtal Shah <nirtal@curovate.com>",
    to: subscriptionEmail,
    bcc: ["nirtal@curovate.com", "wilsonfong1002@outlook.com"],
    subject: "Thank you for subscribing to our blog!",
    template: "new_blog_subscriber",
  };

  mg.messages().send(data, function (error, body) {
    if (error) {
      console.error(error)
    } else {
      console.log(body);
    }
  });

  res.json({ success: true })
})

app.get('/webinars', async (req, res) => {
  try {
    const auth = await google.auth.getClient( { scopes: ['https://www.googleapis.com/auth/spreadsheets']});
    const sheets = google.sheets({ version: 'v4', auth })


    const link = process.env.GOOGLE_SHEETS_WEBINARS_ID
    const range = `Sheet1!A:H`

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: link,
      range
    })

    res.json({ webinars: response.data.values })
  } catch (error) {
    console.error(error)
  }
})

