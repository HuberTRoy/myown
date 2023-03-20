开发体验翻倍的秘笈 ———— TypeScript 类型体操挑战（二）

![](./cover.gif)

# 前情回顾

[开发体验翻倍的秘笈 ———— TypeScript 类型体操挑战（一）](https://juejin.cn/post/7206208345605849149)

# 前言

如果没刷过一，接下来的内容会造成一定的困扰，建议由浅入深，先刷一下 easy 难度的题目，至少掌握一下 infer，迭代的写法~，掌握之后前面的 medium 内容基本不会造成很大的困难~。

# 开始挑战

## GetReturnType

[Take the Challenge](https://tsch.js.org/2/play/zh-CN)

```
不使用 ReturnType 实现 TypeScript 的 ReturnType<T> 泛型。

例如：

const fn = (v: boolean) => {
  if (v)
    return 1
  else
    return 2
}

type a = MyReturnType<typeof fn> // 应推导出 "1 | 2"
```

<details>
<summary>查看答案：</summary>

```ts
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never;
```

</details>

要得到返回值的类型，就需要用到`infer`来推导。

## Omit

[Take the Challenge](https://tsch.js.org/3/play/zh-CN)

```
不使用 Omit 实现 TypeScript 的 Omit<T, K> 泛型。

Omit 会创建一个省略 K 中字段的 T 对象。

例如：

interface Todo {
  title: string
  description: string
  completed: boolean
}

type TodoPreview = MyOmit<Todo, 'description' | 'title'>

const todo: TodoPreview = {
  completed: false,
}
```

<details>
<summary>查看答案：</summary>

```ts
type MyOmit<T, K> = { [Key in keyof T as Key extends K ? never : Key]: T[Key] };
```

</details>

实现 Omit 并不困难，在 Object 类型里 key 如果是 never 的话就不会被设置。

## Readonly 2

[Take the Challenge](https://tsch.js.org/8/play/zh-CN)

```
实现一个通用MyReadonly2<T, K>，它带有两种类型的参数T和K。

K指定应设置为Readonly的T的属性集。如果未提供K，则应使所有属性都变为只读，就像普通的Readonly<T>一样。

例如

interface Todo {
  title: string
  description: string
  completed: boolean
}

const todo: MyReadonly2<Todo, 'title' | 'description'> = {
  title: "Hey",
  description: "foobar",
  completed: false,
}

todo.title = "Hello" // Error: cannot reassign a readonly property
todo.description = "barFoo" // Error: cannot reassign a readonly property
todo.completed = true // OK
```

<details>
<summary>查看答案：</summary>

```ts
type MyReadonly2<T, K = keyof T> = {
  readonly [Key in keyof T as Key extends K ? Key : never]: T[Key];
} & { [Key in keyof T as Key extends K ? never : Key]: T[Key] };
```

</details>

要实现 readonly 在 Ts 里只有一条路可以走，只要先排除在合并就可以了。

## Deep Readonly

[Take the Challenge](https://tsch.js.org/9/play/zh-CN)

```
实现一个通用的DeepReadonly<T>，它将对象的每个参数及其子对象递归地设为只读。

您可以假设在此挑战中我们仅处理对象。数组，函数，类等都无需考虑。但是，您仍然可以通过覆盖尽可能多的不同案例来挑战自己。

例如

type X = {
  x: {
    a: 1
    b: 'hi'
  }
  y: 'hey'
}

type Expected = {
  readonly x: {
    readonly a: 1
    readonly b: 'hi'
  }
  readonly y: 'hey'
}

type Todo = DeepReadonly<X> // should be same as `Expected`
```

<details>
<summary>查看答案：</summary>

```ts
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends Function
    ? T[K]
    : T[K] extends Record<any, any>
    ? DeepReadonly<T[K]>
    : T[K];
};
```

</details>

还记得刚学 Js 时被 DeepCopy 折磨的恐惧吗？上吧，Ts 里处处都是递归~。记得 Function 也是 Object 的子类，需要额外判断一下。

## Tuple to Union

[Take the Challenge](https://tsch.js.org/10/play/zh-CN)

```
实现泛型TupleToUnion<T>，它返回元组所有值的合集。

例如

type Arr = ['1', '2', '3']

type Test = TupleToUnion<Arr> // expected to be '1' | '2' | '3'
```

<details>
<summary>查看答案：</summary>

```ts
type TupleToUnion<T> = T extends [infer F, ...infer L]
  ? F | TupleToUnion<L>
  : never;
```

</details>

在 Ts 里，迭代数组的方式是 infer + 递归完成的。

## Last

[Take the Challenge](https://tsch.js.org/15/play/zh-CN)

```
实现一个通用Last<T>，它接受一个数组T并返回其最后一个元素的类型。

例如

type arr1 = ['a', 'b', 'c']
type arr2 = [3, 2, 1]

type tail1 = Last<arr1> // expected to be 'c'
type tail2 = Last<arr2> // expected to be 1

```

<details>
<summary>查看答案：</summary>

```ts
type Last<T extends any[]> = T extends [infer F, ...infer L]
  ? L extends []
    ? F
    : Last<L>
  : T;
```

</details>

思路与 Tuple to Union 差不了太多，关键词数组的迭代和递归。

## Pop

[Take the Challenge](https://tsch.js.org/16/play/zh-CN)

```
实现一个通用Pop<T>，它接受一个数组T，并返回一个由数组T的前length-1项以相同的顺序组成的数组。

例如

type arr1 = ['a', 'b', 'c', 'd']
type arr2 = [3, 2, 1]

type re1 = Pop<arr1> // expected to be ['a', 'b', 'c']
type re2 = Pop<arr2> // expected to be [3, 2]
额外：同样，您也可以实现Shift，Push和Unshift吗？
```

<details>
<summary>查看答案：</summary>

```ts
1;
type Pop<T extends any[], NT extends any[] = []> = T extends [
  infer F,
  ...infer L
]
  ? L extends []
    ? NT
    : Pop<L, [...NT, F]>
  : NT;

2;
type Pop<T extends any[]> = T extends [...infer F, infer L] ? F : T;
```

</details>

在 Js 中可能最快想到的是创建一个新的数组，然后判断是不是最后一个元素，如果是的话就返回新的数组，不是的话就把元素塞在里面继续迭代，在 Ts 里我们仍然可以用这个方法。不过这里我们还可以用另外一种 infer 方式，Ts 不仅可以用`[infer F, ...infer L]`来推断出数组内第一个和剩下的元素，还可以用如`[infer F, ...infer M, infer L]`这样的写法推断更多种的形式。

## Chainable Options

[Take the Challenge](https://tsch.js.org/12/play/zh-CN)

```
在 JavaScript 中我们经常会使用可串联（Chainable/Pipeline）的函数构造一个对象，但在 TypeScript 中，你能合理的给它赋上类型吗？

在这个挑战中，你可以使用任意你喜欢的方式实现这个类型 - Interface, Type 或 Class 都行。你需要提供两个函数 option(key, value) 和 get()。在 option 中你需要使用提供的 key 和 value 扩展当前的对象类型，通过 get 获取最终结果。

例如

declare const config: Chainable

const result = config
  .option('foo', 123)
  .option('name', 'type-challenges')
  .option('bar', { value: 'Hello World' })
  .get()

// 期望 result 的类型是：
interface Result {
  foo: number
  name: string
  bar: {
    value: string
  }
}
你只需要在类型层面实现这个功能 - 不需要实现任何 TS/JS 的实际逻辑。

你可以假设 key 只接受字符串而 value 接受任何类型，你只需要暴露它传递的类型而不需要进行任何处理。同样的 key 只会被使用一次。
```

<details>
<summary>查看答案：</summary>

```ts
type Chainable<T = {}> = {
  option<Key extends string, Val extends any>(
    key: Key,
    value: Val
  ): Chainable<Omit<T, Key> & Record<Key, Val>>;
  get(): T;
};
```

</details>

这里我们需要解决三个问题：

1. 如何进行链式调用。
2. 如何将 option 中的 key 和 value 对应的类型给取到。
3. 同样的 key 不同类型应该被覆盖而不是共存。

要解决第一个问题这里我们应该让 option 的返回值仍然是 Chainable，同时 Chainable 接受的参数是已存储到的类型。

第二个问题我们需要将 option 进行一下改造`option(key: string, val: any)`这种情况下我们通过`typeof key`取到的只能是`string/number`这种基础类型，但题目里要求的是准确类型，这里我们将 key 和 value 的类型给变成一个泛型，当我们不传泛型的时候 Ts 也可以自己进行推断`option<KEY extends string, VAL>(key: KEY, val: VAL)`。

第三个问题很好解决了，我们才刚刚实现了`Omit`。

# 最后

初次 Medium 挑战之旅暂时结束~，希望本文对你有所帮助~。

如果对其中的写法感到一些困扰，可以看一下[开发体验翻倍的秘笈 ———— TypeScript 类型体操挑战（一）](https://juejin.cn/post/7206208345605849149)里对这些写法的溯源~。

最后的最后，路过的大哥哥小姐姐~。
