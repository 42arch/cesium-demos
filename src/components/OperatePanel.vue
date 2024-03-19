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
  <div class="main-panel">
    <div class="group" v-for="(item, index) in operateBtns" :key="index">
      <span class="label">{{ item.label }}</span>
      <div class="btns">
        <button
          :class="['btn', it.active ? 'active' : '']"
          v-for="(it, idx) in item.children"
          :key="it.label"
          @click="handleOperateClick(it)"
        >
          {{ it.label }}
        </button>
      </div>
    </div>
  </div>
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
    label: '清除',
    once: true
  }
])

const operateBtns = reactive([
  {
    label: '数据',
    children: [
      {
        id: 'geojson',
        label: 'GeoJSON'
      },
      {
        id: 'topojson',
        label: 'TopoJSON'
      },
      {
        id: 'osm-buildings',
        label: 'OSM建筑物'
      },
      {
        id: 'massive-points',
        label: '大量点'
      }
    ]
  },
  {
    label: '运动',
    children: [
      {
        id: 'fly-track',
        label: '飞行追踪'
      }
    ]
  },
  {
    label: '效果',
    children: [
      {
        id: 'diffuse',
        label: '扩散圆'
      },
      {
        id: 'radar-line',
        label: '雷达线'
      },
      {
        id: 'vertical-line',
        label: '垂线'
      },
      {
        id: 'particles',
        label: '粒子效果'
      }
    ]
  },
  {
    label: '分析',
    children: [
      {
        id: 'heatmap',
        label: '热力图'
      },
      {
        id: 'heatmap-3d',
        label: '3D热力图'
      }
    ]
  }
])

const handleClick = (currentBtn) => {
  drawBtns.forEach((btn) => {
    if (btn.id === currentBtn.id) {
      if (currentBtn.once) {
        btn.active = false
        return
      }
      btn.active = !btn.active
    } else {
      btn.active = false
    }
  })

  if (currentBtn.active || currentBtn.once) {
    bus.emit('operate', currentBtn)
  }
}

const handleOperateClick = (currentBtn) => {
  operateBtns.forEach((group) => {
    group.children.forEach((btn) => {
      if (btn.id === currentBtn.id) {
        if (currentBtn.once) {
          btn.active = false
          return
        }
        btn.active = !btn.active
      } else {
        // btn.active = false
      }
    })
  })
  // if ( currentBtn.once) {
  bus.emit('operate', currentBtn)
  // }
}
</script>

<style scoped>
.header-panel {
  position: absolute;
  top: 12px;
  left: 12px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 6px;
  z-index: 999;
  user-select: none;
}

.main-panel {
  position: absolute;
  width: 240px;
  left: 12px;
  top: 64px;
  z-index: 999;
  user-select: none;
}

.group {
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.label {
  color: #fff;
  padding-bottom: 6px;
}

.btns {
  display: flex;
  flex-direction: row;
  gap: 12px;
  flex-wrap: wrap;
}

.btn {
  background-color: #1e293b;
  color: #fff;
  outline: none;
  border-style: none;
  height: 32px;
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
