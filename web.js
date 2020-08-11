(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('chalk'), require('os'), require('fs'), require('child_process'), require('perf_hooks'), require('request-promise'), require('path'), require('moment')) :
    typeof define === 'function' && define.amd ? define(['exports', 'chalk', 'os', 'fs', 'child_process', 'perf_hooks', 'request-promise', 'path', 'moment'], factory) :
    (global = global || self, factory(global.RallyTools = {}, global.chalk$1, global.os, global.fs, global.child_process, global.perf_hooks, global.rp, global.path, global.moment));
}(this, (function (exports, chalk$1, os, fs, child_process, perf_hooks, rp, path, moment) { 'use strict';

    chalk$1 = chalk$1 && Object.prototype.hasOwnProperty.call(chalk$1, 'default') ? chalk$1['default'] : chalk$1;
    var fs__default = 'default' in fs ? fs['default'] : fs;
    rp = rp && Object.prototype.hasOwnProperty.call(rp, 'default') ? rp['default'] : rp;
    var path__default = 'default' in path ? path['default'] : path;
    moment = moment && Object.prototype.hasOwnProperty.call(moment, 'default') ? moment['default'] : moment;

    exports.configFile = null;

    if (os.homedir) {
      exports.configFile = os.homedir() + "/.rallyconfig";
    }


    function loadConfig(file) {
      if (file) exports.configFile = file;
      if (!exports.configFile) return;
      exports.configObject = {
        hasConfig: true
      };

      try {
        let json = fs.readFileSync(exports.configFile);
        exports.configObject = JSON.parse(json);
        exports.configObject.hasConfig = true;
      } catch (e) {
        if (e.code == "ENOENT") {
          exports.configObject.hasConfig = false; //ok, they should probably make a config
        } else {
          throw e;
        }
      }
    }
    function loadConfigFromArgs(args) {
      let tempConfig = {
        hasConfig: true,
        ...args.config
      };
      exports.configObject = tempConfig;
    }
    function setConfig(obj) {
      exports.configObject = obj;
    }

    //these are the help entries for each command
    //function retuns obj.a.b.c

    function deepAccess(obj, path) {
      let o = obj;

      for (let key of path) {
        if (!o) return [];
        o = o[key];
      }

      return o;
    } //This takes a class as the first argument, then adds a getter/setter pair that
    //corresponds to an object in this.data


    function defineAssoc(classname, shortname, path) {
      path = path.split(".");
      let lastKey = path.pop();
      Object.defineProperty(classname.prototype, shortname, {
        get() {
          return deepAccess(this, path)[lastKey];
        },

        set(val) {
          deepAccess(this, path)[lastKey] = val;
        }

      });
    }

    function spawn(options, ...args) {
      if (typeof options !== "object") {
        args.unshift(options);
        options = {};
      } //todo options


      return new Promise((resolve, reject) => {
        let start = perf_hooks.performance.now();
        let stdout = "";
        let stderr = "";
        let cp = child_process.spawn(...args);
        let write = global.write;

        if (options.noecho) {
          write = () => {};
        }

        if (cp.stdout) cp.stdout.on("data", chunk => {
          stdout += chunk;
          write(chunk);
        });
        if (cp.stderr) cp.stderr.on("data", chunk => {
          stderr += chunk;
          write(chunk);
        });
        cp.on("error", reject);
        cp.on("close", code => {
          let end = perf_hooks.performance.now();
          let time = end - start;
          let timestr = time > 1000 ? (time / 100 | 0) / 10 + "s" : (time | 0) + "ms";
          resolve({
            stdout,
            stderr,
            exitCode: code,
            time,
            timestr
          });
        });
      });
    }

    global.chalk = chalk$1;

    global.log = (...text) => console.log(...text);

    global.write = (...text) => process.stdout.write(...text);

    global.elog = (...text) => console.error(...text);

    global.ewrite = (...text) => process.stderr.write(...text);

    global.errorLog = (...text) => log(...text.map(chalk$1.red));

    class lib {
      //This function takes 2 required arguemnts:
      // env: the enviornment you wish to use
      // and either:
      //  'path', the short path to the resource. ex '/presets/'
      //  'path_full', the full path to the resource like 'https://discovery-dev.sdvi.com/presets'
      //
      // If the method is anything but GET, either payload or body should be set.
      // payload should be a javascript object to be turned into json as the request body
      // body should be a string that is passed as the body. for example: the python code of a preset.
      //
      // qs are the querystring parameters, in a key: value object.
      // {filter: "name=test name"} becomes something like 'filter=name=test+name'
      //
      // headers are the headers of the request. "Content-Type" is already set if
      //   payload is given as a parameter
      //
      // fullResponse should be true if you want to receive the request object,
      //  not just the returned data.
      static async makeAPIRequest({
        env,
        path,
        path_full,
        fullPath,
        payload,
        body,
        method = "GET",
        qs,
        headers = {},
        fullResponse = false,
        timeout = exports.configObject.timeout || 20000
      }) {
        var _configObject$api;

        //backwards compatability from ruby script
        if (fullPath) path_full = fullPath; //Keys are defined in enviornment variables

        let config = exports.configObject === null || exports.configObject === void 0 ? void 0 : (_configObject$api = exports.configObject.api) === null || _configObject$api === void 0 ? void 0 : _configObject$api[env];

        if (!config) {
          throw new UnconfiguredEnvError(env);
        }

        if (method !== "GET" && !exports.configObject.dangerModify) {
          if (env === "UAT" && exports.configObject.restrictUAT || env === "PROD") {
            throw new ProtectedEnvError(env);
          }
        }

        let rally_api_key = config.key;
        let rally_api = config.url;

        if (path && path.startsWith("/v1.0/")) {
          rally_api = rally_api.replace("/api/v2", "/api");
        }

        path = path_full || rally_api + path;

        if (payload) {
          body = JSON.stringify(payload, null, 4);
        }

        if (payload) {
          headers["Content-Type"] = "application/vnd.api+json";
        }

        let fullHeaders = {
          //SDVI ignores this header sometimes.
          Accept: "application/vnd.api+json",
          "X-SDVI-Client-Application": "Discovery-rtlib-" + (exports.configObject.appName || "commandline"),
          ...headers
        };

        if (exports.configObject.vvverbose) {
          log(`${method} @ ${path}`);
          log(JSON.stringify(fullHeaders, null, 4));

          if (body) {
            log(body);
          } else {
            log("(No body");
          }
        }

        let requestOptions = {
          method,
          body,
          qs,
          uri: path,
          timeout,
          auth: {
            bearer: rally_api_key
          },
          headers: fullHeaders,
          simple: false,
          resolveWithFullResponse: true
        };
        let response;

        try {
          response = await rp(requestOptions);

          if (exports.configObject.vverbose || exports.configObject.vvverbose) {
            log(chalk$1`${method} @ ${response.request.uri.href}`);
          }
        } catch (e) {
          if ((e === null || e === void 0 ? void 0 : e.cause.code) === "ESOCKETTIMEDOUT") {
            throw new APIError(response || {}, requestOptions, body);
          } else {
            throw e;
          }
        } //Throw an error for any 5xx or 4xx


        if (!fullResponse && ![200, 201, 202, 203, 204].includes(response.statusCode)) {
          throw new APIError(response, requestOptions, body);
        }

        let contentType = response.headers["content-type"];
        let isJSONResponse = contentType === "application/vnd.api+json" || contentType === "application/json";

        if (exports.configObject.vvverbose) {
          log(response.body);
        }

        if (fullResponse) {
          return response;
        } else if (isJSONResponse) {
          var _response, _response$body;

          if ([200, 201, 202, 203, 204].includes(response.statusCode) && !((_response = response) === null || _response === void 0 ? void 0 : (_response$body = _response.body) === null || _response$body === void 0 ? void 0 : _response$body.trim())) return {};

          try {
            return JSON.parse(response.body);
          } catch (e) {
            log(response.body);
            throw new AbortError("Body is not valid json: ");
          }
        } else {
          return response.body;
        }
      } //Index a json endpoint that returns a {links} field.
      //This function returns the merged data objects as an array
      //
      //Additonal options (besides makeAPIRequest options):
      // - Observe: function to be called for each set of data from the api


      static async indexPath(env, path) {
        let all = [];
        let opts = typeof env === "string" ? {
          env,
          path
        } : env;
        let json = await this.makeAPIRequest(opts);
        let [numPages, pageSize] = this.numPages(json.links.last); //log(`num pages: ${numPages} * ${pageSize}`);

        all = [...json.data];

        while (json.links.next) {
          json = await this.makeAPIRequest({ ...opts,
            path_full: json.links.next
          });
          if (opts.observe) await opts.observe(json.data);
          all = [...all, ...json.data];
        }

        return all;
      } //Returns number of pages and pagination size


      static numPages(str) {
        return /page=(\d+)p(\d+)/.exec(str).slice(1);
      }

      static arrayChunk(array, chunkSize) {
        let newArr = [];

        for (let i = 0; i < array.length; i += chunkSize) {
          newArr.push(array.slice(i, i + chunkSize));
        }

        return newArr;
      }

      static async doPromises(promises, result = [], cb) {
        for (let promise of promises) {
          let res = await promise;
          result.push(res);

          if (cb) {
            cb(res.data);
          }
        }

        return result;
      }

      static clearProgress(size = 30) {
        if (!exports.configObject.globalProgress) return;
        process.stderr.write(`\r${" ".repeat(size + 15)}\r`);
      }

      static async drawProgress(i, max, size = process.stdout.columns - 15 || 15) {
        if (!exports.configObject.globalProgress) return;
        if (size > 45) size = 45;
        let pct = Number(i) / Number(max); //clamp between 0 and 1

        pct = pct < 0 ? 0 : pct > 1 ? 1 : pct;
        let numFilled = Math.floor(pct * size);
        let numEmpty = size - numFilled;
        this.clearProgress(size);
        process.stderr.write(`[${"*".repeat(numFilled)}${" ".repeat(numEmpty)}] ${i} / ${max}`);
      }

      static async keepalive(func, inputData, {
        chunksize = 20,
        observe = async _ => _,
        progress = exports.configObject.globalProgress
      } = {}) {
        let total = inputData ? inputData.length : func.length;
        let i = 0;

        let createPromise = () => {
          let ret;
          if (i >= total) return [];

          if (inputData) {
            ret = [i, func(inputData[i])];
          } else {
            ret = [i, func[i]()];
          }

          i++;
          return ret;
        };

        let values = [];
        let finished = 0;
        if (progress) process.stderr.write("\n");
        let threads = [...this.range(chunksize)].map(async whichThread => {
          while (true) {
            let [i, currentPromise] = createPromise();
            if (i == undefined) break;
            values[i] = await observe((await currentPromise));
            if (progress) this.drawProgress(++finished, total);
          }
        });
        await Promise.all(threads);
        if (progress) process.stderr.write("\n");
        return values;
      }

      static *range(start, end) {
        if (end === undefined) {
          end = start;
          start = 0;
        }

        while (start < end) yield start++;
      } //Index a json endpoint that returns a {links} field.
      //
      //This function is faster than indexPath because it can guess the pages it
      //needs to retreive so that it can request all assets at once.
      //
      //This function assumes that the content from the inital request is the
      //first page, so starting on another page may cause issues. Consider
      //indexPath for that.
      //
      //Additional opts, besides default indexPath opts:
      // - chunksize[10]: How often to break apart concurrent requests


      static async indexPathFast(env, path) {
        let opts = typeof env === "string" ? {
          env,
          path
        } : env; //Create a copy of the options in case we need to have a special first request

        let start = opts.start || 1;
        let initOpts = { ...opts
        };

        if (opts.pageSize) {
          initOpts.qs = { ...opts.qs
          };
          initOpts.qs.page = `${start}p${opts.pageSize}`;
        }

        let json = await this.makeAPIRequest(initOpts);
        if (opts.observe && opts.start !== 1) json = await opts.observe(json);
        let baselink = json.links.first;

        const linkToPage = page => baselink.replace(`page=1p`, `page=${page}p`);

        let [numPages, pageSize] = this.numPages(json.links.last); //Construct an array of all the requests that are done simultanously.
        //Assume that the content from the inital request is the first page.

        let allResults = await this.keepalive(this.makeAPIRequest, [...this.range(start + 1, Number(numPages) + 1 || opts.limit + 1)].map(i => ({ ...opts,
          path_full: linkToPage(i)
        })), {
          chunksize: opts.chunksize,
          observe: opts.observe
        });

        if (start == 1) {
          allResults.unshift(json);
        }

        this.clearProgress();
        let all = [];

        for (let result of allResults) {
          for (let item of result.data) {
            all.push(item);
          }
        }

        return all;
      }

      static isLocalEnv(env) {
        return !env || env === "LOCAL" || env === "LOC";
      }

      static envName(env) {
        if (this.isLocalEnv(env)) return "LOCAL";
        return env;
      }

    }
    class AbortError extends Error {
      constructor(message) {
        super(message);
        Error.captureStackTrace(this, this.constructor);
        this.name = "AbortError";
      }

    }
    class APIError extends Error {
      constructor(response, opts, body) {
        super(chalk$1`
{reset Request returned} {yellow ${response === null || response === void 0 ? void 0 : response.statusCode}}{
{green ${JSON.stringify(opts, null, 4)}}
{green ${body}}
{reset ${response.body}}
===============================
{red ${response.body ? "Request timed out" : "Bad response from API"}}
===============================
        `);
        this.response = response;
        this.opts = opts;
        this.body = body;
        Error.captureStackTrace(this, this.constructor);
        this.name = "ApiError";
      }

    }
    class UnconfiguredEnvError extends AbortError {
      constructor(env) {
        super("Unconfigured enviornment: " + env);
        this.name = "Unconfigured Env Error";
      }

    }
    class ProtectedEnvError extends AbortError {
      constructor(env) {
        super("Protected enviornment: " + env);
        this.name = "Protected Env Error";
      }

    }
    class FileTooLargeError extends Error {
      constructor(file) {
        super(`File ${file.parentAsset ? file.parentAsset.name : "(unknown)"}/${file.name} size is: ${file.sizeGB}g (> ~.2G)`);
        this.name = "File too large error";
      }

    }
    class Collection {
      constructor(arr) {
        this.arr = arr;
      }

      [Symbol.iterator]() {
        return this.arr[Symbol.iterator]();
      }

      findById(id) {
        return this.arr.find(x => x.id == id);
      }

      findByName(name) {
        return this.arr.find(x => x.name == name);
      }

      findByNameContains(name) {
        return this.arr.find(x => x.name.includes(name));
      }

      log() {
        for (let d of this) {
          if (d) {
            log(d.chalkPrint(true));
          } else {
            log(chalk$1`{red (None)}`);
          }
        }
      }

      get length() {
        return this.arr.length;
      }

    }
    class RallyBase {
      static handleCaching() {
        if (!this.cache) this.cache = [];
      }

      static isLoaded(env) {
        if (!this.hasLoadedAll) return;
        return this.hasLoadedAll[env];
      }

      static async getById(env, id, qs) {
        this.handleCaching();

        for (let item of this.cache) {
          if (item.id == id && item.remote === env || `${env}-${id}` === item.metastring) return item;
        }

        let data = await lib.makeAPIRequest({
          env,
          path: `/${this.endpoint}/${id}`,
          qs
        });

        if (data.data) {
          let o = new this({
            data: data.data,
            remote: env,
            included: data.included
          });
          this.cache.push(o);
          return o;
        }
      }

      static async getByName(env, name, qs) {
        this.handleCaching();

        for (let item of this.cache) {
          if (item.name === name && item.remote === env) return item;
        }

        let data = await lib.makeAPIRequest({
          env,
          path: `/${this.endpoint}`,
          qs: { ...qs,
            filter: `name=${name}` + (qs ? qs.filter : "")
          }
        }); //TODO included might not wokr correctly here

        if (data.data[0]) {
          let o = new this({
            data: data.data[0],
            remote: env,
            included: data.included
          });
          this.cache.push(o);
          return o;
        }
      }

      static async getAllPreCollect(d) {
        return d;
      }

      static async getAll(env) {
        this.handleCaching();
        let datas = await lib.indexPathFast({
          env,
          path: `/${this.endpoint}`,
          pageSize: "50",
          qs: {
            sort: "id"
          }
        });
        datas = await this.getAllPreCollect(datas);
        let all = new Collection(datas.map(data => new this({
          data,
          remote: env
        })));
        this.cache = [...this.cache, ...all.arr];
        return all;
      }

      static async removeCache(env) {
        this.handleCaching();
        this.cache = this.cache.filter(x => x.remote !== env);
      } //Specific turns name into id based on env
      //Generic turns ids into names


      async resolveApply(type, dataObj, direction) {
        let obj;

        if (direction == "generic") {
          obj = await type.getById(this.remote, dataObj.id);

          if (obj) {
            dataObj.name = obj.name;
          }
        } else if (direction == "specific") {
          obj = await type.getByName(this.remote, dataObj.name);

          if (obj) {
            dataObj.id = obj.id;
          }
        }

        return obj;
      } //Type is the baseclass you are looking for (should extend RallyBase)
      //name is the name of the field
      //isArray is true if it has multiple cardinailty, false if it is single
      //direction gets passed directly to resolveApply


      async resolveField(type, name, isArray = false, direction = "generic") {
        // ignore empty fields
        let field = this.relationships[name];
        if (!(field === null || field === void 0 ? void 0 : field.data)) return;

        if (isArray) {
          return await Promise.all(field.data.map(o => this.resolveApply(type, o, direction)));
        } else {
          return await this.resolveApply(type, field.data, direction);
        }
      }

      cleanup() {
        for (let [key, val] of Object.entries(this.relationships)) {
          //Remove ids from data
          if (val.data) {
            if (val.data.id) {
              delete val.data.id;
            } else if (val.data[0]) {
              for (let x of val.data) delete x.id;
            }
          }

          delete val.links;
        } // organization is unused (?)


        delete this.relationships.organization; // id is specific to envs
        // but save source inside meta string in case we need it

        this.metastring = this.remote + "-" + this.data.id;
        delete this.data.id; // links too

        delete this.data.links;
      }

    }
    function sleep(time = 1000) {
      return new Promise(resolve => setTimeout(resolve, time));
    }

    const inquirer = importLazy("inquirer");
    const readdir = importLazy("recursive-readdir");
    async function loadLocals(path$1, Class) {
      let basePath = exports.configObject.repodir;
      let objs = (await readdir(basePath)).filter(name => name.includes(path$1)).filter(name => !path.basename(name).startsWith(".")).map(name => new Class({
        path: name
      }));
      return objs;
    }

    class Provider extends RallyBase {
      constructor({
        data,
        remote
      }) {
        super();
        this.data = data;
        this.meta = {};
        this.remote = remote;
      } //cached


      async getEditorConfig() {
        if (this.editorConfig) return this.editorConfig;
        this.editorConfig = await lib.makeAPIRequest({
          env: this.remote,
          path_full: this.data.links.editorConfig
        });
        this.editorConfig.fileExt = await this.getFileExtension();
        return this.editorConfig;
      }

      static async getAllPreCollect(providers) {
        return providers.sort((a, b) => {
          return a.attributes.category.localeCompare(b.attributes.category) || a.attributes.name.localeCompare(b.attributes.name);
        });
      }

      async getFileExtension() {
        let config = await this.getEditorConfig();
        let map = {
          python: "py",
          text: "txt",

          getmap(key) {
            if (this.name === "Aurora") return "zip";
            if (this[key]) return this[key];
            return key;
          }

        };
        return map.getmap(config.lang);
      }

      chalkPrint(pad = true) {
        let id = String(this.id);
        if (pad) id = id.padStart(4);
        return chalk`{green ${id}}: {blue ${this.category}} - {green ${this.name}}`;
      }

    }

    defineAssoc(Provider, "id", "data.id");
    defineAssoc(Provider, "name", "data.attributes.name");
    defineAssoc(Provider, "category", "data.attributes.category");
    defineAssoc(Provider, "remote", "meta.remote");
    defineAssoc(Provider, "editorConfig", "meta.editorConfig");
    Provider.endpoint = "providerTypes";

    class File extends RallyBase {
      constructor({
        data,
        remote,
        included,
        parent
      }) {
        super();
        this.data = data;
        this.meta = {};
        this.remote = remote;
        this.parentAsset = parent;
      }

      chalkPrint(pad = false) {
        let id = String("F-" + (this.remote && this.remote + "-" + this.id || "LOCAL"));
        if (pad) id = id.padStart(15);
        return chalk`{green ${id}}: {blue ${this.data.attributes ? this.name : "(lite file)"}} {red ${this.sizeHR}}`;
      }

      canBeDownloaded() {
        return this.sizeGB <= .2;
      }

      async getContent(force = false) {
        if (!this.canBeDownloaded() && !force) {
          throw new FileTooLargeError(this);
        }

        return lib.makeAPIRequest({
          env: this.remote,
          fullPath: this.contentLink
        });
      }

      async delete(remove = true) {
        return lib.makeAPIRequest({
          env: this.remote,
          fullPath: this.selfLink,
          method: "DELETE"
        });
      }

      get size() {
        return Object.values(this.data.attributes.instances)[0].size;
      }

      get sizeGB() {
        return Math.round(this.size / 1024 / 1024 / 1024 * 10) / 10;
      }

      get sizeHR() {
        let units = ["B", "K", "M", "G", "T"];
        let unitIdx = 0;
        let size = this.size;

        while (size > 1000) {
          size /= 1024;
          unitIdx++;
        }

        if (size > 100) {
          size = Math.round(size);
        } else {
          size = Math.round(size * 10) / 10;
        }

        return size + units[unitIdx];
      }

      get instancesList() {
        let instances = [];

        for (let [key, val] of Object.entries(this.instances)) {
          let n = {
            id: key
          };
          Object.assign(n, val);
          instances.push(n);
        }

        return instances;
      }

      static rslURL(instance) {
        return `rsl://${instance.storageLocationName}/${instance.name}`;
      }

    }

    defineAssoc(File, "id", "data.id");
    defineAssoc(File, "name", "data.attributes.label");
    defineAssoc(File, "contentLink", "data.links.content");
    defineAssoc(File, "selfLink", "data.links.self");
    defineAssoc(File, "label", "data.attributes.label");
    defineAssoc(File, "md5", "data.attributes.md5");
    defineAssoc(File, "sha512", "data.attributes.sha512");
    defineAssoc(File, "tags", "data.attributes.tagList");
    defineAssoc(File, "instances", "data.attributes.instances");
    File.endpoint = null;

    class Asset extends RallyBase {
      constructor({
        data,
        remote,
        included,
        lite
      }) {
        super();
        this.data = data;
        this.meta = {};
        this.remote = remote;

        if (included) {
          this.meta.metadata = Asset.normalizeMetadata(included);
        }

        this.lite = !!lite;
      }

      static normalizeMetadata(payload) {
        let newMetadata = {};

        for (let md of payload) {
          if (md.type !== "metadata") continue;
          newMetadata[md.attributes.usage] = md.attributes.metadata;
        }

        return newMetadata;
      }

      async getMetadata(forceRefresh = false) {
        if (this.meta.metadata && !forceRefresh) return this.meta.metadata;
        let req = await lib.makeAPIRequest({
          env: this.remote,
          path: `/movies/${this.id}/metadata`
        });
        return this.meta.metadata = Asset.normalizeMetadata(req.data);
      }

      async patchMetadata(metadata) {
        if (metadata.Workflow && false) {
          let req = await lib.makeAPIRequest({
            env: this.remote,
            path: `/movies/${this.id}/metadata/Workflow`,
            method: "PATCH",
            payload: {
              "data": {
                "type": "metadata",
                "attributes": {
                  "metadata": metadata.Workflow
                }
              }
            }
          });
        }

        if (metadata.Metadata) {
          let req = await lib.makeAPIRequest({
            env: this.remote,
            path: `/movies/${this.id}/metadata/Metadata`,
            method: "PATCH",
            payload: {
              "data": {
                "type": "metadata",
                "attributes": {
                  "metadata": metadata.Metadata
                }
              }
            }
          });
        }
      }

      static lite(id, remote) {
        return new this({
          data: {
            id
          },
          remote,
          lite: true
        });
      }

      chalkPrint(pad = false) {
        let id = String("A-" + (this.remote && this.remote + "-" + this.id || "LOCAL"));
        if (pad) id = id.padStart(15);
        return chalk`{green ${id}}: {blue ${this.data.attributes ? this.name : "(lite asset)"}}`;
      }

      static async createNew(name, env) {
        let req = await lib.makeAPIRequest({
          env,
          path: "/assets",
          method: "POST",
          payload: {
            data: {
              attributes: {
                name
              },
              type: "assets"
            }
          }
        });
        return new this({
          data: req.data,
          remote: env
        });
      }

      async delete() {
        let req = await lib.makeAPIRequest({
          env: this.remote,
          path: "/assets/" + this.id,
          method: "DELETE"
        });
      }

      async getFiles() {
        let req = await lib.indexPathFast({
          env: this.remote,
          path: `/assets/${this.id}/files`,
          method: "GET"
        }); //return req;

        return new Collection(req.map(x => new File({
          data: x,
          remote: this.remote,
          parent: this
        })));
      }

      async addFile(label, fileuris) {
        if (!Array.isArray(fileuris)) fileuris = [fileuris];
        let instances = {};

        for (let i = 0; i < fileuris.length; i++) {
          instances[String(i + 1)] = {
            uri: fileuris[i]
          };
        }

        let req = await lib.makeAPIRequest({
          env: this.remote,
          path: "/files",
          method: "POST",
          payload: {
            "data": {
              "attributes": {
                label,
                instances
              },
              "relationships": {
                "asset": {
                  "data": {
                    id: this.id,
                    "type": "assets"
                  }
                }
              },
              "type": "files"
            }
          }
        });
        return req;
      }

      async startWorkflow(jobName, {
        initData,
        priority
      } = {}) {
        let attributes = {};

        if (initData) {
          //Convert init data to string
          initData = typeof initData === "string" ? initData : JSON.stringify(initData);
          attributes.initData = initData;
        }

        if (priority) {
          attributes.priority = priority;
        }

        let req = await lib.makeAPIRequest({
          env: this.remote,
          path: "/workflows",
          method: "POST",
          payload: {
            "data": {
              "type": "workflows",
              attributes,
              "relationships": {
                "movie": {
                  "data": {
                    id: this.id,
                    "type": "movies"
                  }
                },
                "rule": {
                  "data": {
                    "attributes": {
                      "name": jobName
                    },
                    "type": "rules"
                  }
                }
              }
            }
          }
        });
        return req;
      }

      static async startAnonWorkflow(env, jobName, {
        initData,
        priority
      } = {}) {
        let attributes = {};

        if (initData) {
          //Convert init data to string
          initData = typeof initData === "string" ? initData : JSON.stringify(initData);
          attributes.initData = initData;
        }

        if (priority) {
          attributes.priority = priority;
        }

        let req = await lib.makeAPIRequest({
          env,
          path: "/workflows",
          method: "POST",
          payload: {
            "data": {
              "type": "workflows",
              attributes,
              "relationships": {
                "rule": {
                  "data": {
                    "attributes": {
                      "name": jobName
                    },
                    "type": "rules"
                  }
                }
              }
            }
          }
        });
        return req;
      }

      async startEphemeralEvaluateIdeal(preset, dynamicPresetData) {
        let res;
        const env = this.remote;
        let provider = await Provider.getByName(this.remote, "SdviEvaluate");
        write(chalk`Starting ephemeral evaluate on ${this.chalkPrint(false)}...`); // Fire and forget.

        let evalInfo = await lib.makeAPIRequest({
          env: this.remote,
          path: "/jobs",
          method: "POST",
          payload: {
            data: {
              attributes: {
                category: provider.category,
                providerTypeName: provider.name,
                rallyConfiguration: {},
                providerData: Buffer.from(preset.code, "binary").toString("base64"),
                dynamicPresetData
              },
              type: "jobs",
              relationships: {
                movie: {
                  data: {
                    id: this.id,
                    type: "movies"
                  }
                }
              }
            }
          }
        });
        write(" Waiting for finish...");

        for (;;) {
          res = await lib.makeAPIRequest({
            env,
            path_full: evalInfo.data.links.self
          });
          write(".");

          if (res.data.attributes.state == "Complete") {
            write(chalk`{green  Done}...\n`);
            break;
          }

          await sleep(300);
        }

        return;
      }

      async startEvaluate(presetid, dynamicPresetData) {
        // Fire and forget.
        let data = await lib.makeAPIRequest({
          env: this.remote,
          path: "/jobs",
          method: "POST",
          payload: {
            data: {
              type: "jobs",
              attributes: {
                dynamicPresetData
              },
              relationships: {
                movie: {
                  data: {
                    id: this.id,
                    type: "movies"
                  }
                },
                preset: {
                  data: {
                    id: presetid,
                    type: "presets"
                  }
                }
              }
            }
          }
        });
        return data;
      }

      async rename(newName) {
        let req = await lib.makeAPIRequest({
          env: this.remote,
          path: `/assets/${this.id}`,
          method: "PATCH",
          payload: {
            data: {
              attributes: {
                name: newName
              },
              type: "assets"
            }
          }
        });
        this.name = newName;
        return req;
      }

      async migrate(targetEnv) {
        exports.configObject.globalProgress = false;
        log(`Creating paired file in ${targetEnv}`); //Fetch metadata in parallel, we await it later

        let _mdPromise = this.getMetadata();

        let targetAsset = await Asset.getByName(targetEnv, this.name);

        if (targetAsset) {
          log(`Asset already exists ${targetAsset.chalkPrint()}`); //if(configObject.script) process.exit(10);
        } else {
          targetAsset = await Asset.createNew(this.name, targetEnv);
          log(`Asset created ${targetAsset.chalkPrint()}`);
        } //wait for metadata to be ready before patching


        await _mdPromise;
        log("Adding asset metadata");
        await targetAsset.patchMetadata(this.md); //FIXME
        //Currently, WORKFLOW_METADATA cannot be patched via api: we need to
        //start a ephemeral eval to upload it

        log("Adding asset workflow metadata");
        let md = JSON.stringify(JSON.stringify(this.md.Workflow));
        let fakePreset = {
          code: `WORKFLOW_METADATA = json.loads(${md})`
        };
        await targetAsset.startEphemeralEvaluateIdeal(fakePreset);
        let fileCreations = [];

        for (let file of await this.getFiles()) {
          //Check for any valid copy-able instances
          for (let inst of file.instancesList) {
            //We need to skip internal files
            if (inst.storageLocationName === "Rally Platform Bucket") continue;
            log(`Adding file: ${file.chalkPrint()}`);
            fileCreations.push(targetAsset.addFileInstance(file, inst));
          }
        }

        await Promise.all(fileCreations);
      }

      async addFileInstance(file, inst, tagList = []) {
        let newInst = {
          uri: File.rslURL(inst),
          name: inst.name,
          size: inst.size,
          lastModified: inst.lastModified,
          storageLocationName: inst.storageLocationName
        };
        let request = lib.makeAPIRequest({
          env: this.remote,
          path: `/files`,
          method: "POST",
          payload: {
            data: {
              type: "files",
              attributes: {
                label: file.label,
                tagList,
                instances: {
                  "1": newInst
                }
              },
              relationships: {
                asset: {
                  data: {
                    id: this.id,
                    type: "assets"
                  }
                }
              }
            }
          }
        });

        try {
          let fileData = await request;
          let newFile = new File({
            data: fileData.data,
            remote: this.remote,
            parent: this
          });
          if (exports.configObject.script) console.log(inst.uri, newFile.instancesList[0].uri);
        } catch (e) {
          log(chalk`{red Failed file: ${file.chalkPrint()}}`);
        }
      }

    }

    defineAssoc(Asset, "id", "data.id");
    defineAssoc(Asset, "name", "data.attributes.name");
    defineAssoc(Asset, "remote", "meta.remote");
    defineAssoc(Asset, "md", "meta.metadata");
    defineAssoc(Asset, "lite", "meta.lite");
    Asset.endpoint = "movies";

    let home;

    if (os.homedir) {
      home = os.homedir();
    }

    const colon = /:/g;
    const siloLike = /(silo\-\w+?)s?\/([^\/]+)\.([\w1234567890]+)$/g;
    function pathTransform(path) {
      if (path.includes(":")) {
        //Ignore the first colon in window-like filesystems
        path = path.slice(0, 3) + path.slice(3).replace(colon, "--");
      }

      if (exports.configObject.invertedPath) {
        path = path.replace(siloLike, "$2-$1.$3");
      }

      if (path.includes("\\342\\200\\220")) {
        path = path.replace("\\342\\200\\220", "‐");
      }

      return path;
    }
    function readFileSync(path, options) {
      return fs__default.readFileSync(pathTransform(path), options);
    } //Create writefilesync, with ability to create directory if it doesnt exist

    function writeFileSync(path$1, data, options, dircreated = false) {
      path$1 = pathTransform(path$1);

      try {
        return fs__default.writeFileSync(path$1, data, options);
      } catch (e) {
        if (dircreated) throw e;
        let directory = path.dirname(path$1);

        try {
          fs__default.statSync(directory);
          throw e;
        } catch (nodir) {
          fs__default.mkdirSync(directory);
          return writeFileSync(path$1, data, options, true);
        }
      }
    }

    let exists = {};

    class Preset extends RallyBase {
      constructor({
        path: path$1,
        remote,
        data,
        subProject
      } = {}) {
        // Get full path if possible
        if (path$1) {
          path$1 = path.resolve(path$1);

          if (path.dirname(path$1).includes("silo-metadata")) {
            throw new AbortError("Constructing preset from metadata file");
          }
        }

        super(); // Cache by path

        if (path$1) {
          if (exists[pathTransform(path$1)]) return exists[pathTransform(path$1)];
          exists[pathTransform(path$1)] = this;
        }

        this.meta = {};
        this.subproject = subProject;
        this.remote = remote;

        if (lib.isLocalEnv(this.remote)) {
          if (path$1) {
            this.path = path$1;
            let pathspl = this.path.split(".");
            this.ext = pathspl[pathspl.length - 1];

            try {
              this.code = this.getLocalCode();
            } catch (e) {
              if (e.code === "ENOENT" && exports.configObject.ignoreMissing) {
                this.missing = true;
                return undefined;
              } else {
                log(chalk`{red Node Error} ${e.message}`);
                throw new AbortError("Could not load code of local file");
              }
            }

            let name = this.parseFilenameForName() || this.parseCodeForName();

            try {
              this.data = this.getLocalMetadata();
              this.isGeneric = true;
              name = this.name;
            } catch (e) {
              log(chalk`{yellow Warning}: ${path$1} does not have a readable metadata file! Looking for ${this.localmetadatapath}`);
              this.data = Preset.newShell(name);
              this.isGeneric = false;
            }

            this.name = name;
          } else {
            this.data = Preset.newShell();
          }
        } else {
          this.data = data; //this.name = data.attributes.name;
          //this.id = data.id;

          this.isGeneric = false;
        }

        this.data.attributes.rallyConfiguration = undefined;
        this.data.attributes.systemManaged = undefined;
      } //Given a metadata file, get its actualy file


      static async fromMetadata(path, subproject) {
        let data;

        try {
          data = JSON.parse(readFileSync(path));
        } catch (e) {
          if (e.code === "ENOENT" && exports.configObject.ignoreMissing) {
            return null;
          } else {
            throw e;
          }
        }

        let providerType = data.relationships.providerType.data.name;
        let provider = await Provider.getByName("DEV", providerType);

        if (!provider) {
          log(chalk`{red The provider type {green ${providerType}} does not exist}`);
          log(chalk`{red Skipping {green ${path}}.}`);
          return null;
        }

        let ext = await provider.getFileExtension();
        let name = data.attributes.name;
        let realpath = Preset.getLocalPath(name, ext, subproject);
        return new Preset({
          path: realpath,
          subProject: subproject
        });
      }

      static newShell(name = undefined) {
        return {
          "attributes": {
            "providerSettings": {
              "PresetName": name
            }
          },
          "relationships": {},
          "type": "presets"
        };
      }

      cleanup() {
        super.cleanup();
        delete this.attributes["createdAt"];
        delete this.attributes["updatedAt"];
      }

      async acclimatize(env) {
        if (!this.isGeneric) throw new AbortError("Cannot acclimatize non-generics or shells");
        let providers = await Provider.getAll(env);
        let ptype = this.relationships["providerType"];
        ptype = ptype.data;
        let provider = providers.findByName(ptype.name);
        ptype.id = provider.id;
      }

      get test() {
        if (!this.code) return [];
        const regex = /[^-]autotest:\s?([\w\d_\-. \/]+)[\r\s\n]*?/gm;
        let match;
        let matches = [];

        while (match = regex.exec(this.code)) {
          matches.push(match[1]);
        }

        return matches;
      }

      async runTest(env) {
        let remote = await Preset.getByName(env, this.name);

        for (let test of this.test) {
          log("Tests...");
          let asset;

          if (test.startsWith("id")) {
            let match = /id:\s*(\d+)/g.exec(test);

            if (!match) {
              log(chalk`{red Could not parse autotest} ${test}.`);
              throw new AbortError("Could not properly parse the preset header");
            }

            asset = await Asset.getById(env, match[1]);
          } else {
            asset = await Asset.getByName(env, test);
          }

          if (!asset) {
            log(chalk`{yellow No movie found}, skipping test.`);
            continue;
          }

          log(chalk`Starting job {green ${this.name}} on ${asset.chalkPrint(false)}... `);
          await asset.startEvaluate(remote.id);
        }
      }

      async resolve() {
        if (this.isGeneric) return;
        let proType = await this.resolveField(Provider, "providerType");
        this.ext = await proType.getFileExtension();
        this.isGeneric = true;
        return {
          proType
        };
      }

      async saveLocal() {
        await this.saveLocalMetadata();
        await this.saveLocalFile();
      }

      async saveLocalMetadata() {
        if (!this.isGeneric) {
          await this.resolve();
          this.cleanup();
        }

        writeFileSync(this.localmetadatapath, JSON.stringify(this.data, null, 4));
      }

      async saveLocalFile() {
        writeFileSync(this.localpath, this.code);
      }

      async uploadRemote(env) {
        await this.uploadCodeToEnv(env, true);
      }

      async save(env) {
        this.saved = true;

        if (!this.isGeneric) {
          await this.resolve();
        }

        this.cleanup();

        if (lib.isLocalEnv(env)) {
          log(chalk`Saving preset {green ${this.name}} to {blue ${lib.envName(env)}}.`);
          await this.saveLocal();
        } else {
          await this.uploadRemote(env);
        }
      }

      async downloadCode() {
        if (!this.remote || this.code) return this.code;
        let code = await lib.makeAPIRequest({
          env: this.remote,
          path_full: this.data.links.providerData,
          json: false
        }); //match header like 
        // # c: d
        // # b
        // # a
        // ##################

        let headerRegex = /(^# .+[\r\n]+)+#+[\r\n]+/gim;
        let hasHeader = headerRegex.exec(code);

        if (hasHeader) {
          this.header = code.substring(0, hasHeader[0].length - 1);
          code = code.substring(hasHeader[0].length);
        }

        return this.code = code;
      }

      get code() {
        if (this._code) return this._code;
      }

      set code(v) {
        this._code = v;
      }

      chalkPrint(pad = true) {
        let id = String("P-" + (this.remote && this.remote + "-" + this.id || "LOCAL"));
        let sub = "";

        if (this.subproject) {
          sub = chalk`{yellow ${this.subproject}}`;
        }

        if (pad) id = id.padStart(10);

        if (this.name == undefined) {
          return chalk`{green ${id}}: ${sub}{red ${this.path}}`;
        } else if (this.meta.proType) {
          return chalk`{green ${id}}: ${sub}{red ${this.meta.proType.name}} {blue ${this.name}}`;
        } else {
          return chalk`{green ${id}}: ${sub}{blue ${this.name}}`;
        }
      }

      parseFilenameForName() {
        if (this.path.endsWith(".jinja") || this.path.endsWith(".json")) {
          return path.basename(this.path).replace("_", " ").replace("-", " ").replace(".json", "").replace(".jinja", "");
        }
      }

      parseCodeForName() {
        const name_regex = /name\s?:\s([\w\d. \/]+)[\r\s\n]*?/;
        const match = name_regex.exec(this.code);
        if (match) return match[1];
      }

      findStringsInCode(strings) {
        if (!this.code) return [];
        return strings.filter(str => {
          let regex = new RegExp(str);
          return !!this.code.match(regex);
        });
      }

      static getLocalPath(name, ext, subproject) {
        return path__default.join(exports.configObject.repodir, subproject || "", "silo-presets", name + "." + ext);
      }

      get localpath() {
        return Preset.getLocalPath(this.name, this.ext, this.subproject);
      }

      get path() {
        if (this._path) return this._path;
      }

      set path(val) {
        this._path = val;
      }

      get name() {
        return this._nameOuter;
      }

      set name(val) {
        if (!this._nameInner) this._nameInner = val;
        this._nameOuter = val;
      }

      set providerType(value) {
        this.relationships["providerType"] = {
          data: { ...value,
            type: "providerTypes"
          }
        };
      }

      get localmetadatapath() {
        if (this.path) {
          return this.path.replace("silo-presets", "silo-metadata").replace(new RegExp(this.ext + "$"), "json");
        }

        return path__default.join(exports.configObject.repodir, this.subproject || "", "silo-metadata", this.name + ".json");
      }

      get immutable() {
        return this.name.includes("Constant") && !exports.configObject.updateImmutable;
      }

      async uploadPresetData(env, id) {
        var _this$relationships, _this$relationships$p, _this$relationships$p2;

        if (this.code.trim() === "NOUPLOAD") {
          write(chalk`code skipped {yellow :)}, `);
          return;
        }

        let code = this.code;
        let headers = {};
        let providerName = (_this$relationships = this.relationships) === null || _this$relationships === void 0 ? void 0 : (_this$relationships$p = _this$relationships.providerType) === null || _this$relationships$p === void 0 ? void 0 : (_this$relationships$p2 = _this$relationships$p.data) === null || _this$relationships$p2 === void 0 ? void 0 : _this$relationships$p2.name;

        if (!exports.configObject.skipHeader && (providerName === "SdviEvaluate" || providerName === "SdviEvalPro")) {
          write(chalk`generate header, `);
          let repodir = exports.configObject.repodir;
          let localpath = this.path.replace(repodir, "");
          if (localpath.startsWith("/")) localpath = localpath.substring(1);

          try {
            let {
              stdout: headerText
            } = await spawn({
              noecho: true
            }, "sh", [path__default.join(exports.configObject.repodir, `bin/header.sh`), moment(Date.now()).format("ddd YYYY/MM/DD hh:mm:ssa"), localpath]);
            code = headerText + code;
            write(chalk`header ok, `);
          } catch (e) {
            write(chalk`missing unix, `);
          }
        } //binary presets


        if (providerName == "Vantage") {
          code = code.toString("base64");
          headers["Content-Transfer-Encoding"] = "base64";
        }

        let res = await lib.makeAPIRequest({
          env,
          path: `/presets/${id}/providerData`,
          body: code,
          method: "PUT",
          fullResponse: true,
          timeout: 10000,
          headers
        });
        write(chalk`code up {yellow ${res.statusCode}}, `);
      }

      async grabMetadata(env) {
        let remote = await Preset.getByName(env, this.name);
        this.isGeneric = false;

        if (!remote) {
          throw new AbortError(`No file found on remote ${env} with name ${this.name}`);
        }

        this.data = remote.data;
        this.remote = env;
      }

      async deleteRemoteVersion(env, id = null) {
        if (lib.isLocalEnv(env)) return false;

        if (!id) {
          let remote = await Preset.getByName(env, this.name);
          id = remote.id;
        }

        return await lib.makeAPIRequest({
          env,
          path: `/presets/${id}`,
          method: "DELETE"
        });
      }

      async delete() {
        if (lib.isLocalEnv(this.remote)) return false;
        return await this.deleteRemoteVersion(this.remote, this.id);
      }

      async uploadCodeToEnv(env, includeMetadata, shouldTest = true) {
        if (!this.name) {
          let match;

          if (match = /^(#|["']{3})\s*EPH (\d+)/.exec(this.code.trim())) {
            let a = await Asset.getById(env, Number(match[2]));
            return a.startEphemeralEvaluateIdeal(this);
          } else {
            log(chalk`Failed uploading {red ${this.path}}. No name found.`);
            return;
          }
        }

        write(chalk`Uploading preset {green ${this.name}} to {green ${env}}: `);

        if (this.immutable) {
          log(chalk`{magenta IMMUTABLE}. Nothing to do.`);
          return;
        } //First query the api to see if this already exists.


        let remote = await Preset.getByName(env, this.name);

        if (remote) {
          //If it exists we can replace it
          write("replace, ");

          if (includeMetadata) {
            let payload = {
              data: {
                attributes: this.data.attributes,
                type: "presets"
              }
            };

            if (this.relationships.tagNames) {
              payload.relationships = {
                tagNames: this.relationships.tagNames
              };
            }

            let res = await lib.makeAPIRequest({
              env,
              path: `/presets/${remote.id}`,
              method: "PATCH",
              payload,
              fullResponse: true
            });
            write(chalk`metadata {yellow ${res.statusCode}}, `);

            if (res.statusCode == 500) {
              log(chalk`skipping code upload, did not successfully upload metadata`);
              return;
            }
          }

          await this.uploadPresetData(env, remote.id);
        } else {
          write("create, ");
          let metadata = {
            data: this.data
          };

          if (!this.relationships["providerType"]) {
            throw new AbortError("Cannot acclimatize shelled presets. (try creating it on the env first)");
          }

          await this.acclimatize(env);
          write("Posting to create preset... ");
          let res = await lib.makeAPIRequest({
            env,
            path: `/presets`,
            method: "POST",
            payload: metadata,
            timeout: 5000
          });
          let id = res.data.id;
          write(chalk`Created id {green ${id}}... Uploading Code... `);
          await this.uploadPresetData(env, id);
        }

        if (this.test[0] && shouldTest) {
          await this.runTest(env);
        } else {
          log("No tests. Done.");
        }
      }

      getLocalMetadata() {
        return JSON.parse(readFileSync(this.localmetadatapath, "utf-8"));
      }

      getLocalCode() {
        //todo fixup for binary presets, see uploadPresetData
        return readFileSync(this.path, "utf-8");
      }

      parseHeaderInfo() {
        var _$exec$, _$exec$2, _$exec$3, _$exec$4, _$exec$5, _$exec$6, _$exec$7;

        if (!this.header) return null;
        let abs = {
          built: (_$exec$ = /Built On:(.+)/.exec(this.header)[1]) === null || _$exec$ === void 0 ? void 0 : _$exec$.trim(),
          author: (_$exec$2 = /Author:(.+)/.exec(this.header)[1]) === null || _$exec$2 === void 0 ? void 0 : _$exec$2.trim(),
          build: (_$exec$3 = /Build:(.+)/.exec(this.header)[1]) === null || _$exec$3 === void 0 ? void 0 : _$exec$3.trim(),
          version: (_$exec$4 = /Version:(.+)/.exec(this.header)[1]) === null || _$exec$4 === void 0 ? void 0 : _$exec$4.trim(),
          branch: (_$exec$5 = /Branch:(.+)/.exec(this.header)[1]) === null || _$exec$5 === void 0 ? void 0 : _$exec$5.trim(),
          commit: (_$exec$6 = /Commit:(.+)/.exec(this.header)[1]) === null || _$exec$6 === void 0 ? void 0 : _$exec$6.trim(),
          local: (_$exec$7 = /Local File:(.+)/.exec(this.header)[1]) === null || _$exec$7 === void 0 ? void 0 : _$exec$7.trim()
        };
        let tryFormats = [[true, "ddd MMM DD HH:mm:ss YYYY"], [false, "ddd YYYY/MM/DD LTS"]];

        for (let [isUTC, format] of tryFormats) {
          let date;

          if (isUTC) {
            date = moment.utc(abs.built, format);
          } else {
            date = moment(abs.built, format);
          }

          if (!date.isValid()) continue;
          abs.offset = date.fromNow();
          break;
        }

        return abs;
      }

      async printRemoteInfo(env) {
        let remote = await Preset.getByName(env, this.name);
        await remote.downloadCode();
        let i = remote.parseHeaderInfo();

        if (i) {
          log(chalk`
                ENV: {red ${env}}, updated {yellow ~${i.offset}}
                Built on {blue ${i.built}} by {green ${i.author}}
                From ${i.build || "(unknown)"} on ${i.branch} ({yellow ${i.commit}})
            `.replace(/^[ \t]+/gim, "").trim());
        } else {
          log(chalk`No header on {red ${env}}`);
        }
      }

      async getInfo(envs) {
        await this.printDepends();

        for (let env of envs.split(",")) {
          await this.printRemoteInfo(env);
        }
      }

      async printDepends(indent = 0, locals = null, seen = {}) {
        let includeRegex = /@include "(.+)"/gim; //let includeRegex = /@include/g;

        let includes = [];
        let inc;

        while (inc = includeRegex.exec(this.code)) {
          includes.push(inc[1]);
        } //let includes = this.code
        //.split("\n")
        //.map(x => includeRegex.exec(x))
        //.filter(x => x)
        //.map(x => x[1]);
        //log(includes);


        if (!locals) {
          locals = new Collection((await loadLocals("silo-presets", Preset)));
        }

        log(Array(indent + 1).join(" ") + "- " + this.name);

        for (let include of includes) {
          if (seen[include]) {
            log(Array(indent + 1).join(" ") + "  - (seen) " + include);
          } else {
            seen[include] = true;
            let file = await locals.findByName(include);

            if (file) {
              await file.printDepends(indent + 2, locals, seen);
            } else {
              log(Array(indent + 1).join(" ") + "  - (miss) " + include);
            }
          }
        }
      }

    }

    defineAssoc(Preset, "_nameInner", "data.attributes.providerSettings.PresetName");
    defineAssoc(Preset, "_nameOuter", "data.attributes.name");
    defineAssoc(Preset, "id", "data.id");
    defineAssoc(Preset, "attributes", "data.attributes");
    defineAssoc(Preset, "relationships", "data.relationships");
    defineAssoc(Preset, "remote", "meta.remote");
    defineAssoc(Preset, "_code", "meta.code");
    defineAssoc(Preset, "_path", "meta.path");
    defineAssoc(Preset, "isGeneric", "meta.isGeneric");
    defineAssoc(Preset, "ext", "meta.ext");
    defineAssoc(Preset, "subproject", "meta.project");
    defineAssoc(Preset, "metastring", "meta.metastring");
    Preset.endpoint = "presets";

    class Notification extends RallyBase {
      constructor({
        data,
        remote
      }) {
        super();
        this.data = data;
        this.meta = {};
        this.remote = remote;
      }

      static async getAllPreCollect(notifications) {
        return notifications.sort((a, b) => {
          return a.attributes.type.localeCompare(b.attributes.type) || a.attributes.name.localeCompare(b.attributes.name);
        });
      }

      chalkPrint(pad = false) {
        let id = String("N-" + this.id);
        if (pad) id = id.padStart(4);
        return chalk`{green ${id}}: {blue ${this.type}} - {green ${this.name}}`;
      }

    }

    defineAssoc(Notification, "id", "data.id");
    defineAssoc(Notification, "name", "data.attributes.name");
    defineAssoc(Notification, "address", "data.attributes.address");
    defineAssoc(Notification, "type", "data.attributes.type");
    defineAssoc(Notification, "remote", "meta.remote");
    Notification.endpoint = "notificationPresets";

    class Rule extends RallyBase {
      constructor({
        path: path$1,
        data,
        remote,
        subProject
      } = {}) {
        super();

        if (path$1) {
          path$1 = path.resolve(path$1);

          try {
            let f = readFileSync(path$1, "utf-8");
            data = JSON.parse(readFileSync(path$1, "utf-8"));
          } catch (e) {
            if (e.code === "ENOENT") {
              if (exports.configObject.ignoreMissing) {
                this.missing = true;
                return undefined;
              } else {
                throw new AbortError("Could not load code of local file");
              }
            } else {
              throw new AbortError(`Unreadable JSON in ${path$1}. ${e}`);
            }
          }
        }

        this.meta = {};
        this.subproject = subProject;

        if (!data) {
          data = Rule.newShell();
        }

        this.data = data;
        this.remote = remote;
        this.isGeneric = !this.remote;
      }

      static newShell() {
        return {
          "attributes": {
            "description": "-",
            "priority": "PriorityNorm",
            "starred": false
          },
          "relationships": {},
          "type": "workflowRules"
        };
      }

      async acclimatize(env) {
        this.remote = env;
        let preset = await this.resolveField(Preset, "preset", false, "specific");
        let pNext = await this.resolveField(Rule, "passNext", false, "specific");
        let eNext = await this.resolveField(Rule, "errorNext", false, "specific");
        let proType = await this.resolveField(Provider, "providerType", false, "specific");
        let dynamicNexts = await this.resolveField(Rule, "dynamicNexts", true, "specific");
        let enterNotif = await this.resolveField(Notification, "enterNotifications", true, "specific");
        let errorNotif = await this.resolveField(Notification, "errorNotifications", true, "specific");
        let passNotif = await this.resolveField(Notification, "passNotifications", true, "specific");
      }

      async saveA(env) {
        if (lib.isLocalEnv(env)) return;
        return await this.createIfNotExist(env);
      }

      async saveB(env) {
        if (!this.isGeneric) {
          await this.resolve();
        }

        this.cleanup();

        if (lib.isLocalEnv(env)) {
          log(chalk`Saving rule {green ${this.name}} to {blue ${lib.envName(env)}}.`);
          writeFileSync(this.localpath, JSON.stringify(this.data, null, 4));
        } else {
          await this.acclimatize(env);
          await this.uploadRemote(env);
        }
      }

      get immutable() {
        return false;
      }

      async createIfNotExist(env) {
        write(chalk`First pass rule {green ${this.name}} to {green ${env}}: `);

        if (this.immutable) {
          log(chalk`{magenta IMMUTABLE}. Nothing to do.`);
          return;
        } //First query the api to see if this already exists.


        let remote = await Rule.getByName(env, this.name);
        this.idMap = this.idMap || {};

        if (remote) {
          this.idMap[env] = remote.id;
          log(chalk`exists ${remote.chalkPrint(false)}`);
          return;
        } //If it exists we can replace it


        write("create, ");
        let res = await lib.makeAPIRequest({
          env,
          path: `/workflowRules`,
          method: "POST",
          payload: {
            data: {
              attributes: {
                name: this.name
              },
              type: "workflowRules"
            }
          }
        });
        this.idMap = this.idMap || {};
        this.idMap[env] = res.data.id;
        write("id ");
        log(this.idMap[env]);
      }

      async patchStrip() {
        delete this.data.attributes.createdAt;
        delete this.data.attributes.starred;
        delete this.data.attributes.updatedAt; // TEMP FIX FOR BUG IN SDVI

        if (this.relationships.passMetadata && this.relationships.passMetadata[0]) {
          log("HAS PASS");
          log(this.name);
          log("HAS PASS");
        }

        delete this.relationships.passMetadata;

        if (this.relationships.errorMetadata && this.relationships.errorMetadata[0]) {
          log("HAS PASS");
          log(this.name);
          log("HAS PASS");
        }

        delete this.relationships.errorMetadata; // This is commented out because it was fixed.
        //for(let key in this.relationships){
        //let relationship = this.relationships[key];
        //if(!relationship.data || relationship.data instanceof Array && !relationship.data[0]){
        //delete this.relationships[key];
        //}
        //}
      }

      async uploadRemote(env) {
        write(chalk`Uploading rule {green ${this.name}} to {green ${env}}: `);

        if (this.immutable) {
          log(chalk`{magenta IMMUTABLE}. Nothing to do.`);
          return;
        }

        if (this.idMap[env]) {
          this.remote = env;
          await this.patchStrip();
          this.data.id = this.idMap[env]; //If it exists we can replace it

          write("replace, ");
          let res = await lib.makeAPIRequest({
            env,
            path: `/workflowRules/${this.idMap[env]}`,
            method: "PATCH",
            payload: {
              data: this.data
            },
            fullResponse: true
          });
          log(chalk`response {yellow ${res.statusCode}}`);

          if (res.statusCode !== 200) {
            log(res.body);
            log(JSON.stringify(this.data, null, 4));
          }
        } else {
          throw Error("Bad idmap!");
        }
      }

      get localpath() {
        return path.join(exports.configObject.repodir, this.subproject || "", "silo-rules", this.name + ".json");
      }

      async resolve() {
        let preset = await this.resolveField(Preset, "preset", false); //log(preset);

        let pNext = await this.resolveField(Rule, "passNext", false);
        let eNext = await this.resolveField(Rule, "errorNext", false);
        let proType = await this.resolveField(Provider, "providerType", false); //log("Dynamic nexts")

        let dynamicNexts = await this.resolveField(Rule, "dynamicNexts", true); //log(dynamicNexts);

        let enterNotif = await this.resolveField(Notification, "enterNotifications", true);
        let errorNotif = await this.resolveField(Notification, "errorNotifications", true);
        let passNotif = await this.resolveField(Notification, "passNotifications", true); //TODO Unsupported

        delete this.relationships["enterMetadata"];
        delete this.relationships["errorMetadata"];
        this.isGeneric = true;
        return {
          preset,
          proType,
          pNext,
          eNext,
          dynamicNexts,
          errorNotif,
          enterNotif,
          passNotif
        };
      }

      chalkPrint(pad = true) {
        let id = String("R-" + (this.remote && this.remote + "-" + this.id || "LOCAL"));
        let sub = "";

        if (this.subproject) {
          sub = chalk`{yellow ${this.subproject}}`;
        }

        if (pad) id = id.padStart(10);

        try {
          return chalk`{green ${id}}: ${sub}{blue ${this.name}}`;
        } catch (e) {
          return this.data;
        }
      }

    }

    defineAssoc(Rule, "name", "data.attributes.name");
    defineAssoc(Rule, "description", "data.attributes.description");
    defineAssoc(Rule, "id", "data.id");
    defineAssoc(Rule, "relationships", "data.relationships");
    defineAssoc(Rule, "isGeneric", "meta.isGeneric");
    defineAssoc(Rule, "remote", "meta.remote");
    defineAssoc(Rule, "subproject", "meta.project");
    defineAssoc(Rule, "idMap", "meta.idMap");
    Rule.endpoint = "workflowRules";

    //Move project into silo metadata
    //move autotest into silo metadata
    //

    class SupplyChain {
      constructor(startingRule, stopRule) {
        if (startingRule) {
          this.startingRule = startingRule;
          this.stopRule = stopRule;
          this.remote = startingRule.remote;
        }
      }

      async downloadPresetCode(objs = this.allPresets) {
        log("Downloading code... ");
        await lib.keepalive(objs.arr.map(x => () => x.downloadCode()));
      }

      async calculate() {
        log("Getting rules... ");
        this.allRules = await Rule.getAll(this.remote);
        log(this.allRules.length);
        log("Getting presets... ");
        this.allPresets = await Preset.getAll(this.remote);
        log(this.allPresets.length);
        log("Getting providers... ");
        this.allProviders = await Provider.getAll(this.remote);
        log(this.allProviders.length);
        log("Getting notifications... ");
        this.allNotifications = await Notification.getAll(this.remote);
        log(this.allNotifications.length);

        if (!this.startingRule) {
          this.rules = this.allRules;
          this.presets = this.allPresets;
          this.notifications = new Collection([]);
          await this.downloadPresetCode();
          return;
        } else {
          await this.downloadPresetCode();
        }

        log("Done!"); //Now we have everything we need to find a whole supply chain

        write("Calculating Supply chain... ");
        log(this.startingRule.chalkPrint());
        let allRuleNames = this.allRules.arr.map(x => x.name).filter(x => x.length >= 4);
        let allPresetNames = this.allPresets.arr.map(x => x.name).filter(x => x.length >= 4);
        let allNotifNames = this.allNotifications.arr.map(x => x.name).filter(x => x.length >= 4);
        let requiredNotifications = new Set();
        let ruleQueue = [this.startingRule];
        let presetQueue = [];

        for (let currentRule of ruleQueue) {
          if (currentRule === this.stopRule) continue;
          let {
            eNext,
            pNext,
            preset,
            passNotif,
            errorNotif,
            enterNotif
          } = await currentRule.resolve();
          passNotif.forEach(n => requiredNotifications.add(n));
          enterNotif.forEach(n => requiredNotifications.add(n));
          errorNotif.forEach(n => requiredNotifications.add(n));
          if (eNext && !ruleQueue.includes(eNext)) ruleQueue.push(eNext);
          if (pNext && !ruleQueue.includes(eNext)) ruleQueue.push(pNext);
          let neededPresets = preset.findStringsInCode(allPresetNames);
          neededPresets = neededPresets.map(x => this.allPresets.findByName(x));
          let neededRules = preset.findStringsInCode(allRuleNames);
          neededRules = neededRules.map(x => this.allRules.findByName(x));
          preset.findStringsInCode(allNotifNames).map(str => this.allNotifications.findByName(str)).forEach(notif => requiredNotifications.add(notif));
          neededPresets.push(preset);

          for (let p of neededPresets) if (!presetQueue.includes(p)) presetQueue.push(p);

          for (let p of neededRules) if (!ruleQueue.includes(p)) ruleQueue.push(p);

          if (exports.configObject.verbose) {
            write(currentRule.chalkPrint(false));
            log(":");
            write("  ");
            write(preset.chalkPrint(false));
            log(":");
            write("  Pass Next: ");
            if (pNext) write(pNext.chalkPrint(false));else write("None");
            log("");
            write("  Err  Next: ");
            if (eNext) write(eNext.chalkPrint(false));else write("None");
            log("");
            log("  Rules:");

            for (let p of neededRules) log("    " + p.chalkPrint(true));

            log("  Presets:");

            for (let p of neededPresets) log("    " + p.chalkPrint(true));

            log("\n");
          }
        }

        log("Done!");
        this.rules = new Collection(ruleQueue);
        this.presets = new Collection(presetQueue);
        requiredNotifications.delete(undefined);
        this.notifications = new Collection([...requiredNotifications]);
      }

      async log() {
        if (this.notifications.arr.length > 0) {
          log("Required notifications: ");
          this.notifications.log();
        }

        if (this.rules.arr.length > 0) {
          write("Required rules: ");
          log(this.rules.arr.length);
          this.rules.log();
        }

        if (this.presets.arr.length > 0) {
          write("Required presets: ");
          log(this.presets.arr.length);
          this.presets.log();
        }

        if (exports.configObject.rawOutput) {
          return {
            presets: this.presets.arr,
            rules: this.rules.arr,
            notifications: this.notifications.arr
          };
        }
      }

      async deleteTo(env) {
        for (let preset of this.presets) {
          try {
            await preset.deleteRemoteVersion(env);
          } catch (e) {
            log(e);
          }
        }
      }

      async syncTo(env) {
        for (let preset of this.presets) {
          try {
            await preset.save(env);
          } catch (e) {
            log(e);
          }
        }

        if (this.rules.arr[0]) {
          log("Starting create phase for rules");

          for (let rule of this.rules) {
            try {
              await rule.saveA(env);
            } catch (e) {
              log(e);
            }
          }

          log("OK");
          log("Starting link phase for rules");
          Rule.removeCache(env);

          for (let rule of this.rules) {
            try {
              await rule.saveB(env);
            } catch (e) {
              log(e);
            }
          }
        }
      }

    }

    class User extends RallyBase {
      constructor({
        data,
        remote
      }) {
        super();
        this.data = data;
        this.meta = {};
        this.remote = remote;
      }

      chalkPrint(pad = false) {
        let id = String("U-" + this.id);
        if (pad) id = id.padStart(7);
        return chalk`{green ${id}}: {blue ${this.name}}`;
      }

    }

    defineAssoc(User, "id", "data.id");
    defineAssoc(User, "name", "data.attributes.name");
    defineAssoc(User, "email", "data.attributes.email");
    defineAssoc(User, "remote", "meta.remote");
    User.endpoint = "users";

    class Tag extends RallyBase {
      constructor({
        data,
        remote
      } = {}) {
        super();
        this.meta = {};
        this.remote = remote;
        this.data = data; //this.data.attributes.rallyConfiguration = undefined;
        //this.data.attributes.systemManaged = undefined;
      }

      chalkPrint(pad = true) {
        let id = String("T-" + this.remote + "-" + this.id);
        if (pad) id = id.padStart(10);
        let prefix = this.curated ? "blue +" : "red -";
        return chalk`{green ${id}}: {${prefix}${this.name}}`;
      }

      static async create(env, name, {
        notCurated
      } = {}) {
        return new Tag({
          data: await lib.makeAPIRequest({
            env,
            path: `/${this.endpoint}`,
            method: "POST",
            payload: {
              data: {
                attributes: {
                  name,
                  curated: notCurated ? false : true
                },
                type: "tagNames"
              }
            }
          }),
          remote: env
        });
      }

    }

    defineAssoc(Tag, "id", "data.id");
    defineAssoc(Tag, "attributes", "data.attributes");
    defineAssoc(Tag, "relationships", "data.relationships");
    defineAssoc(Tag, "name", "data.attributes.name");
    defineAssoc(Tag, "curated", "data.attributes.curated");
    defineAssoc(Tag, "remote", "meta.remote");
    Tag.endpoint = "tagNames";

    async function findLineInFile(renderedPreset, lineNumber) {
      let trueFileLine = lineNumber;
      let linedRenderedPreset = renderedPreset.split("\n").slice(2, -2);
      renderedPreset = renderedPreset.split("\n").slice(2, -2).join("\n");
      let includeLocation = renderedPreset.split("\n").filter(x => x.includes("@include"));
      let endIncludeNumber = -1,
          addTabDepth = 2;
      let lineBeforeIncludeStatement = '';
      let withinInclude = true;

      if (lineNumber > linedRenderedPreset.indexOf(includeLocation[includeLocation.length - 1])) {
        addTabDepth = 0;
        withinInclude = false;
      }

      for (let index = includeLocation.length - 1; index >= 0; index--) {
        let currIncludeIndex = linedRenderedPreset.indexOf(includeLocation[index]);
        let tabDepth = includeLocation[index].split("  ").length;

        if (lineNumber > currIncludeIndex) {
          if (includeLocation[index].split(" ").filter(Boolean)[1] != "ERROR:") {
            if (lineBeforeIncludeStatement.split("  ").length == tabDepth && withinInclude) {
              trueFileLine = trueFileLine - currIncludeIndex;
              break;
            } else if (lineBeforeIncludeStatement.split("  ").length + addTabDepth == tabDepth && endIncludeNumber == -1) {
              endIncludeNumber = currIncludeIndex;
            } else if (lineBeforeIncludeStatement.split("  ").length + addTabDepth == tabDepth) {
              trueFileLine = trueFileLine - (endIncludeNumber - currIncludeIndex);
              endIncludeNumber = -1;
            }
          }
        } else {
          lineBeforeIncludeStatement = includeLocation[index];
        }
      }

      let funcLine = "";

      for (let line of linedRenderedPreset.slice(0, lineNumber).reverse()) {
        let match = /def (\w+)/.exec(line);

        if (match) {
          funcLine = match[1];
          break;
        }
      }

      let includeFilename;

      if (lineBeforeIncludeStatement != "") {
        includeFilename = lineBeforeIncludeStatement.slice(1).trim().slice(14, -1);
      } else {
        includeFilename = null;
      }

      if (includeLocation.length !== 0) {
        trueFileLine -= 1;
        lineNumber -= 1;
      }

      return {
        lineNumber: trueFileLine,
        includeFilename,
        line: linedRenderedPreset[lineNumber],
        funcLine
      };
    }
    function printOutLine(eLine) {
      return log(chalk`{blue ${eLine.includeFilename || "Main"}}:{green ${eLine.lineNumber}} in ${eLine.funcLine}
${eLine.line}`);
    }
    async function getInfo(env, jobid) {
      log(env, jobid);
      let trace = lib.makeAPIRequest({
        env,
        path: `/jobs/${jobid}/artifacts/trace`
      }).catch(x => null);
      let renderedPreset = lib.makeAPIRequest({
        env,
        path: `/jobs/${jobid}/artifacts/preset`
      }).catch(x => null);
      let result = lib.makeAPIRequest({
        env,
        path: `/jobs/${jobid}/artifacts/result`
      }).catch(x => null);
      let error = lib.makeAPIRequest({
        env,
        path: `/jobs/${jobid}/artifacts/error`
      }).catch(x => null);
      let output = lib.makeAPIRequest({
        env,
        path: `/jobs/${jobid}/artifacts/output`
      }).catch(x => null);
      [trace, renderedPreset, result, output, error] = await Promise.all([trace, renderedPreset, result, output, error]);
      return {
        trace,
        renderedPreset,
        result,
        output,
        error
      };
    }
    async function parseTrace(env, jobid) {
      let {
        trace,
        renderedPreset
      } = await getInfo(env, jobid);
      let lineNumber = -1;
      let errorLines = [];
      let shouldBreak = 0;

      for (let tr of trace.split("\n\n").reverse()) {
        errorLines.push(tr);
        shouldBreak--;
        if (tr.includes("Exception")) shouldBreak = 1;
        if (tr.includes("raised")) shouldBreak = 1;
        if (!shouldBreak) break;
      }

      let errorList = [];

      for (let errLine of errorLines) {
        lineNumber = /^[\w ]+:(\d+):/g.exec(errLine);

        if (lineNumber && lineNumber[1]) {
          errorList.push((await findLineInFile(renderedPreset, lineNumber[1])));
        } else {
          errorList.push(errLine);
        }
      }

      return errorList;
    }
    const Trace = {
      parseTrace,
      printOutLine,
      getInfo,
      findLineInFile
    };

    require("source-map-support").install();
    const rallyFunctions = {
      async bestPagintation() {
        global.silentAPI = true;

        for (let i = 10; i <= 30; i += 5) {
          console.time("test with " + i);
          let dl = await lib.indexPathFast("DEV", `/workflowRules?page=1p${i}`);
          console.timeEnd("test with " + i);
        }
      },

      async uploadPresets(env, presets, createFunc = () => false) {
        for (let preset of presets) {
          await preset.uploadCodeToEnv(env, createFunc);
        }
      },

      //Dummy test access
      async testAccess(env) {
        if (lib.isLocalEnv(env)) {
          //TODO
          return true;
        }

        let result = await lib.makeAPIRequest({
          env,
          path: "/providers?page=1p1",
          fullResponse: true,
          timeout: 1000
        });
        return result.statusCode;
      }

    };

    exports.APIError = APIError;
    exports.AbortError = AbortError;
    exports.Asset = Asset;
    exports.Collection = Collection;
    exports.FileTooLargeError = FileTooLargeError;
    exports.Notification = Notification;
    exports.Preset = Preset;
    exports.ProtectedEnvError = ProtectedEnvError;
    exports.Provider = Provider;
    exports.RallyBase = RallyBase;
    exports.Rule = Rule;
    exports.SupplyChain = SupplyChain;
    exports.Tag = Tag;
    exports.Trace = Trace;
    exports.UnconfiguredEnvError = UnconfiguredEnvError;
    exports.User = User;
    exports.lib = lib;
    exports.loadConfig = loadConfig;
    exports.loadConfigFromArgs = loadConfigFromArgs;
    exports.rallyFunctions = rallyFunctions;
    exports.setConfig = setConfig;
    exports.sleep = sleep;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=web.js.map
