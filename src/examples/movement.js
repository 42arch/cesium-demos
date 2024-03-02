import * as Cesium from 'cesium'
import flightData from './flightData.json'

const loadModel = (viewer) => {}

// 飞行追踪

export const startFlyTrack = (viewer) => {
  const dataPoint = {
    longitude: -122.38985,
    latitude: 37.61864,
    height: -27.32
  }

  const pointEntity = viewer.entities.add({
    description: `First data point at (${dataPoint.longitude}, ${dataPoint.latitude})`,
    position: Cesium.Cartesian3.fromDegrees(
      dataPoint.longitude,
      dataPoint.latitude,
      dataPoint.height
    ),
    point: { pixelSize: 10, color: Cesium.Color.RED }
  })

  const timeStepInSeconds = 30
  const totalSeconds = timeStepInSeconds * (flightData.length - 1)
  const start = Cesium.JulianDate.fromIso8601('2020-03-09T23:10:00Z')
  const stop = Cesium.JulianDate.addSeconds(
    start,
    totalSeconds,
    new Cesium.JulianDate()
  )
  viewer.clock.startTime = start.clone()
  viewer.clock.stopTime = stop.clone()
  viewer.clock.currentTime = start.clone()
  // viewer.timeline.zoomTo(start, stop)
  viewer.clock.multiplier = 50
  viewer.clock.shouldAnimate = true

  const positionProperty = new Cesium.SampledPositionProperty()

  // Fly the camera to this point.
  viewer.flyTo(pointEntity)

  for (let i = 0; i < flightData.length; i++) {
    const dataPoint = flightData[i]

    viewer.entities.add({
      description: `Location: (${dataPoint.longitude}, ${dataPoint.latitude}, ${dataPoint.height})`,
      position: Cesium.Cartesian3.fromDegrees(
        dataPoint.longitude,
        dataPoint.latitude,
        dataPoint.height
      ),
      point: { pixelSize: 10, color: Cesium.Color.RED }
    })
  }

  // load plane model
  const airplaneEntity = viewer.entities.add({
    position: positionProperty,
    model: {
      uri: '/models/plane.glb',
      minimumPixelSize: 128,
      maximumScale: 20000
    },
    orientation: new Cesium.VelocityOrientationProperty(positionProperty),
    path: new Cesium.PathGraphics({ width: 3 })
  })

  // viewer.trackedEntity = air planeEntity
}

export const stopFlyTrack = (viewer) => {}
