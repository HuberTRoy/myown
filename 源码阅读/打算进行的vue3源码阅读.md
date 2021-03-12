# 缘起

其实Vue2也没有完整地阅读过，先定个小目标，万一实现了呢。

commit afe13e0584afb70a2682763dda148c35f9a97f95

一个很久之前的版本。

# 路标

这次想完成的目标是：

1. 从new Vue到Hello World是怎么实现的。


# 开始

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <script src="./packages/vue/dist/vue.global.js"></script>
</head>
<body>
    <div id="array-rendering">
        <ul id="rendering" class="demo">
            <li v-for="item in items">
                {{ item.message }}
            </li>

        </ul>

        <div class="x" @click="change">
            click
        </div>
    </div>

    <script>
        Vue.createApp({
            data() {
                return {
                    items: [{ message: 'Foo' }, { message: 'Bar' }]
                }
            },
            methods: {
                change() {
                    this.items[1] = { message: 'BarBar' }
                }
            }
        }).mount('#array-rendering')

    </script>
</body>
</html>
```

一个很简单的demo，虽然不是用的composition API。
