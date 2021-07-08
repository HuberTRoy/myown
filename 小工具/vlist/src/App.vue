<template>
    <div class="outter" @scroll="calcCurrentItem">
        <div class="shadow">

        </div>
        <div class="innerWrapper" :style="{
            transform: `translate3D(0, ${cst}px, 0)`
        }">
            <div class="inner" v-for="item in computedList" :key="item.offset">
                {{ item.value }}
                <br>
                {{ item.index }}
                <br>
                {{ item.offset }}
            </div>
        </div>
    </div>
</template>

<script>
import { defineComponent, ref, computed } from 'vue'
// 实现虚拟列表，虚拟列表中每次只渲染固定个数。
// 根据滚动位置判断展示哪些。
// 
// 目前实现了固定高度下的虚拟列表。
// 接下来思考动态高度的
export default defineComponent({
    setup() {
        // 分成三部分。
        // 第一部分，为可视区域之上的部分。
        // 第二部分，为可视区域。
        // 第三部分，为可视区域之下。
        // 可视区域即window.innerHeight。
        // 当滚动时，可视区域为scrollTop + innertHeight
        let screen = ref(document.documentElement.clientHeight)
        let above = computed(() => {
            return Math.floor(screen.value - document.documentElement.clientHeight - 100)
        })
        let below = computed(() => {
            return Math.floor(screen.value + document.documentElement.clientHeight + 100)
        })

        let firstElement = null
        let cst = ref(0)
        let list = ref(new Array(1000).fill(0))

        list.value = list.value.map((item,index) => {
            let newObj = {}

            newObj.value = Math.random()
            newObj.offset = index * 100
            newObj.index = +index
            return newObj
        })

        let computedList = computed(() => {
            return list.value.filter((item) => {
                return above.value < item.offset && item.offset < below.value
            })
        })

        let calcCurrentItem = (e) => {
            screen.value = document.documentElement.clientHeight + e.target.scrollTop
            // cst应该按元素高度取整，
            // 当在第一个元素内滚动时，不会改变这个值。
            // 初始值为0
            // 当为0或者大于100的时候会更新这个数值
            // 根据scrollTop取尾数比如2364 % 100 = 64

            let v = e.target.scrollTop - (e.target.scrollTop % 100)

            cst.value = v

        }

        return {
            list,
            calcCurrentItem,
            computedList,
            cst
        }
    }
})


</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  /* margin-top: 60px; */
}

* {
    margin: 0;
    padding: 0;
}

.outter {
    display: flex;
    flex-direction: column;
    position: relative;
    height: 100vh;
    overflow: auto;
}

.shadow {
    position: absolute;
    height: 100000px;
    width: 100%;
    left: 0;
    top: 0;
}

.inner {
    height: 100px;
    flex-shrink: 0;
}

.inner + .inner {
    border-top: 1px solid #000;
}
</style>
