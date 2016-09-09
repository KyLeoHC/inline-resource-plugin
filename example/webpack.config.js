var InlineResource = require('inline-resource-plugin');

module.exports = {
    entry: {
        hello: './hello.js'
    },
    output: {
        path: './build',
        filename: '[name].js'
    },
    plugins: [
        new InlineResource({
            compress: true,
            list: ['hello.html']
        })
    ]
};