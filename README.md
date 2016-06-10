# Hopsdoc

jsdoc theme for [hops](https://github.com/xing/hops)

Forked from [this amazng theme](https://github.com/nathancahill/minami)

## Uses

- [the Taffy Database library](http://taffydb.com/)
- [Underscore Template library](http://documentcloud.github.com/underscore/#template)
- [Montserrat](http://www.google.com/fonts/specimen/Monsterrat) & Helvetica Neue

## Install

```bash
$ npm install --save-dev https://github.com/xing/hopsdoc.git
```

## Usage

Clone repository to your designated `jsdoc` template directory, then:

```bash
$ jsdoc entry-file.js -t path/to/hopsdoc
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