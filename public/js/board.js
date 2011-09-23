(function() {
  "use strict";

  function Board(placements) {
    if (placements) {
      this.placements = placements;
    } else {
      this.clear();
    }

    this.scores = [0, 0];
  }

  Board.size = 4;
  Board.sizeCubed = 64;

  Board.prototype.setPlacements = function(placements) {
    var newPieces = false;
    for (var i = 0; i < Board.sizeCubed; i++) {
      if (placements[i] && this.placements[i] != placements[i]) {
        newPieces = true;
      }
      this.placements[i] = placements[i];
    }
    return newPieces;
  }

  Board.prototype.clear = function() {
    this.placements = [];
    for (var i = 0; i < Board.sizeCubed; i++) {
      this.placements[i] = 0;
    }
    this.scores = [0, 0];
  }

  Board.prototype.placementsToString = function() {
    return this.placements.join('');
  }

  Board.prototype.placePiece = function(poleId, playerId) {
    var x = Math.floor(poleId / Board.size),
        z = poleId % Board.size;

    for (var y = 0; y < Board.size; y++) {
      var placementId = this.placementId(x, y, z);
      if (this.placements[placementId] == 0) {
        this.placements[placementId] = playerId;

        return [x, y, z];
      }
    }

    return null;
  }

  Board.prototype.placementId = function(x, y, z) {
    return x + Board.size * (y + Board.size * z);
  }

  Board.prototype.placementAt = function(x, y, z) {
    return this.placements[this.placementId(x, y, z)];
  }

  Board.prototype.scoreLine = function(point, deltas) {
    var player = this.placementAt.apply(this, point);

    if (!player) return;

    for (var i = 1; i < Board.size; i++) {
      point[0] += deltas[0];
      point[1] += deltas[1];
      point[2] += deltas[2];

      if (this.placementAt.apply(this, point) != player) {
        return;
      }
    }

    this.scores[player - 1] += 1;
  }

  Board.prototype.score = function() {
    var x, y, z, points = [];

    this.scores = [0, 0];

    // "vectors"
    this.scoreLine([0, 0, 0], [1, 1, 1]);
    this.scoreLine([Board.size - 1, 0, 0], [-1,  1,  1]);
    this.scoreLine([0, Board.size - 1, 0], [ 1, -1,  1]);
    this.scoreLine([0, 0, Board.size - 1], [ 1,  1, -1]);

    // verticals
    for (x = 0; x < Board.size; x++) {
      for (z = 0; z < Board.size; z++) {
        this.scoreLine([x, 0, z], [0, 1, 0]);
      }
    }

    // diagonal verticals
    for (x = 0; x < Board.size; x++) {
      this.scoreLine([x, 0, 0], [0, 1, 1]);
      this.scoreLine([x, Board.size - 1, 0], [0, -1, 1]);
    }

    for (z = 0; z < Board.size; z++) {
      this.scoreLine([0, 0, z], [1, 1, 0]);
      this.scoreLine([0, Board.size - 1, z], [1, -1, 0]);
    }

    for (y = 0; y < Board.size; y++) {
      // diagonal horizontals
      this.scoreLine([0, y, 0], [1, 0, 1]);
      this.scoreLine([Board.size - 1, y, 0], [-1, 0, 1]);

      // non-diagonal horizontals
      for (x = 0; x < Board.size; x++) {
        this.scoreLine([x, y, 0], [0, 0, 1]);
      }

      for (z = 0; z < Board.size; z++) {
        this.scoreLine([0, y, z], [1, 0, 0]);
      }
    }
  }

  if (typeof(exports) == "undefined") {
    window.Board = Board;
  } else {
    exports.Board = Board;
  }

})();
