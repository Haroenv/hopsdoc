# Hopsdoc

jsdoc theme for [hops](https://github.com/xing/hops)

Forked from [this theme](https://github.com/nathancahill/minami)

## DEMO

Here's a a List of Projects that use this theme:

- [hopsdoc documentation](http://xing.github.io/hopsdoc/docs/hopsdoc/0.1.6/) (this project)
- [hops documentation](http://xing.github.io/hops) (originally made for this project)

<img src="https://raw.githubusercontent.com/xing/hopsdoc/master/demo.png" width="100%"/>

## Uses

- [the Taffy Database library](http://taffydb.com/) (to handle data)
- [Underscore Template library](http://documentcloud.github.com/underscore/#template) (as a base template language)
- [Sass](http://sass-lang.com) (to generate the theme's CSS)
- [Autoprefixer](https://github.com/postcss/autoprefixer) (to prefix styles)
- [postcss](https://github.com/postcss/postcss) (to run autoprefixer)
- [replace](https://github.com/harthur/replace) (rename delimiters)
- [jsdoc](https://github.com/jsdo3/jsdoc) (to generate its own documentation)

## Install

```bash
$ npm install --save-dev hopsdoc
```

## Usage

Clone repository to your designated `jsdoc` template directory, then:

```bash
$ jsdoc entry-file.js -t path/to/hopsdoc
```
## build this theme

This theme uses default underscore templates (`<%` instead of `<?js`)
and has a script to transform in both directions. This way your code editor can highlight the code correctly.

files in `tmpl` are not commited and should not be modified. The `tmpl` folder is generated and used as npm export.  
If you want to convert your "custom delimiter theme" to make it compatible to this project you can replace the `tmpl` folder and generate your development version. 

> Warning !!! generating a dev version from another template will remove the original theme entirely.
> As long as you don't modify the content inside the `tmpl` folder you don't have to worry about 
> accidently running the wrong command.

```bash
## generate custom delimiter version
npm run _to-custom
## generate default delimiter version
npm run _from-custom
## generate custom delimiter version and build styles
npm run build
```

## add custom styling

```bash
cp node_modules/hopsdoc ./path/to/my/custom/theme
cd ./path/to/my/custom/theme/hopsdoc
npm install 
npm run watch-styles
## or ...
## modify styles in `.static/styles/*.scss`
## then ...
npm run styles
```

### Node.js Dependency

In your projects `package.json` file add a generate script:

```json
"script": {
  "generate-docs": "jsdoc -c .jsdoc.json"
}
```

In your `.jsdoc.json` file, add a template option.

```json
"opts": {
  "template": "node_modules/hopsdoc"
}
```

### Example JSDoc Config

```json
{
    "tags": {
        "allowUnknownTags": true,
        "dictionaries": ["jsdoc"]
    },
    "source": {
        "include": ["src", "package.json", "README.md"],
        "includePattern": "\\.js$",
        "excludePattern": "(node_modules/|docs)"
    },
    "plugins": [
        "plugins/markdown"
    ],
    "templates": {
        "cleverLinks": false,
        "monospaceLinks": true
    },
    "opts": {
        "destination": "docs/",
        "encoding": "utf8",
        "private": true,
        "recurse": true,
        "template": "node_modules/hopsdoc"
    }
}
```

## License

Licensed under the Apache2 license.