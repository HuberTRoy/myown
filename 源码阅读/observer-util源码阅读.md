# 缘起

Vue3的响应式有个地方卡住了，听说这个是个五脏全的麻雀，起锅炖了。

# 开始

根据官网的例子：

```javascript
import { observable, observe } from '@nx-js/observer-util';

const counter = observable({ num: 0 });
const countLogger = observe(() => console.log(counter.num));

// this calls countLogger and logs 1
counter.num++;
```

这两个类似Vue3里的reactive和computed。

这里counter被Proxy封装之后，为什么countLogger可以会收集到counter？

那只有一种方式就是通过observable里的getter做的添加。

确实如此：

整个执行逻辑是这样的：

1. observable 会为这个观察的对象添加一个handler，在get的handler中有一个`registerRunningReactionForOperation({ target, key, receiver, type: 'get' })`
```javascript
// register the currently running reaction to be queued again on obj.key mutations
export function registerRunningReactionForOperation (operation) {
  // get the current reaction from the top of the stack
  const runningReaction = reactionStack[reactionStack.length - 1]
  if (runningReaction) {
    debugOperation(runningReaction, operation)
    registerReactionForOperation(runningReaction, operation)
  }
}
```

这个函数会获取出一个reaction，并且通过registerReactionForOperation保存。

```javascript
export function registerReactionForOperation (reaction, { target, key, type }) {
  if (type === 'iterate') {
    key = ITERATION_KEY
  }

  const reactionsForObj = connectionStore.get(target)
  let reactionsForKey = reactionsForObj.get(key)
  if (!reactionsForKey) {
    reactionsForKey = new Set()
    reactionsForObj.set(key, reactionsForKey)
  }
  // save the fact that the key is used by the reaction during its current run
  if (!reactionsForKey.has(reaction)) {
    reactionsForKey.add(reaction)
    reaction.cleaners.push(reactionsForKey)
  }
}
```

这里生成了一个set，根据key，也就是实际业务中get时候的key，将这个reaction添加进set中，整个的结构是这样的：

```javascript
connectionStore<weakMap>: {
    // target eg: {num: 1}
    target: <Map>{
        num: (reaction1, reaction2...)
    }
}
```

注意这里的reaction，`const runningReaction = reactionStack[reactionStack.length - 1]` 通过全局变量reactionStack获取到的。

```javascript
export function observe (fn, options = {}) {
  // wrap the passed function in a reaction, if it is not already one
  const reaction = fn[IS_REACTION]
    ? fn
    : function reaction () {
      return runAsReaction(reaction, fn, this, arguments)
    }
  // save the scheduler and debugger on the reaction
  reaction.scheduler = options.scheduler
  reaction.debugger = options.debugger
  // save the fact that this is a reaction
  reaction[IS_REACTION] = true
  // run the reaction once if it is not a lazy one
  if (!options.lazy) {
    reaction()
  }
  return reaction
}

export function runAsReaction (reaction, fn, context, args) {
  // do not build reactive relations, if the reaction is unobserved
  if (reaction.unobserved) {
    return Reflect.apply(fn, context, args)
  }

  // only run the reaction if it is not already in the reaction stack
  // TODO: improve this to allow explicitly recursive reactions
  if (reactionStack.indexOf(reaction) === -1) {
    // release the (obj -> key -> reactions) connections
    // and reset the cleaner connections
    releaseReaction(reaction)

    try {
      // set the reaction as the currently running one
      // this is required so that we can create (observable.prop -> reaction) pairs in the get trap
      reactionStack.push(reaction)
      return Reflect.apply(fn, context, args)
    } finally {
      // always remove the currently running flag from the reaction when it stops execution
      reactionStack.pop()
    }
  }
}
```

在runAsReaction中，会将传入的reaction(也就是上面的`const reaction = function() { runAsReaction(reaction) }`)执行自己的包裹函数压入栈中，并且执行fn，这里的fn即我们想自动响应的函数，执行这个函数自然会触发get，此时的reactionStack中则会存在这个reaction。这里注意fn如果里面有异步代码的情况，try finally的执行顺序是这样的:

```javascript
// 执行try的内容，
// 如果有return执行return内容，但不会返回，执行finally后返回，这里面不会阻塞。

function test() {
    try { 
        console.log(1); 
        const s = () => { console.log(2); return 4; }; 
        return s();
    } finally { 
        console.log(3) 
    }
}

// 1 2 3 4
console.log(test())

```

所以如果异步代码阻塞并且先于getter执行，那么就不会收集到这个依赖。

