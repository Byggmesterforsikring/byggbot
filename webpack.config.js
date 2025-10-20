const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const dotenv = require('dotenv');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

// Last inn riktig .env fil basert på miljø
const env = process.env.NODE_ENV || 'development';
const envPath = env === 'production' ? '.env.production' : '.env';
console.log('Webpack: Laster miljøvariabler fra:', envPath);

const envConfig = dotenv.config({ path: envPath });

if (envConfig.error) {
  console.warn('Webpack: Feil ved lasting av miljøvariabler:', envConfig.error.message);
  console.warn('Webpack: Fortsetter uten .env fil. Miljøvariabler må være satt i system/CI.');
} else {
  console.log('Webpack: Miljøvariabler lastet. Tilgjengelige variabler:', Object.keys(envConfig.parsed));
}

// Definer miljøvariabler for webpack
const getEnvVars = () => {
  // La webpack håndtere NODE_ENV
  return {
    'process.env.REACT_APP_AZURE_CLIENT_ID': JSON.stringify(process.env.REACT_APP_AZURE_CLIENT_ID),
    'process.env.REACT_APP_AZURE_TENANT_ID': JSON.stringify(process.env.REACT_APP_AZURE_TENANT_ID)
  };
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
        use: [
          env === 'production' ? MiniCssExtractPlugin.loader : 'style-loader',
          'css-loader',
          'postcss-loader'
        ]
      },
      {
        test: /\.(png|jpg|gif|svg)$/,
        type: 'asset/resource'
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx'],
    alias: {
      '~': path.resolve(__dirname, 'src/')
    },
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
      "url": require.resolve("url/"),
      "zlib": require.resolve("browserify-zlib"),
      "process": require.resolve("process/browser"),
      "node:buffer": require.resolve("buffer/"),
      "node:stream": require.resolve("stream-browserify")
    }
  },
  externals: {
    '@azure/msal-node': 'commonjs @azure/msal-node',
    '@prisma/client': 'commonjs @prisma/client'
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
    }),
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css',
      chunkFilename: '[id].[contenthash].css'
    }),
    // Legg til dette for å håndtere node:-URIer
    new webpack.NormalModuleReplacementPlugin(/node:/, (resource) => {
      const mod = resource.request.replace(/^node:/, '');
      if (mod === 'buffer') {
        resource.request = 'buffer';
      } else if (mod === 'stream') {
        resource.request = 'stream-browserify';
      }
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