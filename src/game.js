var Board = require('../public/js/board').Board,
    redis = require('redis'),
    crypto = require('crypto');

function Game(sessionId) {
  var board,
      joined         = false,
      players        = [false, false],
      lastPlacements = [],
      playerId,
      turn           = Game.PLAYER_ONE,
      listeners      = [],
      dbClient,
      dbSubscriber;

  function connect(cb) {
    var dbClientReady     = false,
        dbSubscriberReady = false;

    function callbackWhenDone() {
      if (dbClientReady && dbSubscriberReady) {
        debug("fully connected");
        cb();
      }
    }

    function onError(err) {
      debug("DB ERR: " + err);
    }

    dbClient     = redis.createClient();
    dbSubscriber = redis.createClient();

    dbClient.on("ready", function() {
      dbClientReady = true;
      callbackWhenDone();
    });

    dbSubscriber.on("ready", function() {
      dbSubscriber.subscribe(dbKey());
      dbSubscriber.on("message", onDbMessage);

      dbSubscriber.on("subscribe", function() {
        dbSubscriberReady = true;
        callbackWhenDone();
      });
    });

    dbClient.on("error", onError);
    dbSubscriber.on("error", onError);
  }

  function debug(message) {
    var str = "DEBUG [" + dbKey() + "]";
    if (playerId) {
      str += "[" + playerId + "]";
    }
    console.log(str + ": " + message);
  }

  function dbKey() {
    return "four_up_3d.sessions." + sessionId;
  }

  function save(cb) {
    var gameData = JSON.stringify({
      placements: board.placements,
      players: players,
      turn: turn,
      lastPlacements: lastPlacements
    });

    dbClient.set(dbKey(), gameData, function(err) {
      if (err) {
        debug("ERR: " + err);
      } else {
        // debug("Saved: " + gameData);
        debug("Saved");
      }

      if (cb) cb();
    });
  }

  function load(cb) {
    dbClient.get(dbKey(), function(err, value) {
      if (err) {
        debug("ERR: " + err);
      } else if (value) {
        var gameData = JSON.parse(value);
        debug("Found game: " + value);
        // debug("Loaded");

        board = new Board(gameData.placements);
        players = gameData.players;
        turn = gameData.turn;
        lastPlacements = gameData.lastPlacements;
      } else {
        debug("New game " + dbKey());
        board = new Board();
        board.clear();
      }

      if (cb) cb();
    });
  }

  function updateListeners(data) {
    var len = listeners.length;
    for (var i = 0; i < len; i++) {
      listeners[i](data);
    }
  }

  function onDbMessage(channel, data) {
    debug("Subscriber message: " + data);
    load(function() {
      updateListeners({
        type: "state_update",
        placements: board.placements,
        lastPlacements: lastPlacements,
        players: playerCount(),
        turn: turn
      });
    });
  }

  function publishDbUpdate(data) {
    dbClient.publish(dbKey(), "", function(err) {
      if (err) {
        debug("ERR: " + err);
      }
    });
  }

  this.addListener = function(cb) {
    var listenerId = listeners.length;
    listeners.push(cb);
    return listenerId;
  };

  this.removeListener = function(listenerId) {
    listeners.splice(listenerId);
  }

  this.placePiece = function(poleId) {
    load(function() {
      var placementCoord = board.placePiece(poleId, playerId);
      if (turn == playerId && placementCoord) {
        lastPlacements[playerId - 1] = placementCoord;

        nextPlayersTurn();

        save(function() {
          debug("Publish placement: " + poleId);
          publishDbUpdate();
        });
      }
    });
  };

  this.reset = function() {
    if (isPlaying()) {
      board.clear();
      lastPlacements = [];
      save(function() {
        publishDbUpdate();
      });
    }
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

    save(function() {
      joined = true;
      cb();
    });
  }

  function leave() {
    debug('Player left: ' + playerId);
    if (playerId <= 2) {
      players[playerId - 1] = false;
    }
    save();
  }

  function nextPlayersTurn() {
    if (turn == Game.PLAYER_ONE) {
      turn = Game.PLAYER_TWO;
    } else {
      turn = Game.PLAYER_ONE;
    }
  }

  function playerCount() {
    var count = 0;
    if (players[0]) count++;
    if (players[1]) count++;
    return count;
  }

  function isPlaying() {
    return playerId == Game.PLAYER_ONE || playerId == Game.PLAYER_TWO;
  }

  this.destroy = function() {
    if (joined) {
      leave();
    }

    dbClient.end();
    dbSubscriber.end();
  };

  var self = this;

  connect(function() {
    load(function() {
      join(function() {
        save(function() {
          publishDbUpdate();

          updateListeners({
            type: "setup",
            sessionId: sessionId,
            placements: board.placements,
            playerId: playerId,
            players: playerCount(),
            lastPlacements: lastPlacements,
            turn: turn
          });
        });
      });
    });
  });
}

Game.PLAYER_ONE = 1;
Game.PLAYER_TWO = 2;
Game.OBSERVER = 3;

Game.generateNewSessionId = function() {
  var hash = crypto.createHash('sha1');
  hash.update(Date.now().toString());
  hash.update(Math.random().toString());
  return hash.digest('hex').slice(0, 12);
}

exports.Game = Game;
