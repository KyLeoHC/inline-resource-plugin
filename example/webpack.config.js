var InlineResource = require('inline-resource-plugin');

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