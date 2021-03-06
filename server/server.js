var localeval = Meteor.require('localeval');

// settings
// !!! these may need to be edited to make the game better
var gamesNeededToWin = 100;
var turnsPerSecond = .1; // seconds
var startNewGameLag = 1; // second

// amount of time scripts have to run (in milliseconds)
var scriptTimeLimit = 100;



// if a series is in progress on startup but the turn taking has stopped for some reason
// then start it back up
Meteor.startup(function(){

	var series = Series.findOne({active: true}, {sort: {startTime: -1}});

	if (series) {

		Meteor.clearInterval(turnTakingInterval);

		var game = Games.findOne({result: false, startTime: {$gt: series.startTime}});

		if (game) {
			startTakingTurns();
		}
		else {
			Games.insert(createGame('x'));
			startTakingTurns();
		}

	}

});



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

		var seriesStartTime = 0;
		var series = Series.findOne({active: true}, {sort: {startTime: -1}});
		if (series) {
			seriesStartTime = series.startTime;
		}

		Games.find({result: false, startTime: {$gt: seriesStartTime}}).forEach(function(game){

			var scripts = Scripts.find({
				player: game.currentPlayer,
				active: true,
				timestamp: {$gt: seriesStartTime}
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

			// no to time limit here because it messes with the synchronicity
			// we need to rely on the tests to catch stuff
			try {
				localeval('('+script.logic+')(possibleMove, board)', {possibleMove: possibleMove, board: board});
			}
			catch(e) {
				console.log('ERROR: '+e);
			}

		});

	});

	// now that we have run the user's scripts to determine each moves weight
	// calculate the relative probabilities for each move
	calculateMoveProbabilities(possibleMoves);

	// now possibleMoves has the correct probability associated with each move
	// we're basically selecting a weighted random entry from the possibleMoves array
	// so we can't just choose a random index, we need to choose an index based on the probability function defined by the probabilities in possibleMoves
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

	// we need to update the game and the board
	game.possibleMoves.splice(index, 1);
	game.board[move.row][move.column] = game.currentPlayer;
	game.turnCount = game.turnCount + 1;
	game.currentPlayer = getOtherPlayer(game.currentPlayer);

	// then check for a winner
	var winner = checkForWinner(game.board);
	if (winner) {
		game.result = winner;
	}

	// then check if it's a tie
	if (!game.result && game.possibleMoves.length === 0) {
		game.result = 't';
	}

	// and finally update the database
	Games.update({_id: game._id}, game);

	// if game is over then start a new game
	// !!! this seems to have some errors at fast speeds
	if (game.result) {

		var seriesStartTime = 0;
		var series = Series.findOne({active: true}, {sort: {startTime: -1}});
		if (series) {
			seriesStartTime = series.startTime;
		}

		// if we've reached the maximum number of games then stop
		// and no need to keep trying to run turns on the server
		if (Games.find({result: 't', startTime: {$gt: seriesStartTime}}).count() >= gamesNeededToWin) {
			Meteor.clearInterval(turnTakingInterval);
			series.winner = 't';
			series.active = false;
			Series.update({_id: series._id}, series);
			return;
		}
		else if (Games.find({result: 'x', startTime: {$gt: seriesStartTime}}).count() >= gamesNeededToWin) {
			Meteor.clearInterval(turnTakingInterval);
			series.winner = 'x';
			series.active = false;
			Series.update({_id: series._id}, series);
			return;
		}
		else if (Games.find({result: 'o', startTime: {$gt: seriesStartTime}}).count() >= gamesNeededToWin) {
			Meteor.clearInterval(turnTakingInterval);
			series.winner = 'o';
			series.active = false;
			Series.update({_id: series._id}, series);
			return;
		}
		else {
			// else start a new game

			Meteor.setTimeout(function(){
				Games.insert(createGame(getOtherPlayer(game.starter)));
			}, startNewGameLag*1000);
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




// # Tests
// - run these against each new script as it comes in
// ________

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
	startSeries: function() {

		if (Series.find({active: true}).count() > 0) {
			return {
				error: true,
				message: 'there is already a game in progress'
			};
		}

		// include an offset to give us a little fudge room
		var time = (new Date()).getTime() - 1000;

		// start a series
		// include another offset for fudge room
		Series.insert({
			active: true,
			startTime: time - 1000,
			winner: false
		});

		// start a new game
		Games.insert(createGame('x'));
		startTakingTurns();
		return {
			message: 'success'
		};
	},
	reset: function() {
		// !!! TODO(joe) implement this
		// reset button for if things go south
	},
  insertScript: function(player, logic) {

  	// assume the script is fine and insert it
  	// if it doesn't pass the tests then we'll just revoke it
		var id = Scripts.insert({
      player: player,
      logic: logic,
      active: false,
      timestamp: (new Date()).getTime()
    });

  	// check the script by running it through some test cases
  	for (var i=0; i<tests.length; ++i) {
  		var possibleMove = tests[i].possibleMove;
  		var board = tests[i].board;

  		try {

				localeval('('+logic+')(possibleMove, board)', {possibleMove: possibleMove, board: board}, scriptTimeLimit, Meteor.bindEnvironment(function(error, result){

					// if localeval caught an error
					if (error) {
						console.log('localeval tests caught error');
						console.log('ERROR: '+error.message);

						Scripts.remove({
				      _id: id
				    });
					}

					// we require the weight to be numerical
					if (typeof possibleMove.weight !== 'number') {
						console.log('localeval tests caught error');
						console.log('ERROR: possible weight must be a number');

						Scripts.remove({
				      _id: id
				    });
					}
				}, function(e){
					console.log('Meteor.bindEnvironment has an error');
					console.log('ERROR: '+e);
					done = true;
				}));

			}
			catch(e) {
				// some other error happened
				// script doesn't work
				// remove it from the database
				Scripts.remove({
		      _id: id
		    });

				// let user know the error in their ways
				return {
					error: true,
					message: e.toString()
				};
			}

  	};

    return {
    	error: false,
    	message: 'SUCCESS - but we\'ll revoke it if your script doesn\'t pass the tests'
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