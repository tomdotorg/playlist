'use strict'

const nconf = require('nconf')
const MongoClient = require('mongodb').MongoClient;

nconf.argv().env().file('keys.json');

const USER = nconf.get('mongoUser');
const PASS = nconf.get('mongoPass');
const HOST = nconf.get('mongoHost');
const DB = nconf.get('mongoDatabase');

const URL = encodeURI(`mongodb+srv://${USER}:${PASS}@${HOST}/${DB}`)

async function getPlaylistByStation(station, since, limit) {
  console.log('getPlaylistByStation', station, since.toString(), limit);
  const client = new MongoClient(URL, { useUnifiedTopology: true });
  limit = parseInt(limit);
  try {
    console.log(`querying ${station} - limit is ${limit}`)
    let db = await client.connect()
    const col = db.db(DB).collection('wrek-hd2');
    let result = await col.aggregate(
      [
        {
          '$match': {
            '$and': [
              {
                '$expr': {
                  '$gte': [
                    '$date', since.toDate()
                  ]
                }
              }, {
                'station': station
              }
            ]
          }
        }, {
          '$sort': {
            'date': -1
          }
        }, {
          '$limit': limit
        }
      ]
    ).toArray();
//    console.log(result);
    return result;
  } catch (e) {
    console.error(`Error occurred while querying, ${e}`)
    return { error: e }
  } finally {
    client.close()
  }
}

exports.getPlaylistByStation = getPlaylistByStation;
