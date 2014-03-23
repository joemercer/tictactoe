var localeval = Meteor.require('localeval');

// create a new game
createGame = function(starter) {
	var game = {};
	// game board is represented as a 3x3 2D array
	// spaces indicate that no move has happened yet
	game.board = [[' ', ' ', ' '],[' ', ' ', ' '],[' ', ' ', ' ']];
	game.starter = starter;
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

	// !! log for debugging
	// also kind of cool to see
	// console.log(possibleMoves);
};

var takeTurn = function(game, scripts) {
	// !!? potentially want to do a deep clone here
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

	// we need to update the game
	game.possibleMoves.splice(index, 1);
	game.board[move.row][move.column] = game.currentPlayer;
	game.turnCount = game.turnCount + 1;
	var nextPlayer;
	if (game.currentPlayer === 'x') {
		nextPlayer = 'o';
	}
	else {
		nextPlayer = 'x';
	}
	game.currentPlayer = nextPlayer;
	if (!game.result && game.possibleMoves.length === 0) {
		game.result = 't';
	}

	// and then update the database
	Games.update({_id: game._id}, game);

	// if game is over then start a new game
	// !!! this seems to have some errors at fast speeds
	if (game.result) {
		Games.insert(createGame(game.starter));
	}

};



// !! changed time to stop it from freaking out
Meteor.startup(function() {

	// create the first game
	// only want one game going on at a time
	if (!(Games.find({}).count() > 0)) {
		Games.insert(createGame('x'));
	}

	// every second take a turn in every game
	Meteor.setInterval(function() {

		Games.find({result: false}).forEach(function(game){

			var scripts = Scripts.find({
				player: game.currentPlayer,
				active: true
			}).fetch();

			if (!scripts) {
				scripts = [];
			}

			takeTurn(game, scripts);

		});

	}, 1*1000);
});












// !!! we should also have a way to organize your own arbitrary test

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
      active: true
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