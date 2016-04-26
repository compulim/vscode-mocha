'use strict';

const vscode = require('vscode');

exports.options = function options() {
  return vscode.workspace.getConfiguration('mocha').options;
};

exports.files = function files() {
  return vscode.workspace.getConfiguration('mocha').files;
};