# PouchDB Design Document Helpers

[![npm](https://img.shields.io/npm/v/pouchdb-design.svg)](https://www.npmjs.com/package/pouchdb-design) [![Build Status](https://travis-ci.org/tyler-johnson/pouchdb-design.svg?branch=master)](https://travis-ci.org/tyler-johnson/pouchdb-design)

A PouchDB plugin for easier handling of CouchDB design documents.

## Install

Install via NPM:

```sh
npm i pouchdb-design -S
```

And use like any normal PouchDB plugin:

```js
const pouchdesign = require("pouchdb-design");
PouchDB.plugin(pouchdesign);
```

## Usage

This plugin revolves around a class for managing a single design document. Instances of the class have several methods for fetching and saving, modifying design document properties, and adding custom functions and commonjs modules.

The typical flow is to fetch the existing design document, make some changes, and then save it back to database.

```js
const design = db.design("mydesign");

design.fetch().then(() => {
  design.view("allDocs", function(doc) {
    emit(doc._id, { rev: doc._rev });
  });

  return design.save();
}).catch(e => {
  console.error(e);
});
```

## API

#### db.design()

```
db.design( [ docOrId ] ) → Design
```

This plugin attaches the method `.design()` to PouchDB instances. When called, it will return a Design object. It takes a single argument, which is an existing design document or a string id. If the id does not start with `_design/`, it is added automatically.

```js
const design = db.design("mydesigndoc");
```

```js
const design = db.design("_design/mydesigndoc");
```

```js
const design = db.design({ _id: "_design/mydesigndoc" });
```

#### design.fetch()

```
design.fetch() → Promise<this>
```

This method will retrieve the existing design document from the database. Once complete, the existing design document is set internally for use by other synchronous methods.

If the design document does not exist, this method will continue successfully and set a blank, new document internally.

#### design.save()

```
design.save() → Promise<this>
```

This will save the internal design document back to the database. This works like an upsert, where it will be created if it doesn't exist, or overwrites the existing.

#### design.toJSON()

```
design.toJSON() → object
```

Returns the CouchDB design document that the instances represents

#### design.clone()

```
design.clone() → designCopy
```

Returns an exact duplicate of this design object.

#### `design.id`

Gets and sets the design's id. When setting, you can leave off the `_design/` and it will be automatically added.

```js
design.id = "mydesign";
console.log(design.id); // _design/mydesign
```

#### design.get()

```
design.get( key ) → mixed
```

Returns the exact value at `key` in the design document. This supports dot separated keys for deep values.

#### design.set()

```
design.set( key, value ) → this
```

Sets `value` to `key` in the design document. Like `.get()`, `key` supports dot separated syntax for deep values. The `value` is normalized to be compatible with JSON and CouchDB. Functions, for example, are converted into strings.

#### design.unset()

```
design.unset( key ) → this
```

Removes the value at `key` in the design document. Like `.get()`, `key` supports dot separated syntax for removing deep values.

#### design.view()

```
design.view( name, map [, reduce ] ) → this
design.view( name, mapReduceObj ) → this
design.view( viewObj ) → this
```

Adds a map and reduce view to the design document under `name`. Several syntaxes are accepted, depending on if you have a reduce method to set in addition to the map.

#### design.list()

```
design.list( name, fn ) → this
design.list( listObj ) → this
```

Adds a list method to the design document under `name`. Several list methods can be set using an object.

#### design.show()

```
design.show( name, fn ) → this
design.show( showObj ) → this
```

Adds a show method to the design document under `name`. Several show methods can be set using an object.

#### design.update()

```
design.update( name, fn ) → this
design.update( updateObj ) → this
```

Adds a update method to the design document under `name`. Several update methods can be set using an object.

#### design.filter()

```
design.filter( name, fn ) → this
design.filter( filterObj ) → this
```

Adds a filter method to the design document under `name`. Several filter methods can be set using an object.

#### design.validate()

```
design.validate( fn ) → this
```

Adds a `validate_doc_update` method to the design document.

#### design.lib()

```
design.lib( key, value ) → this
```

Adds a commonjs module to the design document. This will prefix the value with `module.exports = ` so that it can be required by other methods in the design document. The `key` uses `.set()` under the hood so it can be dot-separated for deep values.
