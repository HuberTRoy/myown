# 前情回顾

[开发体验翻倍的秘籍 ———— TypeScript 类型体操挑战（一）](https://juejin.cn/post/7206208345605849149)

[开发体验翻倍的秘籍 ———— TypeScript 类型体操挑战（二）](https://juejin.cn/post/7209826725366366265)

# 前言

如果没有刷过一，接下来的内容会造成一定的困扰，建议由浅入深，先刷一下 easy 难度的题目~。

# 开始挑战

## Promise.all

[Take the Challenge](https://tsch.js.org/20/play/zh-CN)

```
键入函数PromiseAll，它接受PromiseLike对象数组，返回值应为Promise<T>，其中T是解析的结果数组。

const promise1 = Promise.resolve(3);
const promise2 = 42;
const promise3 = new Promise<string>((resolve, reject) => {
  setTimeout(resolve, 100, 'foo');
});

// expected to be `Promise<[number, 42, string]>`
const p = PromiseAll([promise1, promise2, promise3] as const)
```

<details>
<summary>查看答案：</summary>

```ts
type getPromiseVal<T> = T extends Promise<infer P> ? P : T;

declare function PromiseAll<T extends any[]>(
  values: readonly [...T]
): Promise<{ [K in keyof T]: getPromiseVal<T[K]> }>;
```

</details>

这个思路并不困难，在经过前面问题的洗礼之后已经知道用泛型来代替直接写类型好让 Ts 可以拿到类型，`{[K in keyof Array]: ...}`的写法迭代出来还是一个数组，对于`Promise<number>`的值想要检测出`number`用 infer 关键字也可以轻松实现。有点需要特殊对待的是对于特定的`Array<number | Promise<number>>`的类型，需要借助一个帮助`type`来实现迭代出来。忘了怎么[遍历联合类型](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types)？

## Type Lookup

[Take the Challenge](https://tsch.js.org/62/play/zh-CN)

```
有时，您可能希望根据某个属性在联合类型中查找类型。

在此挑战中，我们想通过在联合类型Cat | Dog中搜索公共type字段来获取相应的类型。换句话说，在以下示例中，我们期望LookUp<Dog | Cat, 'dog'>获得Dog，LookUp<Dog | Cat, 'cat'>获得Cat。

interface Cat {
  type: 'cat'
  breeds: 'Abyssinian' | 'Shorthair' | 'Curl' | 'Bengal'
}

interface Dog {
  type: 'dog'
  breeds: 'Hound' | 'Brittany' | 'Bulldog' | 'Boxer'
  color: 'brown' | 'white' | 'black'
}

type MyDog = LookUp<Cat | Dog, 'dog'> // expected to be `Dog`
```

<details>
<summary>查看答案：</summary>

```ts
type LookUp<U, T> = U extends { type: T } ? U : never;
```

</details>

上面我们刚回顾了如何遍历联合类型，或许你也想过用`(Cat | Dog)['type']`的形式让联合类型分别变成`Cat['type']`, `Dog['type']`的遍历，但它并没有回应你的期望，`(Cat | Dog)['type']`返回了`'cat' | 'dog'`的联合类型。

## Trim Left

[Take the Challenge](https://tsch.js.org/106/play/zh-CN)

```
实现 TrimLeft<T> ，它接收确定的字符串类型并返回一个新的字符串，其中新返回的字符串删除了原字符串开头的空白字符串。

例如

type trimed = TrimLeft<'  Hello World  '> // 应推导出 'Hello World  '
```

<details>
<summary>查看答案：</summary>

```ts
type TrimLeft<S extends string> = S extends `${" " | "\t" | "\n"}${infer L}`
  ? TrimLeft<L>
  : S;
```

</details>

对于数组的 infer，我们可以用`[infer F, ...infer L]`来实现。对于字符串的遍历，TypeScript 提供的方法是用[模板字符串](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-1.html#template-literal-types)来实现，实现了 Trim Left 可以在实现一下[Trim](https://tsch.js.org/108/play/zh-CN)巩固一下~。

## Replace

[Take the Challenge](https://tsch.js.org/116/play/zh-CN)

```
实现 Replace<S, From, To> 将字符串 S 中的第一个子字符串 From 替换为 To 。

例如

type replaced = Replace<'types are fun!', 'fun', 'awesome'> // 期望是 'types are awesome!'
```

<details>
<summary>查看答案：</summary>

```ts
type Replace<
  S extends string,
  From extends string,
  To extends string
> = From extends ""
  ? S
  : S extends `${infer F}${From}${infer L}`
  ? `${F}${To}${L}`
  : S;
```

</details>

字符串的 infer 有点像正则，我们的任务是收窄它的范围，实现了 Replace 可以在实现一下[ReplaceAll](https://tsch.js.org/119/play)，思路都是一样的。

## Append Arguement

[Take the Challenge](https://tsch.js.org/191/play/zh-CN)

```
实现一个泛型 AppendArgument<Fn, A>，对于给定的函数类型 Fn，以及一个任意类型 A，返回一个新的函数 G。G 拥有 Fn 的所有参数并在末尾追加类型为 A 的参数。

type Fn = (a: number, b: string) => number

type Result = AppendArgument<Fn, boolean>
// 期望是 (a: number, b: string, x: boolean) => number
```

<details>
<summary>查看答案：</summary>

```ts
type AppendArgument<Fn, A> = Fn extends (...args: infer Arg) => infer R
  ? (...args: [...Arg, A]) => R
  : Fn;
```

</details>

我们之前已知如何 infer 到函数的参数和返回值`(...args: infer Arg)=> infer R`，第二点是函数参数的名称对于 Type 来说并不重要。

## Permutation

[Take the Challenge](https://tsch.js.org/296/play/zh-CN)

```
实现联合类型的全排列，将联合类型转换成所有可能的全排列数组的联合类型。

type perm = Permutation<'A' | 'B' | 'C'>; // ['A', 'B', 'C'] | ['A', 'C', 'B'] | ['B', 'A', 'C'] | ['B', 'C', 'A'] | ['C', 'A', 'B'] | ['C', 'B', 'A']

```

<details>
<summary>查看答案：</summary>

```ts
type Permutation<T, TT = T> = [T] extends [never]
  ? []
  : T extends infer U
  ? [U, ...Permutation<Exclude<TT, U>>]
  : [];
```

</details>

此题完美秉承了字数越少越难写的原则= =。

我们知道当我们传入了一个联合类型`X | X1`并进行 extends 的时候，Ts 实际上执行的是`Type<X> | Type<X2>`的行为，Ts 将`X | X1`分别过了一遍`Type`调用，接下来我们一步步分析。

首先定义了一个：
`type Permutation<T> = T extends infer U ? [U] : []`

这时我们用`Permutation<'A' | 'B' | 'C'>`会得到`['A'] | ['B'] | ['C']`的期望结果。

同时我们测试一下`['A', ...Permutation<'B' | 'C'>]`得到的类型是`['A', 'B'] | ['A', 'C']`，所以我们明确了接下来的思路，Permutation 每次都取出联合类型中的一个类型，同时把此类型从联合类型中去除，并再次执行 Permutation，最后将数次的结果汇聚起来，直到联合类型最终被清空(never)。

按照这个思路：

1. 定义一个额外的泛型，来获取整个联合类型。

```
type Permutation<T，TT=T> = T extends infer U ? [U] : []
```

遍历的时候我们的 T 已经变成单个类型了，想要获取除 T 类型外的其他联合类型我们需要保存原始的联合类型。

2. 去除类型 T，执行 Permutation，并将结果汇聚。

```
type Permutation<T, TT=T> = T extends infer U ? [U, ...Permutation<Exclude<TT, U>>] : []
```

这里直接用 Exclude 即可，或者也可以自己实现，只要将符合条件的类型返回 never 就将那个类型从联合类型中去除了。

3. Exclude 一直递归下去，最终会返回 never，需要判断 never 并结束。

   或许你会想判断 never 直接`T extends never`不就完事了，但很可惜在 Ts 里需要做做体操才行(误~)，我们需要`[T] extends [never]`来判断泛型 T 是不是 never，关于为什么需要这样的解释可以看这个[Issue](https://github.com/microsoft/TypeScript/issues/31751)。

   简单来讲当我们给泛型 T 进行`extends`关键字检查时，如果是联合类型，Ts 则做了一个叫[Distributive](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types)的检查（也就是遍历联合类型的方式），而 never 是所有类型的子类型也可以理解为空的联合类型，所以当进行`T extends never`的检查时，Ts 进行了上述检查并返回了结果 never(既不是 false 也不是 true，never | never | never)，所以我们必须关闭这个行为。在上述文档中的最后一段中，Ts 提到如果想关闭这个行为我们需要用`[]`来包裹两边不进行 Distributive 检查。

# 挑战后的知识小礼包

- 对于字符串的遍历，我们需要用到模板字符串配合 infer 来实现：\`${infer F}${infer M}${infer L}\`。

- 对于一个联合类型，如果我们想要遍历它，往往需要借助一个**帮助类型**来完成这件事：

```ts
type p = number | Promise<number>;
type Check<T> = T extends number ? true : false;

type demoCheck = Check<p>; // boolean, 实际的进行了Check<number> | Check<Promise<number>>的操作。
```

- 对于一个联合类型，如果我们不想遍历它，让它直接参与 extends 判断，我们需要关闭 Ts 的这个默认行为：

```ts
type p = number | Promise<number>;
type Check<T> = [T] extends [number] ? true : false;

type demoCheck = Check<p>; // false, [number | Promise<number>] !== [number]
```

- never 从某种程度上可以理解为一个空类型的联合类型，所以如果要判断泛型 T 是否为 never，也需要关闭默认联合类型的判断：

```
type ExtendsNever<T> = [T] extends [never] ? 'yes' : 'no'

type MakesSenseToo = ExtendsNever<{}> // Resolves to 'no'
type Huh = ExtendsNever<never> // is yes
```
