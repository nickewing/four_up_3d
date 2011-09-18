var express = require('express'),
    nib = require('nib'),
    sio = require('socket.io'),
    Game = require('./game').Game;

var app = express.createServer();

app.configure(function () {
  app.use(express.static(__dirname + '/public'));
});

app.get('/:game_id', function (req, res) {
  res.redirect('/');
});

app.listen(3000, function () {
  var addr = app.address();
  console.log('   app listening on http://' + addr.address + ':' + addr.port);
});

var io = sio.listen(app);
io.set('log level', 1);

io.sockets.on('connection', function(socket) {
  var game = new Game(Game.generateKey());

  socket.on('disconnect', function() {
    game.leave();
  });

  socket.on('place', function(poleId) {
    game.placePiece(poleId);
  });

  socket.on('clear', function() {
    game.reset();
  });

  game.onUpdate(function(data) {
    var type = data.type;
    delete data.type;
    socket.emit(type, data);
  });
});

