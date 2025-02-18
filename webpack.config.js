const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const dotenv = require('dotenv');

// Last inn riktig .env fil basert på miljø
const env = process.env.NODE_ENV || 'development';
const envPath = env === 'production' ? '.env.production' : '.env';
const envConfig = dotenv.config({ path: envPath });

if (envConfig.error) {
  throw envConfig.error;
}

// Definer miljøvariabler for webpack
const getEnvVars = () => {
  const envVars = {
    'process.env.REACT_APP_AZURE_CLIENT_ID': JSON.stringify(process.env.REACT_APP_AZURE_CLIENT_ID),
    'process.env.REACT_APP_AZURE_TENANT_ID': JSON.stringify(process.env.REACT_APP_AZURE_TENANT_ID),
    'process.env.REACT_APP_REDIRECT_URI': JSON.stringify(process.env.REACT_APP_REDIRECT_URI)
  };

  // Bare sett NODE_ENV hvis den ikke allerede er satt
  if (!process.env.NODE_ENV) {
    envVars['process.env.NODE_ENV'] = JSON.stringify(env);
  }

  return envVars;
};

module.exports = {
  mode: env,
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: '[name].[contenthash].js',
    chunkFilename: '[name].[contenthash].chunk.js',
    publicPath: './',
    assetModuleFilename: 'assets/[hash][ext][query]'
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      minSize: 20000,
      minChunks: 1,
      maxAsyncRequests: 30,
      maxInitialRequests: 30,
      cacheGroups: {
        defaultVendors: {
          test: /[\\/]node_modules[\\/]/,
          priority: -10,
          reuseExistingChunk: true,
        },
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true,
        },
      },
    },
    runtimeChunk: 'single',
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
      "crypto": false,
      "stream": require.resolve("stream-browserify"),
      "util": require.resolve("util/"),
      "path": false,
      "os": false,
      "fs": false,
      "net": false,
      "tls": false,
      "dns": false,
      "pg-native": false,
      "http": require.resolve("stream-http"),
      "https": require.resolve("https-browserify"),
      "buffer": require.resolve("buffer/"),
      "url": require.resolve("url/")
    }
  },
  plugins: [
    new webpack.DefinePlugin(getEnvVars()),
    new HtmlWebpackPlugin({
      template: './public/index.html',
      filename: 'index.html',
      inject: true,
      minify: env === 'production' ? {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true
      } : false,
      scriptLoading: 'defer'
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer']
    })
  ],
  devServer: {
    port: 3002,
    historyApiFallback: true,
    hot: true,
    static: {
      directory: path.join(__dirname, 'public')
    },
    devMiddleware: {
      publicPath: '/'
    }
  }
}; 