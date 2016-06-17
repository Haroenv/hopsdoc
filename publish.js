/**
 * publishing script. This file will be executed by jsdoc
 * @file publish.js
 * @module publish
 * @exports publish
 * @author Nijiko Yonskai <nijikokun@gmail.com>
 * @author Gregor Adams <greg@pixelass.com>
 */

/*global env: true */
'use strict';

var doop = require('jsdoc/util/doop');
var fs = require('jsdoc/fs');
var helper = require('jsdoc/util/templateHelper');
var logger = require('jsdoc/util/logger');
var path = require('jsdoc/path');
var taffy = require('taffydb').taffy;
var template = require('jsdoc/template');
var util = require('util');

var htmlsafe = helper.htmlsafe;
var linkto = helper.linkto;
var resolveAuthorLinks = helper.resolveAuthorLinks;
var scopeToPunc = helper.scopeToPunc;
var hasOwnProp = Object.prototype.hasOwnProperty;

var data;
var view;

var outdir = path.normalize(env.opts.destination);
/**
 * find spec in global data
 * @type Function
 * @param  {Object} spec - options for searching and filtering
 * @param  {Object} spec.kind - kind of doclet to look for
 * @param  {Object} spec.memberof - filter by ancestors
 * @return {Array}      returns a list of matches
 */
function find(spec) {
    return helper.find(data, spec);
}

/**
 * create a link to a tutorial
 * @type Function
 * @param  {String} tutorial - tutorial = name of doclet
 * @return {String}          returns an HTML element as a string
 */
function tutoriallink(tutorial) {
    return helper.toTutorial(tutorial, null, { tag: 'em', classname: 'disabled', prefix: 'Tutorial: ' });
}

/**
 * create a link to a tutorial
 * @type Function
 * @param  {Object} doclet - doclet to look for
 * @param  {Object} doclet.kind - kind of doclet to filter by
 * @return {String}          returns an HTML element as a string
 */
function getAncestorLinks(doclet) {
    return helper.getAncestorLinks(data, doclet);
}

/**
 * create a link from a hash
 * @type Function
 * @param  {Object} doclet - doclet to look for
 * @param  {String} hash - jsdoc version of window.location hash's
 * @return {String}          returns an HTML element as a string
 */
function hashToLink(doclet, hash) {
    if ( !/^(#.+)/.test(hash) ) { return hash; }

    var url = helper.createLink(doclet);

    url = url.replace(/(#.+|$)/, hash);
    return '<a href="' + url + '">' + hash + '</a>';
}

/**
 * create a link from a hash
 * @type Function
 * @param  {Object} doclet - doclet to look for
 * @param  {Object} doclet.kind - kind of doclet to filter by
 * @return {Boolean}          returns true or false
 */
function needsSignature(doclet) {
    var needsSig = false;

    // function and class definitions always get a signature
    if (doclet.kind === 'function' || doclet.kind === 'class') {
        needsSig = true;
    }
    // typedefs that contain functions get a signature, too
    else if (doclet.kind === 'typedef' && doclet.type && doclet.type.names &&
        doclet.type.names.length) {
        for (var i = 0, l = doclet.type.names.length; i < l; i++) {
            if (doclet.type.names[i].toLowerCase() === 'function') {
                needsSig = true;
                break;
            }
        }
    }

    return needsSig;
}

/**
 * create a link from a hash
 * @type Function
 * @param  {Object} item - item to look for
 * @param  {Boolean} item.optional - is item optional?
 * @param  {Boolean} item.nullable - is item nullable?
 * @param  {Boolean} item.optional - is item optional?
 * @return {Array.<string>}          returns a list of attributes
 */
function getSignatureAttributes(item) {
    var attributes = [];

    if (item.optional) {
        attributes.push('opt');
    }

    if (item.nullable === true) {
        attributes.push('nullable');
    }
    else if (item.nullable === false) {
        attributes.push('non-null');
    }

    return attributes;
}

/**
 * get an updated name for an item (respects variable & signatures)
 * @type Function
 * @param  {Object} item - item to update
 * @return {String}      returns updated item name
 */
function updateItemName(item) {
    var attributes = getSignatureAttributes(item);
    var itemName = item.name || '';

    if (item.variable) {
        itemName = '&hellip;' + itemName;
    }

    if (attributes && attributes.length) {
        itemName = util.format( '%s<span class="signature-attributes">%s</span>', itemName,
            attributes.join(', ') );
    }

    return itemName;
}

/**
 * add params 
 * @type Function
 * @param {Array} params - list of params to add
 * @param {Array} returns an updated list
 */
function addParamAttributes(params) {
    return params.filter(function(param) {
        return param.name && param.name.indexOf('.') === -1;
    }).map(updateItemName);
}

/**
 * build item types from item
 * @type Function
 * @param  {Object} item - item to use as source
 * @param  {Object} item.type - item type
 * @param  {Object} item.type.names - type names
 * @return {Array.<string>}      returns a list of type strings
 */
function buildItemTypeStrings(item) {
    var types = [];

    if (item && item.type && item.type.names) {
        item.type.names.forEach(function(name) {
            types.push( linkto(name, htmlsafe(name)) );
        });
    }

    return types;
}

/**
 * build item types from item
 * @type Function
 * @param  {Array} attribs list of attributes
 * @return {String}         returns a string of the list
 */
function buildAttribsString(attribs) {
    var attribsString = '';

    if (attribs && attribs.length) {
        attribsString = htmlsafe( util.format('(%s) ', attribs.join(', ')) );
    }

    return attribsString;
}

/**
 * add attributes missing in params
 * @type Function
 * @param {Array} items - tiems to look at
 * @return {Array} returns a list of types
 */
function addNonParamAttributes(items) {
    var types = [];

    items.forEach(function(item) {
        types = types.concat( buildItemTypeStrings(item) );
    });

    return types;
}

/**
 * add signature params to function
 * @type Function
 * @param {Object} f function object
 * @param {Object} [f.params=undefined] - params to include
 * @param {Object} [f.signature=undefined] - signature to add
 */
function addSignatureParams(f) {
    var params = f.params ? addParamAttributes(f.params) : [];
    f.signature = util.format( '%s(%s)', (f.signature || ''), params.join(', ') );
}

/**
 * add signature returns to function
 * @type Function
 * @param {Object} f function object
 * @param {Object} [f.returns=undefined] - returns to include
 * @param {Object} [f.signature=undefined] - signature to add
 */
function addSignatureReturns(f) {
    var attribs = [];
    var attribsString = '';
    var returnTypes = [];
    var returnTypesString = '';

    // jam all the return-type attributes into an array. this could create odd results (for example,
    // if there are both nullable and non-nullable return types), but let's assume that most people
    // who use multiple @return tags aren't using Closure Compiler type annotations, and vice-versa.
    if (f.returns) {
        f.returns.forEach(function(item) {
            helper.getAttribs(item).forEach(function(attrib) {
                if (attribs.indexOf(attrib) === -1) {
                    attribs.push(attrib);
                }
            });
        });

        attribsString = buildAttribsString(attribs);
    }

    if (f.returns) {
        returnTypes = addNonParamAttributes(f.returns);
    }
    if (returnTypes.length) {
        returnTypesString = util.format( ' &rarr; %s{%s}', attribsString, returnTypes.join('|') );
    }

    f.signature = '<span class="signature">' + (f.signature || '') + '</span>' +
        '<span class="type-signature">' + returnTypesString + '</span>';
}

/**
 * add signature types to function
 * @type Function
 * @param {Object} f function object
 * @param {Object} [f.type=undefined] - types to include
 * @param {Object} [f.signature=undefined] - signature to add
 */
function addSignatureTypes(f) {
    var types = f.type ? buildItemTypeStrings(f) : [];

    f.signature = (f.signature || '') + '<span class="type-signature">' +
        (types.length ? ' :' + types.join('|') : '') + '</span>';
}

/**
 * add attributes to function
 * @type Function
 * @param {Object} f function object
 * @param {Object} [f.attribs=undefined] - attributes to include
 */
function addAttribs(f) {
    var attribs = helper.getAttribs(f);
    var attribsString = buildAttribsString(attribs);

    f.attribs = util.format('<span class="type-signature">%s</span>', attribsString);
}

/**
 * shorten paths
 * @type Function
 * @param  {Object} files - Object containing files
 * @param  {String|RegEx} commonPrefix - regex pattern or sting to replace
 * @return {Object}              return the mutated Object
 */
function shortenPaths(files, commonPrefix) {
    Object.keys(files).forEach(function(file) {
        files[file].shortened = files[file].resolved.replace(commonPrefix, '')
            // always use forward slashes
            .replace(/\\/g, '/');
    });

    return files;
}

/**
 * extract path from doclet
 * @type Function
 * @param  {Object} doclet - doclet to extract from
 * @return {String|null}     returns a path or filename unless no meta is given
 */
function getPathFromDoclet(doclet) {
    if (!doclet.meta) {
        return null;
    }

    return doclet.meta.path && doclet.meta.path !== 'null' ?
        path.join(doclet.meta.path, doclet.meta.filename) :
        doclet.meta.filename;
}

/**
 * generate documentation
 * @type Function
 * @param  {String} type - type of doclet
 * @param  {String} title - title of doclet
 * @param  {Array} docs - list of documentations
 * @param  {String} filename - name of file to generate
 * @param  {Boolean} resolveLinks - relolve links (turn `{@link foo}` into `<a href="foodoc.html">foo</a>`) 
 */
function generate(type, title, docs, filename, resolveLinks) {
    resolveLinks = resolveLinks === false ? false : true;

    var docData = {
        type: type,
        title: title,
        docs: docs
    };

    var outpath = path.join(outdir, filename),
        html = view.render('container.tmpl', docData);

    if (resolveLinks) {
        html = helper.resolveLinks(html); // turn {@link foo} into <a href="foodoc.html">foo</a>
    }

    fs.writeFileSync(outpath, html, 'utf8');
}

/**
 * generate source files for modules and files
 * @type Function
 * @param  {Object} sourceFiles Object containing all files
 * @param  {String} encoding    character encoding
 */
function generateSourceFiles(sourceFiles, encoding) {
    encoding = encoding || 'utf8';
    Object.keys(sourceFiles).forEach(function(file) {
        var source;
        // links are keyed to the shortened path in each doclet's `meta.shortpath` property
        var sourceOutfile = helper.getUniqueFilename(sourceFiles[file].shortened);
        helper.registerLink(sourceFiles[file].shortened, sourceOutfile);

        try {
            source = {
                kind: 'source',
                code: helper.htmlsafe( fs.readFileSync(sourceFiles[file].resolved, encoding) )
            };
        }
        catch(e) {
            logger.error('Error while generating source file %s: %s', file, e.message);
        }

        generate('Source', sourceFiles[file].shortened, [source], sourceOutfile, false);
    });
}

/**
 * Look for classes or functions with the same name as modules (which indicates that the module
 * exports only that class or function), then attach the classes or functions to the `module`
 * property of the appropriate module doclets. The name of each class or function is also updated
 * for display purposes. This function mutates the original arrays.
 *
 * @type Function
 * @private
 * @param {Array.<module:jsdoc/doclet.Doclet>} doclets - The array of classes and functions to
 * check.
 * @param {Array.<module:jsdoc/doclet.Doclet>} modules - The array of module doclets to search.
 */
function attachModuleSymbols(doclets, modules) {
    var symbols = {};

    // build a lookup table
    doclets.forEach(function(symbol) {
        symbols[symbol.longname] = symbols[symbol.longname] || [];
        symbols[symbol.longname].push(symbol);
    });

    return modules.map(function(module) {
        if (symbols[module.longname]) {
            module.modules = symbols[module.longname]
                // Only show symbols that have a description. Make an exception for classes, because
                // we want to show the constructor-signature heading no matter what.
                .filter(function(symbol) {
                    return symbol.description || symbol.kind === 'class';
                })
                .map(function(symbol) {
                    symbol = doop(symbol);

                    if (symbol.kind === 'class' || symbol.kind === 'function') {
                        symbol.name = symbol.name.replace('module:', '(require("') + '"))';
                    }

                    return symbol;
                });
        }
    });
}

/**
 * Buold the navigation for members
 * @type Function
 * @param  {Array} items - list of items
 * @param  {String} itemHeading - heading for navigation section
 * @param  {Object} itemsSeen - seen items
 * @param  {Function} linktoFn - function to create links
 * @return {String} returns a string containing the navigation HTML code
 */
function buildMemberNav(items, itemHeading, itemsSeen, linktoFn) {
    var nav = '';

    if (items && items.length) {
        var itemsNav = '';

        items.forEach(function(item) {
            var typedefs = find({kind:'typedef', memberof: item.longname});
            var methods = find({kind:'function', memberof: item.longname});
            var members = find({kind:'member', memberof: item.longname});
            if ( !hasOwnProp.call(item, 'longname') ) {
                itemsNav += '<li>' + linktoFn('', item.name);
                itemsNav += '</li>';
            } else if ( !hasOwnProp.call(itemsSeen, item.longname) ) {
                itemsNav += '<li>' + linktoFn(item.longname, item.name.replace(/^module:/, ''));
                if (members.length) {
                    itemsNav += "<ul class='members'>";
                    itemsNav += "<li class='nav-type-header'>Members</li>";

                    members.forEach(function (member) {
                        itemsNav += "<li data-type='member'>";
                        itemsNav += linkto(member.longname, member.name);
                        itemsNav += "</li>";
                    });

                    itemsNav += "</ul>";
                }
                if (methods.length) {
                    itemsNav += "<ul class='methods'>";
                    itemsNav += "<li class='nav-type-header'>Methods</li>";

                    methods.forEach(function (method) {
                        itemsNav += "<li data-type='method'>";
                        itemsNav += linkto(method.longname, method.name);
                        itemsNav += "</li>";
                    });

                    itemsNav += "</ul>";
                }
                if (typedefs.length) {
                    itemsNav += "<ul class='typedefs'>";
                    itemsNav += "<li class='nav-type-header'>Typedefs</li>";

                    typedefs.forEach(function (typedef) {
                        itemsNav += "<li data-type='typedef'>";
                        itemsNav += linkto(typedef.longname, typedef.name);
                        itemsNav += "</li>";
                    });

                    itemsNav += "</ul>";
                }
                itemsNav += '</li>';
                itemsSeen[item.longname] = true;
            }
        });

        if (itemsNav !== '') {
            nav +=  '<header class="nav-header"><h3><span>' + itemHeading + '</span></h3></header><ul>' + itemsNav + '</ul>';
        } else {

        }
    }

    return nav;
}

/**
 * create a link to the coresponding tutorial
 * @type Function
 * @param  {String} longName - longname of doclet
 * @param  {String} name - name of doclet
 * @return {String} returns a string containing an HTML element
 */
function linktoTutorial(longName, name) {
    return tutoriallink(name);
}

/**
 * create a link to external resource
 * @type Function
 * @param  {String} longName - longname of doclet
 * @param  {String} name - name of doclet
 * @return {String} returns a string containing an HTML element
 */
function linktoExternal(longName, name) {
    return linkto(longName, name.replace(/(^"|"$)/g, ''));
}

/**
 * Create the navigation sidebar.
 * @type Function
 * @param {object} members The members that will be used to create the sidebar.
 * @param {array<object>} members.classes
 * @param {array<object>} members.externals
 * @param {array<object>} members.globals
 * @param {array<object>} members.mixins
 * @param {array<object>} members.modules
 * @param {array<object>} members.namespaces
 * @param {array<object>} members.tutorials
 * @param {array<object>} members.events
 * @param {array<object>} members.interfaces
 * @return {string} The HTML for the navigation sidebar.
 */
function buildNav(members) {
    var nav = '<header class="nav-header"><h2><a href="index.html">Home</a></h2></header>';
    var seen = {};
    var seenTutorials = {};

    nav += buildMemberNav(members.classes, 'Classes', seen, linkto);
    nav += buildMemberNav(members.modules, 'Modules', {}, linkto);
    nav += buildMemberNav(members.externals, 'Externals', seen, linktoExternal);
    nav += buildMemberNav(members.events, 'Events', seen, linkto);
    nav += buildMemberNav(members.namespaces, 'Namespaces', seen, linkto);
    nav += buildMemberNav(members.mixins, 'Mixins', seen, linkto);
    nav += buildMemberNav(members.tutorials, 'Tutorials', seenTutorials, linktoTutorial);
    nav += buildMemberNav(members.interfaces, 'Interfaces', seen, linkto);

    if (members.globals.length) {
        var globalNav = '';

        members.globals.forEach(function(g) {
            if ( g.kind !== 'typedef' && !hasOwnProp.call(seen, g.longname) ) {
                globalNav += '<li>' + linkto(g.longname, g.name) + '</li>';
            }
            seen[g.longname] = true;
        });

        if (!globalNav) {
            // turn the heading into a link so you can actually get to the global page
            nav += '<header class="nav-header"><h3>' + linkto('global', 'Global') + '</h3></header>';
        }
        else {
            nav += '<header class="nav-header"><h3>Global</h3></header><ul>' + globalNav + '</ul>';
        }
    }

    return nav;
}

/**
 * @type Function
 * @param {TAFFY} taffyData See <http://taffydb.com/>.
 * @param {object} opts
 * @param {Tutorial} tutorials
 */
exports.publish = function(taffyData, opts, tutorials) {
    data = taffyData;

    var conf = env.conf.templates || {};
    conf.default = conf.default || {};

    var templatePath = path.normalize(opts.template);
    view = new template.Template( path.join(templatePath, 'tmpl') );

    // claim some special filenames in advance, so the All-Powerful Overseer of Filename Uniqueness
    // doesn't try to hand them out later
    var indexUrl = helper.getUniqueFilename('index');
    // don't call registerLink() on this one! 'index' is also a valid longname

    var globalUrl = helper.getUniqueFilename('global');
    helper.registerLink('global', globalUrl);

    // set up templating
    view.layout = conf.default.layoutFile ?
        path.getResourcePath(path.dirname(conf.default.layoutFile),
            path.basename(conf.default.layoutFile) ) :
        'layout.tmpl';

    // set up tutorials for helper
    helper.setTutorials(tutorials);

    data = helper.prune(data);
    data.sort('longname, version, since');
    helper.addEventListeners(data);

    var sourceFiles = {};
    var sourceFilePaths = [];
    data().each(function(doclet) {
         doclet.attribs = '';

        if (doclet.examples) {
            doclet.examples = doclet.examples.map(function(example) {
                var caption, code;

                if (example.match(/^\s*<caption>([\s\S]+?)<\/caption>(\s*[\n\r])([\s\S]+)$/i)) {
                    caption = RegExp.$1;
                    code = RegExp.$3;
                }

                return {
                    caption: caption || '',
                    code: code || example
                };
            });
        }
        if (doclet.see) {
            doclet.see.forEach(function(seeItem, i) {
                doclet.see[i] = hashToLink(doclet, seeItem);
            });
        }

        // build a list of source files
        var sourcePath;
        if (doclet.meta) {
            sourcePath = getPathFromDoclet(doclet);
            sourceFiles[sourcePath] = {
                resolved: sourcePath,
                shortened: null
            };
            if (sourceFilePaths.indexOf(sourcePath) === -1) {
                sourceFilePaths.push(sourcePath);
            }
        }
    });

    // update outdir if necessary, then create outdir
    var packageInfo = ( find({kind: 'package'}) || [] ) [0];
    if (packageInfo && packageInfo.name) {
        outdir = path.join( outdir, packageInfo.name, (packageInfo.version || '') );
    }
    fs.mkPath(outdir);

    // copy the template's static files to outdir
    var fromDir = path.join(templatePath, 'static');
    var staticFiles = fs.ls(fromDir, 3);

    staticFiles.forEach(function(fileName) {
        var toDir = fs.toDir( fileName.replace(fromDir, outdir) );
        fs.mkPath(toDir);
        fs.copyFileSync(fileName, toDir);
    });

    // copy user-specified static files to outdir
    var staticFilePaths;
    var staticFileFilter;
    var staticFileScanner;
    if (conf.default.staticFiles) {
        // The canonical property name is `include`. We accept `paths` for backwards compatibility
        // with a bug in JSDoc 3.2.x.
        staticFilePaths = conf.default.staticFiles.include ||
            conf.default.staticFiles.paths ||
            [];
        staticFileFilter = new (require('jsdoc/src/filter')).Filter(conf.default.staticFiles);
        staticFileScanner = new (require('jsdoc/src/scanner')).Scanner();

        staticFilePaths.forEach(function(filePath) {
            var extraStaticFiles = staticFileScanner.scan([filePath], 10, staticFileFilter);

            extraStaticFiles.forEach(function(fileName) {
                var sourcePath = fs.toDir(filePath);
                var toDir = fs.toDir( fileName.replace(sourcePath, outdir) );
                fs.mkPath(toDir);
                fs.copyFileSync(fileName, toDir);
            });
        });
    }

    if (sourceFilePaths.length) {
        sourceFiles = shortenPaths( sourceFiles, path.commonPrefix(sourceFilePaths) );
    }
    data().each(function(doclet) {
        var url = helper.createLink(doclet);
        helper.registerLink(doclet.longname, url);

        // add a shortened version of the full path
        var docletPath;
        if (doclet.meta) {
            docletPath = getPathFromDoclet(doclet);
            docletPath = sourceFiles[docletPath].shortened;
            if (docletPath) {
                doclet.meta.shortpath = docletPath;
            }
        }
    });

    data().each(function(doclet) {
        var url = helper.longnameToUrl[doclet.longname];

        if (url.indexOf('#') > -1) {
            doclet.id = helper.longnameToUrl[doclet.longname].split(/#/).pop();
        }
        else {
            doclet.id = doclet.name;
        }

        if ( needsSignature(doclet) ) {
            addSignatureParams(doclet);
            addSignatureReturns(doclet);
            addAttribs(doclet);
        }
    });

    // do this after the urls have all been generated
    data().each(function(doclet) {
        doclet.ancestors = getAncestorLinks(doclet);

        if (doclet.kind === 'member') {
            addSignatureTypes(doclet);
            addAttribs(doclet);
        }

        if (doclet.kind === 'constant') {
            addSignatureTypes(doclet);
            addAttribs(doclet);
            doclet.kind = 'member';
        }
    });

    var members = helper.getMembers(data);
    members.tutorials = tutorials.children;

    // output pretty-printed source files by default
    var outputSourceFiles = conf.default && conf.default.outputSourceFiles !== false 
        ? true 
        : false;

    // add template helpers
    view.find = find;
    view.linkto = linkto;
    view.resolveAuthorLinks = resolveAuthorLinks;
    view.tutoriallink = tutoriallink;
    view.htmlsafe = htmlsafe;
    view.outputSourceFiles = outputSourceFiles;

    // once for all
    view.nav = buildNav(members);
    attachModuleSymbols( find({ longname: {left: 'module:'} }), members.modules );

    // generate the pretty-printed source files first so other pages can link to them
    if (outputSourceFiles) {
        generateSourceFiles(sourceFiles, opts.encoding);
    }

    if (members.globals.length) { 
        generate('', 'Global', [{kind: 'globalobj'}], globalUrl); 
    }

    // index page displays information from package.json and lists files
    var files = find({kind: 'file'});
    var packages = find({kind: 'package'});

    generate('', 'Home',
        packages.concat(
            [{kind: 'mainpage', readme: opts.readme, longname: (opts.mainpagetitle) ? opts.mainpagetitle : 'Main Page'}]
        ).concat(files),
    indexUrl);

    // set up the lists that we'll use to generate pages
    var classes = taffy(members.classes);
    var modules = taffy(members.modules);
    var namespaces = taffy(members.namespaces);
    var mixins = taffy(members.mixins);
    var externals = taffy(members.externals);
    var interfaces = taffy(members.interfaces);

    Object.keys(helper.longnameToUrl).forEach(function(longname) {
        var myModules = helper.find(modules, {longname: longname});
        if (myModules.length) {
            generate('Module', myModules[0].name, myModules, helper.longnameToUrl[longname]);
        }

        var myClasses = helper.find(classes, {longname: longname});
        if (myClasses.length) {
            generate('Class', myClasses[0].name, myClasses, helper.longnameToUrl[longname]);
        }

        var myNamespaces = helper.find(namespaces, {longname: longname});
        if (myNamespaces.length) {
            generate('Namespace', myNamespaces[0].name, myNamespaces, helper.longnameToUrl[longname]);
        }

        var myMixins = helper.find(mixins, {longname: longname});
        if (myMixins.length) {
            generate('Mixin', myMixins[0].name, myMixins, helper.longnameToUrl[longname]);
        }

        var myExternals = helper.find(externals, {longname: longname});
        if (myExternals.length) {
            generate('External', myExternals[0].name, myExternals, helper.longnameToUrl[longname]);
        }

        var myInterfaces = helper.find(interfaces, {longname: longname});
        if (myInterfaces.length) {
            generate('Interface', myInterfaces[0].name, myInterfaces, helper.longnameToUrl[longname]);
        }
    });

    /**
     * generate tutorial from given options
     * @type {Function} 
     * @name generateTutorial 
     * @memberof module:publish 
     * @param  {String} title - title of tutorial
     * @param  {Tutorial} tutorial - tutorial to generate
     * @param  {String} filename - filename for generated tutorial
     */
    function generateTutorial(title, tutorial, filename) {
        var tutorialData = {
            title: title,
            header: tutorial.title,
            content: tutorial.parse(),
            children: tutorial.children
        };

        var tutorialPath = path.join(outdir, filename);
        var html = view.render('tutorial.tmpl', tutorialData);

        // yes, you can use {@link} in tutorials too!
        html = helper.resolveLinks(html); // turn {@link foo} into <a href="foodoc.html">foo</a>
        fs.writeFileSync(tutorialPath, html, 'utf8');
    }

    /**
     * save tutorial children.
     * tutorials can have only one parent so there is no risk for loops
     * @type {Function} 
     * @name saveChildren 
     * @memberof module:publish 
     * @param  {HTMLelement} node HTML element to use as root
     */
    function saveChildren(node) {
        node.children.forEach(function(child) {
            generateTutorial('Tutorial: ' + child.title, child, helper.tutorialToUrl(child.name));
            saveChildren(child);
        });
    }
    
    saveChildren(tutorials);
};
