// 1. Including Packages
const express = require('express');
const hbs = require('express-handlebars');
const mongoose = require('mongoose');
const cors = require("cors");
const cookieParser = require('cookie-parser');
const logger = require('morgan');


// 2. Configurations
require('dotenv').config()


// 3. Application Initialization
var corsOptions = {
  origin: `http://{process.env.APP_HOST}:{process.env.APP_PORT}`
};

const app = express();
// front-end configurations
app.use(express.static('assets'));
app.set('view engine', 'hbs');
app.engine( 'hbs', hbs( {
  extname: 'hbs',
  layoutsDir: __dirname + '/views/layouts/',
  partialsDir: __dirname + '/views/partials/'
}));
// back-end configurations
app.use(cors(corsOptions));
app.use(cookieParser());
// setup logs in dev environment
app.use(logger('dev'));
// parse requests of content-type - application/json, application/x-www-form-urlencoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// 4. Force https in production
if (app.get('env') === 'production') {
  app.use(function(req, res, next) {
    var protocol = req.get('x-forwarded-proto');
    protocol == 'https' ? next() : res.redirect('https://' + req.hostname + req.url);
  });
}


// 5. Database Connection
const dbURI = `mongodb://${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex:true, useFindAndModify: false })
  .then(() => {
    console.log("Successfully connected to MongoDB.");
    
    // 6. Start the server, set port, listen for requests only when connected to DB
    const PORT = process.env.APP_PORT || 8081;
    app.listen(PORT, () => {
      console.log(`Server started on port ${PORT}.`);
      init_admin();
    });
  })
  .catch(err => {
    console.error("Connection error", err);
    process.exit();
  });


// 7. Routing
const authRoutes = require('./routes/authRoutes');
const panelRoutes = require('./routes/panelRoutes');
const { checkUser } = require('./middleware/authMiddleware');
const { isName } = require('./validationHelper');
const { isEmail } = require('validator');
const { sendMail } = require('./mailHelper');

app.get('/', checkUser, (req, res) => {
  res.render('home', {layout: 'default', title: 'Home'});
});
app.get('/error', (req, res) => {
  res.render('error', { layout: 'error', title: 'Error', errorName: req.query.type });
});
app.post('/contact-us', (req, res) => {
  const { name, email, subject, message } = req.body;
  const errors = {};
  
  // check validation and store errors
  if (!(name.length > 0) || !isName(name)) { errors.name = "Invalid Name"; }
  if (!(email.length > 0) || !isEmail(email)) { errors.email = "Invalid Email"; }
  if (subject.length < 4) { errors.subject = "Invalid Subject"; }
  if (message.length < 20) { errors.message = "Invalid Message"; }
  
  // if errors, return errors
  if (Object.keys(errors).length > 0) {
    res.status(400).json({errors});
  } else {
    // send email here
    res.render('mailer/contact-mail', { layout: 'mailer', name, message }, (err, compiledHTML) => {
      sendMail( email, undefined, subject, compiledHTML, (err, data) => {
        if (err) {
          // Error in sending email
          console.log(err);
          res.status(500).json({ errors: { server: 'Err! Email could not be not sent.<br>Try again later' } });
        }
        else {
          res.status(201).json({ success: { message: 'Message Sent' } });
        }
      });
    });
  }
});

// Authentication Routes
app.use(authRoutes);

// Dashboard Routes
app.use(panelRoutes);

// Seeding Database with a Admin account
function init_admin() {}

// Packages - express, express-handlebars, cors, morgan, mongoose, validator, bcrypt, cookie-parser, dotenv, jsonwebtoken