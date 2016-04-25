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
    suitePath = [],
    failed = [];

  runner
    .on('suite', suite => {
      suitePath.push(suite.fullTitle());
    })
    .on('suite end', () => {
      suitePath.pop();
    })
    .on('fail', test => {
      failed.push({
        name: test.title,
        suitePath: suitePath.slice(),
        filename: test.file
      });
    })
    .on('end', () => {
      console.error(JSON.stringify({ failed }, null, 2));
    });
}

utils.inherits(Reporter, Base);

module.exports = Reporter;
