(function() {
  var gameRenderer,
      dropSound;

  if (window.Audio) {
    dropSound = new Audio("/sounds/drop.wav");
  }

  require(["http://ajax.googleapis.com/ajax/libs/jquery/1.6.4/jquery.min.js"], function() {
    require([
      "http://ajax.googleapis.com/ajax/libs/jqueryui/1.8.16/jquery-ui.min.js",
      "vendor/three",
      "vendor/request_animation_frame",
      // "vendor/stats",
      "/socket.io/socket.io.js",
      "vendor/jquery.history",
      "game_renderer"
    ], function() {
      require.ready(requirementsLoaded);
    });
  });

  function requirementsLoaded() {
    if (hasWebGl()) {
      gameRenderer = new GameRenderer();

      connect();

      $("html").disableSelection();
      $("#about_button").
        button({icons: {primary: "ui-icon-info"}}).
          click(function() { $("#about_dialog").dialog("open"); });
      $("#new_game_button").
        button().
          click(function() { gameRenderer.clear(); });
      $("#about_dialog").dialog({
        autoOpen: false,
        resizable: false
      });

      $("#game_ui").show();
    } else {
      hideOverlay();
      $("#requirements_message").show();
    }
  }

  function showOverlayText(text) {
    $("#overlay_message span").text(text);
    $("#overlay_message").show();
  }

  function hideOverlay() {
    $("#overlay_message").hide();
  }

  function hasWebGl() {
    try {
      return !!window.WebGLRenderingContext &&
        !!document.createElement("canvas").getContext("experimental-webgl");
    } catch(e) {
      return false;
    }
  }

  function showPlayerLabel(playerId) {
    var label;

    if (playerId == 1) {
      label = "Light";
    } else if (playerId == 2) {
      label = "Dark";
    } else {
      label = "Observer";
    }

    $('#player_name').text(label);
  }

  function connect() {
    var sessionId,
        connected = false,
        playerId;

    socket = io.connect();

    function setupIfReady() {
      if (sessionId != null && connected) {
        socket.emit("setup", {sessionId: sessionId});
      }
    }

    function updateLastPlacementsMarkers(lastPlacements) {
      gameRenderer.clearPieceMarkers();

      if (lastPlacements[0]) {
        gameRenderer.drawPieceMarker.apply(gameRenderer, lastPlacements[0]);
      }

      if (lastPlacements[1]) {
        gameRenderer.drawPieceMarker.apply(gameRenderer, lastPlacements[1]);
      }
    }

    function onStateUpdate(data) {
      var status;

      gameRenderer.drawPieces(data.placements);

      updateLastPlacementsMarkers(data.lastPlacements);

      if (data.turn == playerId) {
        status = "Your turn";
      } else if (playerId != 3) {
        status = "Opponent's turn";
      } else if (data.turn == 1) {
        status = "Light's turn";
      } else if (data.turn == 2) {
        status = "Dark's turn";
      }

      $('#status_message').text(status);

      gameRenderer.enablePlacement(data.turn == playerId);
    }

    socket.on("connect", function() {
      connected = true;
      setupIfReady();
    });

    $.history.init(function(hash) {
      if (sessionId != hash) {
        sessionId = hash;
        setupIfReady();
      }
    });

    socket.on("disconnect", function() {
      connected = false;
      showOverlayText("Disconnected!  Retrying connection...");
    });

    socket.on("setup", function(data) {
      console.log("setup");
      console.log(data);

      window.location.hash = sessionId = data.sessionId;

      gameRenderer.playerId = playerId = data.playerId;
      showPlayerLabel(playerId);

      onStateUpdate(data);


      hideOverlay();
    });

    socket.on("state_update", function(data) {
      console.log("state_update");
      console.log(data);

      onStateUpdate(data);

      if (dropSound) {
        dropSound.play();
      }
    });

    gameRenderer.addListener(function(data) {
      var type = data.type;
      delete data.type;
      socket.emit(type, data);
    });
  }
})();
