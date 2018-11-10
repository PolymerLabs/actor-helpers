/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import typescript from "rollup-plugin-typescript2";
import nodeResolve from "rollup-plugin-node-resolve";
import { terser } from "rollup-plugin-terser";
import loadz0r from "rollup-plugin-loadz0r";

// Delete 'dist'
require("rimraf").sync("dist");

export default {
  input: ["src/app.ts", "src/worker.ts"],
  output: {
    dir: "dist",
    format: "amd",
    sourcemap: true
  },
  plugins: [
    typescript({
      // Make sure we are using our version of TypeScript.
      typescript: require("typescript"),
      tsconfigOverride: {
        compilerOptions: {
          sourceMap: true
        }
      }
    }),
    nodeResolve(),
    loadz0r(),
    terser()
  ],
  experimentalCodeSplitting: true
};
