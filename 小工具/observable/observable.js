var targetMap = new WeakMap();
var activeEffectStack = [];
var activeEffect;
function track(target, key, receiver) {
    // track的时候
    var depMap = targetMap.get(target);
    if (!depMap) {
        targetMap.set(target, (depMap = new Map()));
    }
    var dep = depMap.get(key);
    if (!dep) {
        depMap.set(key, (dep = new Set()));
    }
    if (!dep.has(activeEffect)) {
        dep.add(activeEffect);
    }
}
function trigger(target, key, value, receiver) {
    var depMap = targetMap.get(target);
    if (!depMap) {
        return;
    }
    var dep = depMap.get(key);
    if (!dep) {
        return;
    }
    dep.forEach(function (item) { return item && item(); });
}
function createObserve(obj) {
    var handler = {
        get: function (target, key, receiver) {
            var result = Reflect.get(target, key, receiver);
            track(target, key, receiver);
            return result;
        },
        set: function (target, key, value, receiver) {
            var result = Reflect.set(target, key, value, receiver);
            trigger(target, key, value, receiver);
            return result;
        }
    };
    var proxyObj = new Proxy(obj, handler);
    return proxyObj;
}
function observable(obj) {
    return createObserve(obj);
}
function observe(fn) {
    var wrapFn = function () {
        var reaction = function () {
            try {
                activeEffect = fn;
                activeEffectStack.push(fn);
                return fn();
            }
            finally {
                activeEffectStack.pop();
                activeEffect = activeEffectStack[activeEffectStack.length - 1];
            }
        };
        return reaction();
    };
    wrapFn();
    return wrapFn;
}
var computedImpl = (function () {
    function computedImpl(options) {
        var _this = this;
        this._value = undefined;
        this._setter = undefined;
        var get = options.get, set = options.set;
        this._setter = set;
        this.effect = observe(function () {
            _this._value = get();
        });
    }
    Object.defineProperty(computedImpl.prototype, "value", {
        get: function () {
            return this._value;
        },
        set: function (val) {
            this._setter && this._setter(val);
        },
        enumerable: true,
        configurable: true
    });
    return computedImpl;
})();
function computed(fnOrOptions) {
    var options = {
        get: null,
        set: null
    };
    if (fnOrOptions instanceof Function) {
        options.get = fnOrOptions;
    }
    else {
        var get = fnOrOptions.get, set = fnOrOptions.set;
        options.get = get;
        options.set = set;
    }
    return new computedImpl(options);
}
var p = observable({ num: 0, test: 99 });
var j = observe(function () { console.log("i am observe:", p.num, p.test); });
var e = observe(function () { console.log("i am observe2:", p.num); });
var w = computed(function () { return '我是computed 1:' + p.num; });
var v = computed({
    get: function () {
        return 'test computed getter' + p.num;
    },
    set: function (val) {
        p.num = "\u8981\u4F60\u547D" + val;
    }
});
p.num++;
console.log(w.value);
v.value = 3000;
console.log(w.value);
