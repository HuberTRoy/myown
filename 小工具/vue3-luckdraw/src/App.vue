<template>
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
import { defineComponent } from 'vue'
import luckydrawWheel from './components/luckydraw-wheel.vue'

export default defineComponent({
    components: {
        luckydrawWheel
    },
    data() {
        return {
            demoPrize: new Array(12).fill({
                name: '奖品',
                time: +new Date()
            })
        }
    }
})
</script>

<style>

</style>