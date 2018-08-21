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

The basic usage is `rally preset list`, which lists all presets. Giving the
`--resolve` flag will internall resolve the dynamic references in an object.
You can then add these to the output using `--attach`.

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
 - `--check [env]` will do a diff on each file in the chain to the remote given

`rally supply make -f [files]`

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

#### Deployments

Deployments using this tool are based around supply chains. At their core,
supply chains are simply a group of rally objects, where an object is either a
rule, preset, or notification.

Although you can only deploy supply chains, there are many ways to construct
the deployment you want.

The first, and easiest way you'll probably encounter is through `rally supply
calc [starting rule] [ending rule]`. This does the heavy lifting of parsing
rules, finding notifications, linking the presets, creating metadata, etc.

Using the E2 Supply chain as an example...

```
$ rally supply calc R1000 -e DEV
...
Calculating Supply chain...  R-DEV-617: NL R1000 - MP - Non Linear Media Preparation Workflow
Done!
Required notifications: 
N-21: SNS All - test
Required rules: 8
 R-DEV-617: NL R1000 - MP - Non Linear Media Preparation Workflow
 R-DEV-618: NL R2001 - MP - Make EST Media Articrafts by Split
 R-DEV-621: NL R3012 - MP - Make EST Media File using Media Convert
 R-DEV-622: NL R4001 - MP - Make EST Closed Caption File
 R-DEV-627: NL R3013 - MP - QC EST Media File Launcher
 R-DEV-623: NL R5001 - MP - Make EST Media ArtiCrafts by Join
 R-DEV-628: NL R3014 - MP - QC EST Media File using SimpleSDVIQC
 R-DEV-623: NL R5001 - MP - Make EST Media ArtiCrafts by Join
Required presets: 10
 P-DEV-285: NL P1000 - MP - Non Linear Media Preparation Workflow
  P-DEV-18: Fail
 P-DEV-283: NL - EST - Util Library
 P-DEV-284: NL - MP - Util  Library
 P-DEV-286: NL P2001 - MP - Make EST Media Articrafts by Split
 P-DEV-289: NL P3012 - MP - Make EST Media File using MediaConvert
 P-DEV-290: NL P4001 - MP - Make EST Closed Caption File
 P-DEV-306: NL P3013 - MP - QC EST Media File Launcher
 P-DEV-291: NL P5001 - MP - Make EST Media ArtiCrafts by Join
 P-DEV-307: NL P3014 - MP - QC EST Media File using SimpleSDVIQC
```

This internally creates a supply chain object, which we can then apply an action to.

An example action is `sync`, which is given by the `--to` arg. `rally supply
calc R1000 -e DEV --to LOCAL` would sync this supply chain (based on DEV) to
LOCAL. In order to move it to a protected envornment, add --no-protect.

However, calc is limited by the fact that it is very rigid. Its best use is the
inital setup of an environment, or to mass move supply chains. To fix this,
lets move to `rally supply make`

`make` takes a list of identifiers and constructs a supply chain. Identifiers
are passed in by the `this.files` array. From the command line this can be
given by suppling -f arguments or reading from stdin.

Lets say you edited these 3 objects in DEV.

```
$ cat > changes.txt
 P-DEV-283: NL - EST - Util Library
 P-DEV-285: NL P1000 - MP - Non Linear Media Preparation Workflow
 R-DEV-617: NL R1000 - MP - Non Linear Media Preparation Workflow

$ cat changes.txt | rally supply make -
Reading from stdin
Required notifications: 
Required rules: 1
 R-DEV-617: NL R1000 - MP - Non Linear Media Preparation Workflow
Required presets: 2
 P-DEV-283: NL - EST - Util Library
 P-DEV-285: NL P1000 - MP - Non Linear Media Preparation Workflow
```

Now you can treat this like any other supply chain, and deploy it. Remote to
remote, or remote to local. However, this tool is built to integrate directly
with git on your local filesystem.

If you edited those 3 files locally, then commited to git, you should be able
to see the diff with the git command `git diff HEAD HEAD^`. We are only
interested in the names, so lets get those.

```
$ git diff HEAD HEAD^ --name-only
silo-presets/NL - EST - Util Library
silo-presets/NL P1000 - MP - Non Linear Media Preparation Workflow
silo-rules/NL R1000 - MP - Non Linear Media Preparation Workflow

$ #Passing those to make will produce a supply chain based on LOCAL
$ git diff HEAD HEAD^ --name-only | rally supply make -
Reading from stdin
Required notifications: 
Required rules: 1
 R-LOCAL: NL R1000 - MP - Non Linear Media Preparation Workflow
Required presets: 2
 P-LOCAL: NL - EST - Util Library
 P-LOCAL: NL P1000 - MP - Non Linear Media Preparation Workflow
```

To give a generic approach, in order to deploy all the changes between 2
commits, run `git diff featureCommit baseCommit --name-only | rally supply make
- --to DEV`. `rally` is currently stateless: It does not remember what is
  deployed, who deployed it or when. All this should be tracked through git.
 Therefore, I would suggest tagging releases or using a release branch.

#### Examples
Heres some other examples of common usage:

Upload a preset
`rally preset upload -e DEV -f "~/ORP/silo-presets/Audio Metadata Conditioner.py"`

Look at all ffmpeg jobs
`rally rule list -e DEV --resolve --attach | grep ffmpeg`

Clone some ffmpeg jobs you want to edit (`vipe` optional)
`rally rule list -e DEV --resolve --attach | grep ffmpeg | vipe | rally supply make - --to LOCAL`

Create a new supply chain and print it
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
