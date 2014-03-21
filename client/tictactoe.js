
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
    var logic = $('.new-script').val();

    Scripts.insert({
      player: Session.get('player'),
      logic: logic
    });

    $('.new-script').val('write code here');
  }
});

// # scripts
// _________

Template.scripts.scripts = function() {
  return Scripts.find({player: Session.get('player')});
};


