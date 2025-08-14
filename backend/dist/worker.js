// node_modules/hono/dist/utils/url.js
var splitPath = (path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
};
var splitRoutingPath = (routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
};
var extractGroupsFromPath = (path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match, index) => {
    const mark = `@${index}`;
    groups.push([mark, match]);
    return mark;
  });
  return { groups, path };
};
var replaceGroupMarks = (paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
};
var patternCache = {};
var getPattern = (label) => {
  if (label === "*") {
    return "*";
  }
  const match = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match) {
    if (!patternCache[label]) {
      if (match[2]) {
        patternCache[label] = [label, match[1], new RegExp("^" + match[2] + "$")];
      } else {
        patternCache[label] = [label, match[1], true];
      }
    }
    return patternCache[label];
  }
  return null;
};
var getPath = (request) => {
  const match = request.url.match(/^https?:\/\/[^/]+(\/[^?]*)/);
  return match ? match[1] : "";
};
var getQueryStrings = (url) => {
  const queryIndex = url.indexOf("?", 8);
  return queryIndex === -1 ? "" : "?" + url.slice(queryIndex + 1);
};
var getPathNoStrict = (request) => {
  const result = getPath(request);
  return result.length > 1 && result[result.length - 1] === "/" ? result.slice(0, -1) : result;
};
var mergePath = (...paths) => {
  let p = "";
  let endsWithSlash = false;
  for (let path of paths) {
    if (p[p.length - 1] === "/") {
      p = p.slice(0, -1);
      endsWithSlash = true;
    }
    if (path[0] !== "/") {
      path = `/${path}`;
    }
    if (path === "/" && endsWithSlash) {
      p = `${p}/`;
    } else if (path !== "/") {
      p = `${p}${path}`;
    }
    if (path === "/" && p === "") {
      p = "/";
    }
  }
  return p;
};
var checkOptionalParameter = (path) => {
  if (!path.match(/\:.+\?$/)) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace("?", "");
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
};
var _decodeURI = (value) => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return /%/.test(value) ? decodeURIComponent_(value) : value;
};
var _getQueryParam = (url, key, multiple) => {
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    let keyIndex2 = url.indexOf(`?${key}`, 8);
    if (keyIndex2 === -1) {
      keyIndex2 = url.indexOf(`&${key}`, 8);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = {};
  encoded ?? (encoded = /[%+]/.test(url));
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ?? (results[name] = value);
    }
  }
  return key ? results[key] : results;
};
var getQueryParam = _getQueryParam;
var getQueryParams = (url, key) => {
  return _getQueryParam(url, key, true);
};
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/utils/cookie.js
var validCookieNameRegEx = /^[\w!#$%&'*.^`|~+-]+$/;
var validCookieValueRegEx = /^[ !#-:<-[\]-~]*$/;
var parse = (cookie, name) => {
  const pairs = cookie.trim().split(";");
  return pairs.reduce((parsedCookie, pairStr) => {
    pairStr = pairStr.trim();
    const valueStartPos = pairStr.indexOf("=");
    if (valueStartPos === -1) {
      return parsedCookie;
    }
    const cookieName = pairStr.substring(0, valueStartPos).trim();
    if (name && name !== cookieName || !validCookieNameRegEx.test(cookieName)) {
      return parsedCookie;
    }
    let cookieValue = pairStr.substring(valueStartPos + 1).trim();
    if (cookieValue.startsWith('"') && cookieValue.endsWith('"')) {
      cookieValue = cookieValue.slice(1, -1);
    }
    if (validCookieValueRegEx.test(cookieValue)) {
      parsedCookie[cookieName] = decodeURIComponent_(cookieValue);
    }
    return parsedCookie;
  }, {});
};
var _serialize = (name, value, opt = {}) => {
  let cookie = `${name}=${value}`;
  if (opt && typeof opt.maxAge === "number" && opt.maxAge >= 0) {
    cookie += `; Max-Age=${Math.floor(opt.maxAge)}`;
  }
  if (opt.domain) {
    cookie += `; Domain=${opt.domain}`;
  }
  if (opt.path) {
    cookie += `; Path=${opt.path}`;
  }
  if (opt.expires) {
    cookie += `; Expires=${opt.expires.toUTCString()}`;
  }
  if (opt.httpOnly) {
    cookie += "; HttpOnly";
  }
  if (opt.secure) {
    cookie += "; Secure";
  }
  if (opt.sameSite) {
    cookie += `; SameSite=${opt.sameSite}`;
  }
  if (opt.partitioned) {
    cookie += "; Partitioned";
  }
  return cookie;
};
var serialize = (name, value, opt = {}) => {
  value = encodeURIComponent(value);
  return _serialize(name, value, opt);
};

// node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = (value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
};
var resolveCallback = async (str, phase, preserveCallbacks, context, buffer) => {
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
};

// node_modules/hono/dist/utils/stream.js
var StreamingApi = class {
  constructor(writable, _readable) {
    this.abortSubscribers = [];
    this.writable = writable;
    this.writer = writable.getWriter();
    this.encoder = new TextEncoder();
    const reader = _readable.getReader();
    this.responseReadable = new ReadableStream({
      async pull(controller) {
        const { done, value } = await reader.read();
        done ? controller.close() : controller.enqueue(value);
      },
      cancel: () => {
        this.abortSubscribers.forEach((subscriber) => subscriber());
      }
    });
  }
  async write(input) {
    try {
      if (typeof input === "string") {
        input = this.encoder.encode(input);
      }
      await this.writer.write(input);
    } catch (e) {
    }
    return this;
  }
  async writeln(input) {
    await this.write(input + "\n");
    return this;
  }
  sleep(ms) {
    return new Promise((res) => setTimeout(res, ms));
  }
  async close() {
    try {
      await this.writer.close();
    } catch (e) {
    }
  }
  async pipe(body) {
    this.writer.releaseLock();
    await body.pipeTo(this.writable, { preventClose: true });
    this.writer = this.writable.getWriter();
  }
  async onAbort(listener) {
    this.abortSubscribers.push(listener);
  }
};

// node_modules/hono/dist/context.js
var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet = (obj, member, getter) => {
  __accessCheck(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet = (obj, member, value, setter) => {
  __accessCheck(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setHeaders = (headers, map = {}) => {
  Object.entries(map).forEach(([key, value]) => headers.set(key, value));
  return headers;
};
var _status;
var _executionCtx;
var _headers;
var _preparedHeaders;
var _res;
var _isFresh;
var Context = class {
  constructor(req, options) {
    this.env = {};
    this._var = {};
    this.finalized = false;
    this.error = void 0;
    __privateAdd(this, _status, 200);
    __privateAdd(this, _executionCtx, void 0);
    __privateAdd(this, _headers, void 0);
    __privateAdd(this, _preparedHeaders, void 0);
    __privateAdd(this, _res, void 0);
    __privateAdd(this, _isFresh, true);
    this.renderer = (content) => this.html(content);
    this.notFoundHandler = () => new Response();
    this.render = (...args) => this.renderer(...args);
    this.setRenderer = (renderer) => {
      this.renderer = renderer;
    };
    this.header = (name, value, options2) => {
      if (value === void 0) {
        if (__privateGet(this, _headers)) {
          __privateGet(this, _headers).delete(name);
        } else if (__privateGet(this, _preparedHeaders)) {
          delete __privateGet(this, _preparedHeaders)[name.toLocaleLowerCase()];
        }
        if (this.finalized) {
          this.res.headers.delete(name);
        }
        return;
      }
      if (options2?.append) {
        if (!__privateGet(this, _headers)) {
          __privateSet(this, _isFresh, false);
          __privateSet(this, _headers, new Headers(__privateGet(this, _preparedHeaders)));
          __privateSet(this, _preparedHeaders, {});
        }
        __privateGet(this, _headers).append(name, value);
      } else {
        if (__privateGet(this, _headers)) {
          __privateGet(this, _headers).set(name, value);
        } else {
          __privateGet(this, _preparedHeaders) ?? __privateSet(this, _preparedHeaders, {});
          __privateGet(this, _preparedHeaders)[name.toLowerCase()] = value;
        }
      }
      if (this.finalized) {
        if (options2?.append) {
          this.res.headers.append(name, value);
        } else {
          this.res.headers.set(name, value);
        }
      }
    };
    this.status = (status) => {
      __privateSet(this, _isFresh, false);
      __privateSet(this, _status, status);
    };
    this.set = (key, value) => {
      this._var ?? (this._var = {});
      this._var[key] = value;
    };
    this.get = (key) => {
      return this._var ? this._var[key] : void 0;
    };
    this.newResponse = (data, arg, headers) => {
      if (__privateGet(this, _isFresh) && !headers && !arg && __privateGet(this, _status) === 200) {
        return new Response(data, {
          headers: __privateGet(this, _preparedHeaders)
        });
      }
      if (arg && typeof arg !== "number") {
        const headers2 = setHeaders(new Headers(arg.headers), __privateGet(this, _preparedHeaders));
        return new Response(data, {
          headers: headers2,
          status: arg.status
        });
      }
      const status = typeof arg === "number" ? arg : __privateGet(this, _status);
      __privateGet(this, _preparedHeaders) ?? __privateSet(this, _preparedHeaders, {});
      __privateGet(this, _headers) ?? __privateSet(this, _headers, new Headers());
      setHeaders(__privateGet(this, _headers), __privateGet(this, _preparedHeaders));
      if (__privateGet(this, _res)) {
        __privateGet(this, _res).headers.forEach((v, k) => {
          __privateGet(this, _headers)?.set(k, v);
        });
        setHeaders(__privateGet(this, _headers), __privateGet(this, _preparedHeaders));
      }
      headers ?? (headers = {});
      for (const [k, v] of Object.entries(headers)) {
        if (typeof v === "string") {
          __privateGet(this, _headers).set(k, v);
        } else {
          __privateGet(this, _headers).delete(k);
          for (const v2 of v) {
            __privateGet(this, _headers).append(k, v2);
          }
        }
      }
      return new Response(data, {
        status,
        headers: __privateGet(this, _headers)
      });
    };
    this.body = (data, arg, headers) => {
      return typeof arg === "number" ? this.newResponse(data, arg, headers) : this.newResponse(data, arg);
    };
    this.text = (text, arg, headers) => {
      if (!__privateGet(this, _preparedHeaders)) {
        if (__privateGet(this, _isFresh) && !headers && !arg) {
          return new Response(text);
        }
        __privateSet(this, _preparedHeaders, {});
      }
      __privateGet(this, _preparedHeaders)["content-type"] = TEXT_PLAIN;
      return typeof arg === "number" ? this.newResponse(text, arg, headers) : this.newResponse(text, arg);
    };
    this.json = (object, arg, headers) => {
      const body = JSON.stringify(object);
      __privateGet(this, _preparedHeaders) ?? __privateSet(this, _preparedHeaders, {});
      __privateGet(this, _preparedHeaders)["content-type"] = "application/json; charset=UTF-8";
      return typeof arg === "number" ? this.newResponse(body, arg, headers) : this.newResponse(body, arg);
    };
    this.jsonT = (object, arg, headers) => {
      return this.json(object, arg, headers);
    };
    this.html = (html, arg, headers) => {
      __privateGet(this, _preparedHeaders) ?? __privateSet(this, _preparedHeaders, {});
      __privateGet(this, _preparedHeaders)["content-type"] = "text/html; charset=UTF-8";
      if (typeof html === "object") {
        if (!(html instanceof Promise)) {
          html = html.toString();
        }
        if (html instanceof Promise) {
          return html.then((html2) => resolveCallback(html2, HtmlEscapedCallbackPhase.Stringify, false, {})).then((html2) => {
            return typeof arg === "number" ? this.newResponse(html2, arg, headers) : this.newResponse(html2, arg);
          });
        }
      }
      return typeof arg === "number" ? this.newResponse(html, arg, headers) : this.newResponse(html, arg);
    };
    this.redirect = (location, status = 302) => {
      __privateGet(this, _headers) ?? __privateSet(this, _headers, new Headers());
      __privateGet(this, _headers).set("Location", location);
      return this.newResponse(null, status);
    };
    this.streamText = (cb, arg, headers) => {
      headers ?? (headers = {});
      this.header("content-type", TEXT_PLAIN);
      this.header("x-content-type-options", "nosniff");
      this.header("transfer-encoding", "chunked");
      return this.stream(cb, arg, headers);
    };
    this.stream = (cb, arg, headers) => {
      const { readable, writable } = new TransformStream();
      const stream = new StreamingApi(writable, readable);
      cb(stream).finally(() => stream.close());
      return typeof arg === "number" ? this.newResponse(stream.responseReadable, arg, headers) : this.newResponse(stream.responseReadable, arg);
    };
    this.cookie = (name, value, opt) => {
      const cookie = serialize(name, value, opt);
      this.header("set-cookie", cookie, { append: true });
    };
    this.notFound = () => {
      return this.notFoundHandler(this);
    };
    this.req = req;
    if (options) {
      __privateSet(this, _executionCtx, options.executionCtx);
      this.env = options.env;
      if (options.notFoundHandler) {
        this.notFoundHandler = options.notFoundHandler;
      }
    }
  }
  get event() {
    if (__privateGet(this, _executionCtx) && "respondWith" in __privateGet(this, _executionCtx)) {
      return __privateGet(this, _executionCtx);
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  get executionCtx() {
    if (__privateGet(this, _executionCtx)) {
      return __privateGet(this, _executionCtx);
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  get res() {
    __privateSet(this, _isFresh, false);
    return __privateGet(this, _res) || __privateSet(this, _res, new Response("404 Not Found", { status: 404 }));
  }
  set res(_res2) {
    __privateSet(this, _isFresh, false);
    if (__privateGet(this, _res) && _res2) {
      __privateGet(this, _res).headers.delete("content-type");
      for (const [k, v] of __privateGet(this, _res).headers.entries()) {
        if (k === "set-cookie") {
          const cookies = __privateGet(this, _res).headers.getSetCookie();
          _res2.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res2.headers.append("set-cookie", cookie);
          }
        } else {
          _res2.headers.set(k, v);
        }
      }
    }
    __privateSet(this, _res, _res2);
    this.finalized = true;
  }
  get var() {
    return { ...this._var };
  }
  get runtime() {
    const global = globalThis;
    if (global?.Deno !== void 0) {
      return "deno";
    }
    if (global?.Bun !== void 0) {
      return "bun";
    }
    if (typeof global?.WebSocketPair === "function") {
      return "workerd";
    }
    if (typeof global?.EdgeRuntime === "string") {
      return "edge-light";
    }
    if (global?.fastly !== void 0) {
      return "fastly";
    }
    if (global?.__lagon__ !== void 0) {
      return "lagon";
    }
    if (global?.process?.release?.name === "node") {
      return "node";
    }
    return "other";
  }
};
_status = /* @__PURE__ */ new WeakMap();
_executionCtx = /* @__PURE__ */ new WeakMap();
_headers = /* @__PURE__ */ new WeakMap();
_preparedHeaders = /* @__PURE__ */ new WeakMap();
_res = /* @__PURE__ */ new WeakMap();
_isFresh = /* @__PURE__ */ new WeakMap();

// node_modules/hono/dist/compose.js
var compose = (middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        if (context instanceof Context) {
          context.req.routeIndex = i;
        }
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (!handler) {
        if (context instanceof Context && context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      } else {
        try {
          res = await handler(context, () => {
            return dispatch(i + 1);
          });
        } catch (err) {
          if (err instanceof Error && context instanceof Context && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
  };
};

// node_modules/hono/dist/http-exception.js
var HTTPException = class extends Error {
  constructor(status = 500, options) {
    super(options?.message);
    this.res = options?.res;
    this.status = status;
  }
  getResponse() {
    if (this.res) {
      return this.res;
    }
    return new Response(this.message, {
      status: this.status
    });
  }
};

// node_modules/hono/dist/utils/body.js
var parseBody = async (request, options = { all: false }) => {
  const contentType = request.headers.get("Content-Type");
  if (isFormDataContent(contentType)) {
    return parseFormData(request, options);
  }
  return {};
};
function isFormDataContent(contentType) {
  if (contentType === null) {
    return false;
  }
  return contentType.startsWith("multipart/form-data") || contentType.startsWith("application/x-www-form-urlencoded");
}
async function parseFormData(request, options) {
  const formData = await request.formData();
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
function convertFormDataToBodyData(formData, options) {
  const form = {};
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  return form;
}
var handleParsingAllValues = (form, key, value) => {
  if (form[key] && isArrayField(form[key])) {
    appendToExistingArray(form[key], value);
  } else if (form[key]) {
    convertToNewArray(form, key, value);
  } else {
    form[key] = value;
  }
};
function isArrayField(field) {
  return Array.isArray(field);
}
var appendToExistingArray = (arr, value) => {
  arr.push(value);
};
var convertToNewArray = (form, key, value) => {
  form[key] = [form[key], value];
};

// node_modules/hono/dist/request.js
var __accessCheck2 = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet2 = (obj, member, getter) => {
  __accessCheck2(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd2 = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet2 = (obj, member, value, setter) => {
  __accessCheck2(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};
var _validatedData;
var _matchResult;
var HonoRequest = class {
  constructor(request, path = "/", matchResult = [[]]) {
    __privateAdd2(this, _validatedData, void 0);
    __privateAdd2(this, _matchResult, void 0);
    this.routeIndex = 0;
    this.bodyCache = {};
    this.cachedBody = (key) => {
      const { bodyCache, raw: raw2 } = this;
      const cachedBody = bodyCache[key];
      if (cachedBody) {
        return cachedBody;
      }
      if (bodyCache.arrayBuffer) {
        return (async () => {
          return await new Response(bodyCache.arrayBuffer)[key]();
        })();
      }
      return bodyCache[key] = raw2[key]();
    };
    this.raw = request;
    this.path = path;
    __privateSet2(this, _matchResult, matchResult);
    __privateSet2(this, _validatedData, {});
  }
  param(key) {
    return key ? this.getDecodedParam(key) : this.getAllDecodedParams();
  }
  getDecodedParam(key) {
    const paramKey = __privateGet2(this, _matchResult)[0][this.routeIndex][1][key];
    const param = this.getParamValue(paramKey);
    return param ? /\%/.test(param) ? decodeURIComponent_(param) : param : void 0;
  }
  getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(__privateGet2(this, _matchResult)[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.getParamValue(__privateGet2(this, _matchResult)[0][this.routeIndex][1][key]);
      if (value && typeof value === "string") {
        decoded[key] = /\%/.test(value) ? decodeURIComponent_(value) : value;
      }
    }
    return decoded;
  }
  getParamValue(paramKey) {
    return __privateGet2(this, _matchResult)[1] ? __privateGet2(this, _matchResult)[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name.toLowerCase()) ?? void 0;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  cookie(key) {
    const cookie = this.raw.headers.get("Cookie");
    if (!cookie) {
      return;
    }
    const obj = parse(cookie);
    if (key) {
      const value = obj[key];
      return value;
    } else {
      return obj;
    }
  }
  async parseBody(options) {
    if (this.bodyCache.parsedBody) {
      return this.bodyCache.parsedBody;
    }
    const parsedBody = await parseBody(this, options);
    this.bodyCache.parsedBody = parsedBody;
    return parsedBody;
  }
  json() {
    return this.cachedBody("json");
  }
  text() {
    return this.cachedBody("text");
  }
  arrayBuffer() {
    return this.cachedBody("arrayBuffer");
  }
  blob() {
    return this.cachedBody("blob");
  }
  formData() {
    return this.cachedBody("formData");
  }
  addValidatedData(target, data) {
    __privateGet2(this, _validatedData)[target] = data;
  }
  valid(target) {
    return __privateGet2(this, _validatedData)[target];
  }
  get url() {
    return this.raw.url;
  }
  get method() {
    return this.raw.method;
  }
  get matchedRoutes() {
    return __privateGet2(this, _matchResult)[0].map(([[, route]]) => route);
  }
  get routePath() {
    return __privateGet2(this, _matchResult)[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
  get headers() {
    return this.raw.headers;
  }
  get body() {
    return this.raw.body;
  }
  get bodyUsed() {
    return this.raw.bodyUsed;
  }
  get integrity() {
    return this.raw.integrity;
  }
  get keepalive() {
    return this.raw.keepalive;
  }
  get referrer() {
    return this.raw.referrer;
  }
  get signal() {
    return this.raw.signal;
  }
};
_validatedData = /* @__PURE__ */ new WeakMap();
_matchResult = /* @__PURE__ */ new WeakMap();

// node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
};

// node_modules/hono/dist/hono-base.js
var __accessCheck3 = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet3 = (obj, member, getter) => {
  __accessCheck3(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd3 = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet3 = (obj, member, value, setter) => {
  __accessCheck3(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};
var COMPOSED_HANDLER = Symbol("composedHandler");
function defineDynamicClass() {
  return class {
  };
}
var notFoundHandler = (c) => {
  return c.text("404 Not Found", 404);
};
var errorHandler = (err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  console.error(err);
  const message = "Internal Server Error";
  return c.text(message, 500);
};
var _path;
var _Hono = class extends defineDynamicClass() {
  constructor(options = {}) {
    super();
    this._basePath = "/";
    __privateAdd3(this, _path, "/");
    this.routes = [];
    this.notFoundHandler = notFoundHandler;
    this.errorHandler = errorHandler;
    this.onError = (handler) => {
      this.errorHandler = handler;
      return this;
    };
    this.notFound = (handler) => {
      this.notFoundHandler = handler;
      return this;
    };
    this.head = () => {
      console.warn("`app.head()` is no longer used. `app.get()` implicitly handles the HEAD method.");
      return this;
    };
    this.handleEvent = (event) => {
      return this.dispatch(event.request, event, void 0, event.request.method);
    };
    this.fetch = (request, Env, executionCtx) => {
      return this.dispatch(request, executionCtx, Env, request.method);
    };
    this.request = (input, requestInit, Env, executionCtx) => {
      if (input instanceof Request) {
        if (requestInit !== void 0) {
          input = new Request(input, requestInit);
        }
        return this.fetch(input, Env, executionCtx);
      }
      input = input.toString();
      const path = /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`;
      const req = new Request(path, requestInit);
      return this.fetch(req, Env, executionCtx);
    };
    this.fire = () => {
      addEventListener("fetch", (event) => {
        event.respondWith(this.dispatch(event.request, event, void 0, event.request.method));
      });
    };
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.map((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          __privateSet3(this, _path, args1);
        } else {
          this.addRoute(method, __privateGet3(this, _path), args1);
        }
        args.map((handler) => {
          if (typeof handler !== "string") {
            this.addRoute(method, __privateGet3(this, _path), handler);
          }
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      if (!method) {
        return this;
      }
      __privateSet3(this, _path, path);
      for (const m of [method].flat()) {
        handlers.map((handler) => {
          this.addRoute(m.toUpperCase(), __privateGet3(this, _path), handler);
        });
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        __privateSet3(this, _path, arg1);
      } else {
        handlers.unshift(arg1);
      }
      handlers.map((handler) => {
        this.addRoute(METHOD_NAME_ALL, __privateGet3(this, _path), handler);
      });
      return this;
    };
    const strict = options.strict ?? true;
    delete options.strict;
    Object.assign(this, options);
    this.getPath = strict ? options.getPath ?? getPath : getPathNoStrict;
  }
  clone() {
    const clone = new _Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.routes = this.routes;
    return clone;
  }
  route(path, app2) {
    const subApp = this.basePath(path);
    if (!app2) {
      return subApp;
    }
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res;
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.addRoute(r.method, r.path, handler);
    });
    return this;
  }
  basePath(path) {
    const subApp = this.clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  showRoutes() {
    const length = 8;
    this.routes.map((route) => {
      console.log(
        `\x1B[32m${route.method}\x1B[0m ${" ".repeat(length - route.method.length)} ${route.path}`
      );
    });
  }
  mount(path, applicationHandler, optionHandler) {
    const mergedPath = mergePath(this._basePath, path);
    const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
    const handler = async (c, next) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      const options = optionHandler ? optionHandler(c) : [c.env, executionContext];
      const optionsArray = Array.isArray(options) ? options : [options];
      const queryStrings = getQueryStrings(c.req.url);
      const res = await applicationHandler(
        new Request(
          new URL((c.req.path.slice(pathPrefixLength) || "/") + queryStrings, c.req.url),
          c.req.raw
        ),
        ...optionsArray
      );
      if (res) {
        return res;
      }
      await next();
    };
    this.addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  get routerName() {
    this.matchRoute("GET", "/");
    return this.router.name;
  }
  addRoute(method, path, handler) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = { path, method, handler };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  matchRoute(method, path) {
    return this.router.match(method, path);
  }
  handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.dispatch(request, executionCtx, env, "GET")))();
    }
    const path = this.getPath(request, { env });
    const matchResult = this.matchRoute(method, path);
    const c = new Context(new HonoRequest(request, path, matchResult), {
      env,
      executionCtx,
      notFoundHandler: this.notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.notFoundHandler(c);
        });
      } catch (err) {
        return this.handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.notFoundHandler(c))
      ).catch((err) => this.handleError(err, c)) : res;
    }
    const composed = compose(matchResult[0], this.errorHandler, this.notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. You may forget returning Response object or `await next()`"
          );
        }
        return context.res;
      } catch (err) {
        return this.handleError(err, c);
      }
    })();
  }
};
var Hono = _Hono;
_path = /* @__PURE__ */ new WeakMap();

// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = Symbol();
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
var Node = class {
  constructor() {
    this.children = {};
  }
  insert(tokens, index, paramMap, context, pathErrorCheckOnly) {
    if (tokens.length === 0) {
      if (this.index !== void 0) {
        throw PATH_ERROR;
      }
      if (pathErrorCheckOnly) {
        return;
      }
      this.index = index;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name = pattern[1];
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      if (name && pattern[2]) {
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
        if (/\((?!\?:)/.test(regexpStr)) {
          throw PATH_ERROR;
        }
      }
      node = this.children[regexpStr];
      if (!node) {
        if (Object.keys(this.children).some(
          (k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.children[regexpStr] = new Node();
        if (name !== "") {
          node.varIndex = context.varIndex++;
        }
      }
      if (!pathErrorCheckOnly && name !== "") {
        paramMap.push([name, node.varIndex]);
      }
    } else {
      node = this.children[token];
      if (!node) {
        if (Object.keys(this.children).some(
          (k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.children[token] = new Node();
      }
    }
    node.insert(restTokens, index, paramMap, context, pathErrorCheckOnly);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.children[k];
      return (typeof c.varIndex === "number" ? `(${k})@${c.varIndex}` : k) + c.buildRegExpStr();
    });
    if (typeof this.index === "number") {
      strList.unshift(`#${this.index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  constructor() {
    this.context = { varIndex: 0 };
    this.root = new Node();
  }
  insert(path, index, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [];
    for (let i = 0; ; ) {
      let replaced = false;
      path = path.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.root.insert(tokens, index, paramAssoc, this.context, pathErrorCheckOnly);
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (typeof handlerIndex !== "undefined") {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (typeof paramIndex !== "undefined") {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
var methodNames = [METHOD_NAME_ALL, ...METHODS].map((method) => method.toUpperCase());
var emptyParam = [];
var nullMatcher = [/^$/, [], {}];
var wildcardRegExpCache = {};
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ?? (wildcardRegExpCache[path] = new RegExp(
    path === "*" ? "" : `^${path.replace(/\/\*/, "(?:|/.*)")}$`
  ));
}
function clearWildcardRegExpCache() {
  wildcardRegExpCache = {};
}
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie();
  const handlerData = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes.map(
    (route) => [!/\*|\/:/.test(route[0]), ...route]
  ).sort(
    ([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
  );
  const staticMap = {};
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path] = [handlers.map(([h]) => [h, {}]), emptyParam];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = {};
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length; i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length; k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
var RegExpRouter = class {
  constructor() {
    this.name = "RegExpRouter";
    this.middleware = { [METHOD_NAME_ALL]: {} };
    this.routes = { [METHOD_NAME_ALL]: {} };
  }
  add(method, path, handler) {
    var _a;
    const { middleware, routes } = this;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (methodNames.indexOf(method) === -1) {
      methodNames.push(method);
    }
    if (!middleware[method]) {
      ;
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = {};
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    const paramCount = (path.match(/\/:/g) || []).length;
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach((m) => {
          var _a2;
          (_a2 = middleware[m])[path] || (_a2[path] = findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || []);
        });
      } else {
        (_a = middleware[method])[path] || (_a[path] = findMiddleware(middleware[method], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || []);
      }
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach(
            (p) => re.test(p) && routes[m][p].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path2 = paths[i];
      Object.keys(routes).forEach((m) => {
        var _a2;
        if (method === METHOD_NAME_ALL || method === m) {
          (_a2 = routes[m])[path2] || (_a2[path2] = [
            ...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
          ]);
          routes[m][path2].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match(method, path) {
    clearWildcardRegExpCache();
    const matchers = this.buildAllMatchers();
    this.match = (method2, path2) => {
      const matcher = matchers[method2];
      const staticMatch = matcher[2][path2];
      if (staticMatch) {
        return staticMatch;
      }
      const match = path2.match(matcher[0]);
      if (!match) {
        return [[], emptyParam];
      }
      const index = match.indexOf("", 1);
      return [matcher[1][index], match];
    };
    return this.match(method, path);
  }
  buildAllMatchers() {
    const matchers = {};
    methodNames.forEach((method) => {
      matchers[method] = this.buildMatcher(method) || matchers[METHOD_NAME_ALL];
    });
    this.middleware = this.routes = void 0;
    return matchers;
  }
  buildMatcher(method) {
    const routes = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.middleware, this.routes].forEach((r) => {
      const ownRoute = r[method] ? Object.keys(r[method]).map((path) => [path, r[method][path]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute || (hasOwnRoute = true);
        routes.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(
          ...Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]])
        );
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes);
    }
  }
};

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  constructor(init) {
    this.name = "SmartRouter";
    this.routers = [];
    this.routes = [];
    Object.assign(this, init);
  }
  add(method, path, handler) {
    if (!this.routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.routes) {
      throw new Error("Fatal error");
    }
    const { routers, routes } = this;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router12 = routers[i];
      try {
        routes.forEach((args) => {
          router12.add(...args);
        });
        res = router12.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router12.match.bind(router12);
      this.routers = [router12];
      this.routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.routes || this.routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/node.js
var Node2 = class {
  constructor(method, handler, children) {
    this.order = 0;
    this.params = {};
    this.children = children || {};
    this.methods = [];
    this.name = "";
    if (method && handler) {
      const m = {};
      m[method] = { handler, possibleKeys: [], score: 0, name: this.name };
      this.methods = [m];
    }
    this.patterns = [];
  }
  insert(method, path, handler) {
    this.name = `${method} ${path}`;
    this.order = ++this.order;
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = [];
    const parentPatterns = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const p = parts[i];
      if (Object.keys(curNode.children).includes(p)) {
        parentPatterns.push(...curNode.patterns);
        curNode = curNode.children[p];
        const pattern2 = getPattern(p);
        if (pattern2) {
          possibleKeys.push(pattern2[1]);
        }
        continue;
      }
      curNode.children[p] = new Node2();
      const pattern = getPattern(p);
      if (pattern) {
        curNode.patterns.push(pattern);
        parentPatterns.push(...curNode.patterns);
        possibleKeys.push(pattern[1]);
      }
      parentPatterns.push(...curNode.patterns);
      curNode = curNode.children[p];
    }
    if (!curNode.methods.length) {
      curNode.methods = [];
    }
    const m = {};
    const handlerSet = {
      handler,
      possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
      name: this.name,
      score: this.order
    };
    m[method] = handlerSet;
    curNode.methods.push(m);
    return curNode;
  }
  gHSets(node, method, nodeParams, params) {
    const handlerSets = [];
    for (let i = 0, len = node.methods.length; i < len; i++) {
      const m = node.methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      const processedSet = {};
      if (handlerSet !== void 0) {
        handlerSet.params = {};
        handlerSet.possibleKeys.forEach((key) => {
          const processed = processedSet[handlerSet.name];
          handlerSet.params[key] = params[key] && !processed ? params[key] : nodeParams[key] ?? params[key];
          processedSet[handlerSet.name] = true;
        });
        handlerSets.push(handlerSet);
      }
    }
    return handlerSets;
  }
  search(method, path) {
    const handlerSets = [];
    this.params = {};
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    for (let i = 0, len = parts.length; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.children[part];
        if (nextNode) {
          nextNode.params = node.params;
          if (isLast === true) {
            if (nextNode.children["*"]) {
              handlerSets.push(...this.gHSets(nextNode.children["*"], method, node.params, {}));
            }
            handlerSets.push(...this.gHSets(nextNode, method, node.params, {}));
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k = 0, len3 = node.patterns.length; k < len3; k++) {
          const pattern = node.patterns[k];
          const params = { ...node.params };
          if (pattern === "*") {
            const astNode = node.children["*"];
            if (astNode) {
              handlerSets.push(...this.gHSets(astNode, method, node.params, {}));
              tempNodes.push(astNode);
            }
            continue;
          }
          if (part === "") {
            continue;
          }
          const [key, name, matcher] = pattern;
          const child = node.children[key];
          const restPathString = parts.slice(i).join("/");
          if (matcher instanceof RegExp && matcher.test(restPathString)) {
            params[name] = restPathString;
            handlerSets.push(...this.gHSets(child, method, node.params, params));
            continue;
          }
          if (matcher === true || matcher instanceof RegExp && matcher.test(part)) {
            if (typeof key === "string") {
              params[name] = part;
              if (isLast === true) {
                handlerSets.push(...this.gHSets(child, method, params, node.params));
                if (child.children["*"]) {
                  handlerSets.push(...this.gHSets(child.children["*"], method, params, node.params));
                }
              } else {
                child.params = params;
                tempNodes.push(child);
              }
            }
          }
        }
      }
      curNodes = tempNodes;
    }
    const results = handlerSets.sort((a, b) => {
      return a.score - b.score;
    });
    return [results.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  constructor() {
    this.name = "TrieRouter";
    this.node = new Node2();
  }
  add(method, path, handler) {
    const results = checkOptionalParameter(path);
    if (results) {
      for (const p of results) {
        this.node.insert(method, p, handler);
      }
      return;
    }
    this.node.insert(method, path, handler);
  }
  match(method, path) {
    return this.node.search(method, path);
  }
};

// node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};

// node_modules/hono/dist/middleware/cors/index.js
var cors = (options) => {
  const defaults = {
    origin: "*",
    allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"],
    allowHeaders: [],
    exposeHeaders: []
  };
  const opts = {
    ...defaults,
    ...options
  };
  const findAllowOrigin = ((optsOrigin) => {
    if (typeof optsOrigin === "string") {
      return () => optsOrigin;
    } else if (typeof optsOrigin === "function") {
      return optsOrigin;
    } else {
      return (origin) => optsOrigin.includes(origin) ? origin : optsOrigin[0];
    }
  })(opts.origin);
  return async function cors2(c, next) {
    function set(key, value) {
      c.res.headers.set(key, value);
    }
    const allowOrigin = findAllowOrigin(c.req.header("origin") || "");
    if (allowOrigin) {
      set("Access-Control-Allow-Origin", allowOrigin);
    }
    if (opts.origin !== "*") {
      set("Vary", "Origin");
    }
    if (opts.credentials) {
      set("Access-Control-Allow-Credentials", "true");
    }
    if (opts.exposeHeaders?.length) {
      set("Access-Control-Expose-Headers", opts.exposeHeaders.join(","));
    }
    if (c.req.method === "OPTIONS") {
      if (opts.maxAge != null) {
        set("Access-Control-Max-Age", opts.maxAge.toString());
      }
      if (opts.allowMethods?.length) {
        set("Access-Control-Allow-Methods", opts.allowMethods.join(","));
      }
      let headers = opts.allowHeaders;
      if (!headers?.length) {
        const requestHeaders = c.req.header("Access-Control-Request-Headers");
        if (requestHeaders) {
          headers = requestHeaders.split(/\s*,\s*/);
        }
      }
      if (headers?.length) {
        set("Access-Control-Allow-Headers", headers.join(","));
        c.res.headers.append("Vary", "Access-Control-Request-Headers");
      }
      c.res.headers.delete("Content-Length");
      c.res.headers.delete("Content-Type");
      return new Response(null, {
        headers: c.res.headers,
        status: 204,
        statusText: c.res.statusText
      });
    }
    await next();
  };
};

// node_modules/hono/dist/middleware/logger/index.js
var humanize = (times) => {
  const [delimiter, separator] = [",", "."];
  const orderTimes = times.map((v) => v.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1" + delimiter));
  return orderTimes.join(separator);
};
var time = (start) => {
  const delta = Date.now() - start;
  return humanize([delta < 1e3 ? delta + "ms" : Math.round(delta / 1e3) + "s"]);
};
var colorStatus = (status) => {
  const out = {
    7: `\x1B[35m${status}\x1B[0m`,
    5: `\x1B[31m${status}\x1B[0m`,
    4: `\x1B[33m${status}\x1B[0m`,
    3: `\x1B[36m${status}\x1B[0m`,
    2: `\x1B[32m${status}\x1B[0m`,
    1: `\x1B[32m${status}\x1B[0m`,
    0: `\x1B[33m${status}\x1B[0m`
  };
  const calculateStatus = status / 100 | 0;
  return out[calculateStatus];
};
function log(fn, prefix, method, path, status = 0, elapsed) {
  const out = prefix === "<--" ? `  ${prefix} ${method} ${path}` : `  ${prefix} ${method} ${path} ${colorStatus(status)} ${elapsed}`;
  fn(out);
}
var logger = (fn = console.log) => {
  return async function logger2(c, next) {
    const { method } = c.req;
    const path = getPath(c.req.raw);
    log(fn, "<--", method, path);
    const start = Date.now();
    await next();
    log(fn, "-->", method, path, c.res.status, time(start));
  };
};

// node_modules/hono/dist/middleware/secure-headers/index.js
var HEADERS_MAP = {
  crossOriginEmbedderPolicy: ["Cross-Origin-Embedder-Policy", "require-corp"],
  crossOriginResourcePolicy: ["Cross-Origin-Resource-Policy", "same-origin"],
  crossOriginOpenerPolicy: ["Cross-Origin-Opener-Policy", "same-origin"],
  originAgentCluster: ["Origin-Agent-Cluster", "?1"],
  referrerPolicy: ["Referrer-Policy", "no-referrer"],
  strictTransportSecurity: ["Strict-Transport-Security", "max-age=15552000; includeSubDomains"],
  xContentTypeOptions: ["X-Content-Type-Options", "nosniff"],
  xDnsPrefetchControl: ["X-DNS-Prefetch-Control", "off"],
  xDownloadOptions: ["X-Download-Options", "noopen"],
  xFrameOptions: ["X-Frame-Options", "SAMEORIGIN"],
  xPermittedCrossDomainPolicies: ["X-Permitted-Cross-Domain-Policies", "none"],
  xXssProtection: ["X-XSS-Protection", "0"]
};
var DEFAULT_OPTIONS = {
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: true,
  crossOriginOpenerPolicy: true,
  originAgentCluster: true,
  referrerPolicy: true,
  strictTransportSecurity: true,
  xContentTypeOptions: true,
  xDnsPrefetchControl: true,
  xDownloadOptions: true,
  xFrameOptions: true,
  xPermittedCrossDomainPolicies: true,
  xXssProtection: true
};
var secureHeaders = (customOptions) => {
  const options = { ...DEFAULT_OPTIONS, ...customOptions };
  const headersToSet = getFilteredHeaders(options);
  if (options.contentSecurityPolicy) {
    headersToSet.push(["Content-Security-Policy", getCSPDirectives(options.contentSecurityPolicy)]);
  }
  if (options.reportingEndpoints) {
    headersToSet.push(["Reporting-Endpoints", getReportingEndpoints(options.reportingEndpoints)]);
  }
  if (options.reportTo) {
    headersToSet.push(["Report-To", getReportToOptions(options.reportTo)]);
  }
  return async function secureHeaders2(ctx, next) {
    await next();
    setHeaders2(ctx, headersToSet);
    ctx.res.headers.delete("X-Powered-By");
  };
};
function getFilteredHeaders(options) {
  return Object.entries(HEADERS_MAP).filter(([key]) => options[key]).map(([key, defaultValue]) => {
    const overrideValue = options[key];
    return typeof overrideValue === "string" ? [defaultValue[0], overrideValue] : defaultValue;
  });
}
function getCSPDirectives(contentSecurityPolicy) {
  return Object.entries(contentSecurityPolicy || []).map(([directive, value]) => {
    const kebabCaseDirective = directive.replace(
      /[A-Z]+(?![a-z])|[A-Z]/g,
      (match, offset) => offset ? "-" + match.toLowerCase() : match.toLowerCase()
    );
    return `${kebabCaseDirective} ${Array.isArray(value) ? value.join(" ") : value}`;
  }).join("; ");
}
function getReportingEndpoints(reportingEndpoints = []) {
  return reportingEndpoints.map((endpoint) => `${endpoint.name}="${endpoint.url}"`).join(", ");
}
function getReportToOptions(reportTo = []) {
  return reportTo.map((option) => JSON.stringify(option)).join(", ");
}
function setHeaders2(ctx, headersToSet) {
  headersToSet.forEach(([header, value]) => {
    ctx.res.headers.set(header, value);
  });
}

// database/d1.js
var D1Database = class {
  constructor(d1) {
    this.d1 = d1;
  }
  async initialize() {
    try {
      console.log("Initializing D1 database...");
      await this.createCompanyTable();
      await this.createSettingsTable();
      await this.createSupplierTable();
      await this.createCustomerTable();
      await this.createFoodInTable();
      await this.createFoodOutTable();
      await this.createLotInTable();
      await this.createLotOutTable();
      await this.createSellTable();
      await this.createPackageTable();
      await this.createGtinTable();
      await this.createCheckTable();
      await this.createCheckResultTable();
      await this.createCheckTypeTable();
      await this.createCheckCategoryTable();
      await this.createBarcodeTable();
      await this.createTraceabilityTable();
      await this.insertDefaultData();
      console.log("D1 database initialized successfully");
    } catch (error) {
      console.error("Error initializing D1 database:", error);
      throw error;
    }
  }
  async createCompanyTable() {
    await this.d1.prepare(`
      CREATE TABLE IF NOT EXISTS company (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        vat TEXT,
        address TEXT,
        city TEXT,
        country TEXT,
        phone TEXT,
        email TEXT,
        website TEXT,
        logo TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
  }
  async createSettingsTable() {
    await this.d1.prepare(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
  }
  async createSupplierTable() {
    await this.d1.prepare(`
      CREATE TABLE IF NOT EXISTS supplier (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        vat TEXT,
        address TEXT,
        city TEXT,
        country TEXT,
        phone TEXT,
        email TEXT,
        website TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
  }
  async createCustomerTable() {
    await this.d1.prepare(`
      CREATE TABLE IF NOT EXISTS customer (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        vat TEXT,
        address TEXT,
        city TEXT,
        country TEXT,
        phone TEXT,
        email TEXT,
        website TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
  }
  async createFoodInTable() {
    await this.d1.prepare(`
      CREATE TABLE IF NOT EXISTS food_in (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        supplier_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES supplier (id)
      )
    `).run();
  }
  async createFoodOutTable() {
    await this.d1.prepare(`
      CREATE TABLE IF NOT EXISTS food_out (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
  }
  async createLotInTable() {
    await this.d1.prepare(`
      CREATE TABLE IF NOT EXISTS lot_in (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lot_number TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit TEXT NOT NULL,
        supplier_id INTEGER,
        food_id INTEGER,
        production_date DATE,
        expiry_date DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES supplier (id),
        FOREIGN KEY (food_id) REFERENCES food_in (id)
      )
    `).run();
  }
  async createLotOutTable() {
    await this.d1.prepare(`
      CREATE TABLE IF NOT EXISTS lot_out (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lot_number TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit TEXT NOT NULL,
        food_id INTEGER,
        production_date DATE,
        expiry_date DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (food_id) REFERENCES food_out (id)
      )
    `).run();
  }
  async createSellTable() {
    await this.d1.prepare(`
      CREATE TABLE IF NOT EXISTS sell (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_number TEXT NOT NULL,
        invoice_date DATE NOT NULL,
        fk_lot_out INTEGER,
        fk_lot_in INTEGER,
        fk_package INTEGER,
        fk_customer INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (fk_lot_out) REFERENCES lot_out (id),
        FOREIGN KEY (fk_lot_in) REFERENCES lot_in (id),
        FOREIGN KEY (fk_package) REFERENCES package (id),
        FOREIGN KEY (fk_customer) REFERENCES customer (id)
      )
    `).run();
  }
  async createPackageTable() {
    await this.d1.prepare(`
      CREATE TABLE IF NOT EXISTS package (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        measure TEXT NOT NULL,
        more_information INTEGER DEFAULT 0,
        variable INTEGER DEFAULT 0,
        fk_gtin INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (fk_gtin) REFERENCES gtin (id)
      )
    `).run();
  }
  async createGtinTable() {
    await this.d1.prepare(`
      CREATE TABLE IF NOT EXISTS gtin (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
  }
  async createCheckTable() {
    await this.d1.prepare(`
      CREATE TABLE IF NOT EXISTS quality_check (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        frequency TEXT,
        fk_check_type INTEGER,
        fk_check_category INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (fk_check_type) REFERENCES check_type (id),
        FOREIGN KEY (fk_check_category) REFERENCES check_category (id)
      )
    `).run();
  }
  async createCheckResultTable() {
    await this.d1.prepare(`
      CREATE TABLE IF NOT EXISTS check_result (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        check_id INTEGER NOT NULL,
        result TEXT NOT NULL,
        notes TEXT,
        date DATE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (check_id) REFERENCES quality_check (id)
      )
    `).run();
  }
  async createCheckTypeTable() {
    await this.d1.prepare(`
      CREATE TABLE IF NOT EXISTS check_type (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
  }
  async createCheckCategoryTable() {
    await this.d1.prepare(`
      CREATE TABLE IF NOT EXISTS check_category (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
  }
  async createBarcodeTable() {
    await this.d1.prepare(`
      CREATE TABLE IF NOT EXISTS barcode (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL,
        description TEXT,
        fk_lot_in INTEGER,
        fk_lot_out INTEGER,
        fk_package INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (fk_lot_in) REFERENCES lot_in (id),
        FOREIGN KEY (fk_lot_out) REFERENCES lot_out (id),
        FOREIGN KEY (fk_package) REFERENCES package (id)
      )
    `).run();
  }
  async createTraceabilityTable() {
    await this.d1.prepare(`
      CREATE TABLE IF NOT EXISTS traceability (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lot_in_id INTEGER,
        lot_out_id INTEGER,
        package_id INTEGER,
        customer_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lot_in_id) REFERENCES lot_in (id),
        FOREIGN KEY (lot_out_id) REFERENCES lot_out (id),
        FOREIGN KEY (package_id) REFERENCES package (id),
        FOREIGN KEY (customer_id) REFERENCES customer (id)
      )
    `).run();
  }
  async insertDefaultData() {
    await this.d1.prepare(`
      INSERT OR IGNORE INTO company (id, name, vat, address, city, country, phone, email, website)
      VALUES (1, 'Your Company Name', 'VAT123456789', '123 Business St', 'Business City', 'Country', '+1234567890', 'info@company.com', 'https://company.com')
    `).run();
    await this.d1.prepare(`
      INSERT OR IGNORE INTO settings (key, value, description)
      VALUES 
        ('company_name', 'Your Company Name', 'Company name for reports'),
        ('company_address', '123 Business St, Business City, Country', 'Company address for reports'),
        ('system_version', '1.0.0', 'System version number')
    `).run();
    await this.d1.prepare(`
      INSERT OR IGNORE INTO check_type (id, name, description)
      VALUES 
        (1, 'Visual', 'Visual inspection checks'),
        (2, 'Temperature', 'Temperature monitoring checks'),
        (3, 'Chemical', 'Chemical analysis checks'),
        (4, 'Microbiological', 'Microbiological testing checks')
    `).run();
    await this.d1.prepare(`
      INSERT OR IGNORE INTO check_category (id, name, description)
      VALUES 
        (1, 'Receiving', 'Checks performed when receiving goods'),
        (2, 'Storage', 'Checks performed during storage'),
        (3, 'Processing', 'Checks performed during processing'),
        (4, 'Shipping', 'Checks performed before shipping')
    `).run();
  }
  async runQuery(sql, params = []) {
    try {
      const stmt = this.d1.prepare(sql);
      const result = await stmt.bind(...params).run();
      return {
        id: result.meta?.last_row_id,
        changes: result.meta?.changes || 0,
        meta: result.meta
      };
    } catch (error) {
      console.error("Error running query:", error);
      throw error;
    }
  }
  async getRow(sql, params = []) {
    try {
      const stmt = this.d1.prepare(sql);
      const result = await stmt.bind(...params).first();
      return result;
    } catch (error) {
      console.error("Error getting row:", error);
      throw error;
    }
  }
  async getAll(sql, params = []) {
    try {
      const stmt = this.d1.prepare(sql);
      const result = await stmt.bind(...params).all();
      return result.results;
    } catch (error) {
      console.error("Error getting all rows:", error);
      throw error;
    }
  }
  getDb() {
    return this.d1;
  }
};
var d1_default = D1Database;

// routes/suppliers.js
var router = new Hono2();
router.get("/", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const suppliers = await database.getAll("SELECT * FROM supplier ORDER BY name");
    return c.json(suppliers);
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    return c.json({ error: "Failed to fetch suppliers" }, 500);
  }
});
router.get("/:id", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const supplier = await database.getRow("SELECT * FROM supplier WHERE id = ?", [c.req.param("id")]);
    if (!supplier) {
      return c.json({ error: "Supplier not found" }, 404);
    }
    return c.json(supplier);
  } catch (error) {
    console.error("Error fetching supplier:", error);
    return c.json({ error: "Failed to fetch supplier" }, 500);
  }
});
router.post("/", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const body = await c.req.json();
    const { vat, name, address, city, country, phone, email, website } = body;
    if (!vat || !name) {
      return c.json({ error: "VAT and name are required" }, 400);
    }
    const existingSupplier = await database.getRow("SELECT id FROM supplier WHERE vat = ?", [vat]);
    if (existingSupplier) {
      return c.json({ error: "Supplier with this VAT already exists" }, 400);
    }
    const result = await database.runQuery(
      "INSERT INTO supplier (vat, name, address, city, country, phone, email, website) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [vat, name, address || null, city || null, country || null, phone || null, email || null, website || null]
    );
    if (!result || !result.id) {
      const newSupplier2 = await database.getRow(
        "SELECT * FROM supplier WHERE vat = ? AND name = ? ORDER BY created_at DESC LIMIT 1",
        [vat, name]
      );
      if (newSupplier2) {
        return c.json(newSupplier2, 201);
      } else {
        return c.json({
          message: "Supplier created successfully but could not retrieve details",
          success: true
        }, 201);
      }
    }
    const newSupplier = await database.getRow("SELECT * FROM supplier WHERE id = ?", [result.id]);
    return c.json(newSupplier, 201);
  } catch (error) {
    console.error("Error creating supplier:", error);
    return c.json({ error: "Failed to create supplier" }, 500);
  }
});
router.put("/:id", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const body = await c.req.json();
    const { vat, name, address, city, country, phone, email, website } = body;
    const supplierId = c.req.param("id");
    if (!vat || !name) {
      return c.json({ error: "VAT and name are required" }, 400);
    }
    const existingSupplier = await database.getRow("SELECT id FROM supplier WHERE id = ?", [supplierId]);
    if (!existingSupplier) {
      return c.json({ error: "Supplier not found" }, 404);
    }
    const duplicateVat = await database.getRow("SELECT id FROM supplier WHERE vat = ? AND id != ?", [vat, supplierId]);
    if (duplicateVat) {
      return c.json({ error: "Supplier with this VAT already exists" }, 400);
    }
    await database.runQuery(
      "UPDATE supplier SET vat = ?, name = ?, address = ?, city = ?, country = ?, phone = ?, email = ?, website = ? WHERE id = ?",
      [vat, name, address || null, city || null, country || null, phone || null, email || null, website || null, supplierId]
    );
    const updatedSupplier = await database.getRow("SELECT * FROM supplier WHERE id = ?", [supplierId]);
    return c.json(updatedSupplier);
  } catch (error) {
    console.error("Error updating supplier:", error);
    return c.json({ error: "Failed to update supplier" }, 500);
  }
});
router.delete("/:id", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const supplierId = c.req.param("id");
    const existingSupplier = await database.getRow("SELECT id FROM supplier WHERE id = ?", [supplierId]);
    if (!existingSupplier) {
      return c.json({ error: "Supplier not found" }, 404);
    }
    const referencedInLots = await database.getRow("SELECT id FROM lot_in WHERE supplier_id = ? LIMIT 1", [supplierId]);
    if (referencedInLots) {
      return c.json({ error: "Cannot delete supplier: referenced in incoming lots" }, 400);
    }
    await database.runQuery("DELETE FROM supplier WHERE id = ?", [supplierId]);
    return c.json({ message: "Supplier deleted successfully" });
  } catch (error) {
    console.error("Error deleting supplier:", error);
    return c.json({ error: "Failed to delete supplier" }, 500);
  }
});
router.get("/stats/summary", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const totalSuppliersResult = await database.getRow("SELECT COUNT(*) as count FROM supplier");
    const totalSuppliers = totalSuppliersResult.count || 0;
    const suppliersWithLotsResult = await database.getRow("SELECT COUNT(DISTINCT supplier_id) as count FROM lot_in WHERE supplier_id IS NOT NULL");
    const suppliersWithLots = suppliersWithLotsResult.count || 0;
    return c.json({
      totalSuppliers,
      suppliersWithLots,
      suppliersWithoutLots: totalSuppliers - suppliersWithLots
    });
  } catch (error) {
    console.error("Error fetching supplier stats:", error);
    return c.json({ error: "Failed to fetch supplier statistics" }, 500);
  }
});
var suppliers_default = router;

// routes/customers.js
var router2 = new Hono2();
router2.get("/", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const customers = await database.getAll("SELECT * FROM customer ORDER BY name");
    return c.json(customers);
  } catch (error) {
    console.error("Error fetching customers:", error);
    return c.json({ error: "Failed to fetch customers" }, 500);
  }
});
router2.get("/:id", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const customer = await database.getRow("SELECT * FROM customer WHERE id = ?", [c.req.param("id")]);
    if (!customer) {
      return c.json({ error: "Customer not found" }, 404);
    }
    return c.json(customer);
  } catch (error) {
    console.error("Error fetching customer:", error);
    return c.json({ error: "Failed to fetch customer" }, 500);
  }
});
router2.post("/", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const body = await c.req.json();
    const { name, vat, address, city, country, phone, email, website } = body;
    if (!name) {
      return c.json({ error: "Name is required" }, 400);
    }
    if (vat) {
      const existingCustomer = await database.getRow("SELECT id FROM customer WHERE vat = ?", [vat]);
      if (existingCustomer) {
        return c.json({ error: "Customer with this VAT already exists" }, 400);
      }
    }
    const result = await database.runQuery(
      "INSERT INTO customer (name, vat, address, city, country, phone, email, website) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [name, vat || null, address || null, city || null, country || null, phone || null, email || null, website || null]
    );
    if (!result || !result.id) {
      const newCustomer2 = await database.getRow(
        "SELECT * FROM customer WHERE name = ? AND vat = ? ORDER BY created_at DESC LIMIT 1",
        [name, vat || null]
      );
      if (newCustomer2) {
        return c.json(newCustomer2, 201);
      } else {
        return c.json({
          message: "Customer created successfully but could not retrieve details",
          success: true
        }, 201);
      }
    }
    const newCustomer = await database.getRow("SELECT * FROM customer WHERE id = ?", [result.id]);
    return c.json(newCustomer, 201);
  } catch (error) {
    console.error("Error creating customer:", error);
    return c.json({ error: "Failed to create customer" }, 500);
  }
});
router2.put("/:id", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const body = await c.req.json();
    const { name, vat, address, city, country, phone, email, website } = body;
    const customerId = c.req.param("id");
    if (!name) {
      return c.json({ error: "Name is required" }, 400);
    }
    const existingCustomer = await database.getRow("SELECT id FROM customer WHERE id = ?", [customerId]);
    if (!existingCustomer) {
      return c.json({ error: "Customer not found" }, 404);
    }
    if (vat) {
      const duplicateVat = await database.getRow("SELECT id FROM customer WHERE vat = ? AND id != ?", [vat, customerId]);
      if (duplicateVat) {
        return c.json({ error: "Customer with this VAT already exists" }, 400);
      }
    }
    await database.runQuery(
      "UPDATE customer SET name = ?, vat = ?, address = ?, city = ?, country = ?, phone = ?, email = ?, website = ? WHERE id = ?",
      [name, vat || null, address || null, city || null, country || null, phone || null, email || null, website || null, customerId]
    );
    const updatedCustomer = await database.getRow("SELECT * FROM customer WHERE id = ?", [customerId]);
    return c.json(updatedCustomer);
  } catch (error) {
    console.error("Error updating customer:", error);
    return c.json({ error: "Failed to update customer" }, 500);
  }
});
router2.delete("/:id", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const customerId = c.req.param("id");
    const existingCustomer = await database.getRow("SELECT id FROM customer WHERE id = ?", [customerId]);
    if (!existingCustomer) {
      return c.json({ error: "Customer not found" }, 404);
    }
    const referencedInSales = await database.getRow("SELECT id FROM sell WHERE fk_customer = ? LIMIT 1", [customerId]);
    if (referencedInSales) {
      return c.json({ error: "Cannot delete customer: referenced in sales" }, 400);
    }
    await database.runQuery("DELETE FROM customer WHERE id = ?", [customerId]);
    return c.json({ message: "Customer deleted successfully" });
  } catch (error) {
    console.error("Error deleting customer:", error);
    return c.json({ error: "Failed to delete customer" }, 500);
  }
});
router2.get("/stats/summary", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const totalCustomersResult = await database.getRow("SELECT COUNT(*) as count FROM customer");
    const totalCustomers = totalCustomersResult.count || 0;
    const customersWithSalesResult = await database.getRow("SELECT COUNT(DISTINCT fk_customer) as count FROM sell WHERE fk_customer IS NOT NULL");
    const customersWithSales = customersWithSalesResult.count || 0;
    return c.json({
      totalCustomers,
      customersWithSales,
      customersWithoutSales: totalCustomers - customersWithSales
    });
  } catch (error) {
    console.error("Error fetching customer stats:", error);
    return c.json({ error: "Failed to fetch customer statistics" }, 500);
  }
});
var customers_default = router2;

// routes/lots-in.js
var router3 = new Hono2();
router3.get("/", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const lots = await database.getAll(`
      SELECT 
        li.*,
        fi.name as food_name,
        fi.description as food_description,
        fi.category as food_category,
        s.name as supplier_name,
        s.vat as supplier_vat,
        s.city as supplier_city,
        s.country as supplier_country
      FROM lot_in li
      LEFT JOIN food_in fi ON li.food_id = fi.id
      LEFT JOIN supplier s ON li.supplier_id = s.id
      ORDER BY li.created_at DESC
    `);
    return c.json(lots);
  } catch (error) {
    console.error("Error fetching incoming lots:", error);
    return c.json({ error: "Failed to fetch incoming lots" }, 500);
  }
});
router3.get("/:id", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const lot = await database.getRow(`
      SELECT 
        li.*,
        fi.name as food_name,
        fi.description as food_description,
        fi.category as food_category,
        s.name as supplier_name,
        s.vat as supplier_vat,
        s.city as supplier_city,
        s.country as supplier_country
      FROM lot_in li
      LEFT JOIN food_in fi ON li.food_id = fi.id
      LEFT JOIN supplier s ON li.supplier_id = s.id
      WHERE li.id = ?
    `, [c.req.param("id")]);
    if (!lot) {
      return c.json({ error: "Lot not found" }, 404);
    }
    return c.json(lot);
  } catch (error) {
    console.error("Error fetching lot:", error);
    return c.json({ error: "Failed to fetch lot" }, 500);
  }
});
router3.post("/", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const body = await c.req.json();
    const {
      lot_number,
      quantity,
      unit,
      supplier_id,
      food_id,
      production_date,
      expiry_date
    } = body;
    if (!lot_number || !quantity || !unit || !supplier_id || !food_id) {
      return c.json({ error: "Lot number, quantity, unit, supplier, and food are required" }, 400);
    }
    const existingLot = await database.getRow("SELECT id FROM lot_in WHERE lot_number = ?", [lot_number]);
    if (existingLot) {
      return c.json({ error: "Lot number already exists" }, 400);
    }
    const food = await database.getRow("SELECT id FROM food_in WHERE id = ?", [food_id]);
    if (!food) {
      return c.json({ error: "Food not found" }, 400);
    }
    const supplier = await database.getRow("SELECT id FROM supplier WHERE id = ?", [supplier_id]);
    if (!supplier) {
      return c.json({ error: "Supplier not found" }, 400);
    }
    const result = await database.runQuery(
      `INSERT INTO lot_in (
        lot_number, quantity, unit, supplier_id, food_id, production_date, expiry_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [lot_number, quantity, unit, supplier_id, food_id, production_date || null, expiry_date || null]
    );
    if (!result || !result.id) {
      const newLot2 = await database.getRow(
        "SELECT * FROM lot_in WHERE lot_number = ? ORDER BY created_at DESC LIMIT 1",
        [lot_number]
      );
      if (newLot2) {
        return c.json(newLot2, 201);
      } else {
        return c.json({
          message: "Lot created successfully but could not retrieve details",
          success: true
        }, 201);
      }
    }
    const newLot = await database.getRow(`
      SELECT 
        li.*,
        fi.name as food_name,
        fi.description as food_description,
        fi.category as food_category,
        s.name as supplier_name,
        s.vat as supplier_vat,
        s.city as supplier_city,
        s.country as supplier_country
      FROM lot_in li
      LEFT JOIN food_in fi ON li.food_id = fi.id
      LEFT JOIN supplier s ON li.supplier_id = s.id
      WHERE li.id = ?
    `, [result.id]);
    return c.json(newLot, 201);
  } catch (error) {
    console.error("Error creating incoming lot:", error);
    return c.json({ error: "Failed to create incoming lot" }, 500);
  }
});
router3.put("/:id", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const body = await c.req.json();
    const {
      lot_number,
      quantity,
      unit,
      supplier_id,
      food_id,
      production_date,
      expiry_date
    } = body;
    const lotId = c.req.param("id");
    if (!lot_number || !quantity || !unit || !supplier_id || !food_id) {
      return c.json({ error: "Lot number, quantity, unit, supplier, and food are required" }, 400);
    }
    const existingLot = await database.getRow("SELECT id FROM lot_in WHERE id = ?", [lotId]);
    if (!existingLot) {
      return c.json({ error: "Lot not found" }, 404);
    }
    const duplicateLotNumber = await database.getRow("SELECT id FROM lot_in WHERE lot_number = ? AND id != ?", [lot_number, lotId]);
    if (duplicateLotNumber) {
      return c.json({ error: "Lot number already exists" }, 400);
    }
    const food = await database.getRow("SELECT id FROM food_in WHERE id = ?", [food_id]);
    if (!food) {
      return c.json({ error: "Food not found" }, 400);
    }
    const supplier = await database.getRow("SELECT id FROM supplier WHERE id = ?", [supplier_id]);
    if (!supplier) {
      return c.json({ error: "Supplier not found" }, 400);
    }
    await database.runQuery(
      `UPDATE lot_in SET 
        lot_number = ?, quantity = ?, unit = ?, supplier_id = ?, food_id = ?, 
        production_date = ?, expiry_date = ? 
      WHERE id = ?`,
      [lot_number, quantity, unit, supplier_id, food_id, production_date || null, expiry_date || null, lotId]
    );
    const updatedLot = await database.getRow(`
      SELECT 
        li.*,
        fi.name as food_name,
        fi.description as food_description,
        fi.category as food_category,
        s.name as supplier_name,
        s.vat as supplier_vat,
        s.city as supplier_city,
        s.country as supplier_country
      FROM lot_in li
      LEFT JOIN food_in fi ON li.food_id = fi.id
      LEFT JOIN supplier s ON li.supplier_id = s.id
      WHERE li.id = ?
    `, [lotId]);
    return c.json(updatedLot);
  } catch (error) {
    console.error("Error updating incoming lot:", error);
    return c.json({ error: "Failed to update incoming lot" }, 500);
  }
});
router3.delete("/:id", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const lotId = c.req.param("id");
    const existingLot = await database.getRow("SELECT id FROM lot_in WHERE id = ?", [lotId]);
    if (!existingLot) {
      return c.json({ error: "Lot not found" }, 404);
    }
    const referencedInSales = await database.getRow("SELECT id FROM sell WHERE fk_lot_in = ? LIMIT 1", [lotId]);
    if (referencedInSales) {
      return c.json({ error: "Cannot delete lot: referenced in sales" }, 400);
    }
    await database.runQuery("DELETE FROM lot_in WHERE id = ?", [lotId]);
    return c.json({ message: "Incoming lot deleted successfully" });
  } catch (error) {
    console.error("Error deleting incoming lot:", error);
    return c.json({ error: "Failed to delete incoming lot" }, 500);
  }
});
router3.get("/stats/summary", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const totalLotsResult = await database.getRow("SELECT COUNT(*) as count FROM lot_in");
    const totalLots = totalLotsResult.count || 0;
    const totalQuantityResult = await database.getRow("SELECT SUM(quantity) as total FROM lot_in");
    const totalQuantity = totalQuantityResult.total || 0;
    const expiringSoonResult = await database.getRow(`
      SELECT COUNT(*) as count 
      FROM lot_in 
      WHERE expiry_date IS NOT NULL 
      AND expiry_date <= date('now', '+30 days')
      AND expiry_date >= date('now')
    `);
    const expiringSoon = expiringSoonResult.count || 0;
    const suppliersCountResult = await database.getRow("SELECT COUNT(DISTINCT supplier_id) as count FROM lot_in WHERE supplier_id IS NOT NULL");
    const suppliersCount = suppliersCountResult.count || 0;
    const foodsCountResult = await database.getRow("SELECT COUNT(DISTINCT food_id) as count FROM lot_in WHERE food_id IS NOT NULL");
    const foodsCount = foodsCountResult.count || 0;
    return c.json({
      totalLots,
      totalQuantity,
      expiringSoon,
      suppliersCount,
      foodsCount
    });
  } catch (error) {
    console.error("Error fetching incoming lots stats:", error);
    return c.json({ error: "Failed to fetch incoming lots statistics" }, 500);
  }
});
var lots_in_default = router3;

// routes/checks.js
var router4 = new Hono2();
router4.get("/", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const checks = await database.getAll(`
      SELECT 
        c.*,
        ct.name as check_type_name,
        cc.name as check_category_name
      FROM quality_check c
      LEFT JOIN check_type ct ON c.fk_check_type = ct.id
      LEFT JOIN check_category cc ON c.fk_check_category = cc.id
      ORDER BY c.created_at DESC
    `);
    return c.json(checks);
  } catch (error) {
    console.error("Error fetching checks:", error);
    return c.json({ error: "Failed to fetch checks" }, 500);
  }
});
router4.get("/:id", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const check = await database.getRow(`
      SELECT 
        c.*,
        ct.name as check_type_name,
        cc.name as check_category_name
      FROM quality_check c
      LEFT JOIN check_type ct ON c.fk_check_type = ct.id
      LEFT JOIN check_category cc ON c.fk_check_category = cc.id
      WHERE c.id = ?
    `, [c.req.param("id")]);
    if (!check) {
      return c.json({ error: "Check not found" }, 404);
    }
    return c.json(check);
  } catch (error) {
    console.error("Error fetching check:", error);
    return c.json({ error: "Failed to fetch check" }, 500);
  }
});
router4.post("/", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const body = await c.req.json();
    const { name, description, frequency, fk_check_type, fk_check_category } = body;
    if (!name) {
      return c.json({ error: "Name is required" }, 400);
    }
    const result = await database.runQuery(
      "INSERT INTO quality_check (name, description, frequency, fk_check_type, fk_check_category) VALUES (?, ?, ?, ?, ?)",
      [name, description || null, frequency || null, fk_check_type || null, fk_check_category || null]
    );
    const newCheck = await database.getRow(`
      SELECT 
        c.*,
        ct.name as check_type_name,
        cc.name as check_category_name
      FROM quality_check c
      LEFT JOIN check_type ct ON c.fk_check_type = ct.id
      LEFT JOIN check_category cc ON c.fk_check_category = cc.id
      WHERE c.id = ?
    `, [result.id]);
    return c.json(newCheck, 201);
  } catch (error) {
    console.error("Error creating check:", error);
    return c.json({ error: "Failed to create check" }, 500);
  }
});
router4.put("/:id", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const body = await c.req.json();
    const { name, description, frequency, fk_check_type, fk_check_category } = body;
    const checkId = c.req.param("id");
    if (!name) {
      return c.json({ error: "Name is required" }, 400);
    }
    const existingCheck = await database.getRow("SELECT id FROM quality_check WHERE id = ?", [checkId]);
    if (!existingCheck) {
      return c.json({ error: "Check not found" }, 404);
    }
    await database.runQuery(
      "UPDATE quality_check SET name = ?, description = ?, frequency = ?, fk_check_type = ?, fk_check_category = ? WHERE id = ?",
      [name, description || null, frequency || null, fk_check_type || null, fk_check_category || null, checkId]
    );
    const updatedCheck = await database.getRow(`
      SELECT 
        c.*,
        ct.name as check_type_name,
        cc.name as check_category_name
      FROM quality_check c
      LEFT JOIN check_type ct ON c.fk_check_type = ct.id
      LEFT JOIN check_category cc ON c.fk_check_category = cc.id
      WHERE c.id = ?
    `, [checkId]);
    return c.json(updatedCheck);
  } catch (error) {
    console.error("Error updating check:", error);
    return c.json({ error: "Failed to update check" }, 500);
  }
});
router4.delete("/:id", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const checkId = c.req.param("id");
    const existingCheck = await database.getRow("SELECT id FROM quality_check WHERE id = ?", [checkId]);
    if (!existingCheck) {
      return c.json({ error: "Check not found" }, 404);
    }
    const referencedInResults = await database.getRow("SELECT id FROM check_result WHERE check_id = ? LIMIT 1", [checkId]);
    if (referencedInResults) {
      return c.json({ error: "Cannot delete check: referenced in check results" }, 400);
    }
    await database.runQuery("DELETE FROM quality_check WHERE id = ?", [checkId]);
    return c.json({ message: "Check deleted successfully" });
  } catch (error) {
    console.error("Error deleting check:", error);
    return c.json({ error: "Failed to delete check" }, 500);
  }
});
router4.get("/stats/summary", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const totalChecksResult = await database.getRow("SELECT COUNT(*) as count FROM quality_check");
    const totalChecks = totalChecksResult.count || 0;
    const checksWithResultsResult = await database.getRow("SELECT COUNT(DISTINCT check_id) as count FROM check_result");
    const checksWithResults = checksWithResultsResult.count || 0;
    const totalResultsResult = await database.getRow("SELECT COUNT(*) as count FROM check_result");
    const totalResults = totalResultsResult.count || 0;
    return c.json({
      totalChecks,
      checksWithResults,
      checksWithoutResults: totalChecks - checksWithResults,
      totalResults
    });
  } catch (error) {
    console.error("Error fetching checks stats:", error);
    return c.json({ error: "Failed to fetch checks statistics" }, 500);
  }
});
var checks_default = router4;

// routes/foods.js
var router5 = new Hono2();
router5.get("/test", (c) => {
  return c.json({ message: "Test route works!" });
});
router5.get("/list", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const [rawFoods, processedFoods] = await Promise.all([
      database.getAll(`
        SELECT 
          f.*,
          s.name as supplier_name,
          'raw' as type
        FROM food_in f
        LEFT JOIN supplier s ON f.supplier_id = s.id
        ORDER BY f.name
      `),
      database.getAll(`
        SELECT 
          f.*,
          'processed' as type
        FROM food_out f
        ORDER BY f.name
      `)
    ]);
    return c.json([...rawFoods, ...processedFoods]);
  } catch (error) {
    console.error("Error fetching foods:", error);
    return c.json({ error: "Failed to fetch foods" }, 500);
  }
});
router5.get("/raw", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const foods = await database.getAll(`
      SELECT 
        f.*,
        s.name as supplier_name
      FROM food_in f
      LEFT JOIN supplier s ON f.supplier_id = s.id
      ORDER BY f.name
    `);
    return c.json(foods);
  } catch (error) {
    console.error("Error fetching raw foods:", error);
    return c.json({ error: "Failed to fetch raw foods" }, 500);
  }
});
router5.get("/processed", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const foods = await database.getAll("SELECT * FROM food_out ORDER BY name");
    return c.json(foods);
  } catch (error) {
    console.error("Error fetching processed foods:", error);
    return c.json({ error: "Failed to fetch processed foods" }, 500);
  }
});
router5.post("/raw", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const body = await c.req.json();
    const { name, description, category, supplier_id } = body;
    if (!name) {
      return c.json({ error: "Name is required" }, 400);
    }
    const existingFood = await database.getRow("SELECT id FROM food_in WHERE name = ?", [name]);
    if (existingFood) {
      return c.json({ error: "Food with this name already exists" }, 400);
    }
    const result = await database.runQuery(
      "INSERT INTO food_in (name, description, category, supplier_id) VALUES (?, ?, ?, ?)",
      [name, description || null, category || null, supplier_id || null]
    );
    if (!result || !result.id) {
      const newFood2 = await database.getRow(
        "SELECT * FROM food_in WHERE name = ? ORDER BY created_at DESC LIMIT 1",
        [name]
      );
      if (newFood2) {
        return c.json(newFood2, 201);
      } else {
        return c.json({
          message: "Food created successfully but could not retrieve details",
          success: true
        }, 201);
      }
    }
    const newFood = await database.getRow("SELECT * FROM food_in WHERE id = ?", [result.id]);
    return c.json(newFood, 201);
  } catch (error) {
    console.error("Error creating raw food:", error);
    return c.json({ error: "Failed to create raw food" }, 500);
  }
});
router5.post("/processed", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const body = await c.req.json();
    const { name, description, category } = body;
    if (!name) {
      return c.json({ error: "Name is required" }, 400);
    }
    const existingFood = await database.getRow("SELECT id FROM food_out WHERE name = ?", [name]);
    if (existingFood) {
      return c.json({ error: "Food with this name already exists" }, 400);
    }
    const result = await database.runQuery(
      "INSERT INTO food_out (name, description, category) VALUES (?, ?, ?)",
      [name, description || null, category || null]
    );
    if (!result || !result.id) {
      const newFood2 = await database.getRow(
        "SELECT * FROM food_out WHERE name = ? ORDER BY created_at DESC LIMIT 1",
        [name]
      );
      if (newFood2) {
        return c.json(newFood2, 201);
      } else {
        return c.json({
          message: "Food created successfully but could not retrieve details",
          success: true
        }, 201);
      }
    }
    const newFood = await database.getRow("SELECT * FROM food_out WHERE id = ?", [result.id]);
    return c.json(newFood, 201);
  } catch (error) {
    console.error("Error creating processed food:", error);
    return c.json({ error: "Failed to create processed food" }, 500);
  }
});
router5.get("/stats/summary", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const rawFoodsResult = await database.getRow("SELECT COUNT(*) as count FROM food_in");
    const rawFoods = rawFoodsResult.count || 0;
    const processedFoodsResult = await database.getRow("SELECT COUNT(*) as count FROM food_out");
    const processedFoods = processedFoodsResult.count || 0;
    const rawFoodsWithLotsResult = await database.getRow("SELECT COUNT(DISTINCT food_id) as count FROM lot_in WHERE food_id IS NOT NULL");
    const rawFoodsWithLots = rawFoodsWithLotsResult.count || 0;
    const processedFoodsWithLotsResult = await database.getRow("SELECT COUNT(DISTINCT food_id) as count FROM lot_out WHERE food_id IS NOT NULL");
    const processedFoodsWithLots = processedFoodsWithLotsResult.count || 0;
    return c.json({
      totalRawFoods: rawFoods,
      totalProcessedFoods: processedFoods,
      rawFoodsWithLots,
      processedFoodsWithLots,
      totalFoods: rawFoods + processedFoods
    });
  } catch (error) {
    console.error("Error fetching foods stats:", error);
    return c.json({ error: "Failed to fetch foods statistics" }, 500);
  }
});
var foods_default = router5;

// routes/company.js
var router6 = new Hono2();
router6.get("/", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const company = await database.getRow("SELECT * FROM company LIMIT 1");
    if (!company) {
      return c.json({ error: "Company information not found" }, 404);
    }
    return c.json(company);
  } catch (error) {
    console.error("Error fetching company:", error);
    return c.json({ error: "Failed to fetch company information" }, 500);
  }
});
router6.put("/", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const body = await c.req.json();
    const { name, vat, address, city, country, phone, email, website, logo } = body;
    if (!name) {
      return c.json({ error: "Company name is required" }, 400);
    }
    const existingCompany = await database.getRow("SELECT id FROM company LIMIT 1");
    if (existingCompany) {
      await database.runQuery(
        "UPDATE company SET name = ?, vat = ?, address = ?, city = ?, country = ?, phone = ?, email = ?, website = ?, logo = ? WHERE id = ?",
        [name, vat || null, address || null, city || null, country || null, phone || null, email || null, website || null, logo || null, existingCompany.id]
      );
    } else {
      await database.runQuery(
        "INSERT INTO company (name, vat, address, city, country, phone, email, website, logo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [name, vat || null, address || null, city || null, country || null, phone || null, email || null, website || null, logo || null]
      );
    }
    const updatedCompany = await database.getRow("SELECT * FROM company LIMIT 1");
    return c.json(updatedCompany);
  } catch (error) {
    console.error("Error updating company:", error);
    return c.json({ error: "Failed to update company information" }, 500);
  }
});
var company_default = router6;

// routes/lots-out.js
var router7 = new Hono2();
router7.get("/", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const lots = await database.getAll(`
      SELECT 
        lo.*,
        fo.name as food_name,
        fo.description as food_description,
        fo.category as food_category
      FROM lot_out lo
      LEFT JOIN food_out fo ON lo.food_id = fo.id
      ORDER BY lo.created_at DESC
    `);
    return c.json(lots);
  } catch (error) {
    console.error("Error fetching outgoing lots:", error);
    return c.json({ error: "Failed to fetch outgoing lots" }, 500);
  }
});
router7.get("/:id", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const lot = await database.getRow(`
      SELECT 
        lo.*,
        fo.name as food_name,
        fo.description as food_description,
        fo.category as food_category
      FROM lot_out lo
      LEFT JOIN food_out fo ON lo.food_id = fo.id
      WHERE lo.id = ?
    `, [c.req.param("id")]);
    if (!lot) {
      return c.json({ error: "Lot not found" }, 404);
    }
    return c.json(lot);
  } catch (error) {
    console.error("Error fetching lot:", error);
    return c.json({ error: "Failed to fetch lot" }, 500);
  }
});
router7.post("/", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const body = await c.req.json();
    const {
      lot_number,
      quantity,
      unit,
      food_id,
      production_date,
      expiry_date
    } = body;
    if (!lot_number || !quantity || !unit || !food_id) {
      return c.json({ error: "Lot number, quantity, unit, and food are required" }, 400);
    }
    const existingLot = await database.getRow("SELECT id FROM lot_out WHERE lot_number = ?", [lot_number]);
    if (existingLot) {
      return c.json({ error: "Lot number already exists" }, 400);
    }
    const food = await database.getRow("SELECT id FROM food_out WHERE id = ?", [food_id]);
    if (!food) {
      return c.json({ error: "Food not found" }, 400);
    }
    const result = await database.runQuery(
      `INSERT INTO lot_out (
        lot_number, quantity, unit, food_id, production_date, expiry_date
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [lot_number, quantity, unit, food_id, production_date || null, expiry_date || null]
    );
    if (!result || !result.id) {
      const newLot2 = await database.getRow(
        "SELECT * FROM lot_out WHERE lot_number = ? ORDER BY created_at DESC LIMIT 1",
        [lot_number]
      );
      if (newLot2) {
        return c.json(newLot2, 201);
      } else {
        return c.json({
          message: "Lot created successfully but could not retrieve details",
          success: true
        }, 201);
      }
    }
    const newLot = await database.getRow(`
      SELECT 
        lo.*,
        fo.name as food_name,
        fo.description as food_description,
        fo.category as food_category
      FROM lot_out lo
      LEFT JOIN food_out fo ON lo.food_id = fo.id
      WHERE lo.id = ?
    `, [result.id]);
    return c.json(newLot, 201);
  } catch (error) {
    console.error("Error creating outgoing lot:", error);
    return c.json({ error: "Failed to create outgoing lot" }, 500);
  }
});
router7.put("/:id", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const body = await c.req.json();
    const {
      lot_number,
      quantity,
      unit,
      food_id,
      production_date,
      expiry_date
    } = body;
    const lotId = c.req.param("id");
    if (!lot_number || !quantity || !unit || !food_id) {
      return c.json({ error: "Lot number, quantity, unit, and food are required" }, 400);
    }
    const existingLot = await database.getRow("SELECT id FROM lot_out WHERE id = ?", [lotId]);
    if (!existingLot) {
      return c.json({ error: "Lot not found" }, 404);
    }
    const duplicateLotNumber = await database.getRow("SELECT id FROM lot_out WHERE lot_number = ? AND id != ?", [lot_number, lotId]);
    if (duplicateLotNumber) {
      return c.json({ error: "Lot number already exists" }, 400);
    }
    const food = await database.getRow("SELECT id FROM food_out WHERE id = ?", [food_id]);
    if (!food) {
      return c.json({ error: "Food not found" }, 400);
    }
    await database.runQuery(
      `UPDATE lot_out SET 
        lot_number = ?, quantity = ?, unit = ?, food_id = ?, 
        production_date = ?, expiry_date = ? 
      WHERE id = ?`,
      [lot_number, quantity, unit, food_id, production_date || null, expiry_date || null, lotId]
    );
    const updatedLot = await database.getRow(`
      SELECT 
        lo.*,
        fo.name as food_name,
        fo.description as food_description,
        fo.category as food_category
      FROM lot_out lo
      LEFT JOIN food_out fo ON lo.food_id = fo.id
      WHERE lo.id = ?
    `, [lotId]);
    return c.json(updatedLot);
  } catch (error) {
    console.error("Error updating outgoing lot:", error);
    return c.json({ error: "Failed to update outgoing lot" }, 500);
  }
});
router7.delete("/:id", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const lotId = c.req.param("id");
    const existingLot = await database.getRow("SELECT id FROM lot_out WHERE id = ?", [lotId]);
    if (!existingLot) {
      return c.json({ error: "Lot not found" }, 404);
    }
    const referencedInSales = await database.getRow("SELECT id FROM sell WHERE fk_lot_out = ? LIMIT 1", [lotId]);
    if (referencedInSales) {
      return c.json({ error: "Cannot delete lot: referenced in sales" }, 400);
    }
    await database.runQuery("DELETE FROM lot_out WHERE id = ?", [lotId]);
    return c.json({ message: "Outgoing lot deleted successfully" });
  } catch (error) {
    console.error("Error deleting outgoing lot:", error);
    return c.json({ error: "Failed to delete outgoing lot" }, 500);
  }
});
router7.get("/stats/summary", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const totalLotsResult = await database.getRow("SELECT COUNT(*) as count FROM lot_out");
    const totalLots = totalLotsResult.count || 0;
    const totalQuantityResult = await database.getRow("SELECT SUM(quantity) as total FROM lot_out");
    const totalQuantity = totalQuantityResult.total || 0;
    const expiringSoonResult = await database.getRow(`
      SELECT COUNT(*) as count 
      FROM lot_out 
      WHERE expiry_date IS NOT NULL 
      AND expiry_date <= date('now', '+30 days')
      AND expiry_date >= date('now')
    `);
    const expiringSoon = expiringSoonResult.count || 0;
    const foodsCountResult = await database.getRow("SELECT COUNT(DISTINCT food_id) as count FROM lot_out WHERE food_id IS NOT NULL");
    const foodsCount = foodsCountResult.count || 0;
    return c.json({
      totalLots,
      totalQuantity,
      expiringSoon,
      foodsCount
    });
  } catch (error) {
    console.error("Error fetching outgoing lots stats:", error);
    return c.json({ error: "Failed to fetch outgoing lots statistics" }, 500);
  }
});
var lots_out_default = router7;

// routes/packages.js
var router8 = new Hono2();
router8.get("/", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const packages = await database.getAll("SELECT * FROM package ORDER BY description");
    return c.json(packages);
  } catch (error) {
    console.error("Error fetching packages:", error);
    return c.json({ error: "Failed to fetch packages" }, 500);
  }
});
router8.get("/:id", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const packageItem = await database.getRow("SELECT * FROM package WHERE id = ?", [c.req.param("id")]);
    if (!packageItem) {
      return c.json({ error: "Package not found" }, 404);
    }
    return c.json(packageItem);
  } catch (error) {
    console.error("Error fetching package:", error);
    return c.json({ error: "Failed to fetch package" }, 500);
  }
});
router8.post("/", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const body = await c.req.json();
    const { type, description, measure, more_information, variable, fk_gtin } = body;
    if (!type || !description || !measure) {
      return c.json({ error: "Type, description, and measure are required" }, 400);
    }
    const result = await database.runQuery(
      "INSERT INTO package (type, description, measure, more_information, variable, fk_gtin) VALUES (?, ?, ?, ?, ?, ?)",
      [type, description, measure, more_information || 0, variable || 0, fk_gtin || null]
    );
    if (!result || !result.id) {
      const newPackage2 = await database.getRow(
        "SELECT * FROM package WHERE type = ? AND description = ? ORDER BY created_at DESC LIMIT 1",
        [type, description]
      );
      if (newPackage2) {
        return c.json(newPackage2, 201);
      } else {
        return c.json({
          message: "Package created successfully but could not retrieve details",
          success: true
        }, 201);
      }
    }
    const newPackage = await database.getRow("SELECT * FROM package WHERE id = ?", [result.id]);
    return c.json(newPackage, 201);
  } catch (error) {
    console.error("Error creating package:", error);
    return c.json({ error: "Failed to create package" }, 500);
  }
});
router8.put("/:id", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const body = await c.req.json();
    const { type, description, measure, more_information, variable, fk_gtin } = body;
    const packageId = c.req.param("id");
    if (!type || !description || !measure) {
      return c.json({ error: "Type, description, and measure are required" }, 400);
    }
    const existingPackage = await database.getRow("SELECT id FROM package WHERE id = ?", [packageId]);
    if (!existingPackage) {
      return c.json({ error: "Package not found" }, 404);
    }
    await database.runQuery(
      "UPDATE package SET type = ?, description = ?, measure = ?, more_information = ?, variable = ?, fk_gtin = ? WHERE id = ?",
      [type, description, measure, more_information || 0, variable || 0, fk_gtin || null, packageId]
    );
    const updatedPackage = await database.getRow("SELECT * FROM package WHERE id = ?", [packageId]);
    return c.json(updatedPackage);
  } catch (error) {
    console.error("Error updating package:", error);
    return c.json({ error: "Failed to update package" }, 500);
  }
});
router8.delete("/:id", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const packageId = c.req.param("id");
    const existingPackage = await database.getRow("SELECT id FROM package WHERE id = ?", [packageId]);
    if (!existingPackage) {
      return c.json({ error: "Package not found" }, 404);
    }
    const referencedInSales = await database.getRow("SELECT id FROM sell WHERE fk_package = ? LIMIT 1", [packageId]);
    if (referencedInSales) {
      return c.json({ error: "Cannot delete package: referenced in sales" }, 400);
    }
    await database.runQuery("DELETE FROM package WHERE id = ?", [packageId]);
    return c.json({ message: "Package deleted successfully" });
  } catch (error) {
    console.error("Error deleting package:", error);
    return c.json({ error: "Failed to delete package" }, 500);
  }
});
router8.get("/stats/summary", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const totalPackagesResult = await database.getRow("SELECT COUNT(*) as count FROM package");
    const totalPackages = totalPackagesResult.count || 0;
    const packagesByTypeResult = await database.getAll("SELECT type, COUNT(*) as count FROM package GROUP BY type");
    const packagesByType = packagesByTypeResult || [];
    const packagesWithGtinResult = await database.getRow("SELECT COUNT(*) as count FROM package WHERE fk_gtin IS NOT NULL");
    const packagesWithGtin = packagesWithGtinResult.count || 0;
    return c.json({
      totalPackages,
      packagesByType,
      packagesWithGtin
    });
  } catch (error) {
    console.error("Error fetching packages stats:", error);
    return c.json({ error: "Failed to fetch packages statistics" }, 500);
  }
});
var packages_default = router8;

// routes/sales.js
var router9 = new Hono2();
router9.get("/", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const sales = await database.getAll(`
      SELECT 
        s.*,
        c.name as customer_name,
        c.vat as customer_vat
      FROM sell s
      LEFT JOIN customer c ON s.fk_customer = c.id
      ORDER BY s.invoice_date DESC
    `);
    return c.json(sales);
  } catch (error) {
    console.error("Error fetching sales:", error);
    return c.json({ error: "Failed to fetch sales" }, 500);
  }
});
router9.get("/:id", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const sale = await database.getRow(`
      SELECT 
        s.*,
        c.name as customer_name,
        c.vat as customer_vat,
        c.address as customer_address,
        c.city as customer_city
      FROM sell s
      LEFT JOIN customer c ON s.fk_customer = c.id
      WHERE s.id = ?
    `, [c.req.param("id")]);
    if (!sale) {
      return c.json({ error: "Sale not found" }, 404);
    }
    return c.json(sale);
  } catch (error) {
    console.error("Error fetching sale:", error);
    return c.json({ error: "Failed to fetch sale" }, 500);
  }
});
router9.post("/", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const body = await c.req.json();
    const {
      invoice_number,
      invoice_date,
      fk_lot_out,
      fk_lot_in,
      fk_package,
      fk_customer
    } = body;
    if (!invoice_number || !invoice_date || !fk_customer) {
      return c.json({ error: "Invoice number, date, and customer are required" }, 400);
    }
    const existingInvoice = await database.getRow("SELECT id FROM sell WHERE invoice_number = ?", [invoice_number]);
    if (existingInvoice) {
      return c.json({ error: "Invoice number already exists" }, 400);
    }
    const customer = await database.getRow("SELECT id FROM customer WHERE id = ?", [fk_customer]);
    if (!customer) {
      return c.json({ error: "Customer not found" }, 400);
    }
    if (fk_lot_out) {
      const lotOut = await database.getRow("SELECT id FROM lot_out WHERE id = ?", [fk_lot_out]);
      if (!lotOut) {
        return c.json({ error: "Outgoing lot not found" }, 400);
      }
    }
    if (fk_lot_in) {
      const lotIn = await database.getRow("SELECT id FROM lot_in WHERE id = ?", [fk_lot_in]);
      if (!lotIn) {
        return c.json({ error: "Incoming lot not found" }, 400);
      }
    }
    if (fk_package) {
      const packageItem = await database.getRow("SELECT id FROM package WHERE id = ?", [fk_package]);
      if (!packageItem) {
        return c.json({ error: "Package not found" }, 400);
      }
    }
    const result = await database.runQuery(
      "INSERT INTO sell (invoice_number, invoice_date, fk_lot_out, fk_lot_in, fk_package, fk_customer) VALUES (?, ?, ?, ?, ?, ?)",
      [invoice_number, invoice_date, fk_lot_out || null, fk_lot_in || null, fk_package || null, fk_customer]
    );
    if (!result || !result.id) {
      const newSale2 = await database.getRow(
        "SELECT * FROM sell WHERE invoice_number = ? ORDER BY created_at DESC LIMIT 1",
        [invoice_number]
      );
      if (newSale2) {
        return c.json(newSale2, 201);
      } else {
        return c.json({
          message: "Sale created successfully but could not retrieve details",
          success: true
        }, 201);
      }
    }
    const newSale = await database.getRow(`
      SELECT 
        s.*,
        c.name as customer_name,
        c.vat as customer_vat
      FROM sell s
      LEFT JOIN customer c ON s.fk_customer = c.id
      WHERE s.id = ?
    `, [result.id]);
    return c.json(newSale, 201);
  } catch (error) {
    console.error("Error creating sale:", error);
    return c.json({ error: "Failed to create sale" }, 500);
  }
});
router9.put("/:id", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const body = await c.req.json();
    const {
      invoice_number,
      invoice_date,
      fk_lot_out,
      fk_lot_in,
      fk_package,
      fk_customer
    } = body;
    const saleId = c.req.param("id");
    if (!invoice_number || !invoice_date || !fk_customer) {
      return c.json({ error: "Invoice number, date, and customer are required" }, 400);
    }
    const existingSale = await database.getRow("SELECT id FROM sell WHERE id = ?", [saleId]);
    if (!existingSale) {
      return c.json({ error: "Sale not found" }, 404);
    }
    const duplicateInvoice = await database.getRow("SELECT id FROM sell WHERE invoice_number = ? AND id != ?", [invoice_number, saleId]);
    if (duplicateInvoice) {
      return c.json({ error: "Invoice number already exists" }, 400);
    }
    const customer = await database.getRow("SELECT id FROM customer WHERE id = ?", [fk_customer]);
    if (!customer) {
      return c.json({ error: "Customer not found" }, 400);
    }
    if (fk_lot_out) {
      const lotOut = await database.getRow("SELECT id FROM lot_out WHERE id = ?", [fk_lot_out]);
      if (!lotOut) {
        return c.json({ error: "Outgoing lot not found" }, 400);
      }
    }
    if (fk_lot_in) {
      const lotIn = await database.getRow("SELECT id FROM lot_in WHERE id = ?", [fk_lot_in]);
      if (!lotIn) {
        return c.json({ error: "Incoming lot not found" }, 400);
      }
    }
    if (fk_package) {
      const packageItem = await database.getRow("SELECT id FROM package WHERE id = ?", [fk_package]);
      if (!packageItem) {
        return c.json({ error: "Package not found" }, 400);
      }
    }
    await database.runQuery(
      "UPDATE sell SET invoice_number = ?, invoice_date = ?, fk_lot_out = ?, fk_lot_in = ?, fk_package = ?, fk_customer = ? WHERE id = ?",
      [invoice_number, invoice_date, fk_lot_out || null, fk_lot_in || null, fk_package || null, fk_customer, saleId]
    );
    const updatedSale = await database.getRow(`
      SELECT 
        s.*,
        c.name as customer_name,
        c.vat as customer_vat
      FROM sell s
      LEFT JOIN customer c ON s.fk_customer = c.id
      WHERE s.id = ?
    `, [saleId]);
    return c.json(updatedSale);
  } catch (error) {
    console.error("Error updating sale:", error);
    return c.json({ error: "Failed to update sale" }, 500);
  }
});
router9.delete("/:id", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const saleId = c.req.param("id");
    const existingSale = await database.getRow("SELECT id FROM sell WHERE id = ?", [saleId]);
    if (!existingSale) {
      return c.json({ error: "Sale not found" }, 404);
    }
    await database.runQuery("DELETE FROM sell WHERE id = ?", [saleId]);
    return c.json({ message: "Sale deleted successfully" });
  } catch (error) {
    console.error("Error deleting sale:", error);
    return c.json({ error: "Failed to delete sale" }, 500);
  }
});
router9.get("/stats/summary", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const totalSalesResult = await database.getRow("SELECT COUNT(*) as count FROM sell");
    const totalSales = totalSalesResult.count || 0;
    const monthlySalesResult = await database.getAll(`
      SELECT 
        strftime('%m', invoice_date) as month,
        COUNT(*) as count
      FROM sell 
      WHERE strftime('%Y', invoice_date) = strftime('%Y', 'now')
      GROUP BY month
      ORDER BY month
    `);
    const monthlySales = monthlySalesResult || [];
    const customersCountResult = await database.getRow("SELECT COUNT(DISTINCT fk_customer) as count FROM sell");
    const customersCount = customersCountResult.count || 0;
    const recentSalesResult = await database.getAll(`
      SELECT 
        s.*,
        c.name as customer_name
      FROM sell s
      LEFT JOIN customer c ON s.fk_customer = c.id
      ORDER BY s.created_at DESC
      LIMIT 5
    `);
    const recentSales = recentSalesResult || [];
    return c.json({
      totalSales,
      monthlySales,
      customersCount,
      recentSales
    });
  } catch (error) {
    console.error("Error fetching sales stats:", error);
    return c.json({ error: "Failed to fetch sales statistics" }, 500);
  }
});
var sales_default = router9;

// routes/traceability.js
var router10 = new Hono2();
router10.get("/customer/:customerId", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const customerId = c.req.param("customerId");
    const customer = await database.getRow(`
      SELECT * FROM customer WHERE id = ?
    `, [customerId]);
    if (!customer) {
      return c.json({ error: "Customer not found" }, 404);
    }
    const sales = await database.getAll(`
      SELECT 
        s.*,
        li.lot_number as lot_in_number,
        lo.lot_number as lot_out_number,
        p.description as package_description
      FROM sell s
      LEFT JOIN lot_in li ON s.fk_lot_in = li.id
      LEFT JOIN lot_out lo ON s.fk_lot_out = lo.id
      LEFT JOIN package p ON s.fk_package = p.id
      WHERE s.fk_customer = ?
      ORDER BY s.invoice_date DESC
    `, [customerId]);
    const salesStats = await database.getRow(`
      SELECT 
        COUNT(*) as total_sales,
        SUM(CASE WHEN s.fk_lot_in IS NOT NULL THEN 1 ELSE 0 END) as incoming_lots,
        SUM(CASE WHEN s.fk_lot_out IS NOT NULL THEN 1 ELSE 0 END) as outgoing_lots,
        SUM(CASE WHEN s.fk_package IS NOT NULL THEN 1 ELSE 0 END) as packaged_sales
      FROM sell s
      WHERE s.fk_customer = ?
    `, [customerId]);
    const recentActivity = sales.slice(0, 10);
    return c.json({
      customer,
      summary: {
        totalSales: salesStats.total_sales || 0,
        uniqueProductTypes: salesStats.total_sales || 0,
        // Placeholder for now
        firstPurchase: sales.length > 0 ? sales[sales.length - 1]?.invoice_date : null,
        lastPurchase: sales.length > 0 ? sales[0]?.invoice_date : null
      },
      uniqueProducts: sales.map((sale) => ({
        product_type: sale.fk_lot_out ? "Processed Food" : sale.fk_lot_in ? "Raw Material" : "Package",
        product_name: sale.lot_out_number || sale.lot_in_number || sale.package_description || "Unknown",
        gtin_code: null
        // Placeholder for GTIN codes
      })),
      sales: sales.map((sale) => ({
        id: sale.id,
        invoice_number: sale.invoice_number,
        invoice_date: sale.invoice_date,
        lot_out_food_name: sale.lot_out_number,
        lot_in_food_name: sale.lot_in_number,
        package_description: sale.package_description,
        fk_lot_out: sale.fk_lot_out,
        fk_lot_in: sale.fk_lot_in,
        fk_package: sale.fk_package,
        quantity: null,
        // Placeholder for quantity
        lot_out_gtin_code: null,
        // Placeholder for GTIN codes
        package_gtin_code: null
        // Placeholder for GTIN codes
      }))
    });
  } catch (error) {
    console.error("Error fetching customer traceability:", error);
    return c.json({ error: "Failed to fetch customer traceability information" }, 500);
  }
});
router10.get("/lot/:lotId", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const lotId = c.req.param("lotId");
    const lot = await database.getRow(`
      SELECT 
        li.*,
        fi.name as food_name,
        fi.unit_measure,
        fi.source,
        s.name as supplier_name,
        s.vat as supplier_vat
      FROM lot_in li
      LEFT JOIN food_in fi ON li.fk_food_in = fi.id
      LEFT JOIN supplier s ON li.fk_supplier = s.id
      WHERE li.id = ?
    `, [lotId]);
    if (!lot) {
      return c.json({ error: "Lot not found" }, 404);
    }
    const checks = await database.getAll(`
      SELECT * FROM supply_check WHERE fk_lot_in = ?
    `, [lotId]);
    const outgoingLots = await database.getAll(`
      SELECT 
        lo.*,
        fo.name as food_name
      FROM lot_out lo
      LEFT JOIN food_out fo ON lo.fk_food_out = fo.id
      WHERE lo.fk_lot_in = ?
    `, [lotId]);
    const sales = await database.getAll(`
      SELECT 
        s.*,
        c.name as customer_name
      FROM sell s
      LEFT JOIN customer c ON s.fk_customer = c.id
      WHERE s.fk_lot_in = ?
    `, [lotId]);
    return c.json({
      lot,
      checks,
      outgoingLots,
      sales,
      traceability: {
        supplier: lot.supplier_name,
        food: lot.food_name,
        lotNumber: lot.lot_number,
        acceptanceDate: lot.acceptance_date,
        expiryDate: lot.expiry_date,
        quantity: lot.quantity,
        remainingQuantity: lot.quantity_remaining
      }
    });
  } catch (error) {
    console.error("Error fetching traceability:", error);
    return c.json({ error: "Failed to fetch traceability information" }, 500);
  }
});
router10.get("/chain/:lotId", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const lotId = c.req.param("lotId");
    const chain = await database.getAll(`
      WITH RECURSIVE trace_chain AS (
        -- Base case: start with the input lot
        SELECT 
          li.id,
          li.lot_number,
          li.acceptance_date,
          li.expiry_date,
          li.quantity,
          li.quantity_remaining,
          fi.name as food_name,
          s.name as supplier_name,
          0 as level,
          CAST(li.lot_number AS TEXT) as path
        FROM lot_in li
        LEFT JOIN food_in fi ON li.fk_food_in = fi.id
        LEFT JOIN supplier s ON li.fk_supplier = s.id
        WHERE li.id = ?
        
        UNION ALL
        
        -- Recursive case: find lots that use this lot
        SELECT 
          lo.id,
          lo.lot_number,
          lo.creation_date,
          lo.expiry_date,
          lo.quantity_of_food,
          NULL as quantity_remaining,
          fo.name as food_name,
          NULL as supplier_name,
          tc.level + 1,
          tc.path || ' -> ' || lo.lot_number
        FROM lot_out lo
        LEFT JOIN food_out fo ON lo.fk_food_out = fo.id
        JOIN trace_chain tc ON lo.fk_lot_in = tc.id
      )
      SELECT * FROM trace_chain
      ORDER BY level, lot_number
    `, [lotId]);
    return c.json({ chain });
  } catch (error) {
    console.error("Error fetching traceability chain:", error);
    return c.json({ error: "Failed to fetch traceability chain" }, 500);
  }
});
var traceability_default = router10;

// routes/barcodes.js
var router11 = new Hono2();
router11.get("/", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const barcodes = await database.getAll(`
      SELECT 
        b.*,
        li.lot_number as lot_in_number,
        lo.lot_number as lot_out_number,
        p.description as package_description
      FROM barcode b
      LEFT JOIN lot_in li ON b.fk_lot_in = li.id
      LEFT JOIN lot_out lo ON b.fk_lot_out = lo.id
      LEFT JOIN package p ON b.fk_package = p.id
      ORDER BY b.created_at DESC
    `);
    return c.json(barcodes);
  } catch (error) {
    console.error("Error fetching barcodes:", error);
    return c.json({ error: "Failed to fetch barcodes" }, 500);
  }
});
router11.get("/:id", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const barcode = await database.getRow(`
      SELECT 
        b.*,
        li.lot_number as lot_in_number,
        lo.lot_number as lot_out_number,
        p.description as package_description
      FROM barcode b
      LEFT JOIN lot_in li ON b.fk_lot_in = li.id
      LEFT JOIN lot_out lo ON b.fk_lot_out = lo.id
      LEFT JOIN package p ON b.fk_package = p.id
      WHERE b.id = ?
    `, [c.req.param("id")]);
    if (!barcode) {
      return c.json({ error: "Barcode not found" }, 404);
    }
    return c.json(barcode);
  } catch (error) {
    console.error("Error fetching barcode:", error);
    return c.json({ error: "Failed to fetch barcode" }, 500);
  }
});
router11.post("/", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const body = await c.req.json();
    const { code, type, description, fk_lot_in, fk_lot_out, fk_package } = body;
    if (!code || !type) {
      return c.json({ error: "Code and type are required" }, 400);
    }
    const existingCode = await database.getRow("SELECT id FROM barcode WHERE code = ?", [code]);
    if (existingCode) {
      return c.json({ error: "Barcode code already exists" }, 400);
    }
    if (!fk_lot_in && !fk_lot_out && !fk_package) {
      return c.json({ error: "At least one reference (lot_in, lot_out, or package) must be provided" }, 400);
    }
    if (fk_lot_in) {
      const lotIn = await database.getRow("SELECT id FROM lot_in WHERE id = ?", [fk_lot_in]);
      if (!lotIn) {
        return c.json({ error: "Incoming lot not found" }, 400);
      }
    }
    if (fk_lot_out) {
      const lotOut = await database.getRow("SELECT id FROM lot_out WHERE id = ?", [fk_lot_out]);
      if (!lotOut) {
        return c.json({ error: "Outgoing lot not found" }, 400);
      }
    }
    if (fk_package) {
      const packageItem = await database.getRow("SELECT id FROM package WHERE id = ?", [fk_package]);
      if (!packageItem) {
        return c.json({ error: "Package not found" }, 400);
      }
    }
    const result = await database.runQuery(
      "INSERT INTO barcode (code, type, description, fk_lot_in, fk_lot_out, fk_package) VALUES (?, ?, ?, ?, ?, ?)",
      [code, type, description || null, fk_lot_in || null, fk_lot_out || null, fk_package || null]
    );
    if (!result || !result.id) {
      const newBarcode2 = await database.getRow(
        "SELECT * FROM barcode WHERE code = ? ORDER BY created_at DESC LIMIT 1",
        [code]
      );
      if (newBarcode2) {
        return c.json(newBarcode2, 201);
      } else {
        return c.json({
          message: "Barcode created successfully but could not retrieve details",
          success: true
        }, 201);
      }
    }
    const newBarcode = await database.getRow(`
      SELECT 
        b.*,
        li.lot_number as lot_in_number,
        lo.lot_number as lot_out_number,
        p.description as package_description
      FROM barcode b
      LEFT JOIN lot_in li ON b.fk_lot_in = li.id
      LEFT JOIN lot_out lo ON b.fk_lot_out = lo.id
      LEFT JOIN package p ON b.fk_package = p.id
      WHERE b.id = ?
    `, [result.id]);
    return c.json(newBarcode, 201);
  } catch (error) {
    console.error("Error creating barcode:", error);
    return c.json({ error: "Failed to create barcode" }, 500);
  }
});
router11.put("/:id", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const body = await c.req.json();
    const { code, type, description, fk_lot_in, fk_lot_out, fk_package } = body;
    const barcodeId = c.req.param("id");
    if (!code || !type) {
      return c.json({ error: "Code and type are required" }, 400);
    }
    const existingBarcode = await database.getRow("SELECT id FROM barcode WHERE id = ?", [barcodeId]);
    if (!existingBarcode) {
      return c.json({ error: "Barcode not found" }, 404);
    }
    const duplicateCode = await database.getRow("SELECT id FROM barcode WHERE code = ? AND id != ?", [code, barcodeId]);
    if (duplicateCode) {
      return c.json({ error: "Barcode code already exists" }, 400);
    }
    if (!fk_lot_in && !fk_lot_out && !fk_package) {
      return c.json({ error: "At least one reference (lot_in, lot_out, or package) must be provided" }, 400);
    }
    if (fk_lot_in) {
      const lotIn = await database.getRow("SELECT id FROM lot_in WHERE id = ?", [fk_lot_in]);
      if (!lotIn) {
        return c.json({ error: "Incoming lot not found" }, 400);
      }
    }
    if (fk_lot_out) {
      const lotOut = await database.getRow("SELECT id FROM lot_out WHERE id = ?", [fk_lot_out]);
      if (!lotOut) {
        return c.json({ error: "Outgoing lot not found" }, 400);
      }
    }
    if (fk_package) {
      const packageItem = await database.getRow("SELECT id FROM package WHERE id = ?", [fk_package]);
      if (!packageItem) {
        return c.json({ error: "Package not found" }, 400);
      }
    }
    await database.runQuery(
      "UPDATE barcode SET code = ?, type = ?, description = ?, fk_lot_in = ?, fk_lot_out = ?, fk_package = ? WHERE id = ?",
      [code, type, description || null, fk_lot_in || null, fk_lot_out || null, fk_package || null, barcodeId]
    );
    const updatedBarcode = await database.getRow(`
      SELECT 
        b.*,
        li.lot_number as lot_in_number,
        lo.lot_number as lot_out_number,
        p.description as package_description
      FROM barcode b
      LEFT JOIN lot_in li ON b.fk_lot_in = li.id
      LEFT JOIN lot_out lo ON b.fk_lot_out = lo.id
      LEFT JOIN package p ON b.fk_package = p.id
      WHERE b.id = ?
    `, [barcodeId]);
    return c.json(updatedBarcode);
  } catch (error) {
    console.error("Error updating barcode:", error);
    return c.json({ error: "Failed to update barcode" }, 500);
  }
});
router11.delete("/:id", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const barcodeId = c.req.param("id");
    const existingBarcode = await database.getRow("SELECT id FROM barcode WHERE id = ?", [barcodeId]);
    if (!existingBarcode) {
      return c.json({ error: "Barcode not found" }, 404);
    }
    await database.runQuery("DELETE FROM barcode WHERE id = ?", [barcodeId]);
    return c.json({ message: "Barcode deleted successfully" });
  } catch (error) {
    console.error("Error deleting barcode:", error);
    return c.json({ error: "Failed to delete barcode" }, 500);
  }
});
router11.get("/stats/summary", async (c) => {
  try {
    const database = c.get("database");
    if (!database) {
      return c.json({ error: "Database not available" }, 500);
    }
    const totalBarcodesResult = await database.getRow("SELECT COUNT(*) as count FROM barcode");
    const totalBarcodes = totalBarcodesResult.count || 0;
    const barcodesByTypeResult = await database.getAll("SELECT type, COUNT(*) as count FROM barcode GROUP BY type");
    const barcodesByType = barcodesByTypeResult || [];
    const lotInBarcodesResult = await database.getRow("SELECT COUNT(*) as count FROM barcode WHERE fk_lot_in IS NOT NULL");
    const lotInBarcodes = lotInBarcodesResult.count || 0;
    const lotOutBarcodesResult = await database.getRow("SELECT COUNT(*) as count FROM barcode WHERE fk_lot_out IS NOT NULL");
    const lotOutBarcodes = lotOutBarcodesResult.count || 0;
    const packageBarcodesResult = await database.getRow("SELECT COUNT(*) as count FROM barcode WHERE fk_package IS NOT NULL");
    const packageBarcodes = packageBarcodesResult.count || 0;
    return c.json({
      totalBarcodes,
      barcodesByType,
      lotInBarcodes,
      lotOutBarcodes,
      packageBarcodes
    });
  } catch (error) {
    console.error("Error fetching barcodes stats:", error);
    return c.json({ error: "Failed to fetch barcodes statistics" }, 500);
  }
});
var barcodes_default = router11;

// worker.js
var app = new Hono2();
app.use("*", logger());
app.use("*", secureHeaders());
app.use("*", cors({
  origin: [
    "http://localhost:3000",
    "https://haccp-trace-frontend.pages.dev",
    "https://sabor.farm"
  ],
  credentials: true
}));
app.use("*", async (c, next) => {
  const clientIP = c.req.header("cf-connecting-ip") || "unknown";
  const key = `rate_limit:${clientIP}`;
  await next();
});
app.get("/health", (c) => {
  return c.json({
    status: "OK",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    environment: c.env.ENVIRONMENT || "development"
  });
});
app.use("*", async (c, next) => {
  if (c.env.DB) {
    const d1Db = new d1_default(c.env.DB);
    c.set("database", d1Db);
    try {
      await d1Db.initialize();
    } catch (error) {
      console.error("Database initialization error:", error);
    }
  }
  await next();
});
app.route("/api/suppliers", suppliers_default);
app.route("/api/customers", customers_default);
app.route("/api/lots-in", lots_in_default);
app.route("/api/checks", checks_default);
app.route("/api/foods", foods_default);
app.route("/api/company", company_default);
app.route("/api/lots-out", lots_out_default);
app.route("/api/packages", packages_default);
app.route("/api/sales", sales_default);
app.route("/api/traceability", traceability_default);
app.route("/api/barcodes", barcodes_default);
app.onError((err, c) => {
  console.error("Error:", err);
  return c.json({
    error: "Internal server error",
    message: c.env.ENVIRONMENT === "development" ? err.message : "Something went wrong"
  }, 500);
});
app.notFound((c) => {
  return c.json({ error: "Endpoint not found" }, 404);
});
var worker_default = app;
export {
  worker_default as default
};
