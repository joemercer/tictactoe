
// # partials
// __________

// set up the partials logic
// Session.set('partial', 'loggedOut');
// !!!
Session.set('partial', 'loggedIn');

Template.partials.helpers({
  partial: function(partialName) {
    return Session.get('partial') === partialName;
  }
});

// # loggedOut
// ___________

// Session.set('player', null);
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
  'click input.submit-new-script' : function(e) {
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
        editor.setValue('function(move, board){\n\t\n}');
      }

    });
  }
});

Template.aceEditor.rendered = function() {
  var editor = ace.edit('aceEditor');
  editor.setTheme('ace/theme/github');
  editor.getSession().setMode('ace/mode/javascript');
  editor.setHighlightActiveLine(true);
  editor.getSession().setTabSize(2);
};

// # scripts
// _________

Template.scripts.events({
  'click input.activate-script' : function(e) {

    Meteor.apply('activateScript', [this._id], function(error, result){

      // error in my code happened
      if (error) {
        console.log(error);
      }

    });

  }
});

Template.scripts.scripts = function() {
  return Scripts.find({player: Session.get('player')});
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

