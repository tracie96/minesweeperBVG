var Minecontrol = function(containerId) {
  this.mainContainer = $(containerId);

  this.MINE = '\uD83D\uDCA3'; // bomb emoji
  this.FLAG = '\uD83D\uDEA9'; // triangle flag emoji
  this.MAX_TIME = 999;
  this.SETTINGS = {
    BEGINNER: {
      rows: 9,
      cols: 9,
      mines: 10 
    },
    INTERMEDIATE: {
      rows: 16,
      cols: 16,
      mines: 40
    },
    EXPERT: {
      rows: 16,
      cols: 30,
      mines: 99
    }
  };
};

/**
 * Attaches Minecontrol display to screen and sets up click listeners.
 */
Minecontrol.prototype.init = function(settings) {
  this.debug = false;

  this.settings = settings;
  this.won = false;
  this.lost = false;

  this.firstClickOccurred = false;

  this.cellsRevealed = 0;
  this.cellsFlagged = 0;
  this.cellsToReveal = (settings.rows * settings.cols) - settings.mines;
  document.getElementById("mine").innerHTML =settings.mines; //showMines
  this.elapsedTime = 0;
  clearInterval(this.timeInterval);
  this.misclickCount = 0;

  this.initField(settings.rows, settings.cols);
  this.initDisplay();
};

Minecontrol.prototype.initField = function(rows, cols) {
  // Initialize 2-D array
  this.field = [];
  for (var i = 0; i < rows; i++) {
    var row = new Array(cols);
    for (var j = 0; j < cols; j++) {
      row[j] = { val: 0, flagged: false };
    }
    this.field.push(row);
  }
};

/**
 * Updates this.field to contain the number of mines requested.
 *
 * Should be called after the user has made their first click so that mines can
 * be placed while avoiding that location.
 */
Minecontrol.prototype.setMines = function(mines, firstClickRow, firstClickCol) {
  var field = this.field;
  var rows = field.length;
  var cols = field[0].length;

  // Must count mines actually planted so that mines are not placed in
  // previously selected locations.
  var minesPlanted = 0;
  while (minesPlanted != mines) {
    var row = Math.floor(Math.random() * rows);
    var col = Math.floor(Math.random() * cols);

    // Cannot use cell if the user just clicked it or if it was already a mine
    if ((row == firstClickRow && col == firstClickCol)
      || (field[row][col] && field[row][col].val == this.MINE)) continue;

    field[row][col] = {
      val: this.MINE,
      flagged: false
    };

    minesPlanted++;
  }

  // Fill field with mine counts
  for (var i = 0; i < rows; i++) {
    for (var j = 0; j < cols; j++) {
      field[i][j].val = this.countAdjacentMines(i, j);
    }
  }
};

/**
 * For a given coordinate, returns the number of mines it is next to.
 */
Minecontrol.prototype.countAdjacentMines = function(row, col) {
  var field = this.field;
  if (field[row][col] && field[row][col].val == this.MINE) return this.MINE;
  var count = 0;
  var neighbors = this.getNeighbors(row, col);
  for (var i = 0; i < neighbors.length; i++) {
    var r = neighbors[i].row;
    var c = neighbors[i].col;
    if (field[r][c] && field[r][c].val == this.MINE) count++;
  }
  return count;
};

/**
 * Every cell calls this click handler the first time it's clicked. If it was
 * the first cell to be clicked (flagged cells do not count), this finally adds
 * mines to the screen and excludes this click. Otherwise, a first click was
 * already made, so we can just change this cell's click handler for the
 * duration of the game.
 */
Minecontrol.prototype.firstClickHandler = function(row, col) {
  if (this.field[row][col].flagged) return;

  if (this.firstClickOccurred) {
    var that = this;
    var cell = this.getCell(row, col);
    cell.unbind('click');
    cell.click(function(event) {
      that.mainClickHandler(row, col);
    });
  } else {
    this.firstClickOccurred = true;
    this.setMines(this.settings.mines, row, col);
    this.initDisplay();
    this.startTimer();
  }

  this.mainClickHandler(row, col);
};

/**
 * Adds HTML table for this object's already initialized field. Control panel is
 * added after mines are added in order to set width correctly.
 */
Minecontrol.prototype.initDisplay = function() {
  // for resetting the game
  if (this.display) this.display.empty();

  this.display = $('#game-container');
  this.gameTable = $(document.createElement('table'));
  this.gameTable.addClass('no-highlight inset');
  this.gameTable.attr('cellspacing', 0);

  var that = this;
  this.field.forEach(function(row, r) {

    var tr = document.createElement('tr');
    row.forEach(function(cell, c) {

      var td = $(document.createElement('td'));
      td.html(that.createElemForValue(that.field[r][c].val));

      // left click
      td.click(function(event) {
        that.firstClickHandler(r, c);
      });
      
      // right click
      td.get(0).oncontextmenu = function(event) {
        event.preventDefault();
        that.toggleFlag(r, c);
      };

      // styling
      td.addClass('cell outset');
      if (that.debug) td.addClass('debug');
      if (that.field[r][c].flagged) {
        td.addClass('flagged');
        td.html(that.FLAG);
      }

      tr.appendChild(td.get(0));
    });
    that.gameTable.append(tr);
  });
  this.display.prepend(this.gameTable);
  this.initControlPanel();
  this.initHelper();
};

/**
 * Control panel is the top portion the reset
 */
 Minecontrol.prototype.startGame= function(){
  this.controlPanel.resetButton;
}
Minecontrol.prototype.initControlPanel = function() {
  var that = this;
  this.controlPanel = $(document.createElement('div'));
  this.controlPanel.resetButton = $(document.createElement('div'));
  this.controlPanel.flagCount = $(document.createElement('div'));
  this.controlPanel.timer = $(document.createElement('div'));

  var controlPanel = this.controlPanel;
  var resetButton = this.controlPanel.resetButton;

  controlPanel.append(resetButton);
  this.display.prepend(controlPanel);

  // overall panel styling
  controlPanel.addClass('control-panel inset');

  // debug link styling
  var debugLink = $(document.createElement('a'));
  debugLink.html('debug');
  debugLink.click(this.toggleDebug);
  debugLink.addClass('debug-link');
  this.display.append(debugLink);

  // reset button styling and clicks
  resetButton.addClass('reset-button outset');
  resetButton.css('margin-left',
      (controlPanel.innerWidth() - resetButton.width()) / 2);
      controlPanel.resetButton.html('\uD83D\uDE42');
  resetButton.click(function(event) {
    that.init(that.settings);
  });

};

Minecontrol.prototype.initHelper = function() {
  this.misclickDisplay = $('#misclick-counter');
};


Minecontrol.prototype.getCell = function(row, col) {
  return $(this.gameTable[0].rows[row].cells[col]);
};

Minecontrol.prototype.mainClickHandler = function(row, col) {
  var field = this.field;

  // do nothing if already lost or if a flagged cell is clicked
  if (this.gameEnded() || field[row][col].flagged) return;

  if (!this.getCell(row, col).hasClass('revealed')) {
    this.revealCell(row, col);

  } else if (this.flagAllNeighborsRequested(row, col)) {
    var neighbors = this.getNeighbors(row, col);
    for (var i = 0; i < neighbors.length; i++) {
      this.toggleFlag(neighbors[i].row, neighbors[i].col, true);
    }

  } else if (this.expandRequested(row, col)) {
    var neighbors = this.getNeighbors(row, col);
    for (var i = 0; i < neighbors.length; i++) {
      this.revealCell(neighbors[i].row, neighbors[i].col);
      if (this.gameEnded()) return;
    }

  } else {
    this.misclickCount++;
    this.misclickDisplay.html(this.misclickCount);
  }
};

Minecontrol.prototype.revealCell = function(row, col) {
  // base case: don't reveal flagged or already revealed cells
  if (this.field[row][col].flagged
      || this.getCell(row, col).hasClass('revealed')) return;

  this.revealSingleCell(row, col);

  if (this.gameEnded() || this.field[row][col].val != 0) return;

  // recursive step: reveal neighbors
  var neighbors = this.getNeighbors(row, col);
  for (var i = 0; i < neighbors.length; i++) {
    this.revealCell(neighbors[i].row, neighbors[i].col);
    if (this.gameEnded()) return;
  }
};

/**
 * Checks whether this reveal resulted in a win or loss.
 */
Minecontrol.prototype.revealSingleCell = function(row, col) {
  var displayCell = this.getCell(row, col);
  var cell = this.field[row][col];

  if (displayCell.hasClass('revealed') || cell.flagged) return;

  displayCell.html(this.createElemForValue(cell.val));
  displayCell.addClass('revealed cell-' + (cell.val == this.MINE ? 'X' : cell.val));
  displayCell.removeClass('outset');
  if (this.debug) displayCell.removeClass('debug');

  this.cellsRevealed++;
  if (cell.val == this.MINE) {
    this.displayLoss();
  } else if (this.cellsRevealed == this.cellsToReveal) {
    this.displayWin();
  }
};

/**
 * Returns a list of coordinates for cells adjacent to this row and column.
 */
Minecontrol.prototype.getNeighbors = function(row, col) {
  var field = this.field;
  var neighbors = [];
  for (var r = row - 1; r <= row + 1; r++) {
    for (var c = col - 1; c <= col + 1; c++) {
      if (0 <= r && r < field.length
          && 0 <= c && c < field[0].length
          && !(r == row && c == col)) {
        neighbors.push({row: r, col: c});
      }
    }
  }
  return neighbors;
};

Minecontrol.prototype.flagAllNeighborsRequested = function(row, col) {
  if (!this.getCell(row, col).hasClass('revealed')) return false;

  var unrevealedCount = 0;
  var neighbors = this.getNeighbors(row, col);
  for (var i = 0; i < neighbors.length; i++) {
    var neighbor = this.getCell(neighbors[i].row, neighbors[i].col);
    if (!neighbor.hasClass('revealed')) {
      unrevealedCount++;
    }
  }

  return unrevealedCount == this.field[row][col].val;
};

Minecontrol.prototype.expandRequested = function(row, col) {
  if (!this.getCell(row, col).hasClass('revealed')) return false;

  var flagCount = 0;
  var neighbors = this.getNeighbors(row, col);
  for (var i = 0; i < neighbors.length; i++) {
    var r = neighbors[i].row;
    var c = neighbors[i].col;
    var neighbor = this.getCell(r, c);
    if (!neighbor.hasClass('revealed') && this.field[r][c].flagged) {
      flagCount++;
    }
  }

  return flagCount == this.field[row][col].val;
};


Minecontrol.prototype.toggleFlag = function(row, col, forceFlag) {
  var displayCell = this.getCell(row, col);

  if (this.gameEnded() || displayCell.hasClass('revealed')) return;

  var cell = this.field[row][col];
  if (!this.field[row][col].flagged) {
    displayCell.addClass('flagged');
    displayCell.html(this.createElemForValue(this.FLAG));
    this.cellsFlagged++;
    cell.flagged = true;
  } else if (!forceFlag) {
    displayCell.removeClass('flagged');
    displayCell.html(this.createElemForValue(cell.val));
    this.cellsFlagged--;
    cell.flagged = false;
  }
  this.controlPanel.flagCount.html(this.settings.mines - this.cellsFlagged);
};


Minecontrol.prototype.startTimer = function() {
  var that = this;
  this.timeInterval = setInterval(function() {
    that.controlPanel.timer.html(++that.elapsedTime);
    if (that.elapsedTime == that.MAX_TIME)
      clearInterval(that.timeInterval);
      document.getElementById("timer").innerHTML =++that.elapsedTime;
  }, 1000);

};

/**
 * Stops timer and shows win message.
 */
Minecontrol.prototype.displayWin = function() {
  this.won = true;
  this.controlPanel.resetButton.html('\uD83D\uDE0E'); // sunglasses wearing face emoji
  clearInterval(this.timeInterval);
};

/**
 * Reveals all unflagged mines, shows loss message, and sets this.lost to true.
 */
Minecontrol.prototype.displayLoss = function() {
  if (this.lost) return;
  this.lost = true;
  this.controlPanel.resetButton.html('\uD83E\uDDDF'); // dead face emoji
  clearInterval(this.timeInterval);
  for (var r = 0; r < this.field.length; r++) {
    for (var c = 0; c < this.field[0].length; c++) {
      var cell = this.field[r][c];
      if (cell.val == this.MINE && !cell.flagged) {
        this.revealSingleCell(r, c);
      }
    }
  }
};

/**
 * For debugging purposes, allow the user to continue playing as if they haven't
 * lost, even if mines have been revealed.
 */
Minecontrol.prototype.gameEnded = function() {
  return !this.debug && (this.won || this.lost);
};

/**
 * Returns the given value as a string padded with zeroes up to length.
 */
Minecontrol.prototype.zeroFill = function(value, length) {
  if (length === undefined) length = 3;
  return value;
};

/**
 * When called, reveals (or hides) values of all cells.
 */
Minecontrol.prototype.toggleDebug = function() {
  this.debug = !this.debug;
  $('.cell:not(.revealed)').toggleClass('debug');
};

/**
 * Creates the div that must wrap cell values for min-width/height reasons.
 */
Minecontrol.prototype.createElemForValue = function(val) {
  var div = $(document.createElement('div'));
  if (val == this.MINE) {
    div.addClass('mine');
  }
  div.html(val);
  return div.get(0);
}
