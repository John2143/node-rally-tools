# 1.7.1
 - Added support for `autotest: MOVIE_NAME` in header.
   - Supply a movie name to cause this preset to be run on the movie each time
     it is uploaded.
 - Fixed env error with Preset#grab
 - Support for timeout errors
 - Added `vverbose` flag: similar to `verbose`, but also logs every api request
 - Fixed `saveLocalMetadata` for non generic presets
 - Added support for `name [space]:`
# 1.7
### This release marks the start of the onramp team using this tool for deployments.
 - Fixed critical bug in supply chain calculator
 - Added partial supply chains to `supply calc`
 - Added Jupyter support for compiling gcr ipyrb files
 - Fixed getLocalMetadata returning json instead of a javascript object
 - Added `preset grab` to get metadata from remote.
 - Added support for files without headers
