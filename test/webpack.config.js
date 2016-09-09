var path = require('path');
var InlineResource = require('./../index.js');

module.exports = {
    entry: {
        hello: './hello.js'
    },
    output: {
        path: './build',
        filename: 'test.js'
    },
    plugins: [
        new InlineResource({
            compress: true,
            list: ['hello.html']
        })
    ]
};