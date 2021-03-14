# 叮，你的礼物已到账

最近要实现一个大转盘效果，找了一下大部分是基于Canvas做的，不容易配置，可扩展性也比较弱，作为一个大(cai)佬(niao)当然不能接受这样的情况，于是在一个月黑风高的夜里，和漂亮姐姐深入交流后搞出了这个基于CSS的大转盘。

# 先上效果

![](fff.gif)

上图是用的Vue2，支持任意数量的奖品，这个效果用什么框架都可以轻松实现，正好Vue3出了，下面一起用Vue3的Composition API实现一下~。

# 准备工作

[Vite](https://vitejs.dev/guide/#scaffolding-your-first-vite-project)，真香~。

![](xiang.image)

yarn安装：

```
yarn create @vitejs/app
```

直接模板一键生成：

```
yarn create @vitejs/app my-vue-app --template vue
```

ts上不上都可。


# 理论基础

一个基础的大转盘分为三部分：

1. 圆的背景。
2. 扇形组成的一圈奖品。
3. 位于中心的抽奖按钮。

画好转盘之后我们需要用`animation`动画让转盘动起来和停下。


# 背景

```HTML
<div class="luckydraw-wheel" :style="{
    width: `${width}px`,
    height: `${height}px`
}">

    <div class="luckydraw-wheel-wrapper" ref="luckyWrapper">
    </div>
</div>
```

width和height我们将其暴露为props，这样可以让组件由外部自定义宽高。

```javascript
import { defineComponent } from 'vue'

export default defineComponent({
    props: {
        width: {
            type: Number,
            default: 500
        },
        height: {
            type: Number,
            default: 500
        },
    }
})
```

```css
.luckydraw-wheel {
    background: #fff;
    border-radius: 50%;
    border: 4px solid rgba(249, 227, 187, 1);
    position: relative;
}

.luckydraw-wheel-wrapper {
    position: relative;
    height: 100%;
    width: 100%;
    border-radius: 50%;
    overflow: hidden;
}
```

核心是`border-radius`定义一个圆，内层的div用来转动转盘，当然也可以直接转外层的这个，这边看你自己怎么实现。

`overflow: hidden`也是必要的，为了实现圆弧。

![](cirle.png)


# 奖品

```HTML
<div class="luckydraw-wheel-item" 
     v-for="index in 12" 
     :key="index"
     :style="calcStyle(index)"
>
</div>
```

我们定义12个奖品，目标是将这12个奖品围绕圆的中心点环绕，这种布局我们没有现成的布局属性可以使用，需要自己计算每块奖品的位置。

我们知道在`absolute`定位下设置`top: 50%; left: 50%; transform: translate(-50%, -50%);`即可让元素垂直水平居中。

设置的`top`和`left`会对应元素的上和左边，所以居中需要向相反位置移动自身的一半。

```CSS
.luckydraw-wheel-item {
    position: absolute;
    top: 25%;
    left: 50%;
}
```

这是基础的样式，我们先不设置`transform`和其他属性，这些需要我们计算出来。

先明确一下圆的直径是传入的`width`和`height`(值一样)。

奖品`item`的属性中：

1. 高度应为圆的半径(`height/2`)，这样可以覆盖圆一整圈。
2. 宽度应为圆周长除以奖品个数，与高度组合围绕的话完全覆盖整个圆。

```javascript
let calcStyle = (index) => {
            return {
                background: `${['pink', 'orange', 'black'][index % 3]}`,
                height: `${props.height / 2}px`,
                // 这个12后面需要改成传入的奖品数量
                width: `${(Math.PI * props.height) / 12}px`,
                transform: `translateX(-50%)`
            }
```

background为了看效果，这里父元素高度与子元素高度我们已知且子元素的高度恒为父元素高度的一半，

所以我们之前设置`top: 25%;`，而不是`top: 50%;`，`transform`我们一会用到。

宽度相对于更加不可控所以这里直接用了`transform`。

![](cirle2.png)

环绕布局我们需要指定每一块的旋转角度，角度很好计算，`360/个数`算出每一块应该旋转的度数*当前的位置的下标即可，用`rotateZ`来实现：

```javascript
{
    transform: `translateX(-50%) rotateZ(${360 / 12 * index}deg)`
}
```

![](cirle3.png)

在父元素高度是子元素高度两倍的情况下，偏移最后我们用`translateY`偏移自身高度的一半来贴边对齐:

```javascript
{
    transform: `translateX(-50%) rotateZ(${360 / 12 * index}deg) translateY(-50%)`
}
```

注意这里的写法，不能将X和Y组合成一个简写的`translate`，多个属性的`transform`是按顺序渲染的，我们想要的是：居中 -> 旋转 -> 贴边，如果写成一个简写的就变成了 居中 -> 贴边 -> 旋转。

![](cirle4.png)

这边写法很多，不用纠结，只要实现了这样的环绕布局即可。

# 切割

切割在CSS里可以利用`clip-path`实现，https://bennettfeely.com/clippy/ 这个网站可以很容易的可视化生成`clip-path`。

我们想生成的扇形并没有办法直接用`clip-path`切出来，好在我们可以利用外层的`overflow: hidden`将多余的边边角角隐藏掉，让图形看起来是个扇形。

我们的目标是将奖品切成三角形，直接用`clip-path: polygon(50% 0%, 0% 100%, 100% 100%);`切成等腰三角形。

不过还有一点是，像是只有两个奖品的这种半圆，我们如果要切三角形需要将宽高扩大，或者不切直接覆盖，不管哪一种都不容易，需要加入额外的判断。

这里在漂亮的姐姐的帮助下，转变了思路，从切三角形，变到切成一个三角和长方形组成的五边形。

![](five.png)

如图所示，我们只要移动紫色和绿色两个点的位置即可从五边形切到三角形在切到长方形，但这两个点应该在什么位置着实被难倒了，好在漂亮姐姐还是我漂亮姐姐，一顿饭的功夫漂亮姐姐就发给我了这张图，好在我天资聪颖，立马就领悟了其中的真谛。

![](fake.gif)

不好意思，放错了，是这张。

![](qie.png)

绿色的线我们已知，是宽度的一半，粉色与红色相交的部分我们可以利用`360 / 个数 / 2`得出，最后用`tan`即可求出我们想要知道的红色线段。