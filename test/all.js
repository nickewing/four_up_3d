var testrunner = require('nodeunit').reporters.default;

process.chdir(__dirname);
testrunner.run(['.']);
