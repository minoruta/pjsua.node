# pjsua.node - A pjsua for nodejs [![Build Status](https://travis-ci.org/minoruta/pjsua.node.svg?branch=master)](https://travis-ci.org/minoruta/pjsua.node)

The pjsua.node is a TypeScript library which provides Pjsua2 on nodejs.

## Layers of the library

| Layers of nodejs module | Description
|-----------------|-------------
| Your Apps | |
| **this module** | **A simple pjsua2 for nodejs**
| [sipster.ts](https://github.com/minoruta/sipster.ts) | TypeScript wrapper for the sipster
| [mscdec/sipster](https://github.com/mscdex/sipster) | Javascript wrapper for the pjsip
| [pjsip](http://www.pjsip.org) | Pjsip native library

## [Documents](https://minoruta.github.io/pjsua.node)

## Requirements
- Pjsip native library (>= 2.4.5) which must be installed beforehand,
- Build essentials, pkg-config, python and node-gyp to build mscdec/sipster.

## Install
- `npm install --save minoruta/pjsua.node`

## Test
- Prepare an asterisk server with the [test configurations](./test/volume) for example.
- `npm test`

## Debug
- `DEBUG=PJSUA:* npm test`

## Build
- `npm run build`

## Make docs
- `npm run docs`

## References
- [mscdec/sipster](https://github.com/mscdex/sipster) - Javascript wrapper for the pjsip
- [pjsip](http://www.pjsip.org) - Pjsip native library

## [License & Copyright](./LICENSE)
