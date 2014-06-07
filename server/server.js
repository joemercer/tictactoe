var localeval = Meteor.require('localeval');

// settings
// !!! need to change this to the right value
var gamesNeededToWin = 5;
var turnsPerSecond = .1;

// NOTE: game sometimes refers to an individual match, sometimes a best of series
// sorry

// indicates whether a game is currently being played on the client
var gameInProgress = false;
var gameStartTime = false;

// create a new game
createGame = function(starter) {
	var game = {};
	// game board is represented as a 3x3 2D array
	// spaces indicate that no move has happened yet
	game.board = [[' ', ' ', ' '],[' ', ' ', ' '],[' ', ' ', ' ']];
	game.starter = starter;
	game.startTime = (new Date()).getTime();
	game.turnCount = 0;
	game.currentPlayer = starter;
	game.result = false;
	game.possibleMoves = [
		{
			row: 0,
			column: 0,
			weight: 0
		},
		{
			row: 0,
			column: 1,
			weight: 0
		},
		{
			row: 0,
			column: 2,
			weight: 0
		},
		{
			row: 1,
			column: 0,
			weight: 0
		},
		{
			row: 1,
			column: 1,
			weight: 0
		},
		{
			row: 1,
			column: 2,
			weight: 0
		},
		{
			row: 2,
			column: 0,
			weight: 0
		},
		{
			row: 2,
			column: 1,
			weight: 0
		},
		{
			row: 2,
			column: 2,
			weight: 0
		}
	];

  return game;
};

// starts the interval on the server to take turns
// stores the interval id in a variable so it can be stopped later
var turnTakingInterval;
var startTakingTurns = function() {

	// every tenth of a second take a turn in every game
	turnTakingInterval = Meteor.setInterval(function() {

		Games.find({result: false, startTime: {$gt: gameStartTime}}).forEach(function(game){

			var scripts = Scripts.find({
				player: game.currentPlayer,
				active: true
			}).fetch();

			if (!scripts) {
				scripts = [];
			}

			takeTurn(game, scripts);

		});

	}, turnsPerSecond*1000);
};

// check for a winner to a game
var checkForWinner = function(gameBoard) {
	
	// horizontal
	if (gameBoard[0][0] === gameBoard[0][1] && 
			gameBoard[0][0] === gameBoard[0][2] && 
			gameBoard[0][0] !== ' ') {
		return gameBoard[0][0];
	}

	if (gameBoard[1][0] === gameBoard[1][1] && 
			gameBoard[1][0] === gameBoard[1][2] && 
			gameBoard[1][0] !== ' ') {
		return gameBoard[1][0];
	}

	if (gameBoard[2][0] === gameBoard[2][1] && 
			gameBoard[2][0] === gameBoard[2][2] && 
			gameBoard[2][0] !== ' ') {
		return gameBoard[2][0];
	}

	// vertical
	if (gameBoard[0][0] === gameBoard[1][0] && 
			gameBoard[0][0] === gameBoard[2][0] && 
			gameBoard[0][0] !== ' ') {
		return gameBoard[0][0];
	}

	if (gameBoard[0][1] === gameBoard[1][1] && 
			gameBoard[0][1] === gameBoard[2][1] && 
			gameBoard[0][1] !== ' ') {
		return gameBoard[0][1];
	}

	if (gameBoard[0][2] === gameBoard[1][2] && 
			gameBoard[0][2] === gameBoard[2][2] && 
			gameBoard[0][2] !== ' ') {
		return gameBoard[0][2];
	}

	// diagonal
	if (gameBoard[0][0] === gameBoard[1][1] && 
			gameBoard[0][0] === gameBoard[2][2] && 
			gameBoard[0][0] !== ' ') {
		return gameBoard[0][0];
	}

	if (gameBoard[0][2] === gameBoard[1][1] && 
			gameBoard[0][2] === gameBoard[2][0] && 
			gameBoard[0][2] !== ' ') {
		return gameBoard[0][2];
	}

	// winning conditions not met
	return false;
};

var calculateMoveProbabilities = function(possibleMoves) {
	try {

		// hard set weights less than 0 to 0
		possibleMoves.forEach(function(possibleMove){
			if (possibleMove.weight < 0) {
				possibleMove.weight = 0;
			}
		});

		// find the sum of all the weight
		var totalWeight = 0;
		possibleMoves.forEach(function(possibleMove){
			totalWeight = totalWeight + possibleMove.weight;
		});

		// if valid totalWeight then recalculate probabilities
		if (totalWeight > 0) {
			possibleMoves.forEach(function(possibleMove){
				possibleMove.probability = possibleMove.weight / totalWeight;
			});
		}
		else { // hard revert back to default probabilities
			possibleMoves.forEach(function(possibleMove){
				possibleMove.probability = 1 / possibleMoves.length;
			});
		}
	}
	catch(e) {
		// hard revert back to default probabilities
		possibleMoves.forEach(function(possibleMove){
			possibleMove.probability = 1 / possibleMoves.length;
		});
	}

	// !!! log for debugging
	// also kind of cool to see
	// console.log(possibleMoves);
};

var takeTurn = function(game, scripts) {
	// !!!? potentially want to do a deep clone here
	var possibleMoves = game.possibleMoves;
	var board = game.board;

	// run the possible moves through the logic pipeline
	scripts.forEach(function(script){

		// for each of the possibleMoves call the user's script on each possibleMove

		possibleMoves.forEach(function(possibleMove){

			// Example:: possibleMove = {
			// 	row: int row in board,
			// 	column: int column in board,
			// 	weight: relative chance of happening
			// };
			// Example:: game.board = 
			// 	[['x', ' ', ' '],
			// 	 [' ', 'o', ' '],
			// 	 [' ', 'x', ' ']];

			// !!! need to add a time limit to this

			try {
				localeval('('+script.logic+')(possibleMove, board)', {possibleMove: possibleMove, board: board});
			}
			catch(e) {
				console.log('ERROR: '+e)
			}

		});

	});

	// now that we have run the user's scripts to determine each moves weight
	// calculate the relative probabilities for each move
	calculateMoveProbabilities(possibleMoves);

	// now possibleMoves has the correct probability associated with each move
	var random = Math.random();
	var count = 0;
	var index = -1;
	while(random > count) {
		index = index + 1;
		count = count + possibleMoves[index].probability;
	}
	var move = possibleMoves[index];

	// now move is the selected move to do
	// and index is the index of that move

	// we need to check for winning conditions
	var winner = checkForWinner(game.board);
	if (winner) {
		game.result = winner;
	}

	// !!! it seems like it declares the game over before the last turn is taken

	// we need to update the game
	game.possibleMoves.splice(index, 1);
	game.board[move.row][move.column] = game.currentPlayer;
	game.turnCount = game.turnCount + 1;
	game.currentPlayer = getOtherPlayer(game.currentPlayer);
	if (!game.result && game.possibleMoves.length === 0) {
		game.result = 't';
	}

	// and then update the database
	Games.update({_id: game._id}, game);

	// if game is over then start a new game
	// !!! this seems to have some errors at fast speeds
	if (game.result) {

		// if we've reached the maximum number of games then stop
		// and don't need to keep trying to run turns on the server
		if (Games.find({result: 't', startTime: {$gt: gameStartTime}}).count() >= gamesNeededToWin) {
			Meteor.clearInterval(turnTakingInterval);
			gameInProgress = false;
			return;
		}
		else if (Games.find({result: 'x', startTime: {$gt: gameStartTime}}).count() >= gamesNeededToWin) {
			Meteor.clearInterval(turnTakingInterval);
			gameInProgress = false;
			return;
		}
		else if (Games.find({result: 'o', startTime: {$gt: gameStartTime}}).count() >= gamesNeededToWin) {
			Meteor.clearInterval(turnTakingInterval);
			gameInProgress = false;
			return;
		}
		else {
			// else start a new game

			Meteor.setTimeout(function(){
				Games.insert(createGame(getOtherPlayer(game.starter)));
			}, 1*1000);
		}
	}

};

var getOtherPlayer = function(player) {
	if (player === 'x') {
		return 'o';
	}
	if (player === 'o') {
		return 'x';
	}
	console.log('ERROR: getOtherPlayer given improper input');
	return 'x';
}
















// !!! we should also have a way to organize your own arbitrary test

// !!! add a time limit test to make sure the code runs in a reasonable length of time

// tests to run against scripts before adding them to the database
var tests = [
	{
		possibleMove: {
			row: 0,
			column: 0,
			weight: 0
		},
		board: [
			[' ', ' ', ' '],
			[' ', ' ', ' '],
			[' ', ' ', ' ']
		]
	},
	{
		possibleMove: {
			row: 2,
			column: 0,
			weight: 0
		},
		board: [
			['x', 'x', 'o'],
			['x', ' ', 'o'],
			['o', 'o', 'x']
		]
	}
];



// these are some methods that the client can call
// but get run on the server
// so the client can't mess with them
// 0 => ERROR
// 1 => SUCCESS
Meteor.methods({
	startGame: function() {

		if (gameInProgress) {
			return {
				error: true,
				message: 'there is already a game in progress'
			};
		}

		// include an offset to give us a little fudge room
		var time = (new Date()).getTime() - 1000;

		// start a new game
		Games.insert(createGame('x'));
		startTakingTurns();
		gameInProgress = true;
		gameStartTime = time;
		return {
			message: 'success',
			gameStartTime: time
		};
	},
	getGameStartTime: function() {
		return gameStartTime;
	},
	getGameInProgress: function() {
		return gameInProgress;
	},
	reset: function() {
		// !!! TODO(joe) implement this
		// reset button for if things go south
	},
  insertScript: function(player, logic) {

  	// tests scripts
  	for (var i=0; i<tests.length; ++i) {
  		var possibleMove = tests[i].possibleMove;
  		var board = tests[i].board;

  		try {
				localeval('('+logic+')(possibleMove, board)', {possibleMove: possibleMove, board: board});

				if (typeof possibleMove.weight !== 'number') {
					return {
						error: true,
						message: 'weight must be a number'
					};
				}
			}
			catch(e) {
				// script doesn't work
				// don't add it to the database
				// but let user know the error in their ways
				return {
					error: true,
					message: e.toString()
				};
			}
  	};

    Scripts.insert({
      player: player,
      logic: logic,
      active: true,
      timestamp: (new Date()).getTime()
    });

    return {
    	error: false,
    	message: 'SUCCESS'
    };
  },
  activateScript: function(id) {
  	var script = Scripts.findOne({
  		_id: id
  	});

  	if (script) {
  		script.active = !script.active;
  		Scripts.update({_id: script._id}, script);
  	}

  	return true;
  }
});