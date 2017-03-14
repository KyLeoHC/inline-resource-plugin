import path from 'path';
import config from './config';
import NodeTemplatePlugin from 'webpack/lib/node/NodeTemplatePlugin';
import NodeTargetPlugin from 'webpack/lib/node/NodeTargetPlugin';
import LoaderTargetPlugin from 'webpack/lib/LoaderTargetPlugin';
import LibraryTemplatePlugin from 'webpack/lib/LibraryTemplatePlugin';
import SingleEntryPlugin from 'webpack/lib/SingleEntryPlugin';

class ChildCompiler {
    constructor() {
    }

    create(template, context, outputOptions, compilation, isTemplate) {
        let compilerName = this.getCompilerName(template);
        let childCompiler = compilation.createChildCompiler(compilerName, outputOptions);
        childCompiler.context = context;

        childCompiler.apply(
            new NodeTargetPlugin(),
            new SingleEntryPlugin(context, template),
            new LoaderTargetPlugin('node')
        );

        if (isTemplate) {
            childCompiler.apply(
                new NodeTemplatePlugin(outputOptions),
                new LibraryTemplatePlugin(config.PLUGIN_TEMPLATE_RESULT, 'var')
            );
        }

        childCompiler.plugin('compilation', (compilation) => {
            if (compilation.cache) {
                if (!compilation.cache[compilerName]) {
                    compilation.cache[compilerName] = {};
                }
                compilation.cache = compilation.cache[compilerName];
            }
        });

        //save the original runAsChild method and export a new runAsChild method
        childCompiler._runAsChildOriginal = childCompiler.runAsChild;
        childCompiler.runAsChild = (callback) => {
            childCompiler._runAsChildOriginal((error, entries, childCompilation) => {
                let outputName = outputOptions.filename;
                if (compilation.assets[outputName] && childCompilation.assets[outputName]) {
                    delete childCompilation.assets[outputName];
                }
                callback && callback();
            });
        };

        return childCompiler;
    }

    getCompilerName(template) {
        return config.PLUGIN_NAME + ' is compiling \'' + path.basename(template) + '\'';
    }
}

export default new ChildCompiler();
