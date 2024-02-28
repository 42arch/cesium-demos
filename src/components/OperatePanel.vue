<template>
  <div class="header-panel">
    <div class="btns">
      <button
        :class="['btn', item.active ? 'active' : '']"
        v-for="(item, index) in drawBtns"
        :key="index"
        @click="handleClick(item)"
      >
        {{ item.label }}
      </button>
    </div>
  </div>

  <!-- <div class="custom-widget">
    <div class="zoom-widget">
      <el-icon class="icon" @click="handleClick('zoomIn')"><ZoomIn /></el-icon>
      <el-icon class="icon" @click="handleClick('zoomOut')"
        ><ZoomOut
      /></el-icon>
      <el-icon class="icon" @click="handleClick('resetZoom')"
        ><FullScreen
      /></el-icon>
    </div>
  </div> -->
</template>

<script setup>
import bus from '@/utils/eventBus'
import { reactive } from 'vue'

const drawBtns = reactive([
  {
    id: 'point',
    label: '绘点'
  },
  {
    id: 'line',
    label: '绘线'
  },
  {
    id: 'polygon',
    label: '绘面'
  },
  {
    id: 'clear',
    label: '清除'
  }
])

const handleClick = (currentBtn) => {
  drawBtns.forEach((btn) => {
    if (btn.id === currentBtn.id) {
      btn.active = !btn.active
    }
  })

  if (currentBtn.active) {
    bus.emit('operate', currentBtn)
  }
}
</script>

<style scoped>
.header-panel {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 6px;
  z-index: 999;
  user-select: none;
}

.btns {
  display: flex;
  flex-direction: row;
  gap: 12px;
  height: 32px;
}

.btn {
  background-color: #1e293b;
  color: #fff;
  outline: none;
  border-style: none;
  padding: 2px 8px;
  cursor: pointer;
}

.btn.active {
  background-color: #475569;
}

.btn:hover {
  background-color: #475569;
}

.custom-widget {
  position: absolute;
  bottom: 12px;
  right: 0;
  z-index: 999;
}

.zoom-widget {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 32px;
}

.icon {
  color: #ffffff;
  cursor: pointer;
}
</style>
