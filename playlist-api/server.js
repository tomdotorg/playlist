'use strict'

const nconf = require('nconf')
const express = require('express')
const playlistController = require('./playlists');
//const bodyParser = require('body-parser')
let moment = require('moment-timezone');

nconf.argv().env().file('keys.json');
const TZ = nconf.get("tz") || "America/New_York";

const app = express();
//app.use(bodyParser.json());

function makeTableHTML(myArray) {
  var result = "<table border=1>";
  result += "<tr><td><b>Date</b></td>";
  result += "<td><b>Artist</b></td>";
  result += "<td><b>Song</b></td></tr>";

  for(var i=0; i<myArray.length; i++) {
    let offset = moment.tz.zone(TZ).utcOffset(moment(myArray[i].date)) * -1;
    result += "<tr>";
      result += `<td>${moment(myArray[i].date).utcOffset(offset).format("ddd, MMM D h:mm a")}</td>`;
      result += `<td>${myArray[i].artist}</td>`;
      result += `<td>${myArray[i].title}</td>`;
      result += "</tr>";
  }
  result += "</table>";

  return result;
}

app.get('/api/playlist/:station/:limit', (req, res) => {
  console.log(req.params.station, req.params.limit);
  playlistController.getPlaylistByStation(req.params.station, moment(0), req.params.limit)
  .then((result) => {
    if (result) {
      if (req.query.format == 'html') {
        result = makeTableHTML(result);
      }
      res
      .status(200)
      .send(result)
      .end();
    } else {
      res
      .status(404)
      .send(`${req.params.station} not found`)
      .end();
    }
  })
  .catch((err) => {
    console.log(err);
    res.status(500)
    .send(err)
    .end();
  })
});

app.get('/api/playlistSince/:station/:since/:limit', (req, res) => {
  console.log(req.params.station, req.params.since);
  let since = moment(req.params.since);
  console.log(since.toString());
  if (!since.isValid()) {
    res
    .status(400)
    .send('invalid since date')
    .end();
  }

  playlistController.getPlaylistByStation(req.params.station, since, req.params.limit)
  .then((result) => {
    if (result) {
      if (req.query.format == 'html') {
        result = makeTableHTML(result);
      }
      res
      .status(200)
      .send(result)
      .end();
    } else {
      res
      .status(404)
      .send(`${req.params.station} not found`)
      .end();
    }
  })
  .catch((err) => {
    console.log(err);
    res.status(500)
    .send(err)
    .end();
  })
});

app.get('/api/playlist/:station', (req, res) => {
  playlistController.getPlaylistByStation(req.params.station, 200)
  .then((result) => {
    if (result) {
      if (req.query.format == 'html') {
        result = makeTableHTML(result);
      }
      res
      .status(200)
      .send(result)
      .end();
    } else {
      res
      .status(404)
      .send(`${req.params.station} not found`)
      .end();
    }
  })
  .catch((err) => {
    console.log(err);
    res.status(500)
    .send(err)
    .end();
  })
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
  console.log('Press Ctrl+C to quit.');
});

module.exports = app;
