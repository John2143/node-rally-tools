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
 - `rally` (to check if it works)
 - `rally config`

## Library usage

Most classes and functions are exposed through src/index.js. This means when
you want to create a node plugin that uses this library, you should just use
    `import {Preset, Rule, rallyFunctions, ...etc} from "rally-tools"`.

## Development

 - Clone this repo
 - Run `npm install`
 - Run `npm link` to symlink the `rally` executable
 - Start `rollup -cw` in the background to automatically compile code
 - Test your changes
 - Commit your changes and run `npm version <minor|patch>` to increment the
   version

## Config

 - chalk: allow colored output.
 - restrictUAT: Only allow GET requests from UAT, not POST/PUT/etc.
 - api: Your api keys and urls

## Usage

Use `rally help` or `rally help [command]` to see all public commands and basic
documentation

Heres some examples of common usage:

*Upload a single preset*
`rally preset upload -e DEV -f "~/ORP/silo-presets/Audio Metadata Conditioner.py"`

*fuzzy find a rule*
`rally rule list -e DEV | grep "OR00"`
