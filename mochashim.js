'use strict';

const
  fork = require('./fork'),
  path = require('path'),
  Promise = require('bluebird'),
  vscode = require('vscode');

function runMocha(testFiles, grep) {
  return fork(
    path.resolve(module.filename, '../worker/runtest.js'),
    [
      JSON.stringify({
        files: testFiles,
        options: vscode.workspace.getConfiguration('mocha').options,
        grep
      })
    ]
  ).then(process => new Promise((resolve, reject) => {
    const outputChannel = vscode.window.createOutputChannel('Mocha');

    outputChannel.show();
    outputChannel.clear();

    outputChannel.appendLine(`Running Mocha with Node.js at ${process.spawnfile}\n`);

    const resultJSONBuffers = [];

    process.stderr.on('data', data => {
      resultJSONBuffers.push(data);
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
      .on('exit', () => {
        const
          jsonText = Buffer.concat(resultJSONBuffers).toString();

        let resultJSON;

        try {
          resultJSON = jsonText && JSON.parse(jsonText);
        } catch (ex) {
          console.error(jsonText);
        }

        resolve(resultJSON);
      });
  }));
}

module.exports.run = runMocha;
