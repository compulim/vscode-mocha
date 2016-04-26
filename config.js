'use strict';

const vscode = require('vscode');

function getConfiguration() {
  return vscode.workspace.getConfiguration('mocha');
}

exports.env = function env() {
  return getConfiguration().env;
};

exports.options = function options() {
  return getConfiguration().options;
};

exports.files = function files() {
  return getConfiguration().files;
};