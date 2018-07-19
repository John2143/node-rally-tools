# Rally Tools

This repository provides multiple helpful tools for working within the SDVI
Rally enviornment. Some features are:

 - Preset uploader
 - Rule uploader
 - Automated deployer
 - Remote diff checker
 - Code sync checker

## Installation

 - `npm install -g rally-tools`
 - `rally`
 - `rally config`

## Library usage

 - Most classes and functions are exposed through src/index.js. This means when
   you want to create a node plugin that uses this library, you should just use
   `import {Preset, Rule, rallyFunctions, ...etc} from "rally-tools"`.

## Development

 - Clone this repo
 - Run `npm install`
 - Run `npm link` to symlink the `rally` executable
 - Start `rollup -cw` in the background to automatically compile code
