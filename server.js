// server.js
// where your node app starts

const express = require('express');
const rTracer = require('cls-rtracer');
const { ApiLoggerMiddleware, Logger } = require('./logger');
const cors = require('cors');
const bodyParser = require('body-parser');
const { ShortUrl } = require('./db/models/shortUrl.model');
const { connectToDb } = require('./db/utils/connect.util');

require('dotenv').config();

// init project
var app = express();

// connect to database
connectToDb();

// body parser middleware
app.use(bodyParser.urlencoded({ extended: false }));

// logging middleware
app.use(rTracer.expressMiddleware(), ApiLoggerMiddleware);

// enable CORS (https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)
// so that your API is remotely testable by FCC
app.use(cors({ optionsSuccessStatus: 200 })); // some legacy browsers choke on 204

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/views/index.html');
});

// your first API endpoint...
app.get('/api/hello', function (req, res) {
  res.json({ greeting: 'hello API' });
});

app.post('/api/shorturl', function (req, res) {
  const originalUrl = req.body.url;
  Logger.info('Server.Post.ShortUrl.started', {
    originalUrl,
  });

  let url;
  try {
    url = new URL(originalUrl);
  } catch (_) {
    Logger.error('Server.Post.ShortUrl.invalidUrl', new Error('Invalid url'));
    res.status(400).json({ error: 'invalid url' });
    return;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    Logger.error('Server.Post.ShortUrl.invalidUrl', new Error('Invalid url'));
    res.status(400).json({ error: 'invalid url' });
    return;
  }

  ShortUrl.findOne({
    originalUrl,
  })
    .then((url) => {
      if (url) {
        Logger.info('Server.Post.ShortUrl.success', {
          url,
        });

        res.json({
          original_url: originalUrl,
          short_url: Number(url.id),
        });
      } else {
        ShortUrl.create({
          originalUrl,
        })
          .then((newUrl) => {
            Logger.info('Server.Post.ShortUrl.success', {
              url: newUrl,
            });

            res.json({
              original_url: originalUrl,
              short_url: Number(newUrl.id),
            });
          })
          .catch((error) => {
            Logger.error('Server.Post.ShortUrl.failed', error, 'Query failed: create');
            res.status(500).json({ error: 'Internal server error' });
          });
      }
    })
    .catch((error) => {
      Logger.error('Server.Post.ShortUrl.failed', error, 'Query failed: findOne');
      res.status(500).json({ error: 'Internal server error' });
    });
});

app.get('/api/shorturl/:id', function (req, res) {
  const shortUrlId = req.params.id;
  Logger.info('Server.Get.ShortUrl.started', {
    shortUrlId,
  });

  if (Number.isNaN(Number(shortUrlId)) || shortUrlId === '') {
    res.status(400).json({
      error: 'Bad request',
    });
  }

  ShortUrl.findById(Number(shortUrlId))
    .then((url) => {
      if (url) {
        Logger.info('Server.Get.ShortUrl.success', {
          url,
        });

        res.redirect(url.originalUrl);
      } else {
        res.status(404).json({
          error: 'No short URL found for the given input',
        });
      }
    })
    .catch((error) => {
      Logger.error('Server.Get.ShortUrl.failed', error, 'Query failed: findById');
      res.status(500).json({ error: 'Internal server error' });
    });
});

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  Logger.info('Server', `Your app is listening on port ${listener.address().port}`);
});
