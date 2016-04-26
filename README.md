# Mocha
Runs Mocha tests, all or selected. Then prints the result to an output window.

This extension is inspired by [Node.js Tools for Visual Studio](https://github.com/Microsoft/nodejstools).

![Demo showing Mocha test result](https://raw.githubusercontent.com/compulim/vscode-mocha/master/demo.png)

## Usage
To run Mocha tests:
* Bring up Command Palette (`F1`, or `Ctrl+Shift+P` on Windows and Linux, or `Shift+CMD+P` on OSX)
* Type or select "Mocha: Run all tests"

You can run tests by:
* All tests in the workspace
* All or failed tests in last run
* Tests that match a Regular Expression
* One test that you pick from a list

### How it works
By default, this extensions will discover tests by searching for `test/**/*.js` under your workspace.

Because your tests may requires a newer version of Node.js than the one powering Visual Studio Code, thus, this extension will attempt to find your installed Node.js and use it for your tests. It will search for the installed Node.js as indicated by environmental variable `PATH`. You can find the logic [here](https://github.com/compulim/vscode-mocha/blob/master/fork.js).

When the test is being run, we will add `NODE_PATH` to point to your workspace `node_modules` folder to help [resolving external modules](https://nodejs.org/api/modules.html#modules_loading_from_the_global_folders).

## Fit yourself

No one shoe could fit everyone. You may need to turn some switches on to fit your project. Please [file us](https://github.com/compulim/vscode-mocha/issues/new/) an issue if you think there is a better way to fit you and the others.

### Configuring Mocha options
Under File > Preferences > Workspace Settings, you can configure [Mocha options](https://github.com/mochajs/mocha/blob/master/lib/mocha.js), e.g. run in "tdd" mode, detect/ignore leaks, etc.

```
//-------- Mocha options --------

// Mocha: Options to run Mocha
"mocha.options": {},

// Mocha: Glob to search for test files
"mocha.files.glob": "test/**/*.js",

// Mocha: Globs to ignore when searching for test files
"mocha.files.ignore": [
  "**/.git/**/*",
  "**/node_modules/**/*"
],

// Mocha: Environment variables to run your tests
"mocha.env": {},
```

### Setting a keyboard shortcut

To quickly run tests, you can create a keyboard shortcut under File > Preferences > Keyboard Shortcuts. For example, the following JSON will run all tests with `CTRL+K` followed by `R` key.
```
{
  "key": "ctrl+k r",
  "command": "mocha.runAllTests"
}
```

Following commands are also supported:

| Command | Title |
|---------|-------------|
| `mocha.runAllTests` | Mocha: Run all tests |
| `mocha.runFailedTests` | Mocha: Run failed tests |
| `mocha.runLastSetAgain` | Mocha: Run last set again |
| `mocha.runTestsByPattern` | Mocha: Run tests matching a pattern |
| `mocha.selectAndRunTest` | Mocha: Select and run a test |

## Change log
* 0.1.1 (2016-04-27)
  * Feature: New settings - test files glob and ignore globs
  * Feature: New settings - environment variables for discovering and running tests
* 0.1.0 (2016-04-26)
  * Feature: Run tests by grep pattern
  * Feature: Rerun failed tests
  * Feature: Rerun last set of tests
  * Feature: Dump severe error to output channel
  * Fix: When selecting tests, it did not use Mocha options in workspace settings
* 0.0.1 (2016-04-25)
  * First public release

## Contributions
Love this extension? [Star](https://github.com/compulim/vscode-mocha/stargazers) us and rate us!

Want to make this extension even more awesome? [Send us your wish](https://github.com/compulim/vscode-mocha/issues/new/).

Hate how it is working? [File an issue](https://github.com/compulim/vscode-mocha/issues/new/) to us.
