import * as Cesium from 'cesium'

class DrawingTool {
  constructor(viewer, options) {
    this.viewer = viewer
    this.options = options
    this.ids = []
    this.drawing = false
    this.handler = null
    this.currentMode = 'static'
  }

  drawPoint() {
    const viewer = this.viewer
    viewer.screenSpaceEventHandler.setInputAction((e) => {
      const ray = viewer.camera.getPickRay(e.position)
      const cartesian = viewer.scene.globe.pick(ray, viewer.scene)
      const ellipsoid = viewer.scene.globe.ellipsoid

      if (cartesian) {
        const cartographic = ellipsoid.cartesianToCartographic(cartesian)
        const longitude = Cesium.Math.toDegrees(cartographic.longitude)
        const latitude = Cesium.Math.toDegrees(cartographic.latitude)
        const height = cartographic.height < 0 ? 0 : cartographic.height
        const absLng = Math.abs(longitude)
        const absLat = Math.abs(latitude)
        const lngs =
          longitude >= 0 ? absLng.toFixed(2) + 'E' : absLng.toFixed(2) + 'W'
        const lats =
          latitude >= 0 ? absLat.toFixed(2) + 'N' : absLat.toFixed(2) + 'S'
        const text = `${lngs}, ${lats}`

        const point = viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(longitude, latitude, height),
          point: {
            pixelSize: 6,
            color: Cesium.Color.BLUEVIOLET,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2
          },
          label: {
            text,
            font: '12px',
            fillColor: Cesium.Color.CORAL,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            outlineWidth: 1,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -10)
          }
        })
        this.ids.push(point.id)
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
  }

  drawLine() {
    const viewer = this.viewer
    let positions = []
    let tempPositions = []
    let tempLine
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
    viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(
      Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
    )
    // listen mouse move
    handler.setInputAction((e) => {
      const ray = viewer.camera.getPickRay(e.endPosition)
      const position = viewer.scene.globe.pick(ray, viewer.scene)
      if (!Cesium.defined(position)) {
        return
      }

      tempPositions = [...positions, position]
      if (tempPositions.length >= 2) {
        if (!Cesium.defined(tempLine)) {
          tempLine = viewer.entities.add({
            polyline: {
              positions: new Cesium.CallbackProperty(
                () => tempPositions,
                false
              ),
              material: Cesium.Color.YELLOWGREEN,
              width: 2,
              clampToGround: true
            }
          })
        } else {
          positions.push(position)
          positions.pop()
        }
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

    handler.setInputAction((e) => {
      const ray = viewer.camera.getPickRay(e.position)
      const position = viewer.scene.globe.pick(ray, viewer.scene)

      positions.push(position)

      const point = viewer.entities.add({
        position: position,
        point: {
          pixelSize: 6,
          color: Cesium.Color.BLUEVIOLET,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2
        }
      })
      this.ids.push(point.id)
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

    // right click
    handler.setInputAction((e) => {
      const ray = viewer.camera.getPickRay(e.position)
      const position = viewer.scene.globe.pick(ray, viewer.scene)

      console.log('right click', positions)

      const polyline = viewer.entities.add({
        polyline: {
          positions: positions,
          width: 2,
          material: Cesium.Color.YELLOWGREEN,
          clampToGround: true
        }
      })

      this.ids.push(polyline.id)

      positions = []
      tempPositions = []
      viewer.entities.remove(tempLine.id)
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)
  }

  drawPolygon() {}

  clearAll() {
    this.ids = []
  }
}

export default DrawingTool