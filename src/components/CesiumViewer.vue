<template>
  <div id="cesium-container"></div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import * as Cesium from 'cesium'
import bus from '@/utils/eventBus'
import { getViewPosition } from '@/utils/cesiumUtils'
import DrawingTool from '@/utils/DrawingTool'

let defaultView = {}
let currentView = {}
let draw
let viewer

const handleOperate = ({ id }) => {
  switch (id) {
    case 'point': {
      draw.drawPoint()
      break
    }
    case 'line':
      draw.drawLine()
      break
    case 'polygon':
      draw.drawPolygon()
      break
    case 'clear': {
      draw.clearAll()
      break
    }
    case 'zoomIn': {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          defaultView.longitude,
          defaultView.latitude,
          currentView.height + 1000
        ),
        orientation: {
          heading: Cesium.Math.toRadians(0.0),
          pitch: Cesium.Math.toRadians(-90.0),
          roll: 0.0
        }
      })
      break
    }
    case 'zoomOut':
      viewer.camera.zoomOut()
      break
    case 'resetZoom':
      {
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(
            defaultView.longitude,
            defaultView.latitude,
            defaultView.height
          ),
          orientation: {
            heading: Cesium.Math.toRadians(0.0),
            pitch: Cesium.Math.toRadians(-90.0),
            roll: 0.0
          }
        })
      }

      break

    default:
      break
  }
}

bus.on('operate', handleOperate)

onMounted(async () => {
  console.log(Cesium)

  Cesium.Ion.defaultAccessToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI4NTVhOWEwNi04NWJmLTQ3N2ItYWIwZS1iNTVmMDk3NzI0OWYiLCJpZCI6MTAyNjgsImlhdCI6MTY1Mjc1ODQ5NX0.E2cd4Nm84TuFQTY9TiFxIB7acMq_jQxyOODrNvLR30o'

  viewer = new Cesium.Viewer('cesium-container', {
    terrainProvider: await Cesium.createWorldTerrainAsync({
      requestWaterMask: true
    }),
    timeline: false,
    animation: false,
    geocoder: false,
    homeButton: false,
    selectionIndicator: false,
    sceneModePicker: false,
    baseLayerPicker: false,
    navigationHelpButton: false,
    infoBox: false,
    fullscreenButton: false,
    navigationInstructionsInitiallyVisible: false
  })
  draw = new DrawingTool(viewer, {})

  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(...[93.9, 30.42, 40000]),
    orientation: {
      heading: Cesium.Math.toRadians(0.0),
      pitch: Cesium.Math.toRadians(-45.0),
      roll: 0.0
    }
  })

  const { latitude, longitude, height } = getViewPosition(viewer)
  defaultView = {
    latitude,
    longitude,
    height
  }
  viewer.camera.defaultZoomAmount = 10000
})

onUnmounted(() => {
  viewer = null
})
</script>

<style scoped>
#cesium-container {
  height: 100%;
  width: 100%;
  position: relative;
}
</style>

<style>
.cesium-viewer-bottom {
  display: none;
}
</style>
