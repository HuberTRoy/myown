# 前言

天气不错，肝一肝Vue3的响应式。

# 目录结构

```
ref.ts 暴露ref,toRefs等API，一套响应式系统。
reactive.ts reactive和ref差不多，主要区别在于书写方式不同。
baseHandler.ts和collectionHandler.ts 是接到响应后的处理器。
effect.ts 副作用，目前还未知具体是干嘛的。
computed.ts 根据传入的getter获取值，目前未知如何实现。
```

# 文档中的的内容

Vue3官方文档中写了一章[深入响应式原理](https://v3.cn.vuejs.org/guide/reactivity.html#vue-%E5%A6%82%E4%BD%95%E8%BF%BD%E8%B8%AA%E5%8F%98%E5%8C%96):

1. 当某个值发生变化时进行检测：我们不再需要这样做，因为 Proxy 允许我们拦截它
2. 跟踪更改它的函数：我们在 proxy 中的 getter 中执行此操作，称为 effect
3. 触发函数以便它可以更新最终值：我们在 proxy 中的 setter 中进行该操作，名为 trigger

getter中的操作称为effect，setter中的操作称为trigger，整个响应式建立在`Proxy`的基础上。

`Proxy`是一个给原生对象添加拦截的东西：

```javascript
const dinner = {
  meal: 'tacos'
}

const handler = {
  get(target, prop) {
    console.log('intercepted!')
    return target[prop]
  }
}

const proxy = new Proxy(dinner, handler)
console.log(proxy.meal)
```

当后面的代码使用了`proxy.meal`，就会触发`handler`的`get`操作，额外打印了一个`intercepted`。

# ref

先看ref。

```javascript
export function ref<T extends object>(
  value: T
): T extends Ref ? T : Ref<UnwrapRef<T>>
export function ref<T>(value: T): Ref<UnwrapRef<T>>
export function ref<T = any>(): Ref<T | undefined>
export function ref(value?: unknown) {
  return createRef(value)
}
```

定义了一波ref传入的类型，基础是扩展的Object，可以是任意类型，如果是个传入的是个ref，返回ref，否则应该经过Ref接口处理：

```javascript
export interface Ref<T = any> {
  /**
   * Type differentiator only.
   * We need this to be in public d.ts but don't want it to show up in IDE
   * autocomplete, so we use a private Symbol instead.
   */
  [RefSymbol]: true
  value: T
}

export type UnwrapRef<T> = T extends Ref<infer V>
  ? UnwrapRefSimple<V>
  : UnwrapRefSimple<T>
```

剩下的是一大波类型推导。

暴露出来的核心API应该有三个: ref, toRef(s), customRef。

逐个来看：

ref最终调用的`createRef()`:

```javascript

class RefImpl<T> {
  private _value: T

  public readonly __v_isRef = true

  constructor(private _rawValue: T, public readonly _shallow = false) {
    // shallow 这里的意思 是创建一个跟踪自身 .value 变化的 ref，但不会使其值也变成响应式的。
    // https://v3.cn.vuejs.org/api/refs-api.html#shallowref
    // 未理解，稍后看。
    // const convert = <T extends unknown>(val: T): T =>
    //   isObject(val) ? reactive(val) : val
    // convert对对象做了一层reactive封装。
    this._value = _shallow ? _rawValue : convert(_rawValue)
  }

  get value() {

    track(toRaw(this), TrackOpTypes.GET, 'value')
    return this._value
  }

  set value(newVal) {
    // 这里做了一个判断，如果传进来的未添加响应式的新值与原值相同则不调用trigger。
    if (hasChanged(toRaw(newVal), this._rawValue)) {
      this._rawValue = newVal
      this._value = this._shallow ? newVal : convert(newVal)
      trigger(toRaw(this), TriggerOpTypes.SET, 'value', newVal)
    }
  }
}

function createRef(rawValue: unknown, shallow = false) {
  if (isRef(rawValue)) {
    return rawValue
  }
  return new RefImpl(rawValue, shallow)
}
```

toRef(s)的代码很简洁：
```javascript
class ObjectRefImpl<T extends object, K extends keyof T> {
  public readonly __v_isRef = true

  constructor(private readonly _object: T, private readonly _key: K) {}

  get value() {
    return this._object[this._key]
  }

  set value(newVal) {
    this._object[this._key] = newVal
  }
}

export function toRef<T extends object, K extends keyof T>(
  object: T,
  key: K
): ToRef<T[K]> {
  return isRef(object[key])
    ? object[key]
    : (new ObjectRefImpl(object, key) as any)
}
```

toRef的目的是不让已经有响应式对象的响应链失效。

```javascript
const state = reactive({
  foo: 1,
  bar: 2
})

const fooRef = toRef(state, 'foo')

fooRef.value++
console.log(state.foo) // 2

state.foo++
console.log(fooRef.value) // 3
```

如果不用加一层包裹，根据Js的传递值的引用来看只有Array或者Object的会保留响应链。

```javascript
const state = reactive({
foo: {
    value: 1
},
bar: 2
})

const fooRef = {
    foo: state.foo
}

fooRef.foo.value++
console.log(state.foo) // 2

state.foo.value++
console.log(fooRef.foo) // 3
```

相联系的内容有深浅拷贝以及Vue中注册事件时`@click="xxx"`和`@click="xxx()"`的区别。


customRef:

```javascript
class CustomRefImpl<T> {
  private readonly _get: ReturnType<CustomRefFactory<T>>['get']
  private readonly _set: ReturnType<CustomRefFactory<T>>['set']

  public readonly __v_isRef = true

  constructor(factory: CustomRefFactory<T>) {
    const { get, set } = factory(
      () => track(this, TrackOpTypes.GET, 'value'),
      () => trigger(this, TriggerOpTypes.SET, 'value')
    )
    this._get = get
    this._set = set
  }

  get value() {
    return this._get()
  }

  set value(newVal) {
    this._set(newVal)
  }
}

export function customRef<T>(factory: CustomRefFactory<T>): Ref<T> {
  return new CustomRefImpl(factory) as any
}
```


```javascript
function useDebouncedRef(value, delay = 200) {
  let timeout
  return customRef((track, trigger) => {
    return {
      get() {
        track()
        return value
      },
      set(newValue) {
        clearTimeout(timeout)
        timeout = setTimeout(() => {
          value = newValue
          trigger()
        }, delay)
      }
    }
  })
}

export default {
  setup() {
    return {
      text: useDebouncedRef('hello')
    }
  }
}
```
这里track和trigger由参数传入，从而达到保留原来的响应能力并且扩展原ref的目的。

这应该是一个典型的符合开发闭合原则的例子，ref不支持在修改，但是可以扩展。

# effect

由ref中延伸出来两个存在于effect中的函数，tract和trigger，这两个分别是在getter和setter中调用的。

```javascript
export function track(target: object, type: TrackOpTypes, key: unknown) {
  // 这两个变量初始化为 true 和 undefined。
  // activeEffect会在effect函数中被调用初始化，具体在哪调用的effect尚不清楚。
  if (!shouldTrack || activeEffect === undefined) {
    return
  }

  // targetMap是一个weakMap
  // https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/WeakMap
  // weakMap是一个弱引用的对象合集
  // 弱引用的好处是不会影响垃圾回收，如果实际业务中没有地方在引用这个target那么也不应该存在这么一个响应式。
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    // 如果不存在这么一个track的对象，那么则在weakMap里设置一个。
    // 给这个target设置了一个Map，并且赋值给depsMap了，之前一直觉得这是一个不好的写法= =。
    targetMap.set(target, (depsMap = new Map()))
  }

  // 在ref中的时候这个key是value。
  let dep = depsMap.get(key)
  if (!dep) {
    // 同上的语法，dep是一个set。
    depsMap.set(key, (dep = new Set()))
  }

  if (!dep.has(activeEffect)) {
    dep.add(activeEffect)
    activeEffect.deps.push(dep)
    if (__DEV__ && activeEffect.options.onTrack) {
      activeEffect.options.onTrack({
        effect: activeEffect,
        target,
        type,
        key
      })
    }
  }
}
```

这里要着重看一下activeEffect，具体会在trigger里根据调用。

activeEffect由effect函数执行赋值而来：

```javascript
export function effect<T = any>(
  fn: () => T,
  options: ReactiveEffectOptions = EMPTY_OBJ
): ReactiveEffect<T> {
  if (isEffect(fn)) {
    fn = fn.raw
  }
  const effect = createReactiveEffect(fn, options)
  if (!options.lazy) {
    // 这里紧接着会执行effect，effect是reactiveEffect这个函数。
    effect()
  }
  return effect
}
```

这里传入的fn和options在`runtime-core`的`renderer.ts`里一个很长的函数先不贴了。

```javascript
function createReactiveEffect<T = any>(
  fn: () => T,
  options: ReactiveEffectOptions
): ReactiveEffect<T> {
  const effect = function reactiveEffect(): unknown {
    // 下面active初始化为true。
    if (!effect.active) {
      return options.scheduler ? undefined : fn()
    }
    // effectStack 是一个数组。
    // 这里是一个收集更新，只会加入一次。
    if (!effectStack.includes(effect)) {
      // cleanup会将deps中的effect删除。
      cleanup(effect)
      try {
        enableTracking()
        effectStack.push(effect)
        activeEffect = effect
        // 到这里render函数还未执行，trace也是，fn是传入的渲染函数，真正执行渲染时才会执行ref。
        // 这时候activeEffect已经赋值为effect也就是reactiveEffect函数。
        return fn()
      } finally {
        effectStack.pop()
        resetTracking()
        activeEffect = effectStack[effectStack.length - 1]
      }
    }
  } as ReactiveEffect
  effect.id = uid++
  effect.allowRecurse = !!options.allowRecurse
  effect._isEffect = true
  effect.active = true
  effect.raw = fn
  effect.deps = []
  effect.options = options
  return effect
}
```





关于trigger阅读之前的理解：

Vue中双向绑定的原理就是通过追踪set操作来改变其他用到了这个值的地方的值，如何拿到用到这个地方的值的那个地方需要用get来将这个值标记。

```javascript
export function trigger(
  target: object,
  type: TriggerOpTypes,
  key?: unknown,
  newValue?: unknown,
  oldValue?: unknown,
  oldTarget?: Map<unknown, unknown> | Set<unknown>
) {
  // 先检查是否被track，这一步在上面的track中添加，取到的depsMap应是一个Map{value: Set(activeEffect)}
  const depsMap = targetMap.get(target)
  if (!depsMap) {
    // never been tracked
    return
  }

  const effects = new Set<ReactiveEffect>()
  const computedRunners = new Set<ReactiveEffect>()
  const add = (effectsToAdd: Set<ReactiveEffect> | undefined) => {
    if (effectsToAdd) {
      effectsToAdd.forEach(effect => {
        // Set中的内容做一个forEach
        // 这边暂且把我绕晕了。
        // 一会跑一跑打断点看一看。
        if (effect !== activeEffect || !shouldTrack) {
          if (effect.options.computed) {
            computedRunners.add(effect)
          } else {
            effects.add(effect)
          }
        } else {
          // the effect mutated its own dependency during its execution.
          // this can be caused by operations like foo.value++
          // do not trigger or we end in an infinite loop
        }
      })
    }
  }
  
  // 这里type等于SET
  if (type === TriggerOpTypes.CLEAR) {
    // collection being cleared
    // trigger all effects for target
    depsMap.forEach(add)
  } else if (key === 'length' && isArray(target)) {
    depsMap.forEach((dep, key) => {
      if (key === 'length' || key >= (newValue as number)) {
        add(dep)
      }
    })
  } else {
    // schedule runs for SET | ADD | DELETE
    if (key !== void 0) {
      add(depsMap.get(key))
    }
    // also run for iteration key on ADD | DELETE | Map.SET
    const isAddOrDelete =
      type === TriggerOpTypes.ADD ||
      (type === TriggerOpTypes.DELETE && !isArray(target))
    if (
      isAddOrDelete ||
      (type === TriggerOpTypes.SET && target instanceof Map)
    ) {
      add(depsMap.get(isArray(target) ? 'length' : ITERATE_KEY))
    }
    if (isAddOrDelete && target instanceof Map) {
      add(depsMap.get(MAP_KEY_ITERATE_KEY))
    }
  }

  const run = (effect: ReactiveEffect) => {
    if (__DEV__ && effect.options.onTrigger) {
      effect.options.onTrigger({
        effect,
        target,
        key,
        type,
        newValue,
        oldValue,
        oldTarget
      })
    }
    if (effect.options.scheduler) {
      effect.options.scheduler(effect)
    } else {
      effect()
    }
  }

  // Important: computed effects must be run first so that computed getters
  // can be invalidated before any normal effects that depend on them are run.
  computedRunners.forEach(run)
  effects.forEach(run)
}
```