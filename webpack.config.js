const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
require('dotenv').config();

module.exports = {
  mode: 'development',
  entry: './src/index.js',
  stats: {
    modules: true,
    reasons: true,
    moduleTrace: true,
    errorDetails: true,
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'build'),
    publicPath: '/',
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            cacheDirectory: false,
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/i,
        type: 'asset/resource',
      },
    ],
  },
  optimization: {
    moduleIds: 'named',
    chunkIds: 'named',
    removeAvailableModules: false,
    removeEmptyChunks: false,
    splitChunks: false,
    providedExports: false,
    usedExports: false,
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': JSON.stringify(process.env)
    }),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'public', 'index.html'),
      filename: 'index.html',
      inject: true,
    }),
    {
      apply: (compiler) => {
        compiler.hooks.afterEmit.tap('LogPlugin', (compilation) => {
          console.log('Webpack output files:', Object.keys(compilation.assets));
        });
      },
    },
  ],
  devServer: {
    host: 'localhost',
    port: 3000,
    static: {
      directory: path.join(__dirname, 'public'),
    },
    hot: true,
    historyApiFallback: true,
    setupExitSignals: true,
    allowedHosts: 'all',
    devMiddleware: {
      writeToDisk: true,
      publicPath: '/',
    },
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    client: {
      logging: 'info',
      overlay: true,
    },
    open: false,
    compress: true,
  },
  devtool: 'source-map',
  infrastructureLogging: {
    level: 'info',
    debug: true
  }
}; 