# Rally Tools

This documentation is currently WIP.
Some sentences may randomly end and sections may be poorly organized.

This repository provides multiple helpful tools for working within the SDVI
Rally environment. Some features are:

 - Preset uploader
 - Rule uploader
 - Automated deployer
 - Remote diff checker
 - Code sync checker

# Installation

 - `npm install -g rally-tools`
 - `rally` (to check if it works)
 - `rally config`

# Library usage

Most classes and functions are exposed through src/index.js. This means when
you want to create a node plugin that uses this library, you should just use
    `import {Preset, Rule, rallyFunctions, ...etc} from "rally-tools"`.

# Development

 - Clone this repo
 - Run `npm install`
 - Run `npm link` to symlink the `rally` executable
 - Start `npx rollup -cw` or `npm run watch` in the background to automatically compile code
 - Test your changes
 - Commit your changes and run `npm version <minor|patch>` to increment the
   version

# Config

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
 - defaultEnv: Your development environment, usually DEV.

# Usage

To get started, run `rally` in any command prompt or terminal. If your config
is setup, you will see environment data for each of your setup api keys. It
will look like this:

```
Rally Tools vx.y.z CLI
   LOCAL: OK
   UAT: 200 OK
   DEV: Unconfigured
   PROD: 200 OK
   QA: 401 (Unauthorized)
```

Use `rally help` or `rally help [command]` to see all public commands and basic
documentation.

## `rally stage`

This command integrates with git to control and monitor deployed features.

The `stage` for an environment contains two main parts:
 - the list of currently deployed branches and their associated commits
 - the list of `claim`-ed presets

To begin using `rally stage`, you need to know the name of your "stage preset".
This is the preset where all the current deployment data is stored. Each team
working independently in rally should have their own stage preset. For example,
the stage preset for the onramp team is called `onramp`. Additionally, each
environment has its own stage preset, but stage presets should be named the
same in each environment for consistency. **To choose your target environment
for any command, use the `-e` parameter, as in `-e [env name]`**. Any command
without `-e` will use your default environment. (To change default environment,
run `rally config defaultEnv`).

### Prerequisites

Viewing the stage (`rally stage info`) only requires a working install of
rally-tools and a valid access token. Using other stage commands (`edit`,
`claim`, `pull`) requires a few prerequisites:

 - [`git`](https://git-scm.com/downloads) installed and in your `$PATH`
 - A up-to-date rally-tools style git repo folder
 - A clean working tree (use `git stash` if you don't want to commit)
 - A current branch of `staging`

The easiest way to check all these is to run `git status`. It should return
the following text if your repo is ready:
```
$ git status
On branch staging
Your branch is up to date with 'origin/staging'.

nothing to commit, working tree clean
```

Before each run of `rally stage edit`, it is recommended that you run `git
fetch` or `git pull`. This will prevent you from missing commits or branches
that would otherwise be available. **If your local repo is out of date `rally
stage edit` will likely throw an error for "missing commits"**

### Basic Usage

To select your stage, run `rally stage init [stage name]`. This will bring up a
short prompt asking for your name. This name is used for the `rally stage claim`
command. Select yes to write the config to disk. The `id` of the stage preset
and your name are saved in your rally config file (default `~/.rallyconfig`).
To check that this was successful, run `rally stage info`. You should not see
an error.

`rally stage info` will list the stage status. The first section is the list of
currently deployed branches and their commit hashes. The second section
contains a list of presets `claim`-ed by developers. The commit hashes can be
used in conjunction with `git blame` to find the branch associated with
specific commits.

---

`rally stage edit` will allow you to edit the current stage. Running it with no
arguments will produce a prompt with 4 options:
 - Add a branch
 - Remove a branch
 - Finalize stage
 - Quit

To navigate the menu, use arrow keys or typing to select your choice. Once
selected, press enter to choose. Adding a branch will list *all* available
**remote** branches. You cannot select local-only branches when adding. Use
arrow keys or type to select, and enter to confirm your choice. Once you are
done adding or removing branches from the stage, choose "Finalize." This will
move you to the next step.

The finalize step will show the list of proposed changes as a diff. If
everything looks good, press enter to continue to the deploy step.

Next, `rally` will use git to form a local version of your stage. This is where
most errors will occur. Merge conflicts, missing commits, an out of date repo,
or a claimed preset will all cancel your pending stage without applying any
changes. If nothing goes wrong, you will see the output of a `rally supply`
deploy set. This will list all the rules that will be uploaded as part of the
stage. If this is OK, then hit enter. **Note: This is the last prompt before
`rally` begins deploying**. Assuming there are no errors with the deployment,
the uploaded code should be available for testing immediately. Don't be afraid
afraid editing the stage: everything is reversible!

---

`rally stage claim` will allow you to claim or un-claim presets. Claiming a
preset marks it as untouchable by `rally stage`. Any stage deployments
attempting to use a claimed preset will fail. The intended use is for
developers actively working on presets, or for hotfixes in the UI. Note that
this is currently 1-directional: **You can claim a preset that is already in the
stage, but doing so will stop *anyone* from using `rally stage edit`**.

The menu is similar to `rally stage edit`: use arrow keys/typing to select your
option, and use enter to choose. `Apply` will upload your stage and apply your
changes.

---

`rally stage pull` will load the current staged branches and apply them to a
local branch. This lets you closely inspect the stage using your local editor
or git commands.

### `rally stage` Examples

Selecting the `onramp` stage file on the `QA` environment:  
```
$ rally stage init onramp -e QA
Found stage target to init: P-QA-6354: onramp
? What is your name John
? Write config to disk? Yes
Created file /Users/jschmidt/.rallyconfig.
```

Stage edit example:
```
$ rally stage edit
Finished retreiving branches.
Stage loaded: onramp
? What do you want to do? Add a branch to the stage
? What branch do you want to add? changeA
? What do you want to do? Finalize stage
proposed changes
   changeB
   +changeA
? Prepare these branches for deployment? Yes
Required presets: 1
   P-LOCAL: Super Cool Preset
? Deploy now? Yes
Uploading preset Super Cool Preset to UAT: query type, (SdviEvaluate) ok, gmetadata 200, generate header, header ok, icode up 204, No tests. Done.
```

Stage edit via command line:
```
$ rally stage edit -a changeA -r changeB -r changeC
Finished retreiving branches.
Stage loaded: onramp
proposed changes
   changeD
  +changeA
  -changeB
  -changeC
...
```

### `rally stage` Advanced Usage and Tips

While many of the commands for rally stage use interactive menus, they all have
an option to be programmatically skipped with command line options.

 - `-y` will automatically skip all prompts asking for a yes or no answer.

 - `rally stage edit` accepts `-a` or `--add` to add a branch, and `-r` or
   `--remove` to remove a branch. Multiple branches can be supplied by using
   the argument multiple times.

 - `rally preset claim` currently does not support options to supply preset
   names, but that is coming soon.

If using this in a more complex script, `--raw` can be passed to some stage
commands return json instead of printing text. For example:

```
$ rally stage info --raw
{
    "stage": [
        {
            "branch": "changeA",
            "commit": "9db12be45188ffb33954de3eccda10f0fe0aa00b"
        },
        {
            "branch": "changeB",
            "commit": "2028e92c5e397616380542aa6cc0505d85fb7074"
        }
    ],
    "claimedPresets": [
        {
            "name": "Airmaster_Finalize",
            "owner": "John"
        }
    ]
}
```

Combine that output with something like `jq` to easily manipulate it:

```
$ # List all the currently deployed branches
$ rally stage info --raw | jq -r .stage[].branch
changeA
changeB
```

### Troubleshooting

Sometimes, the stage may become broken. Updating the base branch or pushing
conflicting changes without deploying can cause rally tools to be unable to
combine all the branches correctly. Without that core function, no branches
can be added or removed.

If the problem branch/commit is known, it can be removed with  `rally stage
forceRemove [branch]`. Multiple branches can be removed at once with `rally
stage forceRemove A B C D`.

If that doesn't work, then the stage can be manually edited. Each environment
and stage has a file representing the current state of the environment in json.
For example, to fix the `onramp` stage on `UAT`, look for the preset
`onramp.json`. This file is loaded from the environment at the start of every
`stage` command, so editing this file is the ultimate failsafe.

It's important to note that editing the stage file will *NOT* automatically
deploy anything. It is up to the user to manually deploy the changes using a
combination of `rally stage pull` and `git diff [...] | rally @`. In theory,
`rally stage pull; git ls-files | rally @ --to [ENV]` should always be able to
restore `[ENV]` back to a known state, but it should always be used with
caution.


## `rally preset`

This command deals with preset actions such as creating, uploading, and
downloading.

`rally preset create` can be used to create a preset. When run without
arguments, a command line UI will be given. If you wish to script this, the flags
`--provider`, `--ext`, and `--name` can be given. 

The basic download usage is `rally preset list`, which lists all presets.
Giving the `--resolve` flag will internal resolve the dynamic references in an
object.  You can then add these to the output using `--attach`. Ex. `rally
preset list -e PROD --resolve --attach`

`rally preset upload -e [env] -f [preset]` can be used to upload a file to a
remote env. You can specify multiple -f arguments to upload multiple files.  If
the - argument is given (`rally preset upload -`) then the files are read from
stdin.  For example: `git diff HEAD..UAT --name-only | grep silo-presets |
rally preset upload -` will upload all changed files using git as the reference.

`rally preset diff -f [preset]` can be used to view the differences between a
local file and a remote one. `--command` can be used to run a command other
than diff. For example, `rally preset diff -f abc.xyz --command vimdiff -e PROD`
would compare the local file abc.xyz to the remote version on prod using
vimdiff. (make sure that zbc.xyz has a proper rally header/metadata or this
will fail).

`rally preset grab -f [preset]` will attempt to download the metadata file for
this asset. The `--full` argument can be given to also download the `code`, too.

`rally preset deleteRemote -e [env] -f [rule]` can be used to delete a preset in a
remote env. You can specify one -f argument at a time.

## `rally rule`

This command is similar to `rally preset`, but for `Supply Chain Rules`.

`rally rule create` can be used in the same fashion as `rally preset create`.
To access the interactive rule creator, just run `rally rule create` with no
arguments.

`rally rule upload -e [env] -f [rule]` can be used to upload a file to a
remote env. You can specify multiple -f arguments to upload multiple files.  If
the - argument is given (`rally rule upload -`) then the files are read from
stdin.  For example: `git diff HEAD..UAT --name-only | grep silo-rules |
rally rule upload -` will upload all changed files using git as the reference.

`rally rule deleteRemote -e [env] -f [rule]` can be used to delete a rule in a
remote env. You can specify one -f argument at a time.

To see all rules, use `rally rule list`. `--raw` available.

## `rally provider`

See all providers. `rally provider list`. `--raw` available.

## `rally asset`

This command allows you to create and launch workflows on assets.

See `rally help asset` for a quick reference help menu.

The first part of the command will be getting an asset context. You can either:
 - Use an asset id (ex. discovery.sdvi.com/content/[id]).
   - add the `--id [id]` argument
   - ex. `rally asset -e PROD --id 12345 launch ...`
 - Use an asset name
   - add the `--name [asset name]` argument
   - ex. `rally asset -e UAT --name 1232345_004_TCCS_123456_2 launch ...`
 - Create a new asset
   - add the argument "create"
   - supply a name using --name
   - `#` will be replaces with a random number.
   - ex. `rally asset create --name "TEST_FILE_#" -e UAT launch ...`
 - Use an anonymous context. (not supported by all commands)
   - add the `--anon` argument
   - ex. `rally asset --anon -e PROD launch ...`

Once you have your target asset, you can run any of the following commands:

## `launch`, `launchEvaluate`:

Launch a rule or evaluate on an asset. Works in anon contexts. Requires flag
`--job-name`.  Optional flag `--init-data` can supply data to the step in json
format. It can load the json from a file, or receive it as a string, or read
from stdin.

`--priority` is planned as a flag, but rally currently does not support dynamic
priority on started jobs.

Launching as an evaluate means that no next steps will be ran.

ie.
- from file: `--init-data @filename.json`
- from text: `--init-data '{"some": "json", "here": "yep"}`
- from stdin: `--init-data -`

Example:
`rally asset ... launch --job-name "00 john sandbox" --init-data '{"transcode": "XDCAM"}'
`rally asset ... launchEvaluate --job-name "00 john sandbox" --init-data '{"transcode": "XDCAM"}'

## `rally supply`

This is probably the most complex command mechanically.

`rally supply calc [starting rule]` will create a supply chain object in memory.
Then, using other flags you can do something with this chain.

 - `--to [env]` will copy the supply chain onto the env, creating new rules and
    presets as needed.
 - `--check [env]` will do a diff on each file in the chain to the remote given

`rally supply make -f [files]`

## `rally conifg`

This command manages the "~/.rallyconfig" file, so that you don't need to edit
it manually. `rally config` simply creates a new config walking through all the
options.

`rally config [key]` gives the config interactor for a single key. `rally
config chalk` would bring up y/n menu for color. `rally config api` would bring
up the configuration for all all the environments, but `rally config api.DEV`
would let you modify just the DEV credentials.

`rally config --raw` prints out the current config *including configs changed
by command line options*

## `metadata`:

This command prints metadata.

This will have two top level keys:

- `Workflow` contains the workflow metadata
- `Metadata` contains the supply chain metadata
- `AnalyzeInfo` contains a random analyze artifact. Usually, this will be the
  main file, but it is highly recommend to no rely on this data being accurate.

The default print will use the internal node debug print. For full json, add
the `--raw` argument.

# Deployments

Deployments using this tool are based around supply chains. At their core,
supply chains are simply a group of rally objects, where an object is either a
rule, preset, or notification.

Although you can only deploy supply chains, there are many ways to construct
the deployment you want. The first, recommended way is using `rally supply make`.

`make` takes a list of identifiers and constructs a supply chain. Identifiers come
in two forms:

- Remote types
  - These point to a unique preset or rule on some remote environment.
  - `R-UAT-283` would mean rule id 283 on uat.
  - ex: `P-UAT-283: Something python`, `R-DEV-617: Some rule`
- Local types
  - These point to a local file, relative to your repodir or absolute to your system
  - `./some/file/path`
  - `/user/someone/rally_repodir/some/file/path`
  - Displayed as `P-LOCAL: Something`

You can take take list of local or remote identifiers to create a supply chain
using `rally supply make`. Each file can be given by `-f`, or by using `-` to
specify stdin. A shorthand for `rally supply make -` is `rally @`. This is the
most used development command.

Lets say you edited these 3 objects in DEV.

```
$ cat > changes.txt
 P-DEV-283: NL - EST - Util Library
 P-DEV-285: NL P1000 - MP - Non Linear Media Preparation Workflow
 R-DEV-617: NL R1000 - MP - Non Linear Media Preparation Workflow

$ cat changes.txt | rally @
Reading from stdin
Required notifications: 
Required rules: 1
 R-DEV-617: NL R1000 - MP - Non Linear Media Preparation Workflow
Required presets: 2
 P-DEV-283: NL - EST - Util Library
 P-DEV-285: NL P1000 - MP - Non Linear Media Preparation Workflow
```

Rally tools by default will print out the current loaded supply chain object
when using make. To do something else, you supply any number of post actions

There are 3 available post actions:

- `--to`
  - This is the bread and butter deployment action. `--to DEV` would deploy the
    current supply chain onto DEV, adding or creating


Now you can treat this like any other supply chain, and deploy it. Remote to
remote, or remote to local. However, this tool is built to integrate directly
with git on your local filesystem.

If you edited those 3 files locally, then commited to git, you should be able
to see the diff with the git command `git diff HEAD HEAD^`. We are only
interested in the names, so lets get those.

Quick note: The shorthand for `rally supply make -` is `rally @`.

```
$ git diff HEAD HEAD^ --name-only
silo-presets/NL - EST - Util Library
silo-presets/NL P1000 - MP - Non Linear Media Preparation Workflow
silo-rules/NL R1000 - MP - Non Linear Media Preparation Workflow

$ #Passing those to make will produce a supply chain based on LOCAL
$ git diff HEAD HEAD^ --name-only | rally @
Reading from stdin
Required notifications: 
Required rules: 1
 R-LOCAL: NL R1000 - MP - Non Linear Media Preparation Workflow
Required presets: 2
 P-LOCAL: NL - EST - Util Library
 P-LOCAL: NL P1000 - MP - Non Linear Media Preparation Workflow
```

There is another way to do deployments that has been deprecated:

calc automatically generated links between rules and preset at a time where our
git repos did not have all available presets. This is left here as a guide for
older scripts, but may not work correctly on new versions:

`rally supply calc [starting rule] [ending rule]` does the heavy lifting
of parsing rules, finding notifications, linking the presets, creating
metadata, etc.

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


To give a generic approach, in order to deploy all the changes between 2
commits, run `git diff featureCommit baseCommit --name-only | rally @
--to DEV`. `rally` is currently stateless: It does not remember what is
deployed, who deployed it or when. All this should be tracked through git.
Therefore, tagging releases or using a release branch would allow for basic
version control.

## Automated deployments

Automated deployments should be constructed telling rally tools the list of
changed presets and rules. Silo constants, notification presets, and silo
metadata should be changed manually before an automatic deploy, as these can not
be stored in source control.

For example, if the previous deployment to prod was the tagged commit `v1.2.3`,
and the new deployment will be version `v2.0.0`, then the deployment script will
be `git diff v2.0.0 v1.2.3 --name-only | rally @ --to PROD --no-protect`

This will need to be run on a computer with a .rallyconfig in the home
directory, otherwise the config should be given by the --config flag to the
rally command.

# Examples
Heres some other examples of common usage:

Upload a preset
`rally preset upload -e DEV -f "~/ORP/silo-presets/Audio Metadata Conditioner.py"`

Look at all ffmpeg jobs
`rally rule list -e DEV --resolve --attach | grep ffmpeg`

Clone some ffmpeg jobs you want to edit (`vipe` optional)
`rally rule list -e DEV --resolve --attach | grep ffmpeg | vipe | rally supply make - --to LOCAL`

Create a new supply chain and print it
`rally supply calc ORHIVE`

# Header Parsing

There are two types of headers in standard rally usage. The first is the rally
docstring. It looks like this:

```
'''
name: (Name of the preset as it exists on the silo)
autotest: (Name of movie for testing purposes)
autotest: (Name of movie, supports and arbitrary nubmer)
autotest: (Name of movie, ....)
autotest: id: (id of movie to test)
'''
```

This docstring contains into about what the name of the preset on the
enviornment should be and what tests should be run on upload. The docstring is
parsed by rally tools on upload. It does not need to be at the top of the file,
and can use either single-quotes `'`, double-qoutes `"`.  Using `#` for the
docstring is discouraged.

This header is automatically generated when using `rally preset create`.

`-` can be used to disable autotests temporarily.

```
# name: ok
# autotest: ok
// name: also works
-autotest: will not run
-- autotest: this will run
```


The second type of header is the deployment info header. On any upload from
rally tools, we will look for a file named `bin/header.sh`. This will be
inserted at the start of each python upload using info about deployment time,
git info, and uploader name.

On any automatic download, this header will be automatically stripped. You
should never see this type of header in git locally. Here is an example header format:

```
# Built On: Wed 2020/01/02 12:53:13pm
# Author: John Schmidt <john@john2143.com>
# Tag: releases/23
# Build: 
# Version: .
# Branch: staging
# Commit: 20ab14bc6d16a19e60962efbe213a33fc21bafb7
# Local File: YEP/silo-presets/COC.py
###############################################################
```

The deployment info header can be read with `rally preset info`. It is used
like a rally preset upload command, where you supply the local file to be read
from multiple environments.

It will print dependencies and then show all the build info. Heres an example output:

```
$ rally preset info --file "YEP/silo-presets/COC.py" --e UAT,PROD

- COC
  - Some Checkin Library
    - cool client lib
      - Silo Constants
      - client lib helpers
    - lib/common_vars
    - Other Library
    - Third Library
      - (seen) Other Library
      - (seen) lib/common_vars
  - (miss) Some Missing Preset

ENV: UAT, updated ~8 hours ago
Built on Wed 2020/09/02 04:10:39pm by John Schmidt <john@john2143.com>
From (unknown) on feature-1234 (20ab14bc6d16a19e60962efbe213a33fc21bafb7)
ENV: PROD, updated ~8 days ago
Built on Wed Aug 26 13:11:33 UTC 2020 by Other Dev <someone_else@yep.com>
From 124 on staging (20ab14bc6d16a19e60962efbe213a33fc21bafb7)
```

#### Atom integration

Rally tools now supports a basic amount of atom integration including testing,
uploading, downloading, and rule managment. Two plugins are used for this:
process-pallete, and optionally, file-watcher. Please see the file
`process-pallete.json` in `jderby/ONRAMP_WORKFLOW_PYTHON`.

This should be copied into your base directory (same level as the silo-\*
folders)

This is still early in testing and does not support features like diffs and
inline live test results

#### Vim integration

Anyone else use vim? Just me? Heres my config:

all the file arguments are `^R%` where ^R is the CTRL-R sequence
(register-insert-command mode). Use `CTRL-V` in insert mode to enter
insert-escape mode, then press `CTRL-R` to type that sequence.

```vimscript
nnoremap <leader><leader>u :!rally preset upload --file "%" -e UAT<cr>
nnoremap <leader><leader>U :!rally preset upload --file "%" -e PROD --no-protect<cr>
nnoremap <leader>u :!rally supply make --file "%" --to UAT<cr>
nnoremap <leader>i :!rally supply make --file "%" --to QA<cr>
nnoremap <leader>U :!rally supply make --file "%" --to PROD --no-protect<cr>
nnoremap <leader>k :!rally preset info --file "%" --e UAT,PROD<cr>
nnoremap <leader>d :call Rallydiff("")<cr>
nnoremap <leader>D :call Rallydiff("-e PROD")<cr>
nnoremap <leader>c :call Rallydiff("-e QA")<cr>
nnoremap <leader>C :call Rallydiff("-e DEV")<cr>
nnoremap D :diffoff<cr>
nnoremap <leader><leader>Q :%!node ~/node-rally-tools/util/addMIOSupport.js<cr>
nnoremap <leader><leader>N :%!node ~/node-rally-tools/util/addDynamicNext.js<cr>

set splitright

function! Rallydiff(extra)
    let file = system("rally preset diff --only-new --file '" . bufname("%") . "' --raw " . a:extra)
    execute "silent vs" . file
    execute "silent windo diffthis"
    "echo file
endfunction
```


# Troubleshooting

#### Cannot acclimatize shelled preset

Solution: Create the preset on the remote enviornment manually, or run `rally
preset create`

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
