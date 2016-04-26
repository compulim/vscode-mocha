'use strict';

const
  ChildProcess = require('child_process'),
  fs = require('fs'),
  path = require('path'),
  Promise = require('bluebird'),
  trimArray = require('./utils').trimArray,
  vscode = require('vscode');

const
  access = Promise.promisify(fs.access);

function fork(jsPath, args, options) {
  return nodeJSPath().then(
    execPath => new Promise((resolve, reject) => {
      resolve(ChildProcess.spawn(
        execPath,
        [ jsPath ].concat(args),
        options
      ))
    }),
    err => {
      if (err.code === 'ENOENT') {
        vscode.window.showErrorMessage('Cannot find Node.js installation from environment variable');
      } else {
        vscode.window.showErrorMessage(`Failed to find Node.js installation due to ${err.message}`);
      }

      throw err;
    }
  );
}

function nodeJSPath() {
  return new Promise((resolve, reject) => {
    const paths = process.env.path.split(process.platform === 'win32' ? ';' : ':');

    const searchPaths = [].concat(
      paths.map(p => path.resolve(p, 'node')),
      paths.map(p => path.resolve(p, 'node.exe'))
    );

    Promise.all(searchPaths.map(p => access(p, fs.X_OK).then(() => p, err => false)))
      .then(
        results => {
          results = trimArray(results);

          if (results.length) {
            resolve(results[0]);
          } else {
            const err = new Error('cannot find nodejs');

            err.code = 'ENOENT';

            reject(err);
          }
        },
        err => reject(err)
      );
  });
}

module.exports = fork;
module.exports.nodeJSPath = nodeJSPath;
