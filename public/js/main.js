var requires = [
  "http://ajax.googleapis.com/ajax/libs/jqueryui/1.8.16/jquery-ui.min.js",
  "Three",
  "RequestAnimationFrame",
  // "Stats",
  "/socket.io/socket.io.js"
];

require(["http://ajax.googleapis.com/ajax/libs/jquery/1.6.4/jquery.min.js"], function() {
  require(requires, function() {
    require.ready(function(jquery, history) {
      if (hasWebGl()) {
        game();

        $('html').disableSelection();
        $('#about_button').
          button({icons: {primary: "ui-icon-info"}}).
          click(function() { $('#about_dialog').dialog('open'); });
        $('#new_game_button').
          button().
          click(function() { });
        $('#about_dialog').dialog({
          autoOpen: false,
          resizable: false
        });
      } else {
        hideOverlay();
        $('#requirements_message').show();
      }
    });
  });
});

function showOverlayText(text) {
  $('#overlay_message span').text(text);
  $('#overlay_message').show();
}

function hideOverlay() {
  $('#overlay_message').hide();
}

function hasWebGl() {
  try {
    return !!window.WebGLRenderingContext &&
      !! document.createElement( 'canvas' ).getContext( 'experimental-webgl' );
  } catch(e) {
    return false;
  }
}

function game() {
  var stats,
      container,
      camera,
      scene,
      renderer,
      projector,
      mouse2D,
      mouseDeltaX            = 0,
      lastMouseX,
      dragging               = false,
      dragKeyDown            = false,
      ray,
      rolledOverObject,
      theta                  = 45,
      darkColor              = 0x4B3621,
      darkSelectedColor      = 0x633614,
      lightColor             = 0xFFF5EE,
      lightSelectedColor     = 0xFFF5FF,
      markerColor            = 0x990000,
      darkMaterials          = smoothMaterial(darkColor, 0.5),
      darkSelectedMaterials  = smoothMaterial(darkSelectedColor),
      lightMaterials         = smoothMaterial(lightColor),
      lightSelectedMaterials = smoothMaterial(lightSelectedColor),
      markerMaterials        = flatMaterial(markerColor),
      markerObject,
      markedPoleId,
      pieceGeometry,
      poleGeometry,
      markerGeometry,
      pieces                 = [],
      piecePoleIds           = {},
      poleIds                = {},
      polePieceCount         = [],
      poleZeroCoord          = -300,
      playerId               = 1,
      socket,
      dropSound;

  function isPlaying() {
    return playerId > 0 && playerId <= 2;
  }

  function showPlayerLabel() {
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

  function gameId() {
    var hash = window.location.hash;

    if (hash) {
      return hash.slice(1);
    }
  }

  function connect() {
    socket = io.connect();
    
    socket.on("connect", function() {
      // console.log("connected");
      socket.emit("setup", {gameId: gameId()});
    });

    socket.on("disconnect", function() {
      // console.log('disconnected');
      showOverlayText('Disconnected!  Retrying connection...');
    });

    socket.on("setup", function(data) {
      // console.log(data);
      drawPieces(data.placements);
      playerId = data.playerId;
      showPlayerLabel();
      window.location.hash = data.gameId;
      hideOverlay();
    });

    socket.on("placement", function(data) {
      // console.log(data);
      addPieceToPole(data.poleId, data.playerId);
    });

    socket.on("clear_board", function(data) {
      // console.log(data);
      drawPieces([]);
    });
  }
   
  function smoothMaterial(color) {
    return [
      new THREE.MeshLambertMaterial({color: color, shading: THREE.SmoothShading}),
      new THREE.MeshFaceMaterial()
    ];
  }

  function flatMaterial(color) {
    return [
      new THREE.MeshLambertMaterial({color: color, shading: THREE.flatShading}),
      new THREE.MeshFaceMaterial()
    ];
  }

  function calculateGeometries() {
    poleGeometry = new THREE.CylinderGeometry(15, 10, 10, 410, 0, 0);
    poleGeometry.computeVertexNormals();

    pieceGeometry = new THREE.SphereGeometry(50, 50, 50);
    pieceGeometry.computeVertexNormals();

    markerGeometry = new THREE.CylinderGeometry(6, 1, 30, 60, 10, 0);
  }

  function drawPiece(x, y, z, materials) {
    var piece = new THREE.Mesh(pieceGeometry, materials);
    piece.position.x = poleZeroCoord + x * 200;
    piece.position.y = 50 + y * 100;
    piece.position.z = poleZeroCoord + z * 200;
    piece.rotation.x = 90 * Math.PI / 180;
    scene.addObject(piece);
    pieces.push(piece);

    return piece;
  }

  function drawPieces(placements) {
    var len = pieces.length;
    for (var i = 0; i < len; i++) {
      scene.removeObject(pieces[i]);
    }

    piecePoleIds = {};

    for (var x = 0; x < 4; x++) {
      for (var z = 0; z < 4; z++) {
        var poleId = x * 4 + z;
        polePieceCount[poleId] = 0;

        for (var y = 0; y < 4; y++) {
          var playerId = placements[x + 4 * (y + 4 * z)];

          if (playerId > 0) {
            var materials = materialForPlayerId(playerId);

            var piece = drawPiece(x, y, z, materials);
            piecePoleIds[piece.id] = poleId;
            polePieceCount[poleId]++;
          }
        }
      }
    }
  }

  function drawCylinders() {
    for (var x = 0; x < 4; x++) {
      for (var z = 0; z < 4; z++) {
        var pole = new THREE.Mesh(poleGeometry, smoothMaterial(0x999999));
        pole.position.x = poleZeroCoord + x * 200;
        pole.position.y = 200;
        pole.position.z = poleZeroCoord + z * 200;
        pole.rotation.x = 90 * Math.PI / 180;
        scene.addObject(pole);

        poleIds[pole.id] = x * 4 + z;
      }
    }
  }

  function drawTable() {
    var plane = new THREE.Mesh(new THREE.CubeGeometry(1000, 1000, 50), flatMaterial(0x888888));
    plane.position.y -= 25;
    plane.rotation.x = - 90 * Math.PI / 180;
    scene.addObject(plane);
  }

  function drawGame() {
    drawTable();
    drawCylinders();
    drawPieces([]);
  }

  function drawStats() {
    if (typeof(Stats) !== "undefined") {
      stats = new Stats();
      stats.domElement.style.position = 'absolute';
      stats.domElement.style.top = '0px';
      container.appendChild(stats.domElement);
    }
  }

  function drawPoleMarker(poleId) {
    var poleCoods = poleCordsFromPoleId(poleId);

    var material =
      new THREE.MeshLambertMaterial({color: 0x990000,
                                     opacity: 0.6,
                                     shading: THREE.flatShading});
    material.transparent = true;

    var marker = new THREE.Mesh(markerGeometry, material);
    marker.position.x = poleZeroCoord + poleCoods[0] * 200;
    marker.position.y = 450;
    marker.position.z = poleZeroCoord + poleCoods[1] * 200;
    marker.rotation.x = -90 * Math.PI / 180;
    scene.addObject(marker);

    markerObject = marker;

    markedPoleId = poleId;
  }

  function removePoleMarker() {
    if (markerObject) {
      scene.removeObject(markerObject);
      markerObject = null;
    }

    markedPoleId = null;
  }

  function poleCordsFromPoleId(poleId) {
    var x = Math.floor(poleId / 4),
        z = poleId % 4;
    return [x, z];
  }

  function markPole(poleId) {
    if (markedPoleId != poleId) {
      removePoleMarker();
      drawPoleMarker(poleId);
    }
  }

  function setLights() {
    var ambientLight = new THREE.AmbientLight(0x606060);
    scene.addLight(ambientLight);

    var directionalLight = new THREE.DirectionalLight(0x999999);
    directionalLight.position.x = -0.74;
    directionalLight.position.y =  0.93;
    directionalLight.position.z =  0.57;
    
    directionalLight.position.normalize();
    scene.addLight(directionalLight);

    var directionalLight = new THREE.DirectionalLight(0x808080);
    directionalLight.position.x = -0.13;
    directionalLight.position.y =  0.65;
    directionalLight.position.z = -0.73;
    
    directionalLight.position.normalize();
    scene.addLight(directionalLight);
  }

  function setCameraPosition() {
    camera.position.x = 1400 * Math.sin(theta * Math.PI / 360);
    camera.position.z = 1400 * Math.cos(theta * Math.PI / 360);
  }

  function setCamera() {
    camera = new THREE.Camera(40, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.y = 1200;
    camera.target.position.y = 0;

    setCameraPosition();
  }

  function setSize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function init() {
    container = $('<div></div>');
    $('#render_area').append(container);

    scene = new THREE.Scene();

    setCamera();

    projector = new THREE.Projector();
    mouse2D = new THREE.Vector3(0, 10000, 0.5);
    ray = new THREE.Ray(camera.position, null);

    calculateGeometries();
    drawGame();
    setLights();

    renderer = new THREE.WebGLRenderer({antialias: true});
    setSize();

    container.append(renderer.domElement);


    drawStats();

    document.addEventListener("mousemove", onDocumentMouseMove, false);
    document.addEventListener("mousedown", onDocumentMouseDown, false);
    document.addEventListener("mouseup", onDocumentMouseUp, false);
    window.addEventListener("keyup", onDocumentKeyUp, false);
    window.addEventListener("keydown", onDocumentKeyDown, false);
    window.addEventListener("resize", onWindowResize, false);
    window.addEventListener("contextmenu", onWindowContextMenu, false);

    $('#game_ui').show();

    loadSound();
  }

  function loadSound() {
    if (window.Audio) {
      dropSound = new Audio('/sounds/drop.wav');
    }
  }

  function onWindowContextMenu(event) {
    event.preventDefault();
    return false;
  }

  function onDocumentKeyUp(event) {
    if (event.keyCode == 78) {
      socket.emit('clear');
    }

    dragKeyDown = false;
  }

  function onDocumentKeyDown(event) {
    if (event.ctrlKey || event.shiftKey) {
      dragKeyDown = true;
    }
  }

  function onDocumentMouseMove(event) {
    if (event.target != renderer.domElement) {
      return;
    }

    event.preventDefault();

    mouse2D.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse2D.y = - (event.clientY / window.innerHeight) * 2 + 1;

    if (lastMouseX) {
      mouseDeltaX = lastMouseX - mouse2D.x;
    }
    lastMouseX = mouse2D.x;
  }

  function materialForPlayerId(playerId) {
    return playerId == 1 ? lightMaterials : darkMaterials;
  }

  function addPieceToPole(poleId, playerId) {
    var poleCoods = poleCordsFromPoleId(poleId),
        y         = polePieceCount[poleId],
        piece     = drawPiece(poleCoods[0], y, poleCoods[1], materialForPlayerId(playerId));

    piecePoleIds[piece.id] = poleId;
    polePieceCount[poleId] = y + 1;

    if (dropSound) {
      dropSound.play();
    }
  }

  function onDocumentMouseDown(event) {
    if (event.target != renderer.domElement) {
      return;
    }

    event.preventDefault();

    if (event.button == 0 && !dragKeyDown) {
      if (markedPoleId != null) {
        socket.emit('place', markedPoleId);
      }
    } else {
      dragging = true;
    }
  }

  function onDocumentMouseUp(event) {
    event.preventDefault();

    dragging = false;
  }

  function onWindowResize(event) {
    setSize();
    setCamera();
  }

  function animate() {
    requestAnimationFrame(animate);

    render();

    if (stats) {
      stats.update();
    }
  }

  function getPoleId(object) {
    if (object.geometry == pieceGeometry) {
      return piecePoleIds[object.id];
    } else if (object.geometry == poleGeometry) {
      return poleIds[object.id];
    }
  }

  function setPoleMarkerIfMouseOverPole() {
    var intersects = ray.intersectScene(scene);
    if (intersects.length > 0) {
      var object = intersects[0].object,
      poleId = getPoleId(object);

      if (poleId >= 0 && polePieceCount[poleId] < 4) {
        markPole(poleId);
      } else {
        removePoleMarker();
      }
    } else if (rolledOverObject) {
      rolledOverObject.materials = [];
      rolledOverObject = null;
      removePoleMarker();
    }
  }

  function render() {


    var mouse3D = projector.unprojectVector(mouse2D.clone(), camera);
    ray.direction = mouse3D.subSelf(camera.position).normalize();

    if (dragging) {
      theta += mouseDeltaX * 500;
      mouseDeltaX = 0;
      setCameraPosition();
      removePoleMarker();
    } else if (isPlaying()) {
      setPoleMarkerIfMouseOverPole();
      if (markerObject) {
        markerObject.rotation.z += 0.01;
      }
    }

    renderer.render(scene, camera);
  }

  connect();
  init();
  animate();
}
