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
      }      ClientError.prototype.expose = true;
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
            break;      }
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
