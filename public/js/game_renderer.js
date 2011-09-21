function GameRenderer() {
  var self                 = this,
      stats,
      camera,
      scene,
      renderer,
      projector,
      mouse2D,
      mouseDeltaX             = 0,
      lastMouseX,
      dragging                = false,
      dragKeyDown             = false,
      ray,
      theta                   = 45,
      darkMaterials           = smoothMaterial(self.colors.darkPiece),
      lightMaterials          = smoothMaterial(self.colors.lightPiece),
      markerObject,
      markedPoleId,
      pieceGeometry,
      poleGeometry,
      poleHitAreaGeometry,
      poleIds                 = {},
      polePieceCount          = [],
      poleZeroCoord           = -300,
      pieceMarkers        = [],
      pieceMarkerGeometry,
      markerGeometry,
      pieces                  = [],
      piecePoleIds            = {},
      debug                   = false,
      listeners               = [],
      placementEnabled        = false;
   
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

    poleHitAreaGeometry = new THREE.CylinderGeometry(15, 30, 30, 440, 0, 0);

    pieceGeometry = new THREE.SphereGeometry(50, 50, 50);
    pieceGeometry.computeVertexNormals();

    markerGeometry = new THREE.CylinderGeometry(6, 1, 30, 60, 10, 0);

    pieceMarkerGeometry = new THREE.SphereGeometry(55, 55, 55);
    pieceMarkerGeometry.computeVertexNormals();
  }

  function positionPieceObject(x, y, z, object) {
    object.position.x = poleZeroCoord + x * 200;
    object.position.y = 50 + y * 100;
    object.position.z = poleZeroCoord + z * 200;
    object.rotation.x = 90 * Math.PI / 180;
  }

  function drawPiece(x, y, z, materials) {
    var piece = new THREE.Mesh(pieceGeometry, materials);
    positionPieceObject(x, y, z, piece);
    scene.addObject(piece);
    pieces.push(piece);

    return piece;
  }

  function drawPoles() {
    for (var x = 0; x < 4; x++) {
      for (var z = 0; z < 4; z++) {
        var pole = new THREE.Mesh(poleGeometry, smoothMaterial(self.colors.pole));
        pole.position.x = poleZeroCoord + x * 200;
        pole.position.y = 200;
        pole.position.z = poleZeroCoord + z * 200;
        pole.rotation.x = 90 * Math.PI / 180;
        scene.addObject(pole);

        var hitAreaMaterial;
        if (debug) {
          hitAreaMaterial =
            new THREE.MeshLambertMaterial({color: 0x000000,
                                           opacity: 0.1,
                                           shading: THREE.flatShading});
          hitAreaMaterial.transparent = true;
        }

        var poleHitArea = new THREE.Mesh(poleHitAreaGeometry, hitAreaMaterial);
        poleHitArea.position.x = poleZeroCoord + x * 200;
        poleHitArea.position.y = 200;
        poleHitArea.position.z = poleZeroCoord + z * 200;
        poleHitArea.rotation.x = 90 * Math.PI / 180;
        scene.addObject(poleHitArea);

        var poleCoord = x * 4 + z;
        poleIds[poleHitArea.id] = poleCoord;
      }
    }
  }

  function drawTable() {
    var plane = new THREE.Mesh(new THREE.CubeGeometry(1000, 1000, 50),
                               flatMaterial(self.colors.table));
    plane.position.y -= 25;
    plane.rotation.x = - 90 * Math.PI / 180;
    scene.addObject(plane);
  }

  function drawStats(container) {
    if (typeof(Stats) !== "undefined") {
      stats = new Stats();
      stats.domElement.style.position = "absolute";
      stats.domElement.style.top = "0px";
      container.appendChild(stats.domElement);
    }
  }

  function drawPoleMarker(poleId) {
    var poleCoods = poleCordsFromPoleId(poleId);

    var material =
      new THREE.MeshLambertMaterial({color: self.colors.poleMarker,
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
    var ambientLight =
      new THREE.AmbientLight(self.colors.ambientLight);
    scene.addLight(ambientLight);

    var directionalLight =
      new THREE.DirectionalLight(self.colors.directionalLight1);
    directionalLight.position.x = -0.74;
    directionalLight.position.y =  0.93;
    directionalLight.position.z =  0.57;
    
    directionalLight.position.normalize();
    scene.addLight(directionalLight);

    var directionalLight =
      new THREE.DirectionalLight(self.colors.directionalLight2);
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
    var container = $("<div></div>");
    $("#render_area").append(container);

    scene = new THREE.Scene();

    setCamera();
    setLights();

    projector = new THREE.Projector();
    mouse2D = new THREE.Vector3(0, 10000, 0.5);
    ray = new THREE.Ray(camera.position, null);

    calculateGeometries();

    drawTable();
    drawPoles();

    renderer = new THREE.WebGLRenderer({antialias: true});
    setSize();

    container.append(renderer.domElement);

    drawStats(container);

    document.addEventListener("mousemove", onDocumentMouseMove, false);
    document.addEventListener("mousedown", onDocumentMouseDown, false);
    document.addEventListener("mouseup", onDocumentMouseUp, false);
    window.addEventListener("keyup", onDocumentKeyUp, false);
    window.addEventListener("keydown", onDocumentKeyDown, false);
    window.addEventListener("resize", onWindowResize, false);
    window.addEventListener("contextmenu", onWindowContextMenu, false);
  }

  function onWindowContextMenu(event) {
    event.preventDefault();
    return false;
  }

  function onDocumentKeyUp(event) {
    if (event.keyCode == 78) {
      self.clear();
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

  function onDocumentMouseDown(event) {
    if (event.target != renderer.domElement) {
      return;
    }

    event.preventDefault();

    if (event.button == 0 && !dragKeyDown) {
      if (markedPoleId != null) {
        self.addPieceToPole(markedPoleId, self.playerId);
        updateListeners({
          type: "placement",
          poleId: markedPoleId
        });
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
    } else if (object.geometry == poleHitAreaGeometry) {
      return poleIds[object.id];
    }
  }

  function setPoleMarkerIfMouseOverPole() {
    var intersects = ray.intersectScene(scene),
        numIntersects = intersects.length;

    if (numIntersects > 0) {
      for (var i = 0; i < numIntersects; i++) {
        var object = intersects[i].object,
        poleId = getPoleId(object);

        if (poleId >= 0 && polePieceCount[poleId] < 4) {
          markPole(poleId);

          return;
        }
      }
    }

    removePoleMarker();
  }

  function render() {
    var mouse3D = projector.unprojectVector(mouse2D.clone(), camera);
    ray.direction = mouse3D.subSelf(camera.position).normalize();

    if (dragging) {
      theta += mouseDeltaX * 500;
      mouseDeltaX = 0;
      setCameraPosition();
      removePoleMarker();
    } else if (placementEnabled) {
      setPoleMarkerIfMouseOverPole();
      if (markerObject) {
        markerObject.rotation.z += 0.01;
      }
    }

    renderer.render(scene, camera);
  }

  function updateListeners(data) {
    var len = listeners.length;
    for (var i = 0; i < len; i++) {
      listeners[i](data);
    }
  }

  self.drawPieces = function(placements) {
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

  self.addPieceToPole = function(poleId, playerId) {
    var poleCoods = poleCordsFromPoleId(poleId),
        y         = polePieceCount[poleId],
        piece     = drawPiece(poleCoods[0], y, poleCoods[1], materialForPlayerId(playerId));

    piecePoleIds[piece.id] = poleId;
    polePieceCount[poleId] = y + 1;
  }

  self.clear = function() {
    updateListeners({type: 'clear'});
  }

  self.addListener = function(cb) {
    listeners.push(cb);
  }

  self.enablePlacement = function(state) {
    placementEnabled = !!state;

    if (!placementEnabled) {
      removePoleMarker();
    }
  }

  self.drawPieceMarker = function(x, y, z) {
    var material =
      new THREE.MeshLambertMaterial({color: self.colors.pieceMarker,
                                     opacity: 0.4,
                                     shading: THREE.flatShading});
    material.transparent = true;

    var marker = new THREE.Mesh(pieceMarkerGeometry, material);
    positionPieceObject(x, y, z, marker);
    scene.addObject(marker);
    pieces.push(marker);

    return marker;
  }

  self.clearPieceMarkers = function() {
    var len = pieceMarkers.length;

    for (var i = 0; i < len; i++) {
      scene.removeObject(pieceMarkers[i]);
    }
  }

  init();
  animate();
}

// http://www.colourlovers.com/palette/1766061/Latte_feather
GameRenderer.prototype.colors = {
  darkPiece:         0x4F2B0F,
  lightPiece:        0xCCD8DD,
  pieceMarker:       0x990000,
  pole:              0x999999,
  poleMarker:        0x990000,
  table:             0x4F2B0F,
  ambientLight:      0x606060,
  directionalLight1: 0x999999,
  directionalLight2: 0x808080
};
