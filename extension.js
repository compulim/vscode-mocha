'use strict';

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const
  ChildProcess = require('child_process'),
  config = require('./config'),
  escapeRegExp = require('escape-regexp'),
  fs = require('fs'),
  Glob = require('glob').Glob,
  Mocha = require('mocha'),
  path = require('path'),
  Promise = require('bluebird'),
  Runner = require('./runner'),
  vscode = require('vscode');

const
  access = Promise.promisify(fs.access),
  runner = new Runner();

let
  lastPattern,
  lastRunResult;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
  const subscriptions = context.subscriptions;

  subscriptions.push(vscode.commands.registerCommand('mocha.runAllTests', function () {
    runAllTests();
  }));

  subscriptions.push(vscode.commands.registerCommand('mocha.selectAndRunTest', function () {
    selectAndRunTest();
  }));

  subscriptions.push(vscode.commands.registerCommand('mocha.runFailedTests', function () {
    runFailedTests();
  }));

  subscriptions.push(vscode.commands.registerCommand('mocha.runTestsByPattern', function () {
    runTestsByPattern();
  }));

  subscriptions.push(vscode.commands.registerCommand('mocha.runLastSetAgain', function () {
    runLastSetAgain();
  }));
}

exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
}

exports.deactivate = deactivate;

function fork(jsPath, args, options) {
  return findNodeJSPath().then(execPath => new Promise((resolve, reject) => {
    resolve(ChildProcess.spawn(
      execPath,
      [ jsPath ].concat(args),
      options
    ))
  }), err => {
    vscode.window.showErrorMessage('Cannot find Node.js installation from environment variable');

    throw err;
  });
}

function runAllTests() {
  runner.loadTestFiles()
    .then(
      files => {
        if (!files.length) {
          return vscode.window.showWarningMessage('No tests were found.');
        }

        runner.runAll();
      }
    ).catch(
      err => vscode.window.showErrorMessage(`Failed to run tests due to ${err.message}`)
    );
}

function selectAndRunTest() {
  const rootPath = vscode.workspace.rootPath;

  vscode.window.showQuickPick(
    runner.loadTestFiles()
      .then(
        tests => {
          if (!tests.length) {
            vscode.window.showWarningMessage(`No tests were found.`);
            throw new Error('no tests found');
          }

          return tests.map(test => ({
            detail: path.relative(rootPath, test.file),
            label: test.fullName,
            test
          }));
        },
        err => {
          vscode.window.showErrorMessage(`Failed to find tests due to ${err.message}`);
          throw err;
        }
      )
  )
  .then(entry => {
    if (!entry) { return; }

    runner
      .runTest(entry.test)
      .catch(err => {
        vscode.window.showErrorMessage(`Failed to run selected tests due to ${err.message}`);
      });
  });
}

function runFailedTests() {
  runner.runFailed()
    .catch(() => vscode.window.showErrorMessage(`Failed to rerun failed tests due to ${err.message}`));
}

function runTestsByPattern() {
  return Promise.props({
    pattern: vscode.window.showInputBox({
      placeHolder: 'Regular expression',
      prompt: 'Pattern of tests to run',
      value: lastPattern || ''
    }),
    loadTests: runner.loadTestFiles()
  }).then(props => {
    const pattern = props.pattern;

    if (!pattern) { return; }

    lastPattern = pattern;

    return runner.runWithGrep(pattern);
  }, err => vscode.window.showErrorMessage(`Failed to run tests by pattern due to ${err.message}`));
}

function runLastSetAgain() {
  runner.runLastSet()
    .catch(() => vscode.window.showErrorMessage(`Failed to rerun last set due to ${err.message}`));
}
