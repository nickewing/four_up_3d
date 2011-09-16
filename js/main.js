var requires = [
  "Three",
  "RequestAnimationFrame",
  "Stats",
];

require(requires, function() {
  require.ready(function(three, requestAnimationFrame, stats) {
    game();
  });
});


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
      ray,
      rolledOverObject,
      theta                  = 45,
      darkColor              = 0x603311,
      darkSelectedColor      = 0x633614,
      lightColor             = 0xFFF5EE,
      lightSelectedColor     = 0xFFF5FF,
      markerColor            = 0x990000,
      darkMaterials          = smoothMaterial(darkColor),
      darkSelectedMaterials  = smoothMaterial(darkSelectedColor),
      lightMaterials         = smoothMaterial(lightColor),
      lightSelectedMaterials = smoothMaterial(lightSelectedColor),
      markerMaterials        = smoothMaterial(markerColor, 1),
      markerObject,
      markedPoleId,
      pieceGeometry,
      poleGeometry,
      markerGeometry,
      pieces                 = [],
      piecePoleIds           = {},
      poleIds                = {},
      polePieceCount         = [],
      c0                     = -300,
      playerId               = 1;
   
  function smoothMaterial(color, opacity) {
    opacity = opacity || 1;
    return [
      new THREE.MeshLambertMaterial({color: color, opacity: opacity, shading: THREE.SmoothShading}),
      new THREE.MeshFaceMaterial()
    ];
  }

  function calculateGeometries() {
    poleGeometry = new THREE.CylinderGeometry(10, 10, 10, 410, 0, 0);
    poleGeometry.computeVertexNormals();

    pieceGeometry = new THREE.SphereGeometry(50, 50, 50);
    pieceGeometry.computeVertexNormals();

    markerGeometry = new THREE.CylinderGeometry(10, 1, 30, 60, 0, 0);
    markerGeometry.computeVertexNormals();
  }

  function drawPiece(x, y, z, materials) {
    var piece = new THREE.Mesh(pieceGeometry, materials);
    piece.position.x = c0 + x * 200;
    piece.position.y = 50 + y * 100;
    piece.position.z = c0 + z * 200;
    piece.rotation.x = 90 * Math.PI / 180;
    scene.addObject(piece);

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
          var placement = placements[x + 4 * (y + 4 * z)];

          if (placement > 0) {
            var materials = placement == 1 ? darkMaterials : lightMaterials;

            var piece = drawPiece(x, y, z, materials);
            piecePoleIds[piece.id] = poleId;
            polePieceCount[poleId]++;

            pieces.push(piece);
          }
        }
      }
    }
  }

  function drawPiecesRandomly() {
    var placements = [];

    for (var i = 0; i < 4*4*4; i++) {
      placements[i] = 0;
    }

    for (var x = 0; x < 4; x++) {
      for (var z = 0; z < 4; z++) {
        var numPieces = Math.random() * 4;
        for (var y = 0; y < numPieces; y++) {
          placements[x + 4 * (y + 4 * z)] = Math.random() > 0.5 ? 1 : 2;
        }
      }
    }
    drawPieces(placements);
  }

  function drawCylinders() {
    for (var x = 0; x < 4; x++) {
      for (var z = 0; z < 4; z++) {
        var pole = new THREE.Mesh(poleGeometry, smoothMaterial(0x999999));
        pole.position.x = c0 + x * 200;
        pole.position.y = 200;
        pole.position.z = c0 + z * 200;
        pole.rotation.x = 90 * Math.PI / 180;
        scene.addObject(pole);

        poleIds[pole.id] = x * 4 + z;
      }
    }
  }

  function drawTable() {
    var plane = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000, 0, 0), smoothMaterial(0x335533));
    plane.rotation.x = - 90 * Math.PI / 180;
    scene.addObject(plane);
  }

  function drawGame() {
    drawTable();
    drawCylinders();
    // drawPiecesRandomly();
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

    var marker = new THREE.Mesh(markerGeometry, markerMaterials);
    marker.position.x = c0 + poleCoods[0] * 200;
    marker.position.y = 450;
    marker.position.z = c0 + poleCoods[1] * 200;
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
    directionalLight.position.y =  0.33;
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
    container = document.createElement('div');
    document.body.appendChild(container);

    scene = new THREE.Scene();

    setCamera();

    projector = new THREE.Projector();
    mouse2D = new THREE.Vector3(0, 10000, 0.5);
    ray = new THREE.Ray(camera.position, null);

    calculateGeometries();
    drawGame();
    setLights();

    // renderer = new THREE.CanvasRenderer();
    renderer = new THREE.WebGLRenderer({ antialias: true });
    // renderer = new THREE.WebGLRenderer();
    setSize();

    container.appendChild(renderer.domElement);


    drawStats();

    document.addEventListener("mousemove", onDocumentMouseMove, false);
    document.addEventListener("mousedown", onDocumentMouseDown, false);
    document.addEventListener("mouseup", onDocumentMouseUp, false);
    window.addEventListener("resize", onWindowResize, false);
  }

  function onDocumentMouseMove(event) {
    event.preventDefault();

    mouse2D.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse2D.y = - (event.clientY / window.innerHeight) * 2 + 1;

    if (lastMouseX) {
      mouseDeltaX = lastMouseX - mouse2D.x;
    }
    lastMouseX = mouse2D.x;
  }

  function materialForPlayerId(playerId) {
    return playerId == 1 ? lightMaterials : darkSelectedMaterials;
  }

  function addPieceToPole(poleId) {
    var poleCoods = poleCordsFromPoleId(poleId),
        y         = polePieceCount[poleId],
        piece     = drawPiece(poleCoods[0], y, poleCoods[1], materialForPlayerId(playerId));

    piecePoleIds[piece.id] = poleId;
    polePieceCount[poleId] = y + 1;

    if (playerId == 1) {
      playerId = 2;
    } else if (playerId == 2) {
      playerId = 1;
    }
  }

  function onDocumentMouseDown(event) {
    event.preventDefault();

    if (markedPoleId != null) {
      addPieceToPole(markedPoleId);
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
    } else {
      setPoleMarkerIfMouseOverPole();
    }

    renderer.render(scene, camera);
  }

  init();
  animate();
  console.log(renderer.getContext().getContextAttributes());
}

