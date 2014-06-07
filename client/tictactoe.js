
// # partials
// __________

// set up the partials logic
Session.set('partial', 'loggedOut');
// !!!
Session.set('partial', 'loggedIn');

Template.partials.helpers({
  partial: function(partialName) {
    return Session.get('partial') === partialName;
  }
});

// # loggedOut
// ___________

Session.set('player', null);
// !!!
Session.set('player', 'x');

Template.loggedOut.events({
  'click #login-x': function(e) {
    Session.set('player', 'x');
    Session.set('partial', 'loggedIn');
  },
  'click #login-o': function(e) {
    Session.set('player', 'o');
    Session.set('partial', 'loggedIn');
  }
});

// # loggedIn
// __________

// # startButton
// _______

Session.set('gameInProgress', false);

Template.startButton.events({
  'click .start-game' : function(e) {
    if (Session.get('gameInProgress')) {
      return;
    }

    Meteor.apply('startGame', [], function(error, result){
      if (error) {
        console.log('Error starting game:', error);
      }
      if (result.error) {
        console.log('Error starting game:', result.error);
      }
    });

    // update the ui
    Session.set('gameInProgress', !Session.get('gameInProgress'));
  }
});

Template.startButton.gameInProgress = function() {
  return Session.get('gameInProgress');
};



// # stats
// _______

Template.stats.player = function() {
  return Session.get('player');
};
Template.stats.wins = function() {
  return Games.find({result: Session.get('player')}).count();
};
Template.stats.losses = function() {
  var opponent;
  if (Session.get('player') === 'x') {
    opponent = 'o';
  }
  else {
    opponent = 'x';
  }
  return Games.find({result: opponent}).count();
};
Template.stats.ties = function() {
  return Games.find({result: 't'}).count();
};
Template.stats.happening = function() {
  return Games.find({result: false}).count();
};


// # newScript
// ___________

Template.newScript.events({
  'click .submit-new-script' : function(e) {
    var editor = ace.edit('aceEditor');
    var logic = editor.getValue();

    Meteor.apply('insertScript', [Session.get('player'), logic], function(error, result){

      // error in my code happened
      if (error) {
        console.log(error);
      }

      // error in user script happened
      if (result.error) {
        // !!! we should improve this by making it a notification
        // using bootstrap will be nice
        console.log('your script had an error:');
        console.log(result.message);
      }
      else {
        // success!

        // replace the text in the code editor
        editor.setValue('function selectMove(move, board){\n\t// write your code here\n\n\t// for example:\n\t// if the space above and the space below are the same...\n\tif (board[move.row-1][move.column] === board[move.row+1][move.column]) {\n\t\t// increase the probability of choosing that move\n\t\tmove.weight = move.weight + 5;\n\t}\n}');
      }

    });
  }
});

Template.aceEditor.rendered = function() {
  var editor = ace.edit('aceEditor');
  // editor.setTheme('ace/theme/github');
  editor.setTheme('ace/theme/tomorrow_night');
  editor.getSession().setMode('ace/mode/javascript');
  editor.setHighlightActiveLine(true);
  editor.setShowPrintMargin(false);
  editor.getSession().setTabSize(2);

  editor.setOptions({
    maxLines: 20
  });

};

// # scripts
// _________

Template.scripts.events({
  'click .activate-script' : function(e) {

    Meteor.apply('activateScript', [this._id], function(error, result){

      // error in my code happened
      if (error) {
        console.log(error);
      }

    });

  }
});

Template.scripts.scripts = function() {
  return Scripts.find(
    {player: Session.get('player')},
    {sort: {timestamp: -1}}
  );
};
Template.scripts.count = function() {
  return Scripts.find(
    {player: Session.get('player')}
  ).count();
};

// # board
// _______

Session.set('winner', null);

Template.board.winner = function() {
  return Session.get('winner');
}

Template.board.rows = function() {
  var game = Games.findOne({},{
    sort:{startTime:-1}
  });

  if (game) {
    if (game.result) {
      Session.set('winner', game.result);
    }
    else {
      Session.set('winner', null);
    }
    return game.board;
  }
};



// ties being decided a turn too earnly
// extra moves being played after a "win" is declared
