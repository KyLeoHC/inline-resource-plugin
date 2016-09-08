var webpack = require('webpack');
var InlineResource = require('./my_node_modules/webpack-inline-resource');

module.exports = {
    entry: {
        1: './js/parseTemplate.js'
    },
    output: {
        path: './build',
        filename: 'app.bundle.js'
    },
    plugins: [
        new InlineResource(['./html/testTemplate.html'])/*,
        new InlineResource({
            root: './html',
            files: []
        })*/
    ]
};