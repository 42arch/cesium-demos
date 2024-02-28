<template>
  <main>
    <OperatePanel />
    <CesiumViewer />
  </main>
</template>

<script setup>
import CesiumViewer from '@/components/CesiumViewer.vue'
import OperatePanel from '@/components/OperatePanel.vue'
</script>

<style scoped>
main {
  width: 100%;
  height: 100%;
  position: relative;
}
</style>
