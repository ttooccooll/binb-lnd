const artistIds = require('./artist-ids');
const axios = require('axios');
const limit = 7; // The number of songs to retrieve for each artist
const popIds = artistIds.pop;
const rapIds = artistIds.rap;
const Redis = require('ioredis');
const rc = new Redis();
const rockIds = artistIds.rock;
const jazzIds = artistIds.jazz;
const funkIds = artistIds.funk;
const progIds = artistIds.prog;
let rooms = require('../config').rooms;
let score;
let skip = 0; // Skip counter
let songId = 0;

const options = {
  url: 'https://itunes.apple.com/lookup',
  params: {
    id: popIds.concat(rapIds, rockIds, jazzIds, funkIds, progIds).join(),
    entity: 'song',
    limit: limit
  }
};

/**
 * Set the rooms in which the songs of a given artist will be loaded.
 */

const updateRooms = function(artistId) {
  rooms = ['mixed'];
  score = 0;
  if (artistId === popIds[0]) {
    rooms.push('hits', 'pop');
    // Set the skip counter (there is no need to update the rooms for the next pop artists)
    skip = popIds.length - 1;
  } else if (artistId === rapIds[0]) {
    rooms.push('rap');
    skip = rapIds.length - 1;
  }  else if (artistId === jazzIds[0]) {
    rooms.push('jazz');
    skip = jazzIds.length - 1;
  }  else if (artistId === funkIds[0]) {
    rooms.push('funk');
    skip = funkIds.length - 1;
  }  else if (artistId === progIds[0]) {
    rooms.push('prog');
    skip = progIds.length - 1;
  } else {
    rooms.push('oldies', 'rock');
    skip = rockIds.length - 1;
  }
};

axios.get(options.url, { params: options.params })
  .then(response => {
    const data = response.data;
    const results = data.results;
    results.forEach(result => {
      if (result.wrapperType === 'artist') {
        if (skip) {
          skip--;
          return;
        }
        updateRooms(result.artistId);
        return;
      }

      rc.hmset(
        'song:' + songId,
        'artistName',
        result.artistName,
        'trackName',
        result.trackName,
        'trackViewUrl',
        result.trackViewUrl,
        'previewUrl',
        result.previewUrl,
        'artworkUrl60',
        result.artworkUrl60,
        'artworkUrl100',
        result.artworkUrl100
      );

      rooms.forEach(room => {
        const _score = room === 'mixed' ? songId : score;
        rc.zadd(room, _score, songId);
      });

      score++;
      songId++;
    });
  })
  .catch(error => {
    console.error(error);
  })
  .finally(() => {
    rc.quit();
    process.stdout.write('OK\n');
  });

rc.del(rooms, function(err) {
  if (err) {
    throw err;
  }
  process.stdout.write('Loading sample tracks... ');
});