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
    plugins: [
        new HtmlWebpackPlugin({
            filename: 'hello.html',
            template: './src/hello.html',
            inject: 'body'
        }),
        new InlineResource({
            compress: false,
            rootpath: './src',
            //if you have only one html file,this list option can also be a character string.such as
            //list: 'hello.html'
            //it can also be a file path string or file path array.such as
            //list: ['./build/hello.html']
            //or use glob,such as
            //list: ['./build/*.html']
            //list: ['./build/hello.html'],
            debug: true
        })
    ]
};