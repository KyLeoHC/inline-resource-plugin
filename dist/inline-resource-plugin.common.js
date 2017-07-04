'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var vm = _interopDefault(require('vm'));
var path = _interopDefault(require('path'));
var _ = _interopDefault(require('lodash'));
var inlineSource = _interopDefault(require('inline-source'));
var NodeTemplatePlugin = _interopDefault(require('webpack/lib/node/NodeTemplatePlugin'));
var NodeTargetPlugin = _interopDefault(require('webpack/lib/node/NodeTargetPlugin'));
var LoaderTargetPlugin = _interopDefault(require('webpack/lib/LoaderTargetPlugin'));
var LibraryTemplatePlugin = _interopDefault(require('webpack/lib/LibraryTemplatePlugin'));
var SingleEntryPlugin = _interopDefault(require('webpack/lib/SingleEntryPlugin'));

var config = {
    PLUGIN_NAME: 'inline-resource-plugin',
    COMPILE_COMPLETE_EVENT: 'embed-content-compile-complete',
    AFTER_EMIT_EVENT: 'inline-resource-plugin-html-after-emit',
    PLUGIN_TEMPLATE_RESULT: 'INLINE-RESOURCE-PLUGIN-RESULT'
};

var version = "0.6.1";

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

var ChildCompiler = function () {
    function ChildCompiler() {
        classCallCheck(this, ChildCompiler);
    }

    createClass(ChildCompiler, [{
        key: 'create',
        value: function create(template, context, outputOptions, compilation, isTemplate) {
            var compilerName = this.getCompilerName(template);
            var childCompiler = compilation.createChildCompiler(compilerName, outputOptions);
            childCompiler.context = context;

            if (isTemplate) {
                childCompiler.apply(new NodeTargetPlugin(), new LoaderTargetPlugin('node'), new NodeTemplatePlugin(outputOptions), new LibraryTemplatePlugin(config.PLUGIN_TEMPLATE_RESULT, 'var'));
            }
            childCompiler.apply(new SingleEntryPlugin(context, template));

            childCompiler.plugin('compilation', function (compilation) {
                if (compilation.cache) {
                    if (!compilation.cache[compilerName]) {
                        compilation.cache[compilerName] = {};
                    }
                    compilation.cache = compilation.cache[compilerName];
                }
            });

            // save the original runAsChild method and export a new runAsChild method
            childCompiler._runAsChildOriginal = childCompiler.runAsChild;
            childCompiler.runAsChild = function (callback) {
                childCompiler._runAsChildOriginal(function (error, entries, childCompilation) {
                    var outputName = outputOptions.filename;
                    if (compilation.assets[outputName] && childCompilation.assets[outputName]) {
                        delete childCompilation.assets[outputName];
                    }
                    callback && callback();
                });
            };

            return childCompiler;
        }
    }, {
        key: 'getCompilerName',
        value: function getCompilerName(template) {
            return config.PLUGIN_NAME + '@' + version + ' is compiling "' + path.basename(template) + '"';
        }
    }]);
    return ChildCompiler;
}();

var ChildCompiler$1 = new ChildCompiler();

var globalReference = {};
var globalNameMap = {};
var count = 0;

var InlineResourcePlugin = function () {
    function InlineResourcePlugin(options) {
        classCallCheck(this, InlineResourcePlugin);

        this._templateLoader = null;
        this._assetMap = {};
        this._cacheTemplateFile = {};
        this._embedFiles = [];
        this.prevTimestamps = {};
        this.startTime = Date.now();
        this.options = _.extend({
            compress: false,
            compile: true
        }, options);
    }

    /**
     * let every embed file has their own unique name
     * @param path
     * @returns {*}
     */


    createClass(InlineResourcePlugin, [{
        key: 'generateUniqueFileName',
        value: function generateUniqueFileName(path$$1) {
            if (!globalNameMap[path$$1]) {
                globalNameMap[path$$1] = 'inline_temp_' + count++ + '.js';
            }
            return globalNameMap[path$$1];
        }

        /**
         * find a loader to load file
         * @param template
         * @param compiler
         * @returns {*}
         */

    }, {
        key: 'initLoader',
        value: function initLoader(template, compiler) {
            var _this = this;

            // 'rules' option is support for webpack 2.x and 3.x
            var moduleConfig = _.extend({ preLoaders: [], loaders: [], postLoaders: [], rules: [] }, compiler.options.module);
            var loaders = moduleConfig.preLoaders.concat(moduleConfig.loaders).concat(moduleConfig.postLoaders);
            loaders.forEach(function (loader) {
                if (loader.test.test(template)) {
                    // if there exist a load for evaluating template
                    // don't need another loader
                    _this._templateLoader = '';
                }
            });
            // use raw-loader to load template file if there are no loaders match the template
            this._templateLoader = this._templateLoader === null ? 'raw-loader!' : this._templateLoader;
            return this._templateLoader + template;
        }

        /**
         * get template from compile result
         * @param source
         * @returns {*}
         */

    }, {
        key: 'getTemplateCompileResult',
        value: function getTemplateCompileResult(source) {
            var newSource = '';
            source = source.replace('var ' + config.PLUGIN_TEMPLATE_RESULT + ' =', '');
            try {
                var vmContext = vm.createContext(global);
                var vmScript = new vm.Script(source, { filename: this.options.template });
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
         */

    }, {
        key: 'findAndCompileInlineFile',
        value: function findAndCompileInlineFile(template, compiler, compilation) {
            var _this2 = this;

            inlineSource.sync(template, _.extend({
                handlers: function handlers(source) {
                    if (source.type == 'js') {
                        // compile JS file
                        var outputOptions = {
                            filename: _this2.generateUniqueFileName(source.filepath)
                        };
                        if (globalReference[outputOptions.filename]) {
                            // if the target file has been compiled
                            // just count and ignore it
                            // don't compile again
                            globalReference[outputOptions.filename]++;
                        } else {
                            var childJSCompiler = ChildCompiler$1.create(source.filepath, compiler.context, outputOptions, compilation);
                            childJSCompiler.plugin('after-compile', function (compilation, callback) {
                                compilation.chunks.forEach(function (chunk) {
                                    if (chunk.forEachModule) {
                                        // 'chunk.modules' in webpack 3.x is deprecated
                                        chunk.forEachModule(function (module) {
                                            module.fileDependencies.forEach(function (filepath) {
                                                // record all inline files
                                                // used for find out the change files(watch mode)
                                                _this2._embedFiles.push(filepath);
                                            });
                                        });
                                    } else if (chunk.modules) {
                                        // webpack 1.x and 2.x
                                        chunk.modules.forEach(function (module) {
                                            module.fileDependencies.forEach(function (filepath) {
                                                // record all inline files
                                                // used for find out the change files(watch mode)
                                                _this2._embedFiles.push(filepath);
                                            });
                                        });
                                    }
                                });
                                callback();
                            });
                            globalReference[outputOptions.filename] = 1; // init reference count
                            compiler.plugin(config.COMPILE_COMPLETE_EVENT, childJSCompiler.runAsChild);
                        }
                        _this2._assetMap[source.filepath] = outputOptions.filename;
                    } else {
                        _this2._embedFiles.push(source.filepath);
                    }
                }
            }, this.options, {
                compress: false
            }));
        }

        /**
         * look for files which has changed
         * @returns {Array.<*>}
         */

    }, {
        key: 'findChangedFiles',
        value: function findChangedFiles(compilation) {
            var _this3 = this;

            var changedFiles = Object.keys(compilation.fileTimestamps).filter(function (file) {
                return (_this3.prevTimestamps[file] || _this3.startTime) < (compilation.fileTimestamps[file] || Infinity);
            });
            this.prevTimestamps = compilation.fileTimestamps;
            return changedFiles;
        }

        /**
         * detect the content of inline file has changed or not.
         * @param compilation
         */

    }, {
        key: 'detectChange',
        value: function detectChange(compilation) {
            var _this4 = this;

            return this.findChangedFiles(compilation).some(function (file) {
                return _this4._embedFiles.indexOf(file) > -1;
            });
        }
    }, {
        key: 'apply',
        value: function apply(compiler) {
            var _this5 = this;

            compiler.plugin('make', function (compilation, callback) {
                // Because tapable module doesn't provide the method of deleting special event method array
                // so we can only delete it by this way...
                delete compiler._plugins[config.COMPILE_COMPLETE_EVENT];
                // reset _embedFiles and _assetMap
                _this5._embedFiles = [];
                _this5._assetMap = {};
                if (_this5.options.filename) {
                    // compile html
                    var fullTemplate = _this5.initLoader(_this5.options.template, compiler);
                    var outputOptions = {
                        filename: _this5.options.filename
                    };
                    var childHTMLCompiler = ChildCompiler$1.create(fullTemplate, compiler.context, outputOptions, compilation, true);
                    compiler.plugin(config.COMPILE_COMPLETE_EVENT, childHTMLCompiler.runAsChild);
                    _this5._embedFiles.push(path.resolve(_this5.options.template));
                }

                if (_this5.options.compile) {
                    _this5.findAndCompileInlineFile(_this5.options.template, compiler, compilation);
                }

                // run callback until the all childCompiler is finished
                compiler.applyPluginsParallel(config.COMPILE_COMPLETE_EVENT, callback);
            });

            compiler.plugin('emit', function (compilation, callback) {
                compilation.assets = _.extend({}, _this5._cacheTemplateFile, compilation.assets);
                Object.keys(compilation.assets).forEach(function (template) {
                    // if 'test' option is supplied, just use 'test' option
                    // otherwise use 'filename' option
                    if (_this5.options.test && _this5.options.test.test(template) || _this5.options.filename && _this5.options.filename === template) {
                        // match the template file
                        var asset = compilation.assets[template];
                        var buildContent = asset.source();
                        if (_this5.options.filename) {
                            // if the template is generated by other plugins
                            // don't evaluate the compile result
                            buildContent = _this5.getTemplateCompileResult(buildContent);
                            // only watch template file which are generated by us
                            compilation.fileDependencies.push(path.resolve(_this5.options.template));
                        }
                        if (!asset.isCache) {
                            // cache the template file
                            _this5._cacheTemplateFile[template] = function (content) {
                                return {
                                    source: function source() {
                                        return content;
                                    },
                                    size: function size() {
                                        return content.length;
                                    },
                                    isCache: true
                                };
                            }(buildContent);
                        }
                        try {
                            buildContent = inlineSource.sync(buildContent, _.extend({
                                handlers: function handlers(source) {
                                    if (source.type == 'js' && _this5.options.compile) {
                                        var key = _this5._assetMap[source.filepath],
                                            _asset = compilation.assets[key];
                                        source.fileContent = _asset ? _asset.source() : source.fileContent;
                                        if (globalReference[key]) {
                                            globalReference[key]--;
                                        }
                                        if (_asset && globalReference[key] === 0) {
                                            // don't generate the inline file
                                            delete compilation.assets[key];
                                            delete globalReference[key];
                                        }
                                    }
                                    // watch the inline file
                                    compilation.fileDependencies.push(source.filepath);
                                }
                            }, _this5.options));
                        } catch (ex) {
                            // Once we catch the JS parse error
                            // just reset the 'globalReference' and delete the output file of us
                            compilation.errors.push(ex.toString());
                            Object.keys(globalReference).forEach(function (key) {
                                delete compilation.assets[key];
                            });
                        }
                        compilation.assets[template] = {
                            source: function source() {
                                return buildContent;
                            },
                            size: function size() {
                                return buildContent.length;
                            }
                        };
                    }
                });

                compiler.plugin('done', function () {
                    // force a reset of the 'globalReference' value
                    globalReference = {};
                });

                if (_this5.detectChange(compilation)) {
                    // if content has been changed
                    // just let other plugins know that we have already recompiled file
                    compiler.applyPluginsAsyncWaterfall(config.AFTER_EMIT_EVENT, {}, function () {});
                }
                callback && callback();
            });
        }
    }]);
    return InlineResourcePlugin;
}();

module.exports = InlineResourcePlugin;
