const express = require('express');
const app = express();
var http = require('http').Server(app);
const path = require('path');

const PORT = process.env.PORT || 3000;
const buildPath = path.join(__dirname, '..', 'build');

app.use(express.static(buildPath)); //For the production server

http.listen(PORT, function()
{
  console.log(`Listening on ${PORT}`);
});
