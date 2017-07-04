const HtmlWebpackPlugin = require('html-webpack-plugin');
const InlineResourcePlugin = require('../dist/inline-resource-plugin.common');
const path = require('path');

module.exports = {
    entry: {
        hello: './src/hello'
    },
    output: {
        path: path.resolve(__dirname, 'build'),
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
        }),
        new InlineResourcePlugin({
            compile: false,
            compress: true,
            rootpath: './src',
            template: './src/world.html',
            filename: 'world_result.html'
        })
    ]
};