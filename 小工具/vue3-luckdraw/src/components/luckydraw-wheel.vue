<template>
    <div class="luckydraw-wheel" :style="{
        width: `${width}px`,
        height: `${height}px`
    }">
        <!-- 
            一个luckydraw分为两层，最底层是背景图，上层是奖品和按钮。
        -->

        <!-- wrapper是用来做整体的旋转动画 -->
        <div class="luckydraw-wheel-wrapper" ref="luckyWrapper">

            <div class="luckydraw-wheel-item" v-for="(prize, index) in prizes" 
                                               :key="index"
                                               :style="calcStyle(index)"
            >
                <slot :item="prize" :index="index"></slot>
            </div>

        </div>
        <div class="luckydraw-wheel-button" @click="start">
            立即抽奖
            <slot name="wheelButton"></slot>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'

interface itemStyle {
    height: string,
    width: string,
    transform: string,
    clipPath: string,
    background: string
}

// width和height是转盘的宽高
// prizes是奖品的数组，还应该配置一些其他的东西，这地方可以自由扩展。
// startFunc是开始前调用的，返回对应奖品的prizes下标。
// gap是每个奖品直接的间距。

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
        prizes: {
            type: Array,
            default: () => new Array(12).fill({})
        },
        startFunc: {
            type: Function,
            default: () => 1
        },
        //
        gap: {
            type: Number,
            default: 1
        }
    },
    setup(props) {
        const luckyWrapper = ref(null)
        let animateSheet = ref(null)
        let startRotate = ref(false)
        let angle = ref(0)
        let first = ref(true)

        let calcStyle = (index:number):itemStyle => {

            // 每一个item即为一个奖品:
            //      item的高度应是半径。
            //            宽度是圆周长 / 个数
            //            这里使用absolute，
            //            absolute下水平垂直居中可以设置top: 50%; left: 50%;然后transform偏移自身的一半，实际设置为父元素长度的一半-自身长度的一半。
            //            这里子元素长度为半径，父元素的50%也是半径，直接top: 25%即可让item垂直居中。

            //            水平垂直居中之后用rotateZ指定角度，最后用translateY指定为半径的一半(高度的一半)，让item的上边与圆中心对齐，由于有旋转角度，所以形成一个圆的环绕布局
                       
            //            通过clip-path将原来的长方形切成三角型。
            //            https://bennettfeely.com/clippy/
            //            这个三角形是一个等腰三角形。
            //            算clipPath的等一等。
            let clipPath:string = `${props.height / 2 -
                    (Math.PI * props.height / 2) /
                        (Math.tan((180 / props.prizes.length) * (Math.PI / 180)) *
                            props.prizes.length)}`
            return {
                background: `${['red', 'orange', 'black'][index % 3]}`,
                height: `${props.height / 2}px`,
                width: `${(Math.PI * props.height) / props.prizes.length}px`,
                transform: `translateX(-50%) rotateZ(${(360 / props.prizes.length) * index}deg) translateY(-${props.height / 4 + props.gap / 2}px)`,
                clipPath: `polygon(100% 0, 100% ${clipPath}px, 50% 100%, 0 ${clipPath}px, 0 0)`,
            }
        }

        let getEndAngle = (index:number):number => {
            
            return 360 / props.prizes.length * index;
        }

        let start = async () => {
            if (startRotate.value) {
                return
            }
            
            let result 
            try {
                result = await props.startFunc()
            }catch(e) {
                return
            }

            angle.value = getEndAngle(result)

			// ios 必须先设置样式表，后设置样式才生效
			if (!animateSheet.value) {
				animateSheet.value = document.createElement('style');
				document.head.appendChild(animateSheet.value);
			}
			animateSheet.value.type = 'text/css';
			animateSheet.value.innerHTML = `@keyframes rotate{
			from{ 
				transform: rotateZ(${first.value ? 0 : angle.value}deg);
			}
			to{ 
				transform: rotateZ(${3600 + angle.value}deg);
			}`;
            
            first.value = false

			setTimeout(() => {
				startRotate.value = true;
				luckyWrapper.value.style.animation = 'rotate ease-in-out 7s';

				setTimeout(() => {

					luckyWrapper.value.style.animation = '';
					luckyWrapper.value.style.transform = `rotateZ(${angle.value}deg)`;
					startRotate.value = false;
				}, 7000);
			}, 100);
        }

        return {
            luckyWrapper,
            calcStyle,
            start
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
    transform: rotateZ(0);
}

.luckydraw-wheel-item {
    position: absolute;
    top: 25%;
    left: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
}

.luckydraw-wheel-button {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: coral;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
}

.luckydraw-wheel-button::before {
    content: ' ';
    height: 50%;
    width: 50%;
    position: absolute;
    background: coral;
    top: -30%;
    clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
}
</style>