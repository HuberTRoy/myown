const targetMap = new WeakMap()
let activeEffectStack = []
let activeEffect

function track(target, key, receiver?) {
    // track的时候
    let depMap = targetMap.get(target)

    if (!depMap) {
        targetMap.set(target, (depMap = new Map()))
    }

    let dep = depMap.get(key)

    if (!dep) {
        depMap.set(key, ( dep = new Set() ))
    }

    if (!dep.has(activeEffect)) {
        dep.add(activeEffect)
    }
}

function trigger(target, key, value, receiver?) {
    let depMap = targetMap.get(target)

    if (!depMap) {
        return
    }

    let dep = depMap.get(key)

    if (!dep) {
        return
    }

    dep.forEach((item) => item && item())
}


function createObserve(obj:object)  {
    
    let handler = {
        get: function (target, key, receiver) {
            let result = Reflect.get(target, key, receiver)
            track(target, key, receiver)            
            return result
        },
        set: function (target, key, value, receiver) {
            let result = Reflect.set(target, key, value, receiver)
            trigger(target, key, value, receiver)        
            return result
        }
    }

    let proxyObj = new Proxy(obj, handler)

    return proxyObj
}

function observable<T extends object>(obj:T) {
    return createObserve(obj)
}

function observe(fn:Function) {
    const wrapFn = () => {

        const reaction = () => {
            try {
                activeEffect = fn     
                activeEffectStack.push(fn)
                return fn()
            } finally {
                activeEffectStack.pop()
                activeEffect = activeEffectStack[activeEffectStack.length-1]
            }
        }

        return reaction()
    }

    wrapFn()

    return wrapFn
}

class computedImpl {
    private _value
    private _setter
    private effect

    constructor(options) {
        this._value = undefined
        this._setter = undefined
        const { get, set } = options
        this._setter = set

        this.effect = observe(() => {
            this._value = get()
        })
    }

    get value() {
        return this._value
    }

    set value (val) {
        this._setter && this._setter(val)
    }
}

function computed(fnOrOptions) {

    let options = {
        get: null,
        set: null
    }

    if (fnOrOptions instanceof Function) {
        options.get = fnOrOptions
    } else {
        const { get, set } = fnOrOptions
        options.get= get
        options.set = set
    }

    return new computedImpl(options)
}

let p = observable({num: 0, test: 99})
let j = observe(() => {console.log("i am observe:", p.num, p.test);})
let e = observe(() => {console.log("i am observe2:", p.num)})
let w = computed(() => { return '我是computed 1:' + p.num })
let v = computed({
    get: () => {
        return 'test computed getter' + p.num
    },

    set: (val) => {
        p.num = `要你命${val}`
    }
})

p.num++
console.log(w.value)
v.value = 3000
console.log(w.value)