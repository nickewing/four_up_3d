var express         = require('express')
    app             = express(),
    http            = require('http').Server(app),
    io              = require('socket.io')(http),
    Game            = require('./game').Game,
    config          = require('./config')
    socket_listener = require('./socket_listener');

function logDebug(message) {
  if (config.debugMode) {
    console.log("DEBUG: " + message);
  }
}

app.use(express.static(__dirname + '/../public'));

var listener = http.listen(config.port, function(){
  var addr = listener.address();
  logDebug('Listening on http://' + addr.address + ':' + addr.port);
});

socket_listener.listen(io);
