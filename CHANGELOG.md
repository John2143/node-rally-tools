# 1.8.3
 - Support for multiple autotests
# 1.8.2
 - Added `rule create`
 - Fixed deployment bugs
 - Added autocomplete library
# 1.8.0/1.8.1
 - Added `preset create`
 - Removed `rule grab`. Use `supply make - --to LOCAL` instead.
 - Unified supply chain postActions
 - Improved preset shell creation
 - Allowed types not extending rally base inside of `Collection#log()`
 - Added `Rule#getById`
 - Created utils folder, currently holding `addMioSupport.js` in order to transform
a normal preset into MIO
 - Added `--resolve` and `--attach` to preset list
 - Added categorizeString function. Transforms file path, or UID into object
 - Added meta associations to improve internal stability

# 1.7.1/1.7.2
 - Added support for `autotest: MOVIE_NAME` in header.
   - Supply a movie name to cause this preset to be run on the movie each time
     it is uploaded.
 - Fixed env error with Preset#grab
 - Support for timeout errors
 - Added `vverbose` flag: similar to `verbose`, but also logs every api request
 - Fixed `saveLocalMetadata` for non generic presets
 - Added support for `name [space]:`
 - Bugfixes
# 1.7
### This release marks the start of the onramp team using this tool for deployments.
 - Fixed critical bug in supply chain calculator
 - Added partial supply chains to `supply calc`
 - Added Jupyter support for compiling gcr ipyrb files
 - Fixed getLocalMetadata returning json instead of a javascript object
 - Added `preset grab` to get metadata from remote.
 - Added support for files without headers
