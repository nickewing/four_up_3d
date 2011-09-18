var Board = require('./board').Board,
    redis = require('redis'),
    crypto = require('crypto');

function Game(id) {
  var board,
      players = [false, false],
      playerId,
      subscribers = [],
      dbClient = redis.createClient()
      dbSubscriber = redis.createClient();

  function debug(message) {
    var str = "DEBUG [" + dbKey() + "]";
    if (playerId) {
      str += "[" + playerId + "]";
    }
    console.log(str + ": " + message);
  }

  function dbKey() {
    return '3dc4.game.' + id;
  }

  function save(cb) {
    var gameData = JSON.stringify({
          placements: board.placements,
          players: players
        });

    dbClient.set(dbKey(), gameData, function(err) {
      if (err) {
        debug(err);
      } else {
        // debug("Saved: " + gameData);
        debug("Saved");
      }
      if (cb) cb();
    });
  }

  function load(cb) {
    dbClient.get(dbKey(), function(err, value) {
      if (value) {
        var gameData = JSON.parse(value);
        // debug("Found game: " + value);
        debug("Loaded");

        board = new Board(gameData.placements);
        players = gameData.players;
      } else {
        debug("New game " + dbKey());
        board = new Board();
        board.clear();
      }

      if (cb) cb()
    });
  }

  function updateSubscribers(data) {
    var len = subscribers.length;
    for (var i = 0; i < len; i++) {
      subscribers[i](data);
    }
  }

  function onDbMessage(channel, data) {
    load(function() {
      updateSubscribers(JSON.parse(data));
    });
  }

  function publishDbUpdate(data) {
    save(function() {
      dbClient.publish(dbKey(), JSON.stringify(data));
    });
  }

  this.onUpdate = function(cb) {
    subscribers.push(cb);
  };

  this.placePiece = function(poleId) {
    if (board.placePiece(poleId, playerId)) {
      publishDbUpdate({
        type: "placement",
        poleId: poleId,
        playerId: playerId
      });
    }
  };

  this.reset = function() {
    board.clear();
    publishDbUpdate({type: "clear_board"});
  };

  function join(cb) {
    for (var i = 0; i < 2; i++) {
      if (!players[i]) {
        players[i] = true;
        playerId = i + 1;
        break;
      }
    }

    if (!playerId) {
      playerId = Game.OBSERVER;
    }
    save(cb);
  }

  this.leave = function() {
    debug('Player left: ' + playerId);
    if (playerId <= 2)
      players[playerId - 1] = false;
    save();
  };

  var self = this;
  load(function() {
    join(function() {
      updateSubscribers({
        type: "setup",
        gameId: id,
        placements: board.placementsToString(),
        playerId: playerId
      });
    });
  });

  dbSubscriber.subscribe(dbKey());
  dbSubscriber.on("message", onDbMessage);
}

Game.PLAYER_ONE = 1;
Game.PLAYER_TWO = 2;
Game.OBSERVER = 3;

Game.generateKey = function() {
  var hash = crypto.createHash('sha1');
  hash.update(Date.now().toString());
  hash.update(Math.random().toString());
  return hash.digest('hex').slice(0, 12);
}

exports.Game = Game;
