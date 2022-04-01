# dependency-tree

Returns an unordered array of local paths to dependencies of a node JavaScript file (everything it or any of its dependencies `require`s).

Reduced feature (faster) alternative to the [`dependency-tree` package](https://www.npmjs.com/package/dependency-tree) that only works with stock node JS. This is used by Eleventy to find dependencies of a JavaScript file to watch for changes to re-run Eleventy’s build.

## Big Huge Caveat

⚠ A big caveat to this plugin is that it will require the file in order to build a dependency tree. So if your module has side effects and you don’t want it to execute—do not use this!

## Installation

```
npm install --save-dev @11ty/dependency-tree
```

## Features

* Ignores `node_modules`
* Or, use `nodeModuleNamesOnly` to return a list of node_modules packages (added in v2.0.0)
* Ignores Node’s built-ins (e.g. `path`)
* Handles circular dependencies (Node does this too)

## Usage

```js
// my-file.js

// if my-local-dependency.js has dependencies, it will include those too
const test = require("./my-local-dependency.js");

// ignored, is a built-in
const path = require("path");
```

```js
const DependencyTree = require("@11ty/dependency-tree");

DependencyTree("./my-file.js");
// returns ["./my-local-dependency.js"]
```

### `allowNotFound`

```js
const DependencyTree = require("@11ty/dependency-tree");

DependencyTree("./this-does-not-exist.js"); // throws an error

DependencyTree("./this-does-not-exist.js", { allowNotFound: true });
// returns []
```

### `nodeModuleNamesOnly`

(Added in v2.0.0) Navigates all the local files and returns a list of unique package names (not file names) required.

```js
const DependencyTree = require("@11ty/dependency-tree");

DependencyTree("./this-does-not-exist.js", { nodeModuleNamesOnly: true });
// returns []
```