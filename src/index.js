import vm from 'vm';
import path from 'path';
import _ from 'lodash';
import inlineSource from 'inline-source';
import config from './lib/config';
import ChildCompiler from './lib/childCompiler';

let globalReference = {}, globalNameMap = {}, count = 0;
class InlineResourcePlugin {
    constructor(options) {
        this._templateLoader = null;
        this._assetMap = {};
        this._cacheTemplateFile = {};
        this._embedFiles = [];
        this.prevTimestamps = {};
        this.startTime = Date.now();
        this.options = _.extend({
            compress: false,
            compile: true,
            test: /(\.html$)|(\.ejs$)/
        }, options);
    }

    /**
     * let every embed file has their own unique name
     * @param path
     * @returns {*}
     */
    generateUniqueFileName(path) {
        if (!globalNameMap[path]) {
            globalNameMap[path] = 'inline_temp_{{count}}.js'.replace('{{count}}', count++);
        }
        return globalNameMap[path];
    }

    /**
     * find a loader to load file
     * @param template
     * @param compiler
     * @returns {*}
     */
    initLoader(template, compiler) {
        //'rules' option is support for webpack2
        let moduleConfig = _.extend({preLoaders: [], loaders: [], postLoaders: [], rules: []}, compiler.options.module);
        let loaders = moduleConfig.preLoaders.concat(moduleConfig.loaders).concat(moduleConfig.postLoaders);
        loaders.forEach((loader) => {
                if (loader.test.test(template)) {
                    //if there exist a load for evaluating template
                    //don't need another loader
                    this._templateLoader = '';
                }
            }
        );
        this._templateLoader = this._templateLoader === null ? 'raw-loader!' : this._templateLoader;
        return this._templateLoader + template;
    }

    /**
     * get template from compile result
     * @param source
     * @returns {*}
     */
    getTemplateCompileResult(source) {
        let newSource = '';
        source = source.replace('var ' + config.PLUGIN_TEMPLATE_RESULT + ' =', '');
        try {
            let vmContext = vm.createContext(global);
            let vmScript = new vm.Script(source, {filename: this.options.template});
            newSource = vmScript.runInContext(vmContext);
        } catch (ex) {
            console.error(ex);
            newSource = source;
        }
        return newSource;
    }

    /**
     * evaluate the template to get inline files which need to be compiled
     * @param template
     * @param compiler
     * @param compilation
     * @param callback
     */
    findAndCompileInlineFile(template, compiler, compilation, callback) {
        //Because tapable module doesn't provide the method of deleting special event methods array
        //so we can only delete it by this way...
        delete compiler._plugins[config.COMPILE_COMPLETE_EVENT];
        inlineSource.sync(template, _.extend({
            handlers: (source) => {
                if (source.type == 'js') {
                    //compile JS file
                    let outputOptions = {
                        filename: this.generateUniqueFileName(source.filepath)
                    };
                    if (globalReference[outputOptions.filename]) {
                        //if the target file has been compile
                        //just count and ignore it
                        //don't compile again
                        globalReference[outputOptions.filename]++;
                    } else {
                        let childJSCompiler = ChildCompiler.create(source.filepath, compiler.context, outputOptions, compilation);
                        childJSCompiler.plugin('after-compile', (compilation, callback) => {
                            compilation.chunks.forEach((chunk) => {
                                chunk.modules.forEach((module) => {
                                    module.fileDependencies.forEach((filepath) => {
                                        //record all inline files
                                        //used for find out the change files(watch mode)
                                        this._embedFiles.push(filepath);
                                    });
                                });
                            });
                            callback();
                        });
                        globalReference[outputOptions.filename] = 1;//init reference count
                        compiler.plugin(config.COMPILE_COMPLETE_EVENT, childJSCompiler.runAsChild);
                    }
                    this._assetMap[source.filepath] = outputOptions.filename;
                } else {
                    this._embedFiles.push(source.filepath);
                }
            }
        }, this.options, {
            compress: false
        }));
        //run callback until the all childCompiler is finished
        compiler.applyPluginsParallel(config.COMPILE_COMPLETE_EVENT, callback);
    }

    /**
     * look for files which has changed
     * @returns {Array.<*>}
     */
    findChangedFiles(compilation) {
        let changedFiles = Object.keys(compilation.fileTimestamps)
            .filter((file) => {
                return (this.prevTimestamps[file] || this.startTime) < (compilation.fileTimestamps[file] || Infinity);
            });
        this.prevTimestamps = compilation.fileTimestamps;
        return changedFiles;
    }

    /**
     * detect the content of inline file has changed or not.
     * @param compilation
     */
    detectChange(compilation) {
        return this.findChangedFiles(compilation)
            .some((file) => {
                return this._embedFiles.indexOf(file) > -1;
            });
    }

    apply(compiler) {
        compiler.plugin('make', (compilation, callback) => {
            //reset _embedFiles and _assetMap
            this._embedFiles = [];
            this._assetMap = {};
            if (this.options.filename) {
                //compile html
                let fullTemplate = this.initLoader(this.options.template, compiler);
                let outputOptions = {
                    filename: this.options.filename
                };
                let childHTMLCompiler = ChildCompiler.create(fullTemplate, compiler.context, outputOptions, compilation, true);
                childHTMLCompiler.runAsChild();
                this._embedFiles.push(path.resolve(this.options.template));
            }

            if (this.options.compile) {
                this.findAndCompileInlineFile(this.options.template, compiler, compilation, callback);
            } else {
                callback();
            }
        });

        compiler.plugin('emit', (compilation, callback) => {
            compilation.assets = _.extend({}, this._cacheTemplateFile, compilation.assets);
            Object.keys(compilation.assets).forEach((template) => {
                if (this.options.test.test(template)) {
                    let asset = compilation.assets[template];
                    let buildContent = asset.source();
                    if (this.options.filename) {
                        //if the template is generated by other plugins
                        //don't evaluate the compile result
                        buildContent = this.getTemplateCompileResult(buildContent);
                        //only watch template file which are generated by us
                        compilation.fileDependencies.push(path.resolve(this.options.template));
                    }
                    if (!asset.isCache) {
                        this._cacheTemplateFile[template] = ((content) => {
                            return {
                                source: function () {
                                    return content;
                                },
                                size: function () {
                                    return content.length;
                                },
                                isCache: true
                            };
                        })(buildContent);
                    }
                    try {
                        buildContent = inlineSource.sync(buildContent, _.extend({
                            handlers: (source) => {
                                if (source.type == 'js' && this.options.compile) {
                                    let key = this._assetMap[source.filepath],
                                        asset = compilation.assets[key];
                                    source.fileContent = asset ? asset.source() : source.fileContent;
                                    if (globalReference[key]) {
                                        globalReference[key]--;
                                    }
                                    if (asset && globalReference[key] === 0) {
                                        //don't generate the inline file
                                        delete compilation.assets[key];
                                        delete globalReference[key];
                                    }
                                }
                                //watch the inline file
                                compilation.fileDependencies.push(source.filepath);
                            }
                        }, this.options));
                    } catch (ex) {
                        //Once we catch the JS parse error
                        //just reset the 'globalReference' and delete the output file of us
                        compilation.errors.push(ex.toString());
                        Object.keys(globalReference).forEach(function (key) {
                            delete compilation.assets[key];
                        });
                    }
                    compilation.assets[template] = {
                        source: function () {
                            return buildContent;
                        },
                        size: function () {
                            return buildContent.length;
                        }
                    };
                }
            });

            compiler.plugin('done', () => {
                //force a reset of the 'globalReference' value
                globalReference = {};
            });

            if (this.detectChange(compilation)) {
                //if content has been changed
                //just let other plugins know that we have already recompiled file
                compiler.applyPluginsAsyncWaterfall(config.AFTER_EMIT_EVENT, {}, () => {
                });
            }
            callback && callback();
        });
    }
}

export default InlineResourcePlugin;
