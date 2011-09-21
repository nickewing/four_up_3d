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
    var ele, label;
    if (!(ele = $("#player_name")).length) {
      ele = $('<div id="player_name"></div>');
      $(document.body).append(ele);
    }

    if (playerId == 1) {
      label = "Light";
    } else if (playerId == 2) {
      label = "Dark";
    } else {
      label = "Observer";
    }
    ele.text(label);
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

    socket.on("connect", function() {
      connected = true;
      setupIfReady();
    });

    $.history.init(function(hash) {
      sessionId = hash;
      setupIfReady();
    });

    socket.on("disconnect", function() {
      connected = false;
      showOverlayText("Disconnected!  Retrying connection...");
    });

    socket.on("setup", function(data) {
      console.log("setup");
      console.log(data);

      gameRenderer.drawPieces(data.placements);

      gameRenderer.playerId = playerId = data.playerId;

      if (playerId >= 1 && playerId <= 2) {
        gameRenderer.enablePlacement(true);
      }

      showPlayerLabel(playerId);
      window.location.hash = data.sessionId;

      hideOverlay();
    });

    socket.on("state_update", function(data) {
      console.log("state_update");
      console.log(data);

      // gameRenderer.addPieceToPole(data.poleId, data.playerId);
      gameRenderer.drawPieces(data.placements);

      if (dropSound) {
        dropSound.play();
      }
    });

    socket.on("clear_board", function(data) {
      gameRenderer.drawPieces([]);
    });

    gameRenderer.addListener(function(data) {
      var type = data.type;
      delete data.type;
      socket.emit(type, data);
    });
  }
})();
