
// # partials
// __________

// set up the partials logic
Session.set('partial', 'loggedOut');
// !!!
// un-comment this line for testing faster
// Session.set('partial', 'loggedIn');

Template.partials.helpers({
  partial: function(partialName) {
    return Session.get('partial') === partialName;
  }
});

// # loggedOut
// ___________

Session.set('player', null);
// !!!
// un-comment this line for testing faster
// Session.set('player', 'x');

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

Template.startButton.events({
  'click .start-game' : function(e) {

    var series = Series.findOne({active: true}, {sort: {startTime: -1}});
    if (series) {
      return; // series already in progress
    }

    Meteor.apply('startSeries', [], function(error, result){
      if (error) {
        console.log('Error starting game:', error);
      }
      if (result.error) {
        console.log('Error starting game:', result.message);
      }
    });

  }
});

Template.startButton.gameInProgress = function() {
  var series = Series.findOne({active: true}, {sort: {startTime: -1}});
  return !!series;
};

Template.startButton.player = function() {
  return Session.get('player');
};



// # stats
// _______

Template.stats.player = function() {
  return Session.get('player');
};
Template.stats.wins = function() {
  var seriesStartTime = 0;
  var series = Series.findOne({active: true}, {sort: {startTime: -1}});
  if (series) {
    seriesStartTime = series.startTime;
  }

  var wins = Games.find({result: Session.get('player'), startTime: {$gt: seriesStartTime}}).count();
  return wins;
};
Template.stats.losses = function() {
  var opponent;
  if (Session.get('player') === 'x') {
    opponent = 'o';
  }
  else {
    opponent = 'x';
  }
  
  var seriesStartTime = 0;
  var series = Series.findOne({active: true}, {sort: {startTime: -1}});
  if (series) {
    seriesStartTime = series.startTime;
  }

  var losses = Games.find({result: opponent, startTime: {$gt: seriesStartTime}}).count();
  return losses;
};
Template.stats.ties = function() {
  var seriesStartTime = 0;
  var series = Series.findOne({active: true}, {sort: {startTime: -1}});
  if (series) {
    seriesStartTime = series.startTime;
  }

  var ties = Games.find({result: 't', startTime: {$gt: seriesStartTime}}).count();
  return ties;
};
Template.stats.happening = function() {
  var seriesStartTime = 0;
  var series = Series.findOne({active: true}, {sort: {startTime: -1}});
  if (series) {
    seriesStartTime = series.startTime;
  }

  return Games.find({result: false, startTime: {$gt: seriesStartTime}}).count();
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
        editor.setValue('function selectMove(move, board){\n\t// write your code here\n\n\t// for example:\n\t// increment the weight of the middle right square by 1\n\tif (move.row === 1 && move.column === 2) {\n\t\tmove.weight = move.weight + 1;\n\t}\n}');
      }

    });
  }
});

Template.newScript.gameInProgress = function() {
  var series = Series.findOne({active: true}, {sort: {startTime: -1}});
  return !!series;
};

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

  // display all the scripts for the previous game (or current game if a game is happening)
  var seriesStartTime = 0;
  var series = Series.findOne({}, {sort: {startTime: -1}});
  if (series) {
    seriesStartTime = series.startTime;
  }

  return Scripts.find(
    {player: Session.get('player'), timestamp: {$gt: seriesStartTime}},
    {sort: {timestamp: -1}}
  );
};
Template.scripts.count = function() {
  var seriesStartTime = 0;
  var series = Series.findOne({}, {sort: {startTime: -1}});
  if (series) {
    seriesStartTime = series.startTime;
  }

  return Scripts.find(
    {player: Session.get('player'), timestamp: {$gt: seriesStartTime}}
  ).count();
};

// # board
// _______

Session.set('winner', null);

Template.board.winner = function() {
  return Session.get('winner');
}

Template.board.rows = function() {
  var seriesStartTime = 0;
  var series = Series.findOne({active: true}, {sort: {startTime: -1}});
  if (series) {
    seriesStartTime = series.startTime;
  }

  var game = Games.findOne(
    {startTime: {$gt: seriesStartTime}},
    {sort:{startTime:-1}}
  );

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
