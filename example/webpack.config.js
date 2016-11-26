var HtmlWebpackPlugin = require('html-webpack-plugin');
var InlineResource = require('../index');

module.exports = {
    entry: {
        hello: './src/hello.js'
    },
    output: {
        path: './build',
        filename: '[name].js'
    },
    // module: {
    //     loaders: [
    //         {test: /\.css$/, loader: 'style!css'}
    //     ]
    // },
    plugins: [
        new HtmlWebpackPlugin({
            filename: 'hello.html',
            template: './src/hello.html',
            inject: 'body'
        }),
        new InlineResource({
            compress: true,
            rootpath: './src',
            template: './src/compile.html',
            filename: 'compile.html'
        })
    ]
};