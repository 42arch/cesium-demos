import * as Cesium from 'cesium'

const generateRandomPositions = (center, count) => {
  const positions = []

  for (let i = 0; i < count; i++) {
    const latitude = center[0] + Cesium.Math.randomBetween(-1, 1) * 10
    const longitude = center[1] + Cesium.Math.randomBetween(-1, 1) * 10
    const height = center[2] || 0
    const cartesian = Cesium.Cartesian3.fromDegrees(latitude, longitude, height)
    positions.push(cartesian)
  }
  return positions
}

const center = [116.403847, 39.915526, 0]
const count = 10000
let points
let isFirst = true

export const loadMassivePoints = (viewer) => {
  const randomPositions = generateRandomPositions(center, count)

  points = viewer.scene.primitives.add(
    new Cesium.PointPrimitiveCollection({
      blendOption: Cesium.BlendOption.OPAQUE
    })
  )
  for (let i = 0; i < randomPositions.length; i++) {
    points.add({
      position: randomPositions[i],
      color: Cesium.Color.fromRandom(),
      pixelSize: 3
    })
  }

  if (isFirst) {
    viewer.scene.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(center[0], center[1], 2000000)
    })
    isFirst = false
  }
}

export const removeMassivePoints = (viewer) => {
  viewer.scene.primitives.remove(points)
}
