var Game   = require('./game').Game,
    config = require('./config');

exports.listen = function(io) {
  function logDebug(message) {
    if (config.debugMode) {
      console.log("DEBUG: " + message);
    }
  }

  io.on("connection", function(socket) {
    var game;

    logDebug("connect");

    socket.on("setup", function(data) {
      logDebug('setup');

      if (game) {
        game.destroy();
      }

      game = new Game(data.sessionId || Game.generateNewSessionId());

      game.addListener(function(data) {
        var type = data.type;
        delete data.type;
        socket.emit(type, data);
      });
    });

    socket.on("disconnect", function() {
      logDebug("disconnect");
      if (game) {
        game.destroy();
      }
    });

    socket.on("placement", function(poleId) {
      logDebug("placement");
      if (game) {
        game.placePiece(poleId);
      }
    });

    socket.on("clear", function() {
      if (game) {
        game.reset();
      }
    });

  });
};
