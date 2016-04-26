'use strict';

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const
  ChildProcess = require('child_process'),
  escapeRegExp = require('escape-regexp'),
  fs = require('fs'),
  Glob = require('glob').Glob,
  Mocha = require('mocha'),
  path = require('path'),
  Promise = require('bluebird'),
  vscode = require('vscode');

const
  access = Promise.promisify(fs.access);

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

    outputChannel.clear();
    outputChannel.show();

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
        vscode.window.showErrorMessage(`Failed to run test due to ${err.message}`);
        outputChannel.append(err.stack);
        reject(err);
      })
      .on('exit', () => {
        const
          jsonText = Buffer.concat(resultJSONBuffers).toString();

        let resultJSON;

        try {
          resultJSON = jsonText && JSON.parse(jsonText);

          const numFailed = (resultJSON.failed || []).length;

          numFailed && vscode.window.showWarningMessage(`There are ${numFailed} test(s) failing.`);
        } catch (ex) {
          console.error(ex);
        }

        resolve(resultJSON);
      });
  }));
}

function runAllTests() {
  const rootPath = vscode.workspace.rootPath;

  return findAllTestFiles()
    .then(files => runMocha(files))
    .then(
      result => {
        lastRunResult = result;
        resolve(result);
      }
    );
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

      runMocha([ test.filename ], `^${escapeRegExp(test.name)}$`)
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

function runFailedTests() {
  const failedTests = (lastRunResult || {}).failed || [];

  if (!failedTests.length) {
    return vscode.window.showInformationMessage('There are no tests failed in last run.');
  }

  runMocha(
    failedTests.map(test => test.filename),
    `^${
      failedTests.map(test =>
        `(${
          escapeRegExp(
            trimArray(test.suitePath).concat(test.name).join(' ')
          )
        }$)`
      ).join('|')
    }$`
  ).then(result => {
    lastRunResult = result;
  });
}

function trimArray(array) {
  return (array || []).reduce((trimmed, item) => {
    item && trimmed.push(item);

    return trimmed;
  }, []);
}

function findAllTestFiles() {
  const rootPath = vscode.workspace.rootPath;

  return new Promise((resolve, reject) => {
    new Glob('test/**/*.js', { cwd: rootPath }, (err, files) => {
      err ? reject(err) : resolve(files.map(file => path.resolve(rootPath, file)));
    })
  });
}

function runTestsByPattern() {
  return Promise.props({
    pattern: vscode.window.showInputBox({
      placeHolder: 'Regular expression',
      prompt: 'Pattern of tests to run',
      value: lastPattern || ''
    }),
    filenames: findAllTestFiles()
  }).then(props => {
    const pattern = props.pattern;

    if (!pattern) { return; }

    lastPattern = pattern;

    runMocha(
      props.filenames,
      props.pattern
    ).then(result => {
      lastRunResult = result;

      return result;
    });
  });
}

function distinctStrings(array) {
  const keys = {};

  array.forEach(key => { keys[key] = 0; });

  return Object.keys(keys);
}
