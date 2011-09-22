var Board  = require('../src/board').Board;

exports["max points scoring"] = function(test) {
  var placements = [],
      board;

  for (var i = 0; i < Board.size * Board.size * Board.size; i++) {
    placements[i] = 1;
  }

  board = new Board(placements);
  board.score();

  test.equals(76, board.scores[0]);

  test.done();
};

exports["horizontal scoring"] = function(test) {
  // perpendicular to z
  for (var x = 0; x < Board.size; x++) {
    for (var y = 0; y < Board.size; y++) {
      assertScore(test, function(board) {
        for (var z = 0; z < Board.size; z++) {
          board.placements[x + Board.size * (y + Board.size * z)] = 1;
        }
      });
    }
  }

  // perpendicular to x
  for (var y = 0; y < Board.size; y++) {
    for (var z = 0; z < Board.size; z++) {
      assertScore(test, function(board) {
        for (var x = 0; x < Board.size; x++) {
          board.placements[x + Board.size * (y + Board.size * z)] = 1;
        }
      });
    }
  }

  test.done();
};

exports["vertical scoring"] = function(test) {
  // perpendicular to y
  for (var x = 0; x < Board.size; x++) {
    for (var z = 0; z < Board.size; z++) {
      assertScore(test, function(board) {
        for (var y = 0; y < Board.size; y++) {
          board.placements[x + Board.size * (y + Board.size * z)] = 1;
        }
      });
    }
  }
  test.done();
};

exports["diagonal horizontal scoring"] = function(test) {
  // on x, z plane
  for (var y = 0; y < Board.size; y++) {
    assertScore(test, function(board) {
      for (var i = 0; i < Board.size; i++) {
        board.placements[i + Board.size * (y + Board.size * i)] = 1;
      }
    });

    assertScore(test, function(board) {
      for (var i = 0; i < Board.size; i++) {
        board.placements[(Board.size - i - 1) + Board.size * (y + Board.size * i)] = 1;
      }
    });
  }

  test.done();
};

exports["diagonal vertical scoring"] = function(test) {
  // y, z plane
  for (var x = 0; x < Board.size; x++) {
    assertScore(test, function(board) {
      for (var i = 0; i < Board.size; i++) {
        board.placements[x + Board.size * (i + Board.size * i)] = 1;
      }
    });

    assertScore(test, function(board) {
      for (var i = 0; i < Board.size; i++) {
        board.placements[x + Board.size * ((Board.size - i - 1) + Board.size * i)] = 1;
      }
    });
  }

  // x, y plane
  for (var z = 0; z < Board.size; z++) {
    assertScore(test, function(board) {
      for (var i = 0; i < Board.size; i++) {
        board.placements[i + Board.size * (i + Board.size * z)] = 1;
      }
    });

    assertScore(test, function(board) {
      for (var i = 0; i < Board.size; i++) {
        board.placements[i + Board.size * ((Board.size - i - 1) + Board.size * z)] = 1;
      }
    });
  }

  test.done();
};

exports["'vector' scoring"] = function(test) {
  assertScore(test, function(board) {
    for (var i = 0; i < Board.size; i++) {
      board.placements[i + Board.size * (i + Board.size * i)] = 1;
    }
  });

  assertScore(test, function(board) {
    for (var i = 0; i < Board.size; i++) {
      board.placements[i + Board.size * ((Board.size - i - 1) + Board.size * i)] = 1;
    }
  });

  assertScore(test, function(board) {
    for (var i = 0; i < Board.size; i++) {
      board.placements[(Board.size - i - 1) + Board.size * (i + Board.size * i)] = 1;
    }
  });

  assertScore(test, function(board) {
    for (var i = 0; i < Board.size; i++) {
      board.placements[(Board.size - i - 1) + Board.size * ((Board.size - i - 1) + Board.size * i)] = 1;
    }
  });

  test.done();
};

function assertScore(test, fn) {
  var board = new Board([]);
  board.clear();

  fn(board);

  board.score();
  test.equals(1, board.scores[0]);
}

