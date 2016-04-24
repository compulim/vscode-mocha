'use strict';

const
  escapeRegExp = require('escape-regexp'),
  fs = require('fs'),
  Mocha = require('mocha'),
  path = require('path'),
  Promise = require('bluebird');

const
  optionsFilename = path.resolve(process.argv[2], 'test/mocha.json'),
  readFile = Promise.promisify(fs.readFile);

let options;

try {
  options = require(optionsFilename);
} catch (ex) {
  if (ex.code !== 'MODULE_NOT_FOUND') {
    console.error(ex);
    process.exit(-1);
  }
}

if (options) {
  console.log(`Applying Mocha options from ${optionsFilename}\n${indent(JSON.stringify(options, null, 2))}:`);
} else {
  console.log(`No Mocha options are configured. You can set it at ${optionsFilename}`);
}

const mocha = new Mocha(options);

console.log();
console.log('Test file(s):');

JSON.parse(process.argv[3]).forEach(file => {
  console.log(`  ${file}`);
  mocha.addFile(file);
});

const grep = process.argv[4];

grep && mocha.grep(new RegExp(`^${escapeRegExp(grep)}$`));

mocha.run(code => {
  process.exit(code);
});

function indent(lines) {
  return lines.split('\n').map(line => `  ${line}`).join('\n');
}