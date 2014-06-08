
// A Game is one tic tac toe game
Games = new Meteor.Collection('games');

// A Script is one script that each turn in a game is run through
Scripts = new Meteor.Collection('scripts');

// A Series is an instance of two people competing in a set of Games
Series = new Meteor.Collection('series');