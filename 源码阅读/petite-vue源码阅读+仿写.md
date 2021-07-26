# 缘起

petite-vue是尤大写的简易版Vue，麻雀小五脏全，很适合阅读学习，跟着一起仿写。

直接拉下代码来，checkout到第一次commit。

# 这是一个边读边写的自言自语，不是完整的文章


#### 重新熟悉下响应式系统

首先熟悉一下reactivity，这个我也没有用vue的reactivity，用了之前读observer-util时模仿写的响应式系统，简单说整个reactivity的思路就是订阅发布模型。

```javascript
observerable({})
```

经过observerable的对象会用proxy代理传入该对象，在get中调用trace，set中调用trigger。

有两个全局的对象用于数据存储和交换：

```javascript
const targetMap = new WeakMap()
const activeEffectList = []
```

当trace触发时，会从targetMap中根据get给的target和key来取出存放effect的容器。

```
{
    target: {
        key: new Set(effect1, effect2, effect3...)
    }
}
```

然后trigger的时候，根据target, key来取出这个Set，然后依次执行effect。

之后我们需要让trace知道当前的effect是什么，这就需要另一个函数observe，当observe的时候: `observe(() => { console.log(a.num++) })`传入的函数即为effect，当这个函数执行时将自身存放入activeEffectList，当effect执行自然会触发a.num的get，经由trace添加到targetMap中，之后在将自己从activeEffectList中删除即可。


#### 开肝

```HTML
    <div id="app">
        <div v-data="controller">
            <div v-show="open">"" + (){{ msg }} {{ open }}()</div>
            <div v-show="open" v-red>456 {{ msg }} + 4 6</div>

            <button @click="open = !open">
                toggle me
            </button>
        </div>

    </div>
    <script type="module">
        import { createApp } from './src/main.ts'
        
        let app = createApp()
        app.data("controller", () => {
            return {
                open: true,
                msg: 'hello template'
            }
        })
        app.mount('#app')
    </script>
```

整体是一个这样的API，createApp()类似new Vue()，不过这里用不着单例。

通过app.data可以挂载数据，data期待的第一个参数限定一个作用域不在此作用域下的标签不适用于此对应的data，mount就从传入的element开始替换掉其中的数据，
v-, @这些统称为指令。


```javascript
export function createApp() {
  const ctx: AppContext = {
    scope: reactive({}),
    dirs: Object.create(baseDirs)
  }
  return {
    data(key: string, value: any) {
      ctx.scope[key] = value
    },
    directive(name: string, def?: Directive) {
      if (def) {
        ctx.dirs[name] = def
      } else {
        return ctx.dirs[name]
      }
    },
    mount(el: string | Element) {
      el = typeof el === 'string' ? document.querySelector(el) : el
      if (el) {
        process(el, ctx)
        ;[el, ...el.querySelectorAll(`[v-cloak]`)].forEach((el) =>
          el.removeAttribute('v-cloak')
        )
      } else {
        // TODO
      }
    }
  }
}
```

createApp是一个闭包结构，directive用来自定义指令，data里会将传入的function保存，这里仿写的时候可能会有疑惑，什么时候取出这个数据呢。

这边关于源码的阅读经常会有读不通的地方，尝试了多种不同的阅读方式：

1. 打破砂锅一路解决疑问到底，这个如果最终真的打破了砂锅，是一个我认为最好的方式，有一个前辈来指导的话这种方式我首选。
2. 掌握整体，记录其中的疑问，思考为什么这样编排之后解决其中问题，我个人现在尝试这种方式。
3. 找解析，跟着解析去读，这种方式往往读不下去，感觉用作1和2疑问的补充比较不错。
4. 仿写，理解的会比较深。

所以根据目前的思路，这里有第一个*疑问*：

1. data中的函数什么时候执行。


mount里的v-cloak不知道打了这个标记干啥。el会进行一个判断，支持`#el`的取值也支持取好后的传入。

接下来的核心是process，这里面会开始渲染数据：


```javascript
const dirRE = /^(?:v-|:|@)/
const interpolationRE = /\{\{([^]+?)\}\}/g

function process(node: Node, ctx: AppContext) {
  const type = node.nodeType
  if (type === 1) {
    const el = node as Element
    if (el.hasAttribute('v-pre')) {
      return
    }
    // data scope must be processed first
    const dataExp = el.getAttribute('v-data')
    if (dataExp) {
      ctx = data(ctx, dataExp)
      el.removeAttribute('v-data')
    }
    // element
    for (const { name, value } of [...el.attributes]) {
      if (dirRE.test(name) && name !== 'v-cloak') {
        applyDirective(el, name, value, ctx)
      }
    }
    // process children
    let child = el.firstChild
    while (child) {
      process(child, ctx)
      child = child.nextSibling
    }
  } else if (type === 3) {
    // text
    const data = (node as Text).data
    if (data.includes('{{')) {
      let segments: string[] = []
      let lastIndex = 0
      let match
      while ((match = interpolationRE.exec(data))) {
        segments.push(
          JSON.stringify(data.slice(lastIndex, match.index)),
          `(${match[1]})`
        )
        lastIndex = match.index + match[0].length
      }
      if (lastIndex < data.length - 1) {
        segments.push(JSON.stringify(data.slice(lastIndex)))
      }
      text(node as Text, ctx, segments.join('+'))
    }
  }
}
```

process中根据传入的根元素开始迭代，nodeType是原生方法，1代表是元素，3代表是纯文本，还有很多类型，在nodeType为元素的时候会首先进行data的初始化：

```javascript
function data(ctx: AppContext, exp: string): AppContext {
  const newScope = Object.create(ctx.scope)
  const ret = evaluate(ctx.scope, exp)
  // 注意这一行，如果是function就执行，执行后的结果会加上响应式，evalueate是一个很巧妙的执行函数，后面细细讲。
  const evaluated = typeof ret === 'function' ? ret() : ret
  return {
    ...ctx,
    scope: reactive(Object.assign(newScope, evaluated))
  }
}
```

后面紧接着执行的是对当前标签上指令的解析，具体怎么解析需要看各个指令里得实现。后续会逐行处理之后的数据，注意，原始ctx中的scope并没有变，还是那个函数，不过v-data之后的标签都用的执行后的data。

遇到纯文本的时候会进行一个判断`{{}}`的流程，基本就是用正则匹配出第一个 {{}}，然后把它之前的数据和它自己都加入结果，然后循环直到结束。

```javascript
const text: Directive<Text> = (el, { scope }, value) => {
  effect(() => {
    el.data = evaluate(scope, value)
  })
}
```

关于text很简单，把el.data替换为执行后的结果即可替换文本，这里需要用effect/observe包装，这样一个闭包之后当里面用到的数据改变时又会重新执行这个函数，实现响应式替换。

接下来是最重要的evaluate：

```javascript
const evalCache: Record<string, Function> = Object.create(null)

function evaluate(scope: any, exp: string) {
  const fn =
    evalCache[exp] ||
    (evalCache[exp] = new Function(
      `__scope`,
      `with (__scope) { return (${exp}) }`
    ))
  return fn(scope)
}
```

evaluate实现的非常巧妙：

利用Function函数来动态创建一个可以把字符串当表达式的东西，new Function创建的函数执行时的作用域处于全局，里面用with这个语法来限定为我们传入的data，优先从data里找，当然还做了一个缓存。

此时已经实现了完整的模板显示。

下面还有另一个核心功能————指令。

指令在上面process时初始化时用到了中间函数:

```javascript
function applyDirective(
  el: Element,
  raw: string,
  value: string,
  ctx: AppContext
) {
  let dir: Directive
  let arg: string | undefined
  let modifiers: Record<string, true> | undefined

  // modifiers
  let modMatch: RegExpExecArray | null = null
  while ((modMatch = modRE.exec(raw))) {
    ;(modifiers || (modifiers = {}))[modMatch[1]] = true
    raw = raw.slice(modMatch.index)
  }

  if (raw[0] === ':') {
    dir = bind
    arg = raw.slice(1)
  } else if (raw[0] === '@') {
    dir = on
    arg = raw.slice(1)
  } else {
    const argIndex = raw.indexOf(':')
    const dirName = argIndex > 0 ? raw.slice(2, argIndex) : raw.slice(2)
    dir = ctx.dirs[dirName]
    arg = argIndex > 0 ? raw.slice(argIndex + 1) : undefined
  }
  if (dir) {
    dir(el, ctx, value, arg, modifiers)
    el.removeAttribute(raw)
  } else {
    // TODO
  }
}
```

这里对多种不同的指令做了一些匹配，分别是:/@/v-，`:`在这个简易版里暂时用不到先跳过，先实现v-和@，

@：

```javascript
const on: Directive = (el, { scope }, exp, arg, modifiers) => {
  const handler = simplePathRE.test(exp)
    ? evaluate(scope, `(e => ${exp}(e))`)
    : evaluate(scope, `($event => { ${exp} })`)
  // TODO more modifiers
  el.addEventListener(arg, handler, modifiers)
}
```

这边的handler会做一个匹配，具体的匹配没读，猜测是这样的:
```
@click="xxx" 
```
会自动传入e，`@click="xxx()"`会走第二种情况。

这个地方我能想到的还有很多需要扩展，写业务的时候经常会写：

```javascript
@click="(e) => xxx(e, i)"
```

这个i经常是局部的变量，比如v-for，v-for这个指令在初次commit的时候还未存在。

v-show:

```javascript
const show: Directive<HTMLElement> = (el, { scope }, value) => {
  const initialDisplay = el.style.display
  effect(() => {
    el.style.display = evaluate(scope, value) ? initialDisplay : 'none'
  })
}
```

show还是一个比较容易写的指令的，这里面用evaluate包裹的主要原因是v-show不光可以写变量，也可以写函数，effect/observe用来响应式。
