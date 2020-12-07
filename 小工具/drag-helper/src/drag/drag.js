import Vue from 'vue'
import './drag.less'

let drag = {}

drag.install = () => {
    Vue.directive('drag-helper', {
        bind(el, binding) {
            
            // stay参数会将元素保持在对应的位置
            const { stay } = binding.modifiers

            el.classList.add('drag-helper')

            let proxyData = new Proxy({}, {
                set(target, key, value, receiver) {
                    if (['move', 'side', 'righthand'].includes(key)) {
                        value ? el.classList.add(key) : el.classList.remove(key)
                    } else {
                        el.style[key] = `${value}px`
                    }

                    return Reflect.set(target, key, value, receiver);
                }
            })

            proxyData.move = false
            proxyData.side = false
            proxyData.righthand = false
            proxyData.left = 0
            proxyData.top = 0

            let timer = null
            let offsets = {
                x: 0,
                y: 0
            }

            let width = 0
            Promise.resolve().then(() => {
                width = el.offsetWidth
            })

            let dragStart = (e) => {
                proxyData.move = false;
                proxyData.side = false;
                clearTimeout(timer);
                // top 与 left 对应此元素的左上角。
                // 此时touch的clientX与Y减去左上角的x y 值对应的是鼠标点中位置的元素x y，eg: 点击的是正中间的位置，那移动时也应该看起来处于正中间。
                let touch = e.touches ?  e.touches[0] : e;
                offsets.x = Math.abs(proxyData.left - touch.clientX);
                offsets.y = Math.abs(proxyData.top - touch.clientY);
            }

            let dragEnd = () => {
                proxyData.move = false;
    
                if (proxyData.left !== 0) {
                    if (proxyData.left < Math.floor(document.body.clientWidth / 2)) {
                        proxyData.left = 0;
                        proxyData.righthand = false;
                    } else {
                        proxyData.left = document.body.clientWidth - width;
                        proxyData.righthand = true;
                    }
    
                    proxyData.side = true;
                    timer = setTimeout(() => {
                       proxyData.side = false;
                    }, 300);
                }
            }

            let dragMove = (e) => {
                proxyData.move = true;
                let touche = e.touches ?  e.touches[0] : e;
                // 这里注意减去元素偏移量，让元素看起来处于正中间。
                proxyData.top = touche.clientY - offsets.y;
                proxyData.left = touche.clientX - offsets.x;
            }

            el.addEventListener('touchstart', dragStart)

            !stay && el.addEventListener('touchend', dragEnd)

            el.addEventListener('touchmove', dragMove)

        }
    })
}

export default drag