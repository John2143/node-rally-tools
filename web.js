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
    let json;

    try {
      json = fs.readFileSync(exports.configFile);
      exports.configObject = JSON.parse(json);
      exports.configObject.hasConfig = true;
    } catch (e) {
      if (e.code == "ENOENT") {
        exports.configObject.hasConfig = false; //ok, they should probably make a config
      } else if (e instanceof SyntaxError) {
        exports.configObject.hasConfig = false;
        log(chalk`{red Error}: Syntax Error when loading {blue ${exports.configFile}}`);
        log(chalk`{red ${e.message}}`);
        let charPos = /at position (\d+)/g.exec(e.message);

        if (charPos) {
          let lineNum = 1;
          let charsLeft = Number(charPos[1]) + 1;

          for (let line of json.toString("utf8").split("\n")) {
            if (line.length + 1 > charsLeft) {
              break;
            }

            charsLeft -= line.length + 1; //+1 for newline

            lineNum++;
          }

          log(chalk`Approximate error loc: {green ${lineNum}:${charsLeft}}`);
        }
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
  function runCommand(command) {
    return new Promise(function (resolve, reject) {
      child_process.exec(command, {
        maxBuffer: Infinity
      }, async function (err, stdout, stderr) {
        resolve(stdout);
      });
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

    if (exports.configObject.verbose) write(`git ${args.join(" ")}`);
    let g = await spawn({
      noecho: true
    }, "git", args);

    if (!oks.includes(g.exitCode)) {
      if (exports.configObject.verbose) log(chalk`{red ${g.exitCode}}`);
      log(g.stderr);
      log(g.stdout);
      throw new AbortError(chalk`Failed to run git ${args} {red ${g.exitCode}}`);
    } else if (exports.configObject.verbose) {
      log(chalk`{green ${g.exitCode}}`);
    }

    return [g.stdout, g.stderr];
  }

  global.chalk = chalk$1;

  global.log = (...text) => console.log(...text);

  global.write = (...text) => process.stdout.write(...text);

  global.elog = (...text) => console.error(...text);

  global.ewrite = (...text) => process.stderr.write(...text);

  global.errorLog = (...text) => log(...text.map(chalk$1.red));

  const logging = {
    log,
    write,
    elog,
    ewrite,
    errorLog,
    chalk: chalk$1
  };
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

      if (exports.configObject.dryRun && method !== "GET") {
        log(chalk$1`{red Skipping ${method} request for dry run}`);
        return null;
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
        if (item.name === name && item.remote === env) {
          return item;
        }
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
      let maxParallelRequests = this.opts.maxParallelRequests || this.opts.chunksize || 5;
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
      return this.editorConfig;
    }

    static async getAllPreCollect(providers) {
      return providers.sort((a, b) => {
        return a.attributes.category.localeCompare(b.attributes.category) || a.attributes.name.localeCompare(b.attributes.name);
      });
    }

    async getFileExtension() {
      let map = {
        python: "py",
        text: "txt",

        getmap(key) {
          if (this.name === "Aurora") return "zip";
          if (this.name === "Vantage") return "zip";
          if (this.name === "ffmpeg") return "txt"; //if(String(this.name).toLowerCase().startsWith("msc")) return "json";

          if (this[key]) return this[key];
          return key;
        }

      };
      let v = map.getmap(this.lang); //log(config)
      //log(this.name)
      //log(v)

      return v;
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
  defineAssoc(Provider, "lang", "data.attributes.lang");
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
      let proTag = await this.resolveField(Tag, "providerFilterTag", false, "specific");

      if (proTag) {
        this.data.attributes.providerFilter = proTag.id;
      } else {
        this.data.attributes.providerFilter = null;
      }

      let dynamicNexts = await this.resolveField(Rule, "dynamicNexts", true, "specific");
      let enterNotif = await this.resolveField(Notification, "enterNotifications", true, "specific");
      let errorNotif = await this.resolveField(Notification, "errorNotifications", true, "specific");
      let passNotif = await this.resolveField(Notification, "passNotifications", true, "specific");
    }

    async saveA(env) {
      if (lib.isLocalEnv(env)) return;
      return await this.createOrUpdate(env);
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
        return await this.createOrUpdate(env);
      }
    }

    get immutable() {
      return false;
    }

    async createOrUpdate(env) {
      write(chalk`First pass rule {green ${this.name}} to {green ${env}}: `);
      await this.acclimatize(env);

      if (this.immutable) {
        log(chalk`{magenta IMMUTABLE}. Nothing to do.`);
        return;
      } //First query the api to see if this already exists.


      let remote = await Rule.getByName(env, this.name);
      this.idMap = this.idMap || {};
      this.relationships.transitions = {
        data: await this.constructWorkflowTransitions()
      };

      if (remote) {
        this.idMap[env] = remote.id;
        log(chalk`exists ${remote.chalkPrint(false)}`);

        if (exports.configObject.skipStarred) {
          write("no starred, ");
          this.data.attributes.starred = undefined;
        }

        write("replace, ");
        let res = await lib.makeAPIRequest({
          env,
          path: `/workflowRules/${this.idMap[env]}`,
          method: "PUT",
          payload: {
            data: this.data
          }
        });
      } else {
        write("create, ");
        let res = await lib.makeAPIRequest({
          env,
          path: `/workflowRules`,
          method: "POST",
          payload: {
            data: this.data
          }
        });
        this.idMap[env] = res.data.id;
      }

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

    async deleteRemoteVersion(env, id = null) {
      if (lib.isLocalEnv(env)) return false;

      if (!id) {
        let remote = await Rule.getByName(env, this.name);
        id = remote.id;
      }

      return await lib.makeAPIRequest({
        env,
        path: `/workflowRules/${id}`,
        method: "DELETE"
      });
    }

    async delete() {
      if (lib.isLocalEnv(this.remote)) return false;
      return await this.deleteRemoteVersion(this.remote, this.id);
    }

    get localpath() {
      return this._localpath || path.join(exports.configObject.repodir, this.subproject || "", "silo-rules", this.name + ".json");
    }

    async resolve() {
      let preset = await this.resolveField(Preset, "preset", false); //log(preset);

      let pNext = await this.resolveField(Rule, "passNext", false);
      let eNext = await this.resolveField(Rule, "errorNext", false);
      let proType = await this.resolveField(Provider, "providerType", false);
      let proTag = await this.resolveField(Tag, "providerFilterTag", false);

      if (proTag && this.data.attributes.providerFilter) {
        delete this.data.attributes.providerFilter;
      } //log("Dynamic nexts")


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
        proTag,
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

      if (pad) id = id.padStart(13);

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

    async getContent(force = false, noRedirect = false, timeout = undefined) {
      if (!this.canBeDownloaded() && !force && !noRedirect) {
        throw new FileTooLargeError(this);
      }

      let d = lib.makeAPIRequest({
        env: this.remote,
        fullPath: this.contentLink,
        qs: {
          "no-redirect": noRedirect,
          timeout: timeout
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

    async addFile(label, fileuris, generateMd5 = false, autoAnalyze = true) {
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
              instances,
              generateMd5,
              autoAnalyze
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
              "workflowRule": {
                "data": {
                  "attributes": {
                    "name": jobName
                  },
                  "type": "workflowRules"
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
              "workflowRule": {
                "data": {
                  "attributes": {
                    "name": jobName
                  },
                  "type": "workflowRules"
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
      let files = await this.getFiles();

      for (let file of files) {
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

      if (fileCreations.length > 30) {
        //too many parallel creations can crash the script, so don't do it in parallel
        log("Adding files sequentially");

        for (let c of fileCreations) {
          await c();
        }
      } else {
        await Promise.all(fileCreations.map(x => x()));
      }
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

    async getFileByLabel(label) {
      let files = await this.getFiles();
      let file = files.findByName(label);
      return file;
    }

    async downloadFile(label, destFolder) {
      let file = this.getFileByLabel(label);
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
  function replacementTransforms(input, env) {
    if (exports.configObject.noReplacer) return input;

    if (typeof input == "object" && input != null) {
      let x = {};

      for (let [k, v] of Object.entries(input)) {
        x[k] = replacementTransforms(v, env);
      }

      return x;
    } else if (typeof input == "string") {
      return input.replace(/\*\*CURRENT_SILO\*\*/g, env.toLowerCase());
    }

    return input;
  }

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
      let provider = (await Provider.getByName("DEV", providerType)) || (await Provider.getByName("UAT", providerType));

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
      let ptype = this.relationships["providerType"];
      ptype = ptype.data;
      let provider = await Provider.getByName(env, ptype.name);
      ptype.id = provider.data.id;
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
      if (!proType) return;
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

      if (hasHeader && code.startsWith(hasHeader[0])) {
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

      if (pad) id = id.padStart(13);

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
      if (this._path) {
        return this._path;
      }

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
      var _this$code;

      if (((_this$code = this.code) === null || _this$code === void 0 ? void 0 : _this$code.trim()) === "NOUPLOAD") {
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
      } else {
        code = replacementTransforms(code, env);
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
            write("making ev2 importable, ");
            let oldName = this.attributes.providerDataFilename;
            payload.data.attributes.providerDataFilename = oldName || this.name.replace(/ /g, "_") + ".py";
          }

          let res = await lib.makeAPIRequest({
            env,
            path: `/presets/${remote.id}`,
            method: "PUT",
            payload: replacementTransforms(payload, env),
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

        if (!this.relationships["providerType"]) {
          throw new AbortError("Cannot acclimatize shelled presets. (try creating it on the env first)");
        }

        await this.acclimatize(env);
        write("Posting to create preset... ");
        let res = await lib.makeAPIRequest({
          env,
          path: `/presets`,
          method: "POST",
          payload: {
            data: replacementTransforms(this.data, env)
          },
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

    getLocalUnitTestCode() {
      let unitTestName = this.path.split("/").slice(-1)[0].replace(".py", ".test.py");
      let unitTestPath = `${exports.configObject.unitTestDir || `${exports.configObject.repodir}/tests`}/${unitTestName}`;
      return readFileSync(unitTestPath, "utf-8");
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

    async lint(linter) {
      return await linter.lintPreset(this);
    }

    async unitTest(unitTester) {
      return await unitTester.unitTestPreset(this);
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

  let exists$1 = {};

  class UserDefinedConnector extends RallyBase {
    constructor({
      path: path$$1,
      remote,
      data,
      subProject,
      included,
      ...rest
    } = {}) {
      // Get full path if possible
      if (path$$1) {
        path$$1 = path.resolve(path$$1);
      }

      if (Object.values(rest).length > 0) {
        log(chalk`{yellow Warning}: Internal error, got rest param in UDC`);
        log(rest);
      }

      super(); // Cache by path

      if (path$$1) {
        if (exists$1[pathTransform(path$$1)]) return exists$1[pathTransform(path$$1)];
        exists$1[pathTransform(path$$1)] = this;
      }

      this.meta = {};
      this.subproject = subProject;
      this.remote = remote;
      this.ext = "py";

      if (lib.isLocalEnv(this.remote)) {
        if (!path$$1) {
          throw new AbortError("Need either path or remote env + data for UDC constructor");
        }

        this.data = {
          attributes: {
            name: null
          }
        };
        this.path = path$$1;
        this.code = this.getLocalCode();
        this.loadFromCode();
        this.isGeneric = true;
      } else {
        this.data = data;
        this.isGeneric = false;
      }

      this.data.relationships = this.data.relationships || {};
    }

    loadFromCode() {
      var _$exec$, _$exec$2, _$exec$3;

      let headerRegex = /^"""$/gim;
      let hasHeaderStart = headerRegex.exec(this.code);
      let hasHeaderEnd = headerRegex.exec(this.code);

      if (hasHeaderEnd) {
        this.header = this.code.substring(hasHeaderStart[0].length, hasHeaderEnd.index).trim();
        let helpTextRegex = /======$/gim;
        let k = helpTextRegex.exec(this.header);
        this.helpText = this.header.substring(k.index + 7);
      }

      let abs = {
        provider: (_$exec$ = /Provider:(.+)/.exec(this.header)[1]) === null || _$exec$ === void 0 ? void 0 : _$exec$.trim(),
        langauge: (_$exec$2 = /Preset Language:(.+)/.exec(this.header)[1]) === null || _$exec$2 === void 0 ? void 0 : _$exec$2.trim(),
        library: (_$exec$3 = /Library:(.+)/.exec(this.header)[1]) === null || _$exec$3 === void 0 ? void 0 : _$exec$3.trim()
      };
      this.name = abs.provider;
      this.library = abs.library;
      this.language = abs.langauge;
    }

    cleanup() {
      super.cleanup();
    }

    async saveLocalFile() {
      writeFileSync(this.localpath, this.code || "");
    }

    async save(env, shouldTest = true) {
      this.saved = true;

      if (!this.isGeneric) {
        await this.downloadCode();
      }

      this.cleanup();

      if (lib.isLocalEnv(env)) {
        log(chalk`Saving provider {green ${this.name}} to {blue ${lib.envName(env)}}.`);

        if (exports.configObject.verbose) {
          log(chalk`Path: ${this.localpath}`);
        }

        await this.saveLocalFile();
      } else {
        await this.uploadCodeToEnv(env, {}, shouldTest);
      }
    }

    async downloadCode() {
      var _this$data$links;

      if (!this.remote || this.code) return this.code;
      let pdlink = (_this$data$links = this.data.links) === null || _this$data$links === void 0 ? void 0 : _this$data$links.userConnCode;
      if (!pdlink) return this.code = "";
      let code = await lib.makeAPIRequest({
        env: this.remote,
        path_full: pdlink,
        json: false
      });
      this.code = code;
      this.loadFromCode();
      return code;
    }

    get code() {
      if (this._code) return this._code;
    }

    set code(v) {
      this._code = v;
    }

    chalkPrint(pad = true) {
      let id = String("C-" + (this.remote && this.remote + "-" + this.id || "LOCAL"));
      let sub = "";

      if (this.subproject) {
        sub = chalk`{yellow ${this.subproject}}`;
      }

      if (pad) id = id.padStart(11);

      if (this.name == undefined) {
        return chalk`{green ${id}}: ${sub}{red ${this.path}}`;
      } else {
        return chalk`{green ${id}}: ${sub}{blue ${this.name}}`;
      }
    }

    static getLocalPath(name, ext, subproject) {
      return this._localpath || path__default.join(exports.configObject.repodir, subproject || "", "silo-providers", name + "." + ext);
    }

    get localpath() {
      if (this._path) {
        return this._path;
      }

      return UserDefinedConnector.getLocalPath(this.name, this.ext, this.subproject);
    }

    get path() {
      if (this._path) return this._path;
    }

    set path(val) {
      this._path = val;
    }

    get localmetadatapath() {
      if (this.path) {
        return this.path.replace("silo-presets", "silo-metadata").replace(new RegExp(this.ext + "$"), "json");
      }

      return path__default.join(exports.configObject.repodir, this.subproject || "", "silo-metadata", this.name + ".json");
    }

    async uploadPresetData(env, id, {
      skipcode = false,
      skiphelp = false,
      skipmetadata = false
    } = {}) {
      let code = this.code;
      write(chalk`id {green ${id}}... `);

      let a = async () => {
        if (skipcode) return;
        let res = await lib.makeAPIRequest({
          env,
          path: `/providerTypes/${id}/userConnCode`,
          body: replacementTransforms(code, env),
          method: "PUT",
          fullResponse: true,
          timeout: 10000
        });
        write(chalk`code up {yellow ${res.statusCode}}, `);
      };

      let b = async () => {
        if (skiphelp) return;
        let res = await lib.makeAPIRequest({
          env,
          path: `/providerTypes/${id}/userConnHelp`,
          body: this.helpText || "No help text available",
          method: "PUT",
          fullResponse: true,
          timeout: 10000
        });
        write(chalk`help up {yellow ${res.statusCode}}, `);
      };

      let c = async () => {
        if (skipmetadata) return;
        let res = await lib.makeAPIRequest({
          env,
          path: `/providerTypes/${id}`,
          json: true,
          payload: replacementTransforms({
            "data": {
              "attributes": {
                "userConnPackage": this.library,
                "userConnPresetLang": this.language
              },
              "type": "providerTypes"
            }
          }, env),
          method: "PATCH",
          fullResponse: true,
          timeout: 10000
        });
        write(chalk`metadata up {yellow ${res.statusCode}}, `);
      };

      await Promise.all([a(), b(), c()]);
      write("Done.");
    }

    async uploadCodeToEnv(env, includeMetadata, shouldTest = true) {
      write(chalk`Uploading provider {green ${this.name}} to {green ${env}}: `); //First query the api to see if this already exists.

      let remote = await UserDefinedConnector.getByName(env, this.name);

      if (!remote) {
        throw new AbortError("Initial provider file does not exist, please see SDVI");
      }

      return await this.uploadPresetData(env, remote.id);
    }

    getLocalCode() {
      return readFileSync(this.path, "utf-8");
    }

  } //defineAssoc(UserDefinedConnector, "_nameInner", "data.attributes.providerSettings.PresetName");
  //defineAssoc(UserDefinedConnector, "_nameOuter", "data.attributes.name");
  //defineAssoc(UserDefinedConnector, "_nameE2", "data.attributes.providerDataFilename");


  defineAssoc(UserDefinedConnector, "id", "data.id"); //defineAssoc(UserDefinedConnector, "importName", "data.attributes.providerDataFilename");

  defineAssoc(UserDefinedConnector, "attributes", "data.attributes");
  defineAssoc(UserDefinedConnector, "name", "data.attributes.name");
  defineAssoc(UserDefinedConnector, "relationships", "data.relationships");
  defineAssoc(UserDefinedConnector, "remote", "meta.remote"); //defineAssoc(UserDefinedConnector, "_code", "meta.code");
  //defineAssoc(UserDefinedConnector, "_path", "meta.path");

  defineAssoc(UserDefinedConnector, "isGeneric", "meta.isGeneric");
  defineAssoc(UserDefinedConnector, "ext", "meta.ext");
  defineAssoc(UserDefinedConnector, "subproject", "meta.project");
  defineAssoc(UserDefinedConnector, "language", "meta.language");
  defineAssoc(UserDefinedConnector, "library", "meta.library"); //defineAssoc(UserDefinedConnector, "metastring", "meta.metastring");
  //defineAssoc(UserDefinedConnector, "providerName", "relationships.providerType.data.name");

  UserDefinedConnector.endpoint = "providerTypes";

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

      this.presets = new Collection([]);
      this.rules = new Collection([]);
      this.providers = new Collection([]);
      this.notifications = new Collection([]);
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

      if (this.providers.arr.length > 0) {
        write("Required providers: ");
        log(this.providers.arr.length);
        this.providers.log();
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

      for (let provider of this.providers) {
        try {
          fails.push([provider, await provider.save(env), "provider"]);
        } catch (e) {
          log(chalk`{red Error}`);
          fails.push([provider, e, "provider upload"]);
        }
      }

      let finalErrors = [];

      for (let [item, error, stage] of fails) {
        if (!error) continue;
        log(chalk`Error during {blue ${stage}}: ${item.chalkPrint(false)} {red ${error}}`);

        if (exports.configObject.verbose) {
          log(error);
        }

        finalErrors.push([item, error, stage]);
      }

      return finalErrors;
    }

    async lint(linter) {
      let things = [...this.rules.arr, ...this.presets.arr];
      await linter.printLint(things);
    }

    async unitTest(unitTester) {
      let things = [...this.rules.arr, ...this.presets.arr];
      await unitTester.printUnitTest(things);
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
    async downloadStage(skipLoadMsg = false) {
      this.setStageId();

      if (!this.stageid) {
        log(chalk`No stage ID found for {green ${this.env}}. Run "{red rally stage init -e ${this.env} (stage name)}" or select a different env.`);
        return true;
      }

      let preset = await Preset.getById(this.env, this.stageid);
      await preset.downloadCode();
      this.stageData = JSON.parse(preset.code);
      this.stageData.persist = this.stageData.persist || [];
      this.stagePreset = preset;
      if (this.skipLoadMsg || skipLoadMsg) return;
      log(chalk`Stage loaded: {green ${this.env}}/{green ${this.stagePreset.name}}`);
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
      return await this.printInfo();
    },

    async printInfo() {
      let persist = new Set(this.stageData.persist);
      log(chalk`Currently Staged Branches: ${this.stageData.stage.length}`);

      for (let {
        branch,
        commit
      } of this.stageData.stage) {
        if (persist.has(branch)) {
          log(chalk`    {green ${branch}}* {gray ${commit}} (persist)`);
          persist.delete(branch);
        } else {
          log(chalk`    ${branch} {gray ${commit}}`);
        }
      }

      log(chalk`Currently Claimed Presets: ${this.stageData.claimedPresets.length}`);

      for (let preset of this.stageData.claimedPresets) {
        log(chalk`    {blue ${preset.name}} {gray ${preset.owner}}`);
      }

      if (persist.size > 0) {
        log(chalk`Persisting unstaged branches:`);

        for (let branch of persist) {
          log(chalk`    {red ${branch}}`);
        }
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

    async chooseSingleBranch(allBranches, text = "What branch do you want to add?") {
      let qqs = allBranches.slice(0); //copy the branches

      qqs.push("None");
      let q = await inquirer.prompt([{
        type: "autocomplete",
        name: "branch",
        message: `What branch do you want to add?`,
        source: this.filterwith(qqs)
      }]);
      return q.branch;
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
          q.branch = await this.chooseSingleBranch(allBranches);

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
      let clean = this.args.clean || this.args["full-clean"];
      let restore = this.args.restore;
      let storeStage = this.args["store-stage"];
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

      if (clean && !this.args["full-clean"]) {
        newStagedBranches = new Set(this.stageData.persist);
      }

      if (restore) {
        for (let {
          branch
        } of this.stageData.storedStage) {
          newStagedBranches.add(branch);
        }
      }

      if (storeStage) {
        this.stageData.storedStage = this.stageData.stage;
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

    async $forceRemove() {
      if (!(await this.checkCurrentBranch())) {
        log(stagingEmsg);
        return;
      }

      try {
        return await this.forceRemove();
      } finally {
        await this.runGit([0], "checkout", "staging");
      }
    },

    async forceRemove() {
      let badBranches = this.args._;

      if (!badBranches || badBranches.length === 0) {
        throw new AbortError(chalk`No branch given to force remove`);
      }

      if (await this.downloadStage()) return; //First, create new stage without broken branches to check if it's valid

      let newStage = this.stageData.stage.filter(x => !badBranches.includes(x.branch));

      if (this.stageData.stage.length - newStage.length < badBranches.length) {
        throw new AbortError(chalk`Not all given branches are currently staged.`);
      } //Next, get all the presets of the removed branch


      let allDiffs = "";

      for (let branch of badBranches) {
        let diff = await spawn({
          noecho: true
        }, "git", ["diff", `staging...origin/${branch}`, "--name-only"]);

        if (diff.exitCode !== 0) {
          log(diff);
          throw new AbortError(`Could not diff "staging..origin/${branch}"`);
        }

        allDiffs += diff.stdout;
      } //Finally, make a new stage and deploy all the presets from the old branches


      let newStageBranches = newStage.map(x => x.branch);
      let x = await this.makeNewStage(newStageBranches); //log("Current stage: ");
      //for(let branch of newStageBranches){
      //log(chalk` - ${branch}`);
      //}

      log("Force removing the following branches:");

      for (let branch of badBranches) {
        log(chalk` - {red ${branch}}`);
      } //Deploy to env and upload changes


      await this.runRally(allDiffs);
      this.stageData.stage = newStage;
      await this.uploadStage();
    },

    async $pull() {
      if (await this.downloadStage()) return;
      await this.makeOldStage(this.stageData.stage.map(x => x.commit), `rallystage-${this.env}`);
    },

    async $gitFix() {
      await this.runGit([0], "reset", "--hard", "HEAD");
      await this.runGit([0], "checkout", "staging");
    },

    async $persist() {
      let [branches, stage, _] = await Promise.all([this.getBranches(), this.downloadStage(), addAutoCompletePrompt()]);
      if (stage) return;
      if (!branches) return;
      let b = await this.chooseSingleBranch(branches, "What branch should be added/removed?"); //toggle persist status

      let s = new Set(this.stageData.persist);

      if (s.has(b)) {
        s.delete(b);
      } else {
        s.add(b);
      }

      this.stageData.persist = [...s];
      await this.printInfo();
      await this.uploadStage();
    },

    logProgress(cur, len, name, clearSpace) {
      let dots = cur + 1;
      let spaces = len - dots;
      write(chalk`\r[${".".repeat(dots)}${" ".repeat(spaces)}] {yellow ${cur + 1}} / ${len} ${name}${" ".repeat(clearSpace - name.length)}`);
    },

    async makeNewStage(newStagedBranches) {
      let newStagedCommits = [];
      let longestBranchName = newStagedBranches.reduce((longest, branch) => Math.max(branch.length, longest), 0);
      await this.runGit([0, 1], "branch", "-D", "RALLYNEWSTAGE");
      await this.runGit([0], "checkout", "-b", "RALLYNEWSTAGE");
      log(chalk`Merging {blue ${newStagedBranches.length}} branches:`);

      for (let [i, branch] of newStagedBranches.entries()) {
        this.logProgress(i, newStagedBranches.length, branch, longestBranchName);
        let originName = `origin/${branch}`;
        if (exports.configObject.verbose) log(chalk`About to merge {green ${originName}}`);
        let mergeinfo = await spawn({
          noecho: true
        }, "git", ["merge", "--squash", originName]);

        if (mergeinfo.exitCode == 1) {
          log("Error", mergeinfo.stdout);

          if (mergeinfo.stderr.includes("resolve your current index")) {
            log(chalk`{red Error}: Merge conflict when merging ${branch}`);
          } else {
            log(chalk`{red Error}: Unknown error when merging ${branch}:`);
          }

          let e = new AbortError(`Failed to merge ${branch}`);
          e.branch = branch;
          throw e;
        } else if (mergeinfo.exitCode != 0) {
          log(chalk`{red Error}: Unknown error when merging ${branch}`);
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

      log("");
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
            try {
              let [a] = await this.runGit([0], "branch", "-a", "--color=never", "--contains", branch);
              a = a.trim();
              log(chalk`{yellow Hint}: Full name of conflict branch: {green ${a}}`);
            } catch (e) {}

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
      await this.runGit([0], "checkout", "staging");
      let [a, b] = await this.runGit([0, 1], "merge", "--squash", `origin/${brokeBranch}`);

      if (a.includes("merge failed")) {
        return [{
          branch: chalk`{yellow !! against staging !!} {white for} ${brokeBranch}`,
          msg: a
        }];
      }

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
      let a = await this.findConflict(["ASR-106_Vidchecker8.1.5", "test-too_many_markers_fix", "regression-fix_weird_durations", "ASXT-Video-QC-Vidcheck-USPOST", "GATEWAY-CSDNAPConversion-ASR-411", "ONRAMP-audioNormalization-ASR-69", "ASR-389_addelement", "TECHDEBT-addIconForGConversionLauncher", "ASR-402_DDU_metadata", "ASR-300-DDU-NZ-ADS-tracks", "ASR-454_PCDNAP_IBMS_Prefix", "ASXT-Mediator-Publisher", "ASXT-Deal-Logic", "uat-only-ADS-use-correct-AQC-Job", "ASXT-44-and-22", "509-rebase", "ASR-514-ML-QC-Proxy-oversized", "ONRAMP-captionProxyAudio-ASR-516", "ASXT-Rally-Panel", "ASR-513"], "regression-fix_weird_durations"); //], "ONRAMP-audioNormalization-ASR-69");
      //let a = await this.findConflict([
      //"fix-tc_adjust_planb", "test-too_many_markers_fix",
      //"audio_rectifier_updates_ASR-69", "getIbmsMediaIdFix",
      //"ASR-393_WrongTimecodesBlackSegmentDetection",
      //"ASR-390_BadWooPartNums", "ASXT-Audio-QC-Baton-DLAPost", "ASR-293",
      //"ASR-383_tiktok_rectifier"
      //], "ASR-383_tiktok_rectifier");

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
      let claimedLog = [];
      let claimedPresets = this.stageData.claimedPresets;
      chain.presets.arr = chain.presets.arr.filter(x => {
        let matching_claim = claimedPresets.find(k => k.name == x.name);

        if (matching_claim) {
          claimedLog.push(chalk`{blue ${x.chalkPrint(false)}} (owner {green ${matching_claim.owner}})`);
        } //keep if unclaimed


        return !matching_claim;
      });

      if (claimedLog.length > 0) {
        log(chalk`{yellow Warning}: The following presets will be {red skipped} during deployment, because they are claimed:`);

        for (let l of claimedLog) {
          log(`Claimed: ${l}`);
        }
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

  var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

  function createCommonjsModule(fn, module) {
  	return module = { exports: {} }, fn(module, module.exports), module.exports;
  }

  /*!
   * assertion-error
   * Copyright(c) 2013 Jake Luer <jake@qualiancy.com>
   * MIT Licensed
   */

  /*!
   * Return a function that will copy properties from
   * one object to another excluding any originally
   * listed. Returned function will create a new `{}`.
   *
   * @param {String} excluded properties ...
   * @return {Function}
   */
  function exclude() {
    var excludes = [].slice.call(arguments);

    function excludeProps(res, obj) {
      Object.keys(obj).forEach(function (key) {
        if (!~excludes.indexOf(key)) res[key] = obj[key];
      });
    }

    return function extendExclude() {
      var args = [].slice.call(arguments),
          i = 0,
          res = {};

      for (; i < args.length; i++) {
        excludeProps(res, args[i]);
      }

      return res;
    };
  }
  /*!
   * Primary Exports
   */

  var assertionError = AssertionError;
  /**
   * ### AssertionError
   *
   * An extension of the JavaScript `Error` constructor for
   * assertion and validation scenarios.
   *
   * @param {String} message
   * @param {Object} properties to include (optional)
   * @param {callee} start stack function (optional)
   */

  function AssertionError(message, _props, ssf) {
    var extend = exclude('name', 'message', 'stack', 'constructor', 'toJSON'),
        props = extend(_props || {}); // default values

    this.message = message || 'Unspecified AssertionError';
    this.showDiff = false; // copy from properties

    for (var key in props) {
      this[key] = props[key];
    } // capture stack trace


    ssf = ssf || AssertionError;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ssf);
    } else {
      try {
        throw new Error();
      } catch (e) {
        this.stack = e.stack;
      }
    }
  }
  /*!
   * Inherit from Error.prototype
   */


  AssertionError.prototype = Object.create(Error.prototype);
  /*!
   * Statically set name
   */

  AssertionError.prototype.name = 'AssertionError';
  /*!
   * Ensure correct constructor
   */

  AssertionError.prototype.constructor = AssertionError;
  /**
   * Allow errors to be converted to JSON for static transfer.
   *
   * @param {Boolean} include stack (default: `true`)
   * @return {Object} object that can be `JSON.stringify`
   */

  AssertionError.prototype.toJSON = function (stack) {
    var extend = exclude('constructor', 'toJSON', 'stack'),
        props = extend({
      name: this.name
    }, this); // include stack if exists and not turned off

    if (false !== stack && this.stack) {
      props.stack = this.stack;
    }

    return props;
  };

  /* !
   * Chai - pathval utility
   * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
   * @see https://github.com/logicalparadox/filtr
   * MIT Licensed
   */

  /**
   * ### .hasProperty(object, name)
   *
   * This allows checking whether an object has own
   * or inherited from prototype chain named property.
   *
   * Basically does the same thing as the `in`
   * operator but works properly with null/undefined values
   * and other primitives.
   *
   *     var obj = {
   *         arr: ['a', 'b', 'c']
   *       , str: 'Hello'
   *     }
   *
   * The following would be the results.
   *
   *     hasProperty(obj, 'str');  // true
   *     hasProperty(obj, 'constructor');  // true
   *     hasProperty(obj, 'bar');  // false
   *
   *     hasProperty(obj.str, 'length'); // true
   *     hasProperty(obj.str, 1);  // true
   *     hasProperty(obj.str, 5);  // false
   *
   *     hasProperty(obj.arr, 'length');  // true
   *     hasProperty(obj.arr, 2);  // true
   *     hasProperty(obj.arr, 3);  // false
   *
   * @param {Object} object
   * @param {String|Symbol} name
   * @returns {Boolean} whether it exists
   * @namespace Utils
   * @name hasProperty
   * @api public
   */

  function hasProperty(obj, name) {
    if (typeof obj === 'undefined' || obj === null) {
      return false;
    } // The `in` operator does not work with primitives.


    return name in Object(obj);
  }
  /* !
   * ## parsePath(path)
   *
   * Helper function used to parse string object
   * paths. Use in conjunction with `internalGetPathValue`.
   *
   *      var parsed = parsePath('myobject.property.subprop');
   *
   * ### Paths:
   *
   * * Can be infinitely deep and nested.
   * * Arrays are also valid using the formal `myobject.document[3].property`.
   * * Literal dots and brackets (not delimiter) must be backslash-escaped.
   *
   * @param {String} path
   * @returns {Object} parsed
   * @api private
   */


  function parsePath(path$$1) {
    var str = path$$1.replace(/([^\\])\[/g, '$1.[');
    var parts = str.match(/(\\\.|[^.]+?)+/g);
    return parts.map(function mapMatches(value) {
      if (value === 'constructor' || value === '__proto__' || value === 'prototype') {
        return {};
      }

      var regexp = /^\[(\d+)\]$/;
      var mArr = regexp.exec(value);
      var parsed = null;

      if (mArr) {
        parsed = {
          i: parseFloat(mArr[1])
        };
      } else {
        parsed = {
          p: value.replace(/\\([.[\]])/g, '$1')
        };
      }

      return parsed;
    });
  }
  /* !
   * ## internalGetPathValue(obj, parsed[, pathDepth])
   *
   * Helper companion function for `.parsePath` that returns
   * the value located at the parsed address.
   *
   *      var value = getPathValue(obj, parsed);
   *
   * @param {Object} object to search against
   * @param {Object} parsed definition from `parsePath`.
   * @param {Number} depth (nesting level) of the property we want to retrieve
   * @returns {Object|Undefined} value
   * @api private
   */


  function internalGetPathValue(obj, parsed, pathDepth) {
    var temporaryValue = obj;
    var res = null;
    pathDepth = typeof pathDepth === 'undefined' ? parsed.length : pathDepth;

    for (var i = 0; i < pathDepth; i++) {
      var part = parsed[i];

      if (temporaryValue) {
        if (typeof part.p === 'undefined') {
          temporaryValue = temporaryValue[part.i];
        } else {
          temporaryValue = temporaryValue[part.p];
        }

        if (i === pathDepth - 1) {
          res = temporaryValue;
        }
      }
    }

    return res;
  }
  /* !
   * ## internalSetPathValue(obj, value, parsed)
   *
   * Companion function for `parsePath` that sets
   * the value located at a parsed address.
   *
   *  internalSetPathValue(obj, 'value', parsed);
   *
   * @param {Object} object to search and define on
   * @param {*} value to use upon set
   * @param {Object} parsed definition from `parsePath`
   * @api private
   */


  function internalSetPathValue(obj, val, parsed) {
    var tempObj = obj;
    var pathDepth = parsed.length;
    var part = null; // Here we iterate through every part of the path

    for (var i = 0; i < pathDepth; i++) {
      var propName = null;
      var propVal = null;
      part = parsed[i]; // If it's the last part of the path, we set the 'propName' value with the property name

      if (i === pathDepth - 1) {
        propName = typeof part.p === 'undefined' ? part.i : part.p; // Now we set the property with the name held by 'propName' on object with the desired val

        tempObj[propName] = val;
      } else if (typeof part.p !== 'undefined' && tempObj[part.p]) {
        tempObj = tempObj[part.p];
      } else if (typeof part.i !== 'undefined' && tempObj[part.i]) {
        tempObj = tempObj[part.i];
      } else {
        // If the obj doesn't have the property we create one with that name to define it
        var next = parsed[i + 1]; // Here we set the name of the property which will be defined

        propName = typeof part.p === 'undefined' ? part.i : part.p; // Here we decide if this property will be an array or a new object

        propVal = typeof next.p === 'undefined' ? [] : {};
        tempObj[propName] = propVal;
        tempObj = tempObj[propName];
      }
    }
  }
  /**
   * ### .getPathInfo(object, path)
   *
   * This allows the retrieval of property info in an
   * object given a string path.
   *
   * The path info consists of an object with the
   * following properties:
   *
   * * parent - The parent object of the property referenced by `path`
   * * name - The name of the final property, a number if it was an array indexer
   * * value - The value of the property, if it exists, otherwise `undefined`
   * * exists - Whether the property exists or not
   *
   * @param {Object} object
   * @param {String} path
   * @returns {Object} info
   * @namespace Utils
   * @name getPathInfo
   * @api public
   */


  function getPathInfo(obj, path$$1) {
    var parsed = parsePath(path$$1);
    var last = parsed[parsed.length - 1];
    var info = {
      parent: parsed.length > 1 ? internalGetPathValue(obj, parsed, parsed.length - 1) : obj,
      name: last.p || last.i,
      value: internalGetPathValue(obj, parsed)
    };
    info.exists = hasProperty(info.parent, info.name);
    return info;
  }
  /**
   * ### .getPathValue(object, path)
   *
   * This allows the retrieval of values in an
   * object given a string path.
   *
   *     var obj = {
   *         prop1: {
   *             arr: ['a', 'b', 'c']
   *           , str: 'Hello'
   *         }
   *       , prop2: {
   *             arr: [ { nested: 'Universe' } ]
   *           , str: 'Hello again!'
   *         }
   *     }
   *
   * The following would be the results.
   *
   *     getPathValue(obj, 'prop1.str'); // Hello
   *     getPathValue(obj, 'prop1.att[2]'); // b
   *     getPathValue(obj, 'prop2.arr[0].nested'); // Universe
   *
   * @param {Object} object
   * @param {String} path
   * @returns {Object} value or `undefined`
   * @namespace Utils
   * @name getPathValue
   * @api public
   */


  function getPathValue(obj, path$$1) {
    var info = getPathInfo(obj, path$$1);
    return info.value;
  }
  /**
   * ### .setPathValue(object, path, value)
   *
   * Define the value in an object at a given string path.
   *
   * ```js
   * var obj = {
   *     prop1: {
   *         arr: ['a', 'b', 'c']
   *       , str: 'Hello'
   *     }
   *   , prop2: {
   *         arr: [ { nested: 'Universe' } ]
   *       , str: 'Hello again!'
   *     }
   * };
   * ```
   *
   * The following would be acceptable.
   *
   * ```js
   * var properties = require('tea-properties');
   * properties.set(obj, 'prop1.str', 'Hello Universe!');
   * properties.set(obj, 'prop1.arr[2]', 'B');
   * properties.set(obj, 'prop2.arr[0].nested.value', { hello: 'universe' });
   * ```
   *
   * @param {Object} object
   * @param {String} path
   * @param {Mixed} value
   * @api private
   */


  function setPathValue(obj, path$$1, val) {
    var parsed = parsePath(path$$1);
    internalSetPathValue(obj, val, parsed);
    return obj;
  }

  var pathval = {
    hasProperty: hasProperty,
    getPathInfo: getPathInfo,
    getPathValue: getPathValue,
    setPathValue: setPathValue
  };

  /*!
   * Chai - flag utility
   * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
   * MIT Licensed
   */

  /**
   * ### .flag(object, key, [value])
   *
   * Get or set a flag value on an object. If a
   * value is provided it will be set, else it will
   * return the currently set value or `undefined` if
   * the value is not set.
   *
   *     utils.flag(this, 'foo', 'bar'); // setter
   *     utils.flag(this, 'foo'); // getter, returns `bar`
   *
   * @param {Object} object constructed Assertion
   * @param {String} key
   * @param {Mixed} value (optional)
   * @namespace Utils
   * @name flag
   * @api private
   */
  var flag = function flag(obj, key, value) {
    var flags = obj.__flags || (obj.__flags = Object.create(null));

    if (arguments.length === 3) {
      flags[key] = value;
    } else {
      return flags[key];
    }
  };

  /*!
   * Chai - test utility
   * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
   * MIT Licensed
   */

  /*!
   * Module dependancies
   */

  /**
   * ### .test(object, expression)
   *
   * Test and object for expression.
   *
   * @param {Object} object (constructed Assertion)
   * @param {Arguments} chai.Assertion.prototype.assert arguments
   * @namespace Utils
   * @name test
   */

  var test = function test(obj, args) {
    var negate = flag(obj, 'negate'),
        expr = args[0];
    return negate ? !expr : expr;
  };

  var typeDetect = createCommonjsModule(function (module, exports) {
    (function (global, factory) {
      module.exports = factory();
    })(commonjsGlobal, function () {
      /* !
       * type-detect
       * Copyright(c) 2013 jake luer <jake@alogicalparadox.com>
       * MIT Licensed
       */

      var promiseExists = typeof Promise === 'function';
      /* eslint-disable no-undef */

      var globalObject = typeof self === 'object' ? self : commonjsGlobal; // eslint-disable-line id-blacklist

      var symbolExists = typeof Symbol !== 'undefined';
      var mapExists = typeof Map !== 'undefined';
      var setExists = typeof Set !== 'undefined';
      var weakMapExists = typeof WeakMap !== 'undefined';
      var weakSetExists = typeof WeakSet !== 'undefined';
      var dataViewExists = typeof DataView !== 'undefined';
      var symbolIteratorExists = symbolExists && typeof Symbol.iterator !== 'undefined';
      var symbolToStringTagExists = symbolExists && typeof Symbol.toStringTag !== 'undefined';
      var setEntriesExists = setExists && typeof Set.prototype.entries === 'function';
      var mapEntriesExists = mapExists && typeof Map.prototype.entries === 'function';
      var setIteratorPrototype = setEntriesExists && Object.getPrototypeOf(new Set().entries());
      var mapIteratorPrototype = mapEntriesExists && Object.getPrototypeOf(new Map().entries());
      var arrayIteratorExists = symbolIteratorExists && typeof Array.prototype[Symbol.iterator] === 'function';
      var arrayIteratorPrototype = arrayIteratorExists && Object.getPrototypeOf([][Symbol.iterator]());
      var stringIteratorExists = symbolIteratorExists && typeof String.prototype[Symbol.iterator] === 'function';
      var stringIteratorPrototype = stringIteratorExists && Object.getPrototypeOf(''[Symbol.iterator]());
      var toStringLeftSliceLength = 8;
      var toStringRightSliceLength = -1;
      /**
       * ### typeOf (obj)
       *
       * Uses `Object.prototype.toString` to determine the type of an object,
       * normalising behaviour across engine versions & well optimised.
       *
       * @param {Mixed} object
       * @return {String} object type
       * @api public
       */

      function typeDetect(obj) {
        /* ! Speed optimisation
         * Pre:
         *   string literal     x 3,039,035 ops/sec ±1.62% (78 runs sampled)
         *   boolean literal    x 1,424,138 ops/sec ±4.54% (75 runs sampled)
         *   number literal     x 1,653,153 ops/sec ±1.91% (82 runs sampled)
         *   undefined          x 9,978,660 ops/sec ±1.92% (75 runs sampled)
         *   function           x 2,556,769 ops/sec ±1.73% (77 runs sampled)
         * Post:
         *   string literal     x 38,564,796 ops/sec ±1.15% (79 runs sampled)
         *   boolean literal    x 31,148,940 ops/sec ±1.10% (79 runs sampled)
         *   number literal     x 32,679,330 ops/sec ±1.90% (78 runs sampled)
         *   undefined          x 32,363,368 ops/sec ±1.07% (82 runs sampled)
         *   function           x 31,296,870 ops/sec ±0.96% (83 runs sampled)
         */
        var typeofObj = typeof obj;

        if (typeofObj !== 'object') {
          return typeofObj;
        }
        /* ! Speed optimisation
         * Pre:
         *   null               x 28,645,765 ops/sec ±1.17% (82 runs sampled)
         * Post:
         *   null               x 36,428,962 ops/sec ±1.37% (84 runs sampled)
         */


        if (obj === null) {
          return 'null';
        }
        /* ! Spec Conformance
         * Test: `Object.prototype.toString.call(window)``
         *  - Node === "[object global]"
         *  - Chrome === "[object global]"
         *  - Firefox === "[object Window]"
         *  - PhantomJS === "[object Window]"
         *  - Safari === "[object Window]"
         *  - IE 11 === "[object Window]"
         *  - IE Edge === "[object Window]"
         * Test: `Object.prototype.toString.call(this)``
         *  - Chrome Worker === "[object global]"
         *  - Firefox Worker === "[object DedicatedWorkerGlobalScope]"
         *  - Safari Worker === "[object DedicatedWorkerGlobalScope]"
         *  - IE 11 Worker === "[object WorkerGlobalScope]"
         *  - IE Edge Worker === "[object WorkerGlobalScope]"
         */


        if (obj === globalObject) {
          return 'global';
        }
        /* ! Speed optimisation
         * Pre:
         *   array literal      x 2,888,352 ops/sec ±0.67% (82 runs sampled)
         * Post:
         *   array literal      x 22,479,650 ops/sec ±0.96% (81 runs sampled)
         */


        if (Array.isArray(obj) && (symbolToStringTagExists === false || !(Symbol.toStringTag in obj))) {
          return 'Array';
        } // Not caching existence of `window` and related properties due to potential
        // for `window` to be unset before tests in quasi-browser environments.


        if (typeof window === 'object' && window !== null) {
          /* ! Spec Conformance
           * (https://html.spec.whatwg.org/multipage/browsers.html#location)
           * WhatWG HTML$7.7.3 - The `Location` interface
           * Test: `Object.prototype.toString.call(window.location)``
           *  - IE <=11 === "[object Object]"
           *  - IE Edge <=13 === "[object Object]"
           */
          if (typeof window.location === 'object' && obj === window.location) {
            return 'Location';
          }
          /* ! Spec Conformance
           * (https://html.spec.whatwg.org/#document)
           * WhatWG HTML$3.1.1 - The `Document` object
           * Note: Most browsers currently adher to the W3C DOM Level 2 spec
           *       (https://www.w3.org/TR/DOM-Level-2-HTML/html.html#ID-26809268)
           *       which suggests that browsers should use HTMLTableCellElement for
           *       both TD and TH elements. WhatWG separates these.
           *       WhatWG HTML states:
           *         > For historical reasons, Window objects must also have a
           *         > writable, configurable, non-enumerable property named
           *         > HTMLDocument whose value is the Document interface object.
           * Test: `Object.prototype.toString.call(document)``
           *  - Chrome === "[object HTMLDocument]"
           *  - Firefox === "[object HTMLDocument]"
           *  - Safari === "[object HTMLDocument]"
           *  - IE <=10 === "[object Document]"
           *  - IE 11 === "[object HTMLDocument]"
           *  - IE Edge <=13 === "[object HTMLDocument]"
           */


          if (typeof window.document === 'object' && obj === window.document) {
            return 'Document';
          }

          if (typeof window.navigator === 'object') {
            /* ! Spec Conformance
             * (https://html.spec.whatwg.org/multipage/webappapis.html#mimetypearray)
             * WhatWG HTML$8.6.1.5 - Plugins - Interface MimeTypeArray
             * Test: `Object.prototype.toString.call(navigator.mimeTypes)``
             *  - IE <=10 === "[object MSMimeTypesCollection]"
             */
            if (typeof window.navigator.mimeTypes === 'object' && obj === window.navigator.mimeTypes) {
              return 'MimeTypeArray';
            }
            /* ! Spec Conformance
             * (https://html.spec.whatwg.org/multipage/webappapis.html#pluginarray)
             * WhatWG HTML$8.6.1.5 - Plugins - Interface PluginArray
             * Test: `Object.prototype.toString.call(navigator.plugins)``
             *  - IE <=10 === "[object MSPluginsCollection]"
             */


            if (typeof window.navigator.plugins === 'object' && obj === window.navigator.plugins) {
              return 'PluginArray';
            }
          }

          if ((typeof window.HTMLElement === 'function' || typeof window.HTMLElement === 'object') && obj instanceof window.HTMLElement) {
            /* ! Spec Conformance
            * (https://html.spec.whatwg.org/multipage/webappapis.html#pluginarray)
            * WhatWG HTML$4.4.4 - The `blockquote` element - Interface `HTMLQuoteElement`
            * Test: `Object.prototype.toString.call(document.createElement('blockquote'))``
            *  - IE <=10 === "[object HTMLBlockElement]"
            */
            if (obj.tagName === 'BLOCKQUOTE') {
              return 'HTMLQuoteElement';
            }
            /* ! Spec Conformance
             * (https://html.spec.whatwg.org/#htmltabledatacellelement)
             * WhatWG HTML$4.9.9 - The `td` element - Interface `HTMLTableDataCellElement`
             * Note: Most browsers currently adher to the W3C DOM Level 2 spec
             *       (https://www.w3.org/TR/DOM-Level-2-HTML/html.html#ID-82915075)
             *       which suggests that browsers should use HTMLTableCellElement for
             *       both TD and TH elements. WhatWG separates these.
             * Test: Object.prototype.toString.call(document.createElement('td'))
             *  - Chrome === "[object HTMLTableCellElement]"
             *  - Firefox === "[object HTMLTableCellElement]"
             *  - Safari === "[object HTMLTableCellElement]"
             */


            if (obj.tagName === 'TD') {
              return 'HTMLTableDataCellElement';
            }
            /* ! Spec Conformance
             * (https://html.spec.whatwg.org/#htmltableheadercellelement)
             * WhatWG HTML$4.9.9 - The `td` element - Interface `HTMLTableHeaderCellElement`
             * Note: Most browsers currently adher to the W3C DOM Level 2 spec
             *       (https://www.w3.org/TR/DOM-Level-2-HTML/html.html#ID-82915075)
             *       which suggests that browsers should use HTMLTableCellElement for
             *       both TD and TH elements. WhatWG separates these.
             * Test: Object.prototype.toString.call(document.createElement('th'))
             *  - Chrome === "[object HTMLTableCellElement]"
             *  - Firefox === "[object HTMLTableCellElement]"
             *  - Safari === "[object HTMLTableCellElement]"
             */


            if (obj.tagName === 'TH') {
              return 'HTMLTableHeaderCellElement';
            }
          }
        }
        /* ! Speed optimisation
        * Pre:
        *   Float64Array       x 625,644 ops/sec ±1.58% (80 runs sampled)
        *   Float32Array       x 1,279,852 ops/sec ±2.91% (77 runs sampled)
        *   Uint32Array        x 1,178,185 ops/sec ±1.95% (83 runs sampled)
        *   Uint16Array        x 1,008,380 ops/sec ±2.25% (80 runs sampled)
        *   Uint8Array         x 1,128,040 ops/sec ±2.11% (81 runs sampled)
        *   Int32Array         x 1,170,119 ops/sec ±2.88% (80 runs sampled)
        *   Int16Array         x 1,176,348 ops/sec ±5.79% (86 runs sampled)
        *   Int8Array          x 1,058,707 ops/sec ±4.94% (77 runs sampled)
        *   Uint8ClampedArray  x 1,110,633 ops/sec ±4.20% (80 runs sampled)
        * Post:
        *   Float64Array       x 7,105,671 ops/sec ±13.47% (64 runs sampled)
        *   Float32Array       x 5,887,912 ops/sec ±1.46% (82 runs sampled)
        *   Uint32Array        x 6,491,661 ops/sec ±1.76% (79 runs sampled)
        *   Uint16Array        x 6,559,795 ops/sec ±1.67% (82 runs sampled)
        *   Uint8Array         x 6,463,966 ops/sec ±1.43% (85 runs sampled)
        *   Int32Array         x 5,641,841 ops/sec ±3.49% (81 runs sampled)
        *   Int16Array         x 6,583,511 ops/sec ±1.98% (80 runs sampled)
        *   Int8Array          x 6,606,078 ops/sec ±1.74% (81 runs sampled)
        *   Uint8ClampedArray  x 6,602,224 ops/sec ±1.77% (83 runs sampled)
        */


        var stringTag = symbolToStringTagExists && obj[Symbol.toStringTag];

        if (typeof stringTag === 'string') {
          return stringTag;
        }

        var objPrototype = Object.getPrototypeOf(obj);
        /* ! Speed optimisation
        * Pre:
        *   regex literal      x 1,772,385 ops/sec ±1.85% (77 runs sampled)
        *   regex constructor  x 2,143,634 ops/sec ±2.46% (78 runs sampled)
        * Post:
        *   regex literal      x 3,928,009 ops/sec ±0.65% (78 runs sampled)
        *   regex constructor  x 3,931,108 ops/sec ±0.58% (84 runs sampled)
        */

        if (objPrototype === RegExp.prototype) {
          return 'RegExp';
        }
        /* ! Speed optimisation
        * Pre:
        *   date               x 2,130,074 ops/sec ±4.42% (68 runs sampled)
        * Post:
        *   date               x 3,953,779 ops/sec ±1.35% (77 runs sampled)
        */


        if (objPrototype === Date.prototype) {
          return 'Date';
        }
        /* ! Spec Conformance
         * (http://www.ecma-international.org/ecma-262/6.0/index.html#sec-promise.prototype-@@tostringtag)
         * ES6$25.4.5.4 - Promise.prototype[@@toStringTag] should be "Promise":
         * Test: `Object.prototype.toString.call(Promise.resolve())``
         *  - Chrome <=47 === "[object Object]"
         *  - Edge <=20 === "[object Object]"
         *  - Firefox 29-Latest === "[object Promise]"
         *  - Safari 7.1-Latest === "[object Promise]"
         */


        if (promiseExists && objPrototype === Promise.prototype) {
          return 'Promise';
        }
        /* ! Speed optimisation
        * Pre:
        *   set                x 2,222,186 ops/sec ±1.31% (82 runs sampled)
        * Post:
        *   set                x 4,545,879 ops/sec ±1.13% (83 runs sampled)
        */


        if (setExists && objPrototype === Set.prototype) {
          return 'Set';
        }
        /* ! Speed optimisation
        * Pre:
        *   map                x 2,396,842 ops/sec ±1.59% (81 runs sampled)
        * Post:
        *   map                x 4,183,945 ops/sec ±6.59% (82 runs sampled)
        */


        if (mapExists && objPrototype === Map.prototype) {
          return 'Map';
        }
        /* ! Speed optimisation
        * Pre:
        *   weakset            x 1,323,220 ops/sec ±2.17% (76 runs sampled)
        * Post:
        *   weakset            x 4,237,510 ops/sec ±2.01% (77 runs sampled)
        */


        if (weakSetExists && objPrototype === WeakSet.prototype) {
          return 'WeakSet';
        }
        /* ! Speed optimisation
        * Pre:
        *   weakmap            x 1,500,260 ops/sec ±2.02% (78 runs sampled)
        * Post:
        *   weakmap            x 3,881,384 ops/sec ±1.45% (82 runs sampled)
        */


        if (weakMapExists && objPrototype === WeakMap.prototype) {
          return 'WeakMap';
        }
        /* ! Spec Conformance
         * (http://www.ecma-international.org/ecma-262/6.0/index.html#sec-dataview.prototype-@@tostringtag)
         * ES6$24.2.4.21 - DataView.prototype[@@toStringTag] should be "DataView":
         * Test: `Object.prototype.toString.call(new DataView(new ArrayBuffer(1)))``
         *  - Edge <=13 === "[object Object]"
         */


        if (dataViewExists && objPrototype === DataView.prototype) {
          return 'DataView';
        }
        /* ! Spec Conformance
         * (http://www.ecma-international.org/ecma-262/6.0/index.html#sec-%mapiteratorprototype%-@@tostringtag)
         * ES6$23.1.5.2.2 - %MapIteratorPrototype%[@@toStringTag] should be "Map Iterator":
         * Test: `Object.prototype.toString.call(new Map().entries())``
         *  - Edge <=13 === "[object Object]"
         */


        if (mapExists && objPrototype === mapIteratorPrototype) {
          return 'Map Iterator';
        }
        /* ! Spec Conformance
         * (http://www.ecma-international.org/ecma-262/6.0/index.html#sec-%setiteratorprototype%-@@tostringtag)
         * ES6$23.2.5.2.2 - %SetIteratorPrototype%[@@toStringTag] should be "Set Iterator":
         * Test: `Object.prototype.toString.call(new Set().entries())``
         *  - Edge <=13 === "[object Object]"
         */


        if (setExists && objPrototype === setIteratorPrototype) {
          return 'Set Iterator';
        }
        /* ! Spec Conformance
         * (http://www.ecma-international.org/ecma-262/6.0/index.html#sec-%arrayiteratorprototype%-@@tostringtag)
         * ES6$22.1.5.2.2 - %ArrayIteratorPrototype%[@@toStringTag] should be "Array Iterator":
         * Test: `Object.prototype.toString.call([][Symbol.iterator]())``
         *  - Edge <=13 === "[object Object]"
         */


        if (arrayIteratorExists && objPrototype === arrayIteratorPrototype) {
          return 'Array Iterator';
        }
        /* ! Spec Conformance
         * (http://www.ecma-international.org/ecma-262/6.0/index.html#sec-%stringiteratorprototype%-@@tostringtag)
         * ES6$21.1.5.2.2 - %StringIteratorPrototype%[@@toStringTag] should be "String Iterator":
         * Test: `Object.prototype.toString.call(''[Symbol.iterator]())``
         *  - Edge <=13 === "[object Object]"
         */


        if (stringIteratorExists && objPrototype === stringIteratorPrototype) {
          return 'String Iterator';
        }
        /* ! Speed optimisation
        * Pre:
        *   object from null   x 2,424,320 ops/sec ±1.67% (76 runs sampled)
        * Post:
        *   object from null   x 5,838,000 ops/sec ±0.99% (84 runs sampled)
        */


        if (objPrototype === null) {
          return 'Object';
        }

        return Object.prototype.toString.call(obj).slice(toStringLeftSliceLength, toStringRightSliceLength);
      }

      return typeDetect;
    });
  });

  /*!
   * Chai - expectTypes utility
   * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
   * MIT Licensed
   */

  /**
   * ### .expectTypes(obj, types)
   *
   * Ensures that the object being tested against is of a valid type.
   *
   *     utils.expectTypes(this, ['array', 'object', 'string']);
   *
   * @param {Mixed} obj constructed Assertion
   * @param {Array} type A list of allowed types for this assertion
   * @namespace Utils
   * @name expectTypes
   * @api public
   */

  var expectTypes = function expectTypes(obj, types) {
    var flagMsg = flag(obj, 'message');
    var ssfi = flag(obj, 'ssfi');
    flagMsg = flagMsg ? flagMsg + ': ' : '';
    obj = flag(obj, 'object');
    types = types.map(function (t) {
      return t.toLowerCase();
    });
    types.sort(); // Transforms ['lorem', 'ipsum'] into 'a lorem, or an ipsum'

    var str = types.map(function (t, index) {
      var art = ~['a', 'e', 'i', 'o', 'u'].indexOf(t.charAt(0)) ? 'an' : 'a';
      var or = types.length > 1 && index === types.length - 1 ? 'or ' : '';
      return or + art + ' ' + t;
    }).join(', ');
    var objType = typeDetect(obj).toLowerCase();

    if (!types.some(function (expected) {
      return objType === expected;
    })) {
      throw new assertionError(flagMsg + 'object tested must be ' + str + ', but ' + objType + ' given', undefined, ssfi);
    }
  };

  /*!
   * Chai - getActual utility
   * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
   * MIT Licensed
   */

  /**
   * ### .getActual(object, [actual])
   *
   * Returns the `actual` value for an Assertion.
   *
   * @param {Object} object (constructed Assertion)
   * @param {Arguments} chai.Assertion.prototype.assert arguments
   * @namespace Utils
   * @name getActual
   */
  var getActual = function getActual(obj, args) {
    return args.length > 4 ? args[4] : obj._obj;
  };

  /* !
   * Chai - getFuncName utility
   * Copyright(c) 2012-2016 Jake Luer <jake@alogicalparadox.com>
   * MIT Licensed
   */

  /**
   * ### .getFuncName(constructorFn)
   *
   * Returns the name of a function.
   * When a non-function instance is passed, returns `null`.
   * This also includes a polyfill function if `aFunc.name` is not defined.
   *
   * @name getFuncName
   * @param {Function} funct
   * @namespace Utils
   * @api public
   */

  var toString = Function.prototype.toString;
  var functionNameMatch = /\s*function(?:\s|\s*\/\*[^(?:*\/)]+\*\/\s*)*([^\s\(\/]+)/;

  function getFuncName(aFunc) {
    if (typeof aFunc !== 'function') {
      return null;
    }

    var name = '';

    if (typeof Function.prototype.name === 'undefined' && typeof aFunc.name === 'undefined') {
      // Here we run a polyfill if Function does not support the `name` property and if aFunc.name is not defined
      var match = toString.call(aFunc).match(functionNameMatch);

      if (match) {
        name = match[1];
      }
    } else {
      // If we've got a `name` property we just use it
      name = aFunc.name;
    }

    return name;
  }

  var getFuncName_1 = getFuncName;

  /*!
   * Chai - getProperties utility
   * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
   * MIT Licensed
   */

  /**
   * ### .getProperties(object)
   *
   * This allows the retrieval of property names of an object, enumerable or not,
   * inherited or not.
   *
   * @param {Object} object
   * @returns {Array}
   * @namespace Utils
   * @name getProperties
   * @api public
   */
  var getProperties = function getProperties(object) {
    var result = Object.getOwnPropertyNames(object);

    function addProperty(property) {
      if (result.indexOf(property) === -1) {
        result.push(property);
      }
    }

    var proto = Object.getPrototypeOf(object);

    while (proto !== null) {
      Object.getOwnPropertyNames(proto).forEach(addProperty);
      proto = Object.getPrototypeOf(proto);
    }

    return result;
  };

  /*!
   * Chai - getEnumerableProperties utility
   * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
   * MIT Licensed
   */

  /**
   * ### .getEnumerableProperties(object)
   *
   * This allows the retrieval of enumerable property names of an object,
   * inherited or not.
   *
   * @param {Object} object
   * @returns {Array}
   * @namespace Utils
   * @name getEnumerableProperties
   * @api public
   */
  var getEnumerableProperties = function getEnumerableProperties(object) {
    var result = [];

    for (var name in object) {
      result.push(name);
    }

    return result;
  };

  var config = {
    /**
     * ### config.includeStack
     *
     * User configurable property, influences whether stack trace
     * is included in Assertion error message. Default of false
     * suppresses stack trace in the error message.
     *
     *     chai.config.includeStack = true;  // enable stack on error
     *
     * @param {Boolean}
     * @api public
     */
    includeStack: false,

    /**
     * ### config.showDiff
     *
     * User configurable property, influences whether or not
     * the `showDiff` flag should be included in the thrown
     * AssertionErrors. `false` will always be `false`; `true`
     * will be true when the assertion has requested a diff
     * be shown.
     *
     * @param {Boolean}
     * @api public
     */
    showDiff: true,

    /**
     * ### config.truncateThreshold
     *
     * User configurable property, sets length threshold for actual and
     * expected values in assertion errors. If this threshold is exceeded, for
     * example for large data structures, the value is replaced with something
     * like `[ Array(3) ]` or `{ Object (prop1, prop2) }`.
     *
     * Set it to zero if you want to disable truncating altogether.
     *
     * This is especially userful when doing assertions on arrays: having this
     * set to a reasonable large value makes the failure messages readily
     * inspectable.
     *
     *     chai.config.truncateThreshold = 0;  // disable truncating
     *
     * @param {Number}
     * @api public
     */
    truncateThreshold: 40,

    /**
     * ### config.useProxy
     *
     * User configurable property, defines if chai will use a Proxy to throw
     * an error when a non-existent property is read, which protects users
     * from typos when using property-based assertions.
     *
     * Set it to false if you want to disable this feature.
     *
     *     chai.config.useProxy = false;  // disable use of Proxy
     *
     * This feature is automatically disabled regardless of this config value
     * in environments that don't support proxies.
     *
     * @param {Boolean}
     * @api public
     */
    useProxy: true,

    /**
     * ### config.proxyExcludedKeys
     *
     * User configurable property, defines which properties should be ignored
     * instead of throwing an error if they do not exist on the assertion.
     * This is only applied if the environment Chai is running in supports proxies and
     * if the `useProxy` configuration setting is enabled.
     * By default, `then` and `inspect` will not throw an error if they do not exist on the
     * assertion object because the `.inspect` property is read by `util.inspect` (for example, when
     * using `console.log` on the assertion object) and `.then` is necessary for promise type-checking.
     *
     *     // By default these keys will not throw an error if they do not exist on the assertion object
     *     chai.config.proxyExcludedKeys = ['then', 'inspect'];
     *
     * @param {Array}
     * @api public
     */
    proxyExcludedKeys: ['then', 'inspect', 'toJSON']
  };

  var inspect_1 = createCommonjsModule(function (module, exports) {
    // This is (almost) directly from Node.js utils
    // https://github.com/joyent/node/blob/f8c335d0caf47f16d31413f89aa28eda3878e3aa/lib/util.js
    module.exports = inspect;
    /**
     * ### .inspect(obj, [showHidden], [depth], [colors])
     *
     * Echoes the value of a value. Tries to print the value out
     * in the best way possible given the different types.
     *
     * @param {Object} obj The object to print out.
     * @param {Boolean} showHidden Flag that shows hidden (not enumerable)
     *    properties of objects. Default is false.
     * @param {Number} depth Depth in which to descend in object. Default is 2.
     * @param {Boolean} colors Flag to turn on ANSI escape codes to color the
     *    output. Default is false (no coloring).
     * @namespace Utils
     * @name inspect
     */

    function inspect(obj, showHidden, depth, colors) {
      var ctx = {
        showHidden: showHidden,
        seen: [],
        stylize: function (str) {
          return str;
        }
      };
      return formatValue(ctx, obj, typeof depth === 'undefined' ? 2 : depth);
    } // Returns true if object is a DOM element.


    var isDOMElement = function (object) {
      if (typeof HTMLElement === 'object') {
        return object instanceof HTMLElement;
      } else {
        return object && typeof object === 'object' && 'nodeType' in object && object.nodeType === 1 && typeof object.nodeName === 'string';
      }
    };

    function formatValue(ctx, value, recurseTimes) {
      // Provide a hook for user-specified inspect functions.
      // Check that value is an object with an inspect function on it
      if (value && typeof value.inspect === 'function' && // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect && // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
        var ret = value.inspect(recurseTimes, ctx);

        if (typeof ret !== 'string') {
          ret = formatValue(ctx, ret, recurseTimes);
        }

        return ret;
      } // Primitive types cannot have properties


      var primitive = formatPrimitive(ctx, value);

      if (primitive) {
        return primitive;
      } // If this is a DOM element, try to get the outer HTML.


      if (isDOMElement(value)) {
        if ('outerHTML' in value) {
          return value.outerHTML; // This value does not have an outerHTML attribute,
          //   it could still be an XML element
        } else {
          // Attempt to serialize it
          try {
            if (document.xmlVersion) {
              var xmlSerializer = new XMLSerializer();
              return xmlSerializer.serializeToString(value);
            } else {
              // Firefox 11- do not support outerHTML
              //   It does, however, support innerHTML
              //   Use the following to render the element
              var ns = "http://www.w3.org/1999/xhtml";
              var container = document.createElementNS(ns, '_');
              container.appendChild(value.cloneNode(false));
              var html = container.innerHTML.replace('><', '>' + value.innerHTML + '<');
              container.innerHTML = '';
              return html;
            }
          } catch (err) {// This could be a non-native DOM implementation,
            //   continue with the normal flow:
            //   printing the element as if it is an object.
          }
        }
      } // Look up the keys of the object.


      var visibleKeys = getEnumerableProperties(value);
      var keys = ctx.showHidden ? getProperties(value) : visibleKeys;
      var name, nameSuffix; // Some type of object without properties can be shortcutted.
      // In IE, errors have a single `stack` property, or if they are vanilla `Error`,
      // a `stack` plus `description` property; ignore those for consistency.

      if (keys.length === 0 || isError(value) && (keys.length === 1 && keys[0] === 'stack' || keys.length === 2 && keys[0] === 'description' && keys[1] === 'stack')) {
        if (typeof value === 'function') {
          name = getFuncName_1(value);
          nameSuffix = name ? ': ' + name : '';
          return ctx.stylize('[Function' + nameSuffix + ']', 'special');
        }

        if (isRegExp(value)) {
          return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
        }

        if (isDate(value)) {
          return ctx.stylize(Date.prototype.toUTCString.call(value), 'date');
        }

        if (isError(value)) {
          return formatError(value);
        }
      }

      var base = '',
          array = false,
          typedArray = false,
          braces = ['{', '}'];

      if (isTypedArray(value)) {
        typedArray = true;
        braces = ['[', ']'];
      } // Make Array say that they are Array


      if (isArray(value)) {
        array = true;
        braces = ['[', ']'];
      } // Make functions say that they are functions


      if (typeof value === 'function') {
        name = getFuncName_1(value);
        nameSuffix = name ? ': ' + name : '';
        base = ' [Function' + nameSuffix + ']';
      } // Make RegExps say that they are RegExps


      if (isRegExp(value)) {
        base = ' ' + RegExp.prototype.toString.call(value);
      } // Make dates with properties first say the date


      if (isDate(value)) {
        base = ' ' + Date.prototype.toUTCString.call(value);
      } // Make error with message first say the error


      if (isError(value)) {
        return formatError(value);
      }

      if (keys.length === 0 && (!array || value.length == 0)) {
        return braces[0] + base + braces[1];
      }

      if (recurseTimes < 0) {
        if (isRegExp(value)) {
          return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
        } else {
          return ctx.stylize('[Object]', 'special');
        }
      }

      ctx.seen.push(value);
      var output;

      if (array) {
        output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
      } else if (typedArray) {
        return formatTypedArray(value);
      } else {
        output = keys.map(function (key) {
          return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
        });
      }

      ctx.seen.pop();
      return reduceToSingleString(output, base, braces);
    }

    function formatPrimitive(ctx, value) {
      switch (typeof value) {
        case 'undefined':
          return ctx.stylize('undefined', 'undefined');

        case 'string':
          var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '').replace(/'/g, "\\'").replace(/\\"/g, '"') + '\'';
          return ctx.stylize(simple, 'string');

        case 'number':
          if (value === 0 && 1 / value === -Infinity) {
            return ctx.stylize('-0', 'number');
          }

          return ctx.stylize('' + value, 'number');

        case 'boolean':
          return ctx.stylize('' + value, 'boolean');

        case 'symbol':
          return ctx.stylize(value.toString(), 'symbol');
      } // For some reason typeof null is "object", so special case here.


      if (value === null) {
        return ctx.stylize('null', 'null');
      }
    }

    function formatError(value) {
      return '[' + Error.prototype.toString.call(value) + ']';
    }

    function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
      var output = [];

      for (var i = 0, l = value.length; i < l; ++i) {
        if (Object.prototype.hasOwnProperty.call(value, String(i))) {
          output.push(formatProperty(ctx, value, recurseTimes, visibleKeys, String(i), true));
        } else {
          output.push('');
        }
      }

      keys.forEach(function (key) {
        if (!key.match(/^\d+$/)) {
          output.push(formatProperty(ctx, value, recurseTimes, visibleKeys, key, true));
        }
      });
      return output;
    }

    function formatTypedArray(value) {
      var str = '[ ';

      for (var i = 0; i < value.length; ++i) {
        if (str.length >= config.truncateThreshold - 7) {
          str += '...';
          break;
        }

        str += value[i] + ', ';
      }

      str += ' ]'; // Removing trailing `, ` if the array was not truncated

      if (str.indexOf(',  ]') !== -1) {
        str = str.replace(',  ]', ' ]');
      }

      return str;
    }

    function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
      var name;
      var propDescriptor = Object.getOwnPropertyDescriptor(value, key);
      var str;

      if (propDescriptor) {
        if (propDescriptor.get) {
          if (propDescriptor.set) {
            str = ctx.stylize('[Getter/Setter]', 'special');
          } else {
            str = ctx.stylize('[Getter]', 'special');
          }
        } else {
          if (propDescriptor.set) {
            str = ctx.stylize('[Setter]', 'special');
          }
        }
      }

      if (visibleKeys.indexOf(key) < 0) {
        name = '[' + key + ']';
      }

      if (!str) {
        if (ctx.seen.indexOf(value[key]) < 0) {
          if (recurseTimes === null) {
            str = formatValue(ctx, value[key], null);
          } else {
            str = formatValue(ctx, value[key], recurseTimes - 1);
          }

          if (str.indexOf('\n') > -1) {
            if (array) {
              str = str.split('\n').map(function (line) {
                return '  ' + line;
              }).join('\n').substr(2);
            } else {
              str = '\n' + str.split('\n').map(function (line) {
                return '   ' + line;
              }).join('\n');
            }
          }
        } else {
          str = ctx.stylize('[Circular]', 'special');
        }
      }

      if (typeof name === 'undefined') {
        if (array && key.match(/^\d+$/)) {
          return str;
        }

        name = JSON.stringify('' + key);

        if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
          name = name.substr(1, name.length - 2);
          name = ctx.stylize(name, 'name');
        } else {
          name = name.replace(/'/g, "\\'").replace(/\\"/g, '"').replace(/(^"|"$)/g, "'");
          name = ctx.stylize(name, 'string');
        }
      }

      return name + ': ' + str;
    }

    function reduceToSingleString(output, base, braces) {
      var length = output.reduce(function (prev, cur) {
        if (cur.indexOf('\n') >= 0) ;
        return prev + cur.length + 1;
      }, 0);

      if (length > 60) {
        return braces[0] + (base === '' ? '' : base + '\n ') + ' ' + output.join(',\n  ') + ' ' + braces[1];
      }

      return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
    }

    function isTypedArray(ar) {
      // Unfortunately there's no way to check if an object is a TypedArray
      // We have to check if it's one of these types
      return typeof ar === 'object' && /\w+Array]$/.test(objectToString(ar));
    }

    function isArray(ar) {
      return Array.isArray(ar) || typeof ar === 'object' && objectToString(ar) === '[object Array]';
    }

    function isRegExp(re) {
      return typeof re === 'object' && objectToString(re) === '[object RegExp]';
    }

    function isDate(d) {
      return typeof d === 'object' && objectToString(d) === '[object Date]';
    }

    function isError(e) {
      return typeof e === 'object' && objectToString(e) === '[object Error]';
    }

    function objectToString(o) {
      return Object.prototype.toString.call(o);
    }
  });

  /*!
   * Chai - flag utility
   * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
   * MIT Licensed
   */

  /*!
   * Module dependancies
   */

  /**
   * ### .objDisplay(object)
   *
   * Determines if an object or an array matches
   * criteria to be inspected in-line for error
   * messages or should be truncated.
   *
   * @param {Mixed} javascript object to inspect
   * @name objDisplay
   * @namespace Utils
   * @api public
   */

  var objDisplay = function objDisplay(obj) {
    var str = inspect_1(obj),
        type = Object.prototype.toString.call(obj);

    if (config.truncateThreshold && str.length >= config.truncateThreshold) {
      if (type === '[object Function]') {
        return !obj.name || obj.name === '' ? '[Function]' : '[Function: ' + obj.name + ']';
      } else if (type === '[object Array]') {
        return '[ Array(' + obj.length + ') ]';
      } else if (type === '[object Object]') {
        var keys = Object.keys(obj),
            kstr = keys.length > 2 ? keys.splice(0, 2).join(', ') + ', ...' : keys.join(', ');
        return '{ Object (' + kstr + ') }';
      } else {
        return str;
      }
    } else {
      return str;
    }
  };

  /*!
   * Chai - message composition utility
   * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
   * MIT Licensed
   */

  /*!
   * Module dependancies
   */

  /**
   * ### .getMessage(object, message, negateMessage)
   *
   * Construct the error message based on flags
   * and template tags. Template tags will return
   * a stringified inspection of the object referenced.
   *
   * Message template tags:
   * - `#{this}` current asserted object
   * - `#{act}` actual value
   * - `#{exp}` expected value
   *
   * @param {Object} object (constructed Assertion)
   * @param {Arguments} chai.Assertion.prototype.assert arguments
   * @namespace Utils
   * @name getMessage
   * @api public
   */

  var getMessage = function getMessage(obj, args) {
    var negate = flag(obj, 'negate'),
        val = flag(obj, 'object'),
        expected = args[3],
        actual = getActual(obj, args),
        msg = negate ? args[2] : args[1],
        flagMsg = flag(obj, 'message');
    if (typeof msg === "function") msg = msg();
    msg = msg || '';
    msg = msg.replace(/#\{this\}/g, function () {
      return objDisplay(val);
    }).replace(/#\{act\}/g, function () {
      return objDisplay(actual);
    }).replace(/#\{exp\}/g, function () {
      return objDisplay(expected);
    });
    return flagMsg ? flagMsg + ': ' + msg : msg;
  };

  /*!
   * Chai - transferFlags utility
   * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
   * MIT Licensed
   */

  /**
   * ### .transferFlags(assertion, object, includeAll = true)
   *
   * Transfer all the flags for `assertion` to `object`. If
   * `includeAll` is set to `false`, then the base Chai
   * assertion flags (namely `object`, `ssfi`, `lockSsfi`,
   * and `message`) will not be transferred.
   *
   *
   *     var newAssertion = new Assertion();
   *     utils.transferFlags(assertion, newAssertion);
   *
   *     var anotherAsseriton = new Assertion(myObj);
   *     utils.transferFlags(assertion, anotherAssertion, false);
   *
   * @param {Assertion} assertion the assertion to transfer the flags from
   * @param {Object} object the object to transfer the flags to; usually a new assertion
   * @param {Boolean} includeAll
   * @namespace Utils
   * @name transferFlags
   * @api private
   */
  var transferFlags = function transferFlags(assertion, object, includeAll) {
    var flags = assertion.__flags || (assertion.__flags = Object.create(null));

    if (!object.__flags) {
      object.__flags = Object.create(null);
    }

    includeAll = arguments.length === 3 ? includeAll : true;

    for (var flag in flags) {
      if (includeAll || flag !== 'object' && flag !== 'ssfi' && flag !== 'lockSsfi' && flag != 'message') {
        object.__flags[flag] = flags[flag];
      }
    }
  };

  /* globals Symbol: false, Uint8Array: false, WeakMap: false */

  /*!
   * deep-eql
   * Copyright(c) 2013 Jake Luer <jake@alogicalparadox.com>
   * MIT Licensed
   */


  function FakeMap() {
    this._key = 'chai/deep-eql__' + Math.random() + Date.now();
  }

  FakeMap.prototype = {
    get: function getMap(key) {
      return key[this._key];
    },
    set: function setMap(key, value) {
      if (Object.isExtensible(key)) {
        Object.defineProperty(key, this._key, {
          value: value,
          configurable: true
        });
      }
    }
  };
  var MemoizeMap = typeof WeakMap === 'function' ? WeakMap : FakeMap;
  /*!
   * Check to see if the MemoizeMap has recorded a result of the two operands
   *
   * @param {Mixed} leftHandOperand
   * @param {Mixed} rightHandOperand
   * @param {MemoizeMap} memoizeMap
   * @returns {Boolean|null} result
  */

  function memoizeCompare(leftHandOperand, rightHandOperand, memoizeMap) {
    // Technically, WeakMap keys can *only* be objects, not primitives.
    if (!memoizeMap || isPrimitive(leftHandOperand) || isPrimitive(rightHandOperand)) {
      return null;
    }

    var leftHandMap = memoizeMap.get(leftHandOperand);

    if (leftHandMap) {
      var result = leftHandMap.get(rightHandOperand);

      if (typeof result === 'boolean') {
        return result;
      }
    }

    return null;
  }
  /*!
   * Set the result of the equality into the MemoizeMap
   *
   * @param {Mixed} leftHandOperand
   * @param {Mixed} rightHandOperand
   * @param {MemoizeMap} memoizeMap
   * @param {Boolean} result
  */


  function memoizeSet(leftHandOperand, rightHandOperand, memoizeMap, result) {
    // Technically, WeakMap keys can *only* be objects, not primitives.
    if (!memoizeMap || isPrimitive(leftHandOperand) || isPrimitive(rightHandOperand)) {
      return;
    }

    var leftHandMap = memoizeMap.get(leftHandOperand);

    if (leftHandMap) {
      leftHandMap.set(rightHandOperand, result);
    } else {
      leftHandMap = new MemoizeMap();
      leftHandMap.set(rightHandOperand, result);
      memoizeMap.set(leftHandOperand, leftHandMap);
    }
  }
  /*!
   * Primary Export
   */


  var deepEql = deepEqual;
  var MemoizeMap_1 = MemoizeMap;
  /**
   * Assert deeply nested sameValue equality between two objects of any type.
   *
   * @param {Mixed} leftHandOperand
   * @param {Mixed} rightHandOperand
   * @param {Object} [options] (optional) Additional options
   * @param {Array} [options.comparator] (optional) Override default algorithm, determining custom equality.
   * @param {Array} [options.memoize] (optional) Provide a custom memoization object which will cache the results of
      complex objects for a speed boost. By passing `false` you can disable memoization, but this will cause circular
      references to blow the stack.
   * @return {Boolean} equal match
   */

  function deepEqual(leftHandOperand, rightHandOperand, options) {
    // If we have a comparator, we can't assume anything; so bail to its check first.
    if (options && options.comparator) {
      return extensiveDeepEqual(leftHandOperand, rightHandOperand, options);
    }

    var simpleResult = simpleEqual(leftHandOperand, rightHandOperand);

    if (simpleResult !== null) {
      return simpleResult;
    } // Deeper comparisons are pushed through to a larger function


    return extensiveDeepEqual(leftHandOperand, rightHandOperand, options);
  }
  /**
   * Many comparisons can be canceled out early via simple equality or primitive checks.
   * @param {Mixed} leftHandOperand
   * @param {Mixed} rightHandOperand
   * @return {Boolean|null} equal match
   */


  function simpleEqual(leftHandOperand, rightHandOperand) {
    // Equal references (except for Numbers) can be returned early
    if (leftHandOperand === rightHandOperand) {
      // Handle +-0 cases
      return leftHandOperand !== 0 || 1 / leftHandOperand === 1 / rightHandOperand;
    } // handle NaN cases


    if (leftHandOperand !== leftHandOperand && // eslint-disable-line no-self-compare
    rightHandOperand !== rightHandOperand // eslint-disable-line no-self-compare
    ) {
        return true;
      } // Anything that is not an 'object', i.e. symbols, functions, booleans, numbers,
    // strings, and undefined, can be compared by reference.


    if (isPrimitive(leftHandOperand) || isPrimitive(rightHandOperand)) {
      // Easy out b/c it would have passed the first equality check
      return false;
    }

    return null;
  }
  /*!
   * The main logic of the `deepEqual` function.
   *
   * @param {Mixed} leftHandOperand
   * @param {Mixed} rightHandOperand
   * @param {Object} [options] (optional) Additional options
   * @param {Array} [options.comparator] (optional) Override default algorithm, determining custom equality.
   * @param {Array} [options.memoize] (optional) Provide a custom memoization object which will cache the results of
      complex objects for a speed boost. By passing `false` you can disable memoization, but this will cause circular
      references to blow the stack.
   * @return {Boolean} equal match
  */


  function extensiveDeepEqual(leftHandOperand, rightHandOperand, options) {
    options = options || {};
    options.memoize = options.memoize === false ? false : options.memoize || new MemoizeMap();
    var comparator = options && options.comparator; // Check if a memoized result exists.

    var memoizeResultLeft = memoizeCompare(leftHandOperand, rightHandOperand, options.memoize);

    if (memoizeResultLeft !== null) {
      return memoizeResultLeft;
    }

    var memoizeResultRight = memoizeCompare(rightHandOperand, leftHandOperand, options.memoize);

    if (memoizeResultRight !== null) {
      return memoizeResultRight;
    } // If a comparator is present, use it.


    if (comparator) {
      var comparatorResult = comparator(leftHandOperand, rightHandOperand); // Comparators may return null, in which case we want to go back to default behavior.

      if (comparatorResult === false || comparatorResult === true) {
        memoizeSet(leftHandOperand, rightHandOperand, options.memoize, comparatorResult);
        return comparatorResult;
      } // To allow comparators to override *any* behavior, we ran them first. Since it didn't decide
      // what to do, we need to make sure to return the basic tests first before we move on.


      var simpleResult = simpleEqual(leftHandOperand, rightHandOperand);

      if (simpleResult !== null) {
        // Don't memoize this, it takes longer to set/retrieve than to just compare.
        return simpleResult;
      }
    }

    var leftHandType = typeDetect(leftHandOperand);

    if (leftHandType !== typeDetect(rightHandOperand)) {
      memoizeSet(leftHandOperand, rightHandOperand, options.memoize, false);
      return false;
    } // Temporarily set the operands in the memoize object to prevent blowing the stack


    memoizeSet(leftHandOperand, rightHandOperand, options.memoize, true);
    var result = extensiveDeepEqualByType(leftHandOperand, rightHandOperand, leftHandType, options);
    memoizeSet(leftHandOperand, rightHandOperand, options.memoize, result);
    return result;
  }

  function extensiveDeepEqualByType(leftHandOperand, rightHandOperand, leftHandType, options) {
    switch (leftHandType) {
      case 'String':
      case 'Number':
      case 'Boolean':
      case 'Date':
        // If these types are their instance types (e.g. `new Number`) then re-deepEqual against their values
        return deepEqual(leftHandOperand.valueOf(), rightHandOperand.valueOf());

      case 'Promise':
      case 'Symbol':
      case 'function':
      case 'WeakMap':
      case 'WeakSet':
      case 'Error':
        return leftHandOperand === rightHandOperand;

      case 'Arguments':
      case 'Int8Array':
      case 'Uint8Array':
      case 'Uint8ClampedArray':
      case 'Int16Array':
      case 'Uint16Array':
      case 'Int32Array':
      case 'Uint32Array':
      case 'Float32Array':
      case 'Float64Array':
      case 'Array':
        return iterableEqual(leftHandOperand, rightHandOperand, options);

      case 'RegExp':
        return regexpEqual(leftHandOperand, rightHandOperand);

      case 'Generator':
        return generatorEqual(leftHandOperand, rightHandOperand, options);

      case 'DataView':
        return iterableEqual(new Uint8Array(leftHandOperand.buffer), new Uint8Array(rightHandOperand.buffer), options);

      case 'ArrayBuffer':
        return iterableEqual(new Uint8Array(leftHandOperand), new Uint8Array(rightHandOperand), options);

      case 'Set':
        return entriesEqual(leftHandOperand, rightHandOperand, options);

      case 'Map':
        return entriesEqual(leftHandOperand, rightHandOperand, options);

      default:
        return objectEqual(leftHandOperand, rightHandOperand, options);
    }
  }
  /*!
   * Compare two Regular Expressions for equality.
   *
   * @param {RegExp} leftHandOperand
   * @param {RegExp} rightHandOperand
   * @return {Boolean} result
   */


  function regexpEqual(leftHandOperand, rightHandOperand) {
    return leftHandOperand.toString() === rightHandOperand.toString();
  }
  /*!
   * Compare two Sets/Maps for equality. Faster than other equality functions.
   *
   * @param {Set} leftHandOperand
   * @param {Set} rightHandOperand
   * @param {Object} [options] (Optional)
   * @return {Boolean} result
   */


  function entriesEqual(leftHandOperand, rightHandOperand, options) {
    // IE11 doesn't support Set#entries or Set#@@iterator, so we need manually populate using Set#forEach
    if (leftHandOperand.size !== rightHandOperand.size) {
      return false;
    }

    if (leftHandOperand.size === 0) {
      return true;
    }

    var leftHandItems = [];
    var rightHandItems = [];
    leftHandOperand.forEach(function gatherEntries(key, value) {
      leftHandItems.push([key, value]);
    });
    rightHandOperand.forEach(function gatherEntries(key, value) {
      rightHandItems.push([key, value]);
    });
    return iterableEqual(leftHandItems.sort(), rightHandItems.sort(), options);
  }
  /*!
   * Simple equality for flat iterable objects such as Arrays, TypedArrays or Node.js buffers.
   *
   * @param {Iterable} leftHandOperand
   * @param {Iterable} rightHandOperand
   * @param {Object} [options] (Optional)
   * @return {Boolean} result
   */


  function iterableEqual(leftHandOperand, rightHandOperand, options) {
    var length = leftHandOperand.length;

    if (length !== rightHandOperand.length) {
      return false;
    }

    if (length === 0) {
      return true;
    }

    var index = -1;

    while (++index < length) {
      if (deepEqual(leftHandOperand[index], rightHandOperand[index], options) === false) {
        return false;
      }
    }

    return true;
  }
  /*!
   * Simple equality for generator objects such as those returned by generator functions.
   *
   * @param {Iterable} leftHandOperand
   * @param {Iterable} rightHandOperand
   * @param {Object} [options] (Optional)
   * @return {Boolean} result
   */


  function generatorEqual(leftHandOperand, rightHandOperand, options) {
    return iterableEqual(getGeneratorEntries(leftHandOperand), getGeneratorEntries(rightHandOperand), options);
  }
  /*!
   * Determine if the given object has an @@iterator function.
   *
   * @param {Object} target
   * @return {Boolean} `true` if the object has an @@iterator function.
   */


  function hasIteratorFunction(target) {
    return typeof Symbol !== 'undefined' && typeof target === 'object' && typeof Symbol.iterator !== 'undefined' && typeof target[Symbol.iterator] === 'function';
  }
  /*!
   * Gets all iterator entries from the given Object. If the Object has no @@iterator function, returns an empty array.
   * This will consume the iterator - which could have side effects depending on the @@iterator implementation.
   *
   * @param {Object} target
   * @returns {Array} an array of entries from the @@iterator function
   */


  function getIteratorEntries(target) {
    if (hasIteratorFunction(target)) {
      try {
        return getGeneratorEntries(target[Symbol.iterator]());
      } catch (iteratorError) {
        return [];
      }
    }

    return [];
  }
  /*!
   * Gets all entries from a Generator. This will consume the generator - which could have side effects.
   *
   * @param {Generator} target
   * @returns {Array} an array of entries from the Generator.
   */


  function getGeneratorEntries(generator) {
    var generatorResult = generator.next();
    var accumulator = [generatorResult.value];

    while (generatorResult.done === false) {
      generatorResult = generator.next();
      accumulator.push(generatorResult.value);
    }

    return accumulator;
  }
  /*!
   * Gets all own and inherited enumerable keys from a target.
   *
   * @param {Object} target
   * @returns {Array} an array of own and inherited enumerable keys from the target.
   */


  function getEnumerableKeys(target) {
    var keys = [];

    for (var key in target) {
      keys.push(key);
    }

    return keys;
  }
  /*!
   * Determines if two objects have matching values, given a set of keys. Defers to deepEqual for the equality check of
   * each key. If any value of the given key is not equal, the function will return false (early).
   *
   * @param {Mixed} leftHandOperand
   * @param {Mixed} rightHandOperand
   * @param {Array} keys An array of keys to compare the values of leftHandOperand and rightHandOperand against
   * @param {Object} [options] (Optional)
   * @return {Boolean} result
   */


  function keysEqual(leftHandOperand, rightHandOperand, keys, options) {
    var length = keys.length;

    if (length === 0) {
      return true;
    }

    for (var i = 0; i < length; i += 1) {
      if (deepEqual(leftHandOperand[keys[i]], rightHandOperand[keys[i]], options) === false) {
        return false;
      }
    }

    return true;
  }
  /*!
   * Recursively check the equality of two Objects. Once basic sameness has been established it will defer to `deepEqual`
   * for each enumerable key in the object.
   *
   * @param {Mixed} leftHandOperand
   * @param {Mixed} rightHandOperand
   * @param {Object} [options] (Optional)
   * @return {Boolean} result
   */


  function objectEqual(leftHandOperand, rightHandOperand, options) {
    var leftHandKeys = getEnumerableKeys(leftHandOperand);
    var rightHandKeys = getEnumerableKeys(rightHandOperand);

    if (leftHandKeys.length && leftHandKeys.length === rightHandKeys.length) {
      leftHandKeys.sort();
      rightHandKeys.sort();

      if (iterableEqual(leftHandKeys, rightHandKeys) === false) {
        return false;
      }

      return keysEqual(leftHandOperand, rightHandOperand, leftHandKeys, options);
    }

    var leftHandEntries = getIteratorEntries(leftHandOperand);
    var rightHandEntries = getIteratorEntries(rightHandOperand);

    if (leftHandEntries.length && leftHandEntries.length === rightHandEntries.length) {
      leftHandEntries.sort();
      rightHandEntries.sort();
      return iterableEqual(leftHandEntries, rightHandEntries, options);
    }

    if (leftHandKeys.length === 0 && leftHandEntries.length === 0 && rightHandKeys.length === 0 && rightHandEntries.length === 0) {
      return true;
    }

    return false;
  }
  /*!
   * Returns true if the argument is a primitive.
   *
   * This intentionally returns true for all objects that can be compared by reference,
   * including functions and symbols.
   *
   * @param {Mixed} value
   * @return {Boolean} result
   */


  function isPrimitive(value) {
    return value === null || typeof value !== 'object';
  }
  deepEql.MemoizeMap = MemoizeMap_1;

  /*!
   * Chai - isProxyEnabled helper
   * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
   * MIT Licensed
   */

  /**
   * ### .isProxyEnabled()
   *
   * Helper function to check if Chai's proxy protection feature is enabled. If
   * proxies are unsupported or disabled via the user's Chai config, then return
   * false. Otherwise, return true.
   *
   * @namespace Utils
   * @name isProxyEnabled
   */

  var isProxyEnabled = function isProxyEnabled() {
    return config.useProxy && typeof Proxy !== 'undefined' && typeof Reflect !== 'undefined';
  };

  /*!
   * Chai - addProperty utility
   * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
   * MIT Licensed
   */

  /**
   * ### .addProperty(ctx, name, getter)
   *
   * Adds a property to the prototype of an object.
   *
   *     utils.addProperty(chai.Assertion.prototype, 'foo', function () {
   *       var obj = utils.flag(this, 'object');
   *       new chai.Assertion(obj).to.be.instanceof(Foo);
   *     });
   *
   * Can also be accessed directly from `chai.Assertion`.
   *
   *     chai.Assertion.addProperty('foo', fn);
   *
   * Then can be used as any other assertion.
   *
   *     expect(myFoo).to.be.foo;
   *
   * @param {Object} ctx object to which the property is added
   * @param {String} name of property to add
   * @param {Function} getter function to be used for name
   * @namespace Utils
   * @name addProperty
   * @api public
   */

  var addProperty = function addProperty(ctx, name, getter) {
    getter = getter === undefined ? function () {} : getter;
    Object.defineProperty(ctx, name, {
      get: function propertyGetter() {
        // Setting the `ssfi` flag to `propertyGetter` causes this function to
        // be the starting point for removing implementation frames from the
        // stack trace of a failed assertion.
        //
        // However, we only want to use this function as the starting point if
        // the `lockSsfi` flag isn't set and proxy protection is disabled.
        //
        // If the `lockSsfi` flag is set, then either this assertion has been
        // overwritten by another assertion, or this assertion is being invoked
        // from inside of another assertion. In the first case, the `ssfi` flag
        // has already been set by the overwriting assertion. In the second
        // case, the `ssfi` flag has already been set by the outer assertion.
        //
        // If proxy protection is enabled, then the `ssfi` flag has already been
        // set by the proxy getter.
        if (!isProxyEnabled() && !flag(this, 'lockSsfi')) {
          flag(this, 'ssfi', propertyGetter);
        }

        var result = getter.call(this);
        if (result !== undefined) return result;
        var newAssertion = new chai.Assertion();
        transferFlags(this, newAssertion);
        return newAssertion;
      },
      configurable: true
    });
  };

  var fnLengthDesc = Object.getOwnPropertyDescriptor(function () {}, 'length');
  /*!
   * Chai - addLengthGuard utility
   * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
   * MIT Licensed
   */

  /**
   * ### .addLengthGuard(fn, assertionName, isChainable)
   *
   * Define `length` as a getter on the given uninvoked method assertion. The
   * getter acts as a guard against chaining `length` directly off of an uninvoked
   * method assertion, which is a problem because it references `function`'s
   * built-in `length` property instead of Chai's `length` assertion. When the
   * getter catches the user making this mistake, it throws an error with a
   * helpful message.
   *
   * There are two ways in which this mistake can be made. The first way is by
   * chaining the `length` assertion directly off of an uninvoked chainable
   * method. In this case, Chai suggests that the user use `lengthOf` instead. The
   * second way is by chaining the `length` assertion directly off of an uninvoked
   * non-chainable method. Non-chainable methods must be invoked prior to
   * chaining. In this case, Chai suggests that the user consult the docs for the
   * given assertion.
   *
   * If the `length` property of functions is unconfigurable, then return `fn`
   * without modification.
   *
   * Note that in ES6, the function's `length` property is configurable, so once
   * support for legacy environments is dropped, Chai's `length` property can
   * replace the built-in function's `length` property, and this length guard will
   * no longer be necessary. In the mean time, maintaining consistency across all
   * environments is the priority.
   *
   * @param {Function} fn
   * @param {String} assertionName
   * @param {Boolean} isChainable
   * @namespace Utils
   * @name addLengthGuard
   */

  var addLengthGuard = function addLengthGuard(fn, assertionName, isChainable) {
    if (!fnLengthDesc.configurable) return fn;
    Object.defineProperty(fn, 'length', {
      get: function () {
        if (isChainable) {
          throw Error('Invalid Chai property: ' + assertionName + '.length. Due' + ' to a compatibility issue, "length" cannot directly follow "' + assertionName + '". Use "' + assertionName + '.lengthOf" instead.');
        }

        throw Error('Invalid Chai property: ' + assertionName + '.length. See' + ' docs for proper usage of "' + assertionName + '".');
      }
    });
    return fn;
  };

  /*!
   * Chai - proxify utility
   * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
   * MIT Licensed
   */

  /**
   * ### .proxify(object)
   *
   * Return a proxy of given object that throws an error when a non-existent
   * property is read. By default, the root cause is assumed to be a misspelled
   * property, and thus an attempt is made to offer a reasonable suggestion from
   * the list of existing properties. However, if a nonChainableMethodName is
   * provided, then the root cause is instead a failure to invoke a non-chainable
   * method prior to reading the non-existent property.
   * 
   * If proxies are unsupported or disabled via the user's Chai config, then
   * return object without modification.
   *
   * @param {Object} obj
   * @param {String} nonChainableMethodName
   * @namespace Utils
   * @name proxify
   */

  var builtins = ['__flags', '__methods', '_obj', 'assert'];

  var proxify = function proxify(obj, nonChainableMethodName) {
    if (!isProxyEnabled()) return obj;
    return new Proxy(obj, {
      get: function proxyGetter(target, property) {
        // This check is here because we should not throw errors on Symbol properties
        // such as `Symbol.toStringTag`.
        // The values for which an error should be thrown can be configured using
        // the `config.proxyExcludedKeys` setting.
        if (typeof property === 'string' && config.proxyExcludedKeys.indexOf(property) === -1 && !Reflect.has(target, property)) {
          // Special message for invalid property access of non-chainable methods.
          if (nonChainableMethodName) {
            throw Error('Invalid Chai property: ' + nonChainableMethodName + '.' + property + '. See docs for proper usage of "' + nonChainableMethodName + '".');
          }

          var orderedProperties = getProperties(target).filter(function (property) {
            return !Object.prototype.hasOwnProperty(property) && builtins.indexOf(property) === -1;
          }).sort(function (a, b) {
            return stringDistance(property, a) - stringDistance(property, b);
          });

          if (orderedProperties.length && stringDistance(orderedProperties[0], property) < 4) {
            // If the property is reasonably close to an existing Chai property,
            // suggest that property to the user.
            throw Error('Invalid Chai property: ' + property + '. Did you mean "' + orderedProperties[0] + '"?');
          } else {
            throw Error('Invalid Chai property: ' + property);
          }
        } // Use this proxy getter as the starting point for removing implementation
        // frames from the stack trace of a failed assertion. For property
        // assertions, this prevents the proxy getter from showing up in the stack
        // trace since it's invoked before the property getter. For method and
        // chainable method assertions, this flag will end up getting changed to
        // the method wrapper, which is good since this frame will no longer be in
        // the stack once the method is invoked. Note that Chai builtin assertion
        // properties such as `__flags` are skipped since this is only meant to
        // capture the starting point of an assertion. This step is also skipped
        // if the `lockSsfi` flag is set, thus indicating that this assertion is
        // being called from within another assertion. In that case, the `ssfi`
        // flag is already set to the outer assertion's starting point.


        if (builtins.indexOf(property) === -1 && !flag(target, 'lockSsfi')) {
          flag(target, 'ssfi', proxyGetter);
        }

        return Reflect.get(target, property);
      }
    });
  };
  /**
   * # stringDistance(strA, strB)
   * Return the Levenshtein distance between two strings.
   * @param {string} strA
   * @param {string} strB
   * @return {number} the string distance between strA and strB
   * @api private
   */


  function stringDistance(strA, strB, memo) {
    if (!memo) {
      // `memo` is a two-dimensional array containing a cache of distances
      // memo[i][j] is the distance between strA.slice(0, i) and
      // strB.slice(0, j).
      memo = [];

      for (var i = 0; i <= strA.length; i++) {
        memo[i] = [];
      }
    }

    if (!memo[strA.length] || !memo[strA.length][strB.length]) {
      if (strA.length === 0 || strB.length === 0) {
        memo[strA.length][strB.length] = Math.max(strA.length, strB.length);
      } else {
        memo[strA.length][strB.length] = Math.min(stringDistance(strA.slice(0, -1), strB, memo) + 1, stringDistance(strA, strB.slice(0, -1), memo) + 1, stringDistance(strA.slice(0, -1), strB.slice(0, -1), memo) + (strA.slice(-1) === strB.slice(-1) ? 0 : 1));
      }
    }

    return memo[strA.length][strB.length];
  }

  /*!
   * Chai - addMethod utility
   * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
   * MIT Licensed
   */

  /**
   * ### .addMethod(ctx, name, method)
   *
   * Adds a method to the prototype of an object.
   *
   *     utils.addMethod(chai.Assertion.prototype, 'foo', function (str) {
   *       var obj = utils.flag(this, 'object');
   *       new chai.Assertion(obj).to.be.equal(str);
   *     });
   *
   * Can also be accessed directly from `chai.Assertion`.
   *
   *     chai.Assertion.addMethod('foo', fn);
   *
   * Then can be used as any other assertion.
   *
   *     expect(fooStr).to.be.foo('bar');
   *
   * @param {Object} ctx object to which the method is added
   * @param {String} name of method to add
   * @param {Function} method function to be used for name
   * @namespace Utils
   * @name addMethod
   * @api public
   */

  var addMethod = function addMethod(ctx, name, method) {
    var methodWrapper = function () {
      // Setting the `ssfi` flag to `methodWrapper` causes this function to be the
      // starting point for removing implementation frames from the stack trace of
      // a failed assertion.
      //
      // However, we only want to use this function as the starting point if the
      // `lockSsfi` flag isn't set.
      //
      // If the `lockSsfi` flag is set, then either this assertion has been
      // overwritten by another assertion, or this assertion is being invoked from
      // inside of another assertion. In the first case, the `ssfi` flag has
      // already been set by the overwriting assertion. In the second case, the
      // `ssfi` flag has already been set by the outer assertion.
      if (!flag(this, 'lockSsfi')) {
        flag(this, 'ssfi', methodWrapper);
      }

      var result = method.apply(this, arguments);
      if (result !== undefined) return result;
      var newAssertion = new chai.Assertion();
      transferFlags(this, newAssertion);
      return newAssertion;
    };

    addLengthGuard(methodWrapper, name, false);
    ctx[name] = proxify(methodWrapper, name);
  };

  /*!
   * Chai - overwriteProperty utility
   * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
   * MIT Licensed
   */

  /**
   * ### .overwriteProperty(ctx, name, fn)
   *
   * Overwites an already existing property getter and provides
   * access to previous value. Must return function to use as getter.
   *
   *     utils.overwriteProperty(chai.Assertion.prototype, 'ok', function (_super) {
   *       return function () {
   *         var obj = utils.flag(this, 'object');
   *         if (obj instanceof Foo) {
   *           new chai.Assertion(obj.name).to.equal('bar');
   *         } else {
   *           _super.call(this);
   *         }
   *       }
   *     });
   *
   *
   * Can also be accessed directly from `chai.Assertion`.
   *
   *     chai.Assertion.overwriteProperty('foo', fn);
   *
   * Then can be used as any other assertion.
   *
   *     expect(myFoo).to.be.ok;
   *
   * @param {Object} ctx object whose property is to be overwritten
   * @param {String} name of property to overwrite
   * @param {Function} getter function that returns a getter function to be used for name
   * @namespace Utils
   * @name overwriteProperty
   * @api public
   */

  var overwriteProperty = function overwriteProperty(ctx, name, getter) {
    var _get = Object.getOwnPropertyDescriptor(ctx, name),
        _super = function () {};

    if (_get && 'function' === typeof _get.get) _super = _get.get;
    Object.defineProperty(ctx, name, {
      get: function overwritingPropertyGetter() {
        // Setting the `ssfi` flag to `overwritingPropertyGetter` causes this
        // function to be the starting point for removing implementation frames
        // from the stack trace of a failed assertion.
        //
        // However, we only want to use this function as the starting point if
        // the `lockSsfi` flag isn't set and proxy protection is disabled.
        //
        // If the `lockSsfi` flag is set, then either this assertion has been
        // overwritten by another assertion, or this assertion is being invoked
        // from inside of another assertion. In the first case, the `ssfi` flag
        // has already been set by the overwriting assertion. In the second
        // case, the `ssfi` flag has already been set by the outer assertion.
        //
        // If proxy protection is enabled, then the `ssfi` flag has already been
        // set by the proxy getter.
        if (!isProxyEnabled() && !flag(this, 'lockSsfi')) {
          flag(this, 'ssfi', overwritingPropertyGetter);
        } // Setting the `lockSsfi` flag to `true` prevents the overwritten
        // assertion from changing the `ssfi` flag. By this point, the `ssfi`
        // flag is already set to the correct starting point for this assertion.


        var origLockSsfi = flag(this, 'lockSsfi');
        flag(this, 'lockSsfi', true);
        var result = getter(_super).call(this);
        flag(this, 'lockSsfi', origLockSsfi);

        if (result !== undefined) {
          return result;
        }

        var newAssertion = new chai.Assertion();
        transferFlags(this, newAssertion);
        return newAssertion;
      },
      configurable: true
    });
  };

  /*!
   * Chai - overwriteMethod utility
   * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
   * MIT Licensed
   */

  /**
   * ### .overwriteMethod(ctx, name, fn)
   *
   * Overwites an already existing method and provides
   * access to previous function. Must return function
   * to be used for name.
   *
   *     utils.overwriteMethod(chai.Assertion.prototype, 'equal', function (_super) {
   *       return function (str) {
   *         var obj = utils.flag(this, 'object');
   *         if (obj instanceof Foo) {
   *           new chai.Assertion(obj.value).to.equal(str);
   *         } else {
   *           _super.apply(this, arguments);
   *         }
   *       }
   *     });
   *
   * Can also be accessed directly from `chai.Assertion`.
   *
   *     chai.Assertion.overwriteMethod('foo', fn);
   *
   * Then can be used as any other assertion.
   *
   *     expect(myFoo).to.equal('bar');
   *
   * @param {Object} ctx object whose method is to be overwritten
   * @param {String} name of method to overwrite
   * @param {Function} method function that returns a function to be used for name
   * @namespace Utils
   * @name overwriteMethod
   * @api public
   */

  var overwriteMethod = function overwriteMethod(ctx, name, method) {
    var _method = ctx[name],
        _super = function () {
      throw new Error(name + ' is not a function');
    };

    if (_method && 'function' === typeof _method) _super = _method;

    var overwritingMethodWrapper = function () {
      // Setting the `ssfi` flag to `overwritingMethodWrapper` causes this
      // function to be the starting point for removing implementation frames from
      // the stack trace of a failed assertion.
      //
      // However, we only want to use this function as the starting point if the
      // `lockSsfi` flag isn't set.
      //
      // If the `lockSsfi` flag is set, then either this assertion has been
      // overwritten by another assertion, or this assertion is being invoked from
      // inside of another assertion. In the first case, the `ssfi` flag has
      // already been set by the overwriting assertion. In the second case, the
      // `ssfi` flag has already been set by the outer assertion.
      if (!flag(this, 'lockSsfi')) {
        flag(this, 'ssfi', overwritingMethodWrapper);
      } // Setting the `lockSsfi` flag to `true` prevents the overwritten assertion
      // from changing the `ssfi` flag. By this point, the `ssfi` flag is already
      // set to the correct starting point for this assertion.


      var origLockSsfi = flag(this, 'lockSsfi');
      flag(this, 'lockSsfi', true);
      var result = method(_super).apply(this, arguments);
      flag(this, 'lockSsfi', origLockSsfi);

      if (result !== undefined) {
        return result;
      }

      var newAssertion = new chai.Assertion();
      transferFlags(this, newAssertion);
      return newAssertion;
    };

    addLengthGuard(overwritingMethodWrapper, name, false);
    ctx[name] = proxify(overwritingMethodWrapper, name);
  };

  /*!
   * Chai - addChainingMethod utility
   * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
   * MIT Licensed
   */

  /*!
   * Module dependencies
   */

  /*!
   * Module variables
   */
  // Check whether `Object.setPrototypeOf` is supported

  var canSetPrototype = typeof Object.setPrototypeOf === 'function'; // Without `Object.setPrototypeOf` support, this module will need to add properties to a function.
  // However, some of functions' own props are not configurable and should be skipped.

  var testFn = function () {};

  var excludeNames = Object.getOwnPropertyNames(testFn).filter(function (name) {
    var propDesc = Object.getOwnPropertyDescriptor(testFn, name); // Note: PhantomJS 1.x includes `callee` as one of `testFn`'s own properties,
    // but then returns `undefined` as the property descriptor for `callee`. As a
    // workaround, we perform an otherwise unnecessary type-check for `propDesc`,
    // and then filter it out if it's not an object as it should be.

    if (typeof propDesc !== 'object') return true;
    return !propDesc.configurable;
  }); // Cache `Function` properties

  var call = Function.prototype.call,
      apply = Function.prototype.apply;
  /**
   * ### .addChainableMethod(ctx, name, method, chainingBehavior)
   *
   * Adds a method to an object, such that the method can also be chained.
   *
   *     utils.addChainableMethod(chai.Assertion.prototype, 'foo', function (str) {
   *       var obj = utils.flag(this, 'object');
   *       new chai.Assertion(obj).to.be.equal(str);
   *     });
   *
   * Can also be accessed directly from `chai.Assertion`.
   *
   *     chai.Assertion.addChainableMethod('foo', fn, chainingBehavior);
   *
   * The result can then be used as both a method assertion, executing both `method` and
   * `chainingBehavior`, or as a language chain, which only executes `chainingBehavior`.
   *
   *     expect(fooStr).to.be.foo('bar');
   *     expect(fooStr).to.be.foo.equal('foo');
   *
   * @param {Object} ctx object to which the method is added
   * @param {String} name of method to add
   * @param {Function} method function to be used for `name`, when called
   * @param {Function} chainingBehavior function to be called every time the property is accessed
   * @namespace Utils
   * @name addChainableMethod
   * @api public
   */

  var addChainableMethod = function addChainableMethod(ctx, name, method, chainingBehavior) {
    if (typeof chainingBehavior !== 'function') {
      chainingBehavior = function () {};
    }

    var chainableBehavior = {
      method: method,
      chainingBehavior: chainingBehavior
    }; // save the methods so we can overwrite them later, if we need to.

    if (!ctx.__methods) {
      ctx.__methods = {};
    }

    ctx.__methods[name] = chainableBehavior;
    Object.defineProperty(ctx, name, {
      get: function chainableMethodGetter() {
        chainableBehavior.chainingBehavior.call(this);

        var chainableMethodWrapper = function () {
          // Setting the `ssfi` flag to `chainableMethodWrapper` causes this
          // function to be the starting point for removing implementation
          // frames from the stack trace of a failed assertion.
          //
          // However, we only want to use this function as the starting point if
          // the `lockSsfi` flag isn't set.
          //
          // If the `lockSsfi` flag is set, then this assertion is being
          // invoked from inside of another assertion. In this case, the `ssfi`
          // flag has already been set by the outer assertion.
          //
          // Note that overwriting a chainable method merely replaces the saved
          // methods in `ctx.__methods` instead of completely replacing the
          // overwritten assertion. Therefore, an overwriting assertion won't
          // set the `ssfi` or `lockSsfi` flags.
          if (!flag(this, 'lockSsfi')) {
            flag(this, 'ssfi', chainableMethodWrapper);
          }

          var result = chainableBehavior.method.apply(this, arguments);

          if (result !== undefined) {
            return result;
          }

          var newAssertion = new chai.Assertion();
          transferFlags(this, newAssertion);
          return newAssertion;
        };

        addLengthGuard(chainableMethodWrapper, name, true); // Use `Object.setPrototypeOf` if available

        if (canSetPrototype) {
          // Inherit all properties from the object by replacing the `Function` prototype
          var prototype = Object.create(this); // Restore the `call` and `apply` methods from `Function`

          prototype.call = call;
          prototype.apply = apply;
          Object.setPrototypeOf(chainableMethodWrapper, prototype);
        } // Otherwise, redefine all properties (slow!)
        else {
            var asserterNames = Object.getOwnPropertyNames(ctx);
            asserterNames.forEach(function (asserterName) {
              if (excludeNames.indexOf(asserterName) !== -1) {
                return;
              }

              var pd = Object.getOwnPropertyDescriptor(ctx, asserterName);
              Object.defineProperty(chainableMethodWrapper, asserterName, pd);
            });
          }

        transferFlags(this, chainableMethodWrapper);
        return proxify(chainableMethodWrapper);
      },
      configurable: true
    });
  };

  /*!
   * Chai - overwriteChainableMethod utility
   * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
   * MIT Licensed
   */

  /**
   * ### .overwriteChainableMethod(ctx, name, method, chainingBehavior)
   *
   * Overwites an already existing chainable method
   * and provides access to the previous function or
   * property.  Must return functions to be used for
   * name.
   *
   *     utils.overwriteChainableMethod(chai.Assertion.prototype, 'lengthOf',
   *       function (_super) {
   *       }
   *     , function (_super) {
   *       }
   *     );
   *
   * Can also be accessed directly from `chai.Assertion`.
   *
   *     chai.Assertion.overwriteChainableMethod('foo', fn, fn);
   *
   * Then can be used as any other assertion.
   *
   *     expect(myFoo).to.have.lengthOf(3);
   *     expect(myFoo).to.have.lengthOf.above(3);
   *
   * @param {Object} ctx object whose method / property is to be overwritten
   * @param {String} name of method / property to overwrite
   * @param {Function} method function that returns a function to be used for name
   * @param {Function} chainingBehavior function that returns a function to be used for property
   * @namespace Utils
   * @name overwriteChainableMethod
   * @api public
   */

  var overwriteChainableMethod = function overwriteChainableMethod(ctx, name, method, chainingBehavior) {
    var chainableBehavior = ctx.__methods[name];
    var _chainingBehavior = chainableBehavior.chainingBehavior;

    chainableBehavior.chainingBehavior = function overwritingChainableMethodGetter() {
      var result = chainingBehavior(_chainingBehavior).call(this);

      if (result !== undefined) {
        return result;
      }

      var newAssertion = new chai.Assertion();
      transferFlags(this, newAssertion);
      return newAssertion;
    };

    var _method = chainableBehavior.method;

    chainableBehavior.method = function overwritingChainableMethodWrapper() {
      var result = method(_method).apply(this, arguments);

      if (result !== undefined) {
        return result;
      }

      var newAssertion = new chai.Assertion();
      transferFlags(this, newAssertion);
      return newAssertion;
    };
  };

  /*!
   * Chai - compareByInspect utility
   * Copyright(c) 2011-2016 Jake Luer <jake@alogicalparadox.com>
   * MIT Licensed
   */

  /*!
   * Module dependancies
   */

  /**
   * ### .compareByInspect(mixed, mixed)
   *
   * To be used as a compareFunction with Array.prototype.sort. Compares elements
   * using inspect instead of default behavior of using toString so that Symbols
   * and objects with irregular/missing toString can still be sorted without a
   * TypeError.
   *
   * @param {Mixed} first element to compare
   * @param {Mixed} second element to compare
   * @returns {Number} -1 if 'a' should come before 'b'; otherwise 1 
   * @name compareByInspect
   * @namespace Utils
   * @api public
   */

  var compareByInspect = function compareByInspect(a, b) {
    return inspect_1(a) < inspect_1(b) ? -1 : 1;
  };

  /*!
   * Chai - getOwnEnumerablePropertySymbols utility
   * Copyright(c) 2011-2016 Jake Luer <jake@alogicalparadox.com>
   * MIT Licensed
   */

  /**
   * ### .getOwnEnumerablePropertySymbols(object)
   *
   * This allows the retrieval of directly-owned enumerable property symbols of an
   * object. This function is necessary because Object.getOwnPropertySymbols
   * returns both enumerable and non-enumerable property symbols.
   *
   * @param {Object} object
   * @returns {Array}
   * @namespace Utils
   * @name getOwnEnumerablePropertySymbols
   * @api public
   */
  var getOwnEnumerablePropertySymbols = function getOwnEnumerablePropertySymbols(obj) {
    if (typeof Object.getOwnPropertySymbols !== 'function') return [];
    return Object.getOwnPropertySymbols(obj).filter(function (sym) {
      return Object.getOwnPropertyDescriptor(obj, sym).enumerable;
    });
  };

  /*!
   * Chai - getOwnEnumerableProperties utility
   * Copyright(c) 2011-2016 Jake Luer <jake@alogicalparadox.com>
   * MIT Licensed
   */

  /*!
   * Module dependancies
   */

  /**
   * ### .getOwnEnumerableProperties(object)
   *
   * This allows the retrieval of directly-owned enumerable property names and
   * symbols of an object. This function is necessary because Object.keys only
   * returns enumerable property names, not enumerable property symbols.
   *
   * @param {Object} object
   * @returns {Array}
   * @namespace Utils
   * @name getOwnEnumerableProperties
   * @api public
   */

  var getOwnEnumerableProperties = function getOwnEnumerableProperties(obj) {
    return Object.keys(obj).concat(getOwnEnumerablePropertySymbols(obj));
  };

  /* !
   * Chai - checkError utility
   * Copyright(c) 2012-2016 Jake Luer <jake@alogicalparadox.com>
   * MIT Licensed
   */

  /**
   * ### .checkError
   *
   * Checks that an error conforms to a given set of criteria and/or retrieves information about it.
   *
   * @api public
   */

  /**
   * ### .compatibleInstance(thrown, errorLike)
   *
   * Checks if two instances are compatible (strict equal).
   * Returns false if errorLike is not an instance of Error, because instances
   * can only be compatible if they're both error instances.
   *
   * @name compatibleInstance
   * @param {Error} thrown error
   * @param {Error|ErrorConstructor} errorLike object to compare against
   * @namespace Utils
   * @api public
   */

  function compatibleInstance(thrown, errorLike) {
    return errorLike instanceof Error && thrown === errorLike;
  }
  /**
   * ### .compatibleConstructor(thrown, errorLike)
   *
   * Checks if two constructors are compatible.
   * This function can receive either an error constructor or
   * an error instance as the `errorLike` argument.
   * Constructors are compatible if they're the same or if one is
   * an instance of another.
   *
   * @name compatibleConstructor
   * @param {Error} thrown error
   * @param {Error|ErrorConstructor} errorLike object to compare against
   * @namespace Utils
   * @api public
   */


  function compatibleConstructor(thrown, errorLike) {
    if (errorLike instanceof Error) {
      // If `errorLike` is an instance of any error we compare their constructors
      return thrown.constructor === errorLike.constructor || thrown instanceof errorLike.constructor;
    } else if (errorLike.prototype instanceof Error || errorLike === Error) {
      // If `errorLike` is a constructor that inherits from Error, we compare `thrown` to `errorLike` directly
      return thrown.constructor === errorLike || thrown instanceof errorLike;
    }

    return false;
  }
  /**
   * ### .compatibleMessage(thrown, errMatcher)
   *
   * Checks if an error's message is compatible with a matcher (String or RegExp).
   * If the message contains the String or passes the RegExp test,
   * it is considered compatible.
   *
   * @name compatibleMessage
   * @param {Error} thrown error
   * @param {String|RegExp} errMatcher to look for into the message
   * @namespace Utils
   * @api public
   */


  function compatibleMessage(thrown, errMatcher) {
    var comparisonString = typeof thrown === 'string' ? thrown : thrown.message;

    if (errMatcher instanceof RegExp) {
      return errMatcher.test(comparisonString);
    } else if (typeof errMatcher === 'string') {
      return comparisonString.indexOf(errMatcher) !== -1; // eslint-disable-line no-magic-numbers
    }

    return false;
  }
  /**
   * ### .getFunctionName(constructorFn)
   *
   * Returns the name of a function.
   * This also includes a polyfill function if `constructorFn.name` is not defined.
   *
   * @name getFunctionName
   * @param {Function} constructorFn
   * @namespace Utils
   * @api private
   */


  var functionNameMatch$1 = /\s*function(?:\s|\s*\/\*[^(?:*\/)]+\*\/\s*)*([^\(\/]+)/;

  function getFunctionName(constructorFn) {
    var name = '';

    if (typeof constructorFn.name === 'undefined') {
      // Here we run a polyfill if constructorFn.name is not defined
      var match = String(constructorFn).match(functionNameMatch$1);

      if (match) {
        name = match[1];
      }
    } else {
      name = constructorFn.name;
    }

    return name;
  }
  /**
   * ### .getConstructorName(errorLike)
   *
   * Gets the constructor name for an Error instance or constructor itself.
   *
   * @name getConstructorName
   * @param {Error|ErrorConstructor} errorLike
   * @namespace Utils
   * @api public
   */


  function getConstructorName(errorLike) {
    var constructorName = errorLike;

    if (errorLike instanceof Error) {
      constructorName = getFunctionName(errorLike.constructor);
    } else if (typeof errorLike === 'function') {
      // If `err` is not an instance of Error it is an error constructor itself or another function.
      // If we've got a common function we get its name, otherwise we may need to create a new instance
      // of the error just in case it's a poorly-constructed error. Please see chaijs/chai/issues/45 to know more.
      constructorName = getFunctionName(errorLike).trim() || getFunctionName(new errorLike()); // eslint-disable-line new-cap
    }

    return constructorName;
  }
  /**
   * ### .getMessage(errorLike)
   *
   * Gets the error message from an error.
   * If `err` is a String itself, we return it.
   * If the error has no message, we return an empty string.
   *
   * @name getMessage
   * @param {Error|String} errorLike
   * @namespace Utils
   * @api public
   */


  function getMessage$1(errorLike) {
    var msg = '';

    if (errorLike && errorLike.message) {
      msg = errorLike.message;
    } else if (typeof errorLike === 'string') {
      msg = errorLike;
    }

    return msg;
  }

  var checkError = {
    compatibleInstance: compatibleInstance,
    compatibleConstructor: compatibleConstructor,
    compatibleMessage: compatibleMessage,
    getMessage: getMessage$1,
    getConstructorName: getConstructorName
  };

  /*!
   * Chai - isNaN utility
   * Copyright(c) 2012-2015 Sakthipriyan Vairamani <thechargingvolcano@gmail.com>
   * MIT Licensed
   */

  /**
   * ### .isNaN(value)
   *
   * Checks if the given value is NaN or not.
   *
   *     utils.isNaN(NaN); // true
   *
   * @param {Value} The value which has to be checked if it is NaN
   * @name isNaN
   * @api private
   */
  function isNaN(value) {
    // Refer http://www.ecma-international.org/ecma-262/6.0/#sec-isnan-number
    // section's NOTE.
    return value !== value;
  } // If ECMAScript 6's Number.isNaN is present, prefer that.


  var _isNaN = Number.isNaN || isNaN;

  /*!
   * chai
   * Copyright(c) 2011 Jake Luer <jake@alogicalparadox.com>
   * MIT Licensed
   */

  /*!
   * Dependencies that are used for multiple exports are required here only once
   */

  /*!
   * test utility
   */

  var test$1 = test;
  /*!
   * type utility
   */

  var type = typeDetect;
  /*!
   * expectTypes utility
   */

  var expectTypes$1 = expectTypes;
  /*!
   * message utility
   */

  var getMessage$2 = getMessage;
  /*!
   * actual utility
   */

  var getActual$1 = getActual;
  /*!
   * Inspect util
   */

  var inspect = inspect_1;
  /*!
   * Object Display util
   */

  var objDisplay$1 = objDisplay;
  /*!
   * Flag utility
   */

  var flag$1 = flag;
  /*!
   * Flag transferring utility
   */

  var transferFlags$1 = transferFlags;
  /*!
   * Deep equal utility
   */

  var eql = deepEql;
  /*!
   * Deep path info
   */

  var getPathInfo$1 = pathval.getPathInfo;
  /*!
   * Check if a property exists
   */

  var hasProperty$1 = pathval.hasProperty;
  /*!
   * Function name
   */

  var getName = getFuncName_1;
  /*!
   * add Property
   */

  var addProperty$1 = addProperty;
  /*!
   * add Method
   */

  var addMethod$1 = addMethod;
  /*!
   * overwrite Property
   */

  var overwriteProperty$1 = overwriteProperty;
  /*!
   * overwrite Method
   */

  var overwriteMethod$1 = overwriteMethod;
  /*!
   * Add a chainable method
   */

  var addChainableMethod$1 = addChainableMethod;
  /*!
   * Overwrite chainable method
   */

  var overwriteChainableMethod$1 = overwriteChainableMethod;
  /*!
   * Compare by inspect method
   */

  var compareByInspect$1 = compareByInspect;
  /*!
   * Get own enumerable property symbols method
   */

  var getOwnEnumerablePropertySymbols$1 = getOwnEnumerablePropertySymbols;
  /*!
   * Get own enumerable properties method
   */

  var getOwnEnumerableProperties$1 = getOwnEnumerableProperties;
  /*!
   * Checks error against a given set of criteria
   */

  var checkError$1 = checkError;
  /*!
   * Proxify util
   */

  var proxify$1 = proxify;
  /*!
   * addLengthGuard util
   */

  var addLengthGuard$1 = addLengthGuard;
  /*!
   * isProxyEnabled helper
   */

  var isProxyEnabled$1 = isProxyEnabled;
  /*!
   * isNaN method
   */

  var isNaN$1 = _isNaN;
  var utils = {
    test: test$1,
    type: type,
    expectTypes: expectTypes$1,
    getMessage: getMessage$2,
    getActual: getActual$1,
    inspect: inspect,
    objDisplay: objDisplay$1,
    flag: flag$1,
    transferFlags: transferFlags$1,
    eql: eql,
    getPathInfo: getPathInfo$1,
    hasProperty: hasProperty$1,
    getName: getName,
    addProperty: addProperty$1,
    addMethod: addMethod$1,
    overwriteProperty: overwriteProperty$1,
    overwriteMethod: overwriteMethod$1,
    addChainableMethod: addChainableMethod$1,
    overwriteChainableMethod: overwriteChainableMethod$1,
    compareByInspect: compareByInspect$1,
    getOwnEnumerablePropertySymbols: getOwnEnumerablePropertySymbols$1,
    getOwnEnumerableProperties: getOwnEnumerableProperties$1,
    checkError: checkError$1,
    proxify: proxify$1,
    addLengthGuard: addLengthGuard$1,
    isProxyEnabled: isProxyEnabled$1,
    isNaN: isNaN$1
  };

  /*!
   * chai
   * http://chaijs.com
   * Copyright(c) 2011-2014 Jake Luer <jake@alogicalparadox.com>
   * MIT Licensed
   */

  var assertion = function (_chai, util) {
    /*!
     * Module dependencies.
     */
    var AssertionError = _chai.AssertionError,
        flag = util.flag;
    /*!
     * Module export.
     */

    _chai.Assertion = Assertion;
    /*!
     * Assertion Constructor
     *
     * Creates object for chaining.
     *
     * `Assertion` objects contain metadata in the form of flags. Three flags can
     * be assigned during instantiation by passing arguments to this constructor:
     *
     * - `object`: This flag contains the target of the assertion. For example, in
     *   the assertion `expect(numKittens).to.equal(7);`, the `object` flag will
     *   contain `numKittens` so that the `equal` assertion can reference it when
     *   needed.
     *
     * - `message`: This flag contains an optional custom error message to be
     *   prepended to the error message that's generated by the assertion when it
     *   fails.
     *
     * - `ssfi`: This flag stands for "start stack function indicator". It
     *   contains a function reference that serves as the starting point for
     *   removing frames from the stack trace of the error that's created by the
     *   assertion when it fails. The goal is to provide a cleaner stack trace to
     *   end users by removing Chai's internal functions. Note that it only works
     *   in environments that support `Error.captureStackTrace`, and only when
     *   `Chai.config.includeStack` hasn't been set to `false`.
     *
     * - `lockSsfi`: This flag controls whether or not the given `ssfi` flag
     *   should retain its current value, even as assertions are chained off of
     *   this object. This is usually set to `true` when creating a new assertion
     *   from within another assertion. It's also temporarily set to `true` before
     *   an overwritten assertion gets called by the overwriting assertion.
     *
     * @param {Mixed} obj target of the assertion
     * @param {String} msg (optional) custom error message
     * @param {Function} ssfi (optional) starting point for removing stack frames
     * @param {Boolean} lockSsfi (optional) whether or not the ssfi flag is locked
     * @api private
     */

    function Assertion(obj, msg, ssfi, lockSsfi) {
      flag(this, 'ssfi', ssfi || Assertion);
      flag(this, 'lockSsfi', lockSsfi);
      flag(this, 'object', obj);
      flag(this, 'message', msg);
      return util.proxify(this);
    }

    Object.defineProperty(Assertion, 'includeStack', {
      get: function () {
        console.warn('Assertion.includeStack is deprecated, use chai.config.includeStack instead.');
        return config.includeStack;
      },
      set: function (value) {
        console.warn('Assertion.includeStack is deprecated, use chai.config.includeStack instead.');
        config.includeStack = value;
      }
    });
    Object.defineProperty(Assertion, 'showDiff', {
      get: function () {
        console.warn('Assertion.showDiff is deprecated, use chai.config.showDiff instead.');
        return config.showDiff;
      },
      set: function (value) {
        console.warn('Assertion.showDiff is deprecated, use chai.config.showDiff instead.');
        config.showDiff = value;
      }
    });

    Assertion.addProperty = function (name, fn) {
      util.addProperty(this.prototype, name, fn);
    };

    Assertion.addMethod = function (name, fn) {
      util.addMethod(this.prototype, name, fn);
    };

    Assertion.addChainableMethod = function (name, fn, chainingBehavior) {
      util.addChainableMethod(this.prototype, name, fn, chainingBehavior);
    };

    Assertion.overwriteProperty = function (name, fn) {
      util.overwriteProperty(this.prototype, name, fn);
    };

    Assertion.overwriteMethod = function (name, fn) {
      util.overwriteMethod(this.prototype, name, fn);
    };

    Assertion.overwriteChainableMethod = function (name, fn, chainingBehavior) {
      util.overwriteChainableMethod(this.prototype, name, fn, chainingBehavior);
    };
    /**
     * ### .assert(expression, message, negateMessage, expected, actual, showDiff)
     *
     * Executes an expression and check expectations. Throws AssertionError for reporting if test doesn't pass.
     *
     * @name assert
     * @param {Philosophical} expression to be tested
     * @param {String|Function} message or function that returns message to display if expression fails
     * @param {String|Function} negatedMessage or function that returns negatedMessage to display if negated expression fails
     * @param {Mixed} expected value (remember to check for negation)
     * @param {Mixed} actual (optional) will default to `this.obj`
     * @param {Boolean} showDiff (optional) when set to `true`, assert will display a diff in addition to the message if expression fails
     * @api private
     */


    Assertion.prototype.assert = function (expr, msg, negateMsg, expected, _actual, showDiff) {
      var ok = util.test(this, arguments);
      if (false !== showDiff) showDiff = true;
      if (undefined === expected && undefined === _actual) showDiff = false;
      if (true !== config.showDiff) showDiff = false;

      if (!ok) {
        msg = util.getMessage(this, arguments);
        var actual = util.getActual(this, arguments);
        throw new AssertionError(msg, {
          actual: actual,
          expected: expected,
          showDiff: showDiff
        }, config.includeStack ? this.assert : flag(this, 'ssfi'));
      }
    };
    /*!
     * ### ._obj
     *
     * Quick reference to stored `actual` value for plugin developers.
     *
     * @api private
     */


    Object.defineProperty(Assertion.prototype, '_obj', {
      get: function () {
        return flag(this, 'object');
      },
      set: function (val) {
        flag(this, 'object', val);
      }
    });
  };

  /*!
   * chai
   * http://chaijs.com
   * Copyright(c) 2011-2014 Jake Luer <jake@alogicalparadox.com>
   * MIT Licensed
   */
  var assertions = function (chai, _) {
    var Assertion = chai.Assertion,
        AssertionError = chai.AssertionError,
        flag = _.flag;
    /**
     * ### Language Chains
     *
     * The following are provided as chainable getters to improve the readability
     * of your assertions.
     *
     * **Chains**
     *
     * - to
     * - be
     * - been
     * - is
     * - that
     * - which
     * - and
     * - has
     * - have
     * - with
     * - at
     * - of
     * - same
     * - but
     * - does
     *
     * @name language chains
     * @namespace BDD
     * @api public
     */

    ['to', 'be', 'been', 'is', 'and', 'has', 'have', 'with', 'that', 'which', 'at', 'of', 'same', 'but', 'does'].forEach(function (chain) {
      Assertion.addProperty(chain);
    });
    /**
     * ### .not
     *
     * Negates all assertions that follow in the chain.
     *
     *     expect(function () {}).to.not.throw();
     *     expect({a: 1}).to.not.have.property('b');
     *     expect([1, 2]).to.be.an('array').that.does.not.include(3);
     *
     * Just because you can negate any assertion with `.not` doesn't mean you
     * should. With great power comes great responsibility. It's often best to
     * assert that the one expected output was produced, rather than asserting
     * that one of countless unexpected outputs wasn't produced. See individual
     * assertions for specific guidance.
     *
     *     expect(2).to.equal(2); // Recommended
     *     expect(2).to.not.equal(1); // Not recommended
     *
     * @name not
     * @namespace BDD
     * @api public
     */

    Assertion.addProperty('not', function () {
      flag(this, 'negate', true);
    });
    /**
     * ### .deep
     *
     * Causes all `.equal`, `.include`, `.members`, `.keys`, and `.property`
     * assertions that follow in the chain to use deep equality instead of strict
     * (`===`) equality. See the `deep-eql` project page for info on the deep
     * equality algorithm: https://github.com/chaijs/deep-eql.
     *
     *     // Target object deeply (but not strictly) equals `{a: 1}`
     *     expect({a: 1}).to.deep.equal({a: 1});
     *     expect({a: 1}).to.not.equal({a: 1});
     *
     *     // Target array deeply (but not strictly) includes `{a: 1}`
     *     expect([{a: 1}]).to.deep.include({a: 1});
     *     expect([{a: 1}]).to.not.include({a: 1});
     *
     *     // Target object deeply (but not strictly) includes `x: {a: 1}`
     *     expect({x: {a: 1}}).to.deep.include({x: {a: 1}});
     *     expect({x: {a: 1}}).to.not.include({x: {a: 1}});
     *
     *     // Target array deeply (but not strictly) has member `{a: 1}`
     *     expect([{a: 1}]).to.have.deep.members([{a: 1}]);
     *     expect([{a: 1}]).to.not.have.members([{a: 1}]);
     *
     *     // Target set deeply (but not strictly) has key `{a: 1}`
     *     expect(new Set([{a: 1}])).to.have.deep.keys([{a: 1}]);
     *     expect(new Set([{a: 1}])).to.not.have.keys([{a: 1}]);
     *
     *     // Target object deeply (but not strictly) has property `x: {a: 1}`
     *     expect({x: {a: 1}}).to.have.deep.property('x', {a: 1});
     *     expect({x: {a: 1}}).to.not.have.property('x', {a: 1});
     *
     * @name deep
     * @namespace BDD
     * @api public
     */

    Assertion.addProperty('deep', function () {
      flag(this, 'deep', true);
    });
    /**
     * ### .nested
     *
     * Enables dot- and bracket-notation in all `.property` and `.include`
     * assertions that follow in the chain.
     *
     *     expect({a: {b: ['x', 'y']}}).to.have.nested.property('a.b[1]');
     *     expect({a: {b: ['x', 'y']}}).to.nested.include({'a.b[1]': 'y'});
     *
     * If `.` or `[]` are part of an actual property name, they can be escaped by
     * adding two backslashes before them.
     *
     *     expect({'.a': {'[b]': 'x'}}).to.have.nested.property('\\.a.\\[b\\]');
     *     expect({'.a': {'[b]': 'x'}}).to.nested.include({'\\.a.\\[b\\]': 'x'});
     *
     * `.nested` cannot be combined with `.own`.
     *
     * @name nested
     * @namespace BDD
     * @api public
     */

    Assertion.addProperty('nested', function () {
      flag(this, 'nested', true);
    });
    /**
     * ### .own
     *
     * Causes all `.property` and `.include` assertions that follow in the chain
     * to ignore inherited properties.
     *
     *     Object.prototype.b = 2;
     *
     *     expect({a: 1}).to.have.own.property('a');
     *     expect({a: 1}).to.have.property('b').but.not.own.property('b'); 
     *
     *     expect({a: 1}).to.own.include({a: 1});
     *     expect({a: 1}).to.include({b: 2}).but.not.own.include({b: 2});
     *
     * `.own` cannot be combined with `.nested`.
     *
     * @name own
     * @namespace BDD
     * @api public
     */

    Assertion.addProperty('own', function () {
      flag(this, 'own', true);
    });
    /**
     * ### .ordered
     *
     * Causes all `.members` assertions that follow in the chain to require that
     * members be in the same order.
     *
     *     expect([1, 2]).to.have.ordered.members([1, 2])
     *       .but.not.have.ordered.members([2, 1]);
     *
     * When `.include` and `.ordered` are combined, the ordering begins at the
     * start of both arrays.
     *
     *     expect([1, 2, 3]).to.include.ordered.members([1, 2])
     *       .but.not.include.ordered.members([2, 3]);
     *
     * @name ordered
     * @namespace BDD
     * @api public
     */

    Assertion.addProperty('ordered', function () {
      flag(this, 'ordered', true);
    });
    /**
     * ### .any
     *
     * Causes all `.keys` assertions that follow in the chain to only require that
     * the target have at least one of the given keys. This is the opposite of
     * `.all`, which requires that the target have all of the given keys.
     *
     *     expect({a: 1, b: 2}).to.not.have.any.keys('c', 'd');
     *
     * See the `.keys` doc for guidance on when to use `.any` or `.all`.
     *
     * @name any
     * @namespace BDD
     * @api public
     */

    Assertion.addProperty('any', function () {
      flag(this, 'any', true);
      flag(this, 'all', false);
    });
    /**
     * ### .all
     *
     * Causes all `.keys` assertions that follow in the chain to require that the
     * target have all of the given keys. This is the opposite of `.any`, which
     * only requires that the target have at least one of the given keys.
     *
     *     expect({a: 1, b: 2}).to.have.all.keys('a', 'b');
     *
     * Note that `.all` is used by default when neither `.all` nor `.any` are
     * added earlier in the chain. However, it's often best to add `.all` anyway
     * because it improves readability.
     *
     * See the `.keys` doc for guidance on when to use `.any` or `.all`.
     *
     * @name all
     * @namespace BDD
     * @api public
     */

    Assertion.addProperty('all', function () {
      flag(this, 'all', true);
      flag(this, 'any', false);
    });
    /**
     * ### .a(type[, msg])
     *
     * Asserts that the target's type is equal to the given string `type`. Types
     * are case insensitive. See the `type-detect` project page for info on the
     * type detection algorithm: https://github.com/chaijs/type-detect.
     *
     *     expect('foo').to.be.a('string');
     *     expect({a: 1}).to.be.an('object');
     *     expect(null).to.be.a('null');
     *     expect(undefined).to.be.an('undefined');
     *     expect(new Error).to.be.an('error');
     *     expect(Promise.resolve()).to.be.a('promise');
     *     expect(new Float32Array).to.be.a('float32array');
     *     expect(Symbol()).to.be.a('symbol');
     *
     * `.a` supports objects that have a custom type set via `Symbol.toStringTag`.
     *
     *     var myObj = {
     *       [Symbol.toStringTag]: 'myCustomType'
     *     };
     *
     *     expect(myObj).to.be.a('myCustomType').but.not.an('object');
     *
     * It's often best to use `.a` to check a target's type before making more
     * assertions on the same target. That way, you avoid unexpected behavior from
     * any assertion that does different things based on the target's type.
     *
     *     expect([1, 2, 3]).to.be.an('array').that.includes(2);
     *     expect([]).to.be.an('array').that.is.empty;
     *
     * Add `.not` earlier in the chain to negate `.a`. However, it's often best to
     * assert that the target is the expected type, rather than asserting that it
     * isn't one of many unexpected types.
     *
     *     expect('foo').to.be.a('string'); // Recommended
     *     expect('foo').to.not.be.an('array'); // Not recommended
     *
     * `.a` accepts an optional `msg` argument which is a custom error message to
     * show when the assertion fails. The message can also be given as the second
     * argument to `expect`.
     *
     *     expect(1).to.be.a('string', 'nooo why fail??');
     *     expect(1, 'nooo why fail??').to.be.a('string');
     *
     * `.a` can also be used as a language chain to improve the readability of
     * your assertions. 
     *
     *     expect({b: 2}).to.have.a.property('b');
     *
     * The alias `.an` can be used interchangeably with `.a`.
     *
     * @name a
     * @alias an
     * @param {String} type
     * @param {String} msg _optional_
     * @namespace BDD
     * @api public
     */

    function an(type, msg) {
      if (msg) flag(this, 'message', msg);
      type = type.toLowerCase();
      var obj = flag(this, 'object'),
          article = ~['a', 'e', 'i', 'o', 'u'].indexOf(type.charAt(0)) ? 'an ' : 'a ';
      this.assert(type === _.type(obj).toLowerCase(), 'expected #{this} to be ' + article + type, 'expected #{this} not to be ' + article + type);
    }

    Assertion.addChainableMethod('an', an);
    Assertion.addChainableMethod('a', an);
    /**
     * ### .include(val[, msg])
     *
     * When the target is a string, `.include` asserts that the given string `val`
     * is a substring of the target.
     *
     *     expect('foobar').to.include('foo');
     *
     * When the target is an array, `.include` asserts that the given `val` is a
     * member of the target.
     *
     *     expect([1, 2, 3]).to.include(2);
     *
     * When the target is an object, `.include` asserts that the given object
     * `val`'s properties are a subset of the target's properties.
     *
     *     expect({a: 1, b: 2, c: 3}).to.include({a: 1, b: 2});
     *
     * When the target is a Set or WeakSet, `.include` asserts that the given `val` is a
     * member of the target. SameValueZero equality algorithm is used.
     *
     *     expect(new Set([1, 2])).to.include(2);
     *
     * When the target is a Map, `.include` asserts that the given `val` is one of
     * the values of the target. SameValueZero equality algorithm is used.
     *
     *     expect(new Map([['a', 1], ['b', 2]])).to.include(2);
     *
     * Because `.include` does different things based on the target's type, it's
     * important to check the target's type before using `.include`. See the `.a`
     * doc for info on testing a target's type.
     *
     *     expect([1, 2, 3]).to.be.an('array').that.includes(2);
     *
     * By default, strict (`===`) equality is used to compare array members and
     * object properties. Add `.deep` earlier in the chain to use deep equality
     * instead (WeakSet targets are not supported). See the `deep-eql` project
     * page for info on the deep equality algorithm: https://github.com/chaijs/deep-eql.
     *
     *     // Target array deeply (but not strictly) includes `{a: 1}`
     *     expect([{a: 1}]).to.deep.include({a: 1});
     *     expect([{a: 1}]).to.not.include({a: 1});
     *
     *     // Target object deeply (but not strictly) includes `x: {a: 1}`
     *     expect({x: {a: 1}}).to.deep.include({x: {a: 1}});
     *     expect({x: {a: 1}}).to.not.include({x: {a: 1}});
     *
     * By default, all of the target's properties are searched when working with
     * objects. This includes properties that are inherited and/or non-enumerable.
     * Add `.own` earlier in the chain to exclude the target's inherited
     * properties from the search.
     *
     *     Object.prototype.b = 2;
     *
     *     expect({a: 1}).to.own.include({a: 1});
     *     expect({a: 1}).to.include({b: 2}).but.not.own.include({b: 2});
     *
     * Note that a target object is always only searched for `val`'s own
     * enumerable properties.
     *
     * `.deep` and `.own` can be combined.
     *
     *     expect({a: {b: 2}}).to.deep.own.include({a: {b: 2}});
     *
     * Add `.nested` earlier in the chain to enable dot- and bracket-notation when
     * referencing nested properties.
     *
     *     expect({a: {b: ['x', 'y']}}).to.nested.include({'a.b[1]': 'y'});
     *
     * If `.` or `[]` are part of an actual property name, they can be escaped by
     * adding two backslashes before them.
     *
     *     expect({'.a': {'[b]': 2}}).to.nested.include({'\\.a.\\[b\\]': 2});
     *
     * `.deep` and `.nested` can be combined.
     *
     *     expect({a: {b: [{c: 3}]}}).to.deep.nested.include({'a.b[0]': {c: 3}});
     *
     * `.own` and `.nested` cannot be combined.
     *
     * Add `.not` earlier in the chain to negate `.include`.
     *
     *     expect('foobar').to.not.include('taco');
     *     expect([1, 2, 3]).to.not.include(4);
     * 
     * However, it's dangerous to negate `.include` when the target is an object.
     * The problem is that it creates uncertain expectations by asserting that the
     * target object doesn't have all of `val`'s key/value pairs but may or may
     * not have some of them. It's often best to identify the exact output that's
     * expected, and then write an assertion that only accepts that exact output.
     *
     * When the target object isn't even expected to have `val`'s keys, it's
     * often best to assert exactly that.
     *
     *     expect({c: 3}).to.not.have.any.keys('a', 'b'); // Recommended
     *     expect({c: 3}).to.not.include({a: 1, b: 2}); // Not recommended
     *
     * When the target object is expected to have `val`'s keys, it's often best to
     * assert that each of the properties has its expected value, rather than
     * asserting that each property doesn't have one of many unexpected values.
     *
     *     expect({a: 3, b: 4}).to.include({a: 3, b: 4}); // Recommended
     *     expect({a: 3, b: 4}).to.not.include({a: 1, b: 2}); // Not recommended
     *
     * `.include` accepts an optional `msg` argument which is a custom error
     * message to show when the assertion fails. The message can also be given as
     * the second argument to `expect`.
     *
     *     expect([1, 2, 3]).to.include(4, 'nooo why fail??');
     *     expect([1, 2, 3], 'nooo why fail??').to.include(4);
     *
     * `.include` can also be used as a language chain, causing all `.members` and
     * `.keys` assertions that follow in the chain to require the target to be a
     * superset of the expected set, rather than an identical set. Note that
     * `.members` ignores duplicates in the subset when `.include` is added.
     *
     *     // Target object's keys are a superset of ['a', 'b'] but not identical
     *     expect({a: 1, b: 2, c: 3}).to.include.all.keys('a', 'b');
     *     expect({a: 1, b: 2, c: 3}).to.not.have.all.keys('a', 'b');
     *
     *     // Target array is a superset of [1, 2] but not identical
     *     expect([1, 2, 3]).to.include.members([1, 2]);
     *     expect([1, 2, 3]).to.not.have.members([1, 2]);
     *
     *     // Duplicates in the subset are ignored
     *     expect([1, 2, 3]).to.include.members([1, 2, 2, 2]);
     *
     * Note that adding `.any` earlier in the chain causes the `.keys` assertion
     * to ignore `.include`.
     *
     *     // Both assertions are identical
     *     expect({a: 1}).to.include.any.keys('a', 'b');
     *     expect({a: 1}).to.have.any.keys('a', 'b');
     *
     * The aliases `.includes`, `.contain`, and `.contains` can be used
     * interchangeably with `.include`.
     *
     * @name include
     * @alias contain
     * @alias includes
     * @alias contains
     * @param {Mixed} val
     * @param {String} msg _optional_
     * @namespace BDD
     * @api public
     */

    function SameValueZero(a, b) {
      return _.isNaN(a) && _.isNaN(b) || a === b;
    }

    function includeChainingBehavior() {
      flag(this, 'contains', true);
    }

    function include(val, msg) {
      if (msg) flag(this, 'message', msg);

      var obj = flag(this, 'object'),
          objType = _.type(obj).toLowerCase(),
          flagMsg = flag(this, 'message'),
          negate = flag(this, 'negate'),
          ssfi = flag(this, 'ssfi'),
          isDeep = flag(this, 'deep'),
          descriptor = isDeep ? 'deep ' : '';

      flagMsg = flagMsg ? flagMsg + ': ' : '';
      var included = false;

      switch (objType) {
        case 'string':
          included = obj.indexOf(val) !== -1;
          break;

        case 'weakset':
          if (isDeep) {
            throw new AssertionError(flagMsg + 'unable to use .deep.include with WeakSet', undefined, ssfi);
          }

          included = obj.has(val);
          break;

        case 'map':
          var isEql = isDeep ? _.eql : SameValueZero;
          obj.forEach(function (item) {
            included = included || isEql(item, val);
          });
          break;

        case 'set':
          if (isDeep) {
            obj.forEach(function (item) {
              included = included || _.eql(item, val);
            });
          } else {
            included = obj.has(val);
          }

          break;

        case 'array':
          if (isDeep) {
            included = obj.some(function (item) {
              return _.eql(item, val);
            });
          } else {
            included = obj.indexOf(val) !== -1;
          }

          break;

        default:
          // This block is for asserting a subset of properties in an object.
          // `_.expectTypes` isn't used here because `.include` should work with
          // objects with a custom `@@toStringTag`.
          if (val !== Object(val)) {
            throw new AssertionError(flagMsg + 'object tested must be an array, a map, an object,' + ' a set, a string, or a weakset, but ' + objType + ' given', undefined, ssfi);
          }

          var props = Object.keys(val),
              firstErr = null,
              numErrs = 0;
          props.forEach(function (prop) {
            var propAssertion = new Assertion(obj);

            _.transferFlags(this, propAssertion, true);

            flag(propAssertion, 'lockSsfi', true);

            if (!negate || props.length === 1) {
              propAssertion.property(prop, val[prop]);
              return;
            }

            try {
              propAssertion.property(prop, val[prop]);
            } catch (err) {
              if (!_.checkError.compatibleConstructor(err, AssertionError)) {
                throw err;
              }

              if (firstErr === null) firstErr = err;
              numErrs++;
            }
          }, this); // When validating .not.include with multiple properties, we only want
          // to throw an assertion error if all of the properties are included,
          // in which case we throw the first property assertion error that we
          // encountered.

          if (negate && props.length > 1 && numErrs === props.length) {
            throw firstErr;
          }

          return;
      } // Assert inclusion in collection or substring in a string.


      this.assert(included, 'expected #{this} to ' + descriptor + 'include ' + _.inspect(val), 'expected #{this} to not ' + descriptor + 'include ' + _.inspect(val));
    }

    Assertion.addChainableMethod('include', include, includeChainingBehavior);
    Assertion.addChainableMethod('contain', include, includeChainingBehavior);
    Assertion.addChainableMethod('contains', include, includeChainingBehavior);
    Assertion.addChainableMethod('includes', include, includeChainingBehavior);
    /**
     * ### .ok
     *
     * Asserts that the target is loosely (`==`) equal to `true`. However, it's
     * often best to assert that the target is strictly (`===`) or deeply equal to
     * its expected value.
     *
     *     expect(1).to.equal(1); // Recommended
     *     expect(1).to.be.ok; // Not recommended
     *
     *     expect(true).to.be.true; // Recommended
     *     expect(true).to.be.ok; // Not recommended
     *
     * Add `.not` earlier in the chain to negate `.ok`.
     *
     *     expect(0).to.equal(0); // Recommended
     *     expect(0).to.not.be.ok; // Not recommended
     *
     *     expect(false).to.be.false; // Recommended
     *     expect(false).to.not.be.ok; // Not recommended
     *
     *     expect(null).to.be.null; // Recommended
     *     expect(null).to.not.be.ok; // Not recommended
     *
     *     expect(undefined).to.be.undefined; // Recommended
     *     expect(undefined).to.not.be.ok; // Not recommended
     *
     * A custom error message can be given as the second argument to `expect`.
     *
     *     expect(false, 'nooo why fail??').to.be.ok;
     *
     * @name ok
     * @namespace BDD
     * @api public
     */

    Assertion.addProperty('ok', function () {
      this.assert(flag(this, 'object'), 'expected #{this} to be truthy', 'expected #{this} to be falsy');
    });
    /**
     * ### .true
     *
     * Asserts that the target is strictly (`===`) equal to `true`.
     *
     *     expect(true).to.be.true;
     *
     * Add `.not` earlier in the chain to negate `.true`. However, it's often best
     * to assert that the target is equal to its expected value, rather than not
     * equal to `true`.
     *
     *     expect(false).to.be.false; // Recommended
     *     expect(false).to.not.be.true; // Not recommended
     *
     *     expect(1).to.equal(1); // Recommended
     *     expect(1).to.not.be.true; // Not recommended
     *
     * A custom error message can be given as the second argument to `expect`.
     *
     *     expect(false, 'nooo why fail??').to.be.true;
     *
     * @name true
     * @namespace BDD
     * @api public
     */

    Assertion.addProperty('true', function () {
      this.assert(true === flag(this, 'object'), 'expected #{this} to be true', 'expected #{this} to be false', flag(this, 'negate') ? false : true);
    });
    /**
     * ### .false
     *
     * Asserts that the target is strictly (`===`) equal to `false`.
     *
     *     expect(false).to.be.false;
     *
     * Add `.not` earlier in the chain to negate `.false`. However, it's often
     * best to assert that the target is equal to its expected value, rather than
     * not equal to `false`.
     *
     *     expect(true).to.be.true; // Recommended
     *     expect(true).to.not.be.false; // Not recommended
     *
     *     expect(1).to.equal(1); // Recommended
     *     expect(1).to.not.be.false; // Not recommended
     *
     * A custom error message can be given as the second argument to `expect`.
     *
     *     expect(true, 'nooo why fail??').to.be.false;
     *
     * @name false
     * @namespace BDD
     * @api public
     */

    Assertion.addProperty('false', function () {
      this.assert(false === flag(this, 'object'), 'expected #{this} to be false', 'expected #{this} to be true', flag(this, 'negate') ? true : false);
    });
    /**
     * ### .null
     *
     * Asserts that the target is strictly (`===`) equal to `null`.
     *
     *     expect(null).to.be.null;
     *
     * Add `.not` earlier in the chain to negate `.null`. However, it's often best
     * to assert that the target is equal to its expected value, rather than not
     * equal to `null`.
     *
     *     expect(1).to.equal(1); // Recommended
     *     expect(1).to.not.be.null; // Not recommended
     *
     * A custom error message can be given as the second argument to `expect`.
     *
     *     expect(42, 'nooo why fail??').to.be.null;
     *
     * @name null
     * @namespace BDD
     * @api public
     */

    Assertion.addProperty('null', function () {
      this.assert(null === flag(this, 'object'), 'expected #{this} to be null', 'expected #{this} not to be null');
    });
    /**
     * ### .undefined
     *
     * Asserts that the target is strictly (`===`) equal to `undefined`.
     *
     *     expect(undefined).to.be.undefined;
     *
     * Add `.not` earlier in the chain to negate `.undefined`. However, it's often
     * best to assert that the target is equal to its expected value, rather than
     * not equal to `undefined`.
     *
     *     expect(1).to.equal(1); // Recommended
     *     expect(1).to.not.be.undefined; // Not recommended
     *
     * A custom error message can be given as the second argument to `expect`.
     *
     *     expect(42, 'nooo why fail??').to.be.undefined;
     *
     * @name undefined
     * @namespace BDD
     * @api public
     */

    Assertion.addProperty('undefined', function () {
      this.assert(undefined === flag(this, 'object'), 'expected #{this} to be undefined', 'expected #{this} not to be undefined');
    });
    /**
     * ### .NaN
     *
     * Asserts that the target is exactly `NaN`.
     *
     *     expect(NaN).to.be.NaN;
     *
     * Add `.not` earlier in the chain to negate `.NaN`. However, it's often best
     * to assert that the target is equal to its expected value, rather than not
     * equal to `NaN`.
     *
     *     expect('foo').to.equal('foo'); // Recommended
     *     expect('foo').to.not.be.NaN; // Not recommended
     *
     * A custom error message can be given as the second argument to `expect`.
     *
     *     expect(42, 'nooo why fail??').to.be.NaN;
     *
     * @name NaN
     * @namespace BDD
     * @api public
     */

    Assertion.addProperty('NaN', function () {
      this.assert(_.isNaN(flag(this, 'object')), 'expected #{this} to be NaN', 'expected #{this} not to be NaN');
    });
    /**
     * ### .exist
     *
     * Asserts that the target is not strictly (`===`) equal to either `null` or
     * `undefined`. However, it's often best to assert that the target is equal to
     * its expected value.
     *
     *     expect(1).to.equal(1); // Recommended
     *     expect(1).to.exist; // Not recommended
     *
     *     expect(0).to.equal(0); // Recommended
     *     expect(0).to.exist; // Not recommended
     *
     * Add `.not` earlier in the chain to negate `.exist`.
     *
     *     expect(null).to.be.null; // Recommended
     *     expect(null).to.not.exist; // Not recommended
     *
     *     expect(undefined).to.be.undefined; // Recommended
     *     expect(undefined).to.not.exist; // Not recommended
     *
     * A custom error message can be given as the second argument to `expect`.
     *
     *     expect(null, 'nooo why fail??').to.exist;
     *
     * @name exist
     * @namespace BDD
     * @api public
     */

    Assertion.addProperty('exist', function () {
      var val = flag(this, 'object');
      this.assert(val !== null && val !== undefined, 'expected #{this} to exist', 'expected #{this} to not exist');
    });
    /**
     * ### .empty
     *
     * When the target is a string or array, `.empty` asserts that the target's
     * `length` property is strictly (`===`) equal to `0`.
     *
     *     expect([]).to.be.empty;
     *     expect('').to.be.empty;
     *
     * When the target is a map or set, `.empty` asserts that the target's `size`
     * property is strictly equal to `0`.
     *
     *     expect(new Set()).to.be.empty;
     *     expect(new Map()).to.be.empty;
     *
     * When the target is a non-function object, `.empty` asserts that the target
     * doesn't have any own enumerable properties. Properties with Symbol-based
     * keys are excluded from the count.
     *
     *     expect({}).to.be.empty;
     *
     * Because `.empty` does different things based on the target's type, it's
     * important to check the target's type before using `.empty`. See the `.a`
     * doc for info on testing a target's type.
     *
     *     expect([]).to.be.an('array').that.is.empty;
     *
     * Add `.not` earlier in the chain to negate `.empty`. However, it's often
     * best to assert that the target contains its expected number of values,
     * rather than asserting that it's not empty.
     *
     *     expect([1, 2, 3]).to.have.lengthOf(3); // Recommended
     *     expect([1, 2, 3]).to.not.be.empty; // Not recommended
     *
     *     expect(new Set([1, 2, 3])).to.have.property('size', 3); // Recommended
     *     expect(new Set([1, 2, 3])).to.not.be.empty; // Not recommended
     *
     *     expect(Object.keys({a: 1})).to.have.lengthOf(1); // Recommended
     *     expect({a: 1}).to.not.be.empty; // Not recommended
     *
     * A custom error message can be given as the second argument to `expect`.
     *
     *     expect([1, 2, 3], 'nooo why fail??').to.be.empty;
     *
     * @name empty
     * @namespace BDD
     * @api public
     */

    Assertion.addProperty('empty', function () {
      var val = flag(this, 'object'),
          ssfi = flag(this, 'ssfi'),
          flagMsg = flag(this, 'message'),
          itemsCount;
      flagMsg = flagMsg ? flagMsg + ': ' : '';

      switch (_.type(val).toLowerCase()) {
        case 'array':
        case 'string':
          itemsCount = val.length;
          break;

        case 'map':
        case 'set':
          itemsCount = val.size;
          break;

        case 'weakmap':
        case 'weakset':
          throw new AssertionError(flagMsg + '.empty was passed a weak collection', undefined, ssfi);

        case 'function':
          var msg = flagMsg + '.empty was passed a function ' + _.getName(val);

          throw new AssertionError(msg.trim(), undefined, ssfi);

        default:
          if (val !== Object(val)) {
            throw new AssertionError(flagMsg + '.empty was passed non-string primitive ' + _.inspect(val), undefined, ssfi);
          }

          itemsCount = Object.keys(val).length;
      }

      this.assert(0 === itemsCount, 'expected #{this} to be empty', 'expected #{this} not to be empty');
    });
    /**
     * ### .arguments
     *
     * Asserts that the target is an `arguments` object.
     *
     *     function test () {
     *       expect(arguments).to.be.arguments;
     *     }
     *
     *     test();
     *
     * Add `.not` earlier in the chain to negate `.arguments`. However, it's often
     * best to assert which type the target is expected to be, rather than
     * asserting that its not an `arguments` object.
     *
     *     expect('foo').to.be.a('string'); // Recommended
     *     expect('foo').to.not.be.arguments; // Not recommended
     *
     * A custom error message can be given as the second argument to `expect`.
     *
     *     expect({}, 'nooo why fail??').to.be.arguments;
     *
     * The alias `.Arguments` can be used interchangeably with `.arguments`.
     *
     * @name arguments
     * @alias Arguments
     * @namespace BDD
     * @api public
     */

    function checkArguments() {
      var obj = flag(this, 'object'),
          type = _.type(obj);

      this.assert('Arguments' === type, 'expected #{this} to be arguments but got ' + type, 'expected #{this} to not be arguments');
    }

    Assertion.addProperty('arguments', checkArguments);
    Assertion.addProperty('Arguments', checkArguments);
    /**
     * ### .equal(val[, msg])
     *
     * Asserts that the target is strictly (`===`) equal to the given `val`.
     *
     *     expect(1).to.equal(1);
     *     expect('foo').to.equal('foo');
     * 
     * Add `.deep` earlier in the chain to use deep equality instead. See the
     * `deep-eql` project page for info on the deep equality algorithm:
     * https://github.com/chaijs/deep-eql.
     *
     *     // Target object deeply (but not strictly) equals `{a: 1}`
     *     expect({a: 1}).to.deep.equal({a: 1});
     *     expect({a: 1}).to.not.equal({a: 1});
     *
     *     // Target array deeply (but not strictly) equals `[1, 2]`
     *     expect([1, 2]).to.deep.equal([1, 2]);
     *     expect([1, 2]).to.not.equal([1, 2]);
     *
     * Add `.not` earlier in the chain to negate `.equal`. However, it's often
     * best to assert that the target is equal to its expected value, rather than
     * not equal to one of countless unexpected values.
     *
     *     expect(1).to.equal(1); // Recommended
     *     expect(1).to.not.equal(2); // Not recommended
     *
     * `.equal` accepts an optional `msg` argument which is a custom error message
     * to show when the assertion fails. The message can also be given as the
     * second argument to `expect`.
     *
     *     expect(1).to.equal(2, 'nooo why fail??');
     *     expect(1, 'nooo why fail??').to.equal(2);
     *
     * The aliases `.equals` and `eq` can be used interchangeably with `.equal`.
     *
     * @name equal
     * @alias equals
     * @alias eq
     * @param {Mixed} val
     * @param {String} msg _optional_
     * @namespace BDD
     * @api public
     */

    function assertEqual(val, msg) {
      if (msg) flag(this, 'message', msg);
      var obj = flag(this, 'object');

      if (flag(this, 'deep')) {
        return this.eql(val);
      } else {
        this.assert(val === obj, 'expected #{this} to equal #{exp}', 'expected #{this} to not equal #{exp}', val, this._obj, true);
      }
    }

    Assertion.addMethod('equal', assertEqual);
    Assertion.addMethod('equals', assertEqual);
    Assertion.addMethod('eq', assertEqual);
    /**
     * ### .eql(obj[, msg])
     *
     * Asserts that the target is deeply equal to the given `obj`. See the
     * `deep-eql` project page for info on the deep equality algorithm:
     * https://github.com/chaijs/deep-eql.
     *
     *     // Target object is deeply (but not strictly) equal to {a: 1}
     *     expect({a: 1}).to.eql({a: 1}).but.not.equal({a: 1});
     *
     *     // Target array is deeply (but not strictly) equal to [1, 2]
     *     expect([1, 2]).to.eql([1, 2]).but.not.equal([1, 2]);
     *
     * Add `.not` earlier in the chain to negate `.eql`. However, it's often best
     * to assert that the target is deeply equal to its expected value, rather
     * than not deeply equal to one of countless unexpected values.
     *
     *     expect({a: 1}).to.eql({a: 1}); // Recommended
     *     expect({a: 1}).to.not.eql({b: 2}); // Not recommended
     *
     * `.eql` accepts an optional `msg` argument which is a custom error message
     * to show when the assertion fails. The message can also be given as the
     * second argument to `expect`.
     *
     *     expect({a: 1}).to.eql({b: 2}, 'nooo why fail??');
     *     expect({a: 1}, 'nooo why fail??').to.eql({b: 2});
     *
     * The alias `.eqls` can be used interchangeably with `.eql`.
     *
     * The `.deep.equal` assertion is almost identical to `.eql` but with one
     * difference: `.deep.equal` causes deep equality comparisons to also be used
     * for any other assertions that follow in the chain.
     *
     * @name eql
     * @alias eqls
     * @param {Mixed} obj
     * @param {String} msg _optional_
     * @namespace BDD
     * @api public
     */

    function assertEql(obj, msg) {
      if (msg) flag(this, 'message', msg);
      this.assert(_.eql(obj, flag(this, 'object')), 'expected #{this} to deeply equal #{exp}', 'expected #{this} to not deeply equal #{exp}', obj, this._obj, true);
    }

    Assertion.addMethod('eql', assertEql);
    Assertion.addMethod('eqls', assertEql);
    /**
     * ### .above(n[, msg])
     *
     * Asserts that the target is a number or a date greater than the given number or date `n` respectively.
     * However, it's often best to assert that the target is equal to its expected
     * value.
     *
     *     expect(2).to.equal(2); // Recommended
     *     expect(2).to.be.above(1); // Not recommended
     *
     * Add `.lengthOf` earlier in the chain to assert that the value of the
     * target's `length` property is greater than the given number `n`.
     *
     *     expect('foo').to.have.lengthOf(3); // Recommended
     *     expect('foo').to.have.lengthOf.above(2); // Not recommended
     *
     *     expect([1, 2, 3]).to.have.lengthOf(3); // Recommended
     *     expect([1, 2, 3]).to.have.lengthOf.above(2); // Not recommended
     *
     * Add `.not` earlier in the chain to negate `.above`.
     *
     *     expect(2).to.equal(2); // Recommended
     *     expect(1).to.not.be.above(2); // Not recommended
     *
     * `.above` accepts an optional `msg` argument which is a custom error message
     * to show when the assertion fails. The message can also be given as the
     * second argument to `expect`.
     *
     *     expect(1).to.be.above(2, 'nooo why fail??');
     *     expect(1, 'nooo why fail??').to.be.above(2);
     *
     * The aliases `.gt` and `.greaterThan` can be used interchangeably with
     * `.above`.
     *
     * @name above
     * @alias gt
     * @alias greaterThan
     * @param {Number} n
     * @param {String} msg _optional_
     * @namespace BDD
     * @api public
     */

    function assertAbove(n, msg) {
      if (msg) flag(this, 'message', msg);

      var obj = flag(this, 'object'),
          doLength = flag(this, 'doLength'),
          flagMsg = flag(this, 'message'),
          msgPrefix = flagMsg ? flagMsg + ': ' : '',
          ssfi = flag(this, 'ssfi'),
          objType = _.type(obj).toLowerCase(),
          nType = _.type(n).toLowerCase(),
          shouldThrow = true;

      if (doLength) {
        new Assertion(obj, flagMsg, ssfi, true).to.have.property('length');
      }

      if (!doLength && objType === 'date' && nType !== 'date') {
        errorMessage = msgPrefix + 'the argument to above must be a date';
      } else if (nType !== 'number' && (doLength || objType === 'number')) {
        errorMessage = msgPrefix + 'the argument to above must be a number';
      } else if (!doLength && objType !== 'date' && objType !== 'number') {
        var printObj = objType === 'string' ? "'" + obj + "'" : obj;
        errorMessage = msgPrefix + 'expected ' + printObj + ' to be a number or a date';
      } else {
        shouldThrow = false;
      }

      if (shouldThrow) {
        throw new AssertionError(errorMessage, undefined, ssfi);
      }

      if (doLength) {
        var len = obj.length;
        this.assert(len > n, 'expected #{this} to have a length above #{exp} but got #{act}', 'expected #{this} to not have a length above #{exp}', n, len);
      } else {
        this.assert(obj > n, 'expected #{this} to be above #{exp}', 'expected #{this} to be at most #{exp}', n);
      }
    }

    Assertion.addMethod('above', assertAbove);
    Assertion.addMethod('gt', assertAbove);
    Assertion.addMethod('greaterThan', assertAbove);
    /**
     * ### .least(n[, msg])
     *
     * Asserts that the target is a number or a date greater than or equal to the given
     * number or date `n` respectively. However, it's often best to assert that the target is equal to
     * its expected value.
     *
     *     expect(2).to.equal(2); // Recommended
     *     expect(2).to.be.at.least(1); // Not recommended
     *     expect(2).to.be.at.least(2); // Not recommended
     *
     * Add `.lengthOf` earlier in the chain to assert that the value of the
     * target's `length` property is greater than or equal to the given number
     * `n`.
     *
     *     expect('foo').to.have.lengthOf(3); // Recommended
     *     expect('foo').to.have.lengthOf.at.least(2); // Not recommended
     *
     *     expect([1, 2, 3]).to.have.lengthOf(3); // Recommended
     *     expect([1, 2, 3]).to.have.lengthOf.at.least(2); // Not recommended
     *
     * Add `.not` earlier in the chain to negate `.least`.
     *
     *     expect(1).to.equal(1); // Recommended
     *     expect(1).to.not.be.at.least(2); // Not recommended
     *
     * `.least` accepts an optional `msg` argument which is a custom error message
     * to show when the assertion fails. The message can also be given as the
     * second argument to `expect`.
     *
     *     expect(1).to.be.at.least(2, 'nooo why fail??');
     *     expect(1, 'nooo why fail??').to.be.at.least(2);
     *
     * The alias `.gte` can be used interchangeably with `.least`.
     *
     * @name least
     * @alias gte
     * @param {Number} n
     * @param {String} msg _optional_
     * @namespace BDD
     * @api public
     */

    function assertLeast(n, msg) {
      if (msg) flag(this, 'message', msg);

      var obj = flag(this, 'object'),
          doLength = flag(this, 'doLength'),
          flagMsg = flag(this, 'message'),
          msgPrefix = flagMsg ? flagMsg + ': ' : '',
          ssfi = flag(this, 'ssfi'),
          objType = _.type(obj).toLowerCase(),
          nType = _.type(n).toLowerCase(),
          shouldThrow = true;

      if (doLength) {
        new Assertion(obj, flagMsg, ssfi, true).to.have.property('length');
      }

      if (!doLength && objType === 'date' && nType !== 'date') {
        errorMessage = msgPrefix + 'the argument to least must be a date';
      } else if (nType !== 'number' && (doLength || objType === 'number')) {
        errorMessage = msgPrefix + 'the argument to least must be a number';
      } else if (!doLength && objType !== 'date' && objType !== 'number') {
        var printObj = objType === 'string' ? "'" + obj + "'" : obj;
        errorMessage = msgPrefix + 'expected ' + printObj + ' to be a number or a date';
      } else {
        shouldThrow = false;
      }

      if (shouldThrow) {
        throw new AssertionError(errorMessage, undefined, ssfi);
      }

      if (doLength) {
        var len = obj.length;
        this.assert(len >= n, 'expected #{this} to have a length at least #{exp} but got #{act}', 'expected #{this} to have a length below #{exp}', n, len);
      } else {
        this.assert(obj >= n, 'expected #{this} to be at least #{exp}', 'expected #{this} to be below #{exp}', n);
      }
    }

    Assertion.addMethod('least', assertLeast);
    Assertion.addMethod('gte', assertLeast);
    /**
     * ### .below(n[, msg])
     *
     * Asserts that the target is a number or a date less than the given number or date `n` respectively.
     * However, it's often best to assert that the target is equal to its expected
     * value.
     *
     *     expect(1).to.equal(1); // Recommended
     *     expect(1).to.be.below(2); // Not recommended
     *
     * Add `.lengthOf` earlier in the chain to assert that the value of the
     * target's `length` property is less than the given number `n`.
     *
     *     expect('foo').to.have.lengthOf(3); // Recommended
     *     expect('foo').to.have.lengthOf.below(4); // Not recommended
     *
     *     expect([1, 2, 3]).to.have.length(3); // Recommended
     *     expect([1, 2, 3]).to.have.lengthOf.below(4); // Not recommended
     *
     * Add `.not` earlier in the chain to negate `.below`.
     *
     *     expect(2).to.equal(2); // Recommended
     *     expect(2).to.not.be.below(1); // Not recommended
     *
     * `.below` accepts an optional `msg` argument which is a custom error message
     * to show when the assertion fails. The message can also be given as the
     * second argument to `expect`.
     *
     *     expect(2).to.be.below(1, 'nooo why fail??');
     *     expect(2, 'nooo why fail??').to.be.below(1);
     *
     * The aliases `.lt` and `.lessThan` can be used interchangeably with
     * `.below`.
     *
     * @name below
     * @alias lt
     * @alias lessThan
     * @param {Number} n
     * @param {String} msg _optional_
     * @namespace BDD
     * @api public
     */

    function assertBelow(n, msg) {
      if (msg) flag(this, 'message', msg);

      var obj = flag(this, 'object'),
          doLength = flag(this, 'doLength'),
          flagMsg = flag(this, 'message'),
          msgPrefix = flagMsg ? flagMsg + ': ' : '',
          ssfi = flag(this, 'ssfi'),
          objType = _.type(obj).toLowerCase(),
          nType = _.type(n).toLowerCase(),
          shouldThrow = true;

      if (doLength) {
        new Assertion(obj, flagMsg, ssfi, true).to.have.property('length');
      }

      if (!doLength && objType === 'date' && nType !== 'date') {
        errorMessage = msgPrefix + 'the argument to below must be a date';
      } else if (nType !== 'number' && (doLength || objType === 'number')) {
        errorMessage = msgPrefix + 'the argument to below must be a number';
      } else if (!doLength && objType !== 'date' && objType !== 'number') {
        var printObj = objType === 'string' ? "'" + obj + "'" : obj;
        errorMessage = msgPrefix + 'expected ' + printObj + ' to be a number or a date';
      } else {
        shouldThrow = false;
      }

      if (shouldThrow) {
        throw new AssertionError(errorMessage, undefined, ssfi);
      }

      if (doLength) {
        var len = obj.length;
        this.assert(len < n, 'expected #{this} to have a length below #{exp} but got #{act}', 'expected #{this} to not have a length below #{exp}', n, len);
      } else {
        this.assert(obj < n, 'expected #{this} to be below #{exp}', 'expected #{this} to be at least #{exp}', n);
      }
    }

    Assertion.addMethod('below', assertBelow);
    Assertion.addMethod('lt', assertBelow);
    Assertion.addMethod('lessThan', assertBelow);
    /**
     * ### .most(n[, msg])
     *
     * Asserts that the target is a number or a date less than or equal to the given number
     * or date `n` respectively. However, it's often best to assert that the target is equal to its
     * expected value.
     *
     *     expect(1).to.equal(1); // Recommended
     *     expect(1).to.be.at.most(2); // Not recommended
     *     expect(1).to.be.at.most(1); // Not recommended
     *
     * Add `.lengthOf` earlier in the chain to assert that the value of the
     * target's `length` property is less than or equal to the given number `n`.
     *
     *     expect('foo').to.have.lengthOf(3); // Recommended
     *     expect('foo').to.have.lengthOf.at.most(4); // Not recommended
     *
     *     expect([1, 2, 3]).to.have.lengthOf(3); // Recommended
     *     expect([1, 2, 3]).to.have.lengthOf.at.most(4); // Not recommended
     *
     * Add `.not` earlier in the chain to negate `.most`.
     *
     *     expect(2).to.equal(2); // Recommended
     *     expect(2).to.not.be.at.most(1); // Not recommended
     *
     * `.most` accepts an optional `msg` argument which is a custom error message
     * to show when the assertion fails. The message can also be given as the
     * second argument to `expect`.
     *
     *     expect(2).to.be.at.most(1, 'nooo why fail??');
     *     expect(2, 'nooo why fail??').to.be.at.most(1);
     *
     * The alias `.lte` can be used interchangeably with `.most`.
     *
     * @name most
     * @alias lte
     * @param {Number} n
     * @param {String} msg _optional_
     * @namespace BDD
     * @api public
     */

    function assertMost(n, msg) {
      if (msg) flag(this, 'message', msg);

      var obj = flag(this, 'object'),
          doLength = flag(this, 'doLength'),
          flagMsg = flag(this, 'message'),
          msgPrefix = flagMsg ? flagMsg + ': ' : '',
          ssfi = flag(this, 'ssfi'),
          objType = _.type(obj).toLowerCase(),
          nType = _.type(n).toLowerCase(),
          shouldThrow = true;

      if (doLength) {
        new Assertion(obj, flagMsg, ssfi, true).to.have.property('length');
      }

      if (!doLength && objType === 'date' && nType !== 'date') {
        errorMessage = msgPrefix + 'the argument to most must be a date';
      } else if (nType !== 'number' && (doLength || objType === 'number')) {
        errorMessage = msgPrefix + 'the argument to most must be a number';
      } else if (!doLength && objType !== 'date' && objType !== 'number') {
        var printObj = objType === 'string' ? "'" + obj + "'" : obj;
        errorMessage = msgPrefix + 'expected ' + printObj + ' to be a number or a date';
      } else {
        shouldThrow = false;
      }

      if (shouldThrow) {
        throw new AssertionError(errorMessage, undefined, ssfi);
      }

      if (doLength) {
        var len = obj.length;
        this.assert(len <= n, 'expected #{this} to have a length at most #{exp} but got #{act}', 'expected #{this} to have a length above #{exp}', n, len);
      } else {
        this.assert(obj <= n, 'expected #{this} to be at most #{exp}', 'expected #{this} to be above #{exp}', n);
      }
    }

    Assertion.addMethod('most', assertMost);
    Assertion.addMethod('lte', assertMost);
    /**
     * ### .within(start, finish[, msg])
     *
     * Asserts that the target is a number or a date greater than or equal to the given
     * number or date `start`, and less than or equal to the given number or date `finish` respectively.
     * However, it's often best to assert that the target is equal to its expected
     * value.
     *
     *     expect(2).to.equal(2); // Recommended
     *     expect(2).to.be.within(1, 3); // Not recommended
     *     expect(2).to.be.within(2, 3); // Not recommended
     *     expect(2).to.be.within(1, 2); // Not recommended
     *
     * Add `.lengthOf` earlier in the chain to assert that the value of the
     * target's `length` property is greater than or equal to the given number
     * `start`, and less than or equal to the given number `finish`.
     *
     *     expect('foo').to.have.lengthOf(3); // Recommended
     *     expect('foo').to.have.lengthOf.within(2, 4); // Not recommended
     *
     *     expect([1, 2, 3]).to.have.lengthOf(3); // Recommended
     *     expect([1, 2, 3]).to.have.lengthOf.within(2, 4); // Not recommended
     *
     * Add `.not` earlier in the chain to negate `.within`.
     *
     *     expect(1).to.equal(1); // Recommended
     *     expect(1).to.not.be.within(2, 4); // Not recommended
     *
     * `.within` accepts an optional `msg` argument which is a custom error
     * message to show when the assertion fails. The message can also be given as
     * the second argument to `expect`.
     *
     *     expect(4).to.be.within(1, 3, 'nooo why fail??');
     *     expect(4, 'nooo why fail??').to.be.within(1, 3);
     *
     * @name within
     * @param {Number} start lower bound inclusive
     * @param {Number} finish upper bound inclusive
     * @param {String} msg _optional_
     * @namespace BDD
     * @api public
     */

    Assertion.addMethod('within', function (start, finish, msg) {
      if (msg) flag(this, 'message', msg);

      var obj = flag(this, 'object'),
          doLength = flag(this, 'doLength'),
          flagMsg = flag(this, 'message'),
          msgPrefix = flagMsg ? flagMsg + ': ' : '',
          ssfi = flag(this, 'ssfi'),
          objType = _.type(obj).toLowerCase(),
          startType = _.type(start).toLowerCase(),
          finishType = _.type(finish).toLowerCase(),
          shouldThrow = true,
          range = startType === 'date' && finishType === 'date' ? start.toUTCString() + '..' + finish.toUTCString() : start + '..' + finish;

      if (doLength) {
        new Assertion(obj, flagMsg, ssfi, true).to.have.property('length');
      }

      if (!doLength && objType === 'date' && (startType !== 'date' || finishType !== 'date')) {
        errorMessage = msgPrefix + 'the arguments to within must be dates';
      } else if ((startType !== 'number' || finishType !== 'number') && (doLength || objType === 'number')) {
        errorMessage = msgPrefix + 'the arguments to within must be numbers';
      } else if (!doLength && objType !== 'date' && objType !== 'number') {
        var printObj = objType === 'string' ? "'" + obj + "'" : obj;
        errorMessage = msgPrefix + 'expected ' + printObj + ' to be a number or a date';
      } else {
        shouldThrow = false;
      }

      if (shouldThrow) {
        throw new AssertionError(errorMessage, undefined, ssfi);
      }

      if (doLength) {
        var len = obj.length;
        this.assert(len >= start && len <= finish, 'expected #{this} to have a length within ' + range, 'expected #{this} to not have a length within ' + range);
      } else {
        this.assert(obj >= start && obj <= finish, 'expected #{this} to be within ' + range, 'expected #{this} to not be within ' + range);
      }
    });
    /**
     * ### .instanceof(constructor[, msg])
     *
     * Asserts that the target is an instance of the given `constructor`.
     *
     *     function Cat () { }
     *
     *     expect(new Cat()).to.be.an.instanceof(Cat);
     *     expect([1, 2]).to.be.an.instanceof(Array);
     *
     * Add `.not` earlier in the chain to negate `.instanceof`.
     *
     *     expect({a: 1}).to.not.be.an.instanceof(Array);
     *
     * `.instanceof` accepts an optional `msg` argument which is a custom error
     * message to show when the assertion fails. The message can also be given as
     * the second argument to `expect`.
     *
     *     expect(1).to.be.an.instanceof(Array, 'nooo why fail??');
     *     expect(1, 'nooo why fail??').to.be.an.instanceof(Array);
     *
     * Due to limitations in ES5, `.instanceof` may not always work as expected
     * when using a transpiler such as Babel or TypeScript. In particular, it may
     * produce unexpected results when subclassing built-in object such as
     * `Array`, `Error`, and `Map`. See your transpiler's docs for details:
     *
     * - ([Babel](https://babeljs.io/docs/usage/caveats/#classes))
     * - ([TypeScript](https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work))
     *
     * The alias `.instanceOf` can be used interchangeably with `.instanceof`.
     *
     * @name instanceof
     * @param {Constructor} constructor
     * @param {String} msg _optional_
     * @alias instanceOf
     * @namespace BDD
     * @api public
     */

    function assertInstanceOf(constructor, msg) {
      if (msg) flag(this, 'message', msg);
      var target = flag(this, 'object');
      var ssfi = flag(this, 'ssfi');
      var flagMsg = flag(this, 'message');

      try {
        var isInstanceOf = target instanceof constructor;
      } catch (err) {
        if (err instanceof TypeError) {
          flagMsg = flagMsg ? flagMsg + ': ' : '';
          throw new AssertionError(flagMsg + 'The instanceof assertion needs a constructor but ' + _.type(constructor) + ' was given.', undefined, ssfi);
        }

        throw err;
      }

      var name = _.getName(constructor);

      if (name === null) {
        name = 'an unnamed constructor';
      }

      this.assert(isInstanceOf, 'expected #{this} to be an instance of ' + name, 'expected #{this} to not be an instance of ' + name);
    }
    Assertion.addMethod('instanceof', assertInstanceOf);
    Assertion.addMethod('instanceOf', assertInstanceOf);
    /**
     * ### .property(name[, val[, msg]])
     *
     * Asserts that the target has a property with the given key `name`.
     *
     *     expect({a: 1}).to.have.property('a');
     *
     * When `val` is provided, `.property` also asserts that the property's value
     * is equal to the given `val`.
     *
     *     expect({a: 1}).to.have.property('a', 1);
     *
     * By default, strict (`===`) equality is used. Add `.deep` earlier in the
     * chain to use deep equality instead. See the `deep-eql` project page for
     * info on the deep equality algorithm: https://github.com/chaijs/deep-eql.
     *
     *     // Target object deeply (but not strictly) has property `x: {a: 1}`
     *     expect({x: {a: 1}}).to.have.deep.property('x', {a: 1});
     *     expect({x: {a: 1}}).to.not.have.property('x', {a: 1});
     *
     * The target's enumerable and non-enumerable properties are always included
     * in the search. By default, both own and inherited properties are included.
     * Add `.own` earlier in the chain to exclude inherited properties from the
     * search.
     *
     *     Object.prototype.b = 2;
     *
     *     expect({a: 1}).to.have.own.property('a');
     *     expect({a: 1}).to.have.own.property('a', 1);
     *     expect({a: 1}).to.have.property('b').but.not.own.property('b'); 
     *
     * `.deep` and `.own` can be combined.
     *
     *     expect({x: {a: 1}}).to.have.deep.own.property('x', {a: 1});
     *
     * Add `.nested` earlier in the chain to enable dot- and bracket-notation when
     * referencing nested properties.
     *
     *     expect({a: {b: ['x', 'y']}}).to.have.nested.property('a.b[1]');
     *     expect({a: {b: ['x', 'y']}}).to.have.nested.property('a.b[1]', 'y');
     *
     * If `.` or `[]` are part of an actual property name, they can be escaped by
     * adding two backslashes before them.
     *
     *     expect({'.a': {'[b]': 'x'}}).to.have.nested.property('\\.a.\\[b\\]');
     *
     * `.deep` and `.nested` can be combined.
     *
     *     expect({a: {b: [{c: 3}]}})
     *       .to.have.deep.nested.property('a.b[0]', {c: 3});
     *
     * `.own` and `.nested` cannot be combined.
     *
     * Add `.not` earlier in the chain to negate `.property`.
     *
     *     expect({a: 1}).to.not.have.property('b');
     * 
     * However, it's dangerous to negate `.property` when providing `val`. The
     * problem is that it creates uncertain expectations by asserting that the
     * target either doesn't have a property with the given key `name`, or that it
     * does have a property with the given key `name` but its value isn't equal to
     * the given `val`. It's often best to identify the exact output that's
     * expected, and then write an assertion that only accepts that exact output.
     *
     * When the target isn't expected to have a property with the given key
     * `name`, it's often best to assert exactly that.
     *
     *     expect({b: 2}).to.not.have.property('a'); // Recommended
     *     expect({b: 2}).to.not.have.property('a', 1); // Not recommended
     *
     * When the target is expected to have a property with the given key `name`,
     * it's often best to assert that the property has its expected value, rather
     * than asserting that it doesn't have one of many unexpected values.
     *
     *     expect({a: 3}).to.have.property('a', 3); // Recommended
     *     expect({a: 3}).to.not.have.property('a', 1); // Not recommended
     *
     * `.property` changes the target of any assertions that follow in the chain
     * to be the value of the property from the original target object.
     *
     *     expect({a: 1}).to.have.property('a').that.is.a('number');
     *
     * `.property` accepts an optional `msg` argument which is a custom error
     * message to show when the assertion fails. The message can also be given as
     * the second argument to `expect`. When not providing `val`, only use the
     * second form.
     *
     *     // Recommended
     *     expect({a: 1}).to.have.property('a', 2, 'nooo why fail??');
     *     expect({a: 1}, 'nooo why fail??').to.have.property('a', 2);
     *     expect({a: 1}, 'nooo why fail??').to.have.property('b');
     *
     *     // Not recommended
     *     expect({a: 1}).to.have.property('b', undefined, 'nooo why fail??');
     * 
     * The above assertion isn't the same thing as not providing `val`. Instead,
     * it's asserting that the target object has a `b` property that's equal to
     * `undefined`.
     *
     * The assertions `.ownProperty` and `.haveOwnProperty` can be used
     * interchangeably with `.own.property`.
     *
     * @name property
     * @param {String} name
     * @param {Mixed} val (optional)
     * @param {String} msg _optional_
     * @returns value of property for chaining
     * @namespace BDD
     * @api public
     */

    function assertProperty(name, val, msg) {
      if (msg) flag(this, 'message', msg);
      var isNested = flag(this, 'nested'),
          isOwn = flag(this, 'own'),
          flagMsg = flag(this, 'message'),
          obj = flag(this, 'object'),
          ssfi = flag(this, 'ssfi');

      if (isNested && isOwn) {
        flagMsg = flagMsg ? flagMsg + ': ' : '';
        throw new AssertionError(flagMsg + 'The "nested" and "own" flags cannot be combined.', undefined, ssfi);
      }

      if (obj === null || obj === undefined) {
        flagMsg = flagMsg ? flagMsg + ': ' : '';
        throw new AssertionError(flagMsg + 'Target cannot be null or undefined.', undefined, ssfi);
      }

      var isDeep = flag(this, 'deep'),
          negate = flag(this, 'negate'),
          pathInfo = isNested ? _.getPathInfo(obj, name) : null,
          value = isNested ? pathInfo.value : obj[name];
      var descriptor = '';
      if (isDeep) descriptor += 'deep ';
      if (isOwn) descriptor += 'own ';
      if (isNested) descriptor += 'nested ';
      descriptor += 'property ';
      var hasProperty;
      if (isOwn) hasProperty = Object.prototype.hasOwnProperty.call(obj, name);else if (isNested) hasProperty = pathInfo.exists;else hasProperty = _.hasProperty(obj, name); // When performing a negated assertion for both name and val, merely having
      // a property with the given name isn't enough to cause the assertion to
      // fail. It must both have a property with the given name, and the value of
      // that property must equal the given val. Therefore, skip this assertion in
      // favor of the next.

      if (!negate || arguments.length === 1) {
        this.assert(hasProperty, 'expected #{this} to have ' + descriptor + _.inspect(name), 'expected #{this} to not have ' + descriptor + _.inspect(name));
      }

      if (arguments.length > 1) {
        this.assert(hasProperty && (isDeep ? _.eql(val, value) : val === value), 'expected #{this} to have ' + descriptor + _.inspect(name) + ' of #{exp}, but got #{act}', 'expected #{this} to not have ' + descriptor + _.inspect(name) + ' of #{act}', val, value);
      }

      flag(this, 'object', value);
    }

    Assertion.addMethod('property', assertProperty);

    function assertOwnProperty(name, value, msg) {
      flag(this, 'own', true);
      assertProperty.apply(this, arguments);
    }

    Assertion.addMethod('ownProperty', assertOwnProperty);
    Assertion.addMethod('haveOwnProperty', assertOwnProperty);
    /**
     * ### .ownPropertyDescriptor(name[, descriptor[, msg]])
     *
     * Asserts that the target has its own property descriptor with the given key
     * `name`. Enumerable and non-enumerable properties are included in the
     * search.
     *
     *     expect({a: 1}).to.have.ownPropertyDescriptor('a');
     *
     * When `descriptor` is provided, `.ownPropertyDescriptor` also asserts that
     * the property's descriptor is deeply equal to the given `descriptor`. See
     * the `deep-eql` project page for info on the deep equality algorithm:
     * https://github.com/chaijs/deep-eql.
     *
     *     expect({a: 1}).to.have.ownPropertyDescriptor('a', {
     *       configurable: true,
     *       enumerable: true,
     *       writable: true,
     *       value: 1,
     *     });
     *
     * Add `.not` earlier in the chain to negate `.ownPropertyDescriptor`.
     *
     *     expect({a: 1}).to.not.have.ownPropertyDescriptor('b');
     * 
     * However, it's dangerous to negate `.ownPropertyDescriptor` when providing
     * a `descriptor`. The problem is that it creates uncertain expectations by
     * asserting that the target either doesn't have a property descriptor with
     * the given key `name`, or that it does have a property descriptor with the
     * given key `name` but its not deeply equal to the given `descriptor`. It's
     * often best to identify the exact output that's expected, and then write an
     * assertion that only accepts that exact output.
     *
     * When the target isn't expected to have a property descriptor with the given
     * key `name`, it's often best to assert exactly that.
     *
     *     // Recommended
     *     expect({b: 2}).to.not.have.ownPropertyDescriptor('a');
     *
     *     // Not recommended
     *     expect({b: 2}).to.not.have.ownPropertyDescriptor('a', {
     *       configurable: true,
     *       enumerable: true,
     *       writable: true,
     *       value: 1,
     *     });
     *
     * When the target is expected to have a property descriptor with the given
     * key `name`, it's often best to assert that the property has its expected
     * descriptor, rather than asserting that it doesn't have one of many
     * unexpected descriptors.
     *
     *     // Recommended
     *     expect({a: 3}).to.have.ownPropertyDescriptor('a', {
     *       configurable: true,
     *       enumerable: true,
     *       writable: true,
     *       value: 3,
     *     });
     *
     *     // Not recommended
     *     expect({a: 3}).to.not.have.ownPropertyDescriptor('a', {
     *       configurable: true,
     *       enumerable: true,
     *       writable: true,
     *       value: 1,
     *     });
     *
     * `.ownPropertyDescriptor` changes the target of any assertions that follow
     * in the chain to be the value of the property descriptor from the original
     * target object.
     *
     *     expect({a: 1}).to.have.ownPropertyDescriptor('a')
     *       .that.has.property('enumerable', true);
     *
     * `.ownPropertyDescriptor` accepts an optional `msg` argument which is a
     * custom error message to show when the assertion fails. The message can also
     * be given as the second argument to `expect`. When not providing
     * `descriptor`, only use the second form.
     *
     *     // Recommended
     *     expect({a: 1}).to.have.ownPropertyDescriptor('a', {
     *       configurable: true,
     *       enumerable: true,
     *       writable: true,
     *       value: 2,
     *     }, 'nooo why fail??');
     *
     *     // Recommended
     *     expect({a: 1}, 'nooo why fail??').to.have.ownPropertyDescriptor('a', {
     *       configurable: true,
     *       enumerable: true,
     *       writable: true,
     *       value: 2,
     *     });
     * 
     *     // Recommended
     *     expect({a: 1}, 'nooo why fail??').to.have.ownPropertyDescriptor('b');
     *
     *     // Not recommended
     *     expect({a: 1})
     *       .to.have.ownPropertyDescriptor('b', undefined, 'nooo why fail??');
     *
     * The above assertion isn't the same thing as not providing `descriptor`.
     * Instead, it's asserting that the target object has a `b` property
     * descriptor that's deeply equal to `undefined`.
     *
     * The alias `.haveOwnPropertyDescriptor` can be used interchangeably with
     * `.ownPropertyDescriptor`.
     *
     * @name ownPropertyDescriptor
     * @alias haveOwnPropertyDescriptor
     * @param {String} name
     * @param {Object} descriptor _optional_
     * @param {String} msg _optional_
     * @namespace BDD
     * @api public
     */

    function assertOwnPropertyDescriptor(name, descriptor, msg) {
      if (typeof descriptor === 'string') {
        msg = descriptor;
        descriptor = null;
      }

      if (msg) flag(this, 'message', msg);
      var obj = flag(this, 'object');
      var actualDescriptor = Object.getOwnPropertyDescriptor(Object(obj), name);

      if (actualDescriptor && descriptor) {
        this.assert(_.eql(descriptor, actualDescriptor), 'expected the own property descriptor for ' + _.inspect(name) + ' on #{this} to match ' + _.inspect(descriptor) + ', got ' + _.inspect(actualDescriptor), 'expected the own property descriptor for ' + _.inspect(name) + ' on #{this} to not match ' + _.inspect(descriptor), descriptor, actualDescriptor, true);
      } else {
        this.assert(actualDescriptor, 'expected #{this} to have an own property descriptor for ' + _.inspect(name), 'expected #{this} to not have an own property descriptor for ' + _.inspect(name));
      }

      flag(this, 'object', actualDescriptor);
    }

    Assertion.addMethod('ownPropertyDescriptor', assertOwnPropertyDescriptor);
    Assertion.addMethod('haveOwnPropertyDescriptor', assertOwnPropertyDescriptor);
    /**
     * ### .lengthOf(n[, msg])
     *
     * Asserts that the target's `length` property is equal to the given number
     * `n`.
     *
     *     expect([1, 2, 3]).to.have.lengthOf(3);
     *     expect('foo').to.have.lengthOf(3);
     *
     * Add `.not` earlier in the chain to negate `.lengthOf`. However, it's often
     * best to assert that the target's `length` property is equal to its expected
     * value, rather than not equal to one of many unexpected values.
     *
     *     expect('foo').to.have.lengthOf(3); // Recommended
     *     expect('foo').to.not.have.lengthOf(4); // Not recommended
     *
     * `.lengthOf` accepts an optional `msg` argument which is a custom error
     * message to show when the assertion fails. The message can also be given as
     * the second argument to `expect`.
     *
     *     expect([1, 2, 3]).to.have.lengthOf(2, 'nooo why fail??');
     *     expect([1, 2, 3], 'nooo why fail??').to.have.lengthOf(2);
     *
     * `.lengthOf` can also be used as a language chain, causing all `.above`,
     * `.below`, `.least`, `.most`, and `.within` assertions that follow in the
     * chain to use the target's `length` property as the target. However, it's
     * often best to assert that the target's `length` property is equal to its
     * expected length, rather than asserting that its `length` property falls
     * within some range of values.
     *
     *     // Recommended
     *     expect([1, 2, 3]).to.have.lengthOf(3);
     *
     *     // Not recommended
     *     expect([1, 2, 3]).to.have.lengthOf.above(2);
     *     expect([1, 2, 3]).to.have.lengthOf.below(4);
     *     expect([1, 2, 3]).to.have.lengthOf.at.least(3);
     *     expect([1, 2, 3]).to.have.lengthOf.at.most(3);
     *     expect([1, 2, 3]).to.have.lengthOf.within(2,4);
     *
     * Due to a compatibility issue, the alias `.length` can't be chained directly
     * off of an uninvoked method such as `.a`. Therefore, `.length` can't be used
     * interchangeably with `.lengthOf` in every situation. It's recommended to
     * always use `.lengthOf` instead of `.length`.
     *
     *     expect([1, 2, 3]).to.have.a.length(3); // incompatible; throws error
     *     expect([1, 2, 3]).to.have.a.lengthOf(3);  // passes as expected
     *
     * @name lengthOf
     * @alias length
     * @param {Number} n
     * @param {String} msg _optional_
     * @namespace BDD
     * @api public
     */

    function assertLengthChain() {
      flag(this, 'doLength', true);
    }

    function assertLength(n, msg) {
      if (msg) flag(this, 'message', msg);
      var obj = flag(this, 'object'),
          flagMsg = flag(this, 'message'),
          ssfi = flag(this, 'ssfi');
      new Assertion(obj, flagMsg, ssfi, true).to.have.property('length');
      var len = obj.length;
      this.assert(len == n, 'expected #{this} to have a length of #{exp} but got #{act}', 'expected #{this} to not have a length of #{act}', n, len);
    }

    Assertion.addChainableMethod('length', assertLength, assertLengthChain);
    Assertion.addChainableMethod('lengthOf', assertLength, assertLengthChain);
    /**
     * ### .match(re[, msg])
     *
     * Asserts that the target matches the given regular expression `re`.
     *
     *     expect('foobar').to.match(/^foo/);
     *
     * Add `.not` earlier in the chain to negate `.match`.
     *
     *     expect('foobar').to.not.match(/taco/);
     *
     * `.match` accepts an optional `msg` argument which is a custom error message
     * to show when the assertion fails. The message can also be given as the
     * second argument to `expect`.
     *
     *     expect('foobar').to.match(/taco/, 'nooo why fail??');
     *     expect('foobar', 'nooo why fail??').to.match(/taco/);
     *
     * The alias `.matches` can be used interchangeably with `.match`.
     *
     * @name match
     * @alias matches
     * @param {RegExp} re
     * @param {String} msg _optional_
     * @namespace BDD
     * @api public
     */

    function assertMatch(re, msg) {
      if (msg) flag(this, 'message', msg);
      var obj = flag(this, 'object');
      this.assert(re.exec(obj), 'expected #{this} to match ' + re, 'expected #{this} not to match ' + re);
    }

    Assertion.addMethod('match', assertMatch);
    Assertion.addMethod('matches', assertMatch);
    /**
     * ### .string(str[, msg])
     *
     * Asserts that the target string contains the given substring `str`.
     *
     *     expect('foobar').to.have.string('bar');
     *
     * Add `.not` earlier in the chain to negate `.string`.
     *
     *     expect('foobar').to.not.have.string('taco');
     *
     * `.string` accepts an optional `msg` argument which is a custom error
     * message to show when the assertion fails. The message can also be given as
     * the second argument to `expect`.
     *
     *     expect('foobar').to.have.string(/taco/, 'nooo why fail??');
     *     expect('foobar', 'nooo why fail??').to.have.string(/taco/);
     *
     * @name string
     * @param {String} str
     * @param {String} msg _optional_
     * @namespace BDD
     * @api public
     */

    Assertion.addMethod('string', function (str, msg) {
      if (msg) flag(this, 'message', msg);
      var obj = flag(this, 'object'),
          flagMsg = flag(this, 'message'),
          ssfi = flag(this, 'ssfi');
      new Assertion(obj, flagMsg, ssfi, true).is.a('string');
      this.assert(~obj.indexOf(str), 'expected #{this} to contain ' + _.inspect(str), 'expected #{this} to not contain ' + _.inspect(str));
    });
    /**
     * ### .keys(key1[, key2[, ...]])
     *
     * Asserts that the target object, array, map, or set has the given keys. Only
     * the target's own inherited properties are included in the search. 
     *
     * When the target is an object or array, keys can be provided as one or more
     * string arguments, a single array argument, or a single object argument. In
     * the latter case, only the keys in the given object matter; the values are
     * ignored.
     *
     *     expect({a: 1, b: 2}).to.have.all.keys('a', 'b');
     *     expect(['x', 'y']).to.have.all.keys(0, 1);
     *
     *     expect({a: 1, b: 2}).to.have.all.keys(['a', 'b']);
     *     expect(['x', 'y']).to.have.all.keys([0, 1]);
     *
     *     expect({a: 1, b: 2}).to.have.all.keys({a: 4, b: 5}); // ignore 4 and 5
     *     expect(['x', 'y']).to.have.all.keys({0: 4, 1: 5}); // ignore 4 and 5
     *
     * When the target is a map or set, each key must be provided as a separate
     * argument.
     *
     *     expect(new Map([['a', 1], ['b', 2]])).to.have.all.keys('a', 'b');
     *     expect(new Set(['a', 'b'])).to.have.all.keys('a', 'b');
     *
     * Because `.keys` does different things based on the target's type, it's
     * important to check the target's type before using `.keys`. See the `.a` doc
     * for info on testing a target's type.
     *
     *     expect({a: 1, b: 2}).to.be.an('object').that.has.all.keys('a', 'b');
     *
     * By default, strict (`===`) equality is used to compare keys of maps and
     * sets. Add `.deep` earlier in the chain to use deep equality instead. See
     * the `deep-eql` project page for info on the deep equality algorithm:
     * https://github.com/chaijs/deep-eql.
     *
     *     // Target set deeply (but not strictly) has key `{a: 1}`
     *     expect(new Set([{a: 1}])).to.have.all.deep.keys([{a: 1}]);
     *     expect(new Set([{a: 1}])).to.not.have.all.keys([{a: 1}]);
     *
     * By default, the target must have all of the given keys and no more. Add
     * `.any` earlier in the chain to only require that the target have at least
     * one of the given keys. Also, add `.not` earlier in the chain to negate
     * `.keys`. It's often best to add `.any` when negating `.keys`, and to use
     * `.all` when asserting `.keys` without negation.
     *
     * When negating `.keys`, `.any` is preferred because `.not.any.keys` asserts
     * exactly what's expected of the output, whereas `.not.all.keys` creates
     * uncertain expectations.
     *
     *     // Recommended; asserts that target doesn't have any of the given keys
     *     expect({a: 1, b: 2}).to.not.have.any.keys('c', 'd');
     *
     *     // Not recommended; asserts that target doesn't have all of the given
     *     // keys but may or may not have some of them
     *     expect({a: 1, b: 2}).to.not.have.all.keys('c', 'd');
     *
     * When asserting `.keys` without negation, `.all` is preferred because
     * `.all.keys` asserts exactly what's expected of the output, whereas
     * `.any.keys` creates uncertain expectations.
     *
     *     // Recommended; asserts that target has all the given keys
     *     expect({a: 1, b: 2}).to.have.all.keys('a', 'b');
     *
     *     // Not recommended; asserts that target has at least one of the given
     *     // keys but may or may not have more of them
     *     expect({a: 1, b: 2}).to.have.any.keys('a', 'b');
     *
     * Note that `.all` is used by default when neither `.all` nor `.any` appear
     * earlier in the chain. However, it's often best to add `.all` anyway because
     * it improves readability.
     *
     *     // Both assertions are identical
     *     expect({a: 1, b: 2}).to.have.all.keys('a', 'b'); // Recommended
     *     expect({a: 1, b: 2}).to.have.keys('a', 'b'); // Not recommended
     *
     * Add `.include` earlier in the chain to require that the target's keys be a
     * superset of the expected keys, rather than identical sets.
     *
     *     // Target object's keys are a superset of ['a', 'b'] but not identical
     *     expect({a: 1, b: 2, c: 3}).to.include.all.keys('a', 'b');
     *     expect({a: 1, b: 2, c: 3}).to.not.have.all.keys('a', 'b');
     *
     * However, if `.any` and `.include` are combined, only the `.any` takes
     * effect. The `.include` is ignored in this case.
     *
     *     // Both assertions are identical
     *     expect({a: 1}).to.have.any.keys('a', 'b');
     *     expect({a: 1}).to.include.any.keys('a', 'b');
     *
     * A custom error message can be given as the second argument to `expect`.
     *
     *     expect({a: 1}, 'nooo why fail??').to.have.key('b');
     *
     * The alias `.key` can be used interchangeably with `.keys`.
     *
     * @name keys
     * @alias key
     * @param {...String|Array|Object} keys
     * @namespace BDD
     * @api public
     */

    function assertKeys(keys) {
      var obj = flag(this, 'object'),
          objType = _.type(obj),
          keysType = _.type(keys),
          ssfi = flag(this, 'ssfi'),
          isDeep = flag(this, 'deep'),
          str,
          deepStr = '',
          ok = true,
          flagMsg = flag(this, 'message');

      flagMsg = flagMsg ? flagMsg + ': ' : '';
      var mixedArgsMsg = flagMsg + 'when testing keys against an object or an array you must give a single Array|Object|String argument or multiple String arguments';

      if (objType === 'Map' || objType === 'Set') {
        deepStr = isDeep ? 'deeply ' : '';
        actual = []; // Map and Set '.keys' aren't supported in IE 11. Therefore, use .forEach.

        obj.forEach(function (val, key) {
          actual.push(key);
        });

        if (keysType !== 'Array') {
          keys = Array.prototype.slice.call(arguments);
        }
      } else {
        actual = _.getOwnEnumerableProperties(obj);

        switch (keysType) {
          case 'Array':
            if (arguments.length > 1) {
              throw new AssertionError(mixedArgsMsg, undefined, ssfi);
            }

            break;

          case 'Object':
            if (arguments.length > 1) {
              throw new AssertionError(mixedArgsMsg, undefined, ssfi);
            }

            keys = Object.keys(keys);
            break;

          default:
            keys = Array.prototype.slice.call(arguments);
        } // Only stringify non-Symbols because Symbols would become "Symbol()"


        keys = keys.map(function (val) {
          return typeof val === 'symbol' ? val : String(val);
        });
      }

      if (!keys.length) {
        throw new AssertionError(flagMsg + 'keys required', undefined, ssfi);
      }

      var len = keys.length,
          any = flag(this, 'any'),
          all = flag(this, 'all'),
          expected = keys,
          actual;

      if (!any && !all) {
        all = true;
      } // Has any


      if (any) {
        ok = expected.some(function (expectedKey) {
          return actual.some(function (actualKey) {
            if (isDeep) {
              return _.eql(expectedKey, actualKey);
            } else {
              return expectedKey === actualKey;
            }
          });
        });
      } // Has all


      if (all) {
        ok = expected.every(function (expectedKey) {
          return actual.some(function (actualKey) {
            if (isDeep) {
              return _.eql(expectedKey, actualKey);
            } else {
              return expectedKey === actualKey;
            }
          });
        });

        if (!flag(this, 'contains')) {
          ok = ok && keys.length == actual.length;
        }
      } // Key string


      if (len > 1) {
        keys = keys.map(function (key) {
          return _.inspect(key);
        });
        var last = keys.pop();

        if (all) {
          str = keys.join(', ') + ', and ' + last;
        }

        if (any) {
          str = keys.join(', ') + ', or ' + last;
        }
      } else {
        str = _.inspect(keys[0]);
      } // Form


      str = (len > 1 ? 'keys ' : 'key ') + str; // Have / include

      str = (flag(this, 'contains') ? 'contain ' : 'have ') + str; // Assertion

      this.assert(ok, 'expected #{this} to ' + deepStr + str, 'expected #{this} to not ' + deepStr + str, expected.slice(0).sort(_.compareByInspect), actual.sort(_.compareByInspect), true);
    }

    Assertion.addMethod('keys', assertKeys);
    Assertion.addMethod('key', assertKeys);
    /**
     * ### .throw([errorLike], [errMsgMatcher], [msg])
     *
     * When no arguments are provided, `.throw` invokes the target function and
     * asserts that an error is thrown.
     * 
     *     var badFn = function () { throw new TypeError('Illegal salmon!'); };
     *
     *     expect(badFn).to.throw();
     *
     * When one argument is provided, and it's an error constructor, `.throw`
     * invokes the target function and asserts that an error is thrown that's an
     * instance of that error constructor.
     *
     *     var badFn = function () { throw new TypeError('Illegal salmon!'); };
     *
     *     expect(badFn).to.throw(TypeError);
     *
     * When one argument is provided, and it's an error instance, `.throw` invokes
     * the target function and asserts that an error is thrown that's strictly
     * (`===`) equal to that error instance.
     *
     *     var err = new TypeError('Illegal salmon!');
     *     var badFn = function () { throw err; };
     *
     *     expect(badFn).to.throw(err);
     *
     * When one argument is provided, and it's a string, `.throw` invokes the
     * target function and asserts that an error is thrown with a message that
     * contains that string.
     *
     *     var badFn = function () { throw new TypeError('Illegal salmon!'); };
     *
     *     expect(badFn).to.throw('salmon');
     *
     * When one argument is provided, and it's a regular expression, `.throw`
     * invokes the target function and asserts that an error is thrown with a
     * message that matches that regular expression.
     *
     *     var badFn = function () { throw new TypeError('Illegal salmon!'); };
     *
     *     expect(badFn).to.throw(/salmon/);
     *
     * When two arguments are provided, and the first is an error instance or
     * constructor, and the second is a string or regular expression, `.throw`
     * invokes the function and asserts that an error is thrown that fulfills both
     * conditions as described above.
     *
     *     var err = new TypeError('Illegal salmon!');
     *     var badFn = function () { throw err; };
     *
     *     expect(badFn).to.throw(TypeError, 'salmon');
     *     expect(badFn).to.throw(TypeError, /salmon/);
     *     expect(badFn).to.throw(err, 'salmon');
     *     expect(badFn).to.throw(err, /salmon/);
     *
     * Add `.not` earlier in the chain to negate `.throw`.
     *     
     *     var goodFn = function () {};
     *
     *     expect(goodFn).to.not.throw();
     * 
     * However, it's dangerous to negate `.throw` when providing any arguments.
     * The problem is that it creates uncertain expectations by asserting that the
     * target either doesn't throw an error, or that it throws an error but of a
     * different type than the given type, or that it throws an error of the given
     * type but with a message that doesn't include the given string. It's often
     * best to identify the exact output that's expected, and then write an
     * assertion that only accepts that exact output.
     *
     * When the target isn't expected to throw an error, it's often best to assert
     * exactly that.
     *
     *     var goodFn = function () {};
     *
     *     expect(goodFn).to.not.throw(); // Recommended
     *     expect(goodFn).to.not.throw(ReferenceError, 'x'); // Not recommended
     *
     * When the target is expected to throw an error, it's often best to assert
     * that the error is of its expected type, and has a message that includes an
     * expected string, rather than asserting that it doesn't have one of many
     * unexpected types, and doesn't have a message that includes some string.
     *
     *     var badFn = function () { throw new TypeError('Illegal salmon!'); };
     *
     *     expect(badFn).to.throw(TypeError, 'salmon'); // Recommended
     *     expect(badFn).to.not.throw(ReferenceError, 'x'); // Not recommended
     *
     * `.throw` changes the target of any assertions that follow in the chain to
     * be the error object that's thrown.
     *
     *     var err = new TypeError('Illegal salmon!');
     *     err.code = 42;
     *     var badFn = function () { throw err; };
     *
     *     expect(badFn).to.throw(TypeError).with.property('code', 42);
     *
     * `.throw` accepts an optional `msg` argument which is a custom error message
     * to show when the assertion fails. The message can also be given as the
     * second argument to `expect`. When not providing two arguments, always use
     * the second form.
     *
     *     var goodFn = function () {};
     *
     *     expect(goodFn).to.throw(TypeError, 'x', 'nooo why fail??');
     *     expect(goodFn, 'nooo why fail??').to.throw();
     *
     * Due to limitations in ES5, `.throw` may not always work as expected when
     * using a transpiler such as Babel or TypeScript. In particular, it may
     * produce unexpected results when subclassing the built-in `Error` object and
     * then passing the subclassed constructor to `.throw`. See your transpiler's
     * docs for details:
     *
     * - ([Babel](https://babeljs.io/docs/usage/caveats/#classes))
     * - ([TypeScript](https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work))
     *
     * Beware of some common mistakes when using the `throw` assertion. One common
     * mistake is to accidentally invoke the function yourself instead of letting
     * the `throw` assertion invoke the function for you. For example, when
     * testing if a function named `fn` throws, provide `fn` instead of `fn()` as
     * the target for the assertion.
     *
     *     expect(fn).to.throw();     // Good! Tests `fn` as desired
     *     expect(fn()).to.throw();   // Bad! Tests result of `fn()`, not `fn`
     *
     * If you need to assert that your function `fn` throws when passed certain
     * arguments, then wrap a call to `fn` inside of another function.
     *
     *     expect(function () { fn(42); }).to.throw();  // Function expression
     *     expect(() => fn(42)).to.throw();             // ES6 arrow function
     *
     * Another common mistake is to provide an object method (or any stand-alone
     * function that relies on `this`) as the target of the assertion. Doing so is
     * problematic because the `this` context will be lost when the function is
     * invoked by `.throw`; there's no way for it to know what `this` is supposed
     * to be. There are two ways around this problem. One solution is to wrap the
     * method or function call inside of another function. Another solution is to
     * use `bind`.
     *
     *     expect(function () { cat.meow(); }).to.throw();  // Function expression
     *     expect(() => cat.meow()).to.throw();             // ES6 arrow function
     *     expect(cat.meow.bind(cat)).to.throw();           // Bind
     *
     * Finally, it's worth mentioning that it's a best practice in JavaScript to
     * only throw `Error` and derivatives of `Error` such as `ReferenceError`,
     * `TypeError`, and user-defined objects that extend `Error`. No other type of
     * value will generate a stack trace when initialized. With that said, the
     * `throw` assertion does technically support any type of value being thrown,
     * not just `Error` and its derivatives.
     *
     * The aliases `.throws` and `.Throw` can be used interchangeably with
     * `.throw`.
     *
     * @name throw
     * @alias throws
     * @alias Throw
     * @param {Error|ErrorConstructor} errorLike
     * @param {String|RegExp} errMsgMatcher error message
     * @param {String} msg _optional_
     * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error#Error_types
     * @returns error for chaining (null if no error)
     * @namespace BDD
     * @api public
     */

    function assertThrows(errorLike, errMsgMatcher, msg) {
      if (msg) flag(this, 'message', msg);
      var obj = flag(this, 'object'),
          ssfi = flag(this, 'ssfi'),
          flagMsg = flag(this, 'message'),
          negate = flag(this, 'negate') || false;
      new Assertion(obj, flagMsg, ssfi, true).is.a('function');

      if (errorLike instanceof RegExp || typeof errorLike === 'string') {
        errMsgMatcher = errorLike;
        errorLike = null;
      }

      var caughtErr;

      try {
        obj();
      } catch (err) {
        caughtErr = err;
      } // If we have the negate flag enabled and at least one valid argument it means we do expect an error
      // but we want it to match a given set of criteria


      var everyArgIsUndefined = errorLike === undefined && errMsgMatcher === undefined; // If we've got the negate flag enabled and both args, we should only fail if both aren't compatible
      // See Issue #551 and PR #683@GitHub

      var everyArgIsDefined = Boolean(errorLike && errMsgMatcher);
      var errorLikeFail = false;
      var errMsgMatcherFail = false; // Checking if error was thrown

      if (everyArgIsUndefined || !everyArgIsUndefined && !negate) {
        // We need this to display results correctly according to their types
        var errorLikeString = 'an error';

        if (errorLike instanceof Error) {
          errorLikeString = '#{exp}';
        } else if (errorLike) {
          errorLikeString = _.checkError.getConstructorName(errorLike);
        }

        this.assert(caughtErr, 'expected #{this} to throw ' + errorLikeString, 'expected #{this} to not throw an error but #{act} was thrown', errorLike && errorLike.toString(), caughtErr instanceof Error ? caughtErr.toString() : typeof caughtErr === 'string' ? caughtErr : caughtErr && _.checkError.getConstructorName(caughtErr));
      }

      if (errorLike && caughtErr) {
        // We should compare instances only if `errorLike` is an instance of `Error`
        if (errorLike instanceof Error) {
          var isCompatibleInstance = _.checkError.compatibleInstance(caughtErr, errorLike);

          if (isCompatibleInstance === negate) {
            // These checks were created to ensure we won't fail too soon when we've got both args and a negate
            // See Issue #551 and PR #683@GitHub
            if (everyArgIsDefined && negate) {
              errorLikeFail = true;
            } else {
              this.assert(negate, 'expected #{this} to throw #{exp} but #{act} was thrown', 'expected #{this} to not throw #{exp}' + (caughtErr && !negate ? ' but #{act} was thrown' : ''), errorLike.toString(), caughtErr.toString());
            }
          }
        }

        var isCompatibleConstructor = _.checkError.compatibleConstructor(caughtErr, errorLike);

        if (isCompatibleConstructor === negate) {
          if (everyArgIsDefined && negate) {
            errorLikeFail = true;
          } else {
            this.assert(negate, 'expected #{this} to throw #{exp} but #{act} was thrown', 'expected #{this} to not throw #{exp}' + (caughtErr ? ' but #{act} was thrown' : ''), errorLike instanceof Error ? errorLike.toString() : errorLike && _.checkError.getConstructorName(errorLike), caughtErr instanceof Error ? caughtErr.toString() : caughtErr && _.checkError.getConstructorName(caughtErr));
          }
        }
      }

      if (caughtErr && errMsgMatcher !== undefined && errMsgMatcher !== null) {
        // Here we check compatible messages
        var placeholder = 'including';

        if (errMsgMatcher instanceof RegExp) {
          placeholder = 'matching';
        }

        var isCompatibleMessage = _.checkError.compatibleMessage(caughtErr, errMsgMatcher);

        if (isCompatibleMessage === negate) {
          if (everyArgIsDefined && negate) {
            errMsgMatcherFail = true;
          } else {
            this.assert(negate, 'expected #{this} to throw error ' + placeholder + ' #{exp} but got #{act}', 'expected #{this} to throw error not ' + placeholder + ' #{exp}', errMsgMatcher, _.checkError.getMessage(caughtErr));
          }
        }
      } // If both assertions failed and both should've matched we throw an error


      if (errorLikeFail && errMsgMatcherFail) {
        this.assert(negate, 'expected #{this} to throw #{exp} but #{act} was thrown', 'expected #{this} to not throw #{exp}' + (caughtErr ? ' but #{act} was thrown' : ''), errorLike instanceof Error ? errorLike.toString() : errorLike && _.checkError.getConstructorName(errorLike), caughtErr instanceof Error ? caughtErr.toString() : caughtErr && _.checkError.getConstructorName(caughtErr));
      }

      flag(this, 'object', caughtErr);
    }
    Assertion.addMethod('throw', assertThrows);
    Assertion.addMethod('throws', assertThrows);
    Assertion.addMethod('Throw', assertThrows);
    /**
     * ### .respondTo(method[, msg])
     *
     * When the target is a non-function object, `.respondTo` asserts that the
     * target has a method with the given name `method`. The method can be own or
     * inherited, and it can be enumerable or non-enumerable.
     *
     *     function Cat () {}
     *     Cat.prototype.meow = function () {};
     *
     *     expect(new Cat()).to.respondTo('meow');
     *
     * When the target is a function, `.respondTo` asserts that the target's
     * `prototype` property has a method with the given name `method`. Again, the
     * method can be own or inherited, and it can be enumerable or non-enumerable.
     *
     *     function Cat () {}
     *     Cat.prototype.meow = function () {};
     *
     *     expect(Cat).to.respondTo('meow');
     *
     * Add `.itself` earlier in the chain to force `.respondTo` to treat the
     * target as a non-function object, even if it's a function. Thus, it asserts
     * that the target has a method with the given name `method`, rather than
     * asserting that the target's `prototype` property has a method with the
     * given name `method`.
     *
     *     function Cat () {}
     *     Cat.prototype.meow = function () {};
     *     Cat.hiss = function () {};
     *
     *     expect(Cat).itself.to.respondTo('hiss').but.not.respondTo('meow');
     *
     * When not adding `.itself`, it's important to check the target's type before
     * using `.respondTo`. See the `.a` doc for info on checking a target's type.
     *
     *     function Cat () {}
     *     Cat.prototype.meow = function () {};
     *
     *     expect(new Cat()).to.be.an('object').that.respondsTo('meow');
     *
     * Add `.not` earlier in the chain to negate `.respondTo`.
     *
     *     function Dog () {}
     *     Dog.prototype.bark = function () {};
     *
     *     expect(new Dog()).to.not.respondTo('meow');
     *
     * `.respondTo` accepts an optional `msg` argument which is a custom error
     * message to show when the assertion fails. The message can also be given as
     * the second argument to `expect`.
     *
     *     expect({}).to.respondTo('meow', 'nooo why fail??');
     *     expect({}, 'nooo why fail??').to.respondTo('meow');
     *
     * The alias `.respondsTo` can be used interchangeably with `.respondTo`.
     *
     * @name respondTo
     * @alias respondsTo
     * @param {String} method
     * @param {String} msg _optional_
     * @namespace BDD
     * @api public
     */

    function respondTo(method, msg) {
      if (msg) flag(this, 'message', msg);
      var obj = flag(this, 'object'),
          itself = flag(this, 'itself'),
          context = 'function' === typeof obj && !itself ? obj.prototype[method] : obj[method];
      this.assert('function' === typeof context, 'expected #{this} to respond to ' + _.inspect(method), 'expected #{this} to not respond to ' + _.inspect(method));
    }

    Assertion.addMethod('respondTo', respondTo);
    Assertion.addMethod('respondsTo', respondTo);
    /**
     * ### .itself
     *
     * Forces all `.respondTo` assertions that follow in the chain to behave as if
     * the target is a non-function object, even if it's a function. Thus, it
     * causes `.respondTo` to assert that the target has a method with the given
     * name, rather than asserting that the target's `prototype` property has a
     * method with the given name.
     *
     *     function Cat () {}
     *     Cat.prototype.meow = function () {};
     *     Cat.hiss = function () {};
     *
     *     expect(Cat).itself.to.respondTo('hiss').but.not.respondTo('meow');
     *
     * @name itself
     * @namespace BDD
     * @api public
     */

    Assertion.addProperty('itself', function () {
      flag(this, 'itself', true);
    });
    /**
     * ### .satisfy(matcher[, msg])
     *
     * Invokes the given `matcher` function with the target being passed as the
     * first argument, and asserts that the value returned is truthy.
     *
     *     expect(1).to.satisfy(function(num) {
     *       return num > 0; 
     *     });
     *
     * Add `.not` earlier in the chain to negate `.satisfy`.
     *
     *     expect(1).to.not.satisfy(function(num) {
     *       return num > 2;
     *     });
     *
     * `.satisfy` accepts an optional `msg` argument which is a custom error
     * message to show when the assertion fails. The message can also be given as
     * the second argument to `expect`.
     *
     *     expect(1).to.satisfy(function(num) {
     *       return num > 2;
     *     }, 'nooo why fail??');
     *
     *     expect(1, 'nooo why fail??').to.satisfy(function(num) {
     *       return num > 2;
     *     });
     *
     * The alias `.satisfies` can be used interchangeably with `.satisfy`.
     *
     * @name satisfy
     * @alias satisfies
     * @param {Function} matcher
     * @param {String} msg _optional_
     * @namespace BDD
     * @api public
     */

    function satisfy(matcher, msg) {
      if (msg) flag(this, 'message', msg);
      var obj = flag(this, 'object');
      var result = matcher(obj);
      this.assert(result, 'expected #{this} to satisfy ' + _.objDisplay(matcher), 'expected #{this} to not satisfy' + _.objDisplay(matcher), flag(this, 'negate') ? false : true, result);
    }

    Assertion.addMethod('satisfy', satisfy);
    Assertion.addMethod('satisfies', satisfy);
    /**
     * ### .closeTo(expected, delta[, msg])
     *
     * Asserts that the target is a number that's within a given +/- `delta` range
     * of the given number `expected`. However, it's often best to assert that the
     * target is equal to its expected value.
     *
     *     // Recommended
     *     expect(1.5).to.equal(1.5);
     *
     *     // Not recommended
     *     expect(1.5).to.be.closeTo(1, 0.5);
     *     expect(1.5).to.be.closeTo(2, 0.5);
     *     expect(1.5).to.be.closeTo(1, 1);
     *
     * Add `.not` earlier in the chain to negate `.closeTo`.
     *
     *     expect(1.5).to.equal(1.5); // Recommended
     *     expect(1.5).to.not.be.closeTo(3, 1); // Not recommended
     *
     * `.closeTo` accepts an optional `msg` argument which is a custom error
     * message to show when the assertion fails. The message can also be given as
     * the second argument to `expect`.
     *
     *     expect(1.5).to.be.closeTo(3, 1, 'nooo why fail??');
     *     expect(1.5, 'nooo why fail??').to.be.closeTo(3, 1);
     *
     * The alias `.approximately` can be used interchangeably with `.closeTo`.
     *
     * @name closeTo
     * @alias approximately
     * @param {Number} expected
     * @param {Number} delta
     * @param {String} msg _optional_
     * @namespace BDD
     * @api public
     */

    function closeTo(expected, delta, msg) {
      if (msg) flag(this, 'message', msg);
      var obj = flag(this, 'object'),
          flagMsg = flag(this, 'message'),
          ssfi = flag(this, 'ssfi');
      new Assertion(obj, flagMsg, ssfi, true).is.a('number');

      if (typeof expected !== 'number' || typeof delta !== 'number') {
        flagMsg = flagMsg ? flagMsg + ': ' : '';
        throw new AssertionError(flagMsg + 'the arguments to closeTo or approximately must be numbers', undefined, ssfi);
      }

      this.assert(Math.abs(obj - expected) <= delta, 'expected #{this} to be close to ' + expected + ' +/- ' + delta, 'expected #{this} not to be close to ' + expected + ' +/- ' + delta);
    }

    Assertion.addMethod('closeTo', closeTo);
    Assertion.addMethod('approximately', closeTo); // Note: Duplicates are ignored if testing for inclusion instead of sameness.

    function isSubsetOf(subset, superset, cmp, contains, ordered) {
      if (!contains) {
        if (subset.length !== superset.length) return false;
        superset = superset.slice();
      }

      return subset.every(function (elem, idx) {
        if (ordered) return cmp ? cmp(elem, superset[idx]) : elem === superset[idx];

        if (!cmp) {
          var matchIdx = superset.indexOf(elem);
          if (matchIdx === -1) return false; // Remove match from superset so not counted twice if duplicate in subset.

          if (!contains) superset.splice(matchIdx, 1);
          return true;
        }

        return superset.some(function (elem2, matchIdx) {
          if (!cmp(elem, elem2)) return false; // Remove match from superset so not counted twice if duplicate in subset.

          if (!contains) superset.splice(matchIdx, 1);
          return true;
        });
      });
    }
    /**
     * ### .members(set[, msg])
     *
     * Asserts that the target array has the same members as the given array
     * `set`.
     *
     *     expect([1, 2, 3]).to.have.members([2, 1, 3]);
     *     expect([1, 2, 2]).to.have.members([2, 1, 2]);
     *
     * By default, members are compared using strict (`===`) equality. Add `.deep`
     * earlier in the chain to use deep equality instead. See the `deep-eql`
     * project page for info on the deep equality algorithm:
     * https://github.com/chaijs/deep-eql.
     *
     *     // Target array deeply (but not strictly) has member `{a: 1}`
     *     expect([{a: 1}]).to.have.deep.members([{a: 1}]);
     *     expect([{a: 1}]).to.not.have.members([{a: 1}]);
     *
     * By default, order doesn't matter. Add `.ordered` earlier in the chain to
     * require that members appear in the same order.
     *
     *     expect([1, 2, 3]).to.have.ordered.members([1, 2, 3]);
     *     expect([1, 2, 3]).to.have.members([2, 1, 3])
     *       .but.not.ordered.members([2, 1, 3]);
     *
     * By default, both arrays must be the same size. Add `.include` earlier in
     * the chain to require that the target's members be a superset of the
     * expected members. Note that duplicates are ignored in the subset when
     * `.include` is added.
     *
     *     // Target array is a superset of [1, 2] but not identical
     *     expect([1, 2, 3]).to.include.members([1, 2]);
     *     expect([1, 2, 3]).to.not.have.members([1, 2]);
     *
     *     // Duplicates in the subset are ignored
     *     expect([1, 2, 3]).to.include.members([1, 2, 2, 2]);
     *
     * `.deep`, `.ordered`, and `.include` can all be combined. However, if
     * `.include` and `.ordered` are combined, the ordering begins at the start of
     * both arrays.
     *
     *     expect([{a: 1}, {b: 2}, {c: 3}])
     *       .to.include.deep.ordered.members([{a: 1}, {b: 2}])
     *       .but.not.include.deep.ordered.members([{b: 2}, {c: 3}]);
     *
     * Add `.not` earlier in the chain to negate `.members`. However, it's
     * dangerous to do so. The problem is that it creates uncertain expectations
     * by asserting that the target array doesn't have all of the same members as
     * the given array `set` but may or may not have some of them. It's often best
     * to identify the exact output that's expected, and then write an assertion
     * that only accepts that exact output.
     *
     *     expect([1, 2]).to.not.include(3).and.not.include(4); // Recommended
     *     expect([1, 2]).to.not.have.members([3, 4]); // Not recommended
     *
     * `.members` accepts an optional `msg` argument which is a custom error
     * message to show when the assertion fails. The message can also be given as
     * the second argument to `expect`.
     *
     *     expect([1, 2]).to.have.members([1, 2, 3], 'nooo why fail??');
     *     expect([1, 2], 'nooo why fail??').to.have.members([1, 2, 3]);
     *
     * @name members
     * @param {Array} set
     * @param {String} msg _optional_
     * @namespace BDD
     * @api public
     */


    Assertion.addMethod('members', function (subset, msg) {
      if (msg) flag(this, 'message', msg);
      var obj = flag(this, 'object'),
          flagMsg = flag(this, 'message'),
          ssfi = flag(this, 'ssfi');
      new Assertion(obj, flagMsg, ssfi, true).to.be.an('array');
      new Assertion(subset, flagMsg, ssfi, true).to.be.an('array');
      var contains = flag(this, 'contains');
      var ordered = flag(this, 'ordered');
      var subject, failMsg, failNegateMsg;

      if (contains) {
        subject = ordered ? 'an ordered superset' : 'a superset';
        failMsg = 'expected #{this} to be ' + subject + ' of #{exp}';
        failNegateMsg = 'expected #{this} to not be ' + subject + ' of #{exp}';
      } else {
        subject = ordered ? 'ordered members' : 'members';
        failMsg = 'expected #{this} to have the same ' + subject + ' as #{exp}';
        failNegateMsg = 'expected #{this} to not have the same ' + subject + ' as #{exp}';
      }

      var cmp = flag(this, 'deep') ? _.eql : undefined;
      this.assert(isSubsetOf(subset, obj, cmp, contains, ordered), failMsg, failNegateMsg, subset, obj, true);
    });
    /**
     * ### .oneOf(list[, msg])
     *
     * Asserts that the target is a member of the given array `list`. However,
     * it's often best to assert that the target is equal to its expected value.
     *
     *     expect(1).to.equal(1); // Recommended
     *     expect(1).to.be.oneOf([1, 2, 3]); // Not recommended
     *
     * Comparisons are performed using strict (`===`) equality.
     *
     * Add `.not` earlier in the chain to negate `.oneOf`.
     *
     *     expect(1).to.equal(1); // Recommended
     *     expect(1).to.not.be.oneOf([2, 3, 4]); // Not recommended
     *
     * `.oneOf` accepts an optional `msg` argument which is a custom error message
     * to show when the assertion fails. The message can also be given as the
     * second argument to `expect`.
     *
     *     expect(1).to.be.oneOf([2, 3, 4], 'nooo why fail??');
     *     expect(1, 'nooo why fail??').to.be.oneOf([2, 3, 4]);
     *
     * @name oneOf
     * @param {Array<*>} list
     * @param {String} msg _optional_
     * @namespace BDD
     * @api public
     */

    function oneOf(list, msg) {
      if (msg) flag(this, 'message', msg);
      var expected = flag(this, 'object'),
          flagMsg = flag(this, 'message'),
          ssfi = flag(this, 'ssfi');
      new Assertion(list, flagMsg, ssfi, true).to.be.an('array');
      this.assert(list.indexOf(expected) > -1, 'expected #{this} to be one of #{exp}', 'expected #{this} to not be one of #{exp}', list, expected);
    }

    Assertion.addMethod('oneOf', oneOf);
    /**
     * ### .change(subject[, prop[, msg]])
     *
     * When one argument is provided, `.change` asserts that the given function
     * `subject` returns a different value when it's invoked before the target
     * function compared to when it's invoked afterward. However, it's often best
     * to assert that `subject` is equal to its expected value.
     *
     *     var dots = ''
     *       , addDot = function () { dots += '.'; }
     *       , getDots = function () { return dots; };
     *
     *     // Recommended
     *     expect(getDots()).to.equal('');
     *     addDot();
     *     expect(getDots()).to.equal('.');
     *
     *     // Not recommended
     *     expect(addDot).to.change(getDots);
     *
     * When two arguments are provided, `.change` asserts that the value of the
     * given object `subject`'s `prop` property is different before invoking the
     * target function compared to afterward.
     *
     *     var myObj = {dots: ''}
     *       , addDot = function () { myObj.dots += '.'; };
     *
     *     // Recommended
     *     expect(myObj).to.have.property('dots', '');
     *     addDot();
     *     expect(myObj).to.have.property('dots', '.');
     *
     *     // Not recommended
     *     expect(addDot).to.change(myObj, 'dots');
     *
     * Strict (`===`) equality is used to compare before and after values.
     *
     * Add `.not` earlier in the chain to negate `.change`.
     *
     *     var dots = ''
     *       , noop = function () {}
     *       , getDots = function () { return dots; };
     *
     *     expect(noop).to.not.change(getDots);
     *
     *     var myObj = {dots: ''}
     *       , noop = function () {};
     *
     *     expect(noop).to.not.change(myObj, 'dots');
     *
     * `.change` accepts an optional `msg` argument which is a custom error
     * message to show when the assertion fails. The message can also be given as
     * the second argument to `expect`. When not providing two arguments, always
     * use the second form.
     *
     *     var myObj = {dots: ''}
     *       , addDot = function () { myObj.dots += '.'; };
     *
     *     expect(addDot).to.not.change(myObj, 'dots', 'nooo why fail??');
     *
     *     var dots = ''
     *       , addDot = function () { dots += '.'; }
     *       , getDots = function () { return dots; };
     *
     *     expect(addDot, 'nooo why fail??').to.not.change(getDots);
     *
     * `.change` also causes all `.by` assertions that follow in the chain to
     * assert how much a numeric subject was increased or decreased by. However,
     * it's dangerous to use `.change.by`. The problem is that it creates
     * uncertain expectations by asserting that the subject either increases by
     * the given delta, or that it decreases by the given delta. It's often best
     * to identify the exact output that's expected, and then write an assertion
     * that only accepts that exact output.
     *
     *     var myObj = {val: 1}
     *       , addTwo = function () { myObj.val += 2; }
     *       , subtractTwo = function () { myObj.val -= 2; };
     *
     *     expect(addTwo).to.increase(myObj, 'val').by(2); // Recommended
     *     expect(addTwo).to.change(myObj, 'val').by(2); // Not recommended
     *
     *     expect(subtractTwo).to.decrease(myObj, 'val').by(2); // Recommended
     *     expect(subtractTwo).to.change(myObj, 'val').by(2); // Not recommended
     *
     * The alias `.changes` can be used interchangeably with `.change`.
     *
     * @name change
     * @alias changes
     * @param {String} subject
     * @param {String} prop name _optional_
     * @param {String} msg _optional_
     * @namespace BDD
     * @api public
     */

    function assertChanges(subject, prop, msg) {
      if (msg) flag(this, 'message', msg);
      var fn = flag(this, 'object'),
          flagMsg = flag(this, 'message'),
          ssfi = flag(this, 'ssfi');
      new Assertion(fn, flagMsg, ssfi, true).is.a('function');
      var initial;

      if (!prop) {
        new Assertion(subject, flagMsg, ssfi, true).is.a('function');
        initial = subject();
      } else {
        new Assertion(subject, flagMsg, ssfi, true).to.have.property(prop);
        initial = subject[prop];
      }

      fn();
      var final = prop === undefined || prop === null ? subject() : subject[prop];
      var msgObj = prop === undefined || prop === null ? initial : '.' + prop; // This gets flagged because of the .by(delta) assertion

      flag(this, 'deltaMsgObj', msgObj);
      flag(this, 'initialDeltaValue', initial);
      flag(this, 'finalDeltaValue', final);
      flag(this, 'deltaBehavior', 'change');
      flag(this, 'realDelta', final !== initial);
      this.assert(initial !== final, 'expected ' + msgObj + ' to change', 'expected ' + msgObj + ' to not change');
    }

    Assertion.addMethod('change', assertChanges);
    Assertion.addMethod('changes', assertChanges);
    /**
     * ### .increase(subject[, prop[, msg]])
     *
     * When one argument is provided, `.increase` asserts that the given function
     * `subject` returns a greater number when it's invoked after invoking the
     * target function compared to when it's invoked beforehand. `.increase` also
     * causes all `.by` assertions that follow in the chain to assert how much
     * greater of a number is returned. It's often best to assert that the return
     * value increased by the expected amount, rather than asserting it increased
     * by any amount.
     *
     *     var val = 1
     *       , addTwo = function () { val += 2; }
     *       , getVal = function () { return val; };
     *
     *     expect(addTwo).to.increase(getVal).by(2); // Recommended
     *     expect(addTwo).to.increase(getVal); // Not recommended
     *
     * When two arguments are provided, `.increase` asserts that the value of the
     * given object `subject`'s `prop` property is greater after invoking the
     * target function compared to beforehand.
     *
     *     var myObj = {val: 1}
     *       , addTwo = function () { myObj.val += 2; };
     *
     *     expect(addTwo).to.increase(myObj, 'val').by(2); // Recommended
     *     expect(addTwo).to.increase(myObj, 'val'); // Not recommended
     *
     * Add `.not` earlier in the chain to negate `.increase`. However, it's
     * dangerous to do so. The problem is that it creates uncertain expectations
     * by asserting that the subject either decreases, or that it stays the same.
     * It's often best to identify the exact output that's expected, and then
     * write an assertion that only accepts that exact output.
     *
     * When the subject is expected to decrease, it's often best to assert that it
     * decreased by the expected amount.
     *
     *     var myObj = {val: 1}
     *       , subtractTwo = function () { myObj.val -= 2; };
     *
     *     expect(subtractTwo).to.decrease(myObj, 'val').by(2); // Recommended
     *     expect(subtractTwo).to.not.increase(myObj, 'val'); // Not recommended
     * 
     * When the subject is expected to stay the same, it's often best to assert
     * exactly that.
     *
     *     var myObj = {val: 1}
     *       , noop = function () {};
     *
     *     expect(noop).to.not.change(myObj, 'val'); // Recommended
     *     expect(noop).to.not.increase(myObj, 'val'); // Not recommended
     *
     * `.increase` accepts an optional `msg` argument which is a custom error
     * message to show when the assertion fails. The message can also be given as
     * the second argument to `expect`. When not providing two arguments, always
     * use the second form.
     *
     *     var myObj = {val: 1}
     *       , noop = function () {};
     *
     *     expect(noop).to.increase(myObj, 'val', 'nooo why fail??');
     *
     *     var val = 1
     *       , noop = function () {}
     *       , getVal = function () { return val; };
     *
     *     expect(noop, 'nooo why fail??').to.increase(getVal);
     *
     * The alias `.increases` can be used interchangeably with `.increase`.
     *
     * @name increase
     * @alias increases
     * @param {String|Function} subject
     * @param {String} prop name _optional_
     * @param {String} msg _optional_
     * @namespace BDD
     * @api public
     */

    function assertIncreases(subject, prop, msg) {
      if (msg) flag(this, 'message', msg);
      var fn = flag(this, 'object'),
          flagMsg = flag(this, 'message'),
          ssfi = flag(this, 'ssfi');
      new Assertion(fn, flagMsg, ssfi, true).is.a('function');
      var initial;

      if (!prop) {
        new Assertion(subject, flagMsg, ssfi, true).is.a('function');
        initial = subject();
      } else {
        new Assertion(subject, flagMsg, ssfi, true).to.have.property(prop);
        initial = subject[prop];
      } // Make sure that the target is a number


      new Assertion(initial, flagMsg, ssfi, true).is.a('number');
      fn();
      var final = prop === undefined || prop === null ? subject() : subject[prop];
      var msgObj = prop === undefined || prop === null ? initial : '.' + prop;
      flag(this, 'deltaMsgObj', msgObj);
      flag(this, 'initialDeltaValue', initial);
      flag(this, 'finalDeltaValue', final);
      flag(this, 'deltaBehavior', 'increase');
      flag(this, 'realDelta', final - initial);
      this.assert(final - initial > 0, 'expected ' + msgObj + ' to increase', 'expected ' + msgObj + ' to not increase');
    }

    Assertion.addMethod('increase', assertIncreases);
    Assertion.addMethod('increases', assertIncreases);
    /**
     * ### .decrease(subject[, prop[, msg]])
     *
     * When one argument is provided, `.decrease` asserts that the given function
     * `subject` returns a lesser number when it's invoked after invoking the
     * target function compared to when it's invoked beforehand. `.decrease` also
     * causes all `.by` assertions that follow in the chain to assert how much
     * lesser of a number is returned. It's often best to assert that the return
     * value decreased by the expected amount, rather than asserting it decreased
     * by any amount.
     *
     *     var val = 1
     *       , subtractTwo = function () { val -= 2; }
     *       , getVal = function () { return val; };
     *
     *     expect(subtractTwo).to.decrease(getVal).by(2); // Recommended
     *     expect(subtractTwo).to.decrease(getVal); // Not recommended
     *
     * When two arguments are provided, `.decrease` asserts that the value of the
     * given object `subject`'s `prop` property is lesser after invoking the
     * target function compared to beforehand. 
     *
     *     var myObj = {val: 1}
     *       , subtractTwo = function () { myObj.val -= 2; };
     *
     *     expect(subtractTwo).to.decrease(myObj, 'val').by(2); // Recommended
     *     expect(subtractTwo).to.decrease(myObj, 'val'); // Not recommended
     *
     * Add `.not` earlier in the chain to negate `.decrease`. However, it's
     * dangerous to do so. The problem is that it creates uncertain expectations
     * by asserting that the subject either increases, or that it stays the same.
     * It's often best to identify the exact output that's expected, and then
     * write an assertion that only accepts that exact output.
     *
     * When the subject is expected to increase, it's often best to assert that it
     * increased by the expected amount.
     *
     *     var myObj = {val: 1}
     *       , addTwo = function () { myObj.val += 2; };
     *
     *     expect(addTwo).to.increase(myObj, 'val').by(2); // Recommended
     *     expect(addTwo).to.not.decrease(myObj, 'val'); // Not recommended
     * 
     * When the subject is expected to stay the same, it's often best to assert
     * exactly that.
     *
     *     var myObj = {val: 1}
     *       , noop = function () {};
     *
     *     expect(noop).to.not.change(myObj, 'val'); // Recommended
     *     expect(noop).to.not.decrease(myObj, 'val'); // Not recommended
     *
     * `.decrease` accepts an optional `msg` argument which is a custom error
     * message to show when the assertion fails. The message can also be given as
     * the second argument to `expect`. When not providing two arguments, always
     * use the second form.
     *
     *     var myObj = {val: 1}
     *       , noop = function () {};
     *
     *     expect(noop).to.decrease(myObj, 'val', 'nooo why fail??');
     *
     *     var val = 1
     *       , noop = function () {}
     *       , getVal = function () { return val; };
     *
     *     expect(noop, 'nooo why fail??').to.decrease(getVal);
     *
     * The alias `.decreases` can be used interchangeably with `.decrease`.
     *
     * @name decrease
     * @alias decreases
     * @param {String|Function} subject
     * @param {String} prop name _optional_
     * @param {String} msg _optional_
     * @namespace BDD
     * @api public
     */

    function assertDecreases(subject, prop, msg) {
      if (msg) flag(this, 'message', msg);
      var fn = flag(this, 'object'),
          flagMsg = flag(this, 'message'),
          ssfi = flag(this, 'ssfi');
      new Assertion(fn, flagMsg, ssfi, true).is.a('function');
      var initial;

      if (!prop) {
        new Assertion(subject, flagMsg, ssfi, true).is.a('function');
        initial = subject();
      } else {
        new Assertion(subject, flagMsg, ssfi, true).to.have.property(prop);
        initial = subject[prop];
      } // Make sure that the target is a number


      new Assertion(initial, flagMsg, ssfi, true).is.a('number');
      fn();
      var final = prop === undefined || prop === null ? subject() : subject[prop];
      var msgObj = prop === undefined || prop === null ? initial : '.' + prop;
      flag(this, 'deltaMsgObj', msgObj);
      flag(this, 'initialDeltaValue', initial);
      flag(this, 'finalDeltaValue', final);
      flag(this, 'deltaBehavior', 'decrease');
      flag(this, 'realDelta', initial - final);
      this.assert(final - initial < 0, 'expected ' + msgObj + ' to decrease', 'expected ' + msgObj + ' to not decrease');
    }

    Assertion.addMethod('decrease', assertDecreases);
    Assertion.addMethod('decreases', assertDecreases);
    /**
     * ### .by(delta[, msg])
     *
     * When following an `.increase` assertion in the chain, `.by` asserts that
     * the subject of the `.increase` assertion increased by the given `delta`.
     *
     *     var myObj = {val: 1}
     *       , addTwo = function () { myObj.val += 2; };
     *
     *     expect(addTwo).to.increase(myObj, 'val').by(2);
     *
     * When following a `.decrease` assertion in the chain, `.by` asserts that the
     * subject of the `.decrease` assertion decreased by the given `delta`.
     *
     *     var myObj = {val: 1}
     *       , subtractTwo = function () { myObj.val -= 2; };
     *
     *     expect(subtractTwo).to.decrease(myObj, 'val').by(2);
     *
     * When following a `.change` assertion in the chain, `.by` asserts that the
     * subject of the `.change` assertion either increased or decreased by the
     * given `delta`. However, it's dangerous to use `.change.by`. The problem is
     * that it creates uncertain expectations. It's often best to identify the
     * exact output that's expected, and then write an assertion that only accepts
     * that exact output.
     *
     *     var myObj = {val: 1}
     *       , addTwo = function () { myObj.val += 2; }
     *       , subtractTwo = function () { myObj.val -= 2; };
     *
     *     expect(addTwo).to.increase(myObj, 'val').by(2); // Recommended
     *     expect(addTwo).to.change(myObj, 'val').by(2); // Not recommended
     *
     *     expect(subtractTwo).to.decrease(myObj, 'val').by(2); // Recommended
     *     expect(subtractTwo).to.change(myObj, 'val').by(2); // Not recommended
     *
     * Add `.not` earlier in the chain to negate `.by`. However, it's often best
     * to assert that the subject changed by its expected delta, rather than
     * asserting that it didn't change by one of countless unexpected deltas.
     *
     *     var myObj = {val: 1}
     *       , addTwo = function () { myObj.val += 2; };
     *
     *     // Recommended
     *     expect(addTwo).to.increase(myObj, 'val').by(2);
     *
     *     // Not recommended
     *     expect(addTwo).to.increase(myObj, 'val').but.not.by(3);
     *
     * `.by` accepts an optional `msg` argument which is a custom error message to
     * show when the assertion fails. The message can also be given as the second
     * argument to `expect`.
     *
     *     var myObj = {val: 1}
     *       , addTwo = function () { myObj.val += 2; };
     *
     *     expect(addTwo).to.increase(myObj, 'val').by(3, 'nooo why fail??');
     *     expect(addTwo, 'nooo why fail??').to.increase(myObj, 'val').by(3);
     *
     * @name by
     * @param {Number} delta
     * @param {String} msg _optional_
     * @namespace BDD
     * @api public
     */

    function assertDelta(delta, msg) {
      if (msg) flag(this, 'message', msg);
      var msgObj = flag(this, 'deltaMsgObj');
      var initial = flag(this, 'initialDeltaValue');
      var final = flag(this, 'finalDeltaValue');
      var behavior = flag(this, 'deltaBehavior');
      var realDelta = flag(this, 'realDelta');
      var expression;

      if (behavior === 'change') {
        expression = Math.abs(final - initial) === Math.abs(delta);
      } else {
        expression = realDelta === Math.abs(delta);
      }

      this.assert(expression, 'expected ' + msgObj + ' to ' + behavior + ' by ' + delta, 'expected ' + msgObj + ' to not ' + behavior + ' by ' + delta);
    }

    Assertion.addMethod('by', assertDelta);
    /**
     * ### .extensible
     *
     * Asserts that the target is extensible, which means that new properties can
     * be added to it. Primitives are never extensible.
     *
     *     expect({a: 1}).to.be.extensible;
     *
     * Add `.not` earlier in the chain to negate `.extensible`.
     *
     *     var nonExtensibleObject = Object.preventExtensions({})
     *       , sealedObject = Object.seal({})
     *       , frozenObject = Object.freeze({});
     *
     *     expect(nonExtensibleObject).to.not.be.extensible;
     *     expect(sealedObject).to.not.be.extensible;
     *     expect(frozenObject).to.not.be.extensible;
     *     expect(1).to.not.be.extensible;
     *
     * A custom error message can be given as the second argument to `expect`.
     *
     *     expect(1, 'nooo why fail??').to.be.extensible;
     *
     * @name extensible
     * @namespace BDD
     * @api public
     */

    Assertion.addProperty('extensible', function () {
      var obj = flag(this, 'object'); // In ES5, if the argument to this method is a primitive, then it will cause a TypeError.
      // In ES6, a non-object argument will be treated as if it was a non-extensible ordinary object, simply return false.
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/isExtensible
      // The following provides ES6 behavior for ES5 environments.

      var isExtensible = obj === Object(obj) && Object.isExtensible(obj);
      this.assert(isExtensible, 'expected #{this} to be extensible', 'expected #{this} to not be extensible');
    });
    /**
     * ### .sealed
     *
     * Asserts that the target is sealed, which means that new properties can't be
     * added to it, and its existing properties can't be reconfigured or deleted.
     * However, it's possible that its existing properties can still be reassigned
     * to different values. Primitives are always sealed.
     *
     *     var sealedObject = Object.seal({});
     *     var frozenObject = Object.freeze({});
     *
     *     expect(sealedObject).to.be.sealed;
     *     expect(frozenObject).to.be.sealed;
     *     expect(1).to.be.sealed;
     *
     * Add `.not` earlier in the chain to negate `.sealed`.
     *
     *     expect({a: 1}).to.not.be.sealed;
     *
     * A custom error message can be given as the second argument to `expect`.
     *
     *     expect({a: 1}, 'nooo why fail??').to.be.sealed;
     *
     * @name sealed
     * @namespace BDD
     * @api public
     */

    Assertion.addProperty('sealed', function () {
      var obj = flag(this, 'object'); // In ES5, if the argument to this method is a primitive, then it will cause a TypeError.
      // In ES6, a non-object argument will be treated as if it was a sealed ordinary object, simply return true.
      // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/isSealed
      // The following provides ES6 behavior for ES5 environments.

      var isSealed = obj === Object(obj) ? Object.isSealed(obj) : true;
      this.assert(isSealed, 'expected #{this} to be sealed', 'expected #{this} to not be sealed');
    });
    /**
     * ### .frozen
     *
     * Asserts that the target is frozen, which means that new properties can't be
     * added to it, and its existing properties can't be reassigned to different
     * values, reconfigured, or deleted. Primitives are always frozen.
     *
     *     var frozenObject = Object.freeze({});
     *
     *     expect(frozenObject).to.be.frozen;
     *     expect(1).to.be.frozen;
     *
     * Add `.not` earlier in the chain to negate `.frozen`.
     *
     *     expect({a: 1}).to.not.be.frozen;
     *
     * A custom error message can be given as the second argument to `expect`.
     *
     *     expect({a: 1}, 'nooo why fail??').to.be.frozen;
     *
     * @name frozen
     * @namespace BDD
     * @api public
     */

    Assertion.addProperty('frozen', function () {
      var obj = flag(this, 'object'); // In ES5, if the argument to this method is a primitive, then it will cause a TypeError.
      // In ES6, a non-object argument will be treated as if it was a frozen ordinary object, simply return true.
      // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/isFrozen
      // The following provides ES6 behavior for ES5 environments.

      var isFrozen = obj === Object(obj) ? Object.isFrozen(obj) : true;
      this.assert(isFrozen, 'expected #{this} to be frozen', 'expected #{this} to not be frozen');
    });
    /**
     * ### .finite
     *
     * Asserts that the target is a number, and isn't `NaN` or positive/negative
     * `Infinity`.
     *
     *     expect(1).to.be.finite;
     *
     * Add `.not` earlier in the chain to negate `.finite`. However, it's
     * dangerous to do so. The problem is that it creates uncertain expectations
     * by asserting that the subject either isn't a number, or that it's `NaN`, or
     * that it's positive `Infinity`, or that it's negative `Infinity`. It's often
     * best to identify the exact output that's expected, and then write an
     * assertion that only accepts that exact output.
     *
     * When the target isn't expected to be a number, it's often best to assert
     * that it's the expected type, rather than asserting that it isn't one of
     * many unexpected types.
     *
     *     expect('foo').to.be.a('string'); // Recommended
     *     expect('foo').to.not.be.finite; // Not recommended
     *
     * When the target is expected to be `NaN`, it's often best to assert exactly
     * that.
     *
     *     expect(NaN).to.be.NaN; // Recommended
     *     expect(NaN).to.not.be.finite; // Not recommended
     *
     * When the target is expected to be positive infinity, it's often best to
     * assert exactly that.
     *
     *     expect(Infinity).to.equal(Infinity); // Recommended
     *     expect(Infinity).to.not.be.finite; // Not recommended
     *
     * When the target is expected to be negative infinity, it's often best to
     * assert exactly that.
     *
     *     expect(-Infinity).to.equal(-Infinity); // Recommended
     *     expect(-Infinity).to.not.be.finite; // Not recommended
     *
     * A custom error message can be given as the second argument to `expect`.
     *
     *     expect('foo', 'nooo why fail??').to.be.finite;
     *
     * @name finite
     * @namespace BDD
     * @api public
     */

    Assertion.addProperty('finite', function (msg) {
      var obj = flag(this, 'object');
      this.assert(typeof obj === "number" && isFinite(obj), 'expected #{this} to be a finite number', 'expected #{this} to not be a finite number');
    });
  };

  /*!
   * chai
   * Copyright(c) 2011-2014 Jake Luer <jake@alogicalparadox.com>
   * MIT Licensed
   */
  var expect = function (chai, util) {
    chai.expect = function (val, message) {
      return new chai.Assertion(val, message);
    };
    /**
     * ### .fail(actual, expected, [message], [operator])
     *
     * Throw a failure.
     *
     * @name fail
     * @param {Mixed} actual
     * @param {Mixed} expected
     * @param {String} message
     * @param {String} operator
     * @namespace BDD
     * @api public
     */


    chai.expect.fail = function (actual, expected, message, operator) {
      message = message || 'expect.fail()';
      throw new chai.AssertionError(message, {
        actual: actual,
        expected: expected,
        operator: operator
      }, chai.expect.fail);
    };
  };

  /*!
   * chai
   * Copyright(c) 2011-2014 Jake Luer <jake@alogicalparadox.com>
   * MIT Licensed
   */
  var should = function (chai, util) {
    var Assertion = chai.Assertion;

    function loadShould() {
      // explicitly define this method as function as to have it's name to include as `ssfi`
      function shouldGetter() {
        if (this instanceof String || this instanceof Number || this instanceof Boolean || typeof Symbol === 'function' && this instanceof Symbol) {
          return new Assertion(this.valueOf(), null, shouldGetter);
        }

        return new Assertion(this, null, shouldGetter);
      }

      function shouldSetter(value) {
        // See https://github.com/chaijs/chai/issues/86: this makes
        // `whatever.should = someValue` actually set `someValue`, which is
        // especially useful for `global.should = require('chai').should()`.
        //
        // Note that we have to use [[DefineProperty]] instead of [[Put]]
        // since otherwise we would trigger this very setter!
        Object.defineProperty(this, 'should', {
          value: value,
          enumerable: true,
          configurable: true,
          writable: true
        });
      } // modify Object.prototype to have `should`


      Object.defineProperty(Object.prototype, 'should', {
        set: shouldSetter,
        get: shouldGetter,
        configurable: true
      });
      var should = {};
      /**
       * ### .fail(actual, expected, [message], [operator])
       *
       * Throw a failure.
       *
       * @name fail
       * @param {Mixed} actual
       * @param {Mixed} expected
       * @param {String} message
       * @param {String} operator
       * @namespace BDD
       * @api public
       */

      should.fail = function (actual, expected, message, operator) {
        message = message || 'should.fail()';
        throw new chai.AssertionError(message, {
          actual: actual,
          expected: expected,
          operator: operator
        }, should.fail);
      };
      /**
       * ### .equal(actual, expected, [message])
       *
       * Asserts non-strict equality (`==`) of `actual` and `expected`.
       *
       *     should.equal(3, '3', '== coerces values to strings');
       *
       * @name equal
       * @param {Mixed} actual
       * @param {Mixed} expected
       * @param {String} message
       * @namespace Should
       * @api public
       */


      should.equal = function (val1, val2, msg) {
        new Assertion(val1, msg).to.equal(val2);
      };
      /**
       * ### .throw(function, [constructor/string/regexp], [string/regexp], [message])
       *
       * Asserts that `function` will throw an error that is an instance of
       * `constructor`, or alternately that it will throw an error with message
       * matching `regexp`.
       *
       *     should.throw(fn, 'function throws a reference error');
       *     should.throw(fn, /function throws a reference error/);
       *     should.throw(fn, ReferenceError);
       *     should.throw(fn, ReferenceError, 'function throws a reference error');
       *     should.throw(fn, ReferenceError, /function throws a reference error/);
       *
       * @name throw
       * @alias Throw
       * @param {Function} function
       * @param {ErrorConstructor} constructor
       * @param {RegExp} regexp
       * @param {String} message
       * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error#Error_types
       * @namespace Should
       * @api public
       */


      should.Throw = function (fn, errt, errs, msg) {
        new Assertion(fn, msg).to.Throw(errt, errs);
      };
      /**
       * ### .exist
       *
       * Asserts that the target is neither `null` nor `undefined`.
       *
       *     var foo = 'hi';
       *
       *     should.exist(foo, 'foo exists');
       *
       * @name exist
       * @namespace Should
       * @api public
       */


      should.exist = function (val, msg) {
        new Assertion(val, msg).to.exist;
      }; // negation


      should.not = {};
      /**
       * ### .not.equal(actual, expected, [message])
       *
       * Asserts non-strict inequality (`!=`) of `actual` and `expected`.
       *
       *     should.not.equal(3, 4, 'these numbers are not equal');
       *
       * @name not.equal
       * @param {Mixed} actual
       * @param {Mixed} expected
       * @param {String} message
       * @namespace Should
       * @api public
       */

      should.not.equal = function (val1, val2, msg) {
        new Assertion(val1, msg).to.not.equal(val2);
      };
      /**
       * ### .throw(function, [constructor/regexp], [message])
       *
       * Asserts that `function` will _not_ throw an error that is an instance of
       * `constructor`, or alternately that it will not throw an error with message
       * matching `regexp`.
       *
       *     should.not.throw(fn, Error, 'function does not throw');
       *
       * @name not.throw
       * @alias not.Throw
       * @param {Function} function
       * @param {ErrorConstructor} constructor
       * @param {RegExp} regexp
       * @param {String} message
       * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error#Error_types
       * @namespace Should
       * @api public
       */


      should.not.Throw = function (fn, errt, errs, msg) {
        new Assertion(fn, msg).to.not.Throw(errt, errs);
      };
      /**
       * ### .not.exist
       *
       * Asserts that the target is neither `null` nor `undefined`.
       *
       *     var bar = null;
       *
       *     should.not.exist(bar, 'bar does not exist');
       *
       * @name not.exist
       * @namespace Should
       * @api public
       */


      should.not.exist = function (val, msg) {
        new Assertion(val, msg).to.not.exist;
      };

      should['throw'] = should['Throw'];
      should.not['throw'] = should.not['Throw'];
      return should;
    }
    chai.should = loadShould;
    chai.Should = loadShould;
  };

  /*!
   * chai
   * Copyright(c) 2011-2014 Jake Luer <jake@alogicalparadox.com>
   * MIT Licensed
   */
  var assert = function (chai, util) {
    /*!
     * Chai dependencies.
     */
    var Assertion = chai.Assertion,
        flag = util.flag;
    /*!
     * Module export.
     */

    /**
     * ### assert(expression, message)
     *
     * Write your own test expressions.
     *
     *     assert('foo' !== 'bar', 'foo is not bar');
     *     assert(Array.isArray([]), 'empty arrays are arrays');
     *
     * @param {Mixed} expression to test for truthiness
     * @param {String} message to display on error
     * @name assert
     * @namespace Assert
     * @api public
     */

    var assert = chai.assert = function (express, errmsg) {
      var test = new Assertion(null, null, chai.assert, true);
      test.assert(express, errmsg, '[ negation message unavailable ]');
    };
    /**
     * ### .fail(actual, expected, [message], [operator])
     *
     * Throw a failure. Node.js `assert` module-compatible.
     *
     * @name fail
     * @param {Mixed} actual
     * @param {Mixed} expected
     * @param {String} message
     * @param {String} operator
     * @namespace Assert
     * @api public
     */


    assert.fail = function (actual, expected, message, operator) {
      message = message || 'assert.fail()';
      throw new chai.AssertionError(message, {
        actual: actual,
        expected: expected,
        operator: operator
      }, assert.fail);
    };
    /**
     * ### .isOk(object, [message])
     *
     * Asserts that `object` is truthy.
     *
     *     assert.isOk('everything', 'everything is ok');
     *     assert.isOk(false, 'this will fail');
     *
     * @name isOk
     * @alias ok
     * @param {Mixed} object to test
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.isOk = function (val, msg) {
      new Assertion(val, msg, assert.isOk, true).is.ok;
    };
    /**
     * ### .isNotOk(object, [message])
     *
     * Asserts that `object` is falsy.
     *
     *     assert.isNotOk('everything', 'this will fail');
     *     assert.isNotOk(false, 'this will pass');
     *
     * @name isNotOk
     * @alias notOk
     * @param {Mixed} object to test
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.isNotOk = function (val, msg) {
      new Assertion(val, msg, assert.isNotOk, true).is.not.ok;
    };
    /**
     * ### .equal(actual, expected, [message])
     *
     * Asserts non-strict equality (`==`) of `actual` and `expected`.
     *
     *     assert.equal(3, '3', '== coerces values to strings');
     *
     * @name equal
     * @param {Mixed} actual
     * @param {Mixed} expected
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.equal = function (act, exp, msg) {
      var test = new Assertion(act, msg, assert.equal, true);
      test.assert(exp == flag(test, 'object'), 'expected #{this} to equal #{exp}', 'expected #{this} to not equal #{act}', exp, act, true);
    };
    /**
     * ### .notEqual(actual, expected, [message])
     *
     * Asserts non-strict inequality (`!=`) of `actual` and `expected`.
     *
     *     assert.notEqual(3, 4, 'these numbers are not equal');
     *
     * @name notEqual
     * @param {Mixed} actual
     * @param {Mixed} expected
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.notEqual = function (act, exp, msg) {
      var test = new Assertion(act, msg, assert.notEqual, true);
      test.assert(exp != flag(test, 'object'), 'expected #{this} to not equal #{exp}', 'expected #{this} to equal #{act}', exp, act, true);
    };
    /**
     * ### .strictEqual(actual, expected, [message])
     *
     * Asserts strict equality (`===`) of `actual` and `expected`.
     *
     *     assert.strictEqual(true, true, 'these booleans are strictly equal');
     *
     * @name strictEqual
     * @param {Mixed} actual
     * @param {Mixed} expected
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.strictEqual = function (act, exp, msg) {
      new Assertion(act, msg, assert.strictEqual, true).to.equal(exp);
    };
    /**
     * ### .notStrictEqual(actual, expected, [message])
     *
     * Asserts strict inequality (`!==`) of `actual` and `expected`.
     *
     *     assert.notStrictEqual(3, '3', 'no coercion for strict equality');
     *
     * @name notStrictEqual
     * @param {Mixed} actual
     * @param {Mixed} expected
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.notStrictEqual = function (act, exp, msg) {
      new Assertion(act, msg, assert.notStrictEqual, true).to.not.equal(exp);
    };
    /**
     * ### .deepEqual(actual, expected, [message])
     *
     * Asserts that `actual` is deeply equal to `expected`.
     *
     *     assert.deepEqual({ tea: 'green' }, { tea: 'green' });
     *
     * @name deepEqual
     * @param {Mixed} actual
     * @param {Mixed} expected
     * @param {String} message
     * @alias deepStrictEqual
     * @namespace Assert
     * @api public
     */


    assert.deepEqual = assert.deepStrictEqual = function (act, exp, msg) {
      new Assertion(act, msg, assert.deepEqual, true).to.eql(exp);
    };
    /**
     * ### .notDeepEqual(actual, expected, [message])
     *
     * Assert that `actual` is not deeply equal to `expected`.
     *
     *     assert.notDeepEqual({ tea: 'green' }, { tea: 'jasmine' });
     *
     * @name notDeepEqual
     * @param {Mixed} actual
     * @param {Mixed} expected
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.notDeepEqual = function (act, exp, msg) {
      new Assertion(act, msg, assert.notDeepEqual, true).to.not.eql(exp);
    };
    /**
    * ### .isAbove(valueToCheck, valueToBeAbove, [message])
    *
    * Asserts `valueToCheck` is strictly greater than (>) `valueToBeAbove`.
    *
    *     assert.isAbove(5, 2, '5 is strictly greater than 2');
    *
    * @name isAbove
    * @param {Mixed} valueToCheck
    * @param {Mixed} valueToBeAbove
    * @param {String} message
    * @namespace Assert
    * @api public
    */


    assert.isAbove = function (val, abv, msg) {
      new Assertion(val, msg, assert.isAbove, true).to.be.above(abv);
    };
    /**
    * ### .isAtLeast(valueToCheck, valueToBeAtLeast, [message])
    *
    * Asserts `valueToCheck` is greater than or equal to (>=) `valueToBeAtLeast`.
    *
    *     assert.isAtLeast(5, 2, '5 is greater or equal to 2');
    *     assert.isAtLeast(3, 3, '3 is greater or equal to 3');
    *
    * @name isAtLeast
    * @param {Mixed} valueToCheck
    * @param {Mixed} valueToBeAtLeast
    * @param {String} message
    * @namespace Assert
    * @api public
    */


    assert.isAtLeast = function (val, atlst, msg) {
      new Assertion(val, msg, assert.isAtLeast, true).to.be.least(atlst);
    };
    /**
    * ### .isBelow(valueToCheck, valueToBeBelow, [message])
    *
    * Asserts `valueToCheck` is strictly less than (<) `valueToBeBelow`.
    *
    *     assert.isBelow(3, 6, '3 is strictly less than 6');
    *
    * @name isBelow
    * @param {Mixed} valueToCheck
    * @param {Mixed} valueToBeBelow
    * @param {String} message
    * @namespace Assert
    * @api public
    */


    assert.isBelow = function (val, blw, msg) {
      new Assertion(val, msg, assert.isBelow, true).to.be.below(blw);
    };
    /**
    * ### .isAtMost(valueToCheck, valueToBeAtMost, [message])
    *
    * Asserts `valueToCheck` is less than or equal to (<=) `valueToBeAtMost`.
    *
    *     assert.isAtMost(3, 6, '3 is less than or equal to 6');
    *     assert.isAtMost(4, 4, '4 is less than or equal to 4');
    *
    * @name isAtMost
    * @param {Mixed} valueToCheck
    * @param {Mixed} valueToBeAtMost
    * @param {String} message
    * @namespace Assert
    * @api public
    */


    assert.isAtMost = function (val, atmst, msg) {
      new Assertion(val, msg, assert.isAtMost, true).to.be.most(atmst);
    };
    /**
     * ### .isTrue(value, [message])
     *
     * Asserts that `value` is true.
     *
     *     var teaServed = true;
     *     assert.isTrue(teaServed, 'the tea has been served');
     *
     * @name isTrue
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.isTrue = function (val, msg) {
      new Assertion(val, msg, assert.isTrue, true).is['true'];
    };
    /**
     * ### .isNotTrue(value, [message])
     *
     * Asserts that `value` is not true.
     *
     *     var tea = 'tasty chai';
     *     assert.isNotTrue(tea, 'great, time for tea!');
     *
     * @name isNotTrue
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.isNotTrue = function (val, msg) {
      new Assertion(val, msg, assert.isNotTrue, true).to.not.equal(true);
    };
    /**
     * ### .isFalse(value, [message])
     *
     * Asserts that `value` is false.
     *
     *     var teaServed = false;
     *     assert.isFalse(teaServed, 'no tea yet? hmm...');
     *
     * @name isFalse
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.isFalse = function (val, msg) {
      new Assertion(val, msg, assert.isFalse, true).is['false'];
    };
    /**
     * ### .isNotFalse(value, [message])
     *
     * Asserts that `value` is not false.
     *
     *     var tea = 'tasty chai';
     *     assert.isNotFalse(tea, 'great, time for tea!');
     *
     * @name isNotFalse
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.isNotFalse = function (val, msg) {
      new Assertion(val, msg, assert.isNotFalse, true).to.not.equal(false);
    };
    /**
     * ### .isNull(value, [message])
     *
     * Asserts that `value` is null.
     *
     *     assert.isNull(err, 'there was no error');
     *
     * @name isNull
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.isNull = function (val, msg) {
      new Assertion(val, msg, assert.isNull, true).to.equal(null);
    };
    /**
     * ### .isNotNull(value, [message])
     *
     * Asserts that `value` is not null.
     *
     *     var tea = 'tasty chai';
     *     assert.isNotNull(tea, 'great, time for tea!');
     *
     * @name isNotNull
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.isNotNull = function (val, msg) {
      new Assertion(val, msg, assert.isNotNull, true).to.not.equal(null);
    };
    /**
     * ### .isNaN
     *
     * Asserts that value is NaN.
     *
     *     assert.isNaN(NaN, 'NaN is NaN');
     *
     * @name isNaN
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.isNaN = function (val, msg) {
      new Assertion(val, msg, assert.isNaN, true).to.be.NaN;
    };
    /**
     * ### .isNotNaN
     *
     * Asserts that value is not NaN.
     *
     *     assert.isNotNaN(4, '4 is not NaN');
     *
     * @name isNotNaN
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.isNotNaN = function (val, msg) {
      new Assertion(val, msg, assert.isNotNaN, true).not.to.be.NaN;
    };
    /**
     * ### .exists
     *
     * Asserts that the target is neither `null` nor `undefined`.
     *
     *     var foo = 'hi';
     *
     *     assert.exists(foo, 'foo is neither `null` nor `undefined`');
     *
     * @name exists
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.exists = function (val, msg) {
      new Assertion(val, msg, assert.exists, true).to.exist;
    };
    /**
     * ### .notExists
     *
     * Asserts that the target is either `null` or `undefined`.
     *
     *     var bar = null
     *       , baz;
     *
     *     assert.notExists(bar);
     *     assert.notExists(baz, 'baz is either null or undefined');
     *
     * @name notExists
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.notExists = function (val, msg) {
      new Assertion(val, msg, assert.notExists, true).to.not.exist;
    };
    /**
     * ### .isUndefined(value, [message])
     *
     * Asserts that `value` is `undefined`.
     *
     *     var tea;
     *     assert.isUndefined(tea, 'no tea defined');
     *
     * @name isUndefined
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.isUndefined = function (val, msg) {
      new Assertion(val, msg, assert.isUndefined, true).to.equal(undefined);
    };
    /**
     * ### .isDefined(value, [message])
     *
     * Asserts that `value` is not `undefined`.
     *
     *     var tea = 'cup of chai';
     *     assert.isDefined(tea, 'tea has been defined');
     *
     * @name isDefined
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.isDefined = function (val, msg) {
      new Assertion(val, msg, assert.isDefined, true).to.not.equal(undefined);
    };
    /**
     * ### .isFunction(value, [message])
     *
     * Asserts that `value` is a function.
     *
     *     function serveTea() { return 'cup of tea'; };
     *     assert.isFunction(serveTea, 'great, we can have tea now');
     *
     * @name isFunction
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.isFunction = function (val, msg) {
      new Assertion(val, msg, assert.isFunction, true).to.be.a('function');
    };
    /**
     * ### .isNotFunction(value, [message])
     *
     * Asserts that `value` is _not_ a function.
     *
     *     var serveTea = [ 'heat', 'pour', 'sip' ];
     *     assert.isNotFunction(serveTea, 'great, we have listed the steps');
     *
     * @name isNotFunction
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.isNotFunction = function (val, msg) {
      new Assertion(val, msg, assert.isNotFunction, true).to.not.be.a('function');
    };
    /**
     * ### .isObject(value, [message])
     *
     * Asserts that `value` is an object of type 'Object' (as revealed by `Object.prototype.toString`).
     * _The assertion does not match subclassed objects._
     *
     *     var selection = { name: 'Chai', serve: 'with spices' };
     *     assert.isObject(selection, 'tea selection is an object');
     *
     * @name isObject
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.isObject = function (val, msg) {
      new Assertion(val, msg, assert.isObject, true).to.be.a('object');
    };
    /**
     * ### .isNotObject(value, [message])
     *
     * Asserts that `value` is _not_ an object of type 'Object' (as revealed by `Object.prototype.toString`).
     *
     *     var selection = 'chai'
     *     assert.isNotObject(selection, 'tea selection is not an object');
     *     assert.isNotObject(null, 'null is not an object');
     *
     * @name isNotObject
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.isNotObject = function (val, msg) {
      new Assertion(val, msg, assert.isNotObject, true).to.not.be.a('object');
    };
    /**
     * ### .isArray(value, [message])
     *
     * Asserts that `value` is an array.
     *
     *     var menu = [ 'green', 'chai', 'oolong' ];
     *     assert.isArray(menu, 'what kind of tea do we want?');
     *
     * @name isArray
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.isArray = function (val, msg) {
      new Assertion(val, msg, assert.isArray, true).to.be.an('array');
    };
    /**
     * ### .isNotArray(value, [message])
     *
     * Asserts that `value` is _not_ an array.
     *
     *     var menu = 'green|chai|oolong';
     *     assert.isNotArray(menu, 'what kind of tea do we want?');
     *
     * @name isNotArray
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.isNotArray = function (val, msg) {
      new Assertion(val, msg, assert.isNotArray, true).to.not.be.an('array');
    };
    /**
     * ### .isString(value, [message])
     *
     * Asserts that `value` is a string.
     *
     *     var teaOrder = 'chai';
     *     assert.isString(teaOrder, 'order placed');
     *
     * @name isString
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.isString = function (val, msg) {
      new Assertion(val, msg, assert.isString, true).to.be.a('string');
    };
    /**
     * ### .isNotString(value, [message])
     *
     * Asserts that `value` is _not_ a string.
     *
     *     var teaOrder = 4;
     *     assert.isNotString(teaOrder, 'order placed');
     *
     * @name isNotString
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.isNotString = function (val, msg) {
      new Assertion(val, msg, assert.isNotString, true).to.not.be.a('string');
    };
    /**
     * ### .isNumber(value, [message])
     *
     * Asserts that `value` is a number.
     *
     *     var cups = 2;
     *     assert.isNumber(cups, 'how many cups');
     *
     * @name isNumber
     * @param {Number} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.isNumber = function (val, msg) {
      new Assertion(val, msg, assert.isNumber, true).to.be.a('number');
    };
    /**
     * ### .isNotNumber(value, [message])
     *
     * Asserts that `value` is _not_ a number.
     *
     *     var cups = '2 cups please';
     *     assert.isNotNumber(cups, 'how many cups');
     *
     * @name isNotNumber
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.isNotNumber = function (val, msg) {
      new Assertion(val, msg, assert.isNotNumber, true).to.not.be.a('number');
    };
    /**
    * ### .isFinite(value, [message])
    *
    * Asserts that `value` is a finite number. Unlike `.isNumber`, this will fail for `NaN` and `Infinity`.
    *
    *     var cups = 2;
    *     assert.isFinite(cups, 'how many cups');
    *
    *     assert.isFinite(NaN); // throws
    *
    * @name isFinite
    * @param {Number} value
    * @param {String} message
    * @namespace Assert
    * @api public
    */


    assert.isFinite = function (val, msg) {
      new Assertion(val, msg, assert.isFinite, true).to.be.finite;
    };
    /**
     * ### .isBoolean(value, [message])
     *
     * Asserts that `value` is a boolean.
     *
     *     var teaReady = true
     *       , teaServed = false;
     *
     *     assert.isBoolean(teaReady, 'is the tea ready');
     *     assert.isBoolean(teaServed, 'has tea been served');
     *
     * @name isBoolean
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.isBoolean = function (val, msg) {
      new Assertion(val, msg, assert.isBoolean, true).to.be.a('boolean');
    };
    /**
     * ### .isNotBoolean(value, [message])
     *
     * Asserts that `value` is _not_ a boolean.
     *
     *     var teaReady = 'yep'
     *       , teaServed = 'nope';
     *
     *     assert.isNotBoolean(teaReady, 'is the tea ready');
     *     assert.isNotBoolean(teaServed, 'has tea been served');
     *
     * @name isNotBoolean
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.isNotBoolean = function (val, msg) {
      new Assertion(val, msg, assert.isNotBoolean, true).to.not.be.a('boolean');
    };
    /**
     * ### .typeOf(value, name, [message])
     *
     * Asserts that `value`'s type is `name`, as determined by
     * `Object.prototype.toString`.
     *
     *     assert.typeOf({ tea: 'chai' }, 'object', 'we have an object');
     *     assert.typeOf(['chai', 'jasmine'], 'array', 'we have an array');
     *     assert.typeOf('tea', 'string', 'we have a string');
     *     assert.typeOf(/tea/, 'regexp', 'we have a regular expression');
     *     assert.typeOf(null, 'null', 'we have a null');
     *     assert.typeOf(undefined, 'undefined', 'we have an undefined');
     *
     * @name typeOf
     * @param {Mixed} value
     * @param {String} name
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.typeOf = function (val, type, msg) {
      new Assertion(val, msg, assert.typeOf, true).to.be.a(type);
    };
    /**
     * ### .notTypeOf(value, name, [message])
     *
     * Asserts that `value`'s type is _not_ `name`, as determined by
     * `Object.prototype.toString`.
     *
     *     assert.notTypeOf('tea', 'number', 'strings are not numbers');
     *
     * @name notTypeOf
     * @param {Mixed} value
     * @param {String} typeof name
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.notTypeOf = function (val, type, msg) {
      new Assertion(val, msg, assert.notTypeOf, true).to.not.be.a(type);
    };
    /**
     * ### .instanceOf(object, constructor, [message])
     *
     * Asserts that `value` is an instance of `constructor`.
     *
     *     var Tea = function (name) { this.name = name; }
     *       , chai = new Tea('chai');
     *
     *     assert.instanceOf(chai, Tea, 'chai is an instance of tea');
     *
     * @name instanceOf
     * @param {Object} object
     * @param {Constructor} constructor
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.instanceOf = function (val, type, msg) {
      new Assertion(val, msg, assert.instanceOf, true).to.be.instanceOf(type);
    };
    /**
     * ### .notInstanceOf(object, constructor, [message])
     *
     * Asserts `value` is not an instance of `constructor`.
     *
     *     var Tea = function (name) { this.name = name; }
     *       , chai = new String('chai');
     *
     *     assert.notInstanceOf(chai, Tea, 'chai is not an instance of tea');
     *
     * @name notInstanceOf
     * @param {Object} object
     * @param {Constructor} constructor
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.notInstanceOf = function (val, type, msg) {
      new Assertion(val, msg, assert.notInstanceOf, true).to.not.be.instanceOf(type);
    };
    /**
     * ### .include(haystack, needle, [message])
     *
     * Asserts that `haystack` includes `needle`. Can be used to assert the
     * inclusion of a value in an array, a substring in a string, or a subset of
     * properties in an object.
     *
     *     assert.include([1,2,3], 2, 'array contains value');
     *     assert.include('foobar', 'foo', 'string contains substring');
     *     assert.include({ foo: 'bar', hello: 'universe' }, { foo: 'bar' }, 'object contains property');
     *
     * Strict equality (===) is used. When asserting the inclusion of a value in
     * an array, the array is searched for an element that's strictly equal to the
     * given value. When asserting a subset of properties in an object, the object
     * is searched for the given property keys, checking that each one is present
     * and stricty equal to the given property value. For instance:
     *
     *     var obj1 = {a: 1}
     *       , obj2 = {b: 2};
     *     assert.include([obj1, obj2], obj1);
     *     assert.include({foo: obj1, bar: obj2}, {foo: obj1});
     *     assert.include({foo: obj1, bar: obj2}, {foo: obj1, bar: obj2});
     *
     * @name include
     * @param {Array|String} haystack
     * @param {Mixed} needle
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.include = function (exp, inc, msg) {
      new Assertion(exp, msg, assert.include, true).include(inc);
    };
    /**
     * ### .notInclude(haystack, needle, [message])
     *
     * Asserts that `haystack` does not include `needle`. Can be used to assert
     * the absence of a value in an array, a substring in a string, or a subset of
     * properties in an object.
     *
     *     assert.notInclude([1,2,3], 4, 'array doesn't contain value');
     *     assert.notInclude('foobar', 'baz', 'string doesn't contain substring');
     *     assert.notInclude({ foo: 'bar', hello: 'universe' }, { foo: 'baz' }, 'object doesn't contain property');
     *
     * Strict equality (===) is used. When asserting the absence of a value in an
     * array, the array is searched to confirm the absence of an element that's
     * strictly equal to the given value. When asserting a subset of properties in
     * an object, the object is searched to confirm that at least one of the given
     * property keys is either not present or not strictly equal to the given
     * property value. For instance:
     *
     *     var obj1 = {a: 1}
     *       , obj2 = {b: 2};
     *     assert.notInclude([obj1, obj2], {a: 1});
     *     assert.notInclude({foo: obj1, bar: obj2}, {foo: {a: 1}});
     *     assert.notInclude({foo: obj1, bar: obj2}, {foo: obj1, bar: {b: 2}});
     *
     * @name notInclude
     * @param {Array|String} haystack
     * @param {Mixed} needle
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.notInclude = function (exp, inc, msg) {
      new Assertion(exp, msg, assert.notInclude, true).not.include(inc);
    };
    /**
     * ### .deepInclude(haystack, needle, [message])
     *
     * Asserts that `haystack` includes `needle`. Can be used to assert the
     * inclusion of a value in an array or a subset of properties in an object.
     * Deep equality is used.
     *
     *     var obj1 = {a: 1}
     *       , obj2 = {b: 2};
     *     assert.deepInclude([obj1, obj2], {a: 1});
     *     assert.deepInclude({foo: obj1, bar: obj2}, {foo: {a: 1}});
     *     assert.deepInclude({foo: obj1, bar: obj2}, {foo: {a: 1}, bar: {b: 2}});
     *
     * @name deepInclude
     * @param {Array|String} haystack
     * @param {Mixed} needle
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.deepInclude = function (exp, inc, msg) {
      new Assertion(exp, msg, assert.deepInclude, true).deep.include(inc);
    };
    /**
     * ### .notDeepInclude(haystack, needle, [message])
     *
     * Asserts that `haystack` does not include `needle`. Can be used to assert
     * the absence of a value in an array or a subset of properties in an object.
     * Deep equality is used.
     *
     *     var obj1 = {a: 1}
     *       , obj2 = {b: 2};
     *     assert.notDeepInclude([obj1, obj2], {a: 9});
     *     assert.notDeepInclude({foo: obj1, bar: obj2}, {foo: {a: 9}});
     *     assert.notDeepInclude({foo: obj1, bar: obj2}, {foo: {a: 1}, bar: {b: 9}});
     *
     * @name notDeepInclude
     * @param {Array|String} haystack
     * @param {Mixed} needle
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.notDeepInclude = function (exp, inc, msg) {
      new Assertion(exp, msg, assert.notDeepInclude, true).not.deep.include(inc);
    };
    /**
     * ### .nestedInclude(haystack, needle, [message])
     * 
     * Asserts that 'haystack' includes 'needle'. 
     * Can be used to assert the inclusion of a subset of properties in an 
     * object.
     * Enables the use of dot- and bracket-notation for referencing nested 
     * properties.
     * '[]' and '.' in property names can be escaped using double backslashes.
     * 
     *     assert.nestedInclude({'.a': {'b': 'x'}}, {'\\.a.[b]': 'x'});
     *     assert.nestedInclude({'a': {'[b]': 'x'}}, {'a.\\[b\\]': 'x'});
     * 
     * @name nestedInclude
     * @param {Object} haystack
     * @param {Object} needle
     * @param {String} message
     * @namespace Assert
     * @api public 
     */


    assert.nestedInclude = function (exp, inc, msg) {
      new Assertion(exp, msg, assert.nestedInclude, true).nested.include(inc);
    };
    /**
     * ### .notNestedInclude(haystack, needle, [message])
     * 
     * Asserts that 'haystack' does not include 'needle'. 
     * Can be used to assert the absence of a subset of properties in an 
     * object.
     * Enables the use of dot- and bracket-notation for referencing nested 
     * properties. 
     * '[]' and '.' in property names can be escaped using double backslashes.
     * 
     *     assert.notNestedInclude({'.a': {'b': 'x'}}, {'\\.a.b': 'y'});
     *     assert.notNestedInclude({'a': {'[b]': 'x'}}, {'a.\\[b\\]': 'y'});
     * 
     * @name notNestedInclude
     * @param {Object} haystack
     * @param {Object} needle
     * @param {String} message
     * @namespace Assert
     * @api public 
     */


    assert.notNestedInclude = function (exp, inc, msg) {
      new Assertion(exp, msg, assert.notNestedInclude, true).not.nested.include(inc);
    };
    /**
     * ### .deepNestedInclude(haystack, needle, [message])
     * 
     * Asserts that 'haystack' includes 'needle'.
     * Can be used to assert the inclusion of a subset of properties in an 
     * object while checking for deep equality.
     * Enables the use of dot- and bracket-notation for referencing nested 
     * properties.
     * '[]' and '.' in property names can be escaped using double backslashes.
     * 
     *     assert.deepNestedInclude({a: {b: [{x: 1}]}}, {'a.b[0]': {x: 1}});
     *     assert.deepNestedInclude({'.a': {'[b]': {x: 1}}}, {'\\.a.\\[b\\]': {x: 1}});
     *    
     * @name deepNestedInclude
     * @param {Object} haystack
     * @param {Object} needle
     * @param {String} message
     * @namespace Assert
     * @api public 
     */


    assert.deepNestedInclude = function (exp, inc, msg) {
      new Assertion(exp, msg, assert.deepNestedInclude, true).deep.nested.include(inc);
    };
    /**
     * ### .notDeepNestedInclude(haystack, needle, [message])
     * 
     * Asserts that 'haystack' does not include 'needle'.
     * Can be used to assert the absence of a subset of properties in an 
     * object while checking for deep equality.
     * Enables the use of dot- and bracket-notation for referencing nested 
     * properties.
     * '[]' and '.' in property names can be escaped using double backslashes.
     * 
     *     assert.notDeepNestedInclude({a: {b: [{x: 1}]}}, {'a.b[0]': {y: 1}})
     *     assert.notDeepNestedInclude({'.a': {'[b]': {x: 1}}}, {'\\.a.\\[b\\]': {y: 2}});
     *    
     * @name notDeepNestedInclude
     * @param {Object} haystack
     * @param {Object} needle
     * @param {String} message
     * @namespace Assert
     * @api public 
     */


    assert.notDeepNestedInclude = function (exp, inc, msg) {
      new Assertion(exp, msg, assert.notDeepNestedInclude, true).not.deep.nested.include(inc);
    };
    /**
     * ### .ownInclude(haystack, needle, [message])
     * 
     * Asserts that 'haystack' includes 'needle'.
     * Can be used to assert the inclusion of a subset of properties in an 
     * object while ignoring inherited properties.
     * 
     *     assert.ownInclude({ a: 1 }, { a: 1 });
     * 
     * @name ownInclude
     * @param {Object} haystack
     * @param {Object} needle
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.ownInclude = function (exp, inc, msg) {
      new Assertion(exp, msg, assert.ownInclude, true).own.include(inc);
    };
    /**
     * ### .notOwnInclude(haystack, needle, [message])
     * 
     * Asserts that 'haystack' includes 'needle'.
     * Can be used to assert the absence of a subset of properties in an 
     * object while ignoring inherited properties.
     * 
     *     Object.prototype.b = 2;
     * 
     *     assert.notOwnInclude({ a: 1 }, { b: 2 });
     * 
     * @name notOwnInclude
     * @param {Object} haystack
     * @param {Object} needle
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.notOwnInclude = function (exp, inc, msg) {
      new Assertion(exp, msg, assert.notOwnInclude, true).not.own.include(inc);
    };
    /**
     * ### .deepOwnInclude(haystack, needle, [message])
     * 
     * Asserts that 'haystack' includes 'needle'.
     * Can be used to assert the inclusion of a subset of properties in an 
     * object while ignoring inherited properties and checking for deep equality.
     * 
     *      assert.deepOwnInclude({a: {b: 2}}, {a: {b: 2}});
     *      
     * @name deepOwnInclude
     * @param {Object} haystack
     * @param {Object} needle
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.deepOwnInclude = function (exp, inc, msg) {
      new Assertion(exp, msg, assert.deepOwnInclude, true).deep.own.include(inc);
    };
    /**
    * ### .notDeepOwnInclude(haystack, needle, [message])
    * 
    * Asserts that 'haystack' includes 'needle'.
    * Can be used to assert the absence of a subset of properties in an 
    * object while ignoring inherited properties and checking for deep equality.
    * 
    *      assert.notDeepOwnInclude({a: {b: 2}}, {a: {c: 3}});
    *      
    * @name notDeepOwnInclude
    * @param {Object} haystack
    * @param {Object} needle
    * @param {String} message
    * @namespace Assert
    * @api public
    */


    assert.notDeepOwnInclude = function (exp, inc, msg) {
      new Assertion(exp, msg, assert.notDeepOwnInclude, true).not.deep.own.include(inc);
    };
    /**
     * ### .match(value, regexp, [message])
     *
     * Asserts that `value` matches the regular expression `regexp`.
     *
     *     assert.match('foobar', /^foo/, 'regexp matches');
     *
     * @name match
     * @param {Mixed} value
     * @param {RegExp} regexp
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.match = function (exp, re, msg) {
      new Assertion(exp, msg, assert.match, true).to.match(re);
    };
    /**
     * ### .notMatch(value, regexp, [message])
     *
     * Asserts that `value` does not match the regular expression `regexp`.
     *
     *     assert.notMatch('foobar', /^foo/, 'regexp does not match');
     *
     * @name notMatch
     * @param {Mixed} value
     * @param {RegExp} regexp
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.notMatch = function (exp, re, msg) {
      new Assertion(exp, msg, assert.notMatch, true).to.not.match(re);
    };
    /**
     * ### .property(object, property, [message])
     *
     * Asserts that `object` has a direct or inherited property named by
     * `property`.
     *
     *     assert.property({ tea: { green: 'matcha' }}, 'tea');
     *     assert.property({ tea: { green: 'matcha' }}, 'toString');
     *
     * @name property
     * @param {Object} object
     * @param {String} property
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.property = function (obj, prop, msg) {
      new Assertion(obj, msg, assert.property, true).to.have.property(prop);
    };
    /**
     * ### .notProperty(object, property, [message])
     *
     * Asserts that `object` does _not_ have a direct or inherited property named
     * by `property`.
     *
     *     assert.notProperty({ tea: { green: 'matcha' }}, 'coffee');
     *
     * @name notProperty
     * @param {Object} object
     * @param {String} property
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.notProperty = function (obj, prop, msg) {
      new Assertion(obj, msg, assert.notProperty, true).to.not.have.property(prop);
    };
    /**
     * ### .propertyVal(object, property, value, [message])
     *
     * Asserts that `object` has a direct or inherited property named by
     * `property` with a value given by `value`. Uses a strict equality check
     * (===).
     *
     *     assert.propertyVal({ tea: 'is good' }, 'tea', 'is good');
     *
     * @name propertyVal
     * @param {Object} object
     * @param {String} property
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.propertyVal = function (obj, prop, val, msg) {
      new Assertion(obj, msg, assert.propertyVal, true).to.have.property(prop, val);
    };
    /**
     * ### .notPropertyVal(object, property, value, [message])
     *
     * Asserts that `object` does _not_ have a direct or inherited property named
     * by `property` with value given by `value`. Uses a strict equality check
     * (===).
     *
     *     assert.notPropertyVal({ tea: 'is good' }, 'tea', 'is bad');
     *     assert.notPropertyVal({ tea: 'is good' }, 'coffee', 'is good');
     *
     * @name notPropertyVal
     * @param {Object} object
     * @param {String} property
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.notPropertyVal = function (obj, prop, val, msg) {
      new Assertion(obj, msg, assert.notPropertyVal, true).to.not.have.property(prop, val);
    };
    /**
     * ### .deepPropertyVal(object, property, value, [message])
     *
     * Asserts that `object` has a direct or inherited property named by
     * `property` with a value given by `value`. Uses a deep equality check.
     *
     *     assert.deepPropertyVal({ tea: { green: 'matcha' } }, 'tea', { green: 'matcha' });
     *
     * @name deepPropertyVal
     * @param {Object} object
     * @param {String} property
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.deepPropertyVal = function (obj, prop, val, msg) {
      new Assertion(obj, msg, assert.deepPropertyVal, true).to.have.deep.property(prop, val);
    };
    /**
     * ### .notDeepPropertyVal(object, property, value, [message])
     *
     * Asserts that `object` does _not_ have a direct or inherited property named
     * by `property` with value given by `value`. Uses a deep equality check.
     *
     *     assert.notDeepPropertyVal({ tea: { green: 'matcha' } }, 'tea', { black: 'matcha' });
     *     assert.notDeepPropertyVal({ tea: { green: 'matcha' } }, 'tea', { green: 'oolong' });
     *     assert.notDeepPropertyVal({ tea: { green: 'matcha' } }, 'coffee', { green: 'matcha' });
     *
     * @name notDeepPropertyVal
     * @param {Object} object
     * @param {String} property
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.notDeepPropertyVal = function (obj, prop, val, msg) {
      new Assertion(obj, msg, assert.notDeepPropertyVal, true).to.not.have.deep.property(prop, val);
    };
    /**
     * ### .ownProperty(object, property, [message])
     *
     * Asserts that `object` has a direct property named by `property`. Inherited
     * properties aren't checked.
     *
     *     assert.ownProperty({ tea: { green: 'matcha' }}, 'tea');
     *
     * @name ownProperty
     * @param {Object} object
     * @param {String} property
     * @param {String} message
     * @api public
     */


    assert.ownProperty = function (obj, prop, msg) {
      new Assertion(obj, msg, assert.ownProperty, true).to.have.own.property(prop);
    };
    /**
     * ### .notOwnProperty(object, property, [message])
     *
     * Asserts that `object` does _not_ have a direct property named by
     * `property`. Inherited properties aren't checked.
     *
     *     assert.notOwnProperty({ tea: { green: 'matcha' }}, 'coffee');
     *     assert.notOwnProperty({}, 'toString');
     *
     * @name notOwnProperty
     * @param {Object} object
     * @param {String} property
     * @param {String} message
     * @api public
     */


    assert.notOwnProperty = function (obj, prop, msg) {
      new Assertion(obj, msg, assert.notOwnProperty, true).to.not.have.own.property(prop);
    };
    /**
     * ### .ownPropertyVal(object, property, value, [message])
     *
     * Asserts that `object` has a direct property named by `property` and a value
     * equal to the provided `value`. Uses a strict equality check (===).
     * Inherited properties aren't checked.
     *
     *     assert.ownPropertyVal({ coffee: 'is good'}, 'coffee', 'is good');
     *
     * @name ownPropertyVal
     * @param {Object} object
     * @param {String} property
     * @param {Mixed} value
     * @param {String} message
     * @api public
     */


    assert.ownPropertyVal = function (obj, prop, value, msg) {
      new Assertion(obj, msg, assert.ownPropertyVal, true).to.have.own.property(prop, value);
    };
    /**
     * ### .notOwnPropertyVal(object, property, value, [message])
     *
     * Asserts that `object` does _not_ have a direct property named by `property`
     * with a value equal to the provided `value`. Uses a strict equality check
     * (===). Inherited properties aren't checked.
     *
     *     assert.notOwnPropertyVal({ tea: 'is better'}, 'tea', 'is worse');
     *     assert.notOwnPropertyVal({}, 'toString', Object.prototype.toString);
     *
     * @name notOwnPropertyVal
     * @param {Object} object
     * @param {String} property
     * @param {Mixed} value
     * @param {String} message
     * @api public
     */


    assert.notOwnPropertyVal = function (obj, prop, value, msg) {
      new Assertion(obj, msg, assert.notOwnPropertyVal, true).to.not.have.own.property(prop, value);
    };
    /**
     * ### .deepOwnPropertyVal(object, property, value, [message])
     *
     * Asserts that `object` has a direct property named by `property` and a value
     * equal to the provided `value`. Uses a deep equality check. Inherited
     * properties aren't checked.
     *
     *     assert.deepOwnPropertyVal({ tea: { green: 'matcha' } }, 'tea', { green: 'matcha' });
     *
     * @name deepOwnPropertyVal
     * @param {Object} object
     * @param {String} property
     * @param {Mixed} value
     * @param {String} message
     * @api public
     */


    assert.deepOwnPropertyVal = function (obj, prop, value, msg) {
      new Assertion(obj, msg, assert.deepOwnPropertyVal, true).to.have.deep.own.property(prop, value);
    };
    /**
     * ### .notDeepOwnPropertyVal(object, property, value, [message])
     *
     * Asserts that `object` does _not_ have a direct property named by `property`
     * with a value equal to the provided `value`. Uses a deep equality check.
     * Inherited properties aren't checked.
     *
     *     assert.notDeepOwnPropertyVal({ tea: { green: 'matcha' } }, 'tea', { black: 'matcha' });
     *     assert.notDeepOwnPropertyVal({ tea: { green: 'matcha' } }, 'tea', { green: 'oolong' });
     *     assert.notDeepOwnPropertyVal({ tea: { green: 'matcha' } }, 'coffee', { green: 'matcha' });
     *     assert.notDeepOwnPropertyVal({}, 'toString', Object.prototype.toString);
     *
     * @name notDeepOwnPropertyVal
     * @param {Object} object
     * @param {String} property
     * @param {Mixed} value
     * @param {String} message
     * @api public
     */


    assert.notDeepOwnPropertyVal = function (obj, prop, value, msg) {
      new Assertion(obj, msg, assert.notDeepOwnPropertyVal, true).to.not.have.deep.own.property(prop, value);
    };
    /**
     * ### .nestedProperty(object, property, [message])
     *
     * Asserts that `object` has a direct or inherited property named by
     * `property`, which can be a string using dot- and bracket-notation for
     * nested reference.
     *
     *     assert.nestedProperty({ tea: { green: 'matcha' }}, 'tea.green');
     *
     * @name nestedProperty
     * @param {Object} object
     * @param {String} property
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.nestedProperty = function (obj, prop, msg) {
      new Assertion(obj, msg, assert.nestedProperty, true).to.have.nested.property(prop);
    };
    /**
     * ### .notNestedProperty(object, property, [message])
     *
     * Asserts that `object` does _not_ have a property named by `property`, which
     * can be a string using dot- and bracket-notation for nested reference. The
     * property cannot exist on the object nor anywhere in its prototype chain.
     *
     *     assert.notNestedProperty({ tea: { green: 'matcha' }}, 'tea.oolong');
     *
     * @name notNestedProperty
     * @param {Object} object
     * @param {String} property
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.notNestedProperty = function (obj, prop, msg) {
      new Assertion(obj, msg, assert.notNestedProperty, true).to.not.have.nested.property(prop);
    };
    /**
     * ### .nestedPropertyVal(object, property, value, [message])
     *
     * Asserts that `object` has a property named by `property` with value given
     * by `value`. `property` can use dot- and bracket-notation for nested
     * reference. Uses a strict equality check (===).
     *
     *     assert.nestedPropertyVal({ tea: { green: 'matcha' }}, 'tea.green', 'matcha');
     *
     * @name nestedPropertyVal
     * @param {Object} object
     * @param {String} property
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.nestedPropertyVal = function (obj, prop, val, msg) {
      new Assertion(obj, msg, assert.nestedPropertyVal, true).to.have.nested.property(prop, val);
    };
    /**
     * ### .notNestedPropertyVal(object, property, value, [message])
     *
     * Asserts that `object` does _not_ have a property named by `property` with
     * value given by `value`. `property` can use dot- and bracket-notation for
     * nested reference. Uses a strict equality check (===).
     *
     *     assert.notNestedPropertyVal({ tea: { green: 'matcha' }}, 'tea.green', 'konacha');
     *     assert.notNestedPropertyVal({ tea: { green: 'matcha' }}, 'coffee.green', 'matcha');
     *
     * @name notNestedPropertyVal
     * @param {Object} object
     * @param {String} property
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.notNestedPropertyVal = function (obj, prop, val, msg) {
      new Assertion(obj, msg, assert.notNestedPropertyVal, true).to.not.have.nested.property(prop, val);
    };
    /**
     * ### .deepNestedPropertyVal(object, property, value, [message])
     *
     * Asserts that `object` has a property named by `property` with a value given
     * by `value`. `property` can use dot- and bracket-notation for nested
     * reference. Uses a deep equality check.
     *
     *     assert.deepNestedPropertyVal({ tea: { green: { matcha: 'yum' } } }, 'tea.green', { matcha: 'yum' });
     *
     * @name deepNestedPropertyVal
     * @param {Object} object
     * @param {String} property
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.deepNestedPropertyVal = function (obj, prop, val, msg) {
      new Assertion(obj, msg, assert.deepNestedPropertyVal, true).to.have.deep.nested.property(prop, val);
    };
    /**
     * ### .notDeepNestedPropertyVal(object, property, value, [message])
     *
     * Asserts that `object` does _not_ have a property named by `property` with
     * value given by `value`. `property` can use dot- and bracket-notation for
     * nested reference. Uses a deep equality check.
     *
     *     assert.notDeepNestedPropertyVal({ tea: { green: { matcha: 'yum' } } }, 'tea.green', { oolong: 'yum' });
     *     assert.notDeepNestedPropertyVal({ tea: { green: { matcha: 'yum' } } }, 'tea.green', { matcha: 'yuck' });
     *     assert.notDeepNestedPropertyVal({ tea: { green: { matcha: 'yum' } } }, 'tea.black', { matcha: 'yum' });
     *
     * @name notDeepNestedPropertyVal
     * @param {Object} object
     * @param {String} property
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.notDeepNestedPropertyVal = function (obj, prop, val, msg) {
      new Assertion(obj, msg, assert.notDeepNestedPropertyVal, true).to.not.have.deep.nested.property(prop, val);
    };
    /**
     * ### .lengthOf(object, length, [message])
     *
     * Asserts that `object` has a `length` property with the expected value.
     *
     *     assert.lengthOf([1,2,3], 3, 'array has length of 3');
     *     assert.lengthOf('foobar', 6, 'string has length of 6');
     *
     * @name lengthOf
     * @param {Mixed} object
     * @param {Number} length
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.lengthOf = function (exp, len, msg) {
      new Assertion(exp, msg, assert.lengthOf, true).to.have.lengthOf(len);
    };
    /**
     * ### .hasAnyKeys(object, [keys], [message])
     *
     * Asserts that `object` has at least one of the `keys` provided.
     * You can also provide a single object instead of a `keys` array and its keys
     * will be used as the expected set of keys.
     *
     *     assert.hasAnyKeys({foo: 1, bar: 2, baz: 3}, ['foo', 'iDontExist', 'baz']);
     *     assert.hasAnyKeys({foo: 1, bar: 2, baz: 3}, {foo: 30, iDontExist: 99, baz: 1337});
     *     assert.hasAnyKeys(new Map([[{foo: 1}, 'bar'], ['key', 'value']]), [{foo: 1}, 'key']);
     *     assert.hasAnyKeys(new Set([{foo: 'bar'}, 'anotherKey']), [{foo: 'bar'}, 'anotherKey']);
     *
     * @name hasAnyKeys
     * @param {Mixed} object
     * @param {Array|Object} keys
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.hasAnyKeys = function (obj, keys, msg) {
      new Assertion(obj, msg, assert.hasAnyKeys, true).to.have.any.keys(keys);
    };
    /**
     * ### .hasAllKeys(object, [keys], [message])
     *
     * Asserts that `object` has all and only all of the `keys` provided.
     * You can also provide a single object instead of a `keys` array and its keys
     * will be used as the expected set of keys.
     *
     *     assert.hasAllKeys({foo: 1, bar: 2, baz: 3}, ['foo', 'bar', 'baz']);
     *     assert.hasAllKeys({foo: 1, bar: 2, baz: 3}, {foo: 30, bar: 99, baz: 1337]);
     *     assert.hasAllKeys(new Map([[{foo: 1}, 'bar'], ['key', 'value']]), [{foo: 1}, 'key']);
     *     assert.hasAllKeys(new Set([{foo: 'bar'}, 'anotherKey'], [{foo: 'bar'}, 'anotherKey']);
     *
     * @name hasAllKeys
     * @param {Mixed} object
     * @param {String[]} keys
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.hasAllKeys = function (obj, keys, msg) {
      new Assertion(obj, msg, assert.hasAllKeys, true).to.have.all.keys(keys);
    };
    /**
     * ### .containsAllKeys(object, [keys], [message])
     *
     * Asserts that `object` has all of the `keys` provided but may have more keys not listed.
     * You can also provide a single object instead of a `keys` array and its keys
     * will be used as the expected set of keys.
     *
     *     assert.containsAllKeys({foo: 1, bar: 2, baz: 3}, ['foo', 'baz']);
     *     assert.containsAllKeys({foo: 1, bar: 2, baz: 3}, ['foo', 'bar', 'baz']);
     *     assert.containsAllKeys({foo: 1, bar: 2, baz: 3}, {foo: 30, baz: 1337});
     *     assert.containsAllKeys({foo: 1, bar: 2, baz: 3}, {foo: 30, bar: 99, baz: 1337});
     *     assert.containsAllKeys(new Map([[{foo: 1}, 'bar'], ['key', 'value']]), [{foo: 1}]);
     *     assert.containsAllKeys(new Map([[{foo: 1}, 'bar'], ['key', 'value']]), [{foo: 1}, 'key']);
     *     assert.containsAllKeys(new Set([{foo: 'bar'}, 'anotherKey'], [{foo: 'bar'}]);
     *     assert.containsAllKeys(new Set([{foo: 'bar'}, 'anotherKey'], [{foo: 'bar'}, 'anotherKey']);
     *
     * @name containsAllKeys
     * @param {Mixed} object
     * @param {String[]} keys
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.containsAllKeys = function (obj, keys, msg) {
      new Assertion(obj, msg, assert.containsAllKeys, true).to.contain.all.keys(keys);
    };
    /**
     * ### .doesNotHaveAnyKeys(object, [keys], [message])
     *
     * Asserts that `object` has none of the `keys` provided.
     * You can also provide a single object instead of a `keys` array and its keys
     * will be used as the expected set of keys.
     *
     *     assert.doesNotHaveAnyKeys({foo: 1, bar: 2, baz: 3}, ['one', 'two', 'example']);
     *     assert.doesNotHaveAnyKeys({foo: 1, bar: 2, baz: 3}, {one: 1, two: 2, example: 'foo'});
     *     assert.doesNotHaveAnyKeys(new Map([[{foo: 1}, 'bar'], ['key', 'value']]), [{one: 'two'}, 'example']);
     *     assert.doesNotHaveAnyKeys(new Set([{foo: 'bar'}, 'anotherKey'], [{one: 'two'}, 'example']);
     *
     * @name doesNotHaveAnyKeys
     * @param {Mixed} object
     * @param {String[]} keys
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.doesNotHaveAnyKeys = function (obj, keys, msg) {
      new Assertion(obj, msg, assert.doesNotHaveAnyKeys, true).to.not.have.any.keys(keys);
    };
    /**
     * ### .doesNotHaveAllKeys(object, [keys], [message])
     *
     * Asserts that `object` does not have at least one of the `keys` provided.
     * You can also provide a single object instead of a `keys` array and its keys
     * will be used as the expected set of keys.
     *
     *     assert.doesNotHaveAllKeys({foo: 1, bar: 2, baz: 3}, ['one', 'two', 'example']);
     *     assert.doesNotHaveAllKeys({foo: 1, bar: 2, baz: 3}, {one: 1, two: 2, example: 'foo'});
     *     assert.doesNotHaveAllKeys(new Map([[{foo: 1}, 'bar'], ['key', 'value']]), [{one: 'two'}, 'example']);
     *     assert.doesNotHaveAllKeys(new Set([{foo: 'bar'}, 'anotherKey'], [{one: 'two'}, 'example']);
     *
     * @name doesNotHaveAllKeys
     * @param {Mixed} object
     * @param {String[]} keys
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.doesNotHaveAllKeys = function (obj, keys, msg) {
      new Assertion(obj, msg, assert.doesNotHaveAllKeys, true).to.not.have.all.keys(keys);
    };
    /**
     * ### .hasAnyDeepKeys(object, [keys], [message])
     *
     * Asserts that `object` has at least one of the `keys` provided.
     * Since Sets and Maps can have objects as keys you can use this assertion to perform
     * a deep comparison.
     * You can also provide a single object instead of a `keys` array and its keys
     * will be used as the expected set of keys.
     *
     *     assert.hasAnyDeepKeys(new Map([[{one: 'one'}, 'valueOne'], [1, 2]]), {one: 'one'});
     *     assert.hasAnyDeepKeys(new Map([[{one: 'one'}, 'valueOne'], [1, 2]]), [{one: 'one'}, {two: 'two'}]);
     *     assert.hasAnyDeepKeys(new Map([[{one: 'one'}, 'valueOne'], [{two: 'two'}, 'valueTwo']]), [{one: 'one'}, {two: 'two'}]);
     *     assert.hasAnyDeepKeys(new Set([{one: 'one'}, {two: 'two'}]), {one: 'one'});
     *     assert.hasAnyDeepKeys(new Set([{one: 'one'}, {two: 'two'}]), [{one: 'one'}, {three: 'three'}]);
     *     assert.hasAnyDeepKeys(new Set([{one: 'one'}, {two: 'two'}]), [{one: 'one'}, {two: 'two'}]);
     *
     * @name doesNotHaveAllKeys
     * @param {Mixed} object
     * @param {Array|Object} keys
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.hasAnyDeepKeys = function (obj, keys, msg) {
      new Assertion(obj, msg, assert.hasAnyDeepKeys, true).to.have.any.deep.keys(keys);
    };
    /**
      * ### .hasAllDeepKeys(object, [keys], [message])
      *
      * Asserts that `object` has all and only all of the `keys` provided.
      * Since Sets and Maps can have objects as keys you can use this assertion to perform
      * a deep comparison.
      * You can also provide a single object instead of a `keys` array and its keys
      * will be used as the expected set of keys.
      *
      *     assert.hasAllDeepKeys(new Map([[{one: 'one'}, 'valueOne']]), {one: 'one'});
      *     assert.hasAllDeepKeys(new Map([[{one: 'one'}, 'valueOne'], [{two: 'two'}, 'valueTwo']]), [{one: 'one'}, {two: 'two'}]);
      *     assert.hasAllDeepKeys(new Set([{one: 'one'}]), {one: 'one'});
      *     assert.hasAllDeepKeys(new Set([{one: 'one'}, {two: 'two'}]), [{one: 'one'}, {two: 'two'}]);
      *
      * @name hasAllDeepKeys
      * @param {Mixed} object
      * @param {Array|Object} keys
      * @param {String} message
      * @namespace Assert
      * @api public
      */


    assert.hasAllDeepKeys = function (obj, keys, msg) {
      new Assertion(obj, msg, assert.hasAllDeepKeys, true).to.have.all.deep.keys(keys);
    };
    /**
      * ### .containsAllDeepKeys(object, [keys], [message])
      *
      * Asserts that `object` contains all of the `keys` provided.
      * Since Sets and Maps can have objects as keys you can use this assertion to perform
      * a deep comparison.
      * You can also provide a single object instead of a `keys` array and its keys
      * will be used as the expected set of keys.
      *
      *     assert.containsAllDeepKeys(new Map([[{one: 'one'}, 'valueOne'], [1, 2]]), {one: 'one'});
      *     assert.containsAllDeepKeys(new Map([[{one: 'one'}, 'valueOne'], [{two: 'two'}, 'valueTwo']]), [{one: 'one'}, {two: 'two'}]);
      *     assert.containsAllDeepKeys(new Set([{one: 'one'}, {two: 'two'}]), {one: 'one'});
      *     assert.containsAllDeepKeys(new Set([{one: 'one'}, {two: 'two'}]), [{one: 'one'}, {two: 'two'}]);
      *
      * @name containsAllDeepKeys
      * @param {Mixed} object
      * @param {Array|Object} keys
      * @param {String} message
      * @namespace Assert
      * @api public
      */


    assert.containsAllDeepKeys = function (obj, keys, msg) {
      new Assertion(obj, msg, assert.containsAllDeepKeys, true).to.contain.all.deep.keys(keys);
    };
    /**
      * ### .doesNotHaveAnyDeepKeys(object, [keys], [message])
      *
      * Asserts that `object` has none of the `keys` provided.
      * Since Sets and Maps can have objects as keys you can use this assertion to perform
      * a deep comparison.
      * You can also provide a single object instead of a `keys` array and its keys
      * will be used as the expected set of keys.
      *
      *     assert.doesNotHaveAnyDeepKeys(new Map([[{one: 'one'}, 'valueOne'], [1, 2]]), {thisDoesNot: 'exist'});
      *     assert.doesNotHaveAnyDeepKeys(new Map([[{one: 'one'}, 'valueOne'], [{two: 'two'}, 'valueTwo']]), [{twenty: 'twenty'}, {fifty: 'fifty'}]);
      *     assert.doesNotHaveAnyDeepKeys(new Set([{one: 'one'}, {two: 'two'}]), {twenty: 'twenty'});
      *     assert.doesNotHaveAnyDeepKeys(new Set([{one: 'one'}, {two: 'two'}]), [{twenty: 'twenty'}, {fifty: 'fifty'}]);
      *
      * @name doesNotHaveAnyDeepKeys
      * @param {Mixed} object
      * @param {Array|Object} keys
      * @param {String} message
      * @namespace Assert
      * @api public
      */


    assert.doesNotHaveAnyDeepKeys = function (obj, keys, msg) {
      new Assertion(obj, msg, assert.doesNotHaveAnyDeepKeys, true).to.not.have.any.deep.keys(keys);
    };
    /**
      * ### .doesNotHaveAllDeepKeys(object, [keys], [message])
      *
      * Asserts that `object` does not have at least one of the `keys` provided.
      * Since Sets and Maps can have objects as keys you can use this assertion to perform
      * a deep comparison.
      * You can also provide a single object instead of a `keys` array and its keys
      * will be used as the expected set of keys.
      *
      *     assert.doesNotHaveAllDeepKeys(new Map([[{one: 'one'}, 'valueOne'], [1, 2]]), {thisDoesNot: 'exist'});
      *     assert.doesNotHaveAllDeepKeys(new Map([[{one: 'one'}, 'valueOne'], [{two: 'two'}, 'valueTwo']]), [{twenty: 'twenty'}, {one: 'one'}]);
      *     assert.doesNotHaveAllDeepKeys(new Set([{one: 'one'}, {two: 'two'}]), {twenty: 'twenty'});
      *     assert.doesNotHaveAllDeepKeys(new Set([{one: 'one'}, {two: 'two'}]), [{one: 'one'}, {fifty: 'fifty'}]);
      *
      * @name doesNotHaveAllDeepKeys
      * @param {Mixed} object
      * @param {Array|Object} keys
      * @param {String} message
      * @namespace Assert
      * @api public
      */


    assert.doesNotHaveAllDeepKeys = function (obj, keys, msg) {
      new Assertion(obj, msg, assert.doesNotHaveAllDeepKeys, true).to.not.have.all.deep.keys(keys);
    };
    /**
      * ### .throws(fn, [errorLike/string/regexp], [string/regexp], [message])
      *
      * If `errorLike` is an `Error` constructor, asserts that `fn` will throw an error that is an
      * instance of `errorLike`.
      * If `errorLike` is an `Error` instance, asserts that the error thrown is the same
      * instance as `errorLike`.
      * If `errMsgMatcher` is provided, it also asserts that the error thrown will have a
      * message matching `errMsgMatcher`.
      *
      *     assert.throws(fn, 'function throws a reference error');
      *     assert.throws(fn, /function throws a reference error/);
      *     assert.throws(fn, ReferenceError);
      *     assert.throws(fn, errorInstance);
      *     assert.throws(fn, ReferenceError, 'Error thrown must be a ReferenceError and have this msg');
      *     assert.throws(fn, errorInstance, 'Error thrown must be the same errorInstance and have this msg');
      *     assert.throws(fn, ReferenceError, /Error thrown must be a ReferenceError and match this/);
      *     assert.throws(fn, errorInstance, /Error thrown must be the same errorInstance and match this/);
      *
      * @name throws
      * @alias throw
      * @alias Throw
      * @param {Function} fn
      * @param {ErrorConstructor|Error} errorLike
      * @param {RegExp|String} errMsgMatcher
      * @param {String} message
      * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error#Error_types
      * @namespace Assert
      * @api public
      */


    assert.throws = function (fn, errorLike, errMsgMatcher, msg) {
      if ('string' === typeof errorLike || errorLike instanceof RegExp) {
        errMsgMatcher = errorLike;
        errorLike = null;
      }

      var assertErr = new Assertion(fn, msg, assert.throws, true).to.throw(errorLike, errMsgMatcher);
      return flag(assertErr, 'object');
    };
    /**
     * ### .doesNotThrow(fn, [errorLike/string/regexp], [string/regexp], [message])
     *
     * If `errorLike` is an `Error` constructor, asserts that `fn` will _not_ throw an error that is an
     * instance of `errorLike`.
     * If `errorLike` is an `Error` instance, asserts that the error thrown is _not_ the same
     * instance as `errorLike`.
     * If `errMsgMatcher` is provided, it also asserts that the error thrown will _not_ have a
     * message matching `errMsgMatcher`.
     *
     *     assert.doesNotThrow(fn, 'Any Error thrown must not have this message');
     *     assert.doesNotThrow(fn, /Any Error thrown must not match this/);
     *     assert.doesNotThrow(fn, Error);
     *     assert.doesNotThrow(fn, errorInstance);
     *     assert.doesNotThrow(fn, Error, 'Error must not have this message');
     *     assert.doesNotThrow(fn, errorInstance, 'Error must not have this message');
     *     assert.doesNotThrow(fn, Error, /Error must not match this/);
     *     assert.doesNotThrow(fn, errorInstance, /Error must not match this/);
     *
     * @name doesNotThrow
     * @param {Function} fn
     * @param {ErrorConstructor} errorLike
     * @param {RegExp|String} errMsgMatcher
     * @param {String} message
     * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error#Error_types
     * @namespace Assert
     * @api public
     */


    assert.doesNotThrow = function (fn, errorLike, errMsgMatcher, msg) {
      if ('string' === typeof errorLike || errorLike instanceof RegExp) {
        errMsgMatcher = errorLike;
        errorLike = null;
      }

      new Assertion(fn, msg, assert.doesNotThrow, true).to.not.throw(errorLike, errMsgMatcher);
    };
    /**
     * ### .operator(val1, operator, val2, [message])
     *
     * Compares two values using `operator`.
     *
     *     assert.operator(1, '<', 2, 'everything is ok');
     *     assert.operator(1, '>', 2, 'this will fail');
     *
     * @name operator
     * @param {Mixed} val1
     * @param {String} operator
     * @param {Mixed} val2
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.operator = function (val, operator, val2, msg) {
      var ok;

      switch (operator) {
        case '==':
          ok = val == val2;
          break;

        case '===':
          ok = val === val2;
          break;

        case '>':
          ok = val > val2;
          break;

        case '>=':
          ok = val >= val2;
          break;

        case '<':
          ok = val < val2;
          break;

        case '<=':
          ok = val <= val2;
          break;

        case '!=':
          ok = val != val2;
          break;

        case '!==':
          ok = val !== val2;
          break;

        default:
          msg = msg ? msg + ': ' : msg;
          throw new chai.AssertionError(msg + 'Invalid operator "' + operator + '"', undefined, assert.operator);
      }

      var test = new Assertion(ok, msg, assert.operator, true);
      test.assert(true === flag(test, 'object'), 'expected ' + util.inspect(val) + ' to be ' + operator + ' ' + util.inspect(val2), 'expected ' + util.inspect(val) + ' to not be ' + operator + ' ' + util.inspect(val2));
    };
    /**
     * ### .closeTo(actual, expected, delta, [message])
     *
     * Asserts that the target is equal `expected`, to within a +/- `delta` range.
     *
     *     assert.closeTo(1.5, 1, 0.5, 'numbers are close');
     *
     * @name closeTo
     * @param {Number} actual
     * @param {Number} expected
     * @param {Number} delta
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.closeTo = function (act, exp, delta, msg) {
      new Assertion(act, msg, assert.closeTo, true).to.be.closeTo(exp, delta);
    };
    /**
     * ### .approximately(actual, expected, delta, [message])
     *
     * Asserts that the target is equal `expected`, to within a +/- `delta` range.
     *
     *     assert.approximately(1.5, 1, 0.5, 'numbers are close');
     *
     * @name approximately
     * @param {Number} actual
     * @param {Number} expected
     * @param {Number} delta
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.approximately = function (act, exp, delta, msg) {
      new Assertion(act, msg, assert.approximately, true).to.be.approximately(exp, delta);
    };
    /**
     * ### .sameMembers(set1, set2, [message])
     *
     * Asserts that `set1` and `set2` have the same members in any order. Uses a
     * strict equality check (===).
     *
     *     assert.sameMembers([ 1, 2, 3 ], [ 2, 1, 3 ], 'same members');
     *
     * @name sameMembers
     * @param {Array} set1
     * @param {Array} set2
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.sameMembers = function (set1, set2, msg) {
      new Assertion(set1, msg, assert.sameMembers, true).to.have.same.members(set2);
    };
    /**
     * ### .notSameMembers(set1, set2, [message])
     *
     * Asserts that `set1` and `set2` don't have the same members in any order.
     * Uses a strict equality check (===).
     *
     *     assert.notSameMembers([ 1, 2, 3 ], [ 5, 1, 3 ], 'not same members');
     *
     * @name notSameMembers
     * @param {Array} set1
     * @param {Array} set2
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.notSameMembers = function (set1, set2, msg) {
      new Assertion(set1, msg, assert.notSameMembers, true).to.not.have.same.members(set2);
    };
    /**
     * ### .sameDeepMembers(set1, set2, [message])
     *
     * Asserts that `set1` and `set2` have the same members in any order. Uses a
     * deep equality check.
     *
     *     assert.sameDeepMembers([ { a: 1 }, { b: 2 }, { c: 3 } ], [{ b: 2 }, { a: 1 }, { c: 3 }], 'same deep members');
     *
     * @name sameDeepMembers
     * @param {Array} set1
     * @param {Array} set2
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.sameDeepMembers = function (set1, set2, msg) {
      new Assertion(set1, msg, assert.sameDeepMembers, true).to.have.same.deep.members(set2);
    };
    /**
     * ### .notSameDeepMembers(set1, set2, [message])
     *
     * Asserts that `set1` and `set2` don't have the same members in any order.
     * Uses a deep equality check.
     *
     *     assert.notSameDeepMembers([ { a: 1 }, { b: 2 }, { c: 3 } ], [{ b: 2 }, { a: 1 }, { f: 5 }], 'not same deep members');
     *
     * @name notSameDeepMembers
     * @param {Array} set1
     * @param {Array} set2
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.notSameDeepMembers = function (set1, set2, msg) {
      new Assertion(set1, msg, assert.notSameDeepMembers, true).to.not.have.same.deep.members(set2);
    };
    /**
     * ### .sameOrderedMembers(set1, set2, [message])
     *
     * Asserts that `set1` and `set2` have the same members in the same order.
     * Uses a strict equality check (===).
     *
     *     assert.sameOrderedMembers([ 1, 2, 3 ], [ 1, 2, 3 ], 'same ordered members');
     *
     * @name sameOrderedMembers
     * @param {Array} set1
     * @param {Array} set2
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.sameOrderedMembers = function (set1, set2, msg) {
      new Assertion(set1, msg, assert.sameOrderedMembers, true).to.have.same.ordered.members(set2);
    };
    /**
     * ### .notSameOrderedMembers(set1, set2, [message])
     *
     * Asserts that `set1` and `set2` don't have the same members in the same
     * order. Uses a strict equality check (===).
     *
     *     assert.notSameOrderedMembers([ 1, 2, 3 ], [ 2, 1, 3 ], 'not same ordered members');
     *
     * @name notSameOrderedMembers
     * @param {Array} set1
     * @param {Array} set2
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.notSameOrderedMembers = function (set1, set2, msg) {
      new Assertion(set1, msg, assert.notSameOrderedMembers, true).to.not.have.same.ordered.members(set2);
    };
    /**
     * ### .sameDeepOrderedMembers(set1, set2, [message])
     *
     * Asserts that `set1` and `set2` have the same members in the same order.
     * Uses a deep equality check.
     *
     * assert.sameDeepOrderedMembers([ { a: 1 }, { b: 2 }, { c: 3 } ], [ { a: 1 }, { b: 2 }, { c: 3 } ], 'same deep ordered members');
     *
     * @name sameDeepOrderedMembers
     * @param {Array} set1
     * @param {Array} set2
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.sameDeepOrderedMembers = function (set1, set2, msg) {
      new Assertion(set1, msg, assert.sameDeepOrderedMembers, true).to.have.same.deep.ordered.members(set2);
    };
    /**
     * ### .notSameDeepOrderedMembers(set1, set2, [message])
     *
     * Asserts that `set1` and `set2` don't have the same members in the same
     * order. Uses a deep equality check.
     *
     * assert.notSameDeepOrderedMembers([ { a: 1 }, { b: 2 }, { c: 3 } ], [ { a: 1 }, { b: 2 }, { z: 5 } ], 'not same deep ordered members');
     * assert.notSameDeepOrderedMembers([ { a: 1 }, { b: 2 }, { c: 3 } ], [ { b: 2 }, { a: 1 }, { c: 3 } ], 'not same deep ordered members');
     *
     * @name notSameDeepOrderedMembers
     * @param {Array} set1
     * @param {Array} set2
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.notSameDeepOrderedMembers = function (set1, set2, msg) {
      new Assertion(set1, msg, assert.notSameDeepOrderedMembers, true).to.not.have.same.deep.ordered.members(set2);
    };
    /**
     * ### .includeMembers(superset, subset, [message])
     *
     * Asserts that `subset` is included in `superset` in any order. Uses a
     * strict equality check (===). Duplicates are ignored.
     *
     *     assert.includeMembers([ 1, 2, 3 ], [ 2, 1, 2 ], 'include members');
     *
     * @name includeMembers
     * @param {Array} superset
     * @param {Array} subset
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.includeMembers = function (superset, subset, msg) {
      new Assertion(superset, msg, assert.includeMembers, true).to.include.members(subset);
    };
    /**
     * ### .notIncludeMembers(superset, subset, [message])
     *
     * Asserts that `subset` isn't included in `superset` in any order. Uses a
     * strict equality check (===). Duplicates are ignored.
     *
     *     assert.notIncludeMembers([ 1, 2, 3 ], [ 5, 1 ], 'not include members');
     *
     * @name notIncludeMembers
     * @param {Array} superset
     * @param {Array} subset
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.notIncludeMembers = function (superset, subset, msg) {
      new Assertion(superset, msg, assert.notIncludeMembers, true).to.not.include.members(subset);
    };
    /**
     * ### .includeDeepMembers(superset, subset, [message])
     *
     * Asserts that `subset` is included in `superset` in any order. Uses a deep
     * equality check. Duplicates are ignored.
     *
     *     assert.includeDeepMembers([ { a: 1 }, { b: 2 }, { c: 3 } ], [ { b: 2 }, { a: 1 }, { b: 2 } ], 'include deep members');
     *
     * @name includeDeepMembers
     * @param {Array} superset
     * @param {Array} subset
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.includeDeepMembers = function (superset, subset, msg) {
      new Assertion(superset, msg, assert.includeDeepMembers, true).to.include.deep.members(subset);
    };
    /**
     * ### .notIncludeDeepMembers(superset, subset, [message])
     *
     * Asserts that `subset` isn't included in `superset` in any order. Uses a
     * deep equality check. Duplicates are ignored.
     *
     *     assert.notIncludeDeepMembers([ { a: 1 }, { b: 2 }, { c: 3 } ], [ { b: 2 }, { f: 5 } ], 'not include deep members');
     *
     * @name notIncludeDeepMembers
     * @param {Array} superset
     * @param {Array} subset
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.notIncludeDeepMembers = function (superset, subset, msg) {
      new Assertion(superset, msg, assert.notIncludeDeepMembers, true).to.not.include.deep.members(subset);
    };
    /**
     * ### .includeOrderedMembers(superset, subset, [message])
     *
     * Asserts that `subset` is included in `superset` in the same order
     * beginning with the first element in `superset`. Uses a strict equality
     * check (===).
     *
     *     assert.includeOrderedMembers([ 1, 2, 3 ], [ 1, 2 ], 'include ordered members');
     *
     * @name includeOrderedMembers
     * @param {Array} superset
     * @param {Array} subset
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.includeOrderedMembers = function (superset, subset, msg) {
      new Assertion(superset, msg, assert.includeOrderedMembers, true).to.include.ordered.members(subset);
    };
    /**
     * ### .notIncludeOrderedMembers(superset, subset, [message])
     *
     * Asserts that `subset` isn't included in `superset` in the same order
     * beginning with the first element in `superset`. Uses a strict equality
     * check (===).
     *
     *     assert.notIncludeOrderedMembers([ 1, 2, 3 ], [ 2, 1 ], 'not include ordered members');
     *     assert.notIncludeOrderedMembers([ 1, 2, 3 ], [ 2, 3 ], 'not include ordered members');
     *
     * @name notIncludeOrderedMembers
     * @param {Array} superset
     * @param {Array} subset
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.notIncludeOrderedMembers = function (superset, subset, msg) {
      new Assertion(superset, msg, assert.notIncludeOrderedMembers, true).to.not.include.ordered.members(subset);
    };
    /**
     * ### .includeDeepOrderedMembers(superset, subset, [message])
     *
     * Asserts that `subset` is included in `superset` in the same order
     * beginning with the first element in `superset`. Uses a deep equality
     * check.
     *
     *     assert.includeDeepOrderedMembers([ { a: 1 }, { b: 2 }, { c: 3 } ], [ { a: 1 }, { b: 2 } ], 'include deep ordered members');
     *
     * @name includeDeepOrderedMembers
     * @param {Array} superset
     * @param {Array} subset
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.includeDeepOrderedMembers = function (superset, subset, msg) {
      new Assertion(superset, msg, assert.includeDeepOrderedMembers, true).to.include.deep.ordered.members(subset);
    };
    /**
     * ### .notIncludeDeepOrderedMembers(superset, subset, [message])
     *
     * Asserts that `subset` isn't included in `superset` in the same order
     * beginning with the first element in `superset`. Uses a deep equality
     * check.
     *
     *     assert.notIncludeDeepOrderedMembers([ { a: 1 }, { b: 2 }, { c: 3 } ], [ { a: 1 }, { f: 5 } ], 'not include deep ordered members');
     *     assert.notIncludeDeepOrderedMembers([ { a: 1 }, { b: 2 }, { c: 3 } ], [ { b: 2 }, { a: 1 } ], 'not include deep ordered members');
     *     assert.notIncludeDeepOrderedMembers([ { a: 1 }, { b: 2 }, { c: 3 } ], [ { b: 2 }, { c: 3 } ], 'not include deep ordered members');
     *
     * @name notIncludeDeepOrderedMembers
     * @param {Array} superset
     * @param {Array} subset
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.notIncludeDeepOrderedMembers = function (superset, subset, msg) {
      new Assertion(superset, msg, assert.notIncludeDeepOrderedMembers, true).to.not.include.deep.ordered.members(subset);
    };
    /**
     * ### .oneOf(inList, list, [message])
     *
     * Asserts that non-object, non-array value `inList` appears in the flat array `list`.
     *
     *     assert.oneOf(1, [ 2, 1 ], 'Not found in list');
     *
     * @name oneOf
     * @param {*} inList
     * @param {Array<*>} list
     * @param {String} message
     * @namespace Assert
     * @api public
     */


    assert.oneOf = function (inList, list, msg) {
      new Assertion(inList, msg, assert.oneOf, true).to.be.oneOf(list);
    };
    /**
     * ### .changes(function, object, property, [message])
     *
     * Asserts that a function changes the value of a property.
     *
     *     var obj = { val: 10 };
     *     var fn = function() { obj.val = 22 };
     *     assert.changes(fn, obj, 'val');
     *
     * @name changes
     * @param {Function} modifier function
     * @param {Object} object or getter function
     * @param {String} property name _optional_
     * @param {String} message _optional_
     * @namespace Assert
     * @api public
     */


    assert.changes = function (fn, obj, prop, msg) {
      if (arguments.length === 3 && typeof obj === 'function') {
        msg = prop;
        prop = null;
      }

      new Assertion(fn, msg, assert.changes, true).to.change(obj, prop);
    };
    /**
    * ### .changesBy(function, object, property, delta, [message])
    *
    * Asserts that a function changes the value of a property by an amount (delta).
    *
    *     var obj = { val: 10 };
    *     var fn = function() { obj.val += 2 };
    *     assert.changesBy(fn, obj, 'val', 2);
    *
    * @name changesBy
    * @param {Function} modifier function
    * @param {Object} object or getter function
    * @param {String} property name _optional_
    * @param {Number} change amount (delta)
    * @param {String} message _optional_
    * @namespace Assert
    * @api public
    */


    assert.changesBy = function (fn, obj, prop, delta, msg) {
      if (arguments.length === 4 && typeof obj === 'function') {
        var tmpMsg = delta;
        delta = prop;
        msg = tmpMsg;
      } else if (arguments.length === 3) {
        delta = prop;
        prop = null;
      }

      new Assertion(fn, msg, assert.changesBy, true).to.change(obj, prop).by(delta);
    };
    /**
    * ### .doesNotChange(function, object, property, [message])
    *
    * Asserts that a function does not change the value of a property.
    *
    *     var obj = { val: 10 };
    *     var fn = function() { console.log('foo'); };
    *     assert.doesNotChange(fn, obj, 'val');
    *
    * @name doesNotChange
    * @param {Function} modifier function
    * @param {Object} object or getter function
    * @param {String} property name _optional_
    * @param {String} message _optional_
    * @namespace Assert
    * @api public
    */


    assert.doesNotChange = function (fn, obj, prop, msg) {
      if (arguments.length === 3 && typeof obj === 'function') {
        msg = prop;
        prop = null;
      }

      return new Assertion(fn, msg, assert.doesNotChange, true).to.not.change(obj, prop);
    };
    /**
     * ### .changesButNotBy(function, object, property, delta, [message])
     *
     * Asserts that a function does not change the value of a property or of a function's return value by an amount (delta)
     *
     *     var obj = { val: 10 };
     *     var fn = function() { obj.val += 10 };
     *     assert.changesButNotBy(fn, obj, 'val', 5);
     *
     * @name changesButNotBy
     * @param {Function} modifier function
     * @param {Object} object or getter function
     * @param {String} property name _optional_
     * @param {Number} change amount (delta)
     * @param {String} message _optional_
     * @namespace Assert
     * @api public
     */


    assert.changesButNotBy = function (fn, obj, prop, delta, msg) {
      if (arguments.length === 4 && typeof obj === 'function') {
        var tmpMsg = delta;
        delta = prop;
        msg = tmpMsg;
      } else if (arguments.length === 3) {
        delta = prop;
        prop = null;
      }

      new Assertion(fn, msg, assert.changesButNotBy, true).to.change(obj, prop).but.not.by(delta);
    };
    /**
     * ### .increases(function, object, property, [message])
     *
     * Asserts that a function increases a numeric object property.
     *
     *     var obj = { val: 10 };
     *     var fn = function() { obj.val = 13 };
     *     assert.increases(fn, obj, 'val');
     *
     * @name increases
     * @param {Function} modifier function
     * @param {Object} object or getter function
     * @param {String} property name _optional_
     * @param {String} message _optional_
     * @namespace Assert
     * @api public
     */


    assert.increases = function (fn, obj, prop, msg) {
      if (arguments.length === 3 && typeof obj === 'function') {
        msg = prop;
        prop = null;
      }

      return new Assertion(fn, msg, assert.increases, true).to.increase(obj, prop);
    };
    /**
     * ### .increasesBy(function, object, property, delta, [message])
     *
     * Asserts that a function increases a numeric object property or a function's return value by an amount (delta).
     *
     *     var obj = { val: 10 };
     *     var fn = function() { obj.val += 10 };
     *     assert.increasesBy(fn, obj, 'val', 10);
     *
     * @name increasesBy
     * @param {Function} modifier function
     * @param {Object} object or getter function
     * @param {String} property name _optional_
     * @param {Number} change amount (delta)
     * @param {String} message _optional_
     * @namespace Assert
     * @api public
     */


    assert.increasesBy = function (fn, obj, prop, delta, msg) {
      if (arguments.length === 4 && typeof obj === 'function') {
        var tmpMsg = delta;
        delta = prop;
        msg = tmpMsg;
      } else if (arguments.length === 3) {
        delta = prop;
        prop = null;
      }

      new Assertion(fn, msg, assert.increasesBy, true).to.increase(obj, prop).by(delta);
    };
    /**
     * ### .doesNotIncrease(function, object, property, [message])
     *
     * Asserts that a function does not increase a numeric object property.
     *
     *     var obj = { val: 10 };
     *     var fn = function() { obj.val = 8 };
     *     assert.doesNotIncrease(fn, obj, 'val');
     *
     * @name doesNotIncrease
     * @param {Function} modifier function
     * @param {Object} object or getter function
     * @param {String} property name _optional_
     * @param {String} message _optional_
     * @namespace Assert
     * @api public
     */


    assert.doesNotIncrease = function (fn, obj, prop, msg) {
      if (arguments.length === 3 && typeof obj === 'function') {
        msg = prop;
        prop = null;
      }

      return new Assertion(fn, msg, assert.doesNotIncrease, true).to.not.increase(obj, prop);
    };
    /**
     * ### .increasesButNotBy(function, object, property, [message])
     *
     * Asserts that a function does not increase a numeric object property or function's return value by an amount (delta).
     *
     *     var obj = { val: 10 };
     *     var fn = function() { obj.val = 15 };
     *     assert.increasesButNotBy(fn, obj, 'val', 10);
     *
     * @name increasesButNotBy
     * @param {Function} modifier function
     * @param {Object} object or getter function
     * @param {String} property name _optional_
     * @param {Number} change amount (delta)
     * @param {String} message _optional_
     * @namespace Assert
     * @api public
     */


    assert.increasesButNotBy = function (fn, obj, prop, delta, msg) {
      if (arguments.length === 4 && typeof obj === 'function') {
        var tmpMsg = delta;
        delta = prop;
        msg = tmpMsg;
      } else if (arguments.length === 3) {
        delta = prop;
        prop = null;
      }

      new Assertion(fn, msg, assert.increasesButNotBy, true).to.increase(obj, prop).but.not.by(delta);
    };
    /**
     * ### .decreases(function, object, property, [message])
     *
     * Asserts that a function decreases a numeric object property.
     *
     *     var obj = { val: 10 };
     *     var fn = function() { obj.val = 5 };
     *     assert.decreases(fn, obj, 'val');
     *
     * @name decreases
     * @param {Function} modifier function
     * @param {Object} object or getter function
     * @param {String} property name _optional_
     * @param {String} message _optional_
     * @namespace Assert
     * @api public
     */


    assert.decreases = function (fn, obj, prop, msg) {
      if (arguments.length === 3 && typeof obj === 'function') {
        msg = prop;
        prop = null;
      }

      return new Assertion(fn, msg, assert.decreases, true).to.decrease(obj, prop);
    };
    /**
     * ### .decreasesBy(function, object, property, delta, [message])
     *
     * Asserts that a function decreases a numeric object property or a function's return value by an amount (delta)
     *
     *     var obj = { val: 10 };
     *     var fn = function() { obj.val -= 5 };
     *     assert.decreasesBy(fn, obj, 'val', 5);
     *
     * @name decreasesBy
     * @param {Function} modifier function
     * @param {Object} object or getter function
     * @param {String} property name _optional_
     * @param {Number} change amount (delta)
     * @param {String} message _optional_
     * @namespace Assert
     * @api public
     */


    assert.decreasesBy = function (fn, obj, prop, delta, msg) {
      if (arguments.length === 4 && typeof obj === 'function') {
        var tmpMsg = delta;
        delta = prop;
        msg = tmpMsg;
      } else if (arguments.length === 3) {
        delta = prop;
        prop = null;
      }

      new Assertion(fn, msg, assert.decreasesBy, true).to.decrease(obj, prop).by(delta);
    };
    /**
     * ### .doesNotDecrease(function, object, property, [message])
     *
     * Asserts that a function does not decreases a numeric object property.
     *
     *     var obj = { val: 10 };
     *     var fn = function() { obj.val = 15 };
     *     assert.doesNotDecrease(fn, obj, 'val');
     *
     * @name doesNotDecrease
     * @param {Function} modifier function
     * @param {Object} object or getter function
     * @param {String} property name _optional_
     * @param {String} message _optional_
     * @namespace Assert
     * @api public
     */


    assert.doesNotDecrease = function (fn, obj, prop, msg) {
      if (arguments.length === 3 && typeof obj === 'function') {
        msg = prop;
        prop = null;
      }

      return new Assertion(fn, msg, assert.doesNotDecrease, true).to.not.decrease(obj, prop);
    };
    /**
     * ### .doesNotDecreaseBy(function, object, property, delta, [message])
     *
     * Asserts that a function does not decreases a numeric object property or a function's return value by an amount (delta)
     *
     *     var obj = { val: 10 };
     *     var fn = function() { obj.val = 5 };
     *     assert.doesNotDecreaseBy(fn, obj, 'val', 1);
     *
     * @name doesNotDecrease
     * @param {Function} modifier function
     * @param {Object} object or getter function
     * @param {String} property name _optional_
     * @param {Number} change amount (delta)
     * @param {String} message _optional_
     * @namespace Assert
     * @api public
     */


    assert.doesNotDecreaseBy = function (fn, obj, prop, delta, msg) {
      if (arguments.length === 4 && typeof obj === 'function') {
        var tmpMsg = delta;
        delta = prop;
        msg = tmpMsg;
      } else if (arguments.length === 3) {
        delta = prop;
        prop = null;
      }

      return new Assertion(fn, msg, assert.doesNotDecreaseBy, true).to.not.decrease(obj, prop).by(delta);
    };
    /**
     * ### .decreasesButNotBy(function, object, property, delta, [message])
     *
     * Asserts that a function does not decreases a numeric object property or a function's return value by an amount (delta)
     *
     *     var obj = { val: 10 };
     *     var fn = function() { obj.val = 5 };
     *     assert.decreasesButNotBy(fn, obj, 'val', 1);
     *
     * @name decreasesButNotBy
     * @param {Function} modifier function
     * @param {Object} object or getter function
     * @param {String} property name _optional_
     * @param {Number} change amount (delta)
     * @param {String} message _optional_
     * @namespace Assert
     * @api public
     */


    assert.decreasesButNotBy = function (fn, obj, prop, delta, msg) {
      if (arguments.length === 4 && typeof obj === 'function') {
        var tmpMsg = delta;
        delta = prop;
        msg = tmpMsg;
      } else if (arguments.length === 3) {
        delta = prop;
        prop = null;
      }

      new Assertion(fn, msg, assert.decreasesButNotBy, true).to.decrease(obj, prop).but.not.by(delta);
    };
    /*!
     * ### .ifError(object)
     *
     * Asserts if value is not a false value, and throws if it is a true value.
     * This is added to allow for chai to be a drop-in replacement for Node's
     * assert class.
     *
     *     var err = new Error('I am a custom error');
     *     assert.ifError(err); // Rethrows err!
     *
     * @name ifError
     * @param {Object} object
     * @namespace Assert
     * @api public
     */


    assert.ifError = function (val) {
      if (val) {
        throw val;
      }
    };
    /**
     * ### .isExtensible(object)
     *
     * Asserts that `object` is extensible (can have new properties added to it).
     *
     *     assert.isExtensible({});
     *
     * @name isExtensible
     * @alias extensible
     * @param {Object} object
     * @param {String} message _optional_
     * @namespace Assert
     * @api public
     */


    assert.isExtensible = function (obj, msg) {
      new Assertion(obj, msg, assert.isExtensible, true).to.be.extensible;
    };
    /**
     * ### .isNotExtensible(object)
     *
     * Asserts that `object` is _not_ extensible.
     *
     *     var nonExtensibleObject = Object.preventExtensions({});
     *     var sealedObject = Object.seal({});
     *     var frozenObject = Object.freeze({});
     *
     *     assert.isNotExtensible(nonExtensibleObject);
     *     assert.isNotExtensible(sealedObject);
     *     assert.isNotExtensible(frozenObject);
     *
     * @name isNotExtensible
     * @alias notExtensible
     * @param {Object} object
     * @param {String} message _optional_
     * @namespace Assert
     * @api public
     */


    assert.isNotExtensible = function (obj, msg) {
      new Assertion(obj, msg, assert.isNotExtensible, true).to.not.be.extensible;
    };
    /**
     * ### .isSealed(object)
     *
     * Asserts that `object` is sealed (cannot have new properties added to it
     * and its existing properties cannot be removed).
     *
     *     var sealedObject = Object.seal({});
     *     var frozenObject = Object.seal({});
     *
     *     assert.isSealed(sealedObject);
     *     assert.isSealed(frozenObject);
     *
     * @name isSealed
     * @alias sealed
     * @param {Object} object
     * @param {String} message _optional_
     * @namespace Assert
     * @api public
     */


    assert.isSealed = function (obj, msg) {
      new Assertion(obj, msg, assert.isSealed, true).to.be.sealed;
    };
    /**
     * ### .isNotSealed(object)
     *
     * Asserts that `object` is _not_ sealed.
     *
     *     assert.isNotSealed({});
     *
     * @name isNotSealed
     * @alias notSealed
     * @param {Object} object
     * @param {String} message _optional_
     * @namespace Assert
     * @api public
     */


    assert.isNotSealed = function (obj, msg) {
      new Assertion(obj, msg, assert.isNotSealed, true).to.not.be.sealed;
    };
    /**
     * ### .isFrozen(object)
     *
     * Asserts that `object` is frozen (cannot have new properties added to it
     * and its existing properties cannot be modified).
     *
     *     var frozenObject = Object.freeze({});
     *     assert.frozen(frozenObject);
     *
     * @name isFrozen
     * @alias frozen
     * @param {Object} object
     * @param {String} message _optional_
     * @namespace Assert
     * @api public
     */


    assert.isFrozen = function (obj, msg) {
      new Assertion(obj, msg, assert.isFrozen, true).to.be.frozen;
    };
    /**
     * ### .isNotFrozen(object)
     *
     * Asserts that `object` is _not_ frozen.
     *
     *     assert.isNotFrozen({});
     *
     * @name isNotFrozen
     * @alias notFrozen
     * @param {Object} object
     * @param {String} message _optional_
     * @namespace Assert
     * @api public
     */


    assert.isNotFrozen = function (obj, msg) {
      new Assertion(obj, msg, assert.isNotFrozen, true).to.not.be.frozen;
    };
    /**
     * ### .isEmpty(target)
     *
     * Asserts that the target does not contain any values.
     * For arrays and strings, it checks the `length` property.
     * For `Map` and `Set` instances, it checks the `size` property.
     * For non-function objects, it gets the count of own
     * enumerable string keys.
     *
     *     assert.isEmpty([]);
     *     assert.isEmpty('');
     *     assert.isEmpty(new Map);
     *     assert.isEmpty({});
     *
     * @name isEmpty
     * @alias empty
     * @param {Object|Array|String|Map|Set} target
     * @param {String} message _optional_
     * @namespace Assert
     * @api public
     */


    assert.isEmpty = function (val, msg) {
      new Assertion(val, msg, assert.isEmpty, true).to.be.empty;
    };
    /**
     * ### .isNotEmpty(target)
     *
     * Asserts that the target contains values.
     * For arrays and strings, it checks the `length` property.
     * For `Map` and `Set` instances, it checks the `size` property.
     * For non-function objects, it gets the count of own
     * enumerable string keys.
     *
     *     assert.isNotEmpty([1, 2]);
     *     assert.isNotEmpty('34');
     *     assert.isNotEmpty(new Set([5, 6]));
     *     assert.isNotEmpty({ key: 7 });
     *
     * @name isNotEmpty
     * @alias notEmpty
     * @param {Object|Array|String|Map|Set} target
     * @param {String} message _optional_
     * @namespace Assert
     * @api public
     */


    assert.isNotEmpty = function (val, msg) {
      new Assertion(val, msg, assert.isNotEmpty, true).to.not.be.empty;
    };
    /*!
     * Aliases.
     */


    (function alias(name, as) {
      assert[as] = assert[name];
      return alias;
    })('isOk', 'ok')('isNotOk', 'notOk')('throws', 'throw')('throws', 'Throw')('isExtensible', 'extensible')('isNotExtensible', 'notExtensible')('isSealed', 'sealed')('isNotSealed', 'notSealed')('isFrozen', 'frozen')('isNotFrozen', 'notFrozen')('isEmpty', 'empty')('isNotEmpty', 'notEmpty');
  };

  var chai = createCommonjsModule(function (module, exports) {
    /*!
     * chai
     * Copyright(c) 2011-2014 Jake Luer <jake@alogicalparadox.com>
     * MIT Licensed
     */
    var used = [];
    /*!
     * Chai version
     */

    exports.version = '4.1.2';
    /*!
     * Assertion Error
     */

    exports.AssertionError = assertionError;
    /*!
     * Utils for plugins (not exported)
     */

    /**
     * # .use(function)
     *
     * Provides a way to extend the internals of Chai.
     *
     * @param {Function}
     * @returns {this} for chaining
     * @api public
     */

    exports.use = function (fn) {
      if (!~used.indexOf(fn)) {
        fn(exports, utils);
        used.push(fn);
      }

      return exports;
    };
    /*!
     * Utility Functions
     */


    exports.util = utils;
    /*!
     * Configuration
     */

    exports.config = config;
    /*!
     * Primary `Assertion` prototype
     */

    exports.use(assertion);
    /*!
     * Core Assertions
     */

    exports.use(assertions);
    /*!
     * Expect interface
     */

    exports.use(expect);
    /*!
     * Should interface
     */

    exports.use(should);
    /*!
     * Assert interface
     */

    exports.use(assert);
  });
  var chai_1 = chai.version;
  var chai_2 = chai.AssertionError;
  var chai_3 = chai.use;
  var chai_4 = chai.util;
  var chai_5 = chai.config;

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
      let s = [];

      for (let issue of pullList) {
        s.push((await this.assembleIssue(issue, needsJira)));
      }

      return s;
    },

    async gh() {
      let issues = await this.getIssues(true);

      for (let issue of issues) {
        //await this.printIssue(issue);
        await this.checkStatus(issue);
      }
    },

    cardRegex: /\[(?:\w+\s*\-\s*)?(\w+)\s*\-\s*(\d+)\]/,

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

      if (exports.configObject.vvverbose) {
        log();
        log(cardLink);
        log(jiraInfo);
      }

      if (jiraInfo.errorMessages) {
        log(cardLink);
        log(jiraInfo.errorMessages);
        return issue;
      }

      let parsedInfo = {
        assignee_dev: jiraInfo.fields.assignee,
        reporter: jiraInfo.fields.reporter,
        labels: jiraInfo.fields.labels,
        creator: jiraInfo.fields.creator,
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

      if (exports.configObject.vvverbose) {
        log(issue);
      }

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

      if (args.branch) {
        releaseBranchName = args.branch;
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

      let pull_request_descriptions = [];
      let pull_request_dev_comments = [];
      let issues = await this.getIssues();

      for (let issue of issues) {
        let labels = new Set(issue.labels.map(x => x.name));
        if (!labels.has(prodReadyLabel) && !labels.has(prodManualLabel)) continue;
        await this.setBase(issue, releaseBranchName);
        write(chalk`Changed base of ${issue.number} (${this.printJiraTicket(issue)}) to ${releaseBranchName}... `);

        if (!issue.parsedTitle) {
          log();
          write(chalk`Full title ^^: ${issue.title}...`);
        }

        let config = this.getOctokitConfig();
        config.pull_number = issue.number;
        let pull_request = await this.octokit.request("GET /repos/{owner}/{repo}/pulls/{pull_number}", config);
        let pull_request_description = pull_request.data.body.replace("Description (user facing release note):", "").replace(/Dev comments:[\s\S]*/, "").trim();
        let pull_request_dev_comment = pull_request.data.body.replace(/[\s\S]*Dev comments:/, "").trim();
        pull_request_descriptions.push(pull_request_description);
        pull_request_dev_comments.push(pull_request_dev_comment);
        config.merge_method = "squash";
        await this.octokit.request("PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge", config);
        log(chalk`Merged.`);
      }

      let config = this.getOctokitConfig();
      config.title = releaseBranchName.split("-").join(" ");
      config.head = releaseBranchName;
      config.base = "staging";
      config.body = "Description:\n" + pull_request_descriptions.filter(d => d.length != 0).map(d => `• ${d}`).join("\n") + "\n\nDev comments:\n" + pull_request_dev_comments.filter(d => d.length != 0).map(d => `• ${d}`).join("\n");
      await this.octokit.request("POST /repos/{owner}/{repo}/pulls", config);
      await runGit([0], "pull");
    },

    async sendSlackMsg(msgItems, slackChannel) {
      let blocks = [];

      for (let item of msgItems) {
        if (Array.isArray(item.content)) {
          let characterCount = 0;
          let subMsg = [];

          for (let subItem of item.content) {
            subMsg.push(subItem);
            characterCount += subItem.length;

            if (characterCount > 2000) {
              characterCount = 0;
              let block = {
                "type": "section",
                "text": {
                  "type": "mrkdwn",
                  "text": " "
                }
              };
              block.text.text = item.type == "code" ? "```" + subMsg.join("\n") + "```" : subMsg.join("\n");

              if (subMsg.join("\n").length != 0) {
                blocks.push(block);
              }

              subMsg = [];
            }
          }

          if (subMsg.length != 0) {
            let block = {
              "type": "section",
              "text": {
                "type": "mrkdwn",
                "text": " "
              }
            };
            block.text.text = item.type == "code" ? "```" + subMsg.join("\n") + "```" : subMsg.join("\n");

            if (subMsg.join("\n").length != 0) {
              blocks.push(block);
            }
          }
        } else {
          let block = {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": " "
            }
          };
          block.text.text = item.type == "code" ? "```" + item.content + "```" : item.content;

          if (item.content.length != 0) {
            blocks.push(block);
          }
        }
      }

      for (let block of blocks) {
        response = await rp({
          method: "POST",
          body: JSON.stringify({
            "blocks": [block]
          }),
          headers: {
            "Content-Type": "application/json"
          },
          uri: slackChannel
        });
      }
    },

    async stageSlackMsg(args) {
      Stage$$1.env = args.env || "UAT";
      Stage$$1.skipLoadMsg = true;

      if (!args.branch) {
        log(chalk`{red Error:} Please provide a branch`);
        return;
      }

      await runCommand(`git checkout ${args.branch}`);
      let requiredPresetsRules = await runCommand(`git diff staging...HEAD --name-only | rally @`);
      await runCommand(`git checkout staging`);
      requiredPresetsRules = requiredPresetsRules.replace("Reading from stdin\n", "");

      if (await Stage$$1.downloadStage()) {
        log(chalk`{red Error:} Could not load stage`);
        return;
      }

      let stagedBranchesMsg = [`Currently Staged Presets: ${Stage$$1.stageData.stage.length}`].concat(Stage$$1.stageData.stage.map(d => `    ${d.branch} ${d.commit}`));
      let msgItems = [{
        type: "normal",
        content: `@here The release branch has been staged by ${exports.configObject.slackId ? `<@${exports.configObject.slackId}>` : exports.configObject.ownerName}`
      }, {
        type: "code",
        content: stagedBranchesMsg
      }, {
        type: "code",
        content: requiredPresetsRules.split("\n")
      }];
      await this.sendSlackMsg(msgItems, exports.configObject.deploy.slackWebhooks.air_supply_release_staging);
    },

    async deploySlackMessage(args) {
      if (!args.pr) {
        log(chalk`{red Error:} Please provide a pr number`);
        return;
      }

      let today = new Date();
      today = String(today.getMonth() + 1).padStart(2, '0') + '/' + String(today.getDate()).padStart(2, '0') + '/' + today.getFullYear();
      let config = this.getOctokitConfig();
      config.pull_number = args.pr;
      let pull_request = await this.octokit.request("GET /repos/{owner}/{repo}/pulls/{pull_number}", config);
      let branch = pull_request.data.head.ref;
      let pull_request_descriptions = pull_request.data.body.replace("Description (user facing release note):", "").replace("Description:", "").replace(/Dev comments:[\s\S]*/, "").trim();
      await runCommand(`git checkout ${branch}`);
      let requiredPresetsRules = await runCommand(`git diff staging...HEAD --name-only | rally @`);
      await runCommand(`git checkout staging`);
      requiredPresetsRules = requiredPresetsRules.replace("Reading from stdin\n", "");
      let msgItems = [{
        type: "normal",
        content: `@here ${args.hotfix ? "*HOTFIX*" : `*DEPLOY ${today}*`}`
      }, {
        type: "normal",
        content: `Deployer: ${exports.configObject.slackId ? `<@${exports.configObject.slackId}>` : exports.configObject.ownerName}`
      }, {
        type: "normal",
        content: pull_request_descriptions.split("\n")
      }, {
        type: "code",
        content: requiredPresetsRules.split("\n")
      }];
      await this.sendSlackMsg(msgItems, exports.configObject.deploy.slackWebhooks.rally_deployments);
    }

  };

  let _defaultLinter;

  function defaultLinter(args, refresh = false) {
    if (_defaultLinter && !refresh) return _defaultLinter;
    return _defaultLinter = new Lint(args, exports.configObject);
  }
  class LintResults {
    constructor(lintResults, softFaults) {
      this.json = lintResults;
      this.softFaults = softFaults;
    }

    chalkPrint() {
      if (this.json) {
        let hard = this.json["hard-faults"];
        let soft = this.json["soft-faults"];

        if (this.softFaults) {
          log(chalk`{bold {red ${hard.length} Hard Fault(s)}}`);
          log(chalk.red`--------------------`);

          for (let fault of hard) {
            log(chalk`{red Line ${chalk(fault.line)}: ${chalk(fault.message)}}`);
          }

          log(chalk`{bold {yellow ${chalk(soft.length)} Soft Fault(s)}}`);
          log(chalk.yellow`--------------------`);

          for (let fault of soft) {
            log(chalk`{yellow Line ${chalk(fault.line)}: ${chalk(fault.message)}}`);
          }
        } else {
          log(chalk`{bold {red ${chalk(hard.length)} Hard Fault(s)}}`);
          log(chalk.red`--------------------`);

          for (let fault of hard) {
            log(chalk`{red Line ${chalk(fault.line)}: ${chalk(fault.message)}}`);
          }
        }
      }
    }

  }
  class Lint {
    constructor({
      soft,
      env
    }, config) {
      this.url = config.lintServiceUrl;
      this.softFaults = soft ? true : false;
      this.env = env;
    }

    async linkRequest(url, method, headers, body) {
      let response = await fetch(url, {
        method,
        headers,
        body
      });

      if (response.status != 200) {
        log(chalk`{red Linting service error}`);
        let error = await response.json();
        console.log(error);
      } else {
        let lintResults = await response.json();
        return lintResults;
      }
    }

    async lintPreset(preset) {
      let result;

      if (this.url) {
        result = await this.linkRequest(`${this.url}?silo=${this.env}`, "POST", {
          "Content-Type": "text/plain"
        }, preset.code);
      } else {
        throw new AbortError(chalk`Lint service url not configured (lintServiceUrl)`);
      }

      return new LintResults(result, this.softFaults);
    }

    async printLint(lintables) {
      for (let x of lintables) {
        if (!x.lint || !x.path.endsWith(".py")) {
          log(chalk`Skipping ${x.chalkPrint(false)}`);
          continue;
        }

        log(chalk`Linting ${x.chalkPrint(false)}`);
        let res = await x.lint(this);
        res.chalkPrint();
      }
    }

  }

  var lint = /*#__PURE__*/Object.freeze({
    defaultLinter: defaultLinter,
    LintResults: LintResults,
    Lint: Lint
  });

  /* Example:
  * let AWS = require("aws-sdk");
  * let credentials = new AWS.SharedIniFileCredentials({profile: "taskhandler"});
  * AWS.config.credentials = credentials;
  * 
  * let sq = new AWS.SQS({
  *     region: "us-east-1",
  * });
  * 
  * for await (let m of getMessage(sq, "https://sqs.us-east-1.amazonaws.com/12345/your-queue-here")){
  *     let o = JSON.parse(m.Body);
  *     ...
  * }
  *
  */
  async function getMessageList(sq, QueueUrl) {
    return await new Promise((resolve, reject) => {
      sq.receiveMessage({
        QueueUrl,
        MaxNumberOfMessages: 10
      }, function (err, data) {
        if (err) return reject(err);
        let messages = data.Messages || [];

        if (messages.length > 0) {
          sq.deleteMessageBatch({
            QueueUrl,
            Entries: messages.map(x => ({
              Id: x.MessageId,
              ReceiptHandle: x.ReceiptHandle
            }))
          }, function (delerr, _) {
            if (delerr) {
              return reject(delerr);
            }

            return resolve(messages);
          });
        } else {
          return resolve(messages);
        }
      });
    });
  }

  let sleep$1 = (time = 1000) => new Promise((resolve, _) => {
    setTimeout(resolve, time);
  });

  function getSQSMessages(_x, _x2) {
    return _getSQSMessages.apply(this, arguments);
  }

  function _getSQSMessages() {
    _getSQSMessages = _wrapAsyncGenerator(function* (sqsClient, queueUrl, {
      messageBuffer = 100,
      sleepTime = 2000
    } = {}) {
      let currMessages = [];
      let gml = getMessageList.bind(null, sqsClient, queueUrl);

      for (;;) {
        if (currMessages.length === 0) {
          let messagePromises = [];

          for (let i = 0; i < messageBuffer / 10; i++) {
            messagePromises.push(gml());
          } //get 100 messages at a time


          let currMessagesList = yield _awaitAsyncGenerator(Promise.all(messagePromises));

          for (let curMsgs of currMessagesList) {
            currMessages = currMessages.concat(curMsgs);
          }

          currMessages = currMessages.reverse();
        }

        if (currMessages.length === 0) {
          yield ["info", "No messages since last read"];
          yield _awaitAsyncGenerator(sleep$1(sleepTime));
          continue;
        }

        yield ["message", currMessages.pop()];
      }
    });
    return _getSQSMessages.apply(this, arguments);
  }

  async function getNumMessages(sqsClient, QueueUrl) {
    return await new Promise((resolve, reject) => {
      sqsClient.getQueueAttributes({
        QueueUrl,
        AttributeNames: ["ApproximateNumberOfMessages", "ApproximateNumberOfMessagesDelayed"]
      }, (err, data) => {
        if (err) {
          return reject(err);
        }

        return resolve(data.Attributes);
      });
    });
  }

  var sqs = /*#__PURE__*/Object.freeze({
    getSQSMessages: getSQSMessages,
    getNumMessages: getNumMessages
  });

  let _defaultUnitTester;

  function defaultUnitTester(args, refresh = false) {
    if (_defaultUnitTester && !refresh) return _defaultUnitTester;
    return _defaultUnitTester = new UnitTest(args, exports.configObject);
  }
  class UnitTestResults {
    constructor(unitTestResults) {
      this.results = unitTestResults;
    }

    chalkPrint() {
      if (this.results) {
        for (let warning of this.results.warnings) {
          log(chalk`{yellow Warning: ${chalk(warning)}}`);
        }

        log("--------------------");

        for (let test of this.results.data) {
          log(chalk`{bold name: }{cyan ${chalk(test.name)}}`);

          if (test.result == "pass") {
            log(chalk`{bold result: }{green pass}`);
          } else {
            log(chalk`{bold result: }{red fail}`);
          }

          log("");

          for (let kwarg in test.kwargs) {
            log(`${kwarg} = ${test.kwargs[kwarg]}`);
          }

          log("--------------------");
        }
      }
    }

  }
  class UnitTest {
    constructor({
      testEnv,
      libEnv
    }, config) {
      this.url = config.unitTestServiceUrl;
      this.testEnv = testEnv || "DEV";
      this.libEnv = libEnv || "UAT";
    }

    async unitTestRequest(url, method, headers, body) {
      try {
        let response = await fetch(url, {
          method,
          headers,
          body
        });

        if (response.status != 200) {
          log(chalk`{red Unit test service error}`);
          let error = await response.json();

          for (let e of error.errors) {
            log(chalk`{red Error: ${e}}`);
          }

          for (let w of error.warnings) {
            log(chalk`{red Warning: ${w}}`);
          }
        } else {
          let unitTestResults = await response.json();
          return unitTestResults;
        }
      } catch (e) {
        log(chalk`{red Unit test service error}`);
        log(e);
      }
    }

    async unitTestPreset(preset) {
      let result;

      if (this.url) {
        try {
          let unitTestCode = preset.getLocalUnitTestCode();
          result = await this.unitTestRequest(`${this.url}?testEnv=${this.testEnv}&libEnv=${this.libEnv}`, "POST", {
            "Content-Type": "text/plain"
          }, unitTestCode);
        } catch (e) {
          log(chalk`No unit tests for ${preset.chalkPrint(false)}`);
        }
      } else {
        log(chalk`{red Unit testing service url not configured}`);
      }

      return new UnitTestResults(result);
    }

    async printUnitTest(testables) {
      for (let x of testables) {
        if (!x.unitTest || !x.path.endsWith(".py")) {
          log(chalk`Skipping ${x.chalkPrint(false)}`);
          continue;
        }

        log(chalk`Testing ${x.chalkPrint(false)}`);
        let res = await x.unitTest(this);
        res.chalkPrint();
      }
    }

  }

  var unitTest = /*#__PURE__*/Object.freeze({
    defaultUnitTester: defaultUnitTester,
    UnitTestResults: UnitTestResults,
    UnitTest: UnitTest
  });

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

    async uploadRules(env, rules) {
      for (let rule of rules) {
        await rule.createOrUpdate(env);
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
      } else if (match[1] === "C") {
        return await UserDefinedConnector.getById(match[2], match[3]);
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

          case "providers":
            return new UserDefinedConnector({
              path: str,
              subProject: match[1]
            });
        }
      } catch (e) {
        log(chalk`{red Error}: Failed to parse {blue ${match[2]}}\n   in {green ${str}}:\n   ${e}`);
      }
    } else {
      return null;
    }
  }

  exports.UnitTest = unitTest;
  exports.SQS = sqs;
  exports.Lint = lint;
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
  exports.UserDefinedConnector = UserDefinedConnector;
  exports.Trace = Trace;
  exports.loadConfig = loadConfig;
  exports.loadConfigFromArgs = loadConfigFromArgs;
  exports.setConfig = setConfig;
  exports.logging = logging;
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
