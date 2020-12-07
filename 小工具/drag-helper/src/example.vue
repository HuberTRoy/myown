<template>
    <div class="example">
        <div v-drag-helper style="width: 99px; height: 99px">
            测试
        </div>

        <div v-drag-helper.stays style="width: 99px; height: 99px">
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