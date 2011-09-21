var express = require('express'),
    nib = require('nib'),
    sio = require('socket.io'),
    Game = require('./game').Game;

var app = express.createServer();

app.configure(function () {
  app.use(express.static(__dirname + '/public'));
});

app.listen(8080, function () {
  var addr = app.address();
  console.log('Listening on http://' + addr.address + ':' + addr.port);
});

var io = sio.listen(app);
io.set("log level", 0);

io.sockets.on("connection", function(socket) {
  var game;

  console.log("connect");

  socket.on("setup", function(data) {
    console.log('setup');

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
    console.log("disconnect");
    if (game) {
      game.destroy();
    }
  });

  socket.on("placement", function(data) {
    console.log("placement");
    if (game) {
      game.placePiece(data.poleId);
    }
  });

  socket.on("clear", function() {
    if (game) {
      game.reset();
    }
  });

});

