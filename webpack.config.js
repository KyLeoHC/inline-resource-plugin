var path = require('path');
var InlineResource = require('./index.js');

module.exports = {
    entry: {
        hello: './test/hello.js'
    },
    output: {
        path: './test/build',
        filename: 'test.js'
    },
    plugins: [
        new InlineResource({
            compress: true,
            rootpath: path.resolve('test'),
            list: ['./test/hello.html']
        })
    ]
};