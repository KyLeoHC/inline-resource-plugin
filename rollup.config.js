import json from 'rollup-plugin-json';
import babel from 'rollup-plugin-babel';

export default {
    entry: 'src/index.js',
    dest: 'dist/inline-resource-plugin.common.js',
    format: 'cjs',
    plugins: [
        json(),
        babel()
    ],
    external: [
        'vm',
        'path',
        'lodash',
        'inline-source',
        'webpack/lib/node/NodeTemplatePlugin',
        'webpack/lib/node/NodeTargetPlugin',
        'webpack/lib/LoaderTargetPlugin',
        'webpack/lib/SingleEntryPlugin',
        'webpack/lib/LibraryTemplatePlugin'
    ]
};