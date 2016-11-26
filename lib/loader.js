'use strict';

var _ = require('lodash');
var loaderUtils = require('loader-utils');

module.exports = function (source) {
    //console.log(source);
    console.log(loaderUtils.getLoaderConfig(this,"myLoader"));
return source;
};
