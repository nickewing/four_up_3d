var express         = require('express'),
    Game            = require('./game').Game,
    config          = require('./config')
    socket_listener = require('./socket_listener'),
    app             = express.createServer();

function logDebug(message) {
  if (config.debugMode) {
    console.log("DEBUG: " + message);
  }
}

app.configure(function () {
  app.use(express.static(__dirname + '/../public'));
});

app.listen(config.port, function () {
  var addr = app.address();
  logDebug('Listening on http://' + addr.address + ':' + addr.port);
});

socket_listener.listen(app);
