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

Pass the `--config` option to read/write a different config file location. If
including as a module, then you need to call

```
const rally = require("rally-tools");

rally.loadConfig(filename);
// OR
rally.setConfig({... config object here ...})
```

Options:

 - chalk: allow colored output.
 - restrictUAT: Only allow GET requests from UAT, not POST/PUT/etc.
 - api: Your api keys and urls
 - repodir: The directory of your repository. Should have 3 folders:
   `silo-presets`, `silo-rules`, `silo-metadata`.
 - defaultEnv: Your development enviornment, usually DEV.

## Usage

Use `rally help` or `rally help [command]` to see all public commands and basic
documentation.

#### `rally preset`

This command deals with preset actions such as creating, uploading, and
downloading.

The basic usage is `rally preset list`, which lists all presets.

`rally preset upload -e [env] -f [preset]` can be used to upload a file to a
remote env. You can specify multiple -f arguments to upload multiple files.  If
the - argument is given (`rally preset upload -`) then the files are read from
stdin.  For example: `git diff HEAD..UAT --name-only | grep silo-presets |
rally preset upload -` will upload all changed files using git as the reference.

`rally preset diff -f [preset]` can be used to view the differences between a
local file and a remote one. `--command` can be used to run a command other
than diff. For example, `rally preset diff -f abc.xyz --command vimdiff -e PROD`
would compare the local file abc.xyz to the remote version on prod using
vimdiff. (make sure that zbc.xyz has a proper rally header or this will fail).

#### `rally rule`

See all rules. `rally rule list`. `--raw` available.

#### `rally provider`

See all providers. `rally provider list`. `--raw` available.

#### `rally supply`

This is probably the most complex command mechanically.

`rally supply calc [starting rule]` will create a supply chain object in memory.
Then, using other flags you can do something with this chain.

 - `--to [env]` will copy the supply chain onto the env, creating new rules and
    presets as needed.
 - (other commands in development)

#### `rally conifg`

This command manages the "~/.rallyconfig" file, so that you dont need to edit
it manually. `rally config` simply creates a new config walking through all the
options.

`rally config [key]` gives the config interactor for a single key. `rally
config chalk` would bring up y/n menu for color. `rally config api` would bring
up the configuration for all all the enviornments, but `rally config api.DEV`
would let you modify just the DEV credentials.

`rally config --raw` prints out the current config *including configs changed
by command line options*

#### Examples
Heres some examples of common usage:

Upload a preset
`rally preset upload -e DEV -f "~/ORP/silo-presets/Audio Metadata Conditioner.py"`

Fuzzy find a rule
`rally rule list -e DEV | grep "OR00"`

Create a new supply chain file
`rally supply calc ORHIVE`

## Troubleshooting

#### Cannot acclimatize shelled preset

Solution: Create the preset on the remote enviornment manually, or run `rally
preset create` (Not implemented yet)

Under normal usage, presets will have an associated metadata file saved. This
contains information like its provider type, input and output settings, or
timestamps. `Preset#acclimatize` attempts to take this data from a generic
format into an environment specific format so that it can be accuractly created
when uploading. A file without any metadata is marked as "Shelled" and given
some dummy data while limiting functionality. This functionality includes
updating the code of a preset, or viewing the metadata of an enviornment.

#### CLI Aborted: Protected enviorment

Solution: Add the --no-protect flag, or run `rally config restrictUAT` to
unprotect UAT (if the error is on UAT).

Protected enviorments cannot recieve anything but get requests, so any kind of
POST/PUT/PATCH will fail with this error. Internally, --no-protect is sets the
--protect flag to false instead of true, which in turn sets the
configObject.dangerModify flag to true. So if you really wish, you could add
`"dangerModify": true,` to your config to allow unrestricted UAT/PROD posts,
then use the --protect flag when you want safe calls.

#### API Error

Sometimes, the rally API simply wont work. Verify that all endpoints are active
by running `rally`. Under normal circumstances, they should return a 2xx
response.

If that is ok, read the data that is returned by the API to see if it is a
fixable error: ex. `401 Unauthorized` probably means that you have a bad API
key, so run `rally config api` or `rally config api.UAT`.

#### My problem isn't in the list

Ask me on SDVI or discocomm slack @John Schmidt
