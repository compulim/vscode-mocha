'use strict';

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const
  ChildProcess = require('child_process'),
  fs = require('fs'),
  Glob = require('glob').Glob,
  Mocha = require('mocha'),
  path = require('path'),
  Promise = require('bluebird'),
  vscode = require('vscode');

const
  access = Promise.promisify(fs.access);

let lastRunResult;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
  context.subscriptions.push(vscode.commands.registerCommand('mocha.runAllTests', function () {
    runAllTests();
  }));

  context.subscriptions.push(vscode.commands.registerCommand('mocha.selectAndRunTest', function () {
    selectAndRunTest();
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
  });
}

function findTests(rootPath) {
  return fork(
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
        resolve(JSON.parse(Buffer.concat(stdout).toString()));
      }
    });
  }));
}

function findNodeJSPath() {
  return new Promise((resolve, reject) => {
    const paths = process.env.path.split(process.platform === 'win32' ? ';' : ':');

    Promise.some([].concat(
      paths.map(p => path.resolve(p, 'node')).map(p => access(p, fs.X_OK).then(() => p)),
      paths.map(p => path.resolve(p, 'node.exe')).map(p => access(p, fs.X_OK).then(() => p))
    ), 1)
      .spread(nodeJSPath => resolve(nodeJSPath))
      .catch(err => reject(err));
  });
}

function runMocha(rootPath, testFiles, name) {
  return fork(
    path.resolve(module.filename, '../worker/runtest.js'),
    [
      JSON.stringify({
        files: testFiles,
        options: vscode.workspace.getConfiguration('mocha').options,
        grep: name
      })
    ]
  ).then(process => new Promise((resolve, reject) => {
    const outputChannel = vscode.window.createOutputChannel('Mocha');

    outputChannel.clear();
    outputChannel.show();

    outputChannel.appendLine(`Running Mocha with Node.js at ${process.spawnfile}\n`);

    const resultJSONText = [];

    process.stderr.on('data', data => {
      resultJSONText.push(data);
    });

    process.stdout.on('data', data => {
      outputChannel.append(data.toString().replace(/\r/g, ''));
    });

    process.on('error', err => {
      vscode.window.showErrorMessage(`Failed to run test due to ${err.message}`);
      outputChannel.append(err.stack);
      reject(err);
    });

    process.on('exit', () => {
      resolve(JSON.parse(Buffer.concat(resultJSONText).toString()));
    });
  }));
}

function runAllTests() {
  const rootPath = vscode.workspace.rootPath;

  return new Promise((resolve, reject) => {
    new Glob('test/**/*.js', { cwd: rootPath }, (err, files) => {
      if (err) { return reject(err); }

      runMocha(
        rootPath,
        files.map(file => path.resolve(rootPath, file))
      ).then(
        result => {
          lastRunResult = result;
          resolve();
        },
        err => reject(err)
      );
    });
  });
}

function selectAndRunTest() {
  const rootPath = vscode.workspace.rootPath;

  vscode.window.showQuickPick(
    findTests(rootPath)
      .then(tests => tests.map(test => ({
        detail: path.relative(rootPath, test.filename),
        label: test.name,
        test
      })))
      .catch(err => {
        vscode.window.showErrorMessage(`Failed to find tests due to ${err.message}`);
        console.error(err);
        throw err;
      }),
    {
      // matchOnDescription: true,
      // matchOnDetail: true
    }
  )
  .then(entry => {
    if (entry) {
      const test = entry.test;

      runMocha(rootPath, [ test.filename ], test.name)
        .then(
          result => {
            lastRunResult = result;
          },
          err => {
            vscode.window.showErrorMessage(`Failed to run tests due to ${err.message}`);
          }
        )
    }
  });
}
