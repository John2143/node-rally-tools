(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('os'), require('fs'), require('child_process'), require('perf_hooks'), require('chalk'), require('request-promise'), require('path'), require('moment'), require('node-fetch')) :
  typeof define === 'function' && define.amd ? define(['exports', 'os', 'fs', 'child_process', 'perf_hooks', 'chalk', 'request-promise', 'path', 'moment', 'node-fetch'], factory) :
  (factory((global.RallyTools = {}),global.os,global.fs,global.child_process,global.perf_hooks,global.chalk$1,global.rp,global.path,global.moment,global.fetch));
}(this, (function (exports,os,fs,child_process,perf_hooks,chalk$1,rp,path,moment,fetch) { 'use strict';

  var fs__default = 'default' in fs ? fs['default'] : fs;
  chalk$1 = chalk$1 && chalk$1.hasOwnProperty('default') ? chalk$1['default'] : chalk$1;
  rp = rp && rp.hasOwnProperty('default') ? rp['default'] : rp;
  var path__default = 'default' in path ? path['default'] : path;
  moment = moment && moment.hasOwnProperty('default') ? moment['default'] : moment;
  fetch = fetch && fetch.hasOwnProperty('default') ? fetch['default'] : fetch;

  function _asyncIterator(iterable) {
    var method;

    if (typeof Symbol === "function") {
      if (Symbol.asyncIterator) {
        method = iterable[Symbol.asyncIterator];
        if (method != null) return method.call(iterable);
      }

      if (Symbol.iterator) {
        method = iterable[Symbol.iterator];
        if (method != null) return method.call(iterable);
      }
    }

    throw new TypeError("Object is not async iterable");
  }

  function _AwaitValue(value) {
    this.wrapped = value;
  }

  function _AsyncGenerator(gen) {
    var front, back;

    function send(key, arg) {
      return new Promise(function (resolve, reject) {
        var request = {
          key: key,
          arg: arg,
          resolve: resolve,
          reject: reject,
          next: null
        };

        if (back) {
          back = back.next = request;
        } else {
          front = back = request;
          resume(key, arg);
        }
      });
    }

    function resume(key, arg) {
      try {
        var result = gen[key](arg);
        var value = result.value;
        var wrappedAwait = value instanceof _AwaitValue;
        Promise.resolve(wrappedAwait ? value.wrapped : value).then(function (arg) {
          if (wrappedAwait) {
            resume("next", arg);
            return;
          }

          settle(result.done ? "return" : "normal", arg);
        }, function (err) {
          resume("throw", err);
        });
      } catch (err) {
        settle("throw", err);
      }
    }

    function settle(type, value) {
      switch (type) {
        case "return":
          front.resolve({
            value: value,
            done: true
          });
          break;

        case "throw":
          front.reject(value);
          break;

        default:
          front.resolve({
            value: value,
            done: false
          });
          break;
      }

      front = front.next;

      if (front) {
        resume(front.key, front.arg);
      } else {
        back = null;
      }
    }

    this._invoke = send;

    if (typeof gen.return !== "function") {
      this.return = undefined;
    }
  }

  if (typeof Symbol === "function" && Symbol.asyncIterator) {
    _AsyncGenerator.prototype[Symbol.asyncIterator] = function () {
      return this;
    };
  }

  _AsyncGenerator.prototype.next = function (arg) {
    return this._invoke("next", arg);
  };

  _AsyncGenerator.prototype.throw = function (arg) {
    return this._invoke("throw", arg);
  };

  _AsyncGenerator.prototype.return = function (arg) {
    return this._invoke("return", arg);
  };

  function _wrapAsyncGenerator(fn) {
    return function () {
      return new _AsyncGenerator(fn.apply(this, arguments));
    };
  }

  function _awaitAsyncGenerator(value) {
    return new _AwaitValue(value);
  }

  function _asyncGeneratorDelegate(inner, awaitWrap) {
    var iter = {},
        waiting = false;

    function pump(key, value) {
      waiting = true;
      value = new Promise(function (resolve) {
        resolve(inner[key](value));
      });
      return {
        done: false,
        value: awaitWrap(value)
      };
    }

    if (typeof Symbol === "function" && Symbol.iterator) {
      iter[Symbol.iterator] = function () {
        return this;
      };
    }

    iter.next = function (value) {
      if (waiting) {
        waiting = false;
        return value;
      }

      return pump("next", value);
    };

    if (typeof inner.throw === "function") {
      iter.throw = function (value) {
        if (waiting) {
          waiting = false;
          throw value;
        }

        return pump("throw", value);
      };
    }

    if (typeof inner.return === "function") {
      iter.return = function (value) {
        return pump("return", value);
      };
    }

    return iter;
  }

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

  //function retuns obj.a.b.c

  function deepAccess(obj, path$$1) {
    let o = obj;

    for (let key of path$$1) {
      if (!o) return [];
      o = o[key];
    }

    return o;
  } //This takes a class as the first argument, then adds a getter/setter pair that
  //corresponds to an object in this.data


  function defineAssoc(classname, shortname, path$$1) {
    path$$1 = path$$1.split(".");
    let lastKey = path$$1.pop();
    Object.defineProperty(classname.prototype, shortname, {
      get() {
        return deepAccess(this, path$$1)[lastKey];
      },

      set(val) {
        deepAccess(this, path$$1)[lastKey] = val;
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

      if (options.stdin) {
        options.stdin(cp.stdin);
      }

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
  async function runGit(oks, ...args) {
    if (typeof oks === "number") {
      oks = [oks];
    } else if (typeof oks === "undefined") {
      oks = [0];
    }

    let g = await spawn({
      noecho: true
    }, "git", args);
    if (exports.configObject.verbose) log(`git ${args.join(" ")}`);

    if (!oks.includes(g.exitCode)) {
      log(g.stderr);
      log(g.stdout);
      throw new AbortError(chalk`Failed to run git ${args} {red ${g.exitCode}}`);
    }

    return [g.stdout, g.stderr];
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
      path: path$$1,
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

      if (path$$1 && path$$1.startsWith("/v1.0/")) {
        rally_api = rally_api.replace("/api/v2", "/api");
      }

      path$$1 = path_full || rally_api + path$$1;

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
        log(`${method} @ ${path$$1}`);
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
        uri: path$$1,
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


    static async indexPath(env, path$$1) {
      let opts = typeof env === "string" ? {
        env,
        path: path$$1
      } : env;
      opts.maxParallelRequests = 1;
      let index = new IndexObject(opts);
      return await index.fullResults();
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

    static async keepalive(funcs) {
      for (let f of funcs) {
        await f();
      }
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


    static async indexPathFast(env, path$$1) {
      let opts = typeof env === "string" ? {
        env,
        path: path$$1
      } : env;
      let index = new IndexObject(opts);
      return await index.fullResults();
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
{red ${!response.body ? "Request timed out" : "Bad response from API"}}
===============================
        `);
      this.response = response;
      this.opts = opts;
      this.body = body; //Error.captureStackTrace(this, this.constructor);

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
  class ResoultionError extends Error {
    constructor(name, env) {
      super(chalk$1`Error during name resolution: '{blue ${name}}' is not mapped on {green ${env}}`);
      this.name = "Name Resoultion Error";
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
          filter: `name=${name}` + (qs && qs.filter ? qs.filter : "")
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
        } else {
          throw new ResoultionError(`(id = ${dataObj.id})`, this.remote);
        }
      } else if (direction == "specific") {
        obj = await type.getByName(this.remote, dataObj.name);

        if (obj) {
          dataObj.id = obj.id;
        } else {
          throw new ResoultionError(dataObj.name, this.remote);
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
  function* zip(...items) {
    let iters = items.map(x => x[Symbol.iterator]());

    for (;;) {
      let r = [];

      for (let i of iters) {
        let next = i.next();
        if (next.done) return;
        r.push(next.value);
      }

      yield r;
    }
  }
  function unordered(_x) {
    return _unordered.apply(this, arguments);
  }

  function _unordered() {
    _unordered = _wrapAsyncGenerator(function* (proms) {
      let encapsulatedPromises = proms.map(async (x, i) => [i, await x]);

      while (encapsulatedPromises.length > 0) {
        let [ind, result] = yield _awaitAsyncGenerator(Promise.race(encapsulatedPromises.filter(x => x)));
        yield result;
        encapsulatedPromises[ind] = undefined;
      }
    });
    return _unordered.apply(this, arguments);
  }

  function* range(start, end) {
    if (end === undefined) {
      end = start;
      start = 0;
    }

    while (start < end) yield start++;
  }
  class IndexObject {
    //normal opts from any makeAPIRequest
    //Note that full_response and pages won't work.
    //
    //if you want to start from another page, use `opts.start`
    //opts.observe: async function(jsonData) => jsonData. Transform the data from the api
    //opts.maxParallelRequests: number of max api requests to do at once
    //opts.noCollect: return [] instead of the full data
    constructor(opts) {
      this.opts = opts;
    }

    linkToPage(page) {
      return this.baselink.replace(`page=1p`, `page=${page}p`);
    }

    async initializeFirstRequest() {
      //Create a copy of the options in case we need to have a special first request
      this.start = this.opts.start || 1;
      let initOpts = { ...this.opts
      };

      if (this.opts.pageSize) {
        initOpts.qs = { ...this.opts.qs
        };
        initOpts.qs.page = `${this.start}p${this.opts.pageSize}`;
      }

      this.allResults = []; //we make 1 non-parallel request to the first page so we know how to
      //format the next requests

      let json = await lib.makeAPIRequest(initOpts);
      if (this.opts.observe) json = await this.opts.observe(json);
      if (!this.opts.noCollect) this.allResults.push(json);
      this.baselink = json.links.first;
      this.currentPageRequest = this.start;
      this.hasHit404 = false;
    }

    getNextRequestLink() {
      this.currentPageRequest++;
      return [this.currentPageRequest, this.linkToPage(this.currentPageRequest)];
    } ///promiseID is the id in `currentPromises`, so that it can be marked as
    ///done inside the promise array. promiseID is a number from 0 to
    ///maxparallel-1


    async getNextRequestPromise(promiseID) {
      let [page, path_full] = this.getNextRequestLink();
      return [promiseID, page, await lib.makeAPIRequest({ ...this.opts,
        path_full,
        fullResponse: true
      })];
    }

    cancel() {
      this.willCancel = true;
    }

    async fullResults() {
      await this.initializeFirstRequest();
      let maxParallelRequests = this.opts.maxParallelRequests || this.opts.chunksize || 20;
      let currentPromises = []; //generate the first set of requests. Everything after this will re-use these i promiseIDs

      for (let i = 0; i < maxParallelRequests; i++) {
        currentPromises.push(this.getNextRequestPromise(currentPromises.length));
      }

      for (;;) {
        let [promiseID, page, requestResult] = await Promise.race(currentPromises.filter(x => x));

        if (this.willCancel) {
          return null;
        }

        if (requestResult.statusCode === 404) {
          this.hasHit404 = true;
        } else if (requestResult.statusCode === 200) {
          let json = JSON.parse(requestResult.body);
          if (this.opts.observe) json = await this.opts.observe(json);
          if (!this.opts.noCollect) this.allResults.push(json);
          if (json.data.length === 0) this.hasHit404 = true;
        } else {
          throw new APIError(requestResult, `(unknown args) page ${page}`, null);
        }

        if (this.hasHit404) {
          currentPromises[promiseID] = null;
        } else {
          currentPromises[promiseID] = this.getNextRequestPromise(promiseID);
        }

        if (currentPromises.filter(x => x).length === 0) break;
      }

      let all = [];

      for (let result of this.allResults) {
        for (let item of result.data) {
          all.push(item);
        }
      }

      return all;
    }

  }
  function orderedObjectKeys(obj) {
    let keys = Object.keys(obj).sort();
    let newDict = {};

    for (let key of keys) {
      if (Array.isArray(obj[key])) {
        newDict[key] = obj[key].map(x => orderedObjectKeys(x));
      } else if (typeof obj[key] === "object" && obj[key]) {
        newDict[key] = orderedObjectKeys(obj[key]);
      } else {
        newDict[key] = obj[key];
      }
    }

    return newDict;
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
          if (this.name === "Vantage") return "zip";
          if (this.name === "ffmpeg") return "txt";
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

  let home;

  if (os.homedir) {
    home = os.homedir();
  }

  const colon = /:/g;
  const siloLike = /(silo\-\w+?)s?\/([^\/]+)\.([\w1234567890]+)$/g;
  function pathTransform(path$$1) {
    if (path$$1.includes(":")) {
      //Ignore the first colon in window-like filesystems
      path$$1 = path$$1.slice(0, 3) + path$$1.slice(3).replace(colon, "--");
    }

    if (exports.configObject.invertedPath) {
      path$$1 = path$$1.replace(siloLike, "$2-$1.$3");
    }

    if (path$$1.includes("\\342\\200\\220")) {
      path$$1 = path$$1.replace("\\342\\200\\220", "‐");
    }

    return path$$1;
  }
  function readFileSync(path$$1, options) {
    return fs__default.readFileSync(pathTransform(path$$1), options);
  } //Create writefilesync, with ability to create directory if it doesnt exist

  function writeFileSync(path$$1, data, options, dircreated = false) {
    path$$1 = pathTransform(path$$1);

    try {
      return fs__default.writeFileSync(path$$1, data, options);
    } catch (e) {
      if (dircreated) throw e;
      let directory = path.dirname(path$$1);

      try {
        fs__default.statSync(directory);
        throw e;
      } catch (nodir) {
        fs__default.mkdirSync(directory);
        return writeFileSync(path$$1, data, options, true);
      }
    }
  }

  class Rule extends RallyBase {
    constructor({
      path: path$$1,
      data,
      remote,
      subProject
    } = {}) {
      super();

      if (path$$1) {
        path$$1 = path.resolve(path$$1);

        try {
          let f = readFileSync(path$$1, "utf-8");
          data = JSON.parse(readFileSync(path$$1, "utf-8"));
        } catch (e) {
          if (e.code === "ENOENT") {
            if (exports.configObject.ignoreMissing) {
              this.missing = true;
              return undefined;
            } else {
              throw new AbortError("Could not load code of local file");
            }
          } else {
            throw new AbortError(`Unreadable JSON in ${path$$1}. ${e}`);
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
      delete this.data.relationships.transitions;
      delete this.data.meta;
      delete this.data.attributes.updatedAt;
      delete this.data.attributes.createdAt;
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
        writeFileSync(this.localpath, JSON.stringify(orderedObjectKeys(this.data), null, 4));
      } else {
        await this.acclimatize(env);
        return await this.uploadRemote(env);
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
      delete this.data.attributes.updatedAt;
      this.nexts = this.data.relationships.dynamicNexts;
      delete this.data.relationships.dynamicNexts; // TEMP FIX FOR BUG IN SDVI

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
        this.data.id = this.idMap[env];
        this.relationships.transitions = {
          data: await this.constructWorkflowTransitions()
        }; //If it exists we can replace it

        write("replace, ");
        let res = await lib.makeAPIRequest({
          env,
          path: `/workflowRules/${this.idMap[env]}`,
          method: "PUT",
          payload: {
            data: this.data
          },
          fullResponse: true
        });
        log(chalk`response {yellow ${res.statusCode}}`);

        if (res.statusCode > 210) {
          return `Failed to upload: ${res.body}`;
        }
      } else {
        throw Error("Bad idmap!");
      }
    }

    get localpath() {
      return this._localpath || path.join(exports.configObject.repodir, this.subproject || "", "silo-rules", this.name + ".json");
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

    async constructWorkflowTransitions() {
      var _this$nexts;

      let transitions = [];
      let dynamicNexts = ((_this$nexts = this.nexts) === null || _this$nexts === void 0 ? void 0 : _this$nexts.data) || [];
      if (dynamicNexts.length == 0) return [];
      write(chalk`transition mapping: `);

      for (let transition of dynamicNexts) {
        write(chalk`{green ${transition.meta.transition}}:`);
        let filters = {
          toWorkflowRuleId: transition.id,
          name: transition.meta.transition,
          fromWorkflowRuleId: this.id
        };
        let res = await lib.makeAPIRequest({
          env: this.remote,
          path: `/workflowTransitions`,
          method: "GET",
          qs: {
            filter: JSON.stringify(filters)
          }
        });
        let newTransitionId = 0;

        if (res.data.length > 0) {
          write(chalk`{blue found} `);
          let firstTransition = res.data[0];
          newTransitionId = firstTransition.id;
        } else {
          write(chalk`{magenta create} `);
          let newTransitionPayload = {
            "attributes": {
              "name": filters.name
            },
            "relationships": {
              "fromWorkflowRule": {
                "data": {
                  "id": filters.fromWorkflowRuleId,
                  "type": "workflowRules"
                }
              },
              "toWorkflowRule": {
                "data": {
                  "id": filters.toWorkflowRuleId,
                  "type": "workflowRules"
                }
              }
            },
            "type": "workflowTransitions"
          };
          let newTransition = await lib.makeAPIRequest({
            env: this.remote,
            path: `/workflowTransitions`,
            method: "POST",
            payload: {
              data: newTransitionPayload
            }
          });
          newTransitionId = newTransition.data.id;
        }

        transitions.push({
          "id": newTransitionId,
          "type": "workflowTransitions"
        });
        write(chalk`{yellow ${newTransitionId}}, `);
      }

      write(chalk`t. done, `);
      return transitions;
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
  defineAssoc(Rule, "nexts", "meta.nexts");
  Rule.endpoint = "workflowRules";

  const inquirer = importLazy("inquirer");
  const readdir = importLazy("recursive-readdir");
  let hasAutoCompletePrompt = false;
  function addAutoCompletePrompt() {
    if (hasAutoCompletePrompt) return;
    hasAutoCompletePrompt = true;
    inquirer.registerPrompt("autocomplete", require("inquirer-autocomplete-prompt"));
  }
  async function loadLocals(path$$1, Class) {
    let basePath = exports.configObject.repodir;
    let objs = (await readdir(basePath)).filter(name => name.includes(path$$1)).filter(name => !path.basename(name).startsWith(".")).map(name => new Class({
      path: name
    }));
    return objs;
  }
  async function selectLocal(path$$1, typeName, Class, canSelectNone = true) {
    addAutoCompletePrompt();
    let objs = await loadLocals(path$$1, Class);
    let objsMap = objs.map(x => ({
      name: x.chalkPrint(true),
      value: x
    }));
    return await selectLocalMenu(objsMap, typeName, canSelectNone);
  }
  async function selectLocalMenu(objs, typeName, canSelectNone = true) {
    let none = {
      name: chalk`      {red None}: {red None}`,
      value: null
    };
    if (canSelectNone) objs.unshift(none);
    let q = await inquirer.prompt([{
      type: "autocomplete",
      name: "obj",
      message: `What ${typeName} do you want?`,
      source: async (sofar, input) => {
        return objs.filter(x => input ? x.name.toLowerCase().includes(input.toLowerCase()) : true);
      }
    }]);
    return q.obj;
  }
  async function selectPreset({
    purpose = "preset",
    canSelectNone
  }) {
    return selectLocal("silo-presets", purpose, Preset, canSelectNone);
  }
  async function askInput(question, def) {
    return (await inquirer.prompt([{
      type: "input",
      name: "ok",
      message: question,
      default: def
    }])).ok;
  }
  async function askQuestion(question) {
    return (await inquirer.prompt([{
      type: "confirm",
      name: "ok",
      message: question
    }])).ok;
  }
  async function saveConfig(newConfigObject, {
    ask = true,
    print = true
  } = {}) {
    //Create readable json and make sure the user is ok with it
    let newConfig = JSON.stringify(newConfigObject, null, 4);
    if (print) log(newConfig); //-y or --set will make this not prompt

    if (ask && !(await askQuestion("Write config to disk?"))) return;
    fs.writeFileSync(exports.configFile, newConfig, {
      mode: 0o600
    });
    log(chalk`Created file {green ${exports.configFile}}.`);
  }

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

    async getContent(force = false, noRedirect = false) {
      if (!this.canBeDownloaded() && !force) {
        throw new FileTooLargeError(this);
      }

      let d = lib.makeAPIRequest({
        env: this.remote,
        fullPath: this.contentLink,
        qs: {
          "no-redirect": noRedirect
        }
      });

      if (noRedirect) {
        return (await d).links.content;
      } else {
        return d;
      }
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
  async function getArtifact(env, artifact, jobid) {
    let path$$1 = `/jobs/${jobid}/artifacts/${artifact}`;
    let art = lib.makeAPIRequest({
      env,
      path: path$$1
    }).catch(_ => null);
    return await art;
  }
  async function getInfo(env, jobid) {
    let trace = getArtifact(env, "trace", jobid);
    let renderedPreset = getArtifact(env, "preset", jobid);
    let result = getArtifact(env, "result", jobid);
    let error = getArtifact(env, "error", jobid);
    let output = getArtifact(env, "output", jobid);
    [trace, renderedPreset, result, output, error] = await Promise.all([trace, renderedPreset, result, output, error]);
    return {
      trace,
      renderedPreset,
      result,
      output,
      error
    };
  }
  const tracelineRegex = /^(?:[\d.]+) ([\w ]+):(\d+): (.+)/;
  function parseTraceLine(line) {
    let info = tracelineRegex.exec(line);

    if (!info) {
      return {
        full: line,
        parsed: false,
        content: line
      };
    }

    return {
      absoluteTime: info[0],
      presetName: info[1],
      lineNumber: info[2],
      text: info[3],
      content: info[3],
      full: line,
      parsed: true
    };
  }
  async function parseTrace(env, jobid) {
    let {
      trace,
      renderedPreset
    } = await getInfo(env, jobid);
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
      let info = parseTraceLine(errLine);

      if (!info.parsed) {
        errorList.push((await findLineInFile(renderedPreset, info.lineNumber)));
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
    findLineInFile,
    getArtifact
  };

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
        path: `/movies/${this.id}/metadata?page=1p100`
      });
      return this.meta.metadata = Asset.normalizeMetadata(req.data);
    }

    async patchMetadata(metadata) {
      if (metadata.Workflow) {
        //FIXME
        //Currently, WORKFLOW_METADATA cannot be patched via api: we need to
        //start a ephemeral eval to upload it
        let md = JSON.stringify(JSON.stringify(metadata.Workflow));
        let fakePreset = {
          code: `WORKFLOW_METADATA.update(json.loads(${md}))`
        };
        await this.startEphemeralEvaluateIdeal(fakePreset);
        log("WFMD Patched using ephemeralEval");
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
        log("MD Patched");
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

    async getFiles(refresh = false) {
      if (this._files && !refresh) return this._files;
      let req = await lib.indexPathFast({
        env: this.remote,
        path: `/assets/${this.id}/files`,
        method: "GET"
      }); //return req;

      return this._files = new Collection(req.map(x => new File({
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

    async startEphemeralEvaluateIdeal(preset, dynamicPresetData, isBinary = false) {
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
              //we need to strip invalid utf8 characters from the
              //buffer before we encode it or the sdvi backend dies
              providerData: Buffer.from(preset.code, isBinary && "binary" || "utf8").toString("base64"),
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
      write(" Waiting for finish...\n");
      let dots = 0;

      for (;;) {
        res = await lib.makeAPIRequest({
          env,
          path_full: evalInfo.data.links.self
        });
        write(`\r${res.data.attributes.state}${".".repeat(dots++)}         `);

        if (dots === 5) {
          dots = 1;
        }

        if (res.data.attributes.state == "Complete") {
          write(chalk`{green  Done}...\n`);
          break;
        }

        await sleep(500);
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
      await targetAsset.patchMetadata(this.md);
      let fileCreations = [];

      for (let file of await this.getFiles()) {
        let possibleInstances = {}; //Check for any valid copy-able instances

        for (let inst of file.instancesList) {
          //We need to skip internal files
          if (inst.storageLocationName === "Rally Platform Bucket") continue;
          log(`Adding file: ${file.chalkPrint()}`);

          possibleInstances[inst.storageLocationName] = () => targetAsset.addFileInstance(file, inst);
        }

        if (Object.values(possibleInstances).length > 1) {
          //prioritize archive is possible
          if (possibleInstances["Archive"]) {
            log("Hit archive prioritizer");
            fileCreations.push(possibleInstances["Archive"]);
          } else {
            fileCreations.push(...Object.values(possibleInstances));
          }
        } else {
          fileCreations.push(...Object.values(possibleInstances));
        }
      }

      await Promise.all(fileCreations.map(x => x()));
    }

    async addFileInstance(file, inst, tagList = []) {
      let newInst = {
        uri: File.rslURL(inst),
        name: inst.name,
        size: inst.size,
        lastModified: inst.lastModified,
        storageLocationName: inst.storageLocationName
      };
      let instances = {};
      instances[String(Math.floor(Math.random() * 100000 + 1))] = newInst;
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
              instances
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

    async downloadFile(label, destFolder) {
      let files = await this.getFiles();
      let file = files.findByName(label);
      let c = await file.getContent();

      if (destFolder) {
        let filePath = path__default.join(destFolder, file.instancesList[0].name);
        fs__default.writeFileSync(filePath, c);
      } else {
        console.log(c);
      }
    }

    async deleteFile(label) {
      let files = await this.getFiles();
      let file = files.findByName(label);
      if (!file) return false;
      await file.delete(false); //mode=forget

      return true;
    }

    async listJobs() {
      let jobs = await lib.indexPathFast({
        env: this.remote,
        path: "/jobs",
        qs: {
          filter: `movieId=${this.id}`
        }
      });

      for (let e of jobs) {
        if (!e.relationships.preset.data) continue;
        let preset = await Preset.getById(this.remote, e.relationships.preset.data.id);
        let rule = await Rule.getById(this.remote, e.relationships.workflowRule.data.id);
        log("Preset", preset.name);
        log("Rule", rule.name);
      }
    } //get all artifacts of type `artifact` from this asset


    artifactsList(artifact) {
      var _this = this;

      return _wrapAsyncGenerator(function* () {
        function reorderPromises(_x) {
          return _reorderPromises.apply(this, arguments);
        }

        function _reorderPromises() {
          _reorderPromises = _wrapAsyncGenerator(function* (p) {
            ////yield in order we got it
            //yield* p[Symbol.iterator]();
            ////yield in order of first to finish
            //yield* unordered(p);
            //yield in chronological order
            let k = yield _awaitAsyncGenerator(Promise.all(p));
            yield* _asyncGeneratorDelegate(_asyncIterator(k.sort(([e1, _a], [e2, _b]) => {
              return e1.attributes.completedAt - e2.attributes.completedAt;
            })), _awaitAsyncGenerator);
          });
          return _reorderPromises.apply(this, arguments);
        }

        elog("Reading jobs...");
        let r = yield _awaitAsyncGenerator(lib.indexPathFast({
          env: _this.remote,
          path: "/jobs",
          qs: {
            filter: `movieId=${_this.id}`
          }
        }));
        elog("Getting job artifacts..."); //let evals = r.filter(x => x.attributes.providerTypeName === "SdviEvaluate");

        let evals = r;
        let zipped = evals.map(async x => [x, await getArtifact(_this.remote, artifact, x.id)]);
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;

        var _iteratorError;

        try {
          for (var _iterator = _asyncIterator(reorderPromises(zipped)), _step, _value; _step = yield _awaitAsyncGenerator(_iterator.next()), _iteratorNormalCompletion = _step.done, _value = yield _awaitAsyncGenerator(_step.value), !_iteratorNormalCompletion; _iteratorNormalCompletion = true) {
            let x = _value;
            yield x;
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator.return != null) {
              yield _awaitAsyncGenerator(_iterator.return());
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }
      })();
    }

    async grep(text, {
      artifact = "trace",
      nameOnly = false,
      ordering = null
    }) {
      function highlight(line, text) {
        let parts = line.split(text);
        return parts.join(chalk`{blue ${text}}`);
      }

      function parseLine(x) {
        if (artifact === "trace") {
          return parseTraceLine(x);
        } else {
          //fake the output from parseTraceLine to make it look right
          return {
            content: x
          };
        }
      }

      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;

      var _iteratorError2;

      try {
        for (var _iterator2 = _asyncIterator(this.artifactsList(artifact)), _step2, _value2; _step2 = await _iterator2.next(), _iteratorNormalCompletion2 = _step2.done, _value2 = await _step2.value, !_iteratorNormalCompletion2; _iteratorNormalCompletion2 = true) {
          let [e, trace] = _value2;
          if (!trace) continue;
          let lines = trace.split("\n").map(parseLine);
          let matching = lines.filter(x => x.content.includes(text));

          if (matching.length > 0) {
            let preset = await Preset.getById(this.remote, e.relationships.preset.data.id);

            if (nameOnly) {
              log(chalk`{red ${preset.name}} ${e.id} {blue ${matching.length}} matche(s) ${e.attributes.completedAt}`);
            } else if (exports.configObject.rawOutput) {
              console.log(matching.map(x => chalk`{red ${preset.name}}:${highlight(x.content, text)}`).join("\n"));
            } else {
              log(chalk`{red ${preset.name}} ${e.id} ${moment(e.attributes.completedAt)}`);
              log(matching.map(x => `  ${highlight(x.content, text)}`).join("\n"));
            }
          }
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return != null) {
            await _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }
    }

    async replay() {
      function colorRequest(id) {
        if (id <= 299) {
          return chalk`{green ${id}}`;
        } else if (id <= 399) {
          return chalk`{blue ${id}}`;
        } else if (id <= 499) {
          return chalk`{red ${id}}`;
        } else if (id <= 599) {
          return chalk`{cyan ${id}}`;
        } else {
          throw new Error("failed to create color from id");
        }
      }

      let worstRegexEver = /^@Request (?<type>\w+) (?<url>.+)$[\n\r]+^(?<time>.+)$[\S\s]+?^(?<request>\{[\S\s]+?^\})?[\S\s]+?^@Response (?<statusCode>\d+)$[\S\s]+?^(?<response>\{[\S\s]+?^\})?[\S\s]+?={61}/gm;
      var _iteratorNormalCompletion3 = true;
      var _didIteratorError3 = false;

      var _iteratorError3;

      try {
        for (var _iterator3 = _asyncIterator(this.artifactsList("output")), _step3, _value3; _step3 = await _iterator3.next(), _iteratorNormalCompletion3 = _step3.done, _value3 = await _step3.value, !_iteratorNormalCompletion3; _iteratorNormalCompletion3 = true) {
          let [e, trace] = _value3;
          if (!trace) continue;
          let preset = await Preset.getById(this.remote, e.relationships.preset.data.id);
          log(chalk`{red ${preset.name}}`);

          for (let request of trace.matchAll(worstRegexEver)) {
            //log(request);
            {
              let r = request.groups;
              log(chalk`Request: ${r.type} ${r.url} returned ${colorRequest(r.statusCode)}`);
            }
          }
        }
      } catch (err) {
        _didIteratorError3 = true;
        _iteratorError3 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion3 && _iterator3.return != null) {
            await _iterator3.return();
          }
        } finally {
          if (_didIteratorError3) {
            throw _iteratorError3;
          }
        }
      }
    }

    async analyze() {
      await lib.makeAPIRequest({
        env: this.remote,
        path: "/v1.0/analysis",
        method: "POST",
        payload: {
          "movieId": this.id,
          "latestVersion": true
        }
      });
    }

  }

  defineAssoc(Asset, "id", "data.id");
  defineAssoc(Asset, "name", "data.attributes.name");
  defineAssoc(Asset, "remote", "meta.remote");
  defineAssoc(Asset, "md", "meta.metadata");
  defineAssoc(Asset, "lite", "meta.lite");
  Asset.endpoint = "movies";

  let exists = {};

  class Preset extends RallyBase {
    constructor({
      path: path$$1,
      remote,
      data,
      subProject
    } = {}) {
      // Get full path if possible
      if (path$$1) {
        path$$1 = path.resolve(path$$1);

        if (path.dirname(path$$1).includes("silo-metadata")) {
          throw new AbortError("Constructing preset from metadata file");
        }
      }

      super(); // Cache by path

      if (path$$1) {
        if (exists[pathTransform(path$$1)]) return exists[pathTransform(path$$1)];
        exists[pathTransform(path$$1)] = this;
      }

      this.meta = {};
      this.subproject = subProject;
      this.remote = remote;

      if (lib.isLocalEnv(this.remote)) {
        if (path$$1) {
          this.path = path$$1;
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
            log(chalk`{yellow Warning}: ${path$$1} does not have a readable metadata file! Looking for ${this.localmetadatapath}`);
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

      delete this.data.attributes.rallyConfiguration;
      delete this.data.attributes.systemManaged;
      delete this.data.meta;
    } //Given a metadata file, get its actual file


    static async fromMetadata(path$$1, subproject) {
      let data;

      try {
        data = JSON.parse(readFileSync(path$$1));
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
        log(chalk`{red Skipping {green ${path$$1}}.}`);
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
        await asset.startEvaluate(remote.id, {
          "uploadPresetName": this.name
        });
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
      writeFileSync(this.localpath, this.code || "");
    }

    async uploadRemote(env, shouldTest = true) {
      await this.uploadCodeToEnv(env, true, shouldTest);
    }

    async save(env, shouldTest = true) {
      this.saved = true;

      if (!this.isGeneric) {
        await this.resolve();
      }

      this.cleanup();

      if (lib.isLocalEnv(env)) {
        log(chalk`Saving preset {green ${this.name}} to {blue ${lib.envName(env)}}.`);
        await this.saveLocal();
      } else {
        await this.uploadRemote(env, shouldTest);
      }
    }

    async downloadCode() {
      var _this$data$links;

      if (!this.remote || this.code) return this.code;
      let pdlink = (_this$data$links = this.data.links) === null || _this$data$links === void 0 ? void 0 : _this$data$links.providerData;
      if (!pdlink) return this.code = "";
      let code = await lib.makeAPIRequest({
        env: this.remote,
        path_full: pdlink,
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
      const name_regex = /name\s*:\s*([\w\d. \/_]+)\s*$/gim;
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
      return this._localpath || path__default.join(exports.configObject.repodir, subproject || "", "silo-presets", name + "." + ext);
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

    async convertImports() {}

    async convertIncludes() {}

    isEval() {
      return this.providerName === "SdviEvaluate" || this.providerName === "SdviEvalPro";
    }

    async uploadPresetData(env, id) {
      if (this.code.trim() === "NOUPLOAD") {
        write(chalk`code skipped {yellow :)}, `); // Not an error, so return null

        return null;
      }

      let code = this.code;
      let headers = {}; //if(this.isEval()){
      //let crt = 0;
      //code = code.split("\n").map(line => {
      //crt += 1
      //if(line.trim().endsWith("\\")) return line;
      //return [
      //line,
      //`# this ^^ is ${this.name}:${crt}`,
      //]
      //}).flat().join("\n");
      //}

      if (!exports.configObject.skipHeader && this.isEval()) {
        write(chalk`generate header, `);
        let repodir = exports.configObject.repodir;
        let localpath;

        if (this.path) {
          localpath = this.path.replace(repodir, "");
          if (localpath.startsWith("/")) localpath = localpath.substring(1);
        } else {
          localpath = "Other Silo";
        }

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


      if (this.providerName == "Vantage") {
        code = Buffer.from(code).toString("base64");
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
          return "Missing Name";
        }
      }

      write(chalk`Uploading preset {green ${this.name}} to {green ${env}}: `);

      if (this.immutable) {
        log(chalk`{magenta IMMUTABLE}. Nothing to do.`);
        return "Immutable Preset";
      } //First query the api to see if this already exists.


      let remote = await Preset.getByName(env, this.name);
      let uploadResult = null;

      if (remote) {
        //If it exists we can replace it
        if (includeMetadata) {
          let payload = {
            data: {
              attributes: this.data.attributes,
              type: "presets"
            }
          };
          payload.data.relationships = {};

          if (this.relationships.providerType) {
            payload.data.relationships.providerType = this.relationships.providerType;
            let dt = payload.data.relationships.providerType;
            write(chalk`query type, `);
            let ptid = await Provider.getByName(env, dt.data.name);
            write(chalk`({gray ${ptid.name}}) ok, `);
            dt.data.id = ptid.data.id;
          } else {
            write("replace (simple), ");
          }

          if (this.providerName === "SdviEvalPro") {
            log("givin it a name,");
            let oldName = this.attributes.providerDataFilename;

            if (!oldName) {
              this.attributes.providerDataFilename = this.name + ".py";
            }
          }

          let res = await lib.makeAPIRequest({
            env,
            path: `/presets/${remote.id}`,
            method: "PUT",
            payload,
            fullResponse: true
          });
          write(chalk`metadata {yellow ${res.statusCode}}, `);

          if (res.statusCode >= 400) {
            log(chalk`skipping code upload, did not successfully upload metadata`);
            return "Metadata Upload Failed";
          }
        }

        uploadResult = await this.uploadPresetData(env, remote.id);
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
        uploadResult = await this.uploadPresetData(env, id);
      }

      if (this.test[0] && shouldTest) {
        await this.runTest(env);
      } else {
        log("No tests. Done.");
      }

      return uploadResult;
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

      if (!remote) {
        log(chalk`Not found on {red ${env}}`);
        return;
      }

      await remote.downloadCode();
      let i = remote.parseHeaderInfo();

      if (i) {
        log(chalk`
                ENV: {red ${env}}, updated {yellow ~${i.offset}}
                Built on {blue ${i.built}} by {green ${i.author}}
                From ${i.build || "(unknown)"} on ${i.branch} ({yellow ${i.commit}})
                Remote Data Filename "${this.importName}"
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
      let includeRegex = /@include ["'](.+)['"]/gim; //let includeRegex = /@include/g;

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
  defineAssoc(Preset, "_nameE2", "data.attributes.providerDataFilename");
  defineAssoc(Preset, "id", "data.id");
  defineAssoc(Preset, "importName", "data.attributes.providerDataFilename");
  defineAssoc(Preset, "attributes", "data.attributes");
  defineAssoc(Preset, "relationships", "data.relationships");
  defineAssoc(Preset, "remote", "meta.remote");
  defineAssoc(Preset, "_code", "meta.code");
  defineAssoc(Preset, "_path", "meta.path");
  defineAssoc(Preset, "isGeneric", "meta.isGeneric");
  defineAssoc(Preset, "ext", "meta.ext");
  defineAssoc(Preset, "subproject", "meta.project");
  defineAssoc(Preset, "metastring", "meta.metastring");
  defineAssoc(Preset, "providerName", "relationships.providerType.data.name");
  Preset.endpoint = "presets";

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
      let fails = [];

      for (let preset of this.presets) {
        try {
          fails.push([preset, await preset.save(env), "preset"]);
        } catch (e) {
          log(chalk`{red Error}`);
          fails.push([preset, e]);
        }
      }

      if (this.rules.arr[0]) {
        log("Starting create phase for rules");

        for (let rule of this.rules) {
          try {
            fails.push([rule, await rule.saveA(env), "rule create"]);
          } catch (e) {
            log(chalk`{red Error}`);
            fails.push([rule, e, "rule create"]);
          }
        }

        log("OK");
        log("Starting link phase for rules");
        Rule.removeCache(env);

        for (let rule of this.rules) {
          try {
            fails.push([rule, await rule.saveB(env), "rule link"]);
          } catch (e) {
            log(chalk`{red Error}`);
            fails.push([rule, e, "rule link"]);
          }
        }
      }

      let finalErrors = [];

      for (let [item, error, stage] of fails) {
        if (!error) continue;
        log(chalk`Error during {blue ${stage}}: ${item.chalkPrint(false)} {red ${error}}`);
        finalErrors.push([item, error, stage]);
      }

      return finalErrors;
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

    async curate() {
      this.curated = !this.curated;
      return await lib.makeAPIRequest({
        env: this.remote,
        path: `/tagNames/${this.id}`,
        method: "PATCH",
        payload: {
          data: {
            attributes: {
              curated: this.curated
            },
            type: "tagNames"
          }
        }
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

  let stagingEmsg = chalk`Not currently on a clean staging branch. Please move to staging or resolve the commits.
Try {red git status} or {red rally stage edit --verbose} for more info.`;
  let Stage$$1 = {
    async before(args) {
      this.env = args.env;
      this.args = args;
      if (!this.env) throw new AbortError("No env supplied");
    },

    setStageId() {
      let api = exports.configObject.api[this.env];
      if (!api) return null;
      return this.stageid = api.stage;
    },

    // This returns true if the stage failed to load
    async downloadStage() {
      this.setStageId();

      if (!this.stageid) {
        log(chalk`No stage ID found for {green ${this.env}}. Run "{red rally stage init -e ${this.env} (stage name)}" or select a different env.`);
        return true;
      }

      let preset = await Preset.getById(this.env, this.stageid);
      await preset.downloadCode();
      this.stageData = JSON.parse(preset.code);
      this.stagePreset = preset;
      log(chalk`Stage loaded: {green ${this.stagePreset.name}}`);
    },

    async uploadStage() {
      if (!this.stagePreset || !this.stageData) {
        throw "Assert fail: no existing prestage (you shouldn't see this)";
      }

      this.stagePreset.code = JSON.stringify(this.stageData, null, 4);
      await this.stagePreset.uploadCodeToEnv(this.env, false, false);
    },

    async $init() {
      let presetName = this.args._.pop();

      let preset = await Preset.getByName(this.env, presetName);

      if (!preset) {
        log("Existing preset stage not found.");
        return;
      }

      log(chalk`Found stage target to init: ${preset.chalkPrint(false)}`);
      exports.configObject.api[this.env].stage = preset.id;
      exports.configObject["ownerName"] = await askInput("What is your name");
      await saveConfig(exports.configObject, {
        print: false
      });
    },

    async $info() {
      if (await this.downloadStage()) return;
      if (exports.configObject.rawOutput) return this.stageData;
      log(chalk`Currently Staged Branches: ${this.stageData.stage.length}`);

      for (let {
        branch,
        commit
      } of this.stageData.stage) {
        log(chalk`    ${branch} {gray ${commit}}`);
      }

      log(chalk`Currently Claimed Presets: ${this.stageData.claimedPresets.length}`);

      for (let preset of this.stageData.claimedPresets) {
        log(chalk`    {blue ${preset.name}} {gray ${preset.owner}}`);
      }
    },

    async $claim() {
      await Promise.all([this.downloadStage(), addAutoCompletePrompt()]);
      let q;
      let opts = [{
        name: "Claim a preset",
        value: "add"
      }, {
        name: "Remove a claimed preset",
        value: "rem"
      }, {
        name: "Apply changes",
        value: "done"
      }, {
        name: "Quit without saving",
        value: "quit"
      }]; //slice to copy

      let newClaimed = [];
      let ownerName = exports.configObject["ownerName"];

      for (;;) {
        q = await inquirer.prompt([{
          type: "autocomplete",
          name: "type",
          message: `What do you want to do?`,
          source: this.filterwith(opts)
        }]);

        if (q.type === "add") {
          let p = await selectPreset({});
          if (!p) continue;
          newClaimed.push(p);
        } else if (q.type === "rem") {
          let objsMap = newClaimed.map(x => ({
            name: x.chalkPrint(true),
            value: x
          }));

          for (let obj of this.stageData.claimedPresets) {
            objsMap.push({
              name: obj.name,
              value: obj.name
            });
          }

          let p = await selectLocalMenu(objsMap, "preset", true);
          if (!p) continue;

          if (typeof p == "string") {
            this.stageData.claimedPresets = this.stageData.claimedPresets.filter(x => x.name != p);
          } else {
            newClaimed = newClaimed.filter(x => x !== p);
          }
        } else if (q.type === "done") {
          break;
        } else if (q.type === "quit") {
          return;
        }
      }

      for (let newClaim of newClaimed) {
        this.stageData.claimedPresets.push({
          name: newClaim.name,
          owner: ownerName
        });
      }

      await this.uploadStage();
    },

    async getBranches() {
      let branches = await spawn({
        noecho: true
      }, "git", ["branch", "-la", "--color=never"]);

      if (branches.exitCode !== 0) {
        log("Error in loading branches", branches);
      }

      let branchList = branches.stdout.split("\n").map(x => x.trim()).filter(x => x.startsWith("remotes/origin")).map(x => {
        let lastSlash = x.lastIndexOf("/");

        if (lastSlash !== -1) {
          x = x.slice(lastSlash + 1);
        }

        return x;
      });

      if (!(await this.checkCurrentBranch())) {
        log(stagingEmsg);
        return;
      }

      log("Finished retreiving branches.");
      return branchList;
    },

    async runGit(...args) {
      return await runGit(...args);
    },

    filterwith(list) {
      return async (sofar, input) => {
        return list.filter(x => input ? (x.name || x).toLowerCase().includes(input.toLowerCase()) : true);
      };
    },

    //finite state machine for inputting branch changes
    async editFSM(allBranches, newStagedBranches) {
      let q;
      let opts = [{
        name: "Add a branch to the stage",
        value: "add"
      }, {
        name: "Remove a branch from the stage",
        value: "rem"
      }, {
        name: "Finalize stage",
        value: "done"
      }, {
        name: "Quit without saving",
        value: "quit"
      }];

      for (;;) {
        q = await inquirer.prompt([{
          type: "autocomplete",
          name: "type",
          message: `What do you want to do?`,
          source: this.filterwith(opts)
        }]);

        if (q.type === "add") {
          let qqs = allBranches.slice(0); //copy the branches

          qqs.push("None");
          q = await inquirer.prompt([{
            type: "autocomplete",
            name: "branch",
            message: `What branch do you want to add?`,
            source: this.filterwith(qqs)
          }]);

          if (q.branch !== "None") {
            newStagedBranches.add(q.branch);
          }
        } else if (q.type === "rem") {
          let qqs = Array.from(newStagedBranches);
          qqs.push("None");
          q = await inquirer.prompt([{
            type: "autocomplete",
            name: "branch",
            message: `What branch do you want to remove?`,
            source: this.filterwith(qqs)
          }]);

          if (q.branch !== "None") {
            newStagedBranches.delete(q.branch);
          }
        } else if (q.type === "done") {
          break;
        } else if (q.type === "quit") {
          return "quit";
        }
      }
    },

    async $edit() {
      let needsInput = !this.args.a && !this.args.r && !this.args.add && !this.args.remove;
      let clean = this.args.clean;
      let [branches, stage, _] = await Promise.all([this.getBranches(), this.downloadStage(), !needsInput || addAutoCompletePrompt()]);
      if (stage) return;
      if (!branches) return; //copy the branches we started with

      let newStagedBranches = new Set();
      let oldStagedBranches = new Set();

      for (let {
        branch
      } of this.stageData.stage) {
        if (!clean) {
          newStagedBranches.add(branch);
        }

        oldStagedBranches.add(branch);
      }

      if (needsInput) {
        let res = await this.editFSM(branches, newStagedBranches);

        if (res == "quit") {
          return;
        }
      } else {
        let asarray = arg$$1 => {
          if (!arg$$1) return [];
          return Array.isArray(arg$$1) ? arg$$1 : [arg$$1];
        };

        for (let branch of [...asarray(this.args.a), ...asarray(this.args.add)]) {
          if (!branches.includes(branch)) {
            throw new AbortError(`Invalid branch ${branch}`);
          }

          newStagedBranches.add(branch);
        }

        for (let branch of [...asarray(this.args.r), ...asarray(this.args.remove)]) {
          if (!branches.includes(branch)) {
            throw new AbortError(`Invalid branch ${branch}`);
          }

          newStagedBranches.delete(branch);
        }
      }

      const difference = (s1, s2) => new Set([...s1].filter(x => !s2.has(x)));

      const intersect = (s1, s2) => new Set([...s1].filter(x => s2.has(x)));

      log("Proposed stage changes:");

      for (let branch of intersect(newStagedBranches, oldStagedBranches)) {
        log(chalk`   ${branch}`);
      }

      for (let branch of difference(newStagedBranches, oldStagedBranches)) {
        log(chalk`  {green +${branch}}`);
      }

      for (let branch of difference(oldStagedBranches, newStagedBranches)) {
        log(chalk`  {red -${branch}}`);
      }

      let ok = this.args.y || (await askQuestion("Prepare these branches for deployment?"));
      if (!ok) return; //just to make sure commits/branches don't get out of order

      newStagedBranches = Array.from(newStagedBranches);

      try {
        let [diffText, newStagedCommits] = await this.doGit(newStagedBranches, this.stageData.stage.map(x => x.commit));
        await this.runRally(diffText);
        this.stageData.stage = Array.from(zip(newStagedBranches, newStagedCommits)).map(([branch, commit]) => ({
          branch,
          commit
        }));
        await this.uploadStage();
      } catch (e) {
        if (e instanceof AbortError) {
          await this.runGit([0], "reset", "--hard", "HEAD");
          await this.runGit([0], "checkout", "staging");
          throw e;
        }

        throw e; //TODO 
      } finally {
        await this.runGit([0], "checkout", "staging");
      }
    },

    async $pull() {
      if (await this.downloadStage()) return;
      await this.makeOldStage(this.stageData.stage.map(x => x.commit), `rallystage-${this.env}`);
    },

    async makeNewStage(newStagedBranches) {
      let newStagedCommits = [];
      await this.runGit([0, 1], "branch", "-D", "RALLYNEWSTAGE");
      await this.runGit([0], "checkout", "-b", "RALLYNEWSTAGE");

      for (let branch of newStagedBranches) {
        let originName = `origin/${branch}`;
        let mergeinfo = await spawn({
          noecho: true
        }, "git", ["merge", "--squash", originName]);

        if (mergeinfo.exitCode == 1) {
          let e = new AbortError(`Failed to merge ${branch}`);
          e.branch = branch;
          throw e;
        } else if (mergeinfo.exitCode != 0) {
          throw new AbortError(`Failed to merge for unknown reason ${branch}: {red ${mergeinfo}}`);
        }

        let [commit, _2] = await this.runGit([0, 1], "commit", "-m", `autostaging: commit ${branch}`);

        if (commit.includes("working tree clean")) {
          log(chalk`{yellow Warning:} working tree clean after merging {green ${branch}}, please remove this from the stage`);
        }

        let hash = await spawn({
          noecho: true
        }, "git", ["log", "--format=oneline", "--color=never", "-n", "1", originName]);

        if (hash.exitCode !== 0) {
          throw new AbortError(`Failed to get commit hash for branch, ${branch}`);
        }

        newStagedCommits.push(hash.stdout.split(" ")[0]);
      }

      return newStagedCommits;
    },

    async makeOldStage(oldStagedCommits, name) {
      await this.runGit([0], "checkout", "staging");
      await this.runGit([0, 1], "branch", "-D", name);
      await this.runGit([0], "checkout", "-b", name);

      for (let branch of oldStagedCommits) {
        let [err, _] = await this.runGit([0, 1], "merge", branch);

        if (err.includes("Automatic merge failed")) {
          log(chalk`{red Error:} ${branch} failed to merge during auto-commit`);

          if (this.args.force) {
            await this.runGit([0], "merge", "--abort");
          } else {
            throw new AbortError("Not trying to merge other branches");
          }
        }
      }
    },

    async checkCurrentBranch() {
      let expected = `On branch staging
Your branch is up to date with 'origin/staging'.

nothing to commit, working tree clean`;
      let status = await spawn({
        noecho: true
      }, "git", ["status"]);
      let trimmed = status.stdout.trim();

      if (exports.configObject.verbose) {
        log("expected:");
        log(chalk`{green ${expected}}`);
        log("got:");
        log(chalk`{red ${trimmed}}`);
      }

      return trimmed === expected;
    },

    async findConflict(newStagedBranches, brokeBranch) {
      await this.runGit([0], "reset", "--hard", "HEAD");
      let conflicting = [];

      for (let branch of newStagedBranches) {
        if (branch == brokeBranch) continue;
        await this.runGit([0], "checkout", "staging");
        await this.runGit([0, 1], "branch", "-D", "RALLYNEWSTAGE");
        await this.runGit([0], "checkout", "-b", "RALLYNEWSTAGE");
        let originName = `origin/${branch}`;
        await this.runGit([0], "merge", "--squash", originName);
        await this.runGit([0, 1], "commit", "-m", `autostaging: commit ${branch}`);
        let [a, b] = await this.runGit([0, 1], "merge", "--squash", `origin/${brokeBranch}`);

        if (a.includes("merge failed")) {
          conflicting.push({
            branch,
            msg: a
          });
          let [c, d] = await this.runGit([0, 1], "reset", "--hard", "HEAD");
        } else {
          let [c, d] = await this.runGit([0, 1], "commit", "-m", `asdf`);
        }
      }

      await this.runGit([0], "reset", "--hard", "HEAD");
      await this.runGit([0], "checkout", "staging");
      return conflicting;
    },

    async printConflicts(conflicts) {
      for ({
        branch,
        msg
      } of conflicts) {
        log(chalk`Conflict found on branch {blue ${branch}}: \n {red ${msg}}`);
      }
    },

    async $tfc() {
      await this.runGit([0], "reset", "--hard", "HEAD");
      await this.runGit([0], "checkout", "staging");
      let a = await this.findConflict(["fix-tc_adjust_planb", "test-too_many_markers_fix", "audio_rectifier_updates_ASR-69", "getIbmsMediaIdFix", "ASR-393_WrongTimecodesBlackSegmentDetection", "ASR-390_BadWooPartNums", "ASXT-Audio-QC-Baton-DLAPost", "ASR-293", "ASR-383_tiktok_rectifier"], "ASR-383_tiktok_rectifier");
      await this.printConflicts(a);
    },

    async doGit(newStagedBranches, oldStagedCommits) {
      if (!(await this.checkCurrentBranch())) {
        log(stagingEmsg);
        return;
      }

      let newStagedCommits;

      try {
        newStagedCommits = await this.makeNewStage(newStagedBranches);
      } catch (e) {
        if (e instanceof AbortError && e.branch) {
          log("Diagnosing conflict...");
          let conflicts = await this.findConflict(newStagedBranches, e.branch);
          this.printConflicts(conflicts);

          if (conflicts.length > 0) {
            throw new AbortError("Found conflict");
          } else {
            throw new AbortError("Unable to find conflict... No idea what to do.");
          }
        } else {
          throw e;
        }
      }

      await this.makeOldStage(oldStagedCommits, "RALLYOLDSTAGE");
      await this.runGit([0], "checkout", "RALLYNEWSTAGE");
      let diff = await spawn({
        noecho: true
      }, "git", ["diff", "RALLYOLDSTAGE..HEAD", "--name-only"]);

      if (diff.exitCode !== 0) {
        log(diff);
        throw new Error("diff failed");
      }

      let diffText = diff.stdout;
      return [diffText, newStagedCommits];
    },

    async $testrr() {
      let diff = `silo-presets/Super Movie Data Collector.py
        silo-presets/Super Movie Post Work Order.py
        silo-presets/Super Movie Task Handler.py`;
      await this.runRally(diff);
    },

    async $restore(args) {
      let getStdin = require("get-stdin");

      let stdin = await getStdin();
      let stagedLines = stdin.split("\n");
      if (stagedLines[stagedLines.length - 1] === "") stagedLines.pop();
      let oldStage = stagedLines.map((line, index) => {
        let s = /(\S+)\s([a-f0-9]+)/.exec(line);
        if (!s) throw new AbortError(chalk`Could not read commit+branch from line "${line}" (index ${index})`);
        return {
          branch: s[1],
          commit: s[2]
        };
      });
      this.args.a = oldStage.map(x => x.branch);
      this.args.r = args._.pop();
      this.args.y = true;
      await this.$edit();
    },

    async runRally(diffText) {
      let set = new Set();

      for (let file of diffText.trim().split("\n")) {
        set.add((await categorizeString(file)));
      }

      let files = [...set];
      files = files.filter(f => f && !f.missing);
      let chain = new SupplyChain();
      chain.rules = new Collection(files.filter(f => f instanceof Rule));
      chain.presets = new Collection(files.filter(f => f instanceof Preset));
      chain.notifications = new Collection([]);

      if (chain.rules.arr.length + chain.presets.arr.length === 0) {
        log(chalk`{blue Info:} No changed prests, nothing to deploy`);
        return;
      }

      chain.log();
      let hasClaimed = false;

      for (let preset of chain.presets) {
        for (let claim of this.stageData.claimedPresets) {
          if (preset.name == claim.name) {
            hasClaimed = true;
            log(chalk`{yellow Claimed preset}: {blue ${claim.name}} (owner {green ${claim.owner}})`);
          }
        }
      }

      if (hasClaimed) {
        throw new AbortError("Someone has a claimed preset in the deploy");
      }

      let ok = this.args.y || (await askQuestion("Deploy now?"));
      if (!ok) throw new AbortError("Not deploying");
      await chain.syncTo(this.env);
    },

    async unknown(arg$$1, args) {
      log(chalk`Unknown action {red ${arg$$1}} try '{white rally help stage}'`);
    }

  };

  function getUserAgent() {
    if (typeof navigator === "object" && "userAgent" in navigator) {
      return navigator.userAgent;
    }

    if (typeof process === "object" && "version" in process) {
      return `Node.js/${process.version.substr(1)} (${process.platform}; ${process.arch})`;
    }

    return "<environment undetectable>";
  }

  var register_1 = register;

  function register(state, name, method, options) {
    if (typeof method !== "function") {
      throw new Error("method for before hook must be a function");
    }

    if (!options) {
      options = {};
    }

    if (Array.isArray(name)) {
      return name.reverse().reduce(function (callback, name) {
        return register.bind(null, state, name, callback, options);
      }, method)();
    }

    return Promise.resolve().then(function () {
      if (!state.registry[name]) {
        return method(options);
      }

      return state.registry[name].reduce(function (method, registered) {
        return registered.hook.bind(null, method, options);
      }, method)();
    });
  }

  var add = addHook;

  function addHook(state, kind, name, hook) {
    var orig = hook;

    if (!state.registry[name]) {
      state.registry[name] = [];
    }

    if (kind === "before") {
      hook = function (method, options) {
        return Promise.resolve().then(orig.bind(null, options)).then(method.bind(null, options));
      };
    }

    if (kind === "after") {
      hook = function (method, options) {
        var result;
        return Promise.resolve().then(method.bind(null, options)).then(function (result_) {
          result = result_;
          return orig(result, options);
        }).then(function () {
          return result;
        });
      };
    }

    if (kind === "error") {
      hook = function (method, options) {
        return Promise.resolve().then(method.bind(null, options)).catch(function (error) {
          return orig(error, options);
        });
      };
    }

    state.registry[name].push({
      hook: hook,
      orig: orig
    });
  }

  var remove = removeHook;

  function removeHook(state, name, method) {
    if (!state.registry[name]) {
      return;
    }

    var index = state.registry[name].map(function (registered) {
      return registered.orig;
    }).indexOf(method);

    if (index === -1) {
      return;
    }

    state.registry[name].splice(index, 1);
  }

  var bind = Function.bind;
  var bindable = bind.bind(bind);

  function bindApi(hook, state, name) {
    var removeHookRef = bindable(remove, null).apply(null, name ? [state, name] : [state]);
    hook.api = {
      remove: removeHookRef
    };
    hook.remove = removeHookRef;
    ['before', 'error', 'after', 'wrap'].forEach(function (kind) {
      var args = name ? [state, kind, name] : [state, kind];
      hook[kind] = hook.api[kind] = bindable(add, null).apply(null, args);
    });
  }

  function HookSingular() {
    var singularHookName = 'h';
    var singularHookState = {
      registry: {}
    };
    var singularHook = register_1.bind(null, singularHookState, singularHookName);
    bindApi(singularHook, singularHookState, singularHookName);
    return singularHook;
  }

  function HookCollection() {
    var state = {
      registry: {}
    };
    var hook = register_1.bind(null, state);
    bindApi(hook, state);
    return hook;
  }

  var collectionHookDeprecationMessageDisplayed = false;

  function Hook() {
    if (!collectionHookDeprecationMessageDisplayed) {
      console.warn('[before-after-hook]: "Hook()" repurposing warning, use "Hook.Collection()". Read more: https://git.io/upgrade-before-after-hook-to-1.4');
      collectionHookDeprecationMessageDisplayed = true;
    }

    return HookCollection();
  }

  Hook.Singular = HookSingular.bind();
  Hook.Collection = HookCollection.bind();
  var beforeAfterHook = Hook; // expose constructors as a named property for TypeScript

  var Hook_1 = Hook;
  var Singular = Hook.Singular;
  var Collection$1 = Hook.Collection;
  beforeAfterHook.Hook = Hook_1;
  beforeAfterHook.Singular = Singular;
  beforeAfterHook.Collection = Collection$1;

  /*!
   * is-plain-object <https://github.com/jonschlinkert/is-plain-object>
   *
   * Copyright (c) 2014-2017, Jon Schlinkert.
   * Released under the MIT License.
   */
  function isObject(o) {
    return Object.prototype.toString.call(o) === '[object Object]';
  }

  function isPlainObject(o) {
    var ctor, prot;
    if (isObject(o) === false) return false; // If has modified constructor

    ctor = o.constructor;
    if (ctor === undefined) return true; // If has modified prototype

    prot = ctor.prototype;
    if (isObject(prot) === false) return false; // If constructor does not have an Object-specific method

    if (prot.hasOwnProperty('isPrototypeOf') === false) {
      return false;
    } // Most likely a plain Object


    return true;
  }

  function lowercaseKeys(object) {
    if (!object) {
      return {};
    }

    return Object.keys(object).reduce((newObj, key) => {
      newObj[key.toLowerCase()] = object[key];
      return newObj;
    }, {});
  }

  function mergeDeep(defaults, options) {
    const result = Object.assign({}, defaults);
    Object.keys(options).forEach(key => {
      if (isPlainObject(options[key])) {
        if (!(key in defaults)) Object.assign(result, {
          [key]: options[key]
        });else result[key] = mergeDeep(defaults[key], options[key]);
      } else {
        Object.assign(result, {
          [key]: options[key]
        });
      }
    });
    return result;
  }

  function removeUndefinedProperties(obj) {
    for (const key in obj) {
      if (obj[key] === undefined) {
        delete obj[key];
      }
    }

    return obj;
  }

  function merge(defaults, route, options) {
    if (typeof route === "string") {
      let [method, url] = route.split(" ");
      options = Object.assign(url ? {
        method,
        url
      } : {
        url: method
      }, options);
    } else {
      options = Object.assign({}, route);
    } // lowercase header names before merging with defaults to avoid duplicates


    options.headers = lowercaseKeys(options.headers); // remove properties with undefined values before merging

    removeUndefinedProperties(options);
    removeUndefinedProperties(options.headers);
    const mergedOptions = mergeDeep(defaults || {}, options); // mediaType.previews arrays are merged, instead of overwritten

    if (defaults && defaults.mediaType.previews.length) {
      mergedOptions.mediaType.previews = defaults.mediaType.previews.filter(preview => !mergedOptions.mediaType.previews.includes(preview)).concat(mergedOptions.mediaType.previews);
    }

    mergedOptions.mediaType.previews = mergedOptions.mediaType.previews.map(preview => preview.replace(/-preview/, ""));
    return mergedOptions;
  }

  function addQueryParameters(url, parameters) {
    const separator = /\?/.test(url) ? "&" : "?";
    const names = Object.keys(parameters);

    if (names.length === 0) {
      return url;
    }

    return url + separator + names.map(name => {
      if (name === "q") {
        return "q=" + parameters.q.split("+").map(encodeURIComponent).join("+");
      }

      return `${name}=${encodeURIComponent(parameters[name])}`;
    }).join("&");
  }

  const urlVariableRegex = /\{[^}]+\}/g;

  function removeNonChars(variableName) {
    return variableName.replace(/^\W+|\W+$/g, "").split(/,/);
  }

  function extractUrlVariableNames(url) {
    const matches = url.match(urlVariableRegex);

    if (!matches) {
      return [];
    }

    return matches.map(removeNonChars).reduce((a, b) => a.concat(b), []);
  }

  function omit(object, keysToOmit) {
    return Object.keys(object).filter(option => !keysToOmit.includes(option)).reduce((obj, key) => {
      obj[key] = object[key];
      return obj;
    }, {});
  } // Based on https://github.com/bramstein/url-template, licensed under BSD
  // TODO: create separate package.
  //
  // Copyright (c) 2012-2014, Bram Stein
  // All rights reserved.
  // Redistribution and use in source and binary forms, with or without
  // modification, are permitted provided that the following conditions
  // are met:
  //  1. Redistributions of source code must retain the above copyright
  //     notice, this list of conditions and the following disclaimer.
  //  2. Redistributions in binary form must reproduce the above copyright
  //     notice, this list of conditions and the following disclaimer in the
  //     documentation and/or other materials provided with the distribution.
  //  3. The name of the author may not be used to endorse or promote products
  //     derived from this software without specific prior written permission.
  // THIS SOFTWARE IS PROVIDED BY THE AUTHOR "AS IS" AND ANY EXPRESS OR IMPLIED
  // WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
  // MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO
  // EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
  // INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
  // BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
  // DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
  // OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
  // NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
  // EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

  /* istanbul ignore file */


  function encodeReserved(str) {
    return str.split(/(%[0-9A-Fa-f]{2})/g).map(function (part) {
      if (!/%[0-9A-Fa-f]/.test(part)) {
        part = encodeURI(part).replace(/%5B/g, "[").replace(/%5D/g, "]");
      }

      return part;
    }).join("");
  }

  function encodeUnreserved(str) {
    return encodeURIComponent(str).replace(/[!'()*]/g, function (c) {
      return "%" + c.charCodeAt(0).toString(16).toUpperCase();
    });
  }

  function encodeValue(operator, value, key) {
    value = operator === "+" || operator === "#" ? encodeReserved(value) : encodeUnreserved(value);

    if (key) {
      return encodeUnreserved(key) + "=" + value;
    } else {
      return value;
    }
  }

  function isDefined(value) {
    return value !== undefined && value !== null;
  }

  function isKeyOperator(operator) {
    return operator === ";" || operator === "&" || operator === "?";
  }

  function getValues(context, operator, key, modifier) {
    var value = context[key],
        result = [];

    if (isDefined(value) && value !== "") {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        value = value.toString();

        if (modifier && modifier !== "*") {
          value = value.substring(0, parseInt(modifier, 10));
        }

        result.push(encodeValue(operator, value, isKeyOperator(operator) ? key : ""));
      } else {
        if (modifier === "*") {
          if (Array.isArray(value)) {
            value.filter(isDefined).forEach(function (value) {
              result.push(encodeValue(operator, value, isKeyOperator(operator) ? key : ""));
            });
          } else {
            Object.keys(value).forEach(function (k) {
              if (isDefined(value[k])) {
                result.push(encodeValue(operator, value[k], k));
              }
            });
          }
        } else {
          const tmp = [];

          if (Array.isArray(value)) {
            value.filter(isDefined).forEach(function (value) {
              tmp.push(encodeValue(operator, value));
            });
          } else {
            Object.keys(value).forEach(function (k) {
              if (isDefined(value[k])) {
                tmp.push(encodeUnreserved(k));
                tmp.push(encodeValue(operator, value[k].toString()));
              }
            });
          }

          if (isKeyOperator(operator)) {
            result.push(encodeUnreserved(key) + "=" + tmp.join(","));
          } else if (tmp.length !== 0) {
            result.push(tmp.join(","));
          }
        }
      }
    } else {
      if (operator === ";") {
        if (isDefined(value)) {
          result.push(encodeUnreserved(key));
        }
      } else if (value === "" && (operator === "&" || operator === "?")) {
        result.push(encodeUnreserved(key) + "=");
      } else if (value === "") {
        result.push("");
      }
    }

    return result;
  }

  function parseUrl(template) {
    return {
      expand: expand.bind(null, template)
    };
  }

  function expand(template, context) {
    var operators = ["+", "#", ".", "/", ";", "?", "&"];
    return template.replace(/\{([^\{\}]+)\}|([^\{\}]+)/g, function (_, expression, literal) {
      if (expression) {
        let operator = "";
        const values = [];

        if (operators.indexOf(expression.charAt(0)) !== -1) {
          operator = expression.charAt(0);
          expression = expression.substr(1);
        }

        expression.split(/,/g).forEach(function (variable) {
          var tmp = /([^:\*]*)(?::(\d+)|(\*))?/.exec(variable);
          values.push(getValues(context, operator, tmp[1], tmp[2] || tmp[3]));
        });

        if (operator && operator !== "+") {
          var separator = ",";

          if (operator === "?") {
            separator = "&";
          } else if (operator !== "#") {
            separator = operator;
          }

          return (values.length !== 0 ? operator : "") + values.join(separator);
        } else {
          return values.join(",");
        }
      } else {
        return encodeReserved(literal);
      }
    });
  }

  function parse(options) {
    // https://fetch.spec.whatwg.org/#methods
    let method = options.method.toUpperCase(); // replace :varname with {varname} to make it RFC 6570 compatible

    let url = (options.url || "/").replace(/:([a-z]\w+)/g, "{$1}");
    let headers = Object.assign({}, options.headers);
    let body;
    let parameters = omit(options, ["method", "baseUrl", "url", "headers", "request", "mediaType"]); // extract variable names from URL to calculate remaining variables later

    const urlVariableNames = extractUrlVariableNames(url);
    url = parseUrl(url).expand(parameters);

    if (!/^http/.test(url)) {
      url = options.baseUrl + url;
    }

    const omittedParameters = Object.keys(options).filter(option => urlVariableNames.includes(option)).concat("baseUrl");
    const remainingParameters = omit(parameters, omittedParameters);
    const isBinaryRequest = /application\/octet-stream/i.test(headers.accept);

    if (!isBinaryRequest) {
      if (options.mediaType.format) {
        // e.g. application/vnd.github.v3+json => application/vnd.github.v3.raw
        headers.accept = headers.accept.split(/,/).map(preview => preview.replace(/application\/vnd(\.\w+)(\.v3)?(\.\w+)?(\+json)?$/, `application/vnd$1$2.${options.mediaType.format}`)).join(",");
      }

      if (options.mediaType.previews.length) {
        const previewsFromAcceptHeader = headers.accept.match(/[\w-]+(?=-preview)/g) || [];
        headers.accept = previewsFromAcceptHeader.concat(options.mediaType.previews).map(preview => {
          const format = options.mediaType.format ? `.${options.mediaType.format}` : "+json";
          return `application/vnd.github.${preview}-preview${format}`;
        }).join(",");
      }
    } // for GET/HEAD requests, set URL query parameters from remaining parameters
    // for PATCH/POST/PUT/DELETE requests, set request body from remaining parameters


    if (["GET", "HEAD"].includes(method)) {
      url = addQueryParameters(url, remainingParameters);
    } else {
      if ("data" in remainingParameters) {
        body = remainingParameters.data;
      } else {
        if (Object.keys(remainingParameters).length) {
          body = remainingParameters;
        } else {
          headers["content-length"] = 0;
        }
      }
    } // default content-type for JSON if body is set


    if (!headers["content-type"] && typeof body !== "undefined") {
      headers["content-type"] = "application/json; charset=utf-8";
    } // GitHub expects 'content-length: 0' header for PUT/PATCH requests without body.
    // fetch does not allow to set `content-length` header, but we can set body to an empty string


    if (["PATCH", "PUT"].includes(method) && typeof body === "undefined") {
      body = "";
    } // Only return body/request keys if present


    return Object.assign({
      method,
      url,
      headers
    }, typeof body !== "undefined" ? {
      body
    } : null, options.request ? {
      request: options.request
    } : null);
  }

  function endpointWithDefaults(defaults, route, options) {
    return parse(merge(defaults, route, options));
  }

  function withDefaults(oldDefaults, newDefaults) {
    const DEFAULTS = merge(oldDefaults, newDefaults);
    const endpoint = endpointWithDefaults.bind(null, DEFAULTS);
    return Object.assign(endpoint, {
      DEFAULTS,
      defaults: withDefaults.bind(null, DEFAULTS),
      merge: merge.bind(null, DEFAULTS),
      parse
    });
  }

  const VERSION = "6.0.12";
  const userAgent = `octokit-endpoint.js/${VERSION} ${getUserAgent()}`; // DEFAULTS has all properties set that EndpointOptions has, except url.
  // So we use RequestParameters and add method as additional required property.

  const DEFAULTS = {
    method: "GET",
    baseUrl: "https://api.github.com",
    headers: {
      accept: "application/vnd.github.v3+json",
      "user-agent": userAgent
    },
    mediaType: {
      format: "",
      previews: []
    }
  };
  const endpoint = withDefaults(null, DEFAULTS);

  class Deprecation extends Error {
    constructor(message) {
      super(message); // Maintains proper stack trace (only available on V8)

      /* istanbul ignore next */

      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
      }

      this.name = 'Deprecation';
    }

  }

  // Returns a wrapper function that returns a wrapped callback
  // The wrapper function should do some stuff, and return a
  // presumably different callback function.
  // This makes sure that own properties are retained, so that
  // decorations and such are not lost along the way.
  var wrappy_1 = wrappy;

  function wrappy(fn, cb) {
    if (fn && cb) return wrappy(fn)(cb);
    if (typeof fn !== 'function') throw new TypeError('need wrapper function');
    Object.keys(fn).forEach(function (k) {
      wrapper[k] = fn[k];
    });
    return wrapper;

    function wrapper() {
      var args = new Array(arguments.length);

      for (var i = 0; i < args.length; i++) {
        args[i] = arguments[i];
      }

      var ret = fn.apply(this, args);
      var cb = args[args.length - 1];

      if (typeof ret === 'function' && ret !== cb) {
        Object.keys(cb).forEach(function (k) {
          ret[k] = cb[k];
        });
      }

      return ret;
    }
  }

  var once_1 = wrappy_1(once);
  var strict = wrappy_1(onceStrict);
  once.proto = once(function () {
    Object.defineProperty(Function.prototype, 'once', {
      value: function () {
        return once(this);
      },
      configurable: true
    });
    Object.defineProperty(Function.prototype, 'onceStrict', {
      value: function () {
        return onceStrict(this);
      },
      configurable: true
    });
  });

  function once(fn) {
    var f = function () {
      if (f.called) return f.value;
      f.called = true;
      return f.value = fn.apply(this, arguments);
    };

    f.called = false;
    return f;
  }

  function onceStrict(fn) {
    var f = function () {
      if (f.called) throw new Error(f.onceError);
      f.called = true;
      return f.value = fn.apply(this, arguments);
    };

    var name = fn.name || 'Function wrapped with `once`';
    f.onceError = name + " shouldn't be called more than once";
    f.called = false;
    return f;
  }
  once_1.strict = strict;

  const logOnceCode = once_1(deprecation => console.warn(deprecation));
  const logOnceHeaders = once_1(deprecation => console.warn(deprecation));
  /**
   * Error with extra properties to help with debugging
   */

  class RequestError extends Error {
    constructor(message, statusCode, options) {
      super(message); // Maintains proper stack trace (only available on V8)

      /* istanbul ignore next */

      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
      }

      this.name = "HttpError";
      this.status = statusCode;
      let headers;

      if ("headers" in options && typeof options.headers !== "undefined") {
        headers = options.headers;
      }

      if ("response" in options) {
        this.response = options.response;
        headers = options.response.headers;
      } // redact request credentials without mutating original request options


      const requestCopy = Object.assign({}, options.request);

      if (options.request.headers.authorization) {
        requestCopy.headers = Object.assign({}, options.request.headers, {
          authorization: options.request.headers.authorization.replace(/ .*$/, " [REDACTED]")
        });
      }

      requestCopy.url = requestCopy.url // client_id & client_secret can be passed as URL query parameters to increase rate limit
      // see https://developer.github.com/v3/#increasing-the-unauthenticated-rate-limit-for-oauth-applications
      .replace(/\bclient_secret=\w+/g, "client_secret=[REDACTED]") // OAuth tokens can be passed as URL query parameters, although it is not recommended
      // see https://developer.github.com/v3/#oauth2-token-sent-in-a-header
      .replace(/\baccess_token=\w+/g, "access_token=[REDACTED]");
      this.request = requestCopy; // deprecations

      Object.defineProperty(this, "code", {
        get() {
          logOnceCode(new Deprecation("[@octokit/request-error] `error.code` is deprecated, use `error.status`."));
          return statusCode;
        }

      });
      Object.defineProperty(this, "headers", {
        get() {
          logOnceHeaders(new Deprecation("[@octokit/request-error] `error.headers` is deprecated, use `error.response.headers`."));
          return headers || {};
        }

      });
    }

  }

  const VERSION$1 = "5.6.3";

  function getBufferResponse(response) {
    return response.arrayBuffer();
  }

  function fetchWrapper(requestOptions) {
    const log = requestOptions.request && requestOptions.request.log ? requestOptions.request.log : console;

    if (isPlainObject(requestOptions.body) || Array.isArray(requestOptions.body)) {
      requestOptions.body = JSON.stringify(requestOptions.body);
    }

    let headers = {};
    let status;
    let url;
    const fetch$$1 = requestOptions.request && requestOptions.request.fetch || fetch;
    return fetch$$1(requestOptions.url, Object.assign({
      method: requestOptions.method,
      body: requestOptions.body,
      headers: requestOptions.headers,
      redirect: requestOptions.redirect
    }, // `requestOptions.request.agent` type is incompatible
    // see https://github.com/octokit/types.ts/pull/264
    requestOptions.request)).then(async response => {
      url = response.url;
      status = response.status;

      for (const keyAndValue of response.headers) {
        headers[keyAndValue[0]] = keyAndValue[1];
      }

      if ("deprecation" in headers) {
        const matches = headers.link && headers.link.match(/<([^>]+)>; rel="deprecation"/);
        const deprecationLink = matches && matches.pop();
        log.warn(`[@octokit/request] "${requestOptions.method} ${requestOptions.url}" is deprecated. It is scheduled to be removed on ${headers.sunset}${deprecationLink ? `. See ${deprecationLink}` : ""}`);
      }

      if (status === 204 || status === 205) {
        return;
      } // GitHub API returns 200 for HEAD requests


      if (requestOptions.method === "HEAD") {
        if (status < 400) {
          return;
        }

        throw new RequestError(response.statusText, status, {
          response: {
            url,
            status,
            headers,
            data: undefined
          },
          request: requestOptions
        });
      }

      if (status === 304) {
        throw new RequestError("Not modified", status, {
          response: {
            url,
            status,
            headers,
            data: await getResponseData(response)
          },
          request: requestOptions
        });
      }

      if (status >= 400) {
        const data = await getResponseData(response);
        const error = new RequestError(toErrorMessage(data), status, {
          response: {
            url,
            status,
            headers,
            data
          },
          request: requestOptions
        });
        throw error;
      }

      return getResponseData(response);
    }).then(data => {
      return {
        status,
        url,
        headers,
        data
      };
    }).catch(error => {
      if (error instanceof RequestError) throw error;
      throw new RequestError(error.message, 500, {
        request: requestOptions
      });
    });
  }

  async function getResponseData(response) {
    const contentType = response.headers.get("content-type");

    if (/application\/json/.test(contentType)) {
      return response.json();
    }

    if (!contentType || /^text\/|charset=utf-8$/.test(contentType)) {
      return response.text();
    }

    return getBufferResponse(response);
  }

  function toErrorMessage(data) {
    if (typeof data === "string") return data; // istanbul ignore else - just in case

    if ("message" in data) {
      if (Array.isArray(data.errors)) {
        return `${data.message}: ${data.errors.map(JSON.stringify).join(", ")}`;
      }

      return data.message;
    } // istanbul ignore next - just in case


    return `Unknown error: ${JSON.stringify(data)}`;
  }

  function withDefaults$1(oldEndpoint, newDefaults) {
    const endpoint$$1 = oldEndpoint.defaults(newDefaults);

    const newApi = function (route, parameters) {
      const endpointOptions = endpoint$$1.merge(route, parameters);

      if (!endpointOptions.request || !endpointOptions.request.hook) {
        return fetchWrapper(endpoint$$1.parse(endpointOptions));
      }

      const request = (route, parameters) => {
        return fetchWrapper(endpoint$$1.parse(endpoint$$1.merge(route, parameters)));
      };

      Object.assign(request, {
        endpoint: endpoint$$1,
        defaults: withDefaults$1.bind(null, endpoint$$1)
      });
      return endpointOptions.request.hook(request, endpointOptions);
    };

    return Object.assign(newApi, {
      endpoint: endpoint$$1,
      defaults: withDefaults$1.bind(null, endpoint$$1)
    });
  }

  const request = withDefaults$1(endpoint, {
    headers: {
      "user-agent": `octokit-request.js/${VERSION$1} ${getUserAgent()}`
    }
  });

  const VERSION$2 = "4.8.0";

  function _buildMessageForResponseErrors(data) {
    return `Request failed due to following response errors:\n` + data.errors.map(e => ` - ${e.message}`).join("\n");
  }

  class GraphqlResponseError extends Error {
    constructor(request$$1, headers, response) {
      super(_buildMessageForResponseErrors(response));
      this.request = request$$1;
      this.headers = headers;
      this.response = response;
      this.name = "GraphqlResponseError"; // Expose the errors and response data in their shorthand properties.

      this.errors = response.errors;
      this.data = response.data; // Maintains proper stack trace (only available on V8)

      /* istanbul ignore next */

      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
      }
    }

  }

  const NON_VARIABLE_OPTIONS = ["method", "baseUrl", "url", "headers", "request", "query", "mediaType"];
  const FORBIDDEN_VARIABLE_OPTIONS = ["query", "method", "url"];
  const GHES_V3_SUFFIX_REGEX = /\/api\/v3\/?$/;

  function graphql(request$$1, query, options) {
    if (options) {
      if (typeof query === "string" && "query" in options) {
        return Promise.reject(new Error(`[@octokit/graphql] "query" cannot be used as variable name`));
      }

      for (const key in options) {
        if (!FORBIDDEN_VARIABLE_OPTIONS.includes(key)) continue;
        return Promise.reject(new Error(`[@octokit/graphql] "${key}" cannot be used as variable name`));
      }
    }

    const parsedOptions = typeof query === "string" ? Object.assign({
      query
    }, options) : query;
    const requestOptions = Object.keys(parsedOptions).reduce((result, key) => {
      if (NON_VARIABLE_OPTIONS.includes(key)) {
        result[key] = parsedOptions[key];
        return result;
      }

      if (!result.variables) {
        result.variables = {};
      }

      result.variables[key] = parsedOptions[key];
      return result;
    }, {}); // workaround for GitHub Enterprise baseUrl set with /api/v3 suffix
    // https://github.com/octokit/auth-app.js/issues/111#issuecomment-657610451

    const baseUrl = parsedOptions.baseUrl || request$$1.endpoint.DEFAULTS.baseUrl;

    if (GHES_V3_SUFFIX_REGEX.test(baseUrl)) {
      requestOptions.url = baseUrl.replace(GHES_V3_SUFFIX_REGEX, "/api/graphql");
    }

    return request$$1(requestOptions).then(response => {
      if (response.data.errors) {
        const headers = {};

        for (const key of Object.keys(response.headers)) {
          headers[key] = response.headers[key];
        }

        throw new GraphqlResponseError(requestOptions, headers, response.data);
      }

      return response.data.data;
    });
  }

  function withDefaults$2(request$1, newDefaults) {
    const newRequest = request$1.defaults(newDefaults);

    const newApi = (query, options) => {
      return graphql(newRequest, query, options);
    };

    return Object.assign(newApi, {
      defaults: withDefaults$2.bind(null, newRequest),
      endpoint: request.endpoint
    });
  }

  const graphql$1 = withDefaults$2(request, {
    headers: {
      "user-agent": `octokit-graphql.js/${VERSION$2} ${getUserAgent()}`
    },
    method: "POST",
    url: "/graphql"
  });

  function withCustomRequest(customRequest) {
    return withDefaults$2(customRequest, {
      method: "POST",
      url: "/graphql"
    });
  }

  const REGEX_IS_INSTALLATION_LEGACY = /^v1\./;
  const REGEX_IS_INSTALLATION = /^ghs_/;
  const REGEX_IS_USER_TO_SERVER = /^ghu_/;

  async function auth(token) {
    const isApp = token.split(/\./).length === 3;
    const isInstallation = REGEX_IS_INSTALLATION_LEGACY.test(token) || REGEX_IS_INSTALLATION.test(token);
    const isUserToServer = REGEX_IS_USER_TO_SERVER.test(token);
    const tokenType = isApp ? "app" : isInstallation ? "installation" : isUserToServer ? "user-to-server" : "oauth";
    return {
      type: "token",
      token: token,
      tokenType
    };
  }
  /**
   * Prefix token for usage in the Authorization header
   *
   * @param token OAuth token or JSON Web Token
   */


  function withAuthorizationPrefix(token) {
    if (token.split(/\./).length === 3) {
      return `bearer ${token}`;
    }

    return `token ${token}`;
  }

  async function hook(token, request, route, parameters) {
    const endpoint = request.endpoint.merge(route, parameters);
    endpoint.headers.authorization = withAuthorizationPrefix(token);
    return request(endpoint);
  }

  const createTokenAuth = function createTokenAuth(token) {
    if (!token) {
      throw new Error("[@octokit/auth-token] No token passed to createTokenAuth");
    }

    if (typeof token !== "string") {
      throw new Error("[@octokit/auth-token] Token passed to createTokenAuth is not a string");
    }

    token = token.replace(/^(token|bearer) +/i, "");
    return Object.assign(auth.bind(null, token), {
      hook: hook.bind(null, token)
    });
  };

  const VERSION$3 = "3.6.0";

  class Octokit {
    constructor(options = {}) {
      const hook = new Collection$1();
      const requestDefaults = {
        baseUrl: request.endpoint.DEFAULTS.baseUrl,
        headers: {},
        request: Object.assign({}, options.request, {
          // @ts-ignore internal usage only, no need to type
          hook: hook.bind(null, "request")
        }),
        mediaType: {
          previews: [],
          format: ""
        }
      }; // prepend default user agent with `options.userAgent` if set

      requestDefaults.headers["user-agent"] = [options.userAgent, `octokit-core.js/${VERSION$3} ${getUserAgent()}`].filter(Boolean).join(" ");

      if (options.baseUrl) {
        requestDefaults.baseUrl = options.baseUrl;
      }

      if (options.previews) {
        requestDefaults.mediaType.previews = options.previews;
      }

      if (options.timeZone) {
        requestDefaults.headers["time-zone"] = options.timeZone;
      }

      this.request = request.defaults(requestDefaults);
      this.graphql = withCustomRequest(this.request).defaults(requestDefaults);
      this.log = Object.assign({
        debug: () => {},
        info: () => {},
        warn: console.warn.bind(console),
        error: console.error.bind(console)
      }, options.log);
      this.hook = hook; // (1) If neither `options.authStrategy` nor `options.auth` are set, the `octokit` instance
      //     is unauthenticated. The `this.auth()` method is a no-op and no request hook is registered.
      // (2) If only `options.auth` is set, use the default token authentication strategy.
      // (3) If `options.authStrategy` is set then use it and pass in `options.auth`. Always pass own request as many strategies accept a custom request instance.
      // TODO: type `options.auth` based on `options.authStrategy`.

      if (!options.authStrategy) {
        if (!options.auth) {
          // (1)
          this.auth = async () => ({
            type: "unauthenticated"
          });
        } else {
          // (2)
          const auth = createTokenAuth(options.auth); // @ts-ignore  ¯\_(ツ)_/¯

          hook.wrap("request", auth.hook);
          this.auth = auth;
        }
      } else {
        const {
          authStrategy,
          ...otherOptions
        } = options;
        const auth = authStrategy(Object.assign({
          request: this.request,
          log: this.log,
          // we pass the current octokit instance as well as its constructor options
          // to allow for authentication strategies that return a new octokit instance
          // that shares the same internal state as the current one. The original
          // requirement for this was the "event-octokit" authentication strategy
          // of https://github.com/probot/octokit-auth-probot.
          octokit: this,
          octokitOptions: otherOptions
        }, options.auth)); // @ts-ignore  ¯\_(ツ)_/¯

        hook.wrap("request", auth.hook);
        this.auth = auth;
      } // apply plugins
      // https://stackoverflow.com/a/16345172


      const classConstructor = this.constructor;
      classConstructor.plugins.forEach(plugin => {
        Object.assign(this, plugin(this, options));
      });
    }

    static defaults(defaults) {
      const OctokitWithDefaults = class extends this {
        constructor(...args) {
          const options = args[0] || {};

          if (typeof defaults === "function") {
            super(defaults(options));
            return;
          }

          super(Object.assign({}, defaults, options, options.userAgent && defaults.userAgent ? {
            userAgent: `${options.userAgent} ${defaults.userAgent}`
          } : null));
        }

      };
      return OctokitWithDefaults;
    }
    /**
     * Attach a plugin (or many) to your Octokit instance.
     *
     * @example
     * const API = Octokit.plugin(plugin1, plugin2, plugin3, ...)
     */


    static plugin(...newPlugins) {
      var _a;

      const currentPlugins = this.plugins;
      const NewOctokit = (_a = class extends this {}, _a.plugins = currentPlugins.concat(newPlugins.filter(plugin => !currentPlugins.includes(plugin))), _a);
      return NewOctokit;
    }

  }

  Octokit.VERSION = VERSION$3;
  Octokit.plugins = [];

  const VERSION$4 = "1.0.4";
  /**
   * @param octokit Octokit instance
   * @param options Options passed to Octokit constructor
   */

  function requestLog(octokit) {
    octokit.hook.wrap("request", (request, options) => {
      octokit.log.debug("request", options);
      const start = Date.now();
      const requestOptions = octokit.request.endpoint.parse(options);
      const path$$1 = requestOptions.url.replace(options.baseUrl, "");
      return request(options).then(response => {
        octokit.log.info(`${requestOptions.method} ${path$$1} - ${response.status} in ${Date.now() - start}ms`);
        return response;
      }).catch(error => {
        octokit.log.info(`${requestOptions.method} ${path$$1} - ${error.status} in ${Date.now() - start}ms`);
        throw error;
      });
    });
  }

  requestLog.VERSION = VERSION$4;

  const VERSION$5 = "2.17.0";
  /**
   * Some “list” response that can be paginated have a different response structure
   *
   * They have a `total_count` key in the response (search also has `incomplete_results`,
   * /installation/repositories also has `repository_selection`), as well as a key with
   * the list of the items which name varies from endpoint to endpoint.
   *
   * Octokit normalizes these responses so that paginated results are always returned following
   * the same structure. One challenge is that if the list response has only one page, no Link
   * header is provided, so this header alone is not sufficient to check wether a response is
   * paginated or not.
   *
   * We check if a "total_count" key is present in the response data, but also make sure that
   * a "url" property is not, as the "Get the combined status for a specific ref" endpoint would
   * otherwise match: https://developer.github.com/v3/repos/statuses/#get-the-combined-status-for-a-specific-ref
   */

  function normalizePaginatedListResponse(response) {
    // endpoints can respond with 204 if repository is empty
    if (!response.data) {
      return { ...response,
        data: []
      };
    }

    const responseNeedsNormalization = "total_count" in response.data && !("url" in response.data);
    if (!responseNeedsNormalization) return response; // keep the additional properties intact as there is currently no other way
    // to retrieve the same information.

    const incompleteResults = response.data.incomplete_results;
    const repositorySelection = response.data.repository_selection;
    const totalCount = response.data.total_count;
    delete response.data.incomplete_results;
    delete response.data.repository_selection;
    delete response.data.total_count;
    const namespaceKey = Object.keys(response.data)[0];
    const data = response.data[namespaceKey];
    response.data = data;

    if (typeof incompleteResults !== "undefined") {
      response.data.incomplete_results = incompleteResults;
    }

    if (typeof repositorySelection !== "undefined") {
      response.data.repository_selection = repositorySelection;
    }

    response.data.total_count = totalCount;
    return response;
  }

  function iterator(octokit, route, parameters) {
    const options = typeof route === "function" ? route.endpoint(parameters) : octokit.request.endpoint(route, parameters);
    const requestMethod = typeof route === "function" ? route : octokit.request;
    const method = options.method;
    const headers = options.headers;
    let url = options.url;
    return {
      [Symbol.asyncIterator]: () => ({
        async next() {
          if (!url) return {
            done: true
          };

          try {
            const response = await requestMethod({
              method,
              url,
              headers
            });
            const normalizedResponse = normalizePaginatedListResponse(response); // `response.headers.link` format:
            // '<https://api.github.com/users/aseemk/followers?page=2>; rel="next", <https://api.github.com/users/aseemk/followers?page=2>; rel="last"'
            // sets `url` to undefined if "next" URL is not present or `link` header is not set

            url = ((normalizedResponse.headers.link || "").match(/<([^>]+)>;\s*rel="next"/) || [])[1];
            return {
              value: normalizedResponse
            };
          } catch (error) {
            if (error.status !== 409) throw error;
            url = "";
            return {
              value: {
                status: 200,
                headers: {},
                data: []
              }
            };
          }
        }

      })
    };
  }

  function paginate(octokit, route, parameters, mapFn) {
    if (typeof parameters === "function") {
      mapFn = parameters;
      parameters = undefined;
    }

    return gather(octokit, [], iterator(octokit, route, parameters)[Symbol.asyncIterator](), mapFn);
  }

  function gather(octokit, results, iterator, mapFn) {
    return iterator.next().then(result => {
      if (result.done) {
        return results;
      }

      let earlyExit = false;

      function done() {
        earlyExit = true;
      }

      results = results.concat(mapFn ? mapFn(result.value, done) : result.value.data);

      if (earlyExit) {
        return results;
      }

      return gather(octokit, results, iterator, mapFn);
    });
  }

  const composePaginateRest = Object.assign(paginate, {
    iterator
  });
  /**
   * @param octokit Octokit instance
   * @param options Options passed to Octokit constructor
   */


  function paginateRest(octokit) {
    return {
      paginate: Object.assign(paginate.bind(null, octokit), {
        iterator: iterator.bind(null, octokit)
      })
    };
  }

  paginateRest.VERSION = VERSION$5;

  const Endpoints = {
    actions: {
      addSelectedRepoToOrgSecret: ["PUT /orgs/{org}/actions/secrets/{secret_name}/repositories/{repository_id}"],
      approveWorkflowRun: ["POST /repos/{owner}/{repo}/actions/runs/{run_id}/approve"],
      cancelWorkflowRun: ["POST /repos/{owner}/{repo}/actions/runs/{run_id}/cancel"],
      createOrUpdateEnvironmentSecret: ["PUT /repositories/{repository_id}/environments/{environment_name}/secrets/{secret_name}"],
      createOrUpdateOrgSecret: ["PUT /orgs/{org}/actions/secrets/{secret_name}"],
      createOrUpdateRepoSecret: ["PUT /repos/{owner}/{repo}/actions/secrets/{secret_name}"],
      createRegistrationTokenForOrg: ["POST /orgs/{org}/actions/runners/registration-token"],
      createRegistrationTokenForRepo: ["POST /repos/{owner}/{repo}/actions/runners/registration-token"],
      createRemoveTokenForOrg: ["POST /orgs/{org}/actions/runners/remove-token"],
      createRemoveTokenForRepo: ["POST /repos/{owner}/{repo}/actions/runners/remove-token"],
      createWorkflowDispatch: ["POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches"],
      deleteArtifact: ["DELETE /repos/{owner}/{repo}/actions/artifacts/{artifact_id}"],
      deleteEnvironmentSecret: ["DELETE /repositories/{repository_id}/environments/{environment_name}/secrets/{secret_name}"],
      deleteOrgSecret: ["DELETE /orgs/{org}/actions/secrets/{secret_name}"],
      deleteRepoSecret: ["DELETE /repos/{owner}/{repo}/actions/secrets/{secret_name}"],
      deleteSelfHostedRunnerFromOrg: ["DELETE /orgs/{org}/actions/runners/{runner_id}"],
      deleteSelfHostedRunnerFromRepo: ["DELETE /repos/{owner}/{repo}/actions/runners/{runner_id}"],
      deleteWorkflowRun: ["DELETE /repos/{owner}/{repo}/actions/runs/{run_id}"],
      deleteWorkflowRunLogs: ["DELETE /repos/{owner}/{repo}/actions/runs/{run_id}/logs"],
      disableSelectedRepositoryGithubActionsOrganization: ["DELETE /orgs/{org}/actions/permissions/repositories/{repository_id}"],
      disableWorkflow: ["PUT /repos/{owner}/{repo}/actions/workflows/{workflow_id}/disable"],
      downloadArtifact: ["GET /repos/{owner}/{repo}/actions/artifacts/{artifact_id}/{archive_format}"],
      downloadJobLogsForWorkflowRun: ["GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs"],
      downloadWorkflowRunAttemptLogs: ["GET /repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt_number}/logs"],
      downloadWorkflowRunLogs: ["GET /repos/{owner}/{repo}/actions/runs/{run_id}/logs"],
      enableSelectedRepositoryGithubActionsOrganization: ["PUT /orgs/{org}/actions/permissions/repositories/{repository_id}"],
      enableWorkflow: ["PUT /repos/{owner}/{repo}/actions/workflows/{workflow_id}/enable"],
      getAllowedActionsOrganization: ["GET /orgs/{org}/actions/permissions/selected-actions"],
      getAllowedActionsRepository: ["GET /repos/{owner}/{repo}/actions/permissions/selected-actions"],
      getArtifact: ["GET /repos/{owner}/{repo}/actions/artifacts/{artifact_id}"],
      getEnvironmentPublicKey: ["GET /repositories/{repository_id}/environments/{environment_name}/secrets/public-key"],
      getEnvironmentSecret: ["GET /repositories/{repository_id}/environments/{environment_name}/secrets/{secret_name}"],
      getGithubActionsPermissionsOrganization: ["GET /orgs/{org}/actions/permissions"],
      getGithubActionsPermissionsRepository: ["GET /repos/{owner}/{repo}/actions/permissions"],
      getJobForWorkflowRun: ["GET /repos/{owner}/{repo}/actions/jobs/{job_id}"],
      getOrgPublicKey: ["GET /orgs/{org}/actions/secrets/public-key"],
      getOrgSecret: ["GET /orgs/{org}/actions/secrets/{secret_name}"],
      getPendingDeploymentsForRun: ["GET /repos/{owner}/{repo}/actions/runs/{run_id}/pending_deployments"],
      getRepoPermissions: ["GET /repos/{owner}/{repo}/actions/permissions", {}, {
        renamed: ["actions", "getGithubActionsPermissionsRepository"]
      }],
      getRepoPublicKey: ["GET /repos/{owner}/{repo}/actions/secrets/public-key"],
      getRepoSecret: ["GET /repos/{owner}/{repo}/actions/secrets/{secret_name}"],
      getReviewsForRun: ["GET /repos/{owner}/{repo}/actions/runs/{run_id}/approvals"],
      getSelfHostedRunnerForOrg: ["GET /orgs/{org}/actions/runners/{runner_id}"],
      getSelfHostedRunnerForRepo: ["GET /repos/{owner}/{repo}/actions/runners/{runner_id}"],
      getWorkflow: ["GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}"],
      getWorkflowRun: ["GET /repos/{owner}/{repo}/actions/runs/{run_id}"],
      getWorkflowRunAttempt: ["GET /repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt_number}"],
      getWorkflowRunUsage: ["GET /repos/{owner}/{repo}/actions/runs/{run_id}/timing"],
      getWorkflowUsage: ["GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/timing"],
      listArtifactsForRepo: ["GET /repos/{owner}/{repo}/actions/artifacts"],
      listEnvironmentSecrets: ["GET /repositories/{repository_id}/environments/{environment_name}/secrets"],
      listJobsForWorkflowRun: ["GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs"],
      listJobsForWorkflowRunAttempt: ["GET /repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt_number}/jobs"],
      listOrgSecrets: ["GET /orgs/{org}/actions/secrets"],
      listRepoSecrets: ["GET /repos/{owner}/{repo}/actions/secrets"],
      listRepoWorkflows: ["GET /repos/{owner}/{repo}/actions/workflows"],
      listRunnerApplicationsForOrg: ["GET /orgs/{org}/actions/runners/downloads"],
      listRunnerApplicationsForRepo: ["GET /repos/{owner}/{repo}/actions/runners/downloads"],
      listSelectedReposForOrgSecret: ["GET /orgs/{org}/actions/secrets/{secret_name}/repositories"],
      listSelectedRepositoriesEnabledGithubActionsOrganization: ["GET /orgs/{org}/actions/permissions/repositories"],
      listSelfHostedRunnersForOrg: ["GET /orgs/{org}/actions/runners"],
      listSelfHostedRunnersForRepo: ["GET /repos/{owner}/{repo}/actions/runners"],
      listWorkflowRunArtifacts: ["GET /repos/{owner}/{repo}/actions/runs/{run_id}/artifacts"],
      listWorkflowRuns: ["GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs"],
      listWorkflowRunsForRepo: ["GET /repos/{owner}/{repo}/actions/runs"],
      removeSelectedRepoFromOrgSecret: ["DELETE /orgs/{org}/actions/secrets/{secret_name}/repositories/{repository_id}"],
      reviewPendingDeploymentsForRun: ["POST /repos/{owner}/{repo}/actions/runs/{run_id}/pending_deployments"],
      setAllowedActionsOrganization: ["PUT /orgs/{org}/actions/permissions/selected-actions"],
      setAllowedActionsRepository: ["PUT /repos/{owner}/{repo}/actions/permissions/selected-actions"],
      setGithubActionsPermissionsOrganization: ["PUT /orgs/{org}/actions/permissions"],
      setGithubActionsPermissionsRepository: ["PUT /repos/{owner}/{repo}/actions/permissions"],
      setSelectedReposForOrgSecret: ["PUT /orgs/{org}/actions/secrets/{secret_name}/repositories"],
      setSelectedRepositoriesEnabledGithubActionsOrganization: ["PUT /orgs/{org}/actions/permissions/repositories"]
    },
    activity: {
      checkRepoIsStarredByAuthenticatedUser: ["GET /user/starred/{owner}/{repo}"],
      deleteRepoSubscription: ["DELETE /repos/{owner}/{repo}/subscription"],
      deleteThreadSubscription: ["DELETE /notifications/threads/{thread_id}/subscription"],
      getFeeds: ["GET /feeds"],
      getRepoSubscription: ["GET /repos/{owner}/{repo}/subscription"],
      getThread: ["GET /notifications/threads/{thread_id}"],
      getThreadSubscriptionForAuthenticatedUser: ["GET /notifications/threads/{thread_id}/subscription"],
      listEventsForAuthenticatedUser: ["GET /users/{username}/events"],
      listNotificationsForAuthenticatedUser: ["GET /notifications"],
      listOrgEventsForAuthenticatedUser: ["GET /users/{username}/events/orgs/{org}"],
      listPublicEvents: ["GET /events"],
      listPublicEventsForRepoNetwork: ["GET /networks/{owner}/{repo}/events"],
      listPublicEventsForUser: ["GET /users/{username}/events/public"],
      listPublicOrgEvents: ["GET /orgs/{org}/events"],
      listReceivedEventsForUser: ["GET /users/{username}/received_events"],
      listReceivedPublicEventsForUser: ["GET /users/{username}/received_events/public"],
      listRepoEvents: ["GET /repos/{owner}/{repo}/events"],
      listRepoNotificationsForAuthenticatedUser: ["GET /repos/{owner}/{repo}/notifications"],
      listReposStarredByAuthenticatedUser: ["GET /user/starred"],
      listReposStarredByUser: ["GET /users/{username}/starred"],
      listReposWatchedByUser: ["GET /users/{username}/subscriptions"],
      listStargazersForRepo: ["GET /repos/{owner}/{repo}/stargazers"],
      listWatchedReposForAuthenticatedUser: ["GET /user/subscriptions"],
      listWatchersForRepo: ["GET /repos/{owner}/{repo}/subscribers"],
      markNotificationsAsRead: ["PUT /notifications"],
      markRepoNotificationsAsRead: ["PUT /repos/{owner}/{repo}/notifications"],
      markThreadAsRead: ["PATCH /notifications/threads/{thread_id}"],
      setRepoSubscription: ["PUT /repos/{owner}/{repo}/subscription"],
      setThreadSubscription: ["PUT /notifications/threads/{thread_id}/subscription"],
      starRepoForAuthenticatedUser: ["PUT /user/starred/{owner}/{repo}"],
      unstarRepoForAuthenticatedUser: ["DELETE /user/starred/{owner}/{repo}"]
    },
    apps: {
      addRepoToInstallation: ["PUT /user/installations/{installation_id}/repositories/{repository_id}", {}, {
        renamed: ["apps", "addRepoToInstallationForAuthenticatedUser"]
      }],
      addRepoToInstallationForAuthenticatedUser: ["PUT /user/installations/{installation_id}/repositories/{repository_id}"],
      checkToken: ["POST /applications/{client_id}/token"],
      createContentAttachment: ["POST /content_references/{content_reference_id}/attachments", {
        mediaType: {
          previews: ["corsair"]
        }
      }],
      createContentAttachmentForRepo: ["POST /repos/{owner}/{repo}/content_references/{content_reference_id}/attachments", {
        mediaType: {
          previews: ["corsair"]
        }
      }],
      createFromManifest: ["POST /app-manifests/{code}/conversions"],
      createInstallationAccessToken: ["POST /app/installations/{installation_id}/access_tokens"],
      deleteAuthorization: ["DELETE /applications/{client_id}/grant"],
      deleteInstallation: ["DELETE /app/installations/{installation_id}"],
      deleteToken: ["DELETE /applications/{client_id}/token"],
      getAuthenticated: ["GET /app"],
      getBySlug: ["GET /apps/{app_slug}"],
      getInstallation: ["GET /app/installations/{installation_id}"],
      getOrgInstallation: ["GET /orgs/{org}/installation"],
      getRepoInstallation: ["GET /repos/{owner}/{repo}/installation"],
      getSubscriptionPlanForAccount: ["GET /marketplace_listing/accounts/{account_id}"],
      getSubscriptionPlanForAccountStubbed: ["GET /marketplace_listing/stubbed/accounts/{account_id}"],
      getUserInstallation: ["GET /users/{username}/installation"],
      getWebhookConfigForApp: ["GET /app/hook/config"],
      getWebhookDelivery: ["GET /app/hook/deliveries/{delivery_id}"],
      listAccountsForPlan: ["GET /marketplace_listing/plans/{plan_id}/accounts"],
      listAccountsForPlanStubbed: ["GET /marketplace_listing/stubbed/plans/{plan_id}/accounts"],
      listInstallationReposForAuthenticatedUser: ["GET /user/installations/{installation_id}/repositories"],
      listInstallations: ["GET /app/installations"],
      listInstallationsForAuthenticatedUser: ["GET /user/installations"],
      listPlans: ["GET /marketplace_listing/plans"],
      listPlansStubbed: ["GET /marketplace_listing/stubbed/plans"],
      listReposAccessibleToInstallation: ["GET /installation/repositories"],
      listSubscriptionsForAuthenticatedUser: ["GET /user/marketplace_purchases"],
      listSubscriptionsForAuthenticatedUserStubbed: ["GET /user/marketplace_purchases/stubbed"],
      listWebhookDeliveries: ["GET /app/hook/deliveries"],
      redeliverWebhookDelivery: ["POST /app/hook/deliveries/{delivery_id}/attempts"],
      removeRepoFromInstallation: ["DELETE /user/installations/{installation_id}/repositories/{repository_id}", {}, {
        renamed: ["apps", "removeRepoFromInstallationForAuthenticatedUser"]
      }],
      removeRepoFromInstallationForAuthenticatedUser: ["DELETE /user/installations/{installation_id}/repositories/{repository_id}"],
      resetToken: ["PATCH /applications/{client_id}/token"],
      revokeInstallationAccessToken: ["DELETE /installation/token"],
      scopeToken: ["POST /applications/{client_id}/token/scoped"],
      suspendInstallation: ["PUT /app/installations/{installation_id}/suspended"],
      unsuspendInstallation: ["DELETE /app/installations/{installation_id}/suspended"],
      updateWebhookConfigForApp: ["PATCH /app/hook/config"]
    },
    billing: {
      getGithubActionsBillingOrg: ["GET /orgs/{org}/settings/billing/actions"],
      getGithubActionsBillingUser: ["GET /users/{username}/settings/billing/actions"],
      getGithubPackagesBillingOrg: ["GET /orgs/{org}/settings/billing/packages"],
      getGithubPackagesBillingUser: ["GET /users/{username}/settings/billing/packages"],
      getSharedStorageBillingOrg: ["GET /orgs/{org}/settings/billing/shared-storage"],
      getSharedStorageBillingUser: ["GET /users/{username}/settings/billing/shared-storage"]
    },
    checks: {
      create: ["POST /repos/{owner}/{repo}/check-runs"],
      createSuite: ["POST /repos/{owner}/{repo}/check-suites"],
      get: ["GET /repos/{owner}/{repo}/check-runs/{check_run_id}"],
      getSuite: ["GET /repos/{owner}/{repo}/check-suites/{check_suite_id}"],
      listAnnotations: ["GET /repos/{owner}/{repo}/check-runs/{check_run_id}/annotations"],
      listForRef: ["GET /repos/{owner}/{repo}/commits/{ref}/check-runs"],
      listForSuite: ["GET /repos/{owner}/{repo}/check-suites/{check_suite_id}/check-runs"],
      listSuitesForRef: ["GET /repos/{owner}/{repo}/commits/{ref}/check-suites"],
      rerequestRun: ["POST /repos/{owner}/{repo}/check-runs/{check_run_id}/rerequest"],
      rerequestSuite: ["POST /repos/{owner}/{repo}/check-suites/{check_suite_id}/rerequest"],
      setSuitesPreferences: ["PATCH /repos/{owner}/{repo}/check-suites/preferences"],
      update: ["PATCH /repos/{owner}/{repo}/check-runs/{check_run_id}"]
    },
    codeScanning: {
      deleteAnalysis: ["DELETE /repos/{owner}/{repo}/code-scanning/analyses/{analysis_id}{?confirm_delete}"],
      getAlert: ["GET /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}", {}, {
        renamedParameters: {
          alert_id: "alert_number"
        }
      }],
      getAnalysis: ["GET /repos/{owner}/{repo}/code-scanning/analyses/{analysis_id}"],
      getSarif: ["GET /repos/{owner}/{repo}/code-scanning/sarifs/{sarif_id}"],
      listAlertInstances: ["GET /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}/instances"],
      listAlertsForRepo: ["GET /repos/{owner}/{repo}/code-scanning/alerts"],
      listAlertsInstances: ["GET /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}/instances", {}, {
        renamed: ["codeScanning", "listAlertInstances"]
      }],
      listRecentAnalyses: ["GET /repos/{owner}/{repo}/code-scanning/analyses"],
      updateAlert: ["PATCH /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}"],
      uploadSarif: ["POST /repos/{owner}/{repo}/code-scanning/sarifs"]
    },
    codesOfConduct: {
      getAllCodesOfConduct: ["GET /codes_of_conduct"],
      getConductCode: ["GET /codes_of_conduct/{key}"]
    },
    emojis: {
      get: ["GET /emojis"]
    },
    enterpriseAdmin: {
      disableSelectedOrganizationGithubActionsEnterprise: ["DELETE /enterprises/{enterprise}/actions/permissions/organizations/{org_id}"],
      enableSelectedOrganizationGithubActionsEnterprise: ["PUT /enterprises/{enterprise}/actions/permissions/organizations/{org_id}"],
      getAllowedActionsEnterprise: ["GET /enterprises/{enterprise}/actions/permissions/selected-actions"],
      getGithubActionsPermissionsEnterprise: ["GET /enterprises/{enterprise}/actions/permissions"],
      listSelectedOrganizationsEnabledGithubActionsEnterprise: ["GET /enterprises/{enterprise}/actions/permissions/organizations"],
      setAllowedActionsEnterprise: ["PUT /enterprises/{enterprise}/actions/permissions/selected-actions"],
      setGithubActionsPermissionsEnterprise: ["PUT /enterprises/{enterprise}/actions/permissions"],
      setSelectedOrganizationsEnabledGithubActionsEnterprise: ["PUT /enterprises/{enterprise}/actions/permissions/organizations"]
    },
    gists: {
      checkIsStarred: ["GET /gists/{gist_id}/star"],
      create: ["POST /gists"],
      createComment: ["POST /gists/{gist_id}/comments"],
      delete: ["DELETE /gists/{gist_id}"],
      deleteComment: ["DELETE /gists/{gist_id}/comments/{comment_id}"],
      fork: ["POST /gists/{gist_id}/forks"],
      get: ["GET /gists/{gist_id}"],
      getComment: ["GET /gists/{gist_id}/comments/{comment_id}"],
      getRevision: ["GET /gists/{gist_id}/{sha}"],
      list: ["GET /gists"],
      listComments: ["GET /gists/{gist_id}/comments"],
      listCommits: ["GET /gists/{gist_id}/commits"],
      listForUser: ["GET /users/{username}/gists"],
      listForks: ["GET /gists/{gist_id}/forks"],
      listPublic: ["GET /gists/public"],
      listStarred: ["GET /gists/starred"],
      star: ["PUT /gists/{gist_id}/star"],
      unstar: ["DELETE /gists/{gist_id}/star"],
      update: ["PATCH /gists/{gist_id}"],
      updateComment: ["PATCH /gists/{gist_id}/comments/{comment_id}"]
    },
    git: {
      createBlob: ["POST /repos/{owner}/{repo}/git/blobs"],
      createCommit: ["POST /repos/{owner}/{repo}/git/commits"],
      createRef: ["POST /repos/{owner}/{repo}/git/refs"],
      createTag: ["POST /repos/{owner}/{repo}/git/tags"],
      createTree: ["POST /repos/{owner}/{repo}/git/trees"],
      deleteRef: ["DELETE /repos/{owner}/{repo}/git/refs/{ref}"],
      getBlob: ["GET /repos/{owner}/{repo}/git/blobs/{file_sha}"],
      getCommit: ["GET /repos/{owner}/{repo}/git/commits/{commit_sha}"],
      getRef: ["GET /repos/{owner}/{repo}/git/ref/{ref}"],
      getTag: ["GET /repos/{owner}/{repo}/git/tags/{tag_sha}"],
      getTree: ["GET /repos/{owner}/{repo}/git/trees/{tree_sha}"],
      listMatchingRefs: ["GET /repos/{owner}/{repo}/git/matching-refs/{ref}"],
      updateRef: ["PATCH /repos/{owner}/{repo}/git/refs/{ref}"]
    },
    gitignore: {
      getAllTemplates: ["GET /gitignore/templates"],
      getTemplate: ["GET /gitignore/templates/{name}"]
    },
    interactions: {
      getRestrictionsForAuthenticatedUser: ["GET /user/interaction-limits"],
      getRestrictionsForOrg: ["GET /orgs/{org}/interaction-limits"],
      getRestrictionsForRepo: ["GET /repos/{owner}/{repo}/interaction-limits"],
      getRestrictionsForYourPublicRepos: ["GET /user/interaction-limits", {}, {
        renamed: ["interactions", "getRestrictionsForAuthenticatedUser"]
      }],
      removeRestrictionsForAuthenticatedUser: ["DELETE /user/interaction-limits"],
      removeRestrictionsForOrg: ["DELETE /orgs/{org}/interaction-limits"],
      removeRestrictionsForRepo: ["DELETE /repos/{owner}/{repo}/interaction-limits"],
      removeRestrictionsForYourPublicRepos: ["DELETE /user/interaction-limits", {}, {
        renamed: ["interactions", "removeRestrictionsForAuthenticatedUser"]
      }],
      setRestrictionsForAuthenticatedUser: ["PUT /user/interaction-limits"],
      setRestrictionsForOrg: ["PUT /orgs/{org}/interaction-limits"],
      setRestrictionsForRepo: ["PUT /repos/{owner}/{repo}/interaction-limits"],
      setRestrictionsForYourPublicRepos: ["PUT /user/interaction-limits", {}, {
        renamed: ["interactions", "setRestrictionsForAuthenticatedUser"]
      }]
    },
    issues: {
      addAssignees: ["POST /repos/{owner}/{repo}/issues/{issue_number}/assignees"],
      addLabels: ["POST /repos/{owner}/{repo}/issues/{issue_number}/labels"],
      checkUserCanBeAssigned: ["GET /repos/{owner}/{repo}/assignees/{assignee}"],
      create: ["POST /repos/{owner}/{repo}/issues"],
      createComment: ["POST /repos/{owner}/{repo}/issues/{issue_number}/comments"],
      createLabel: ["POST /repos/{owner}/{repo}/labels"],
      createMilestone: ["POST /repos/{owner}/{repo}/milestones"],
      deleteComment: ["DELETE /repos/{owner}/{repo}/issues/comments/{comment_id}"],
      deleteLabel: ["DELETE /repos/{owner}/{repo}/labels/{name}"],
      deleteMilestone: ["DELETE /repos/{owner}/{repo}/milestones/{milestone_number}"],
      get: ["GET /repos/{owner}/{repo}/issues/{issue_number}"],
      getComment: ["GET /repos/{owner}/{repo}/issues/comments/{comment_id}"],
      getEvent: ["GET /repos/{owner}/{repo}/issues/events/{event_id}"],
      getLabel: ["GET /repos/{owner}/{repo}/labels/{name}"],
      getMilestone: ["GET /repos/{owner}/{repo}/milestones/{milestone_number}"],
      list: ["GET /issues"],
      listAssignees: ["GET /repos/{owner}/{repo}/assignees"],
      listComments: ["GET /repos/{owner}/{repo}/issues/{issue_number}/comments"],
      listCommentsForRepo: ["GET /repos/{owner}/{repo}/issues/comments"],
      listEvents: ["GET /repos/{owner}/{repo}/issues/{issue_number}/events"],
      listEventsForRepo: ["GET /repos/{owner}/{repo}/issues/events"],
      listEventsForTimeline: ["GET /repos/{owner}/{repo}/issues/{issue_number}/timeline"],
      listForAuthenticatedUser: ["GET /user/issues"],
      listForOrg: ["GET /orgs/{org}/issues"],
      listForRepo: ["GET /repos/{owner}/{repo}/issues"],
      listLabelsForMilestone: ["GET /repos/{owner}/{repo}/milestones/{milestone_number}/labels"],
      listLabelsForRepo: ["GET /repos/{owner}/{repo}/labels"],
      listLabelsOnIssue: ["GET /repos/{owner}/{repo}/issues/{issue_number}/labels"],
      listMilestones: ["GET /repos/{owner}/{repo}/milestones"],
      lock: ["PUT /repos/{owner}/{repo}/issues/{issue_number}/lock"],
      removeAllLabels: ["DELETE /repos/{owner}/{repo}/issues/{issue_number}/labels"],
      removeAssignees: ["DELETE /repos/{owner}/{repo}/issues/{issue_number}/assignees"],
      removeLabel: ["DELETE /repos/{owner}/{repo}/issues/{issue_number}/labels/{name}"],
      setLabels: ["PUT /repos/{owner}/{repo}/issues/{issue_number}/labels"],
      unlock: ["DELETE /repos/{owner}/{repo}/issues/{issue_number}/lock"],
      update: ["PATCH /repos/{owner}/{repo}/issues/{issue_number}"],
      updateComment: ["PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}"],
      updateLabel: ["PATCH /repos/{owner}/{repo}/labels/{name}"],
      updateMilestone: ["PATCH /repos/{owner}/{repo}/milestones/{milestone_number}"]
    },
    licenses: {
      get: ["GET /licenses/{license}"],
      getAllCommonlyUsed: ["GET /licenses"],
      getForRepo: ["GET /repos/{owner}/{repo}/license"]
    },
    markdown: {
      render: ["POST /markdown"],
      renderRaw: ["POST /markdown/raw", {
        headers: {
          "content-type": "text/plain; charset=utf-8"
        }
      }]
    },
    meta: {
      get: ["GET /meta"],
      getOctocat: ["GET /octocat"],
      getZen: ["GET /zen"],
      root: ["GET /"]
    },
    migrations: {
      cancelImport: ["DELETE /repos/{owner}/{repo}/import"],
      deleteArchiveForAuthenticatedUser: ["DELETE /user/migrations/{migration_id}/archive"],
      deleteArchiveForOrg: ["DELETE /orgs/{org}/migrations/{migration_id}/archive"],
      downloadArchiveForOrg: ["GET /orgs/{org}/migrations/{migration_id}/archive"],
      getArchiveForAuthenticatedUser: ["GET /user/migrations/{migration_id}/archive"],
      getCommitAuthors: ["GET /repos/{owner}/{repo}/import/authors"],
      getImportStatus: ["GET /repos/{owner}/{repo}/import"],
      getLargeFiles: ["GET /repos/{owner}/{repo}/import/large_files"],
      getStatusForAuthenticatedUser: ["GET /user/migrations/{migration_id}"],
      getStatusForOrg: ["GET /orgs/{org}/migrations/{migration_id}"],
      listForAuthenticatedUser: ["GET /user/migrations"],
      listForOrg: ["GET /orgs/{org}/migrations"],
      listReposForAuthenticatedUser: ["GET /user/migrations/{migration_id}/repositories"],
      listReposForOrg: ["GET /orgs/{org}/migrations/{migration_id}/repositories"],
      listReposForUser: ["GET /user/migrations/{migration_id}/repositories", {}, {
        renamed: ["migrations", "listReposForAuthenticatedUser"]
      }],
      mapCommitAuthor: ["PATCH /repos/{owner}/{repo}/import/authors/{author_id}"],
      setLfsPreference: ["PATCH /repos/{owner}/{repo}/import/lfs"],
      startForAuthenticatedUser: ["POST /user/migrations"],
      startForOrg: ["POST /orgs/{org}/migrations"],
      startImport: ["PUT /repos/{owner}/{repo}/import"],
      unlockRepoForAuthenticatedUser: ["DELETE /user/migrations/{migration_id}/repos/{repo_name}/lock"],
      unlockRepoForOrg: ["DELETE /orgs/{org}/migrations/{migration_id}/repos/{repo_name}/lock"],
      updateImport: ["PATCH /repos/{owner}/{repo}/import"]
    },
    orgs: {
      blockUser: ["PUT /orgs/{org}/blocks/{username}"],
      cancelInvitation: ["DELETE /orgs/{org}/invitations/{invitation_id}"],
      checkBlockedUser: ["GET /orgs/{org}/blocks/{username}"],
      checkMembershipForUser: ["GET /orgs/{org}/members/{username}"],
      checkPublicMembershipForUser: ["GET /orgs/{org}/public_members/{username}"],
      convertMemberToOutsideCollaborator: ["PUT /orgs/{org}/outside_collaborators/{username}"],
      createInvitation: ["POST /orgs/{org}/invitations"],
      createWebhook: ["POST /orgs/{org}/hooks"],
      deleteWebhook: ["DELETE /orgs/{org}/hooks/{hook_id}"],
      get: ["GET /orgs/{org}"],
      getMembershipForAuthenticatedUser: ["GET /user/memberships/orgs/{org}"],
      getMembershipForUser: ["GET /orgs/{org}/memberships/{username}"],
      getWebhook: ["GET /orgs/{org}/hooks/{hook_id}"],
      getWebhookConfigForOrg: ["GET /orgs/{org}/hooks/{hook_id}/config"],
      getWebhookDelivery: ["GET /orgs/{org}/hooks/{hook_id}/deliveries/{delivery_id}"],
      list: ["GET /organizations"],
      listAppInstallations: ["GET /orgs/{org}/installations"],
      listBlockedUsers: ["GET /orgs/{org}/blocks"],
      listFailedInvitations: ["GET /orgs/{org}/failed_invitations"],
      listForAuthenticatedUser: ["GET /user/orgs"],
      listForUser: ["GET /users/{username}/orgs"],
      listInvitationTeams: ["GET /orgs/{org}/invitations/{invitation_id}/teams"],
      listMembers: ["GET /orgs/{org}/members"],
      listMembershipsForAuthenticatedUser: ["GET /user/memberships/orgs"],
      listOutsideCollaborators: ["GET /orgs/{org}/outside_collaborators"],
      listPendingInvitations: ["GET /orgs/{org}/invitations"],
      listPublicMembers: ["GET /orgs/{org}/public_members"],
      listWebhookDeliveries: ["GET /orgs/{org}/hooks/{hook_id}/deliveries"],
      listWebhooks: ["GET /orgs/{org}/hooks"],
      pingWebhook: ["POST /orgs/{org}/hooks/{hook_id}/pings"],
      redeliverWebhookDelivery: ["POST /orgs/{org}/hooks/{hook_id}/deliveries/{delivery_id}/attempts"],
      removeMember: ["DELETE /orgs/{org}/members/{username}"],
      removeMembershipForUser: ["DELETE /orgs/{org}/memberships/{username}"],
      removeOutsideCollaborator: ["DELETE /orgs/{org}/outside_collaborators/{username}"],
      removePublicMembershipForAuthenticatedUser: ["DELETE /orgs/{org}/public_members/{username}"],
      setMembershipForUser: ["PUT /orgs/{org}/memberships/{username}"],
      setPublicMembershipForAuthenticatedUser: ["PUT /orgs/{org}/public_members/{username}"],
      unblockUser: ["DELETE /orgs/{org}/blocks/{username}"],
      update: ["PATCH /orgs/{org}"],
      updateMembershipForAuthenticatedUser: ["PATCH /user/memberships/orgs/{org}"],
      updateWebhook: ["PATCH /orgs/{org}/hooks/{hook_id}"],
      updateWebhookConfigForOrg: ["PATCH /orgs/{org}/hooks/{hook_id}/config"]
    },
    packages: {
      deletePackageForAuthenticatedUser: ["DELETE /user/packages/{package_type}/{package_name}"],
      deletePackageForOrg: ["DELETE /orgs/{org}/packages/{package_type}/{package_name}"],
      deletePackageForUser: ["DELETE /users/{username}/packages/{package_type}/{package_name}"],
      deletePackageVersionForAuthenticatedUser: ["DELETE /user/packages/{package_type}/{package_name}/versions/{package_version_id}"],
      deletePackageVersionForOrg: ["DELETE /orgs/{org}/packages/{package_type}/{package_name}/versions/{package_version_id}"],
      deletePackageVersionForUser: ["DELETE /users/{username}/packages/{package_type}/{package_name}/versions/{package_version_id}"],
      getAllPackageVersionsForAPackageOwnedByAnOrg: ["GET /orgs/{org}/packages/{package_type}/{package_name}/versions", {}, {
        renamed: ["packages", "getAllPackageVersionsForPackageOwnedByOrg"]
      }],
      getAllPackageVersionsForAPackageOwnedByTheAuthenticatedUser: ["GET /user/packages/{package_type}/{package_name}/versions", {}, {
        renamed: ["packages", "getAllPackageVersionsForPackageOwnedByAuthenticatedUser"]
      }],
      getAllPackageVersionsForPackageOwnedByAuthenticatedUser: ["GET /user/packages/{package_type}/{package_name}/versions"],
      getAllPackageVersionsForPackageOwnedByOrg: ["GET /orgs/{org}/packages/{package_type}/{package_name}/versions"],
      getAllPackageVersionsForPackageOwnedByUser: ["GET /users/{username}/packages/{package_type}/{package_name}/versions"],
      getPackageForAuthenticatedUser: ["GET /user/packages/{package_type}/{package_name}"],
      getPackageForOrganization: ["GET /orgs/{org}/packages/{package_type}/{package_name}"],
      getPackageForUser: ["GET /users/{username}/packages/{package_type}/{package_name}"],
      getPackageVersionForAuthenticatedUser: ["GET /user/packages/{package_type}/{package_name}/versions/{package_version_id}"],
      getPackageVersionForOrganization: ["GET /orgs/{org}/packages/{package_type}/{package_name}/versions/{package_version_id}"],
      getPackageVersionForUser: ["GET /users/{username}/packages/{package_type}/{package_name}/versions/{package_version_id}"],
      listPackagesForAuthenticatedUser: ["GET /user/packages"],
      listPackagesForOrganization: ["GET /orgs/{org}/packages"],
      listPackagesForUser: ["GET /users/{username}/packages"],
      restorePackageForAuthenticatedUser: ["POST /user/packages/{package_type}/{package_name}/restore{?token}"],
      restorePackageForOrg: ["POST /orgs/{org}/packages/{package_type}/{package_name}/restore{?token}"],
      restorePackageForUser: ["POST /users/{username}/packages/{package_type}/{package_name}/restore{?token}"],
      restorePackageVersionForAuthenticatedUser: ["POST /user/packages/{package_type}/{package_name}/versions/{package_version_id}/restore"],
      restorePackageVersionForOrg: ["POST /orgs/{org}/packages/{package_type}/{package_name}/versions/{package_version_id}/restore"],
      restorePackageVersionForUser: ["POST /users/{username}/packages/{package_type}/{package_name}/versions/{package_version_id}/restore"]
    },
    projects: {
      addCollaborator: ["PUT /projects/{project_id}/collaborators/{username}"],
      createCard: ["POST /projects/columns/{column_id}/cards"],
      createColumn: ["POST /projects/{project_id}/columns"],
      createForAuthenticatedUser: ["POST /user/projects"],
      createForOrg: ["POST /orgs/{org}/projects"],
      createForRepo: ["POST /repos/{owner}/{repo}/projects"],
      delete: ["DELETE /projects/{project_id}"],
      deleteCard: ["DELETE /projects/columns/cards/{card_id}"],
      deleteColumn: ["DELETE /projects/columns/{column_id}"],
      get: ["GET /projects/{project_id}"],
      getCard: ["GET /projects/columns/cards/{card_id}"],
      getColumn: ["GET /projects/columns/{column_id}"],
      getPermissionForUser: ["GET /projects/{project_id}/collaborators/{username}/permission"],
      listCards: ["GET /projects/columns/{column_id}/cards"],
      listCollaborators: ["GET /projects/{project_id}/collaborators"],
      listColumns: ["GET /projects/{project_id}/columns"],
      listForOrg: ["GET /orgs/{org}/projects"],
      listForRepo: ["GET /repos/{owner}/{repo}/projects"],
      listForUser: ["GET /users/{username}/projects"],
      moveCard: ["POST /projects/columns/cards/{card_id}/moves"],
      moveColumn: ["POST /projects/columns/{column_id}/moves"],
      removeCollaborator: ["DELETE /projects/{project_id}/collaborators/{username}"],
      update: ["PATCH /projects/{project_id}"],
      updateCard: ["PATCH /projects/columns/cards/{card_id}"],
      updateColumn: ["PATCH /projects/columns/{column_id}"]
    },
    pulls: {
      checkIfMerged: ["GET /repos/{owner}/{repo}/pulls/{pull_number}/merge"],
      create: ["POST /repos/{owner}/{repo}/pulls"],
      createReplyForReviewComment: ["POST /repos/{owner}/{repo}/pulls/{pull_number}/comments/{comment_id}/replies"],
      createReview: ["POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews"],
      createReviewComment: ["POST /repos/{owner}/{repo}/pulls/{pull_number}/comments"],
      deletePendingReview: ["DELETE /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}"],
      deleteReviewComment: ["DELETE /repos/{owner}/{repo}/pulls/comments/{comment_id}"],
      dismissReview: ["PUT /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/dismissals"],
      get: ["GET /repos/{owner}/{repo}/pulls/{pull_number}"],
      getReview: ["GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}"],
      getReviewComment: ["GET /repos/{owner}/{repo}/pulls/comments/{comment_id}"],
      list: ["GET /repos/{owner}/{repo}/pulls"],
      listCommentsForReview: ["GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/comments"],
      listCommits: ["GET /repos/{owner}/{repo}/pulls/{pull_number}/commits"],
      listFiles: ["GET /repos/{owner}/{repo}/pulls/{pull_number}/files"],
      listRequestedReviewers: ["GET /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers"],
      listReviewComments: ["GET /repos/{owner}/{repo}/pulls/{pull_number}/comments"],
      listReviewCommentsForRepo: ["GET /repos/{owner}/{repo}/pulls/comments"],
      listReviews: ["GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews"],
      merge: ["PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge"],
      removeRequestedReviewers: ["DELETE /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers"],
      requestReviewers: ["POST /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers"],
      submitReview: ["POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/events"],
      update: ["PATCH /repos/{owner}/{repo}/pulls/{pull_number}"],
      updateBranch: ["PUT /repos/{owner}/{repo}/pulls/{pull_number}/update-branch"],
      updateReview: ["PUT /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}"],
      updateReviewComment: ["PATCH /repos/{owner}/{repo}/pulls/comments/{comment_id}"]
    },
    rateLimit: {
      get: ["GET /rate_limit"]
    },
    reactions: {
      createForCommitComment: ["POST /repos/{owner}/{repo}/comments/{comment_id}/reactions"],
      createForIssue: ["POST /repos/{owner}/{repo}/issues/{issue_number}/reactions"],
      createForIssueComment: ["POST /repos/{owner}/{repo}/issues/comments/{comment_id}/reactions"],
      createForPullRequestReviewComment: ["POST /repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions"],
      createForRelease: ["POST /repos/{owner}/{repo}/releases/{release_id}/reactions"],
      createForTeamDiscussionCommentInOrg: ["POST /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}/reactions"],
      createForTeamDiscussionInOrg: ["POST /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/reactions"],
      deleteForCommitComment: ["DELETE /repos/{owner}/{repo}/comments/{comment_id}/reactions/{reaction_id}"],
      deleteForIssue: ["DELETE /repos/{owner}/{repo}/issues/{issue_number}/reactions/{reaction_id}"],
      deleteForIssueComment: ["DELETE /repos/{owner}/{repo}/issues/comments/{comment_id}/reactions/{reaction_id}"],
      deleteForPullRequestComment: ["DELETE /repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions/{reaction_id}"],
      deleteForTeamDiscussion: ["DELETE /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/reactions/{reaction_id}"],
      deleteForTeamDiscussionComment: ["DELETE /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}/reactions/{reaction_id}"],
      listForCommitComment: ["GET /repos/{owner}/{repo}/comments/{comment_id}/reactions"],
      listForIssue: ["GET /repos/{owner}/{repo}/issues/{issue_number}/reactions"],
      listForIssueComment: ["GET /repos/{owner}/{repo}/issues/comments/{comment_id}/reactions"],
      listForPullRequestReviewComment: ["GET /repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions"],
      listForTeamDiscussionCommentInOrg: ["GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}/reactions"],
      listForTeamDiscussionInOrg: ["GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/reactions"]
    },
    repos: {
      acceptInvitation: ["PATCH /user/repository_invitations/{invitation_id}", {}, {
        renamed: ["repos", "acceptInvitationForAuthenticatedUser"]
      }],
      acceptInvitationForAuthenticatedUser: ["PATCH /user/repository_invitations/{invitation_id}"],
      addAppAccessRestrictions: ["POST /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps", {}, {
        mapToData: "apps"
      }],
      addCollaborator: ["PUT /repos/{owner}/{repo}/collaborators/{username}"],
      addStatusCheckContexts: ["POST /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts", {}, {
        mapToData: "contexts"
      }],
      addTeamAccessRestrictions: ["POST /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams", {}, {
        mapToData: "teams"
      }],
      addUserAccessRestrictions: ["POST /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users", {}, {
        mapToData: "users"
      }],
      checkCollaborator: ["GET /repos/{owner}/{repo}/collaborators/{username}"],
      checkVulnerabilityAlerts: ["GET /repos/{owner}/{repo}/vulnerability-alerts"],
      compareCommits: ["GET /repos/{owner}/{repo}/compare/{base}...{head}"],
      compareCommitsWithBasehead: ["GET /repos/{owner}/{repo}/compare/{basehead}"],
      createAutolink: ["POST /repos/{owner}/{repo}/autolinks"],
      createCommitComment: ["POST /repos/{owner}/{repo}/commits/{commit_sha}/comments"],
      createCommitSignatureProtection: ["POST /repos/{owner}/{repo}/branches/{branch}/protection/required_signatures"],
      createCommitStatus: ["POST /repos/{owner}/{repo}/statuses/{sha}"],
      createDeployKey: ["POST /repos/{owner}/{repo}/keys"],
      createDeployment: ["POST /repos/{owner}/{repo}/deployments"],
      createDeploymentStatus: ["POST /repos/{owner}/{repo}/deployments/{deployment_id}/statuses"],
      createDispatchEvent: ["POST /repos/{owner}/{repo}/dispatches"],
      createForAuthenticatedUser: ["POST /user/repos"],
      createFork: ["POST /repos/{owner}/{repo}/forks"],
      createInOrg: ["POST /orgs/{org}/repos"],
      createOrUpdateEnvironment: ["PUT /repos/{owner}/{repo}/environments/{environment_name}"],
      createOrUpdateFileContents: ["PUT /repos/{owner}/{repo}/contents/{path}"],
      createPagesSite: ["POST /repos/{owner}/{repo}/pages"],
      createRelease: ["POST /repos/{owner}/{repo}/releases"],
      createUsingTemplate: ["POST /repos/{template_owner}/{template_repo}/generate"],
      createWebhook: ["POST /repos/{owner}/{repo}/hooks"],
      declineInvitation: ["DELETE /user/repository_invitations/{invitation_id}", {}, {
        renamed: ["repos", "declineInvitationForAuthenticatedUser"]
      }],
      declineInvitationForAuthenticatedUser: ["DELETE /user/repository_invitations/{invitation_id}"],
      delete: ["DELETE /repos/{owner}/{repo}"],
      deleteAccessRestrictions: ["DELETE /repos/{owner}/{repo}/branches/{branch}/protection/restrictions"],
      deleteAdminBranchProtection: ["DELETE /repos/{owner}/{repo}/branches/{branch}/protection/enforce_admins"],
      deleteAnEnvironment: ["DELETE /repos/{owner}/{repo}/environments/{environment_name}"],
      deleteAutolink: ["DELETE /repos/{owner}/{repo}/autolinks/{autolink_id}"],
      deleteBranchProtection: ["DELETE /repos/{owner}/{repo}/branches/{branch}/protection"],
      deleteCommitComment: ["DELETE /repos/{owner}/{repo}/comments/{comment_id}"],
      deleteCommitSignatureProtection: ["DELETE /repos/{owner}/{repo}/branches/{branch}/protection/required_signatures"],
      deleteDeployKey: ["DELETE /repos/{owner}/{repo}/keys/{key_id}"],
      deleteDeployment: ["DELETE /repos/{owner}/{repo}/deployments/{deployment_id}"],
      deleteFile: ["DELETE /repos/{owner}/{repo}/contents/{path}"],
      deleteInvitation: ["DELETE /repos/{owner}/{repo}/invitations/{invitation_id}"],
      deletePagesSite: ["DELETE /repos/{owner}/{repo}/pages"],
      deletePullRequestReviewProtection: ["DELETE /repos/{owner}/{repo}/branches/{branch}/protection/required_pull_request_reviews"],
      deleteRelease: ["DELETE /repos/{owner}/{repo}/releases/{release_id}"],
      deleteReleaseAsset: ["DELETE /repos/{owner}/{repo}/releases/assets/{asset_id}"],
      deleteWebhook: ["DELETE /repos/{owner}/{repo}/hooks/{hook_id}"],
      disableAutomatedSecurityFixes: ["DELETE /repos/{owner}/{repo}/automated-security-fixes"],
      disableLfsForRepo: ["DELETE /repos/{owner}/{repo}/lfs"],
      disableVulnerabilityAlerts: ["DELETE /repos/{owner}/{repo}/vulnerability-alerts"],
      downloadArchive: ["GET /repos/{owner}/{repo}/zipball/{ref}", {}, {
        renamed: ["repos", "downloadZipballArchive"]
      }],
      downloadTarballArchive: ["GET /repos/{owner}/{repo}/tarball/{ref}"],
      downloadZipballArchive: ["GET /repos/{owner}/{repo}/zipball/{ref}"],
      enableAutomatedSecurityFixes: ["PUT /repos/{owner}/{repo}/automated-security-fixes"],
      enableLfsForRepo: ["PUT /repos/{owner}/{repo}/lfs"],
      enableVulnerabilityAlerts: ["PUT /repos/{owner}/{repo}/vulnerability-alerts"],
      generateReleaseNotes: ["POST /repos/{owner}/{repo}/releases/generate-notes"],
      get: ["GET /repos/{owner}/{repo}"],
      getAccessRestrictions: ["GET /repos/{owner}/{repo}/branches/{branch}/protection/restrictions"],
      getAdminBranchProtection: ["GET /repos/{owner}/{repo}/branches/{branch}/protection/enforce_admins"],
      getAllEnvironments: ["GET /repos/{owner}/{repo}/environments"],
      getAllStatusCheckContexts: ["GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts"],
      getAllTopics: ["GET /repos/{owner}/{repo}/topics", {
        mediaType: {
          previews: ["mercy"]
        }
      }],
      getAppsWithAccessToProtectedBranch: ["GET /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps"],
      getAutolink: ["GET /repos/{owner}/{repo}/autolinks/{autolink_id}"],
      getBranch: ["GET /repos/{owner}/{repo}/branches/{branch}"],
      getBranchProtection: ["GET /repos/{owner}/{repo}/branches/{branch}/protection"],
      getClones: ["GET /repos/{owner}/{repo}/traffic/clones"],
      getCodeFrequencyStats: ["GET /repos/{owner}/{repo}/stats/code_frequency"],
      getCollaboratorPermissionLevel: ["GET /repos/{owner}/{repo}/collaborators/{username}/permission"],
      getCombinedStatusForRef: ["GET /repos/{owner}/{repo}/commits/{ref}/status"],
      getCommit: ["GET /repos/{owner}/{repo}/commits/{ref}"],
      getCommitActivityStats: ["GET /repos/{owner}/{repo}/stats/commit_activity"],
      getCommitComment: ["GET /repos/{owner}/{repo}/comments/{comment_id}"],
      getCommitSignatureProtection: ["GET /repos/{owner}/{repo}/branches/{branch}/protection/required_signatures"],
      getCommunityProfileMetrics: ["GET /repos/{owner}/{repo}/community/profile"],
      getContent: ["GET /repos/{owner}/{repo}/contents/{path}"],
      getContributorsStats: ["GET /repos/{owner}/{repo}/stats/contributors"],
      getDeployKey: ["GET /repos/{owner}/{repo}/keys/{key_id}"],
      getDeployment: ["GET /repos/{owner}/{repo}/deployments/{deployment_id}"],
      getDeploymentStatus: ["GET /repos/{owner}/{repo}/deployments/{deployment_id}/statuses/{status_id}"],
      getEnvironment: ["GET /repos/{owner}/{repo}/environments/{environment_name}"],
      getLatestPagesBuild: ["GET /repos/{owner}/{repo}/pages/builds/latest"],
      getLatestRelease: ["GET /repos/{owner}/{repo}/releases/latest"],
      getPages: ["GET /repos/{owner}/{repo}/pages"],
      getPagesBuild: ["GET /repos/{owner}/{repo}/pages/builds/{build_id}"],
      getPagesHealthCheck: ["GET /repos/{owner}/{repo}/pages/health"],
      getParticipationStats: ["GET /repos/{owner}/{repo}/stats/participation"],
      getPullRequestReviewProtection: ["GET /repos/{owner}/{repo}/branches/{branch}/protection/required_pull_request_reviews"],
      getPunchCardStats: ["GET /repos/{owner}/{repo}/stats/punch_card"],
      getReadme: ["GET /repos/{owner}/{repo}/readme"],
      getReadmeInDirectory: ["GET /repos/{owner}/{repo}/readme/{dir}"],
      getRelease: ["GET /repos/{owner}/{repo}/releases/{release_id}"],
      getReleaseAsset: ["GET /repos/{owner}/{repo}/releases/assets/{asset_id}"],
      getReleaseByTag: ["GET /repos/{owner}/{repo}/releases/tags/{tag}"],
      getStatusChecksProtection: ["GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks"],
      getTeamsWithAccessToProtectedBranch: ["GET /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams"],
      getTopPaths: ["GET /repos/{owner}/{repo}/traffic/popular/paths"],
      getTopReferrers: ["GET /repos/{owner}/{repo}/traffic/popular/referrers"],
      getUsersWithAccessToProtectedBranch: ["GET /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users"],
      getViews: ["GET /repos/{owner}/{repo}/traffic/views"],
      getWebhook: ["GET /repos/{owner}/{repo}/hooks/{hook_id}"],
      getWebhookConfigForRepo: ["GET /repos/{owner}/{repo}/hooks/{hook_id}/config"],
      getWebhookDelivery: ["GET /repos/{owner}/{repo}/hooks/{hook_id}/deliveries/{delivery_id}"],
      listAutolinks: ["GET /repos/{owner}/{repo}/autolinks"],
      listBranches: ["GET /repos/{owner}/{repo}/branches"],
      listBranchesForHeadCommit: ["GET /repos/{owner}/{repo}/commits/{commit_sha}/branches-where-head"],
      listCollaborators: ["GET /repos/{owner}/{repo}/collaborators"],
      listCommentsForCommit: ["GET /repos/{owner}/{repo}/commits/{commit_sha}/comments"],
      listCommitCommentsForRepo: ["GET /repos/{owner}/{repo}/comments"],
      listCommitStatusesForRef: ["GET /repos/{owner}/{repo}/commits/{ref}/statuses"],
      listCommits: ["GET /repos/{owner}/{repo}/commits"],
      listContributors: ["GET /repos/{owner}/{repo}/contributors"],
      listDeployKeys: ["GET /repos/{owner}/{repo}/keys"],
      listDeploymentStatuses: ["GET /repos/{owner}/{repo}/deployments/{deployment_id}/statuses"],
      listDeployments: ["GET /repos/{owner}/{repo}/deployments"],
      listForAuthenticatedUser: ["GET /user/repos"],
      listForOrg: ["GET /orgs/{org}/repos"],
      listForUser: ["GET /users/{username}/repos"],
      listForks: ["GET /repos/{owner}/{repo}/forks"],
      listInvitations: ["GET /repos/{owner}/{repo}/invitations"],
      listInvitationsForAuthenticatedUser: ["GET /user/repository_invitations"],
      listLanguages: ["GET /repos/{owner}/{repo}/languages"],
      listPagesBuilds: ["GET /repos/{owner}/{repo}/pages/builds"],
      listPublic: ["GET /repositories"],
      listPullRequestsAssociatedWithCommit: ["GET /repos/{owner}/{repo}/commits/{commit_sha}/pulls"],
      listReleaseAssets: ["GET /repos/{owner}/{repo}/releases/{release_id}/assets"],
      listReleases: ["GET /repos/{owner}/{repo}/releases"],
      listTags: ["GET /repos/{owner}/{repo}/tags"],
      listTeams: ["GET /repos/{owner}/{repo}/teams"],
      listWebhookDeliveries: ["GET /repos/{owner}/{repo}/hooks/{hook_id}/deliveries"],
      listWebhooks: ["GET /repos/{owner}/{repo}/hooks"],
      merge: ["POST /repos/{owner}/{repo}/merges"],
      mergeUpstream: ["POST /repos/{owner}/{repo}/merge-upstream"],
      pingWebhook: ["POST /repos/{owner}/{repo}/hooks/{hook_id}/pings"],
      redeliverWebhookDelivery: ["POST /repos/{owner}/{repo}/hooks/{hook_id}/deliveries/{delivery_id}/attempts"],
      removeAppAccessRestrictions: ["DELETE /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps", {}, {
        mapToData: "apps"
      }],
      removeCollaborator: ["DELETE /repos/{owner}/{repo}/collaborators/{username}"],
      removeStatusCheckContexts: ["DELETE /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts", {}, {
        mapToData: "contexts"
      }],
      removeStatusCheckProtection: ["DELETE /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks"],
      removeTeamAccessRestrictions: ["DELETE /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams", {}, {
        mapToData: "teams"
      }],
      removeUserAccessRestrictions: ["DELETE /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users", {}, {
        mapToData: "users"
      }],
      renameBranch: ["POST /repos/{owner}/{repo}/branches/{branch}/rename"],
      replaceAllTopics: ["PUT /repos/{owner}/{repo}/topics", {
        mediaType: {
          previews: ["mercy"]
        }
      }],
      requestPagesBuild: ["POST /repos/{owner}/{repo}/pages/builds"],
      setAdminBranchProtection: ["POST /repos/{owner}/{repo}/branches/{branch}/protection/enforce_admins"],
      setAppAccessRestrictions: ["PUT /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps", {}, {
        mapToData: "apps"
      }],
      setStatusCheckContexts: ["PUT /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts", {}, {
        mapToData: "contexts"
      }],
      setTeamAccessRestrictions: ["PUT /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams", {}, {
        mapToData: "teams"
      }],
      setUserAccessRestrictions: ["PUT /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users", {}, {
        mapToData: "users"
      }],
      testPushWebhook: ["POST /repos/{owner}/{repo}/hooks/{hook_id}/tests"],
      transfer: ["POST /repos/{owner}/{repo}/transfer"],
      update: ["PATCH /repos/{owner}/{repo}"],
      updateBranchProtection: ["PUT /repos/{owner}/{repo}/branches/{branch}/protection"],
      updateCommitComment: ["PATCH /repos/{owner}/{repo}/comments/{comment_id}"],
      updateInformationAboutPagesSite: ["PUT /repos/{owner}/{repo}/pages"],
      updateInvitation: ["PATCH /repos/{owner}/{repo}/invitations/{invitation_id}"],
      updatePullRequestReviewProtection: ["PATCH /repos/{owner}/{repo}/branches/{branch}/protection/required_pull_request_reviews"],
      updateRelease: ["PATCH /repos/{owner}/{repo}/releases/{release_id}"],
      updateReleaseAsset: ["PATCH /repos/{owner}/{repo}/releases/assets/{asset_id}"],
      updateStatusCheckPotection: ["PATCH /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks", {}, {
        renamed: ["repos", "updateStatusCheckProtection"]
      }],
      updateStatusCheckProtection: ["PATCH /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks"],
      updateWebhook: ["PATCH /repos/{owner}/{repo}/hooks/{hook_id}"],
      updateWebhookConfigForRepo: ["PATCH /repos/{owner}/{repo}/hooks/{hook_id}/config"],
      uploadReleaseAsset: ["POST /repos/{owner}/{repo}/releases/{release_id}/assets{?name,label}", {
        baseUrl: "https://uploads.github.com"
      }]
    },
    search: {
      code: ["GET /search/code"],
      commits: ["GET /search/commits"],
      issuesAndPullRequests: ["GET /search/issues"],
      labels: ["GET /search/labels"],
      repos: ["GET /search/repositories"],
      topics: ["GET /search/topics", {
        mediaType: {
          previews: ["mercy"]
        }
      }],
      users: ["GET /search/users"]
    },
    secretScanning: {
      getAlert: ["GET /repos/{owner}/{repo}/secret-scanning/alerts/{alert_number}"],
      listAlertsForOrg: ["GET /orgs/{org}/secret-scanning/alerts"],
      listAlertsForRepo: ["GET /repos/{owner}/{repo}/secret-scanning/alerts"],
      updateAlert: ["PATCH /repos/{owner}/{repo}/secret-scanning/alerts/{alert_number}"]
    },
    teams: {
      addOrUpdateMembershipForUserInOrg: ["PUT /orgs/{org}/teams/{team_slug}/memberships/{username}"],
      addOrUpdateProjectPermissionsInOrg: ["PUT /orgs/{org}/teams/{team_slug}/projects/{project_id}"],
      addOrUpdateRepoPermissionsInOrg: ["PUT /orgs/{org}/teams/{team_slug}/repos/{owner}/{repo}"],
      checkPermissionsForProjectInOrg: ["GET /orgs/{org}/teams/{team_slug}/projects/{project_id}"],
      checkPermissionsForRepoInOrg: ["GET /orgs/{org}/teams/{team_slug}/repos/{owner}/{repo}"],
      create: ["POST /orgs/{org}/teams"],
      createDiscussionCommentInOrg: ["POST /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments"],
      createDiscussionInOrg: ["POST /orgs/{org}/teams/{team_slug}/discussions"],
      deleteDiscussionCommentInOrg: ["DELETE /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}"],
      deleteDiscussionInOrg: ["DELETE /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}"],
      deleteInOrg: ["DELETE /orgs/{org}/teams/{team_slug}"],
      getByName: ["GET /orgs/{org}/teams/{team_slug}"],
      getDiscussionCommentInOrg: ["GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}"],
      getDiscussionInOrg: ["GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}"],
      getMembershipForUserInOrg: ["GET /orgs/{org}/teams/{team_slug}/memberships/{username}"],
      list: ["GET /orgs/{org}/teams"],
      listChildInOrg: ["GET /orgs/{org}/teams/{team_slug}/teams"],
      listDiscussionCommentsInOrg: ["GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments"],
      listDiscussionsInOrg: ["GET /orgs/{org}/teams/{team_slug}/discussions"],
      listForAuthenticatedUser: ["GET /user/teams"],
      listMembersInOrg: ["GET /orgs/{org}/teams/{team_slug}/members"],
      listPendingInvitationsInOrg: ["GET /orgs/{org}/teams/{team_slug}/invitations"],
      listProjectsInOrg: ["GET /orgs/{org}/teams/{team_slug}/projects"],
      listReposInOrg: ["GET /orgs/{org}/teams/{team_slug}/repos"],
      removeMembershipForUserInOrg: ["DELETE /orgs/{org}/teams/{team_slug}/memberships/{username}"],
      removeProjectInOrg: ["DELETE /orgs/{org}/teams/{team_slug}/projects/{project_id}"],
      removeRepoInOrg: ["DELETE /orgs/{org}/teams/{team_slug}/repos/{owner}/{repo}"],
      updateDiscussionCommentInOrg: ["PATCH /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}"],
      updateDiscussionInOrg: ["PATCH /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}"],
      updateInOrg: ["PATCH /orgs/{org}/teams/{team_slug}"]
    },
    users: {
      addEmailForAuthenticated: ["POST /user/emails", {}, {
        renamed: ["users", "addEmailForAuthenticatedUser"]
      }],
      addEmailForAuthenticatedUser: ["POST /user/emails"],
      block: ["PUT /user/blocks/{username}"],
      checkBlocked: ["GET /user/blocks/{username}"],
      checkFollowingForUser: ["GET /users/{username}/following/{target_user}"],
      checkPersonIsFollowedByAuthenticated: ["GET /user/following/{username}"],
      createGpgKeyForAuthenticated: ["POST /user/gpg_keys", {}, {
        renamed: ["users", "createGpgKeyForAuthenticatedUser"]
      }],
      createGpgKeyForAuthenticatedUser: ["POST /user/gpg_keys"],
      createPublicSshKeyForAuthenticated: ["POST /user/keys", {}, {
        renamed: ["users", "createPublicSshKeyForAuthenticatedUser"]
      }],
      createPublicSshKeyForAuthenticatedUser: ["POST /user/keys"],
      deleteEmailForAuthenticated: ["DELETE /user/emails", {}, {
        renamed: ["users", "deleteEmailForAuthenticatedUser"]
      }],
      deleteEmailForAuthenticatedUser: ["DELETE /user/emails"],
      deleteGpgKeyForAuthenticated: ["DELETE /user/gpg_keys/{gpg_key_id}", {}, {
        renamed: ["users", "deleteGpgKeyForAuthenticatedUser"]
      }],
      deleteGpgKeyForAuthenticatedUser: ["DELETE /user/gpg_keys/{gpg_key_id}"],
      deletePublicSshKeyForAuthenticated: ["DELETE /user/keys/{key_id}", {}, {
        renamed: ["users", "deletePublicSshKeyForAuthenticatedUser"]
      }],
      deletePublicSshKeyForAuthenticatedUser: ["DELETE /user/keys/{key_id}"],
      follow: ["PUT /user/following/{username}"],
      getAuthenticated: ["GET /user"],
      getByUsername: ["GET /users/{username}"],
      getContextForUser: ["GET /users/{username}/hovercard"],
      getGpgKeyForAuthenticated: ["GET /user/gpg_keys/{gpg_key_id}", {}, {
        renamed: ["users", "getGpgKeyForAuthenticatedUser"]
      }],
      getGpgKeyForAuthenticatedUser: ["GET /user/gpg_keys/{gpg_key_id}"],
      getPublicSshKeyForAuthenticated: ["GET /user/keys/{key_id}", {}, {
        renamed: ["users", "getPublicSshKeyForAuthenticatedUser"]
      }],
      getPublicSshKeyForAuthenticatedUser: ["GET /user/keys/{key_id}"],
      list: ["GET /users"],
      listBlockedByAuthenticated: ["GET /user/blocks", {}, {
        renamed: ["users", "listBlockedByAuthenticatedUser"]
      }],
      listBlockedByAuthenticatedUser: ["GET /user/blocks"],
      listEmailsForAuthenticated: ["GET /user/emails", {}, {
        renamed: ["users", "listEmailsForAuthenticatedUser"]
      }],
      listEmailsForAuthenticatedUser: ["GET /user/emails"],
      listFollowedByAuthenticated: ["GET /user/following", {}, {
        renamed: ["users", "listFollowedByAuthenticatedUser"]
      }],
      listFollowedByAuthenticatedUser: ["GET /user/following"],
      listFollowersForAuthenticatedUser: ["GET /user/followers"],
      listFollowersForUser: ["GET /users/{username}/followers"],
      listFollowingForUser: ["GET /users/{username}/following"],
      listGpgKeysForAuthenticated: ["GET /user/gpg_keys", {}, {
        renamed: ["users", "listGpgKeysForAuthenticatedUser"]
      }],
      listGpgKeysForAuthenticatedUser: ["GET /user/gpg_keys"],
      listGpgKeysForUser: ["GET /users/{username}/gpg_keys"],
      listPublicEmailsForAuthenticated: ["GET /user/public_emails", {}, {
        renamed: ["users", "listPublicEmailsForAuthenticatedUser"]
      }],
      listPublicEmailsForAuthenticatedUser: ["GET /user/public_emails"],
      listPublicKeysForUser: ["GET /users/{username}/keys"],
      listPublicSshKeysForAuthenticated: ["GET /user/keys", {}, {
        renamed: ["users", "listPublicSshKeysForAuthenticatedUser"]
      }],
      listPublicSshKeysForAuthenticatedUser: ["GET /user/keys"],
      setPrimaryEmailVisibilityForAuthenticated: ["PATCH /user/email/visibility", {}, {
        renamed: ["users", "setPrimaryEmailVisibilityForAuthenticatedUser"]
      }],
      setPrimaryEmailVisibilityForAuthenticatedUser: ["PATCH /user/email/visibility"],
      unblock: ["DELETE /user/blocks/{username}"],
      unfollow: ["DELETE /user/following/{username}"],
      updateAuthenticated: ["PATCH /user"]
    }
  };
  const VERSION$6 = "5.13.0";

  function endpointsToMethods(octokit, endpointsMap) {
    const newMethods = {};

    for (const [scope, endpoints] of Object.entries(endpointsMap)) {
      for (const [methodName, endpoint] of Object.entries(endpoints)) {
        const [route, defaults, decorations] = endpoint;
        const [method, url] = route.split(/ /);
        const endpointDefaults = Object.assign({
          method,
          url
        }, defaults);

        if (!newMethods[scope]) {
          newMethods[scope] = {};
        }

        const scopeMethods = newMethods[scope];

        if (decorations) {
          scopeMethods[methodName] = decorate(octokit, scope, methodName, endpointDefaults, decorations);
          continue;
        }

        scopeMethods[methodName] = octokit.request.defaults(endpointDefaults);
      }
    }

    return newMethods;
  }

  function decorate(octokit, scope, methodName, defaults, decorations) {
    const requestWithDefaults = octokit.request.defaults(defaults);
    /* istanbul ignore next */

    function withDecorations(...args) {
      // @ts-ignore https://github.com/microsoft/TypeScript/issues/25488
      let options = requestWithDefaults.endpoint.merge(...args); // There are currently no other decorations than `.mapToData`

      if (decorations.mapToData) {
        options = Object.assign({}, options, {
          data: options[decorations.mapToData],
          [decorations.mapToData]: undefined
        });
        return requestWithDefaults(options);
      }

      if (decorations.renamed) {
        const [newScope, newMethodName] = decorations.renamed;
        octokit.log.warn(`octokit.${scope}.${methodName}() has been renamed to octokit.${newScope}.${newMethodName}()`);
      }

      if (decorations.deprecated) {
        octokit.log.warn(decorations.deprecated);
      }

      if (decorations.renamedParameters) {
        // @ts-ignore https://github.com/microsoft/TypeScript/issues/25488
        const options = requestWithDefaults.endpoint.merge(...args);

        for (const [name, alias] of Object.entries(decorations.renamedParameters)) {
          if (name in options) {
            octokit.log.warn(`"${name}" parameter is deprecated for "octokit.${scope}.${methodName}()". Use "${alias}" instead`);

            if (!(alias in options)) {
              options[alias] = options[name];
            }

            delete options[name];
          }
        }

        return requestWithDefaults(options);
      } // @ts-ignore https://github.com/microsoft/TypeScript/issues/25488


      return requestWithDefaults(...args);
    }

    return Object.assign(withDecorations, requestWithDefaults);
  }

  function legacyRestEndpointMethods(octokit) {
    const api = endpointsToMethods(octokit, Endpoints);
    return { ...api,
      rest: api
    };
  }

  legacyRestEndpointMethods.VERSION = VERSION$6;

  const VERSION$7 = "18.12.0";
  const Octokit$1 = Octokit.plugin(requestLog, legacyRestEndpointMethods, paginateRest).defaults({
    userAgent: `octokit-rest.js/${VERSION$7}`
  });

  let okit = null;
  const prodReadyLabel = "Ready For Release";
  const prodManualLabel = "Ready For Release (manual)";
  /* The deployment process is separated into two different parts:
   * `rally deploy prep` Links jira tickets to PRs and assigns labels based on their status
   * `rally deploy merge` Takes all the labeled PRs, changes their base branch to the release, and merges them
  */

  let Deploy = {
    async test() {
      //await this.makeRelease();
      await this.gh();
    },

    get octokit() {
      if (okit) return okit;
      return okit = new Octokit$1({
        auth: exports.configObject.deploy.github,
        userAgent: `rally-tools deploy ${exports.configObject.appName}`
      });
    },

    getOctokitConfig() {
      return {
        owner: exports.configObject.deploy.org,
        repo: exports.configObject.deploy.repo
      };
    },

    async getIssues(needsJira) {
      let base = this.getOctokitConfig();
      let pullList = await this.octokit.paginate("GET /repos/{owner}/{repo}/issues", base);
      return await Promise.all(pullList.map(issue => this.assembleIssue(issue, needsJira)));
    },

    async gh() {
      let issues = await this.getIssues(true);

      for (let issue of issues) {
        //await this.printIssue(issue);
        await this.checkStatus(issue);
      }
    },

    cardRegex: /\[(\w+)\-(\d+)\]/,

    async assembleIssue(issue, needsJira) {
      let parsedTitle = issue.parsedTitle = this.cardRegex.exec(issue.title);

      if (exports.configObject.verbose) {
        write(chalk`Found github issue: {blue ${issue.title}}... `);
      }

      if (!parsedTitle || !needsJira) {
        if (exports.configObject.verbose) {
          log(`No jira issue found in title`);
        }

        return issue;
      }

      let cardLink = `${exports.configObject.deploy.board}/issue/${parsedTitle[1]}-${parsedTitle[2]}`;
      let requestOptions = {
        method: "GET",
        headers: {
          "Authorization": `Basic ${Buffer.from(exports.configObject.deploy.jira).toString("base64")}`
        }
      };

      if (exports.configObject.verbose) {
        log(chalk`Checking jira board: {green ${this.printJiraTicket(issue)}}.`);
      }

      let response = await fetch(cardLink, requestOptions);
      let jiraInfo = await response.json();
      let parsedInfo = {
        assignee_qa: jiraInfo.fields.customfield_17250,
        assignee_dev: jiraInfo.fields.assignee,
        reporter: jiraInfo.fields.reporter,
        labels: jiraInfo.fields.labels,
        creator: jiraInfo.fields.creator,
        points: jiraInfo.fields.customfield_18350,
        status: jiraInfo.fields.status
      };
      issue.jiraInfoFull = jiraInfo;
      issue.jira = parsedInfo;

      if (exports.configObject.verbose) {
        log(chalk`Status of {green ${this.printJiraTicket(issue)}} is {red ${parsedInfo.status.name}}.`);
      }

      return issue;
    },

    name(j) {
      if (!j) return "(None)";
      return j.displayName;
    },

    async printIssue(issue) {
      if (!issue.jira) return;
      let j = issue.jira;
      let f = issue.jiraInfoFull;
      let format = chalk`PR #${issue.number}: ${issue.title}
    Dev: ${this.name(j.assignee_dev)}
    QA: ${this.name(j.assignee_qa)}
    Status: ${j.status.name}
    URL: ${issue.pull_request.html_url}
        `;
      log(format);
    },

    async setBase(issue, newBase) {
      let config = this.getOctokitConfig();
      config.pull_number = issue.number;
      config.base = newBase;
      return await this.octokit.request("PATCH /repos/{owner}/{repo}/pulls/{pull_number}", config);
    },

    async modifyLabel(issue, label, shouldHave) {
      let labels = new Set(issue.labels.map(x => x.name));
      let oldSize = labels.size;
      let verb;

      if (shouldHave) {
        verb = "Adding";
        labels.add(label);
      } else {
        verb = "Removing";
        labels.delete(label);
      }

      if (labels.size != oldSize) {
        let config = this.getOctokitConfig();
        config.pull_number = issue.number;
        config.labels = Array.from(labels);
        log(chalk`${verb} label {green ${label}} on {blue PR #${issue.number}}`);
        return await this.octokit.request("PATCH /repos/{owner}/{repo}/issues/{pull_number}", config);
      }

      return [null, null];
    },

    async checkStatus(issue) {
      var _issue$parsedTitle;

      let labels = new Set(issue.labels.map(x => x.name));

      if (!issue.jira) {
        if (labels.has(prodReadyLabel)) {
          log(chalk`{yellow Warning:} PR #${issue.number} has prod label but no linked jira card`);
        }

        return;
      }

      let board = issue === null || issue === void 0 ? void 0 : (_issue$parsedTitle = issue.parsedTitle) === null || _issue$parsedTitle === void 0 ? void 0 : _issue$parsedTitle[1];
      let requiredProdStatus = exports.configObject.deploy.boardMappings[board];

      if (requiredProdStatus) {
        await this.modifyLabel(issue, prodReadyLabel, issue.jira.status.name == requiredProdStatus);
      }
    },

    printJiraTicket(issue) {
      if (issue.parsedTitle) {
        return `${issue.parsedTitle[1]}-${issue.parsedTitle[2]}`;
      } else {
        return `(No Jira Ticket)`;
      }
    },

    async makeRelease(args) {
      let releaseBranchName = "";

      if (args.date) {
        releaseBranchName = args.date;
      } else {
        let dateCommand = await spawn({
          "noecho": true
        }, "date", ["+release-%y-%b-%d"]);
        releaseBranchName = dateCommand.stdout.trim();
      }

      let makeBranch = await runGit([0, 128], "checkout", "-b", releaseBranchName);

      if (makeBranch[1].includes("already exists")) {
        await runGit([0], "checkout", releaseBranchName);
        await runGit([0], "pull", "origin", releaseBranchName);
      } else {
        await runGit([0], "push", "-u", "origin", "HEAD");
      }

      let issues = await this.getIssues();

      for (let issue of issues) {
        let labels = new Set(issue.labels.map(x => x.name));
        if (!labels.has(prodReadyLabel) && !labels.has(prodManualLabel)) continue;
        await this.setBase(issue, releaseBranchName);
        write(chalk`Changed base of ${issue.number} (${this.printJiraTicket(issue)}) to ${releaseBranchName}... `);
        let config = this.getOctokitConfig();
        config.merge_method = "squash";
        config.pull_number = issue.number;
        await this.octokit.request("PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge", config);
        log(chalk`Merged.`);
      }

      await runGit([0], "pull");
    }

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
        let repodir = exports.configObject.repodir;

        if (repodir) {
          try {
            fs__default.lstatSync(repodir).isDirectory();
            return [true, 0];
          } catch (e) {
            return [false, 0];
          }
        } else {
          throw new UnconfiguredEnvError();
        }
      }

      let start = new Date();
      let result = await lib.makeAPIRequest({
        env,
        path: "/providers?page=1p1",
        fullResponse: true,
        timeout: 2000
      });
      let timed = new Date() - start;
      return [result.statusCode, timed];
    }

  };
  async function categorizeString(str, defaultSubproject = undefined) {
    str = str.trim();

    if (str.startsWith('"')) {
      str = str.slice(1, -1);
    }

    if (match = /^(\w)-(\w{1,10})-(\d{1,10}):/.exec(str)) {
      if (match[1] === "P") {
        let ret = await Preset.getById(match[2], match[3]); //TODO modify for subproject a bit

        return ret;
      } else if (match[1] === "R") {
        return await Rule.getById(match[2], match[3]);
      } else {
        return null;
      }
    } else if (match = /^([\w \/\\\-_]*)[\/\\]?silo\-(\w+)[\/\\]/.exec(str)) {
      try {
        switch (match[2]) {
          case "presets":
            return new Preset({
              path: str,
              subProject: match[1]
            });

          case "rules":
            return new Rule({
              path: str,
              subProject: match[1]
            });

          case "metadata":
            return await Preset.fromMetadata(str, match[1]);
        }
      } catch (e) {
        log(e);
      }
    } else {
      return null;
    }
  }

  exports.rallyFunctions = rallyFunctions;
  exports.categorizeString = categorizeString;
  exports.SupplyChain = SupplyChain;
  exports.Preset = Preset;
  exports.Rule = Rule;
  exports.Provider = Provider;
  exports.Notification = Notification;
  exports.Asset = Asset;
  exports.User = User;
  exports.Tag = Tag;
  exports.Stage = Stage$$1;
  exports.Deploy = Deploy;
  exports.Trace = Trace;
  exports.loadConfig = loadConfig;
  exports.loadConfigFromArgs = loadConfigFromArgs;
  exports.setConfig = setConfig;
  exports.lib = lib;
  exports.AbortError = AbortError;
  exports.APIError = APIError;
  exports.UnconfiguredEnvError = UnconfiguredEnvError;
  exports.ProtectedEnvError = ProtectedEnvError;
  exports.FileTooLargeError = FileTooLargeError;
  exports.ResoultionError = ResoultionError;
  exports.Collection = Collection;
  exports.RallyBase = RallyBase;
  exports.sleep = sleep;
  exports.zip = zip;
  exports.unordered = unordered;
  exports.range = range;
  exports.IndexObject = IndexObject;
  exports.orderedObjectKeys = orderedObjectKeys;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=web.js.map
