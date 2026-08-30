const path = require('path')

module.exports = (env, argv) => {
  const isProduction = (argv?.mode ?? process.env.NODE_ENV) === 'production'

  return {
    target: 'node',
    entry: './src/index.ts',
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? false : 'source-map',
    context: __dirname,
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'index.js',
      libraryTarget: 'umd',
    },
    resolve: {
      modules: ['.', 'src', 'node_modules'].map(x => path.join(__dirname, x)),
      extensions: ['.ts', '.js'],
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          loader: 'ts-loader',
          options: {
            configFile: path.resolve(__dirname, 'tsconfig.json'),
          },
        },
      ],
    },
    externals: [
      'fs',
      'path',
      /^rxjs/,
      /^@angular/,
      /^tabby-/,
    ],
  }
}
