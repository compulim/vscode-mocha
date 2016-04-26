'use strict';

const
  Glob = require('Glob').Glob,
  Mocha = require('mocha'),
  path = require('path'),
  Promise = require('bluebird'),
  trimArray = require('../utils').trimArray;

createMocha(process.argv[2])
  .then(mocha => crawlTests(mocha.suite))
  .then(tests => console.log(JSON.stringify(tests, null, 2)))
  .catch(err => {
    console.error(JSON.stringify({
      message: err.message,
      stack: err.stack
    }, null, 2));

    process.exit(-1);
  });

function createMocha(workspaceRootPath) {
  return new Promise((resolve, reject) => {
    const glob = new Glob('test/**/*.js', { cwd: workspaceRootPath }, (err, files) => {
      if (err) { return reject(err); }

      try {
        // Add mocha.json for options

        const mocha = new Mocha({
          require: 'should',
          ui: 'bdd'
        });

        files.forEach(file => mocha.addFile(path.resolve(workspaceRootPath, file)));
        mocha.loadFiles();
        resolve(mocha);
      } catch (ex) {
        reject(ex);
      }
    });
  });
}

function findTests(workspaceRootPath) {
  return new Promise((resolve, reject) => {
    const glob = new Glob('test/**/*.js', { cwd: workspaceRootPath }, (err, files) => {
      if (err) { return reject(err); }

      try {
        const mocha = new Mocha({
          require: 'should',
          ui: 'bdd'
        });

        files = files.map(file => path.resolve(workspaceRootPath, file));

        // Add mocha.json for options

        files.forEach(file => mocha.addFile(file));

        mocha.loadFiles();
        resolve(crawlTests(mocha.suite));
      } catch (ex) {
        reject(ex);
      }
    });
  });
}

function crawlTests(suite) {
  let
    suites = [{ suite, path: [suite.fullTitle()] }],
    tests = [];

  while (suites.length) {
    const
      entry = suites.shift(),
      suite = entry.suite;

    tests = tests.concat(
      (suite.tests || []).map(test => {
        const name = test.title;

        return {
          name,
          fullName: trimArray(entry.path).concat([ name ]).join(' '),
          suitePath: entry.path,
          file: suite.file
        };
      })
    );

    suites = suites.concat(
      (suite.suites || []).map(suite => {
        return {
          suite,
          path: entry.path.concat(suite.fullTitle())
        };
      })
    );
  }

  return tests;
}
