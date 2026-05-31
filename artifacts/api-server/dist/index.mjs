import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';

globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
    
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// ../../node_modules/.pnpm/ms@2.1.3/node_modules/ms/index.js
var require_ms = __commonJS({
  "../../node_modules/.pnpm/ms@2.1.3/node_modules/ms/index.js"(exports2, module2) {
    var s = 1e3;
    var m = s * 60;
    var h = m * 60;
    var d = h * 24;
    var w = d * 7;
    var y = d * 365.25;
    module2.exports = function(val, options) {
      options = options || {};
      var type = typeof val;
      if (type === "string" && val.length > 0) {
        return parse(val);
      } else if (type === "number" && isFinite(val)) {
        return options.long ? fmtLong(val) : fmtShort(val);
      }
      throw new Error(
        "val is not a non-empty string or a valid number. val=" + JSON.stringify(val)
      );
    };
    function parse(str) {
      str = String(str);
      if (str.length > 100) {
        return;
      }
      var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
        str
      );
      if (!match) {
        return;
      }
      var n = parseFloat(match[1]);
      var type = (match[2] || "ms").toLowerCase();
      switch (type) {
        case "years":
        case "year":
        case "yrs":
        case "yr":
        case "y":
          return n * y;
        case "weeks":
        case "week":
        case "w":
          return n * w;
        case "days":
        case "day":
        case "d":
          return n * d;
        case "hours":
        case "hour":
        case "hrs":
        case "hr":
        case "h":
          return n * h;
        case "minutes":
        case "minute":
        case "mins":
        case "min":
        case "m":
          return n * m;
        case "seconds":
        case "second":
        case "secs":
        case "sec":
        case "s":
          return n * s;
        case "milliseconds":
        case "millisecond":
        case "msecs":
        case "msec":
        case "ms":
          return n;
        default:
          return void 0;
      }
    }
    function fmtShort(ms) {
      var msAbs = Math.abs(ms);
      if (msAbs >= d) {
        return Math.round(ms / d) + "d";
      }
      if (msAbs >= h) {
        return Math.round(ms / h) + "h";
      }
      if (msAbs >= m) {
        return Math.round(ms / m) + "m";
      }
      if (msAbs >= s) {
        return Math.round(ms / s) + "s";
      }
      return ms + "ms";
    }
    function fmtLong(ms) {
      var msAbs = Math.abs(ms);
      if (msAbs >= d) {
        return plural(ms, msAbs, d, "day");
      }
      if (msAbs >= h) {
        return plural(ms, msAbs, h, "hour");
      }
      if (msAbs >= m) {
        return plural(ms, msAbs, m, "minute");
      }
      if (msAbs >= s) {
        return plural(ms, msAbs, s, "second");
      }
      return ms + " ms";
    }
    function plural(ms, msAbs, n, name) {
      var isPlural = msAbs >= n * 1.5;
      return Math.round(ms / n) + " " + name + (isPlural ? "s" : "");
    }
  }
});

// ../../node_modules/.pnpm/debug@4.4.3/node_modules/debug/src/common.js
var require_common = __commonJS({
  "../../node_modules/.pnpm/debug@4.4.3/node_modules/debug/src/common.js"(exports2, module2) {
    function setup(env) {
      createDebug.debug = createDebug;
      createDebug.default = createDebug;
      createDebug.coerce = coerce;
      createDebug.disable = disable;
      createDebug.enable = enable;
      createDebug.enabled = enabled;
      createDebug.humanize = require_ms();
      createDebug.destroy = destroy;
      Object.keys(env).forEach((key) => {
        createDebug[key] = env[key];
      });
      createDebug.names = [];
      createDebug.skips = [];
      createDebug.formatters = {};
      function selectColor(namespace) {
        let hash = 0;
        for (let i = 0; i < namespace.length; i++) {
          hash = (hash << 5) - hash + namespace.charCodeAt(i);
          hash |= 0;
        }
        return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
      }
      createDebug.selectColor = selectColor;
      function createDebug(namespace) {
        let prevTime;
        let enableOverride = null;
        let namespacesCache;
        let enabledCache;
        function debug(...args) {
          if (!debug.enabled) {
            return;
          }
          const self2 = debug;
          const curr = Number(/* @__PURE__ */ new Date());
          const ms = curr - (prevTime || curr);
          self2.diff = ms;
          self2.prev = prevTime;
          self2.curr = curr;
          prevTime = curr;
          args[0] = createDebug.coerce(args[0]);
          if (typeof args[0] !== "string") {
            args.unshift("%O");
          }
          let index = 0;
          args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
            if (match === "%%") {
              return "%";
            }
            index++;
            const formatter = createDebug.formatters[format];
            if (typeof formatter === "function") {
              const val = args[index];
              match = formatter.call(self2, val);
              args.splice(index, 1);
              index--;
            }
            return match;
          });
          createDebug.formatArgs.call(self2, args);
          const logFn = self2.log || createDebug.log;
          logFn.apply(self2, args);
        }
        debug.namespace = namespace;
        debug.useColors = createDebug.useColors();
        debug.color = createDebug.selectColor(namespace);
        debug.extend = extend;
        debug.destroy = createDebug.destroy;
        Object.defineProperty(debug, "enabled", {
          enumerable: true,
          configurable: false,
          get: () => {
            if (enableOverride !== null) {
              return enableOverride;
            }
            if (namespacesCache !== createDebug.namespaces) {
              namespacesCache = createDebug.namespaces;
              enabledCache = createDebug.enabled(namespace);
            }
            return enabledCache;
          },
          set: (v) => {
            enableOverride = v;
          }
        });
        if (typeof createDebug.init === "function") {
          createDebug.init(debug);
        }
        return debug;
      }
      function extend(namespace, delimiter) {
        const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
        newDebug.log = this.log;
        return newDebug;
      }
      function enable(namespaces) {
        createDebug.save(namespaces);
        createDebug.namespaces = namespaces;
        createDebug.names = [];
        createDebug.skips = [];
        const split = (typeof namespaces === "string" ? namespaces : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
        for (const ns of split) {
          if (ns[0] === "-") {
            createDebug.skips.push(ns.slice(1));
          } else {
            createDebug.names.push(ns);
          }
        }
      }
      function matchesTemplate(search, template) {
        let searchIndex = 0;
        let templateIndex = 0;
        let starIndex = -1;
        let matchIndex = 0;
        while (searchIndex < search.length) {
          if (templateIndex < template.length && (template[templateIndex] === search[searchIndex] || template[templateIndex] === "*")) {
            if (template[templateIndex] === "*") {
              starIndex = templateIndex;
              matchIndex = searchIndex;
              templateIndex++;
            } else {
              searchIndex++;
              templateIndex++;
            }
          } else if (starIndex !== -1) {
            templateIndex = starIndex + 1;
            matchIndex++;
            searchIndex = matchIndex;
          } else {
            return false;
          }
        }
        while (templateIndex < template.length && template[templateIndex] === "*") {
          templateIndex++;
        }
        return templateIndex === template.length;
      }
      function disable() {
        const namespaces = [
          ...createDebug.names,
          ...createDebug.skips.map((namespace) => "-" + namespace)
        ].join(",");
        createDebug.enable("");
        return namespaces;
      }
      function enabled(name) {
        for (const skip of createDebug.skips) {
          if (matchesTemplate(name, skip)) {
            return false;
          }
        }
        for (const ns of createDebug.names) {
          if (matchesTemplate(name, ns)) {
            return true;
          }
        }
        return false;
      }
      function coerce(val) {
        if (val instanceof Error) {
          return val.stack || val.message;
        }
        return val;
      }
      function destroy() {
        console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
      }
      createDebug.enable(createDebug.load());
      return createDebug;
    }
    module2.exports = setup;
  }
});

// ../../node_modules/.pnpm/debug@4.4.3/node_modules/debug/src/browser.js
var require_browser = __commonJS({
  "../../node_modules/.pnpm/debug@4.4.3/node_modules/debug/src/browser.js"(exports2, module2) {
    exports2.formatArgs = formatArgs;
    exports2.save = save;
    exports2.load = load;
    exports2.useColors = useColors;
    exports2.storage = localstorage();
    exports2.destroy = /* @__PURE__ */ (() => {
      let warned = false;
      return () => {
        if (!warned) {
          warned = true;
          console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
        }
      };
    })();
    exports2.colors = [
      "#0000CC",
      "#0000FF",
      "#0033CC",
      "#0033FF",
      "#0066CC",
      "#0066FF",
      "#0099CC",
      "#0099FF",
      "#00CC00",
      "#00CC33",
      "#00CC66",
      "#00CC99",
      "#00CCCC",
      "#00CCFF",
      "#3300CC",
      "#3300FF",
      "#3333CC",
      "#3333FF",
      "#3366CC",
      "#3366FF",
      "#3399CC",
      "#3399FF",
      "#33CC00",
      "#33CC33",
      "#33CC66",
      "#33CC99",
      "#33CCCC",
      "#33CCFF",
      "#6600CC",
      "#6600FF",
      "#6633CC",
      "#6633FF",
      "#66CC00",
      "#66CC33",
      "#9900CC",
      "#9900FF",
      "#9933CC",
      "#9933FF",
      "#99CC00",
      "#99CC33",
      "#CC0000",
      "#CC0033",
      "#CC0066",
      "#CC0099",
      "#CC00CC",
      "#CC00FF",
      "#CC3300",
      "#CC3333",
      "#CC3366",
      "#CC3399",
      "#CC33CC",
      "#CC33FF",
      "#CC6600",
      "#CC6633",
      "#CC9900",
      "#CC9933",
      "#CCCC00",
      "#CCCC33",
      "#FF0000",
      "#FF0033",
      "#FF0066",
      "#FF0099",
      "#FF00CC",
      "#FF00FF",
      "#FF3300",
      "#FF3333",
      "#FF3366",
      "#FF3399",
      "#FF33CC",
      "#FF33FF",
      "#FF6600",
      "#FF6633",
      "#FF9900",
      "#FF9933",
      "#FFCC00",
      "#FFCC33"
    ];
    function useColors() {
      if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) {
        return true;
      }
      if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
        return false;
      }
      let m;
      return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
      typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
      // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
      typeof navigator !== "undefined" && navigator.userAgent && (m = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(m[1], 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
      typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
    }
    function formatArgs(args) {
      args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module2.exports.humanize(this.diff);
      if (!this.useColors) {
        return;
      }
      const c = "color: " + this.color;
      args.splice(1, 0, c, "color: inherit");
      let index = 0;
      let lastC = 0;
      args[0].replace(/%[a-zA-Z%]/g, (match) => {
        if (match === "%%") {
          return;
        }
        index++;
        if (match === "%c") {
          lastC = index;
        }
      });
      args.splice(lastC, 0, c);
    }
    exports2.log = console.debug || console.log || (() => {
    });
    function save(namespaces) {
      try {
        if (namespaces) {
          exports2.storage.setItem("debug", namespaces);
        } else {
          exports2.storage.removeItem("debug");
        }
      } catch (error) {
      }
    }
    function load() {
      let r;
      try {
        r = exports2.storage.getItem("debug") || exports2.storage.getItem("DEBUG");
      } catch (error) {
      }
      if (!r && typeof process !== "undefined" && "env" in process) {
        r = process.env.DEBUG;
      }
      return r;
    }
    function localstorage() {
      try {
        return localStorage;
      } catch (error) {
      }
    }
    module2.exports = require_common()(exports2);
    var { formatters } = module2.exports;
    formatters.j = function(v) {
      try {
        return JSON.stringify(v);
      } catch (error) {
        return "[UnexpectedJSONParseError]: " + error.message;
      }
    };
  }
});

// ../../node_modules/.pnpm/debug@4.4.3/node_modules/debug/src/node.js
var require_node = __commonJS({
  "../../node_modules/.pnpm/debug@4.4.3/node_modules/debug/src/node.js"(exports2, module2) {
    var tty = __require("tty");
    var util2 = __require("util");
    exports2.init = init;
    exports2.log = log;
    exports2.formatArgs = formatArgs;
    exports2.save = save;
    exports2.load = load;
    exports2.useColors = useColors;
    exports2.destroy = util2.deprecate(
      () => {
      },
      "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."
    );
    exports2.colors = [6, 2, 3, 4, 5, 1];
    try {
      const supportsColor = __require("supports-color");
      if (supportsColor && (supportsColor.stderr || supportsColor).level >= 2) {
        exports2.colors = [
          20,
          21,
          26,
          27,
          32,
          33,
          38,
          39,
          40,
          41,
          42,
          43,
          44,
          45,
          56,
          57,
          62,
          63,
          68,
          69,
          74,
          75,
          76,
          77,
          78,
          79,
          80,
          81,
          92,
          93,
          98,
          99,
          112,
          113,
          128,
          129,
          134,
          135,
          148,
          149,
          160,
          161,
          162,
          163,
          164,
          165,
          166,
          167,
          168,
          169,
          170,
          171,
          172,
          173,
          178,
          179,
          184,
          185,
          196,
          197,
          198,
          199,
          200,
          201,
          202,
          203,
          204,
          205,
          206,
          207,
          208,
          209,
          214,
          215,
          220,
          221
        ];
      }
    } catch (error) {
    }
    exports2.inspectOpts = Object.keys(process.env).filter((key) => {
      return /^debug_/i.test(key);
    }).reduce((obj, key) => {
      const prop = key.substring(6).toLowerCase().replace(/_([a-z])/g, (_, k) => {
        return k.toUpperCase();
      });
      let val = process.env[key];
      if (/^(yes|on|true|enabled)$/i.test(val)) {
        val = true;
      } else if (/^(no|off|false|disabled)$/i.test(val)) {
        val = false;
      } else if (val === "null") {
        val = null;
      } else {
        val = Number(val);
      }
      obj[prop] = val;
      return obj;
    }, {});
    function useColors() {
      return "colors" in exports2.inspectOpts ? Boolean(exports2.inspectOpts.colors) : tty.isatty(process.stderr.fd);
    }
    function formatArgs(args) {
      const { namespace: name, useColors: useColors2 } = this;
      if (useColors2) {
        const c = this.color;
        const colorCode = "\x1B[3" + (c < 8 ? c : "8;5;" + c);
        const prefix = `  ${colorCode};1m${name} \x1B[0m`;
        args[0] = prefix + args[0].split("\n").join("\n" + prefix);
        args.push(colorCode + "m+" + module2.exports.humanize(this.diff) + "\x1B[0m");
      } else {
        args[0] = getDate() + name + " " + args[0];
      }
    }
    function getDate() {
      if (exports2.inspectOpts.hideDate) {
        return "";
      }
      return (/* @__PURE__ */ new Date()).toISOString() + " ";
    }
    function log(...args) {
      return process.stderr.write(util2.formatWithOptions(exports2.inspectOpts, ...args) + "\n");
    }
    function save(namespaces) {
      if (namespaces) {
        process.env.DEBUG = namespaces;
      } else {
        delete process.env.DEBUG;
      }
    }
    function load() {
      return process.env.DEBUG;
    }
    function init(debug) {
      debug.inspectOpts = {};
      const keys = Object.keys(exports2.inspectOpts);
      for (let i = 0; i < keys.length; i++) {
        debug.inspectOpts[keys[i]] = exports2.inspectOpts[keys[i]];
      }
    }
    module2.exports = require_common()(exports2);
    var { formatters } = module2.exports;
    formatters.o = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util2.inspect(v, this.inspectOpts).split("\n").map((str) => str.trim()).join(" ");
    };
    formatters.O = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util2.inspect(v, this.inspectOpts);
    };
  }
});

// ../../node_modules/.pnpm/debug@4.4.3/node_modules/debug/src/index.js
var require_src = __commonJS({
  "../../node_modules/.pnpm/debug@4.4.3/node_modules/debug/src/index.js"(exports2, module2) {
    if (typeof process === "undefined" || process.type === "renderer" || process.browser === true || process.__nwjs) {
      module2.exports = require_browser();
    } else {
      module2.exports = require_node();
    }
  }
});

// ../../node_modules/.pnpm/depd@2.0.0/node_modules/depd/index.js
var require_depd = __commonJS({
  "../../node_modules/.pnpm/depd@2.0.0/node_modules/depd/index.js"(exports2, module2) {
    var relative = __require("path").relative;
    module2.exports = depd;
    var basePath = process.cwd();
    function containsNamespace(str, namespace) {
      var vals = str.split(/[ ,]+/);
      var ns = String(namespace).toLowerCase();
      for (var i = 0; i < vals.length; i++) {
        var val = vals[i];
        if (val && (val === "*" || val.toLowerCase() === ns)) {
          return true;
        }
      }
      return false;
    }
    function convertDataDescriptorToAccessor(obj, prop, message) {
      var descriptor = Object.getOwnPropertyDescriptor(obj, prop);
      var value = descriptor.value;
      descriptor.get = function getter() {
        return value;
      };
      if (descriptor.writable) {
        descriptor.set = function setter(val) {
          return value = val;
        };
      }
      delete descriptor.value;
      delete descriptor.writable;
      Object.defineProperty(obj, prop, descriptor);
      return descriptor;
    }
    function createArgumentsString(arity) {
      var str = "";
      for (var i = 0; i < arity; i++) {
        str += ", arg" + i;
      }
      return str.substr(2);
    }
    function createStackString(stack) {
      var str = this.name + ": " + this.namespace;
      if (this.message) {
        str += " deprecated " + this.message;
      }
      for (var i = 0; i < stack.length; i++) {
        str += "\n    at " + stack[i].toString();
      }
      return str;
    }
    function depd(namespace) {
      if (!namespace) {
        throw new TypeError("argument namespace is required");
      }
      var stack = getStack();
      var site = callSiteLocation(stack[1]);
      var file = site[0];
      function deprecate(message) {
        log.call(deprecate, message);
      }
      deprecate._file = file;
      deprecate._ignored = isignored(namespace);
      deprecate._namespace = namespace;
      deprecate._traced = istraced(namespace);
      deprecate._warned = /* @__PURE__ */ Object.create(null);
      deprecate.function = wrapfunction;
      deprecate.property = wrapproperty;
      return deprecate;
    }
    function eehaslisteners(emitter, type) {
      var count = typeof emitter.listenerCount !== "function" ? emitter.listeners(type).length : emitter.listenerCount(type);
      return count > 0;
    }
    function isignored(namespace) {
      if (process.noDeprecation) {
        return true;
      }
      var str = process.env.NO_DEPRECATION || "";
      return containsNamespace(str, namespace);
    }
    function istraced(namespace) {
      if (process.traceDeprecation) {
        return true;
      }
      var str = process.env.TRACE_DEPRECATION || "";
      return containsNamespace(str, namespace);
    }
    function log(message, site) {
      var haslisteners = eehaslisteners(process, "deprecation");
      if (!haslisteners && this._ignored) {
        return;
      }
      var caller;
      var callFile;
      var callSite;
      var depSite;
      var i = 0;
      var seen = false;
      var stack = getStack();
      var file = this._file;
      if (site) {
        depSite = site;
        callSite = callSiteLocation(stack[1]);
        callSite.name = depSite.name;
        file = callSite[0];
      } else {
        i = 2;
        depSite = callSiteLocation(stack[i]);
        callSite = depSite;
      }
      for (; i < stack.length; i++) {
        caller = callSiteLocation(stack[i]);
        callFile = caller[0];
        if (callFile === file) {
          seen = true;
        } else if (callFile === this._file) {
          file = this._file;
        } else if (seen) {
          break;
        }
      }
      var key = caller ? depSite.join(":") + "__" + caller.join(":") : void 0;
      if (key !== void 0 && key in this._warned) {
        return;
      }
      this._warned[key] = true;
      var msg = message;
      if (!msg) {
        msg = callSite === depSite || !callSite.name ? defaultMessage(depSite) : defaultMessage(callSite);
      }
      if (haslisteners) {
        var err = DeprecationError(this._namespace, msg, stack.slice(i));
        process.emit("deprecation", err);
        return;
      }
      var format = process.stderr.isTTY ? formatColor : formatPlain;
      var output = format.call(this, msg, caller, stack.slice(i));
      process.stderr.write(output + "\n", "utf8");
    }
    function callSiteLocation(callSite) {
      var file = callSite.getFileName() || "<anonymous>";
      var line = callSite.getLineNumber();
      var colm = callSite.getColumnNumber();
      if (callSite.isEval()) {
        file = callSite.getEvalOrigin() + ", " + file;
      }
      var site = [file, line, colm];
      site.callSite = callSite;
      site.name = callSite.getFunctionName();
      return site;
    }
    function defaultMessage(site) {
      var callSite = site.callSite;
      var funcName = site.name;
      if (!funcName) {
        funcName = "<anonymous@" + formatLocation(site) + ">";
      }
      var context = callSite.getThis();
      var typeName = context && callSite.getTypeName();
      if (typeName === "Object") {
        typeName = void 0;
      }
      if (typeName === "Function") {
        typeName = context.name || typeName;
      }
      return typeName && callSite.getMethodName() ? typeName + "." + funcName : funcName;
    }
    function formatPlain(msg, caller, stack) {
      var timestamp = (/* @__PURE__ */ new Date()).toUTCString();
      var formatted = timestamp + " " + this._namespace + " deprecated " + msg;
      if (this._traced) {
        for (var i = 0; i < stack.length; i++) {
          formatted += "\n    at " + stack[i].toString();
        }
        return formatted;
      }
      if (caller) {
        formatted += " at " + formatLocation(caller);
      }
      return formatted;
    }
    function formatColor(msg, caller, stack) {
      var formatted = "\x1B[36;1m" + this._namespace + "\x1B[22;39m \x1B[33;1mdeprecated\x1B[22;39m \x1B[0m" + msg + "\x1B[39m";
      if (this._traced) {
        for (var i = 0; i < stack.length; i++) {
          formatted += "\n    \x1B[36mat " + stack[i].toString() + "\x1B[39m";
        }
        return formatted;
      }
      if (caller) {
        formatted += " \x1B[36m" + formatLocation(caller) + "\x1B[39m";
      }
      return formatted;
    }
    function formatLocation(callSite) {
      return relative(basePath, callSite[0]) + ":" + callSite[1] + ":" + callSite[2];
    }
    function getStack() {
      var limit = Error.stackTraceLimit;
      var obj = {};
      var prep = Error.prepareStackTrace;
      Error.prepareStackTrace = prepareObjectStackTrace;
      Error.stackTraceLimit = Math.max(10, limit);
      Error.captureStackTrace(obj);
      var stack = obj.stack.slice(1);
      Error.prepareStackTrace = prep;
      Error.stackTraceLimit = limit;
      return stack;
    }
    function prepareObjectStackTrace(obj, stack) {
      return stack;
    }
    function wrapfunction(fn, message) {
      if (typeof fn !== "function") {
        throw new TypeError("argument fn must be a function");
      }
      var args = createArgumentsString(fn.length);
      var stack = getStack();
      var site = callSiteLocation(stack[1]);
      site.name = fn.name;
      var deprecatedfn = new Function(
        "fn",
        "log",
        "deprecate",
        "message",
        "site",
        '"use strict"\nreturn function (' + args + ") {log.call(deprecate, message, site)\nreturn fn.apply(this, arguments)\n}"
      )(fn, log, this, message, site);
      return deprecatedfn;
    }
    function wrapproperty(obj, prop, message) {
      if (!obj || typeof obj !== "object" && typeof obj !== "function") {
        throw new TypeError("argument obj must be object");
      }
      var descriptor = Object.getOwnPropertyDescriptor(obj, prop);
      if (!descriptor) {
        throw new TypeError("must call property on owner object");
      }
      if (!descriptor.configurable) {
        throw new TypeError("property must be configurable");
      }
      var deprecate = this;
      var stack = getStack();
      var site = callSiteLocation(stack[1]);
      site.name = prop;
      if ("value" in descriptor) {
        descriptor = convertDataDescriptorToAccessor(obj, prop, message);
      }
      var get = descriptor.get;
      var set = descriptor.set;
      if (typeof get === "function") {
        descriptor.get = function getter() {
          log.call(deprecate, message, site);
          return get.apply(this, arguments);
        };
      }
      if (typeof set === "function") {
        descriptor.set = function setter() {
          log.call(deprecate, message, site);
          return set.apply(this, arguments);
        };
      }
      Object.defineProperty(obj, prop, descriptor);
    }
    function DeprecationError(namespace, message, stack) {
      var error = new Error();
      var stackString;
      Object.defineProperty(error, "constructor", {
        value: DeprecationError
      });
      Object.defineProperty(error, "message", {
        configurable: true,
        enumerable: false,
        value: message,
        writable: true
      });
      Object.defineProperty(error, "name", {
        enumerable: false,
        configurable: true,
        value: "DeprecationError",
        writable: true
      });
      Object.defineProperty(error, "namespace", {
        configurable: true,
        enumerable: false,
        value: namespace,
        writable: true
      });
      Object.defineProperty(error, "stack", {
        configurable: true,
        enumerable: false,
        get: function() {
          if (stackString !== void 0) {
            return stackString;
          }
          return stackString = createStackString.call(this, stack);
        },
        set: function setter(val) {
          stackString = val;
        }
      });
      return error;
    }
  }
});

// ../../node_modules/.pnpm/setprototypeof@1.2.0/node_modules/setprototypeof/index.js
var require_setprototypeof = __commonJS({
  "../../node_modules/.pnpm/setprototypeof@1.2.0/node_modules/setprototypeof/index.js"(exports2, module2) {
    "use strict";
    module2.exports = Object.setPrototypeOf || ({ __proto__: [] } instanceof Array ? setProtoOf : mixinProperties);
    function setProtoOf(obj, proto) {
      obj.__proto__ = proto;
      return obj;
    }
    function mixinProperties(obj, proto) {
      for (var prop in proto) {
        if (!Object.prototype.hasOwnProperty.call(obj, prop)) {
          obj[prop] = proto[prop];
        }
      }
      return obj;
    }
  }
});

// ../../node_modules/.pnpm/statuses@2.0.2/node_modules/statuses/codes.json
var require_codes = __commonJS({
  "../../node_modules/.pnpm/statuses@2.0.2/node_modules/statuses/codes.json"(exports2, module2) {
    module2.exports = {
      "100": "Continue",
      "101": "Switching Protocols",
      "102": "Processing",
      "103": "Early Hints",
      "200": "OK",
      "201": "Created",
      "202": "Accepted",
      "203": "Non-Authoritative Information",
      "204": "No Content",
      "205": "Reset Content",
      "206": "Partial Content",
      "207": "Multi-Status",
      "208": "Already Reported",
      "226": "IM Used",
      "300": "Multiple Choices",
      "301": "Moved Permanently",
      "302": "Found",
      "303": "See Other",
      "304": "Not Modified",
      "305": "Use Proxy",
      "307": "Temporary Redirect",
      "308": "Permanent Redirect",
      "400": "Bad Request",
      "401": "Unauthorized",
      "402": "Payment Required",
      "403": "Forbidden",
      "404": "Not Found",
      "405": "Method Not Allowed",
      "406": "Not Acceptable",
      "407": "Proxy Authentication Required",
      "408": "Request Timeout",
      "409": "Conflict",
      "410": "Gone",
      "411": "Length Required",
      "412": "Precondition Failed",
      "413": "Payload Too Large",
      "414": "URI Too Long",
      "415": "Unsupported Media Type",
      "416": "Range Not Satisfiable",
      "417": "Expectation Failed",
      "418": "I'm a Teapot",
      "421": "Misdirected Request",
      "422": "Unprocessable Entity",
      "423": "Locked",
      "424": "Failed Dependency",
      "425": "Too Early",
      "426": "Upgrade Required",
      "428": "Precondition Required",
      "429": "Too Many Requests",
      "431": "Request Header Fields Too Large",
      "451": "Unavailable For Legal Reasons",
      "500": "Internal Server Error",
      "501": "Not Implemented",
      "502": "Bad Gateway",
      "503": "Service Unavailable",
      "504": "Gateway Timeout",
      "505": "HTTP Version Not Supported",
      "506": "Variant Also Negotiates",
      "507": "Insufficient Storage",
      "508": "Loop Detected",
      "509": "Bandwidth Limit Exceeded",
      "510": "Not Extended",
      "511": "Network Authentication Required"
    };
  }
});

// ../../node_modules/.pnpm/statuses@2.0.2/node_modules/statuses/index.js
var require_statuses = __commonJS({
  "../../node_modules/.pnpm/statuses@2.0.2/node_modules/statuses/index.js"(exports2, module2) {
    "use strict";
    var codes = require_codes();
    module2.exports = status;
    status.message = codes;
    status.code = createMessageToStatusCodeMap(codes);
    status.codes = createStatusCodeList(codes);
    status.redirect = {
      300: true,
      301: true,
      302: true,
      303: true,
      305: true,
      307: true,
      308: true
    };
    status.empty = {
      204: true,
      205: true,
      304: true
    };
    status.retry = {
      502: true,
      503: true,
      504: true
    };
    function createMessageToStatusCodeMap(codes2) {
      var map = {};
      Object.keys(codes2).forEach(function forEachCode(code) {
        var message = codes2[code];
        var status2 = Number(code);
        map[message.toLowerCase()] = status2;
      });
      return map;
    }
    function createStatusCodeList(codes2) {
      return Object.keys(codes2).map(function mapCode(code) {
        return Number(code);
      });
    }
    function getStatusCode(message) {
      var msg = message.toLowerCase();
      if (!Object.prototype.hasOwnProperty.call(status.code, msg)) {
        throw new Error('invalid status message: "' + message + '"');
      }
      return status.code[msg];
    }
    function getStatusMessage(code) {
      if (!Object.prototype.hasOwnProperty.call(status.message, code)) {
        throw new Error("invalid status code: " + code);
      }
      return status.message[code];
    }
    function status(code) {
      if (typeof code === "number") {
        return getStatusMessage(code);
      }
      if (typeof code !== "string") {
        throw new TypeError("code must be a number or string");
      }
      var n = parseInt(code, 10);
      if (!isNaN(n)) {
        return getStatusMessage(n);
      }
      return getStatusCode(code);
    }
  }
});

// ../../node_modules/.pnpm/inherits@2.0.4/node_modules/inherits/inherits_browser.js
var require_inherits_browser = __commonJS({
  "../../node_modules/.pnpm/inherits@2.0.4/node_modules/inherits/inherits_browser.js"(exports2, module2) {
    if (typeof Object.create === "function") {
      module2.exports = function inherits(ctor, superCtor) {
        if (superCtor) {
          ctor.super_ = superCtor;
          ctor.prototype = Object.create(superCtor.prototype, {
            constructor: {
              value: ctor,
              enumerable: false,
              writable: true,
              configurable: true
            }
          });
        }
      };
    } else {
      module2.exports = function inherits(ctor, superCtor) {
        if (superCtor) {
          ctor.super_ = superCtor;
          var TempCtor = function() {
          };
          TempCtor.prototype = superCtor.prototype;
          ctor.prototype = new TempCtor();
          ctor.prototype.constructor = ctor;
        }
      };
    }
  }
});

// ../../node_modules/.pnpm/inherits@2.0.4/node_modules/inherits/inherits.js
var require_inherits = __commonJS({
  "../../node_modules/.pnpm/inherits@2.0.4/node_modules/inherits/inherits.js"(exports2, module2) {
    try {
      util2 = __require("util");
      if (typeof util2.inherits !== "function") throw "";
      module2.exports = util2.inherits;
    } catch (e) {
      module2.exports = require_inherits_browser();
    }
    var util2;
  }
});

// ../../node_modules/.pnpm/toidentifier@1.0.1/node_modules/toidentifier/index.js
var require_toidentifier = __commonJS({
  "../../node_modules/.pnpm/toidentifier@1.0.1/node_modules/toidentifier/index.js"(exports2, module2) {
    "use strict";
    module2.exports = toIdentifier;
    function toIdentifier(str) {
      return str.split(" ").map(function(token) {
        return token.slice(0, 1).toUpperCase() + token.slice(1);
      }).join("").replace(/[^ _0-9a-z]/gi, "");
    }
  }
});

// ../../node_modules/.pnpm/http-errors@2.0.1/node_modules/http-errors/index.js
var require_http_errors = __commonJS({
  "../../node_modules/.pnpm/http-errors@2.0.1/node_modules/http-errors/index.js"(exports2, module2) {
    "use strict";
    var deprecate = require_depd()("http-errors");
    var setPrototypeOf = require_setprototypeof();
    var statuses = require_statuses();
    var inherits = require_inherits();
    var toIdentifier = require_toidentifier();
    module2.exports = createError;
    module2.exports.HttpError = createHttpErrorConstructor();
    module2.exports.isHttpError = createIsHttpErrorFunction(module2.exports.HttpError);
    populateConstructorExports(module2.exports, statuses.codes, module2.exports.HttpError);
    function codeClass(status) {
      return Number(String(status).charAt(0) + "00");
    }
    function createError() {
      var err;
      var msg;
      var status = 500;
      var props = {};
      for (var i = 0; i < arguments.length; i++) {
        var arg = arguments[i];
        var type = typeof arg;
        if (type === "object" && arg instanceof Error) {
          err = arg;
          status = err.status || err.statusCode || status;
        } else if (type === "number" && i === 0) {
          status = arg;
        } else if (type === "string") {
          msg = arg;
        } else if (type === "object") {
          props = arg;
        } else {
          throw new TypeError("argument #" + (i + 1) + " unsupported type " + type);
        }
      }
      if (typeof status === "number" && (status < 400 || status >= 600)) {
        deprecate("non-error status code; use only 4xx or 5xx status codes");
      }
      if (typeof status !== "number" || !statuses.message[status] && (status < 400 || status >= 600)) {
        status = 500;
      }
      var HttpError = createError[status] || createError[codeClass(status)];
      if (!err) {
        err = HttpError ? new HttpError(msg) : new Error(msg || statuses.message[status]);
        Error.captureStackTrace(err, createError);
      }
      if (!HttpError || !(err instanceof HttpError) || err.status !== status) {
        err.expose = status < 500;
        err.status = err.statusCode = status;
      }
      for (var key in props) {
        if (key !== "status" && key !== "statusCode") {
          err[key] = props[key];
        }
      }
      return err;
    }
    function createHttpErrorConstructor() {
      function HttpError() {
        throw new TypeError("cannot construct abstract class");
      }
      inherits(HttpError, Error);
      return HttpError;
    }
    function createClientErrorConstructor(HttpError, name, code) {
      var className = toClassName(name);
      function ClientError(message) {
        var msg = message != null ? message : statuses.message[code];
        var err = new Error(msg);
        Error.captureStackTrace(err, ClientError);
        setPrototypeOf(err, ClientError.prototype);
        Object.defineProperty(err, "message", {
          enumerable: true,
          configurable: true,
          value: msg,
          writable: true
        });
        Object.defineProperty(err, "name", {
          enumerable: false,
          configurable: true,
          value: className,
          writable: true
        });
        return err;
      }
      inherits(ClientError, HttpError);
      nameFunc(ClientError, className);
      ClientError.prototype.status = code;
      ClientError.prototype.statusCode = code;
      ClientError.prototype.expose = true;
      return ClientError;
    }
    function createIsHttpErrorFunction(HttpError) {
      return function isHttpError(val) {
        if (!val || typeof val !== "object") {
          return false;
        }
        if (val instanceof HttpError) {
          return true;
        }
        return val instanceof Error && typeof val.expose === "boolean" && typeof val.statusCode === "number" && val.status === val.statusCode;
      };
    }
    function createServerErrorConstructor(HttpError, name, code) {
      var className = toClassName(name);
      function ServerError(message) {
        var msg = message != null ? message : statuses.message[code];
        var err = new Error(msg);
        Error.captureStackTrace(err, ServerError);
        setPrototypeOf(err, ServerError.prototype);
        Object.defineProperty(err, "message", {
          enumerable: true,
          configurable: true,
          value: msg,
          writable: true
        });
        Object.defineProperty(err, "name", {
          enumerable: false,
          configurable: true,
          value: className,
          writable: true
        });
        return err;
      }
      inherits(ServerError, HttpError);
      nameFunc(ServerError, className);
      ServerError.prototype.status = code;
      ServerError.prototype.statusCode = code;
      ServerError.prototype.expose = false;
      return ServerError;
    }
    function nameFunc(func, name) {
      var desc = Object.getOwnPropertyDescriptor(func, "name");
      if (desc && desc.configurable) {
        desc.value = name;
        Object.defineProperty(func, "name", desc);
      }
    }
    function populateConstructorExports(exports3, codes, HttpError) {
      codes.forEach(function forEachCode(code) {
        var CodeError;
        var name = toIdentifier(statuses.message[code]);
        switch (codeClass(code)) {
          case 400:
            CodeError = createClientErrorConstructor(HttpError, name, code);
            break;
          case 500:
            CodeError = createServerErrorConstructor(HttpError, name, code);
            break;
        }
        if (CodeError) {
          exports3[code] = CodeError;
          exports3[name] = CodeError;
        }
      });
    }
    function toClassName(name) {
      return name.slice(-5) === "Error" ? name : name + "Error";
    }
  }
});

// ../../node_modules/.pnpm/bytes@3.1.2/node_modules/bytes/index.js
var require_bytes = __commonJS({
  "../../node_modules/.pnpm/bytes@3.1.2/node_modules/bytes/index.js"(exports2, module2) {
    "use strict";
    module2.exports = bytes;
    module2.exports.format = format;
    module2.exports.parse = parse;
    var formatThousandsRegExp = /\B(?=(\d{3})+(?!\d))/g;
    var formatDecimalsRegExp = /(?:\.0*|(\.[^0]+)0+)$/;
    var map = {
      b: 1,
      kb: 1 << 10,
      mb: 1 << 20,
      gb: 1 << 30,
      tb: Math.pow(1024, 4),
      pb: Math.pow(1024, 5)
    };
    var parseRegExp = /^((-|\+)?(\d+(?:\.\d+)?)) *(kb|mb|gb|tb|pb)$/i;
    function bytes(value, options) {
      if (typeof value === "string") {
        return parse(value);
      }
      if (typeof value === "number") {
        return format(value, options);
      }
      return null;
    }
    function format(value, options) {
      if (!Number.isFinite(value)) {
        return null;
      }
      var mag = Math.abs(value);
      var thousandsSeparator = options && options.thousandsSeparator || "";
      var unitSeparator = options && options.unitSeparator || "";
      var decimalPlaces = options && options.decimalPlaces !== void 0 ? options.decimalPlaces : 2;
      var fixedDecimals = Boolean(options && options.fixedDecimals);
      var unit = options && options.unit || "";
      if (!unit || !map[unit.toLowerCase()]) {
        if (mag >= map.pb) {
          unit = "PB";
        } else if (mag >= map.tb) {
          unit = "TB";
        } else if (mag >= map.gb) {
          unit = "GB";
        } else if (mag >= map.mb) {
          unit = "MB";
        } else if (mag >= map.kb) {
          unit = "KB";
        } else {
          unit = "B";
        }
      }
      var val = value / map[unit.toLowerCase()];
      var str = val.toFixed(decimalPlaces);
      if (!fixedDecimals) {
        str = str.replace(formatDecimalsRegExp, "$1");
      }
      if (thousandsSeparator) {
        str = str.split(".").map(function(s, i) {
          return i === 0 ? s.replace(formatThousandsRegExp, thousandsSeparator) : s;
        }).join(".");
      }
      return str + unitSeparator + unit;
    }
    function parse(val) {
      if (typeof val === "number" && !isNaN(val)) {
        return val;
      }
      if (typeof val !== "string") {
        return null;
      }
      var results = parseRegExp.exec(val);
      var floatValue;
      var unit = "b";
      if (!results) {
        floatValue = parseInt(val, 10);
        unit = "b";
      } else {
        floatValue = parseFloat(results[1]);
        unit = results[4].toLowerCase();
      }
      if (isNaN(floatValue)) {
        return null;
      }
      return Math.floor(map[unit] * floatValue);
    }
  }
});

// ../../node_modules/.pnpm/safer-buffer@2.1.2/node_modules/safer-buffer/safer.js
var require_safer = __commonJS({
  "../../node_modules/.pnpm/safer-buffer@2.1.2/node_modules/safer-buffer/safer.js"(exports2, module2) {
    "use strict";
    var buffer = __require("buffer");
    var Buffer2 = buffer.Buffer;
    var safer = {};
    var key;
    for (key in buffer) {
      if (!buffer.hasOwnProperty(key)) continue;
      if (key === "SlowBuffer" || key === "Buffer") continue;
      safer[key] = buffer[key];
    }
    var Safer = safer.Buffer = {};
    for (key in Buffer2) {
      if (!Buffer2.hasOwnProperty(key)) continue;
      if (key === "allocUnsafe" || key === "allocUnsafeSlow") continue;
      Safer[key] = Buffer2[key];
    }
    safer.Buffer.prototype = Buffer2.prototype;
    if (!Safer.from || Safer.from === Uint8Array.from) {
      Safer.from = function(value, encodingOrOffset, length) {
        if (typeof value === "number") {
          throw new TypeError('The "value" argument must not be of type number. Received type ' + typeof value);
        }
        if (value && typeof value.length === "undefined") {
          throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof value);
        }
        return Buffer2(value, encodingOrOffset, length);
      };
    }
    if (!Safer.alloc) {
      Safer.alloc = function(size, fill, encoding) {
        if (typeof size !== "number") {
          throw new TypeError('The "size" argument must be of type number. Received type ' + typeof size);
        }
        if (size < 0 || size >= 2 * (1 << 30)) {
          throw new RangeError('The value "' + size + '" is invalid for option "size"');
        }
        var buf = Buffer2(size);
        if (!fill || fill.length === 0) {
          buf.fill(0);
        } else if (typeof encoding === "string") {
          buf.fill(fill, encoding);
        } else {
          buf.fill(fill);
        }
        return buf;
      };
    }
    if (!safer.kStringMaxLength) {
      try {
        safer.kStringMaxLength = process.binding("buffer").kStringMaxLength;
      } catch (e) {
      }
    }
    if (!safer.constants) {
      safer.constants = {
        MAX_LENGTH: safer.kMaxLength
      };
      if (safer.kStringMaxLength) {
        safer.constants.MAX_STRING_LENGTH = safer.kStringMaxLength;
      }
    }
    module2.exports = safer;
  }
});

// ../../node_modules/.pnpm/iconv-lite@0.7.2/node_modules/iconv-lite/lib/bom-handling.js
var require_bom_handling = __commonJS({
  "../../node_modules/.pnpm/iconv-lite@0.7.2/node_modules/iconv-lite/lib/bom-handling.js"(exports2) {
    "use strict";
    var BOMChar = "\uFEFF";
    exports2.PrependBOM = PrependBOMWrapper;
    function PrependBOMWrapper(encoder, options) {
      this.encoder = encoder;
      this.addBOM = true;
    }
    PrependBOMWrapper.prototype.write = function(str) {
      if (this.addBOM) {
        str = BOMChar + str;
        this.addBOM = false;
      }
      return this.encoder.write(str);
    };
    PrependBOMWrapper.prototype.end = function() {
      return this.encoder.end();
    };
    exports2.StripBOM = StripBOMWrapper;
    function StripBOMWrapper(decoder, options) {
      this.decoder = decoder;
      this.pass = false;
      this.options = options || {};
    }
    StripBOMWrapper.prototype.write = function(buf) {
      var res = this.decoder.write(buf);
      if (this.pass || !res) {
        return res;
      }
      if (res[0] === BOMChar) {
        res = res.slice(1);
        if (typeof this.options.stripBOM === "function") {
          this.options.stripBOM();
        }
      }
      this.pass = true;
      return res;
    };
    StripBOMWrapper.prototype.end = function() {
      return this.decoder.end();
    };
  }
});

// ../../node_modules/.pnpm/iconv-lite@0.7.2/node_modules/iconv-lite/lib/helpers/merge-exports.js
var require_merge_exports = __commonJS({
  "../../node_modules/.pnpm/iconv-lite@0.7.2/node_modules/iconv-lite/lib/helpers/merge-exports.js"(exports2, module2) {
    "use strict";
    var hasOwn = typeof Object.hasOwn === "undefined" ? Function.call.bind(Object.prototype.hasOwnProperty) : Object.hasOwn;
    function mergeModules(target, module3) {
      for (var key in module3) {
        if (hasOwn(module3, key)) {
          target[key] = module3[key];
        }
      }
    }
    module2.exports = mergeModules;
  }
});

// ../../node_modules/.pnpm/iconv-lite@0.7.2/node_modules/iconv-lite/encodings/internal.js
var require_internal = __commonJS({
  "../../node_modules/.pnpm/iconv-lite@0.7.2/node_modules/iconv-lite/encodings/internal.js"(exports2, module2) {
    "use strict";
    var Buffer2 = require_safer().Buffer;
    module2.exports = {
      // Encodings
      utf8: { type: "_internal", bomAware: true },
      cesu8: { type: "_internal", bomAware: true },
      unicode11utf8: "utf8",
      ucs2: { type: "_internal", bomAware: true },
      utf16le: "ucs2",
      binary: { type: "_internal" },
      base64: { type: "_internal" },
      hex: { type: "_internal" },
      // Codec.
      _internal: InternalCodec
    };
    function InternalCodec(codecOptions, iconv) {
      this.enc = codecOptions.encodingName;
      this.bomAware = codecOptions.bomAware;
      if (this.enc === "base64") {
        this.encoder = InternalEncoderBase64;
      } else if (this.enc === "utf8") {
        this.encoder = InternalEncoderUtf8;
      } else if (this.enc === "cesu8") {
        this.enc = "utf8";
        this.encoder = InternalEncoderCesu8;
        if (Buffer2.from("eda0bdedb2a9", "hex").toString() !== "\u{1F4A9}") {
          this.decoder = InternalDecoderCesu8;
          this.defaultCharUnicode = iconv.defaultCharUnicode;
        }
      }
    }
    InternalCodec.prototype.encoder = InternalEncoder;
    InternalCodec.prototype.decoder = InternalDecoder;
    var StringDecoder = __require("string_decoder").StringDecoder;
    function InternalDecoder(options, codec) {
      this.decoder = new StringDecoder(codec.enc);
    }
    InternalDecoder.prototype.write = function(buf) {
      if (!Buffer2.isBuffer(buf)) {
        buf = Buffer2.from(buf);
      }
      return this.decoder.write(buf);
    };
    InternalDecoder.prototype.end = function() {
      return this.decoder.end();
    };
    function InternalEncoder(options, codec) {
      this.enc = codec.enc;
    }
    InternalEncoder.prototype.write = function(str) {
      return Buffer2.from(str, this.enc);
    };
    InternalEncoder.prototype.end = function() {
    };
    function InternalEncoderBase64(options, codec) {
      this.prevStr = "";
    }
    InternalEncoderBase64.prototype.write = function(str) {
      str = this.prevStr + str;
      var completeQuads = str.length - str.length % 4;
      this.prevStr = str.slice(completeQuads);
      str = str.slice(0, completeQuads);
      return Buffer2.from(str, "base64");
    };
    InternalEncoderBase64.prototype.end = function() {
      return Buffer2.from(this.prevStr, "base64");
    };
    function InternalEncoderCesu8(options, codec) {
    }
    InternalEncoderCesu8.prototype.write = function(str) {
      var buf = Buffer2.alloc(str.length * 3);
      var bufIdx = 0;
      for (var i = 0; i < str.length; i++) {
        var charCode = str.charCodeAt(i);
        if (charCode < 128) {
          buf[bufIdx++] = charCode;
        } else if (charCode < 2048) {
          buf[bufIdx++] = 192 + (charCode >>> 6);
          buf[bufIdx++] = 128 + (charCode & 63);
        } else {
          buf[bufIdx++] = 224 + (charCode >>> 12);
          buf[bufIdx++] = 128 + (charCode >>> 6 & 63);
          buf[bufIdx++] = 128 + (charCode & 63);
        }
      }
      return buf.slice(0, bufIdx);
    };
    InternalEncoderCesu8.prototype.end = function() {
    };
    function InternalDecoderCesu8(options, codec) {
      this.acc = 0;
      this.contBytes = 0;
      this.accBytes = 0;
      this.defaultCharUnicode = codec.defaultCharUnicode;
    }
    InternalDecoderCesu8.prototype.write = function(buf) {
      var acc = this.acc;
      var contBytes = this.contBytes;
      var accBytes = this.accBytes;
      var res = "";
      for (var i = 0; i < buf.length; i++) {
        var curByte = buf[i];
        if ((curByte & 192) !== 128) {
          if (contBytes > 0) {
            res += this.defaultCharUnicode;
            contBytes = 0;
          }
          if (curByte < 128) {
            res += String.fromCharCode(curByte);
          } else if (curByte < 224) {
            acc = curByte & 31;
            contBytes = 1;
            accBytes = 1;
          } else if (curByte < 240) {
            acc = curByte & 15;
            contBytes = 2;
            accBytes = 1;
          } else {
            res += this.defaultCharUnicode;
          }
        } else {
          if (contBytes > 0) {
            acc = acc << 6 | curByte & 63;
            contBytes--;
            accBytes++;
            if (contBytes === 0) {
              if (accBytes === 2 && acc < 128 && acc > 0) {
                res += this.defaultCharUnicode;
              } else if (accBytes === 3 && acc < 2048) {
                res += this.defaultCharUnicode;
              } else {
                res += String.fromCharCode(acc);
              }
            }
          } else {
            res += this.defaultCharUnicode;
          }
        }
      }
      this.acc = acc;
      this.contBytes = contBytes;
      this.accBytes = accBytes;
      return res;
    };
    InternalDecoderCesu8.prototype.end = function() {
      var res = 0;
      if (this.contBytes > 0) {
        res += this.defaultCharUnicode;
      }
      return res;
    };
    function InternalEncoderUtf8(options, codec) {
      this.highSurrogate = "";
    }
    InternalEncoderUtf8.prototype.write = function(str) {
      if (this.highSurrogate) {
        str = this.highSurrogate + str;
        this.highSurrogate = "";
      }
      if (str.length > 0) {
        var charCode = str.charCodeAt(str.length - 1);
        if (charCode >= 55296 && charCode < 56320) {
          this.highSurrogate = str[str.length - 1];
          str = str.slice(0, str.length - 1);
        }
      }
      return Buffer2.from(str, this.enc);
    };
    InternalEncoderUtf8.prototype.end = function() {
      if (this.highSurrogate) {
        var str = this.highSurrogate;
        this.highSurrogate = "";
        return Buffer2.from(str, this.enc);
      }
    };
  }
});

// ../../node_modules/.pnpm/iconv-lite@0.7.2/node_modules/iconv-lite/encodings/utf32.js
var require_utf32 = __commonJS({
  "../../node_modules/.pnpm/iconv-lite@0.7.2/node_modules/iconv-lite/encodings/utf32.js"(exports2) {
    "use strict";
    var Buffer2 = require_safer().Buffer;
    exports2._utf32 = Utf32Codec;
    function Utf32Codec(codecOptions, iconv) {
      this.iconv = iconv;
      this.bomAware = true;
      this.isLE = codecOptions.isLE;
    }
    exports2.utf32le = { type: "_utf32", isLE: true };
    exports2.utf32be = { type: "_utf32", isLE: false };
    exports2.ucs4le = "utf32le";
    exports2.ucs4be = "utf32be";
    Utf32Codec.prototype.encoder = Utf32Encoder;
    Utf32Codec.prototype.decoder = Utf32Decoder;
    function Utf32Encoder(options, codec) {
      this.isLE = codec.isLE;
      this.highSurrogate = 0;
    }
    Utf32Encoder.prototype.write = function(str) {
      var src = Buffer2.from(str, "ucs2");
      var dst = Buffer2.alloc(src.length * 2);
      var write32 = this.isLE ? dst.writeUInt32LE : dst.writeUInt32BE;
      var offset = 0;
      for (var i = 0; i < src.length; i += 2) {
        var code = src.readUInt16LE(i);
        var isHighSurrogate = code >= 55296 && code < 56320;
        var isLowSurrogate = code >= 56320 && code < 57344;
        if (this.highSurrogate) {
          if (isHighSurrogate || !isLowSurrogate) {
            write32.call(dst, this.highSurrogate, offset);
            offset += 4;
          } else {
            var codepoint = (this.highSurrogate - 55296 << 10 | code - 56320) + 65536;
            write32.call(dst, codepoint, offset);
            offset += 4;
            this.highSurrogate = 0;
            continue;
          }
        }
        if (isHighSurrogate) {
          this.highSurrogate = code;
        } else {
          write32.call(dst, code, offset);
          offset += 4;
          this.highSurrogate = 0;
        }
      }
      if (offset < dst.length) {
        dst = dst.slice(0, offset);
      }
      return dst;
    };
    Utf32Encoder.prototype.end = function() {
      if (!this.highSurrogate) {
        return;
      }
      var buf = Buffer2.alloc(4);
      if (this.isLE) {
        buf.writeUInt32LE(this.highSurrogate, 0);
      } else {
        buf.writeUInt32BE(this.highSurrogate, 0);
      }
      this.highSurrogate = 0;
      return buf;
    };
    function Utf32Decoder(options, codec) {
      this.isLE = codec.isLE;
      this.badChar = codec.iconv.defaultCharUnicode.charCodeAt(0);
      this.overflow = [];
    }
    Utf32Decoder.prototype.write = function(src) {
      if (src.length === 0) {
        return "";
      }
      var i = 0;
      var codepoint = 0;
      var dst = Buffer2.alloc(src.length + 4);
      var offset = 0;
      var isLE = this.isLE;
      var overflow = this.overflow;
      var badChar = this.badChar;
      if (overflow.length > 0) {
        for (; i < src.length && overflow.length < 4; i++) {
          overflow.push(src[i]);
        }
        if (overflow.length === 4) {
          if (isLE) {
            codepoint = overflow[i] | overflow[i + 1] << 8 | overflow[i + 2] << 16 | overflow[i + 3] << 24;
          } else {
            codepoint = overflow[i + 3] | overflow[i + 2] << 8 | overflow[i + 1] << 16 | overflow[i] << 24;
          }
          overflow.length = 0;
          offset = _writeCodepoint(dst, offset, codepoint, badChar);
        }
      }
      for (; i < src.length - 3; i += 4) {
        if (isLE) {
          codepoint = src[i] | src[i + 1] << 8 | src[i + 2] << 16 | src[i + 3] << 24;
        } else {
          codepoint = src[i + 3] | src[i + 2] << 8 | src[i + 1] << 16 | src[i] << 24;
        }
        offset = _writeCodepoint(dst, offset, codepoint, badChar);
      }
      for (; i < src.length; i++) {
        overflow.push(src[i]);
      }
      return dst.slice(0, offset).toString("ucs2");
    };
    function _writeCodepoint(dst, offset, codepoint, badChar) {
      if (codepoint < 0 || codepoint > 1114111) {
        codepoint = badChar;
      }
      if (codepoint >= 65536) {
        codepoint -= 65536;
        var high = 55296 | codepoint >> 10;
        dst[offset++] = high & 255;
        dst[offset++] = high >> 8;
        var codepoint = 56320 | codepoint & 1023;
      }
      dst[offset++] = codepoint & 255;
      dst[offset++] = codepoint >> 8;
      return offset;
    }
    Utf32Decoder.prototype.end = function() {
      this.overflow.length = 0;
    };
    exports2.utf32 = Utf32AutoCodec;
    exports2.ucs4 = "utf32";
    function Utf32AutoCodec(options, iconv) {
      this.iconv = iconv;
    }
    Utf32AutoCodec.prototype.encoder = Utf32AutoEncoder;
    Utf32AutoCodec.prototype.decoder = Utf32AutoDecoder;
    function Utf32AutoEncoder(options, codec) {
      options = options || {};
      if (options.addBOM === void 0) {
        options.addBOM = true;
      }
      this.encoder = codec.iconv.getEncoder(options.defaultEncoding || "utf-32le", options);
    }
    Utf32AutoEncoder.prototype.write = function(str) {
      return this.encoder.write(str);
    };
    Utf32AutoEncoder.prototype.end = function() {
      return this.encoder.end();
    };
    function Utf32AutoDecoder(options, codec) {
      this.decoder = null;
      this.initialBufs = [];
      this.initialBufsLen = 0;
      this.options = options || {};
      this.iconv = codec.iconv;
    }
    Utf32AutoDecoder.prototype.write = function(buf) {
      if (!this.decoder) {
        this.initialBufs.push(buf);
        this.initialBufsLen += buf.length;
        if (this.initialBufsLen < 32) {
          return "";
        }
        var encoding = detectEncoding(this.initialBufs, this.options.defaultEncoding);
        this.decoder = this.iconv.getDecoder(encoding, this.options);
        var resStr = "";
        for (var i = 0; i < this.initialBufs.length; i++) {
          resStr += this.decoder.write(this.initialBufs[i]);
        }
        this.initialBufs.length = this.initialBufsLen = 0;
        return resStr;
      }
      return this.decoder.write(buf);
    };
    Utf32AutoDecoder.prototype.end = function() {
      if (!this.decoder) {
        var encoding = detectEncoding(this.initialBufs, this.options.defaultEncoding);
        this.decoder = this.iconv.getDecoder(encoding, this.options);
        var resStr = "";
        for (var i = 0; i < this.initialBufs.length; i++) {
          resStr += this.decoder.write(this.initialBufs[i]);
        }
        var trail = this.decoder.end();
        if (trail) {
          resStr += trail;
        }
        this.initialBufs.length = this.initialBufsLen = 0;
        return resStr;
      }
      return this.decoder.end();
    };
    function detectEncoding(bufs, defaultEncoding) {
      var b = [];
      var charsProcessed = 0;
      var invalidLE = 0;
      var invalidBE = 0;
      var bmpCharsLE = 0;
      var bmpCharsBE = 0;
      outerLoop:
        for (var i = 0; i < bufs.length; i++) {
          var buf = bufs[i];
          for (var j = 0; j < buf.length; j++) {
            b.push(buf[j]);
            if (b.length === 4) {
              if (charsProcessed === 0) {
                if (b[0] === 255 && b[1] === 254 && b[2] === 0 && b[3] === 0) {
                  return "utf-32le";
                }
                if (b[0] === 0 && b[1] === 0 && b[2] === 254 && b[3] === 255) {
                  return "utf-32be";
                }
              }
              if (b[0] !== 0 || b[1] > 16) invalidBE++;
              if (b[3] !== 0 || b[2] > 16) invalidLE++;
              if (b[0] === 0 && b[1] === 0 && (b[2] !== 0 || b[3] !== 0)) bmpCharsBE++;
              if ((b[0] !== 0 || b[1] !== 0) && b[2] === 0 && b[3] === 0) bmpCharsLE++;
              b.length = 0;
              charsProcessed++;
              if (charsProcessed >= 100) {
                break outerLoop;
              }
            }
          }
        }
      if (bmpCharsBE - invalidBE > bmpCharsLE - invalidLE) return "utf-32be";
      if (bmpCharsBE - invalidBE < bmpCharsLE - invalidLE) return "utf-32le";
      return defaultEncoding || "utf-32le";
    }
  }
});

// ../../node_modules/.pnpm/iconv-lite@0.7.2/node_modules/iconv-lite/encodings/utf16.js
var require_utf16 = __commonJS({
  "../../node_modules/.pnpm/iconv-lite@0.7.2/node_modules/iconv-lite/encodings/utf16.js"(exports2) {
    "use strict";
    var Buffer2 = require_safer().Buffer;
    exports2.utf16be = Utf16BECodec;
    function Utf16BECodec() {
    }
    Utf16BECodec.prototype.encoder = Utf16BEEncoder;
    Utf16BECodec.prototype.decoder = Utf16BEDecoder;
    Utf16BECodec.prototype.bomAware = true;
    function Utf16BEEncoder() {
    }
    Utf16BEEncoder.prototype.write = function(str) {
      var buf = Buffer2.from(str, "ucs2");
      for (var i = 0; i < buf.length; i += 2) {
        var tmp = buf[i];
        buf[i] = buf[i + 1];
        buf[i + 1] = tmp;
      }
      return buf;
    };
    Utf16BEEncoder.prototype.end = function() {
    };
    function Utf16BEDecoder() {
      this.overflowByte = -1;
    }
    Utf16BEDecoder.prototype.write = function(buf) {
      if (buf.length == 0) {
        return "";
      }
      var buf2 = Buffer2.alloc(buf.length + 1);
      var i = 0;
      var j = 0;
      if (this.overflowByte !== -1) {
        buf2[0] = buf[0];
        buf2[1] = this.overflowByte;
        i = 1;
        j = 2;
      }
      for (; i < buf.length - 1; i += 2, j += 2) {
        buf2[j] = buf[i + 1];
        buf2[j + 1] = buf[i];
      }
      this.overflowByte = i == buf.length - 1 ? buf[buf.length - 1] : -1;
      return buf2.slice(0, j).toString("ucs2");
    };
    Utf16BEDecoder.prototype.end = function() {
      this.overflowByte = -1;
    };
    exports2.utf16 = Utf16Codec;
    function Utf16Codec(codecOptions, iconv) {
      this.iconv = iconv;
    }
    Utf16Codec.prototype.encoder = Utf16Encoder;
    Utf16Codec.prototype.decoder = Utf16Decoder;
    function Utf16Encoder(options, codec) {
      options = options || {};
      if (options.addBOM === void 0) {
        options.addBOM = true;
      }
      this.encoder = codec.iconv.getEncoder("utf-16le", options);
    }
    Utf16Encoder.prototype.write = function(str) {
      return this.encoder.write(str);
    };
    Utf16Encoder.prototype.end = function() {
      return this.encoder.end();
    };
    function Utf16Decoder(options, codec) {
      this.decoder = null;
      this.initialBufs = [];
      this.initialBufsLen = 0;
      this.options = options || {};
      this.iconv = codec.iconv;
    }
    Utf16Decoder.prototype.write = function(buf) {
      if (!this.decoder) {
        this.initialBufs.push(buf);
        this.initialBufsLen += buf.length;
        if (this.initialBufsLen < 16) {
          return "";
        }
        var encoding = detectEncoding(this.initialBufs, this.options.defaultEncoding);
        this.decoder = this.iconv.getDecoder(encoding, this.options);
        var resStr = "";
        for (var i = 0; i < this.initialBufs.length; i++) {
          resStr += this.decoder.write(this.initialBufs[i]);
        }
        this.initialBufs.length = this.initialBufsLen = 0;
        return resStr;
      }
      return this.decoder.write(buf);
    };
    Utf16Decoder.prototype.end = function() {
      if (!this.decoder) {
        var encoding = detectEncoding(this.initialBufs, this.options.defaultEncoding);
        this.decoder = this.iconv.getDecoder(encoding, this.options);
        var resStr = "";
        for (var i = 0; i < this.initialBufs.length; i++) {
          resStr += this.decoder.write(this.initialBufs[i]);
        }
        var trail = this.decoder.end();
        if (trail) {
          resStr += trail;
        }
        this.initialBufs.length = this.initialBufsLen = 0;
        return resStr;
      }
      return this.decoder.end();
    };
    function detectEncoding(bufs, defaultEncoding) {
      var b = [];
      var charsProcessed = 0;
      var asciiCharsLE = 0;
      var asciiCharsBE = 0;
      outerLoop:
        for (var i = 0; i < bufs.length; i++) {
          var buf = bufs[i];
          for (var j = 0; j < buf.length; j++) {
            b.push(buf[j]);
            if (b.length === 2) {
              if (charsProcessed === 0) {
                if (b[0] === 255 && b[1] === 254) return "utf-16le";
                if (b[0] === 254 && b[1] === 255) return "utf-16be";
              }
              if (b[0] === 0 && b[1] !== 0) asciiCharsBE++;
              if (b[0] !== 0 && b[1] === 0) asciiCharsLE++;
              b.length = 0;
              charsProcessed++;
              if (charsProcessed >= 100) {
                break outerLoop;
              }
            }
          }
        }
      if (asciiCharsBE > asciiCharsLE) return "utf-16be";
      if (asciiCharsBE < asciiCharsLE) return "utf-16le";
      return defaultEncoding || "utf-16le";
    }
  }
});

// ../../node_modules/.pnpm/iconv-lite@0.7.2/node_modules/iconv-lite/encodings/utf7.js
var require_utf7 = __commonJS({
  "../../node_modules/.pnpm/iconv-lite@0.7.2/node_modules/iconv-lite/encodings/utf7.js"(exports2) {
    "use strict";
    var Buffer2 = require_safer().Buffer;
    exports2.utf7 = Utf7Codec;
    exports2.unicode11utf7 = "utf7";
    function Utf7Codec(codecOptions, iconv) {
      this.iconv = iconv;
    }
    Utf7Codec.prototype.encoder = Utf7Encoder;
    Utf7Codec.prototype.decoder = Utf7Decoder;
    Utf7Codec.prototype.bomAware = true;
    var nonDirectChars = /[^A-Za-z0-9'\(\),-\.\/:\? \n\r\t]+/g;
    function Utf7Encoder(options, codec) {
      this.iconv = codec.iconv;
    }
    Utf7Encoder.prototype.write = function(str) {
      return Buffer2.from(str.replace(nonDirectChars, function(chunk) {
        return "+" + (chunk === "+" ? "" : this.iconv.encode(chunk, "utf16-be").toString("base64").replace(/=+$/, "")) + "-";
      }.bind(this)));
    };
    Utf7Encoder.prototype.end = function() {
    };
    function Utf7Decoder(options, codec) {
      this.iconv = codec.iconv;
      this.inBase64 = false;
      this.base64Accum = "";
    }
    var base64Regex2 = /[A-Za-z0-9\/+]/;
    var base64Chars = [];
    for (i = 0; i < 256; i++) {
      base64Chars[i] = base64Regex2.test(String.fromCharCode(i));
    }
    var i;
    var plusChar = "+".charCodeAt(0);
    var minusChar = "-".charCodeAt(0);
    var andChar = "&".charCodeAt(0);
    Utf7Decoder.prototype.write = function(buf) {
      var res = "";
      var lastI = 0;
      var inBase64 = this.inBase64;
      var base64Accum = this.base64Accum;
      for (var i2 = 0; i2 < buf.length; i2++) {
        if (!inBase64) {
          if (buf[i2] == plusChar) {
            res += this.iconv.decode(buf.slice(lastI, i2), "ascii");
            lastI = i2 + 1;
            inBase64 = true;
          }
        } else {
          if (!base64Chars[buf[i2]]) {
            if (i2 == lastI && buf[i2] == minusChar) {
              res += "+";
            } else {
              var b64str = base64Accum + this.iconv.decode(buf.slice(lastI, i2), "ascii");
              res += this.iconv.decode(Buffer2.from(b64str, "base64"), "utf16-be");
            }
            if (buf[i2] != minusChar) {
              i2--;
            }
            lastI = i2 + 1;
            inBase64 = false;
            base64Accum = "";
          }
        }
      }
      if (!inBase64) {
        res += this.iconv.decode(buf.slice(lastI), "ascii");
      } else {
        var b64str = base64Accum + this.iconv.decode(buf.slice(lastI), "ascii");
        var canBeDecoded = b64str.length - b64str.length % 8;
        base64Accum = b64str.slice(canBeDecoded);
        b64str = b64str.slice(0, canBeDecoded);
        res += this.iconv.decode(Buffer2.from(b64str, "base64"), "utf16-be");
      }
      this.inBase64 = inBase64;
      this.base64Accum = base64Accum;
      return res;
    };
    Utf7Decoder.prototype.end = function() {
      var res = "";
      if (this.inBase64 && this.base64Accum.length > 0) {
        res = this.iconv.decode(Buffer2.from(this.base64Accum, "base64"), "utf16-be");
      }
      this.inBase64 = false;
      this.base64Accum = "";
      return res;
    };
    exports2.utf7imap = Utf7IMAPCodec;
    function Utf7IMAPCodec(codecOptions, iconv) {
      this.iconv = iconv;
    }
    Utf7IMAPCodec.prototype.encoder = Utf7IMAPEncoder;
    Utf7IMAPCodec.prototype.decoder = Utf7IMAPDecoder;
    Utf7IMAPCodec.prototype.bomAware = true;
    function Utf7IMAPEncoder(options, codec) {
      this.iconv = codec.iconv;
      this.inBase64 = false;
      this.base64Accum = Buffer2.alloc(6);
      this.base64AccumIdx = 0;
    }
    Utf7IMAPEncoder.prototype.write = function(str) {
      var inBase64 = this.inBase64;
      var base64Accum = this.base64Accum;
      var base64AccumIdx = this.base64AccumIdx;
      var buf = Buffer2.alloc(str.length * 5 + 10);
      var bufIdx = 0;
      for (var i2 = 0; i2 < str.length; i2++) {
        var uChar = str.charCodeAt(i2);
        if (uChar >= 32 && uChar <= 126) {
          if (inBase64) {
            if (base64AccumIdx > 0) {
              bufIdx += buf.write(base64Accum.slice(0, base64AccumIdx).toString("base64").replace(/\//g, ",").replace(/=+$/, ""), bufIdx);
              base64AccumIdx = 0;
            }
            buf[bufIdx++] = minusChar;
            inBase64 = false;
          }
          if (!inBase64) {
            buf[bufIdx++] = uChar;
            if (uChar === andChar) {
              buf[bufIdx++] = minusChar;
            }
          }
        } else {
          if (!inBase64) {
            buf[bufIdx++] = andChar;
            inBase64 = true;
          }
          if (inBase64) {
            base64Accum[base64AccumIdx++] = uChar >> 8;
            base64Accum[base64AccumIdx++] = uChar & 255;
            if (base64AccumIdx == base64Accum.length) {
              bufIdx += buf.write(base64Accum.toString("base64").replace(/\//g, ","), bufIdx);
              base64AccumIdx = 0;
            }
          }
        }
      }
      this.inBase64 = inBase64;
      this.base64AccumIdx = base64AccumIdx;
      return buf.slice(0, bufIdx);
    };
    Utf7IMAPEncoder.prototype.end = function() {
      var buf = Buffer2.alloc(10);
      var bufIdx = 0;
      if (this.inBase64) {
        if (this.base64AccumIdx > 0) {
          bufIdx += buf.write(this.base64Accum.slice(0, this.base64AccumIdx).toString("base64").replace(/\//g, ",").replace(/=+$/, ""), bufIdx);
          this.base64AccumIdx = 0;
        }
        buf[bufIdx++] = minusChar;
        this.inBase64 = false;
      }
      return buf.slice(0, bufIdx);
    };
    function Utf7IMAPDecoder(options, codec) {
      this.iconv = codec.iconv;
      this.inBase64 = false;
      this.base64Accum = "";
    }
    var base64IMAPChars = base64Chars.slice();
    base64IMAPChars[",".charCodeAt(0)] = true;
    Utf7IMAPDecoder.prototype.write = function(buf) {
      var res = "";
      var lastI = 0;
      var inBase64 = this.inBase64;
      var base64Accum = this.base64Accum;
      for (var i2 = 0; i2 < buf.length; i2++) {
        if (!inBase64) {
          if (buf[i2] == andChar) {
            res += this.iconv.decode(buf.slice(lastI, i2), "ascii");
            lastI = i2 + 1;
            inBase64 = true;
          }
        } else {
          if (!base64IMAPChars[buf[i2]]) {
            if (i2 == lastI && buf[i2] == minusChar) {
              res += "&";
            } else {
              var b64str = base64Accum + this.iconv.decode(buf.slice(lastI, i2), "ascii").replace(/,/g, "/");
              res += this.iconv.decode(Buffer2.from(b64str, "base64"), "utf16-be");
            }
            if (buf[i2] != minusChar) {
              i2--;
            }
            lastI = i2 + 1;
            inBase64 = false;
            base64Accum = "";
          }
        }
      }
      if (!inBase64) {
        res += this.iconv.decode(buf.slice(lastI), "ascii");
      } else {
        var b64str = base64Accum + this.iconv.decode(buf.slice(lastI), "ascii").replace(/,/g, "/");
        var canBeDecoded = b64str.length - b64str.length % 8;
        base64Accum = b64str.slice(canBeDecoded);
        b64str = b64str.slice(0, canBeDecoded);
        res += this.iconv.decode(Buffer2.from(b64str, "base64"), "utf16-be");
      }
      this.inBase64 = inBase64;
      this.base64Accum = base64Accum;
      return res;
    };
    Utf7IMAPDecoder.prototype.end = function() {
      var res = "";
      if (this.inBase64 && this.base64Accum.length > 0) {
        res = this.iconv.decode(Buffer2.from(this.base64Accum, "base64"), "utf16-be");
      }
      this.inBase64 = false;
      this.base64Accum = "";
      return res;
    };
  }
});

// ../../node_modules/.pnpm/iconv-lite@0.7.2/node_modules/iconv-lite/encodings/sbcs-codec.js
var require_sbcs_codec = __commonJS({
  "../../node_modules/.pnpm/iconv-lite@0.7.2/node_modules/iconv-lite/encodings/sbcs-codec.js"(exports2) {
    "use strict";
    var Buffer2 = require_safer().Buffer;
    exports2._sbcs = SBCSCodec;
    function SBCSCodec(codecOptions, iconv) {
      if (!codecOptions) {
        throw new Error("SBCS codec is called without the data.");
      }
      if (!codecOptions.chars || codecOptions.chars.length !== 128 && codecOptions.chars.length !== 256) {
        throw new Error("Encoding '" + codecOptions.type + "' has incorrect 'chars' (must be of len 128 or 256)");
      }
      if (codecOptions.chars.length === 128) {
        var asciiString = "";
        for (var i = 0; i < 128; i++) {
          asciiString += String.fromCharCode(i);
        }
        codecOptions.chars = asciiString + codecOptions.chars;
      }
      this.decodeBuf = Buffer2.from(codecOptions.chars, "ucs2");
      var encodeBuf = Buffer2.alloc(65536, iconv.defaultCharSingleByte.charCodeAt(0));
      for (var i = 0; i < codecOptions.chars.length; i++) {
        encodeBuf[codecOptions.chars.charCodeAt(i)] = i;
      }
      this.encodeBuf = encodeBuf;
    }
    SBCSCodec.prototype.encoder = SBCSEncoder;
    SBCSCodec.prototype.decoder = SBCSDecoder;
    function SBCSEncoder(options, codec) {
      this.encodeBuf = codec.encodeBuf;
    }
    SBCSEncoder.prototype.write = function(str) {
      var buf = Buffer2.alloc(str.length);
      for (var i = 0; i < str.length; i++) {
        buf[i] = this.encodeBuf[str.charCodeAt(i)];
      }
      return buf;
    };
    SBCSEncoder.prototype.end = function() {
    };
    function SBCSDecoder(options, codec) {
      this.decodeBuf = codec.decodeBuf;
    }
    SBCSDecoder.prototype.write = function(buf) {
      var decodeBuf = this.decodeBuf;
      var newBuf = Buffer2.alloc(buf.length * 2);
      var idx1 = 0;
      var idx2 = 0;
      for (var i = 0; i < buf.length; i++) {
        idx1 = buf[i] * 2;
        idx2 = i * 2;
        newBuf[idx2] = decodeBuf[idx1];
        newBuf[idx2 + 1] = decodeBuf[idx1 + 1];
      }
      return newBuf.toString("ucs2");
    };
    SBCSDecoder.prototype.end = function() {
    };
  }
});

// ../../node_modules/.pnpm/iconv-lite@0.7.2/node_modules/iconv-lite/encodings/sbcs-data.js
var require_sbcs_data = __commonJS({
  "../../node_modules/.pnpm/iconv-lite@0.7.2/node_modules/iconv-lite/encodings/sbcs-data.js"(exports2, module2) {
    "use strict";
    module2.exports = {
      // Not supported by iconv, not sure why.
      10029: "maccenteuro",
      maccenteuro: {
        type: "_sbcs",
        chars: "\xC4\u0100\u0101\xC9\u0104\xD6\xDC\xE1\u0105\u010C\xE4\u010D\u0106\u0107\xE9\u0179\u017A\u010E\xED\u010F\u0112\u0113\u0116\xF3\u0117\xF4\xF6\xF5\xFA\u011A\u011B\xFC\u2020\xB0\u0118\xA3\xA7\u2022\xB6\xDF\xAE\xA9\u2122\u0119\xA8\u2260\u0123\u012E\u012F\u012A\u2264\u2265\u012B\u0136\u2202\u2211\u0142\u013B\u013C\u013D\u013E\u0139\u013A\u0145\u0146\u0143\xAC\u221A\u0144\u0147\u2206\xAB\xBB\u2026\xA0\u0148\u0150\xD5\u0151\u014C\u2013\u2014\u201C\u201D\u2018\u2019\xF7\u25CA\u014D\u0154\u0155\u0158\u2039\u203A\u0159\u0156\u0157\u0160\u201A\u201E\u0161\u015A\u015B\xC1\u0164\u0165\xCD\u017D\u017E\u016A\xD3\xD4\u016B\u016E\xDA\u016F\u0170\u0171\u0172\u0173\xDD\xFD\u0137\u017B\u0141\u017C\u0122\u02C7"
      },
      808: "cp808",
      ibm808: "cp808",
      cp808: {
        type: "_sbcs",
        chars: "\u0410\u0411\u0412\u0413\u0414\u0415\u0416\u0417\u0418\u0419\u041A\u041B\u041C\u041D\u041E\u041F\u0420\u0421\u0422\u0423\u0424\u0425\u0426\u0427\u0428\u0429\u042A\u042B\u042C\u042D\u042E\u042F\u0430\u0431\u0432\u0433\u0434\u0435\u0436\u0437\u0438\u0439\u043A\u043B\u043C\u043D\u043E\u043F\u2591\u2592\u2593\u2502\u2524\u2561\u2562\u2556\u2555\u2563\u2551\u2557\u255D\u255C\u255B\u2510\u2514\u2534\u252C\u251C\u2500\u253C\u255E\u255F\u255A\u2554\u2569\u2566\u2560\u2550\u256C\u2567\u2568\u2564\u2565\u2559\u2558\u2552\u2553\u256B\u256A\u2518\u250C\u2588\u2584\u258C\u2590\u2580\u0440\u0441\u0442\u0443\u0444\u0445\u0446\u0447\u0448\u0449\u044A\u044B\u044C\u044D\u044E\u044F\u0401\u0451\u0404\u0454\u0407\u0457\u040E\u045E\xB0\u2219\xB7\u221A\u2116\u20AC\u25A0\xA0"
      },
      mik: {
        type: "_sbcs",
        chars: "\u0410\u0411\u0412\u0413\u0414\u0415\u0416\u0417\u0418\u0419\u041A\u041B\u041C\u041D\u041E\u041F\u0420\u0421\u0422\u0423\u0424\u0425\u0426\u0427\u0428\u0429\u042A\u042B\u042C\u042D\u042E\u042F\u0430\u0431\u0432\u0433\u0434\u0435\u0436\u0437\u0438\u0439\u043A\u043B\u043C\u043D\u043E\u043F\u0440\u0441\u0442\u0443\u0444\u0445\u0446\u0447\u0448\u0449\u044A\u044B\u044C\u044D\u044E\u044F\u2514\u2534\u252C\u251C\u2500\u253C\u2563\u2551\u255A\u2554\u2569\u2566\u2560\u2550\u256C\u2510\u2591\u2592\u2593\u2502\u2524\u2116\xA7\u2557\u255D\u2518\u250C\u2588\u2584\u258C\u2590\u2580\u03B1\xDF\u0393\u03C0\u03A3\u03C3\xB5\u03C4\u03A6\u0398\u03A9\u03B4\u221E\u03C6\u03B5\u2229\u2261\xB1\u2265\u2264\u2320\u2321\xF7\u2248\xB0\u2219\xB7\u221A\u207F\xB2\u25A0\xA0"
      },
      cp720: {
        type: "_sbcs",
        chars: "\x80\x81\xE9\xE2\x84\xE0\x86\xE7\xEA\xEB\xE8\xEF\xEE\x8D\x8E\x8F\x90\u0651\u0652\xF4\xA4\u0640\xFB\xF9\u0621\u0622\u0623\u0624\xA3\u0625\u0626\u0627\u0628\u0629\u062A\u062B\u062C\u062D\u062E\u062F\u0630\u0631\u0632\u0633\u0634\u0635\xAB\xBB\u2591\u2592\u2593\u2502\u2524\u2561\u2562\u2556\u2555\u2563\u2551\u2557\u255D\u255C\u255B\u2510\u2514\u2534\u252C\u251C\u2500\u253C\u255E\u255F\u255A\u2554\u2569\u2566\u2560\u2550\u256C\u2567\u2568\u2564\u2565\u2559\u2558\u2552\u2553\u256B\u256A\u2518\u250C\u2588\u2584\u258C\u2590\u2580\u0636\u0637\u0638\u0639\u063A\u0641\xB5\u0642\u0643\u0644\u0645\u0646\u0647\u0648\u0649\u064A\u2261\u064B\u064C\u064D\u064E\u064F\u0650\u2248\xB0\u2219\xB7\u221A\u207F\xB2\u25A0\xA0"
      },
      // Aliases of generated encodings.
      ascii8bit: "ascii",
      usascii: "ascii",
      ansix34: "ascii",
      ansix341968: "ascii",
      ansix341986: "ascii",
      csascii: "ascii",
      cp367: "ascii",
      ibm367: "ascii",
      isoir6: "ascii",
      iso646us: "ascii",
      iso646irv: "ascii",
      us: "ascii",
      latin1: "iso88591",
      latin2: "iso88592",
      latin3: "iso88593",
      latin4: "iso88594",
      latin5: "iso88599",
      latin6: "iso885910",
      latin7: "iso885913",
      latin8: "iso885914",
      latin9: "iso885915",
      latin10: "iso885916",
      csisolatin1: "iso88591",
      csisolatin2: "iso88592",
      csisolatin3: "iso88593",
      csisolatin4: "iso88594",
      csisolatincyrillic: "iso88595",
      csisolatinarabic: "iso88596",
      csisolatingreek: "iso88597",
      csisolatinhebrew: "iso88598",
      csisolatin5: "iso88599",
      csisolatin6: "iso885910",
      l1: "iso88591",
      l2: "iso88592",
      l3: "iso88593",
      l4: "iso88594",
      l5: "iso88599",
      l6: "iso885910",
      l7: "iso885913",
      l8: "iso885914",
      l9: "iso885915",
      l10: "iso885916",
      isoir14: "iso646jp",
      isoir57: "iso646cn",
      isoir100: "iso88591",
      isoir101: "iso88592",
      isoir109: "iso88593",
      isoir110: "iso88594",
      isoir144: "iso88595",
      isoir127: "iso88596",
      isoir126: "iso88597",
      isoir138: "iso88598",
      isoir148: "iso88599",
      isoir157: "iso885910",
      isoir166: "tis620",
      isoir179: "iso885913",
      isoir199: "iso885914",
      isoir203: "iso885915",
      isoir226: "iso885916",
      cp819: "iso88591",
      ibm819: "iso88591",
      cyrillic: "iso88595",
      arabic: "iso88596",
      arabic8: "iso88596",
      ecma114: "iso88596",
      asmo708: "iso88596",
      greek: "iso88597",
      greek8: "iso88597",
      ecma118: "iso88597",
      elot928: "iso88597",
      hebrew: "iso88598",
      hebrew8: "iso88598",
      turkish: "iso88599",
      turkish8: "iso88599",
      thai: "iso885911",
      thai8: "iso885911",
      celtic: "iso885914",
      celtic8: "iso885914",
      isoceltic: "iso885914",
      tis6200: "tis620",
      tis62025291: "tis620",
      tis62025330: "tis620",
      1e4: "macroman",
      10006: "macgreek",
      10007: "maccyrillic",
      10079: "maciceland",
      10081: "macturkish",
      cspc8codepage437: "cp437",
      cspc775baltic: "cp775",
      cspc850multilingual: "cp850",
      cspcp852: "cp852",
      cspc862latinhebrew: "cp862",
      cpgr: "cp869",
      msee: "cp1250",
      mscyrl: "cp1251",
      msansi: "cp1252",
      msgreek: "cp1253",
      msturk: "cp1254",
      mshebr: "cp1255",
      msarab: "cp1256",
      winbaltrim: "cp1257",
      cp20866: "koi8r",
      20866: "koi8r",
      ibm878: "koi8r",
      cskoi8r: "koi8r",
      cp21866: "koi8u",
      21866: "koi8u",
      ibm1168: "koi8u",
      strk10482002: "rk1048",
      tcvn5712: "tcvn",
      tcvn57121: "tcvn",
      gb198880: "iso646cn",
      cn: "iso646cn",
      csiso14jisc6220ro: "iso646jp",
      jisc62201969ro: "iso646jp",
      jp: "iso646jp",
      cshproman8: "hproman8",
      r8: "hproman8",
      roman8: "hproman8",
      xroman8: "hproman8",
      ibm1051: "hproman8",
      mac: "macintosh",
      csmacintosh: "macintosh"
    };
  }
});

// ../../node_modules/.pnpm/iconv-lite@0.7.2/node_modules/iconv-lite/encodings/sbcs-data-generated.js
var require_sbcs_data_generated = __commonJS({
  "../../node_modules/.pnpm/iconv-lite@0.7.2/node_modules/iconv-lite/encodings/sbcs-data-generated.js"(exports2, module2) {
    "use strict";
    module2.exports = {
      "437": "cp437",
      "737": "cp737",
      "775": "cp775",
      "850": "cp850",
      "852": "cp852",
      "855": "cp855",
      "856": "cp856",
      "857": "cp857",
      "858": "cp858",
      "860": "cp860",
      "861": "cp861",
      "862": "cp862",
      "863": "cp863",
      "864": "cp864",
      "865": "cp865",
      "866": "cp866",
      "869": "cp869",
      "874": "windows874",
      "922": "cp922",
      "1046": "cp1046",
      "1124": "cp1124",
      "1125": "cp1125",
      "1129": "cp1129",
      "1133": "cp1133",
      "1161": "cp1161",
      "1162": "cp1162",
      "1163": "cp1163",
      "1250": "windows1250",
      "1251": "windows1251",
      "1252": "windows1252",
      "1253": "windows1253",
      "1254": "windows1254",
      "1255": "windows1255",
      "1256": "windows1256",
      "1257": "windows1257",
      "1258": "windows1258",
      "28591": "iso88591",
      "28592": "iso88592",
      "28593": "iso88593",
      "28594": "iso88594",
      "28595": "iso88595",
      "28596": "iso88596",
      "28597": "iso88597",
      "28598": "iso88598",
      "28599": "iso88599",
      "28600": "iso885910",
      "28601": "iso885911",
      "28603": "iso885913",
      "28604": "iso885914",
      "28605": "iso885915",
      "28606": "iso885916",
      "windows874": {
        "type": "_sbcs",
        "chars": "\u20AC\uFFFD\uFFFD\uFFFD\uFFFD\u2026\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\u2018\u2019\u201C\u201D\u2022\u2013\u2014\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\xA0\u0E01\u0E02\u0E03\u0E04\u0E05\u0E06\u0E07\u0E08\u0E09\u0E0A\u0E0B\u0E0C\u0E0D\u0E0E\u0E0F\u0E10\u0E11\u0E12\u0E13\u0E14\u0E15\u0E16\u0E17\u0E18\u0E19\u0E1A\u0E1B\u0E1C\u0E1D\u0E1E\u0E1F\u0E20\u0E21\u0E22\u0E23\u0E24\u0E25\u0E26\u0E27\u0E28\u0E29\u0E2A\u0E2B\u0E2C\u0E2D\u0E2E\u0E2F\u0E30\u0E31\u0E32\u0E33\u0E34\u0E35\u0E36\u0E37\u0E38\u0E39\u0E3A\uFFFD\uFFFD\uFFFD\uFFFD\u0E3F\u0E40\u0E41\u0E42\u0E43\u0E44\u0E45\u0E46\u0E47\u0E48\u0E49\u0E4A\u0E4B\u0E4C\u0E4D\u0E4E\u0E4F\u0E50\u0E51\u0E52\u0E53\u0E54\u0E55\u0E56\u0E57\u0E58\u0E59\u0E5A\u0E5B\uFFFD\uFFFD\uFFFD\uFFFD"
      },
      "win874": "windows874",
      "cp874": "windows874",
      "windows1250": {
        "type": "_sbcs",
        "chars": "\u20AC\uFFFD\u201A\uFFFD\u201E\u2026\u2020\u2021\uFFFD\u2030\u0160\u2039\u015A\u0164\u017D\u0179\uFFFD\u2018\u2019\u201C\u201D\u2022\u2013\u2014\uFFFD\u2122\u0161\u203A\u015B\u0165\u017E\u017A\xA0\u02C7\u02D8\u0141\xA4\u0104\xA6\xA7\xA8\xA9\u015E\xAB\xAC\xAD\xAE\u017B\xB0\xB1\u02DB\u0142\xB4\xB5\xB6\xB7\xB8\u0105\u015F\xBB\u013D\u02DD\u013E\u017C\u0154\xC1\xC2\u0102\xC4\u0139\u0106\xC7\u010C\xC9\u0118\xCB\u011A\xCD\xCE\u010E\u0110\u0143\u0147\xD3\xD4\u0150\xD6\xD7\u0158\u016E\xDA\u0170\xDC\xDD\u0162\xDF\u0155\xE1\xE2\u0103\xE4\u013A\u0107\xE7\u010D\xE9\u0119\xEB\u011B\xED\xEE\u010F\u0111\u0144\u0148\xF3\xF4\u0151\xF6\xF7\u0159\u016F\xFA\u0171\xFC\xFD\u0163\u02D9"
      },
      "win1250": "windows1250",
      "cp1250": "windows1250",
      "windows1251": {
        "type": "_sbcs",
        "chars": "\u0402\u0403\u201A\u0453\u201E\u2026\u2020\u2021\u20AC\u2030\u0409\u2039\u040A\u040C\u040B\u040F\u0452\u2018\u2019\u201C\u201D\u2022\u2013\u2014\uFFFD\u2122\u0459\u203A\u045A\u045C\u045B\u045F\xA0\u040E\u045E\u0408\xA4\u0490\xA6\xA7\u0401\xA9\u0404\xAB\xAC\xAD\xAE\u0407\xB0\xB1\u0406\u0456\u0491\xB5\xB6\xB7\u0451\u2116\u0454\xBB\u0458\u0405\u0455\u0457\u0410\u0411\u0412\u0413\u0414\u0415\u0416\u0417\u0418\u0419\u041A\u041B\u041C\u041D\u041E\u041F\u0420\u0421\u0422\u0423\u0424\u0425\u0426\u0427\u0428\u0429\u042A\u042B\u042C\u042D\u042E\u042F\u0430\u0431\u0432\u0433\u0434\u0435\u0436\u0437\u0438\u0439\u043A\u043B\u043C\u043D\u043E\u043F\u0440\u0441\u0442\u0443\u0444\u0445\u0446\u0447\u0448\u0449\u044A\u044B\u044C\u044D\u044E\u044F"
      },
      "win1251": "windows1251",
      "cp1251": "windows1251",
      "windows1252": {
        "type": "_sbcs",
        "chars": "\u20AC\uFFFD\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\u0160\u2039\u0152\uFFFD\u017D\uFFFD\uFFFD\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\u0161\u203A\u0153\uFFFD\u017E\u0178\xA0\xA1\xA2\xA3\xA4\xA5\xA6\xA7\xA8\xA9\xAA\xAB\xAC\xAD\xAE\xAF\xB0\xB1\xB2\xB3\xB4\xB5\xB6\xB7\xB8\xB9\xBA\xBB\xBC\xBD\xBE\xBF\xC0\xC1\xC2\xC3\xC4\xC5\xC6\xC7\xC8\xC9\xCA\xCB\xCC\xCD\xCE\xCF\xD0\xD1\xD2\xD3\xD4\xD5\xD6\xD7\xD8\xD9\xDA\xDB\xDC\xDD\xDE\xDF\xE0\xE1\xE2\xE3\xE4\xE5\xE6\xE7\xE8\xE9\xEA\xEB\xEC\xED\xEE\xEF\xF0\xF1\xF2\xF3\xF4\xF5\xF6\xF7\xF8\xF9\xFA\xFB\xFC\xFD\xFE\xFF"
      },
      "win1252": "windows1252",
      "cp1252": "windows1252",
      "windows1253": {
        "type": "_sbcs",
        "chars": "\u20AC\uFFFD\u201A\u0192\u201E\u2026\u2020\u2021\uFFFD\u2030\uFFFD\u2039\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\u2018\u2019\u201C\u201D\u2022\u2013\u2014\uFFFD\u2122\uFFFD\u203A\uFFFD\uFFFD\uFFFD\uFFFD\xA0\u0385\u0386\xA3\xA4\xA5\xA6\xA7\xA8\xA9\uFFFD\xAB\xAC\xAD\xAE\u2015\xB0\xB1\xB2\xB3\u0384\xB5\xB6\xB7\u0388\u0389\u038A\xBB\u038C\xBD\u038E\u038F\u0390\u0391\u0392\u0393\u0394\u0395\u0396\u0397\u0398\u0399\u039A\u039B\u039C\u039D\u039E\u039F\u03A0\u03A1\uFFFD\u03A3\u03A4\u03A5\u03A6\u03A7\u03A8\u03A9\u03AA\u03AB\u03AC\u03AD\u03AE\u03AF\u03B0\u03B1\u03B2\u03B3\u03B4\u03B5\u03B6\u03B7\u03B8\u03B9\u03BA\u03BB\u03BC\u03BD\u03BE\u03BF\u03C0\u03C1\u03C2\u03C3\u03C4\u03C5\u03C6\u03C7\u03C8\u03C9\u03CA\u03CB\u03CC\u03CD\u03CE\uFFFD"
      },
      "win1253": "windows1253",
      "cp1253": "windows1253",
      "windows1254": {
        "type": "_sbcs",
        "chars": "\u20AC\uFFFD\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\u0160\u2039\u0152\uFFFD\uFFFD\uFFFD\uFFFD\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\u0161\u203A\u0153\uFFFD\uFFFD\u0178\xA0\xA1\xA2\xA3\xA4\xA5\xA6\xA7\xA8\xA9\xAA\xAB\xAC\xAD\xAE\xAF\xB0\xB1\xB2\xB3\xB4\xB5\xB6\xB7\xB8\xB9\xBA\xBB\xBC\xBD\xBE\xBF\xC0\xC1\xC2\xC3\xC4\xC5\xC6\xC7\xC8\xC9\xCA\xCB\xCC\xCD\xCE\xCF\u011E\xD1\xD2\xD3\xD4\xD5\xD6\xD7\xD8\xD9\xDA\xDB\xDC\u0130\u015E\xDF\xE0\xE1\xE2\xE3\xE4\xE5\xE6\xE7\xE8\xE9\xEA\xEB\xEC\xED\xEE\xEF\u011F\xF1\xF2\xF3\xF4\xF5\xF6\xF7\xF8\xF9\xFA\xFB\xFC\u0131\u015F\xFF"
      },
      "win1254": "windows1254",
      "cp1254": "windows1254",
      "windows1255": {
        "type": "_sbcs",
        "chars": "\u20AC\uFFFD\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\uFFFD\u2039\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\uFFFD\u203A\uFFFD\uFFFD\uFFFD\uFFFD\xA0\xA1\xA2\xA3\u20AA\xA5\xA6\xA7\xA8\xA9\xD7\xAB\xAC\xAD\xAE\xAF\xB0\xB1\xB2\xB3\xB4\xB5\xB6\xB7\xB8\xB9\xF7\xBB\xBC\xBD\xBE\xBF\u05B0\u05B1\u05B2\u05B3\u05B4\u05B5\u05B6\u05B7\u05B8\u05B9\u05BA\u05BB\u05BC\u05BD\u05BE\u05BF\u05C0\u05C1\u05C2\u05C3\u05F0\u05F1\u05F2\u05F3\u05F4\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\u05D0\u05D1\u05D2\u05D3\u05D4\u05D5\u05D6\u05D7\u05D8\u05D9\u05DA\u05DB\u05DC\u05DD\u05DE\u05DF\u05E0\u05E1\u05E2\u05E3\u05E4\u05E5\u05E6\u05E7\u05E8\u05E9\u05EA\uFFFD\uFFFD\u200E\u200F\uFFFD"
      },
      "win1255": "windows1255",
      "cp1255": "windows1255",
      "windows1256": {
        "type": "_sbcs",
        "chars": "\u20AC\u067E\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\u0679\u2039\u0152\u0686\u0698\u0688\u06AF\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u06A9\u2122\u0691\u203A\u0153\u200C\u200D\u06BA\xA0\u060C\xA2\xA3\xA4\xA5\xA6\xA7\xA8\xA9\u06BE\xAB\xAC\xAD\xAE\xAF\xB0\xB1\xB2\xB3\xB4\xB5\xB6\xB7\xB8\xB9\u061B\xBB\xBC\xBD\xBE\u061F\u06C1\u0621\u0622\u0623\u0624\u0625\u0626\u0627\u0628\u0629\u062A\u062B\u062C\u062D\u062E\u062F\u0630\u0631\u0632\u0633\u0634\u0635\u0636\xD7\u0637\u0638\u0639\u063A\u0640\u0641\u0642\u0643\xE0\u0644\xE2\u0645\u0646\u0647\u0648\xE7\xE8\xE9\xEA\xEB\u0649\u064A\xEE\xEF\u064B\u064C\u064D\u064E\xF4\u064F\u0650\xF7\u0651\xF9\u0652\xFB\xFC\u200E\u200F\u06D2"
      },
      "win1256": "windows1256",
      "cp1256": "windows1256",
      "windows1257": {
        "type": "_sbcs",
        "chars": "\u20AC\uFFFD\u201A\uFFFD\u201E\u2026\u2020\u2021\uFFFD\u2030\uFFFD\u2039\uFFFD\xA8\u02C7\xB8\uFFFD\u2018\u2019\u201C\u201D\u2022\u2013\u2014\uFFFD\u2122\uFFFD\u203A\uFFFD\xAF\u02DB\uFFFD\xA0\uFFFD\xA2\xA3\xA4\uFFFD\xA6\xA7\xD8\xA9\u0156\xAB\xAC\xAD\xAE\xC6\xB0\xB1\xB2\xB3\xB4\xB5\xB6\xB7\xF8\xB9\u0157\xBB\xBC\xBD\xBE\xE6\u0104\u012E\u0100\u0106\xC4\xC5\u0118\u0112\u010C\xC9\u0179\u0116\u0122\u0136\u012A\u013B\u0160\u0143\u0145\xD3\u014C\xD5\xD6\xD7\u0172\u0141\u015A\u016A\xDC\u017B\u017D\xDF\u0105\u012F\u0101\u0107\xE4\xE5\u0119\u0113\u010D\xE9\u017A\u0117\u0123\u0137\u012B\u013C\u0161\u0144\u0146\xF3\u014D\xF5\xF6\xF7\u0173\u0142\u015B\u016B\xFC\u017C\u017E\u02D9"
      },
      "win1257": "windows1257",
      "cp1257": "windows1257",
      "windows1258": {
        "type": "_sbcs",
        "chars": "\u20AC\uFFFD\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\uFFFD\u2039\u0152\uFFFD\uFFFD\uFFFD\uFFFD\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\uFFFD\u203A\u0153\uFFFD\uFFFD\u0178\xA0\xA1\xA2\xA3\xA4\xA5\xA6\xA7\xA8\xA9\xAA\xAB\xAC\xAD\xAE\xAF\xB0\xB1\xB2\xB3\xB4\xB5\xB6\xB7\xB8\xB9\xBA\xBB\xBC\xBD\xBE\xBF\xC0\xC1\xC2\u0102\xC4\xC5\xC6\xC7\xC8\xC9\xCA\xCB\u0300\xCD\xCE\xCF\u0110\xD1\u0309\xD3\xD4\u01A0\xD6\xD7\xD8\xD9\xDA\xDB\xDC\u01AF\u0303\xDF\xE0\xE1\xE2\u0103\xE4\xE5\xE6\xE7\xE8\xE9\xEA\xEB\u0301\xED\xEE\xEF\u0111\xF1\u0323\xF3\xF4\u01A1\xF6\xF7\xF8\xF9\xFA\xFB\xFC\u01B0\u20AB\xFF"
      },
      "win1258": "windows1258",
      "cp1258": "windows1258",
      "iso88591": {
        "type": "_sbcs",
        "chars": "\x80\x81\x82\x83\x84\x85\x86\x87\x88\x89\x8A\x8B\x8C\x8D\x8E\x8F\x90\x91\x92\x93\x94\x95\x96\x97\x98\x99\x9A\x9B\x9C\x9D\x9E\x9F\xA0\xA1\xA2\xA3\xA4\xA5\xA6\xA7\xA8\xA9\xAA\xAB\xAC\xAD\xAE\xAF\xB0\xB1\xB2\xB3\xB4\xB5\xB6\xB7\xB8\xB9\xBA\xBB\xBC\xBD\xBE\xBF\xC0\xC1\xC2\xC3\xC4\xC5\xC6\xC7\xC8\xC9\xCA\xCB\xCC\xCD\xCE\xCF\xD0\xD1\xD2\xD3\xD4\xD5\xD6\xD7\xD8\xD9\xDA\xDB\xDC\xDD\xDE\xDF\xE0\xE1\xE2\xE3\xE4\xE5\xE6\xE7\xE8\xE9\xEA\xEB\xEC\xED\xEE\xEF\xF0\xF1\xF2\xF3\xF4\xF5\xF6\xF7\xF8\xF9\xFA\xFB\xFC\xFD\xFE\xFF"
      },
      "cp28591": "iso88591",
      "iso88592": {
        "type": "_sbcs",
        "chars": "\x80\x81\x82\x83\x84\x85\x86\x87\x88\x89\x8A\x8B\x8C\x8D\x8E\x8F\x90\x91\x92\x93\x94\x95\x96\x97\x98\x99\x9A\x9B\x9C\x9D\x9E\x9F\xA0\u0104\u02D8\u0141\xA4\u013D\u015A\xA7\xA8\u0160\u015E\u0164\u0179\xAD\u017D\u017B\xB0\u0105\u02DB\u0142\xB4\u013E\u015B\u02C7\xB8\u0161\u015F\u0165\u017A\u02DD\u017E\u017C\u0154\xC1\xC2\u0102\xC4\u0139\u0106\xC7\u010C\xC9\u0118\xCB\u011A\xCD\xCE\u010E\u0110\u0143\u0147\xD3\xD4\u0150\xD6\xD7\u0158\u016E\xDA\u0170\xDC\xDD\u0162\xDF\u0155\xE1\xE2\u0103\xE4\u013A\u0107\xE7\u010D\xE9\u0119\xEB\u011B\xED\xEE\u010F\u0111\u0144\u0148\xF3\xF4\u0151\xF6\xF7\u0159\u016F\xFA\u0171\xFC\xFD\u0163\u02D9"
      },
      "cp28592": "iso88592",
      "iso88593": {
        "type": "_sbcs",
        "chars": "\x80\x81\x82\x83\x84\x85\x86\x87\x88\x89\x8A\x8B\x8C\x8D\x8E\x8F\x90\x91\x92\x93\x94\x95\x96\x97\x98\x99\x9A\x9B\x9C\x9D\x9E\x9F\xA0\u0126\u02D8\xA3\xA4\uFFFD\u0124\xA7\xA8\u0130\u015E\u011E\u0134\xAD\uFFFD\u017B\xB0\u0127\xB2\xB3\xB4\xB5\u0125\xB7\xB8\u0131\u015F\u011F\u0135\xBD\uFFFD\u017C\xC0\xC1\xC2\uFFFD\xC4\u010A\u0108\xC7\xC8\xC9\xCA\xCB\xCC\xCD\xCE\xCF\uFFFD\xD1\xD2\xD3\xD4\u0120\xD6\xD7\u011C\xD9\xDA\xDB\xDC\u016C\u015C\xDF\xE0\xE1\xE2\uFFFD\xE4\u010B\u0109\xE7\xE8\xE9\xEA\xEB\xEC\xED\xEE\xEF\uFFFD\xF1\xF2\xF3\xF4\u0121\xF6\xF7\u011D\xF9\xFA\xFB\xFC\u016D\u015D\u02D9"
      },
      "cp28593": "iso88593",
      "iso88594": {
        "type": "_sbcs",
        "chars": "\x80\x81\x82\x83\x84\x85\x86\x87\x88\x89\x8A\x8B\x8C\x8D\x8E\x8F\x90\x91\x92\x93\x94\x95\x96\x97\x98\x99\x9A\x9B\x9C\x9D\x9E\x9F\xA0\u0104\u0138\u0156\xA4\u0128\u013B\xA7\xA8\u0160\u0112\u0122\u0166\xAD\u017D\xAF\xB0\u0105\u02DB\u0157\xB4\u0129\u013C\u02C7\xB8\u0161\u0113\u0123\u0167\u014A\u017E\u014B\u0100\xC1\xC2\xC3\xC4\xC5\xC6\u012E\u010C\xC9\u0118\xCB\u0116\xCD\xCE\u012A\u0110\u0145\u014C\u0136\xD4\xD5\xD6\xD7\xD8\u0172\xDA\xDB\xDC\u0168\u016A\xDF\u0101\xE1\xE2\xE3\xE4\xE5\xE6\u012F\u010D\xE9\u0119\xEB\u0117\xED\xEE\u012B\u0111\u0146\u014D\u0137\xF4\xF5\xF6\xF7\xF8\u0173\xFA\xFB\xFC\u0169\u016B\u02D9"
      },
      "cp28594": "iso88594",
      "iso88595": {
        "type": "_sbcs",
        "chars": "\x80\x81\x82\x83\x84\x85\x86\x87\x88\x89\x8A\x8B\x8C\x8D\x8E\x8F\x90\x91\x92\x93\x94\x95\x96\x97\x98\x99\x9A\x9B\x9C\x9D\x9E\x9F\xA0\u0401\u0402\u0403\u0404\u0405\u0406\u0407\u0408\u0409\u040A\u040B\u040C\xAD\u040E\u040F\u0410\u0411\u0412\u0413\u0414\u0415\u0416\u0417\u0418\u0419\u041A\u041B\u041C\u041D\u041E\u041F\u0420\u0421\u0422\u0423\u0424\u0425\u0426\u0427\u0428\u0429\u042A\u042B\u042C\u042D\u042E\u042F\u0430\u0431\u0432\u0433\u0434\u0435\u0436\u0437\
