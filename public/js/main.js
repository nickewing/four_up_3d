(function() {
  var debugMode = false,
      gameRenderer,
      clearBoard,
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
      "game_renderer",
      "board"
    ], function() {
      require.ready(requirementsLoaded);
    });
  });

  function debug(message) {
    if (debugMode) {
      console.log(message);
    }
  }

  function requirementsLoaded() {
    if (hasWebGl()) {
      gameRenderer = new GameRenderer();

      connect();

      $("#game_ui").disableSelection();
      $("input").enableSelection();

      $("#about_button").
        button({icons: {primary: "ui-icon-info"}}).
          click(function() { $("#about_dialog").dialog("open"); });

      $("#new_game_button").
        button().
          click(function() { clearBoard(); });

      $("#about_dialog").dialog({
        autoOpen: false,
        resizable: false,
        width: 380,
        buttons: {"OK": function() {$(this).dialog("close");}}
      });

      $("#welcome_dialog").dialog({
        autoOpen: false,
        resizable: false,
        width: 500,
        buttons: {"OK": function() {$(this).dialog("close");}}
      });

      $("#game_ui").show();

    } else {
      hideOverlay();
      $("#requirements_message").show();
    }
  }

  function showWelcomeDialog() {
    $("#welcome_dialog").dialog("open");
  }

  function hideWelcomeDialog() {
    $("#welcome_dialog").dialog("close");
  }

  function showOverlayText(text) {
    $("#overlay_message span").text(text);
    $("#overlay_message").show();
    $("#status_panel").hide();
  }

  function hideOverlay() {
    $("#overlay_message").hide();
    $("#status_panel").show();
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
      label = "Playing as Light";
    } else if (playerId == 2) {
      label = "Playing as Dark";
    } else {
      label = "Observer";
    }

    $('#player_name').text(label);
  }

  function connect() {
    var sessionId,
        connected = false,
        board,
        playerId;

    socket = io.connect();

    clearBoard = function() {
      socket.emit("clear");
      gameRenderer.clear();
    }

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

      if (board.setPlacements(data.placements)) {
        dropSound.play();
      }

      board.score();

      gameRenderer.drawPieces(data.placements);

      updateLastPlacementsMarkers(data.lastPlacements);

      if (data.players < 2) {
        $("#waiting_for_player_message").show();
      } else {
        $("#waiting_for_player_message").hide();
        hideWelcomeDialog();
      }

      if (data.turn == playerId) {
        status = "Your turn";
      } else if (playerId != 3) {
        status = "Opponent's turn";
      } else if (data.turn == 1) {
        status = "Light's turn";
      } else if (data.turn == 2) {
        status = "Dark's turn";
      }

      if (playerId == 3) {
        $("#new_game_button").hide();
      } else {
        $("#new_game_button").show();
      }

      $('#turn_message').text(status);

      $('#score_message').text(board.scores[0] + " Light / " + board.scores[1] + " Dark");

      gameRenderer.enablePlacement(data.turn == playerId);
    }

    socket.on("connect", function() {
      connected = true;
      setupIfReady();
    });

    $.history.init(function(hash) {
      $("#current_url").val(window.location.href);
      $("#current_url").focus();
      $("#current_url").select();

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
      debug("setup");
      debug(data);

      board = new Board();

      window.location.hash = sessionId = data.sessionId;

      gameRenderer.playerId = playerId = data.playerId;
      showPlayerLabel(playerId);

      onStateUpdate(data);

      if (data.playerId != 3 && data.players < 2) {
        showWelcomeDialog();
      }

      hideOverlay();
    });

    socket.on("state_update", function(data) {
      debug("state_update");
      debug(data);

      onStateUpdate(data);
    });

    gameRenderer.on("placement", function(poleId) {
      socket.emit("placement", poleId);
    });
  }
})();
