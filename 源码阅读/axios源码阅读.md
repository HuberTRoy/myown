# 缘起

阅读的起因是因为有一块nuxt老代码中写了一个关于出错情况下的response.status的判断：
```javascript
const code = parseInt(error.response && error.response.status);
if ([502, 504, 400].includes(code) || !code) ...
```
通过nuxt的`onError`挂载的拦截器（在request和response的拦截器上各加一个），命中了后面的`!code`条件导致了一个非预期情况的发生。

作为一个正经的HTTP请求，status都会存在，那在axios下到底有哪些情况下会有status不存在呢？

（不是因为axios相对来说容易阅读，我也可以读懂的缘故，不是！）

# 路标

axios是一个基于[XMLHttpRequest](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest)封装的支持Promise的异步通信库。

在读源码之前明确想要探索的问题是有必要的：

1. axios的拦截器是如何实现的？
2. 什么情况下会丢失status？

# xhr

对xhr的封装可从`lib/adapters/xhr.js`里查看，另一个http是用在node端的。

对xhr的封装是一些事件的预处理，外层用Promise包裹，这里我们知道Promise并不是把一段代码变成了异步，其核心在于解决回调地狱的问题。

```javascript
module.exports = function xhrAdapter(config) {
  return new Promise(function dispatchXhrRequest(resolve, reject) {
    var request = new XMLHttpRequest();

    // Listen for ready state
    request.onreadystatechange = function handleLoad() {
      if (!request || request.readyState !== 4) {
        return;
      }

      // The request errored out and we didn't get a response, this will be
      // handled by onerror instead
      // With one exception: request that using file: protocol, most browsers
      // will return status as 0 even though it's a successful request
      if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
        return;
      }

      // Prepare the response
      var responseHeaders = 'getAllResponseHeaders' in request ? parseHeaders(request.getAllResponseHeaders()) : null;
      var responseData = !config.responseType || config.responseType === 'text' ? request.responseText : request.response;
      var response = {
        data: responseData,
        status: request.status,
        statusText: request.statusText,
        headers: responseHeaders,
        config: config,
        request: request
      };

      settle(resolve, reject, response);

      // Clean up request
      request = null;
    };
};
```
onreadystatechange是xhr的状态变化时的事件，readyState对应0,1,2,3,4。4是已经请求完成。

```javascript
module.exports = function settle(resolve, reject, response) {
  var validateStatus = response.config.validateStatus;
  if (!response.status || !validateStatus || validateStatus(response.status)) {
    resolve(response);
  } else {
    reject(createError(
      'Request failed with status code ' + response.status,
      response.config,
      null,
      response.request,
      response
    ));
  }
};
```
settle只是做了一层封装。

其余的是对错误的处理和上传的处理等。

# 从入口看起

axios下的axios.js里声明了`var axios = createInstance(defaults);`以及导出的也是这个。

```javascript
function createInstance(defaultConfig) {
  var context = new Axios(defaultConfig);
  var instance = bind(Axios.prototype.request, context);

  // Copy axios.prototype to instance
  utils.extend(instance, Axios.prototype, context);

  // Copy context to instance
  utils.extend(instance, context);

  return instance;
}
```

基本是创建一个Axios，然后绑定暴露出Axios.request，把Axios的原型链到request之上，这样做其实是为了可以直接`axios({ methods: 'get' })`，也可以`axios.get`。


# Axios

大写的Axios在`lib/core/Axios.js`里，constructor里定义了两个属性，

```javascript
function Axios(instanceConfig) {
  this.defaults = instanceConfig;
  this.interceptors = {
    request: new InterceptorManager(),
    response: new InterceptorManager()
  };
}

```

defautls是上面创建实例时传入的defaults，来自于`defaults.js`，现在用不到等会再看。

暂且略过request和getUri，找到get等方法的定义：

```javascript
utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, config) {
    return this.request(mergeConfig(config || {}, {
      method: method,
      url: url,
      data: (config || {}).data
    }));
  };
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, data, config) {
    return this.request(mergeConfig(config || {}, {
      method: method,
      url: url,
      data: data
    }));
  };
});
```

get，post这些都是通过request方法扩展出来的，再回到request方法，forEach，mergeConfig这些看名字就可以猜个七七八八。


# 核心request

```javascript
Axios.prototype.request = function request(config) {
  /*eslint no-param-reassign:0*/
  // Allow for axios('example/url'[, config]) a la fetch API
  if (typeof config === 'string') {
    config = arguments[1] || {};
    config.url = arguments[0];
  } else {
    config = config || {};
  }

  config = mergeConfig(this.defaults, config);

  // Set config.method
  if (config.method) {
    config.method = config.method.toLowerCase();
  } else if (this.defaults.method) {
    config.method = this.defaults.method.toLowerCase();
  } else {
    config.method = 'get';
  }

  // Hook up interceptors middleware
  var chain = [dispatchRequest, undefined];
  var promise = Promise.resolve(config);

  this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
    chain.unshift(interceptor.fulfilled, interceptor.rejected);
  });

  this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
    chain.push(interceptor.fulfilled, interceptor.rejected);
  });

  while (chain.length) {
    promise = promise.then(chain.shift(), chain.shift());
  }

  return promise;
};
```

request的代码不长，首先是对字符串的一个封装，原因注释里写了axios允许axios('url')的方式。

之后是一个config的merge，merge的`defaults`后面在展开。

在之后是对HTTP请求方法的小写转换，默认`get`。

最后是本次要解决的问题————axios的拦截器是如何实现的：

chain初始化有两个元素，`dispatchRequest`和`undefined`，`dispatchRequest`看名字可以猜到与请求内容相关。

`Promise.resolve(config)`这样的写法会返回一个resolved的Promise，如果继续用`then`会插入一条条`微任务`，宏任务与微任务简单理解就是一次宏任务会伴随多次微任务直至清空微任务，关于微任务的应用还有vue中的nextTick。

初始化时的两个interceptors，request/response分别进行一次迭代，request放在了左边，从队列首添加，而response放在了右边，从队列尾添加。

添加之后的样子大概是这样：

```javascript
chain = [
         request.fulfilled, request.rejected,  // 添加的请求前拦截器
         dispatchRequest, undefined,           // 发起请求
         response.fulfilled, response,rejected // 响应拦截器
        ]
```

之后又将chain从头两两弹出，利用Promise链式调用的特性添加到微任务里。

Promise的then方法可以传递两个参数，第一个是谁都知道的回调callback，第二个是我之前不知道的错误处理，和catch一样，如果执行出错了话会执行第二个，例子：

```javascript
a = Promise.resolve('1')
b = [ ()=>{ console.log(123) }, () => { console.log(8889) }, () => { return new Promise((resolve, reject) => { setTimeout(() => { console.log(999); reject(888) }, 3000) }) },  (res) => { console.log(res) }]
b.map((item) => { a = a.then(item, item) }

```

当然默认的用use方法添加拦截器的时候是undefined:

```javascript
InterceptorManager.prototype.use = function use(fulfilled, rejected) {
  this.handlers.push({
    fulfilled: fulfilled,
    rejected: rejected // 不传递会是undefined
  });
  return this.handlers.length - 1;
};
```

所以这里如果出错了会报错，然后不继续执行。

接下来是dispatchRequest：

```javascript
module.exports = function dispatchRequest(config) {
  throwIfCancellationRequested(config);

  // Ensure headers exist
  config.headers = config.headers || {};

  // Transform request data
  config.data = transformData(
    config.data,
    config.headers,
    config.transformRequest
  );

  // Flatten headers
  config.headers = utils.merge(
    config.headers.common || {},
    config.headers[config.method] || {},
    config.headers
  );

  utils.forEach(
    ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
    function cleanHeaderConfig(method) {
      delete config.headers[method];
    }
  );

  var adapter = config.adapter || defaults.adapter;

  return adapter(config).then(function onAdapterResolution(response) {
    throwIfCancellationRequested(config);

    // Transform response data
    response.data = transformData(
      response.data,
      response.headers,
      config.transformResponse
    );

    return response;
  }, function onAdapterRejection(reason) {
    if (!isCancel(reason)) {
      throwIfCancellationRequested(config);

      // Transform response data
      if (reason && reason.response) {
        reason.response.data = transformData(
          reason.response.data,
          reason.response.headers,
          config.transformResponse
        );
      }
    }

    return Promise.reject(reason);
  });
```

dispatchRequest最终返回了config的adapter，而config的话是通过request传递进来的，我们写的时候一般不会传递这个参数，所以经由默认的`defaults`合并进来。

这个`defaults`是我们创建Axios传递进来的，可以在axios.js里找到，导入的defaults.js的内容。

```javascript
function getDefaultAdapter() {
  var adapter;
  if (typeof XMLHttpRequest !== 'undefined') {
    // For browsers use XHR adapter
    adapter = require('./adapters/xhr');
  } else if (typeof process !== 'undefined' && Object.prototype.toString.call(process) === '[object process]') {
    // For node use HTTP adapter
    adapter = require('./adapters/http');
  }
  return adapter;
}
```

XMLHttpRequest的兼容性还是很好的，可以说全平台全浏览器了（只要不覆盖的话）。

xhr我们最开始已经看过了，返回一个Promise，在请求返回之后会通过settle设为完成。

这里有两个点需要注意一下：

1. dispatchRequest的.then中返回的response是响应拦截器（或者直接返回）所接受的那个而不是settle之后直接resolve/reject的那个。
2. .then中一定要`return`这个Promise，否则不会阻塞，不阻塞的结果是后面的拦截器在请求完成之前就已执行。

那么整个拦截器的实现流程就很清晰了：

1. 通过`requests.use((conf) => {})`添加的拦截器会由`unshift`添加在请求之前。
2. 通过`response.use((conf) => {})`添加的拦截器会由`push`添加在请求之后。
3. 通过Promise提供的链式调用能力完成的这一系列操作。

# 到底什么情况下会不存在status

通过上面的分析以及拦截器的实现我们得知了status是由axios在xhr.js里封装到response里的：
```javascript
      var response = {
        data: responseData,
        status: request.status,
        statusText: request.statusText,
        headers: responseHeaders,
        config: config,
        request: request
      };

      settle(resolve, reject, response);
```

一旦走到这个步，不管是resolve还是reject默认情况下都会将response一直传递下去。

而像直接在xhr上注册的`onerror`，`ontimeout`等事件则不存在这个response。

那么只要是你的这个xhr请求服务器返回并且到达了`status`就会存在，如果这个请求没有返回，无论什么样的原因导致的没有返回则都不存在`status`。

这样的话结果就符合正经的HTTP请求都存在`status`这一预期了。
