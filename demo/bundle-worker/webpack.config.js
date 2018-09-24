const path = require("path");
const WorkerPlugin = require("worker-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: "./main-thread.js",
  output: {
    path: path.resolve(__dirname, "build"),
    filename: "main-thread.js"
  },
  optimization: {
    // We no not want to minimize our code.
    minimize: false
  },
  mode: "production",
  plugins: [new WorkerPlugin(), new CopyWebpackPlugin(["index.html"])]
};
