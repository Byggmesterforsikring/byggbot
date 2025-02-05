const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
require('dotenv').config();

module.exports = {
  mode: process.env.NODE_ENV || 'development',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'bundle.js',
    publicPath: '/'
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|jpg|gif|svg)$/,
        type: 'asset/resource'
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx'],
    fallback: {
      path: false,
      fs: false,
      process: require.resolve('process/browser')
    }
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify(process.env.NODE_ENV),
        REACT_APP_AZURE_CLIENT_ID: JSON.stringify(process.env.REACT_APP_AZURE_CLIENT_ID),
        REACT_APP_AZURE_TENANT_ID: JSON.stringify(process.env.REACT_APP_AZURE_TENANT_ID)
      }
    }),
    new HtmlWebpackPlugin({
      template: './public/index.html'
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser'
    })
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'public')
    },
    port: 3002,
    hot: true,
    historyApiFallback: true,
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
}; 