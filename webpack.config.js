const path = require('path');
const nodeExternals = require('webpack-node-externals');

const outputPath = path.resolve('./dist');

module.exports = {
  mode: 'production',
  target: 'node',
  optimization: {
    minimize: false,
  },
  node: {
    __dirname: false
  },
  devtool: 'source-map',
  entry: './src/index.ts',
  output: {
    path: outputPath,
    filename: 'index.js',
  },
  resolve: {
    modules: ['node_modules'],
    extensions: ['.js', '.ts'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        options: {
          presets: ['babel-preset-env']
        },
      }
    ]
  },
  externals: [nodeExternals()],
};
