const targetMap = new WeakMap()
let activeEffectStack:any = []
let activeEffect:any

function track(target:object, key:string|number|symbol) {
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

function trigger(target:object, key:string|number|symbol) {
    let depMap = targetMap.get(target)

    if (!depMap) {
        return
    }

    let dep = depMap.get(key)

    if (!dep) {
        return
    }

    dep.forEach((item:Function) => item && item())
}


interface Observe extends Object {
    index?: string,
    [propName: string]: any;
}

function createObserve(obj:Observe):Observe  {
    
    let handler = {
        get: function (target:object, key:string|number|symbol, receiver:any) {
            let result = Reflect.get(target, key, receiver)
            track(target, key)            
            return result
        },
        set: function (target:object, key:string|number|symbol, value:any, receiver:any) {
            // 这个学Vue2吧，Proxy里对已经Proxy对象新增的内容可以追踪，不过对新增的内容是可变对象内的无法追踪。
            // 还没试Vue3是怎么做的。
            // if (value instanceof Object) {
            //     value = createObserve(value)
            // }

            let result = Reflect.set(target, key, value, receiver)
            

            trigger(target, key)        
            return result
        }
    }

    // 这地方应该有两种写法，一个是把里面的Object都搞一遍。
    // 另一种是在set的时候用target找顶层effect列表然后触发。
    //
    for (let key of Object.keys(obj)) {
        if (obj[key] instanceof Object) {
            obj[key] = createObserve(obj[key])
        }
    }

    let proxyObj = new Proxy(obj, handler)

    return proxyObj as Observe
}

function observable<T extends Observe>(obj:T) {
    return createObserve(obj)
}

function observe(fn:Function):Function {
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

// interface options {
//     get: Function|null,
//     set: Function|undefined|null
// }

// class computedImpl {
//     private _value:any
//     private _setter
//     private effect:Function

//     constructor(options:options) {
//         this._value = undefined
//         this._setter = undefined
//         const { get, set } = options
//         this._setter = set

//         this.effect = observe(() => {
//             this._value = get()
//         })
//     }

//     get value() {
//         return this._value
//     }

//     set value (val) {
//         this._setter && this._setter(val)
//     }
// }

export { observable, observe }

// function computed(fnOrOptions:options) {

//     let options = {
//         get: null,
//         set: null
//     }

//     if (fnOrOptions instanceof Function) {
//         options.get = fnOrOptions
//     } else {
//         const { get, set } = fnOrOptions
//         options.get= get
//         options.set = set
//     }

//     return new computedImpl(options)
// }

// let p = observable({num: {
//     z: 1
// }, test: 99})
// observe(() => {console.log("i am observe:", p.num.z);})

// p.num = {z:2}
// p.num.z++
// p.num.z++
// p.num.z++

// let e = observe(() => {console.log("i am observe2:", p.num)})
// let w = computed(() => { return '我是computed 1:' + p.num })
// let v = computed({
//     get: () => {
//         return 'test computed getter' + p.num
//     },

//     set: (val) => {
//         p.num = `要你命${val}`
//     }
// })

// p.num++
// console.log(w.value)
// v.value = 3000
// console.log(w.value)