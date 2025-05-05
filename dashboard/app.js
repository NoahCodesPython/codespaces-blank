const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const path = require('path');
const mongoose = require('mongoose');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { Strategy } = require('passport-discord');
const flash = require('connect-flash');
const axios = require('axios');

// Load environment variables
require('dotenv').config();

// Import middleware
const authMiddleware = require('./middleware/auth');

// Import routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const serversRoutes = require('./routes/servers');
const apiRoutes = require('./routes/api');

// Initialize Express app
const app = express();
const PORT = process.env.DASHBOARD_PORT || 3000;

// Set the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors());

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://cdn.jsdelivr.net', 'https://code.jquery.com', "'unsafe-inline'"],
        styleSrc: ["'self'", 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com', "'unsafe-inline'"],
        imgSrc: ["'self'", 'https://cdn.discordapp.com', 'data:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com'],
      },
    },
  })
);

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'default_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 day
      secure: process.env.NODE_ENV === 'production',
    },
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      ttl: 60 * 60 * 24, // 1 day
    }),
  })
);

// Add flash middleware
app.use(flash());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB for dashboard'))
  .catch((err) => console.error('Failed to connect to MongoDB:', err));

// Passport configuration
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

// Discord OAuth2 strategy
passport.use(
  new Strategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: process.env.CALLBACK_URL,
      scope: ['identify', 'guilds'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Fetch user guilds from Discord API
        const response = await axios.get('https://discord.com/api/users/@me/guilds', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        // Attach guilds to the profile object
        profile.guilds = response.data;
        profile.accessToken = accessToken;

        return done(null, profile);
      } catch (error) {
        console.error('Error fetching user guilds:', error);
        return done(error, null);
      }
    }
  )
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Make user data available to all templates
app.use((req, res, next) => {
  res.locals.user = req.user;
  res.locals.path = req.path;
  res.locals.title = 'Dashboard';
  next();
});

// Make flash messages available to all templates
app.use((req, res, next) => {
  res.locals.successMessages = req.flash('success');
  res.locals.errorMessages = req.flash('error');
  next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/dashboard', authMiddleware.isAuthenticated, dashboardRoutes);
app.use('/servers', authMiddleware.isAuthenticated, serversRoutes);
app.use('/api', authMiddleware.isAuthenticated, apiRoutes);
app.use('/', dashboardRoutes);

// Home route
app.get('/', (req, res) => {
  res.render('pages/index', { title: 'Home' });
});

// Privacy Policy
app.get('/privacy', (req, res) => {
  res.render('pages/privacy', { title: 'Privacy Policy' });
});

// Terms of Service
app.get('/terms', (req, res) => {
  res.render('pages/terms', { title: 'Terms of Service' });
});

// Commands list
app.get('/commands', (req, res) => {
  res.render('pages/commands', { title: 'Commands' });
});

// 404 page
app.use((req, res) => {
  res.status(404).render('pages/404', { title: 'Page Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(status).render('pages/error', {
    title: 'Error',
    error: {
      status,
      message,
    },
  });
});

module.exports = app;