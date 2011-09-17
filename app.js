
require.paths.unshift(__dirname + '/../../lib/');

var express = require('express'),
    nib = require('nib'),
    sio = require('socket.io'),
    redis = require('redis');

var app = express.createServer();

app.configure(function () {
  app.use(express.static(__dirname + '/public'));
});

app.get('/', function (req, res) {
  res.render('index', { layout: false });
});

app.listen(3000, function () {
  var addr = app.address();
  console.log('   app listening on http://' + addr.address + ':' + addr.port);
});

function Game() {
  var placements = [],
      players = [false, false],
      i;

  function clearPlacements() {
    for (var i = 0; i < 64; i++) {
      placements[i] = 0;
    }
  }

  clearPlacements();

  return {
    place: function(poleId, playerId) {
      var x = Math.floor(poleId / 4),
          z = poleId % 4;

      for (var y = 0; y < 4; y++) {
        var placementId = x + 4 * (y + 4 * z);
        if (placements[placementId] == 0) {
          placements[placementId] = playerId;
          return true;
        }
      }

      return false;
    },
    placementsToString: function() {
      return placements.join('');
    },
    reset: function() {
      clearPlacements();
    },
    playerJoined: function() {
      for (var i = 0; i < 2; i++) {
        if (!players[i]) {
          players[i] = true;
          return i + 1;
        }
      }

      return Game.OBSERVER;
    },
    playerLeft: function(playerId) {
      players[playerId - 1] = false;
    }
  }
}

Game.PLAYER_ONE = 1;
Game.PLAYER_TWO = 2;
Game.OBSERVER = 3;

var game = new Game();

var io = sio.listen(app);

io.sockets.on('connection', function(socket) {
  var playerId = game.playerJoined();

  socket.on('disconnect', function() {
    game.playerLeft(playerId);
  });

  var subscriberClient = redis.createClient();
  subscriberClient.subscribe('placements');

  var publisherClient = redis.createClient();

  socket.emit("game_init", {
    placements: game.placementsToString(),
    playerId: playerId
  });

  socket.on('place', function(poleId) {
    if (game.place(poleId, playerId)) {
      publisherClient.publish("placements", playerId + ":" + poleId);
    }
  });

  socket.on('new_game', function() {
    console.log('NEW GAME');
    game.reset();
  });

  subscriberClient.on("message", function(channel, placement) {
    placement = placement.split(':');
    
    var playerId = parseInt(placement[0]),
        poleId   = parseInt(placement[1]);
    socket.emit("placement", [poleId, playerId]);
  });
});

