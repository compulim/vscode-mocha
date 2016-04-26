'use strict';

const
  CustomReporter = require('./customreporter'),
  escapeRegExp = require('escape-regexp'),
  fs = require('fs'),
  Mocha = require('mocha'),
  path = require('path'),
  Promise = require('bluebird');

const
  args = JSON.parse(process.argv[2]),
  options = args.options;

if (Object.keys(options || {}).length) {
  console.log(`Applying Mocha options:\n${indent(JSON.stringify(options, null, 2))}`);
} else {
  console.log(`No Mocha options are configured. You can set it under File > Preferences > Workspace Settings.`);
}

const mocha = new Mocha(options);

console.log();
console.log('Test file(s):');

args.files.forEach(file => {
  console.log(`  ${file}`);
  mocha.addFile(file);
});

const greps = args.greps;

if (greps) {
  const pattern = `^${greps.map(grep => `(${grep})`).join('|')}$`;

  console.log();
  console.log('Grep pattern:');
  console.log('  ' + pattern);

  greps && mocha.grep(new RegExp(pattern));
}

mocha.reporter(CustomReporter);

mocha.run(code => {
  process.exit(code);
});

function indent(lines) {
  return lines.split('\n').map(line => `  ${line}`).join('\n');
}

function initReporters() {
}