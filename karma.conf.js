/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

// Karma configuration

module.exports = function(config) {
  const options = {
    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: "",

    // list of files / patterns to load in the browser
    files: [
      {
        pattern: "lib/**/!(*_test).js",
        type: "module",
        included: false
      },
      {
        pattern: "lib/**/*_test.js",
        type: "module"
      },
      {
        pattern: "lib/**/*.js.map",
        included: false
      },
      {
        pattern: "src/**/*.ts",
        included: false
      }
    ],

    // list of files / patterns to exclude
    exclude: ["src/**/*_demo.ts"],

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ["progress"],

    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,

    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    frameworks: ["detectBrowsers", "mocha", "chai"],

    detectBrowsers: {
      postDetection(availableBrowsers) {
        const browsers = ["ChromeWithWorkerModules"];

        if (availableBrowsers.includes("Safari")) {
          browsers.push("Safari");
        }

        if (availableBrowsers.includes("Firefox")) {
          browsers.push("Firefox");
        }

        return browsers;
      }
    },

    customLaunchers: {
      ChromeWithWorkerModules: {
        base: "Chrome",
        flags: ["--enable-experimental-web-platform-features"]
      }
    },

    plugins: [
      "karma-chrome-launcher",
      "karma-firefox-launcher",
      "karma-safari-launcher",
      "karma-detect-browsers",
      "karma-mocha",
      "karma-chai"
    ],

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true,
    // These custom files allow us to use ES6 modules in our tests.
    // Remove these 2 lines (and files) once https://github.com/karma-runner/karma/pull/2834 lands.
    customContextFile: "test/context.html",
    customDebugFile: "test/debug.html"
  };

  config.set(options);
};
