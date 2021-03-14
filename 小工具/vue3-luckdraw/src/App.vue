<template>
    <!-- <div class="luckydraw-wheel" :style="{
        width: `${width}px`,
        height: `${height}px`
    }">

        <div class="luckydraw-wheel-wrapper" ref="luckyWrapper">
            <div class="luckydraw-wheel-item" 
                v-for="index in 12" 
                :key="index"
                :style="calcStyle(index)"

            >
            </div>
        </div>
    </div> -->
    <div>
        <luckydrawWheel :prizes="demoPrize">
            <template v-slot:default="scope">
                <span>
                    {{ scope.item.name }}
                </span>
            </template>
        </luckydrawWheel>
    </div>
</template>

<script>
// import { defineComponent } from 'vue'

// export default defineComponent({
//     props: {
//         width: {
//             type: Number,
//             default: 500
//         },
//         height: {
//             type: Number,
//             default: 500
//         },
//     },

//     setup(props) {
//         let calcStyle = (index) => {
//             let clipPath = `${props.height / 2 -
//                     (Math.PI * props.height / 2) /
//                         (Math.tan((180 / 12) * (Math.PI / 180)) *
//                             12)}`

//             return {
//                 background: `${['pink', 'orange', 'black'][index % 3]}`,
//                 height: `${props.height / 2}px`,
//                 width: `${(Math.PI * props.height) / 12}px`,
//                 transform: `translateX(-50%) rotateZ(${360 / 12 * index}deg) translateY(-${props.height / 4}px)`,
//                 clipPath: `polygon(100% 0, 100% ${clipPath}px, 50% 100%, 0 ${clipPath}px, 0 0)`,
//             }
//         }

//         return {
//             calcStyle
//         }
//     }
// })
import { defineComponent } from 'vue'
import luckydrawWheel from './components/luckydraw-wheel.vue'

export default defineComponent({
    components: {
        luckydrawWheel
    },
    data() {
        return {
            demoPrize: new Array(3).fill({
                name: '奖品',
                time: +new Date()
            })
        }
    }
})
</script>

<style>
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

.luckydraw-wheel-item {
    position: absolute;
    top: 25%;
    left: 50%;
}
</style>