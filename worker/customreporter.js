'use strict';

const Mocha = require('mocha');

const
  reporters = Mocha.reporters,
  utils = Mocha.utils,
  Base = reporters.Base,
  Spec = reporters.Spec;

function Reporter(runner) {
  this._spec = new Spec(runner);

  const
    suites = [],
    failed = [];

  runner
    .on('suite', suite => {
      suites.push(suite);
    })
    .on('suit end', () => {
      suites.pop();
    })
    .on('fail', test => {
      failed.push({
        test: test.title,
        suite: suite.fullTitle()
      });
    })
    .on('end', () => {
      console.error(JSON.stringify({ failed }, null, 2));
    });
}

utils.inherits(Reporter, Base);

module.exports = Reporter;
