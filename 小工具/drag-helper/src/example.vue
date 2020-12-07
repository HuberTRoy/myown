<template>
    <div class="example">
        <div v-drag-helper.stay style="width: 35px">
            测试
        </div>
    </div>
</template>

<script>
import Vue from 'vue'
import drag from '@/drag/drag.js'

Vue.use(drag)

export default {

}
</script>

<style>

</style>