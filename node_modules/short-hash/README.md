# short-hash

[![NPM version][npm-image]][npm-url] [![js-xo-style][codestyle-image]][codestyle-url]

> Get a short hash from a string. Uses Bernstein's popular "times 33" hash algorithm but returns a hex string instead of a number

This is just a convenient wrapper around [`hash-string`](https://www.npmjs.com/package/hash-string).

## Installation

Install `short-hash` using [npm](https://www.npmjs.com/):

```bash
npm install --save short-hash
```

## Usage

### Module usage

```javascript
var shortHash = require('short-hash');

shortHash('a string to hash...');
```

## API

### `shortHash(str)`

| Name | Type | Description |
|------|------|-------------|
| str | `String` | The string to hash |

Returns: `String`, a hexadecimal string.

## License

MIT

[npm-url]: https://npmjs.org/package/short-hash
[npm-image]: https://badge.fury.io/js/short-hash.svg
[codestyle-url]: https://github.com/sindresorhus/xo
[codestyle-image]: https://img.shields.io/badge/code%20style-xo-brightgreen.svg?style=flat
