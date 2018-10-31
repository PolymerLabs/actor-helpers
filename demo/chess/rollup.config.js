import typescript from "rollup-plugin-typescript2";
import nodeResolve from "rollup-plugin-node-resolve";
import { terser } from "rollup-plugin-terser";
import loadz0r from "rollup-plugin-loadz0r";
import legacy from "rollup-plugin-legacy";

// Delete 'dist'
require("rimraf").sync("dist");

export default {
  input: ["src/app.ts"], // "src/worker.ts"],
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
    legacy({
      "node_modules/garbo/js/garbochess.js": {
        ResetGame: "ResetGame",
        GetFen: "GetFen",
        GetMoveFromString: "GetMoveFromString",
        MakeMove: "MakeMove",
        FormatMove: "FormatMove",
        GenerateValidMoves: "GenerateValidMoves",
        InitializeFromFen: "InitializeFromFen",
        PVFromHash: "PVFromHash",
        g_inCheck: "g_inCheck",
        Search: "Search"
      }
    }),
    loadz0r(),
    terser()
  ],
  experimentalCodeSplitting: true
};
