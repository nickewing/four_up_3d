function Board(placements) {
  this.placements = placements;
}

Board.prototype.clear = function() {
  this.placements = [];
  for (var i = 0; i < 64; i++) {
    this.placements[i] = 0;
  }
}

Board.prototype.placementsToString = function() {
  return this.placements.join('');
}

Board.prototype.placePiece = function(poleId, playerId) {
  var x = Math.floor(poleId / 4),
      z = poleId % 4;

  for (var y = 0; y < 4; y++) {
    var placementId = x + 4 * (y + 4 * z);
    if (this.placements[placementId] == 0) {
      this.placements[placementId] = playerId;

      return [x, y, z];
    }
  }

  return null;
}

exports.Board = Board;
