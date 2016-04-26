'use strict';

const
  fork = require('./fork'),
  path = require('path'),
  Promise = require('bluebird'),
  vscode = require('vscode');

function runTests(testFiles, grep) {
  const rootPath = vscode.workspace.rootPath;

  return fork(
    path.resolve(module.filename, '../worker/runtest.js'),
    [
      JSON.stringify({
        files: testFiles,
        options: vscode.workspace.getConfiguration('mocha').options,
        grep,
        rootPath
      })
    ],
    {
      env: {
        NODE_PATH: rootPath
      }
    }
  ).then(process => new Promise((resolve, reject) => {
    const outputChannel = vscode.window.createOutputChannel('Mocha');

    outputChannel.show();
    outputChannel.clear();

    outputChannel.appendLine(`Running Mocha with Node.js at ${process.spawnfile}\n`);

    const stderrBuffers = [];

    process.stderr.on('data', data => {
      stderrBuffers.push(data);
    });

    process.stdout.on('data', data => {
      outputChannel.append(data.toString().replace(/\r/g, ''));
    });

    process
      .on('error', err => {
        vscode.window.showErrorMessage(`Failed to run Mocha due to ${err.message}`);
        outputChannel.append(err.stack);
        reject(err);
      })
      .on('exit', code => {
        const stderrText = Buffer.concat(stderrBuffers).toString();
        let resultJSON;

        try {
          resultJSON = stderrText && JSON.parse(stderrText);
        } catch (ex) {
          code = 1;
        }

        if (code) {
          outputChannel.append(stderrText);
          console.error(stderrText);

          reject(new Error('unknown error'));
        } else {
          resolve(resultJSON);
        }
      });
  }));
}

function findTests(rootPath) {
  return fork(
    path.resolve(module.filename, '../worker/findtests.js'),
    [
      JSON.stringify({
        options: vscode.workspace.getConfiguration('mocha').options,
        rootPath
      })
    ],
    {
      env: {
        NODE_PATH: `${rootPath}${path.sep}node_modules`
      }
    }
  ).then(process => new Promise((resolve, reject) => {
    const
      stdoutBuffers = [],
      resultJSONBuffers = [];

    process.stderr.on('data', data => {
      resultJSONBuffers.push(data);
    });

    process.stdout.on('data', data => {
      stdoutBuffers.push(data);
    });

    process
      .on('error', err => {
        vscode.window.showErrorMessage(`Failed to run Mocha due to ${err.message}`);
        reject(err);
      })
      .on('exit', code => {
        console.log(Buffer.concat(stdoutBuffers).toString());

        const stderrText = Buffer.concat(resultJSONBuffers).toString();
        let resultJSON;

        try {
          resultJSON = stderrText && JSON.parse(stderrText);
        } catch (ex) {
          code = 1;
        }

        if (code) {
          const outputChannel = vscode.window.createOutputChannel('Mocha');

          outputChannel.show();
          outputChannel.append(stderrText);
          console.error(stderrText);

          reject(new Error('unknown error'));
        } else {
          resolve(resultJSON);
        }
      });
  }));
}

module.exports.runTests = runTests;
module.exports.findTests = findTests;
