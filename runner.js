'use strict';

const
  escapeRegExp = require('escape-regexp'),
  fork = require('./fork'),
  Glob = require('glob').Glob,
  MochaShim = require('./mochashim'),
  path = require('path'),
  vscode = require('vscode');

function Runner() {
  this.tests = [];
  this.lastRunResult = null;
}

// function crawlTestFiles() {
//   const rootPath = vscode.workspace.rootPath;

//   return new Promise((resolve, reject) => {
//     new Glob('test/**/*.js', { cwd: rootPath }, (err, files) => {
//       if (err) {
//         vscode.window.showErrorMessage(`Failed to find any tests files due to ${err.message}`);
//         reject(err);
//       } else {
//         resolve(files.map(file => path.resolve(rootPath, file)));
//       }
//     });
//   });
// }

Runner.prototype.loadTestFiles = function () {
  const rootPath = vscode.workspace.rootPath;

  return (
    fork(
      path.resolve(module.filename, '../worker/findtests.js'),
      [ rootPath ],
      { cwd: rootPath }
    ).then(process => new Promise((resolve, reject) => {
      const
        stdout = [],
        stderr = [];

      process.stdout.on('data', data => stdout.push(data));
      process.stderr.on('data', data => stderr.push(data));

      process.on('exit', code => {
        if (code) {
          const errJSON = JSON.parse(Buffer.concat(stderr).toString());

          const err = new Error(errJSON.message);

          err.stack = errJSON.stack;

          reject(err);
        } else {
          resolve((this.tests = JSON.parse(Buffer.concat(stdout).toString())));
        }
      });
    }))
  );
};

Runner.prototype._runMocha = function (testFiles, grep) {
  return MochaShim.run(testFiles, grep)
    .then(result => {
      this.lastRunResult = result;

      const numFailed = (result.failed || []).length;

      numFailed && vscode.window.showWarningMessage(`There are ${numFailed} failed test${numFailed > 1 ? 's': ''}.`);
    },
    err => {
      console.error(err);
      throw err;
    });
};

Runner.prototype.runAll = function () {
  return this._runMocha(this.tests.map(test => test.file));
};

Runner.prototype.runWithGrep = function (grep) {
  return this._runMocha(this.tests.map(test => test.file), grep);
};

Runner.prototype.runTest = function (test) {
  return this._runMocha([ test.file ], `^${escapeRegExp(test.fullName)}$`);
};

Runner.prototype.runFailed = function () {
  const failed = ((this.lastRunResult || {}).failed || []);

  if (!failed.length) {
    return vscode.window.showWarningMessage(`No tests failed in last run.`);
  } else {
    return this._runMocha(
      dedupeStrings(failed.map(test => test.file)),
      `^${failed.map(test => `(${escapeRegExp(test.fullName)})`).join('|')}$`
    )
  }
};

function dedupeStrings(array) {
  const keys = {};

  array.forEach(key => { keys[key] = 0; });

  return Object.keys(keys);
}

module.exports = Runner;
