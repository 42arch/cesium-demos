import * as Cesium from 'cesium'
import Heatmap from '@/utils/Heatmap'
import Heatmap3d from '@/utils/Heatmap3D'
import data from './data/busstop2016.json'

let heatmap
let heatmap3d

export const loadHeatmap = (viewer) => {
  const points = []
  const values = []
  data.features.forEach(function (feature) {
    const lon = feature.geometry.coordinates[0]
    const lat = feature.geometry.coordinates[1]
    const _value = Cesium.Math.randomBetween(0, 100)
    values.push(_value)
    points.push({
      x: lon,
      y: lat,
      value: _value
    })
  })

  heatmap = new Heatmap(viewer, {
    points: points,
    dynamic: true,
    renderType: 'imageryLayer', // entity, primitive, imageryLayer
    heatmap: {
      radius: 10,
      maxOpacity: 0.9,
      minOpacity: 0.1,
      blur: 0.75,
      max: 999,
      min: 0
    }
  })
}

export const removeHeatmap = () => {
  heatmap.destory()
  heatmap = null
}

export const load3DHeatmap = (viewer) => {
  let points = []
  for (let i = 0; i < 100; i++) {
    points.push({
      // lnglat: [
      //   117.28 + Math.random() * 0.1 * (Math.random() > 0.5 ? 1 : -1),
      //   31.923 + Math.random() * 0.1 * (Math.random() > 0.5 ? 1 : -1)
      // ],
      x: 117.28 + Math.random() * 0.1 * (Math.random() > 0.5 ? 1 : -1),
      y: 31.923 + Math.random() * 0.1 * (Math.random() > 0.5 ? 1 : -1),
      value: 1000 * Math.random()
    })
  }

  heatmap3d = new Heatmap3d(viewer, {
    points: points,
    heatmap: {
      radius: 40,
      maxOpacity: 0.9,
      minOpacity: 0.1,
      blur: 0.75,
      gradient: {
        '.3': 'blue',
        '.5': 'green',
        '.7': 'yellow',
        '.95': 'red'
      }
    },
    baseHeight: 600,
    primitiveType: 'TRNGLE'
  })
}

export const remove3DHeatmap = () => {
  heatmap3d.destory()
  heatmap3d = null
}
