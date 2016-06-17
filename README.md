# Hopsdoc

jsdoc theme for [hops](https://github.com/xing/hops)

Forked from [this amazing theme](https://github.com/nathancahill/minami)

## DEMO

I put some effort into a demo by documenting this (mostly not written by myself) code. FUN times.. fun times.

* [hopsdoc documentation](http://xing.github.io/hopsdoc)
* [hops documentation](http://xing.github.io/hops)

![demo.png](https://raw.githubusercontent.com/xing/hopsdoc/master/demo.png)

## Uses

- [the Taffy Database library](http://taffydb.com/)
- [Underscore Template library](http://documentcloud.github.com/underscore/#template)

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

I'm not a fan of jsdoc's custom delimiters. This theme uses default underscore templates (`<%` instead of `<?js`)
and has a script to transform to in both directions.

files in `tmpl` are not commited and should not be modified. This folder is generated and used as npm export.  
If you want to convert your "custom delimiter theme" to make it compatible to this project you can replace the `tmpl` folder and generate your development version

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
cd ./path/to/my/custom/theme
npm i 
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