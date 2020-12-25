这次是一个边读边写的记录，可能会数次推到重来。

# 缘起

一直想读一读热门框架的源码，不过多次浅尝辄止，原因无他就是已经太重不知道怎么入进去。

恰好刚刚读通axios的源码，在划水的时候翻到https://www.v2ex.com/t/737048?p=1 这里提到一个gzip后不足1kb的[react](https://github.com/yisar/fre)，代码量极少，非常适合入门（私以为）。

# 路标

1. render是如何运作的。
2. hooks写法的实现。
3. 是否有机会窥一窥Diff算法实现。

# 开始

从入口开始，跑起自带的demo，

```javascript
import { h, render, useEffect, useState } from '../../src/index'

function App() {
  const [count, setCount] = useState(0)
  // const [two, setTwo] = useState(0)
  return (
    <div>
      <button onClick={() => setCount(count + 1)}>{count}</button>
    </div>
  )
}
render(<App />, document.body)

```

hooks写法和Jsx的用法没有什么奇怪的，但...为啥Jsx可以是一个有效的Js写法让我有一些困扰，比较直接放到浏览器里不是一个正经的Js函数格式，这里必定存在一个“编译器”。

在写React的时候其实已经有了这个疑问，当时认定是React提供了一个“编译器”来编译这些内容，没有继续深究，这里深究一下。

h方法导入之后是有用到的，只是没看到如何用到的，给render里打断点可以看到的是第一个参数正是经由h方法所处理过的返回值。但这里有区别的是React里调用的是import { React } from 'React'，这里变成了h。

这个方法的设置在`tsconfig.json`里：

```json
{
  "compilerOptions": {
    "target": "esnext",
    "module": "commonjs",
    "strict": false,
    "jsx": "react",
    "jsxFactory": "h",
    "rootDir": "./src",
    "incremental": true,
    "experimentalDecorators": true,
    "lib": ["dom", "es2015"],
  }
```

jsx和jsxFactory所指定的即是编译时所调用的方法。

# h

在h方法的上方rfc里可以读到：

```javascript
function Foo() {
  return <div />;
}

import {jsx} from "react";
function Foo() {
  return jsx('div', ...);
}
```

这两者是等价的关系（虽然不是原文这样说的）。

输出的dist也可以看到demo中的App被编译成了：

```javascript
function App() {
  var _index_1$useState = index_1.useState(0),
      _index_1$useState2 = _slicedToArray(_index_1$useState, 2),
      count = _index_1$useState2[0],
      setCount = _index_1$useState2[1]; // const [two, setTwo] = useState(0)


  return index_1.h("div", null, index_1.h("button", {
    onClick: function onClick() {
      return setCount(count + 1);
    }
  }, count));
}
```

简单来看是一个递归的模型。

```javascript
export const h = function <P extends Attributes = {}>(type: FC<P>, attrs: P): Partial<IFiber> {
  const props = attrs || ({} as P) // type是传入的第一个参数，一般是标签字符串"div"，"button"，attrs是第二个参数，看下面的例子。
  const key = props.key || null // <div key="1" onClick="() => {}" /> key和onClick都会被当成attrs所传入。如上面编译后的button中的onClick
  const ref = props.ref || null // 同上。

  const children: FreNode[] = []
  let simple = ''
  const len = arguments.length
  for (let i = 2; i < len; i++) { // 这里从第二个开始，上面编译后的源码中得知，第一个是参数是标签名，第二个是写在上面的属性，从第三个（下标2）开始则是chilren。
    let child = arguments[i]
    const end = i === len - 1
    // if vnode is a nest array, flat them first
    // 这边注释只说了这样做的目的没说为什么，解释下，react中的循环组件要写成[1,2,3].map((item) => { })的形式，编译后是[1,2,3].map((item) => { h(item) })这样。
    while (isArr(child) && child.some((v) => isArr(v))) {
      child = [].concat(...child)
    }

    // 这个some和数组的some不同，数组的some是只要有一个符合传入的函数判断即是true。
    // 这里这个some是作者自己写的，非null，非Boolean值则是true。
    const vnode = some(child) ? child : ''
    const str = isStr(vnode)

    // merge simple nodes
    if (str) simple += String(vnode)
    if (simple && (!str || end)) {
      children.push(createText(simple))
      simple = ''
    }
    if (!str) children.push(vnode)
  }

  if (children.length) {
    // if there is only on child, it not need an array, such as child use as a function
    props.children = children.length === 1 ? children[0] : children
  }
  // delete them to reduce loop performance
  delete props.key
  

  return { type, props, key, ref } as Partial<IFiber>
}
```



# render

读懂了h是读通render的第一步，上面解析出来了h，最后的返回的是一个

```json
{
    type: 'div',
    props: {
        children: [
            {
                type: 'button',
                props: [
                    {
                        type: 'text',
                        props: [
                            {
                                nodeValue: '0'
                            },
                            [
                                {
                                    type: 'span', ....
                                }
                            ]
                        ]
                    }
                ]
            }
        ]
    }
}
```
这样的一个嵌套结构。

这个嵌套结构差不多对应AST，render对根元素做了一个封装，render中的这个node是我们传进来的真实node，我们的组件（App）是作为它的chilren去执行。

```javascript
export const render = (vnode: FreElement, node: Node, done?: () => void): void => {
  // 构建根元素。
  // node是document.body。
  // 其children则是写的组件App。  
  const rootFiber = {
    node,
    props: { children: vnode },
    done,
  } as IFiber

  //   
  dispatchUpdate(rootFiber)
}

export const dispatchUpdate = (fiber?: IFiber) => {
  // lane可能防止重新渲染之类的？里面做了一个true的赋值。
  if (fiber && !fiber.lane) {
    fiber.lane = true
    microTask.push(fiber)
  }

  // 这一步最终会执行reconcileWork，参数只有timeout，下面已经标出。
  scheduleWork(reconcileWork as ITaskCallback)
}
```
scheduleWork实际做的是一个60帧刷新率下的每帧回调。

```javascript
const reconcileWork = (timeout: boolean): boolean => {

  if (!WIP) WIP = microTask.shift()
  // shouldYield是一个超时（节流）时间，默认16.6666ms，60帧刷新率下的一帧时间。
  // 超时返回的是true。

  // WIP是上面传过来的节点，这地方必执行，直接看reconcile。   
  while (WIP && (!shouldYield() || timeout)) WIP = reconcile(WIP)

  if (WIP && !timeout) return reconcileWork.bind(null)
  if (preCommit) commitWork(preCommit)
  return null
}
```

在reconcileWork中有一个while循环，这里会进入这个循环直到全局变量WIP为false为止。

```javascript
const reconcile = (WIP: IFiber): IFiber | undefined => {
  // 有可能没有。
  WIP.parentNode = getParentNode(WIP) as HTMLElementEx
  // 如果是函数则进入updateHook逻辑，否则是updateHost逻辑。
  // 这边什么时候会是函数呢，即是初始化一个组件的时候。
  isFn(WIP.type) ? updateHook(WIP) : updateHost(WIP)

  WIP.lane = WIP.lane ? false : 0
  WIP.parent && commits.push(WIP)
  // 有child会返回child，返回之后经由上面的while会再次进入这个循环。  
  if (WIP.child) return WIP.child

  while (WIP) {
    if (!preCommit && WIP.lane === false) {
      preCommit = WIP
      return null
    }
    if (WIP.sibling) return WIP.sibling
    WIP = WIP.parent
  }
}

const updateHook = <P = Attributes>(WIP: IFiber): void => {
  if (WIP.lastProps === WIP.props) return
  currentFiber = WIP
  // 重置hook指针，当前还未知hook的具体实现方式。  
  resetCursor()
  // WIP.type已知是一个函数，WIP.props的传入是为了保证组件内嵌套组件并且传值了。 
  // 如果是一个子组件的话就会进入开辟一个新的渲染循环等待至结束。  
  let children = (WIP.type as FC<P>)(WIP.props)

  if (isStr(children)) children = createText(children as string)

  // 这一步是子组件已经渲染完成。
  reconcileChildren(WIP, children)
}
```

这里WIP如果是一个函数（组件）会执行updateHook，否则是一个updateHost（Jsx）。

为什么WIP是一个函数的时候要进入updateHook呢，这是因为如果是函数的话相当于初始化（重新渲染）了整个组件，hook内容需要重置一下，同时也要优先进行子组件的渲染`let children = (WIP.type as FC<P>)(WIP.props)`。

```javascript
const updateHost = (WIP: IFiber): void => {
  // 无node的话会生成一个node。    
  if (!WIP.node) {
    if (WIP.type === 'svg') WIP.op |= 1 << 4

    // 生成一个真实的HTML node。
    WIP.node = createElement(WIP) as HTMLElementEx
  }
  const p = WIP.parent || {}
  WIP.insertPoint = (p as IFiber).last || null
  ;(p as IFiber).last = WIP
  WIP.last = null
  reconcileChildren(WIP, WIP.props.children)
}

```

注意这里的第三行，没有WIP.node的话会生成一个WIP.node，这里createElement在`dom.ts`里:

```javascript
export const createElement = <P = Attributes>(fiber: IFiber) => {
  const dom =
    fiber.type === 'text'
      ? document.createTextNode('')
      : fiber.op & (1 << 4)
      ? document.createElementNS(
          'http://www.w3.org/2000/svg',
          fiber.type as string
        )
      : document.createElement(fiber.type as string)
  updateElement(dom as DOM, {} as P, fiber.props as P)
  return dom
}
```

updateElement会对写的各个属性进行绑定：

```javascript
export const updateElement = <P extends Attributes>(
  dom: DOM,
  oldProps: P,
  newProps: P
) => {
  for (let name in { ...oldProps, ...newProps }) {
    let oldValue = oldProps[name]
    let newValue = newProps[name]

    if (oldValue === newValue || name === 'children') {
    } else if (name === 'style') {
      for (const k in { ...oldValue, ...newValue }) {
        if (!(oldValue && newValue && oldValue[k] === newValue[k])) {
          ;(dom as any)[name][k] = newValue?.[k] || ''
        }
      }
    } else if (name[0] === 'o' && name[1] === 'n') {
        // 对onXXX的事件进行绑定。
      name = name.slice(2).toLowerCase() as Extract<keyof P, string>
      if (oldValue) dom.removeEventListener(name, oldValue)
      dom.addEventListener(name, newValue)
    } else if (name in dom && !(dom instanceof SVGElement)) {
      // for property, such as className
      ;(dom as any)[name] = newValue || ''
    } else if (newValue == null || newValue === false) {
      dom.removeAttribute(name)
    } else {
      // for attributes
      dom.setAttribute(name, newValue)
    }
  }
}
```

回到reconcileWork，最后会执行commitWork：

```javascript
const commitWork = (fiber: IFiber): void => {
  commits.forEach(commit)
  fiber.done?.()
  commits = []
  preCommit = null
  WIP = null
}

const commit = (fiber: IFiber): void => {
  const { op, parentNode, node, ref, hooks } = fiber
  if (op & (1 << 3)) {
    hooks?.list.forEach(cleanup)
    cleanupRef(fiber.kids)
    while (isFn(fiber.type)) fiber = fiber.child
    parentNode.removeChild(fiber.node)
  } else if (isFn(fiber.type)) {
    if (hooks) {
      side(hooks.layout)
      schedule(() => side(hooks.effect))
    }
  } else if (op & (1 << 2)) {

    //  这边是update。
    updateElement(node, fiber.lastProps, fiber.props)
  } else {
    const point = fiber.insertPoint ? fiber.insertPoint.node : null
    const after = point ? point.nextSibling : parentNode.firstChild
    if (after === node) return
    if (after === null && node === parentNode.lastChild) return
    // 这边是insert。
    // node是上面updateHost所生成的node。
    // 这一步走完之后，HTML上已经存在了真实的dom。
    parentNode.insertBefore(node, after)
  }
  refer(ref, node)
}
```


# hooks

用前端框架写业务的两个核心一个是数据的处理，一个是数据的改变，上面的render和h是对数据进行处理后的渲染。hooks则是针对的数据的改变。

hooks的调用时机在render中的updateHook，hooks是声明在函数组件一开始的，所以`let children = (WIP.type as FC<P>)(WIP.props)`时会首先执行hooks。


```javascript
export const useState = <T>(initState: T): [T, Dispatch<SetStateAction<T>>] => {
  return useReducer(null, initState)
}
```

```javascript
export const useReducer = <S, A>(reducer?: Reducer<S, A>, initState?: S): [S, Dispatch<A>] => {
  const [hook, current]: [any, IFiber] = getHook<S>(cursor++)
  hook[0] = isFn(hook[1]) ? hook[1](hook[0]) : hook.length ? hook[1] : initState
  return [
    hook[0] as S,
    (action: A | Dispatch<A>) => {
      hook[1] = reducer ? reducer(hook[0], action as A) : action

      // 这个不清楚是什么用，可能要配合其他hooks使用。  
      hook[2] = reducer && (action as any).type[0] === '*' ? 0b1100 : 0b1000

      // 这边重新进行渲染。   
      dispatchUpdate(current)
    },
  ]
}
```

useState其实是useReducer，useReducer的返回值是getHook的内容。

```javascript
export const getHook = <S = Function | undefined, Dependency = any>(cursor: number): [[S, Dependency], IFiber] => {
  const current: IFiber<any> = getCurrentFiber()

  // 这边对hooks进行了初始化赋值。
  const hooks = current.hooks || (current.hooks = { list: [], effect: [], layout: [] })
  
  // cursor应该始终对应一组hooks，如果cursor与hooks的长度相同则表示当前cursor并不存在对应的hooks，下标从0开始。  
  if (cursor >= hooks.list.length) {
    hooks.list.push([] as IEffect)
  }

  // 第一个参数返回对应的hooks，第二个参数这里是获取到的node。  
  return [(hooks.list[cursor] as unknown) as [S, Dependency], current]
}
```

getCurrentFiber在render里updateHooks的时候会赋值当前的函数组件节点。


# 暂时的结束

比较粗糙的一次分析，弄通整个流程也是花了一些时间，内容理解的还不够细致，先写业务了，基于这次的分析大致已经梳理了一遍，下次从自己实现h方法开始重新进行一次。

一开始的几个问题：

1. render：由h方法从根节点开始抽象成一个AST，将根函数组件也作为一个子组件放置到其中，子组件通过递归的方式渲染，svg单独处理。

2. hooks: 这里hooks只看了state，算是维护一个全局的vnode对象，里面有原值，set的时候会赋值传递进来的新值，之后和猜测的一致调用render从那个组件下重新渲染。

3. 关于diff，在这个框架里没有看到有关于key的处理，应该是没有实现。

