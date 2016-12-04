var HtmlWebpackPlugin = require('html-webpack-plugin');
var InlineResourcePlugin = require('../index');

module.exports = {
    entry: {
        hello: './src/hello.js'
    },
    output: {
        path: './build',
        publicPath: '/inline-resource-plugin/example/build/',
        filename: '[name].js'
    },
    plugins: [
        new HtmlWebpackPlugin({
            filename: 'hello.html',
            template: './src/hello.html',
            inject: 'body'
        }),
        new InlineResourcePlugin({
            compile: true,
            compress: false,
            rootpath: './src',
            template: './src/hello.html',
            //filename: 'compile.html'
        })
    ]
};