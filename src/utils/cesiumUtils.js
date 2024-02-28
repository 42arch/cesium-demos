import * as Cesium from 'cesium'

export const getViewPosition = (viewer) => {
  const ellipsoid = viewer.scene.globe.ellipsoid
  const position = viewer.camera.position
  const cartographic = ellipsoid.cartesianToCartographic(position)
  const longitude = Cesium.Math.toDegrees(cartographic.longitude)
  const latitude = Cesium.Math.toDegrees(cartographic.latitude)
  const height = cartographic.height

  return { longitude, latitude, height }
}
