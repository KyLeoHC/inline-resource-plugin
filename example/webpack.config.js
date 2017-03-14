var HtmlWebpackPlugin = require('html-webpack-plugin');
var InlineResourcePlugin = require('../dist/inline-resource-plugin.common');

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
            filename: 'hello_result.html',
            template: './src/hello.html',
            inject: 'body'
        }),
        new InlineResourcePlugin({
            compile: true,
            compress: true,
            rootpath: './src',
            template: './src/hello.html',
            test: /^hello_result\.html$/
            //filename: 'hello.html'
        }),
        new HtmlWebpackPlugin({
            filename: 'world_result.html',
            template: './src/world.html',
            inject: 'body'
        }),
        new InlineResourcePlugin({
            compile: true,
            compress: true,
            rootpath: './src',
            template: './src/world.html',
            test: /^world_result\.html$/
            //filename: 'world.html'
        })
    ]
};