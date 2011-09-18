var Board = require('./board').Board,
    redis = require('redis');

function Game(id) {
  var board,
      players = [false, false],
      playerId,
      subscribers = [],
      dbClient = redis.createClient()
      dbSubscriber = redis.createClient();

  console.log(board);

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
        console.log(err);
      } else {
        console.log("Saved: " + gameData);
      }
      if (cb) cb();
    });
  }

  function load(cb) {
    dbClient.get(dbKey(), function(err, value) {
      if (value) {
        var gameData = JSON.parse(value);
        console.log("Found game: " + value);

        board = new Board(gameData.placements);
        players = gameData.players;
      } else {
        console.log("New game with key " + dbKey());
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
    load();
    updateSubscribers(JSON.parse(data));
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
    console.log('player left: ' + playerId);
    if (playerId <= 2)
      players[playerId - 1] = false;
    save();
  };

  var self = this;
  load(function() {
    join(function() {
      updateSubscribers({
        type: "setup",
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
  return 'dummy'; // FIXME
}

exports.Game = Game;
