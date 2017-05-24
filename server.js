'use strict';

const express = require('express');

// Constants
const PORT = 8080;

// App
const app = express();
app.get('/', function (req, res) {
  res.send('<h1>Hello world</h1>\nAnd a special hello to Simon!');
});

app.listen(process.env.PORT || 8080);
console.log('Running on http://localhost:' + PORT);