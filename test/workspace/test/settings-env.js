'use strict';

const
  assert = require('assert');

describe('When environment variable is set in settings', function () {
  it('should run with them', function () {
    assert(process.env.HELLO_WORLD, 'Hello, World!');
  })
});
