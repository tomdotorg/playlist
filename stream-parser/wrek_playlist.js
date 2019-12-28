const fs = require('fs');
const Parser = require('icecast-parser'); //https://github.com/ghaiklor/icecast-parser

const nconf = require('nconf');

const MongoClient = require('mongodb').MongoClient;

nconf.argv().env().file('keys.json');

const USER = nconf.get('mongoUser');
const PASS = nconf.get('mongoPass');
const HOST = nconf.get('mongoHost');
const DB = nconf.get('mongoDatabase');
const COLL = nconf.get('mongoCollection');

const URL = process.env.radioUrl;
const STATION = process.env.station;

const DB_URL = encodeURI(`mongodb+srv://${USER}:${PASS}@${HOST}/${DB}`)

function getExceptions(filename, callback) {
  fs.readFile(filename, (err, data) => {
    if (err) throw err;
    obj = JSON.parse(data);
    callback(obj.exceptions);
  });
};

function isException(artist) {
  if (EXCEPTIONS.includes(artist)) {
    return true;
  } else {
    return false;
  }
};

function getStreamMetadata(url, callback) {
  const radioStation = new Parser({
    url: url, // URL to radio station
    userAgent: 'Parse-Icy', // userAgent to request
    keepListen: false, // don't listen radio station after metadata was received
    autoUpdate: false, // update metadata after interval
    errorInterval: 30, // retry connection after 30 seconds
    emptyInterval: 30, // retry get metadata after 30 seconds
    metadataInterval: 5 // update metadata after 5 seconds
  });

  let artist, title;

  radioStation
  .on('metadata', function(metadata) {
    if (metadata.StreamTitle) {
      artist = metadata.StreamTitle.split(' - ')[0];
      title = metadata.StreamTitle.split(' - ')[1];
    }
    callback({ 'date': new Date(), 'station': STATION, 'artist': artist, 'title': title });
  })
  .on('error', function(error) {
    console.error(error);
  });
};

async function persistMetadata(metadata) {
  const client = new MongoClient(DB_URL, { useUnifiedTopology: true });
  try {
    const db = await client.connect();
    const col = db.db(DB).collection(COLL);
    console.log('calling insertOne()');
    const dbResult = await col.insertOne(metadata);
    return dbResult;
  } catch (e) {
    console.error(`Error occurred while saving metadata, ${e}`)
    throw (e);
  } finally {
    client.close()
  }
}

async function retrieveLastMetadata() {
  const client = new MongoClient(DB_URL, { useUnifiedTopology: true });
  try {
    const db = await client.connect();
    const col = db.db(DB).collection(COLL);
    const dbResult = await col.aggregate([
      { '$match': { 'station': STATION } },
      { '$sort': { 'date': -1 } },
      { '$limit': 1 }
    ]).toArray();
    return dbResult[0];
  } catch (e) {
    console.error(`Error occurred while retrieving metadata, ${e}`)
    throw (e);
  } finally {
    client.close()
  }
}

getExceptions('exceptions.json', ((exceptions) => {
  EXCEPTIONS = exceptions;
  console.log('exceptions:', EXCEPTIONS);
}));

setInterval(function () {
    retrieveLastMetadata()
    .then((lastSong) => {
      getStreamMetadata(URL, function (playing) {
        if (playing && // we can see what is playing from the stream
            lastSong == undefined || // it is the first record for this station
            ((playing['title'] != lastSong['title']) && // the song is different
            (playing['station'] == lastSong['station']) &&
            (!isException(playing['artist'])))) { // but the station is the same
          persistMetadata(playing)
            .then((result) => {
              console.log('saved', result.insertedCount, 'record(s)', playing)
              lastSong = playing;
            })
            .catch((err) => {
              console.log(err);
            })
        } else {
          // console.log(STATION, ".")
        }
      });
    })
    .catch((err) => {
      console.error(err);
    })
}
  , 5000);

// {"artist" : {$regex : ".*Zappa*"}}
