import * as Cesium from 'cesium'

class DrawingTool {
  constructor(viewer, options) {
    this.viewer = viewer
    this.options = options
    this.ids = []
    this.tempIds = []
    this.drawing = false
    this.handler = null
    this.currentMode = 'static'

    this.callback = null
  }

  drawPoint() {
    this.handler?.destroy()
    const viewer = this.viewer

    this.handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
    const handler = this.handler

    handler.setInputAction((e) => {
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
        const text = `${lngs}, ${lats}, ${height.toFixed(2)}m`

        const point = viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(longitude, latitude, height),
          point: {
            pixelSize: 6,
            color: Cesium.Color.BLUEVIOLET,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2
          }
        })
        this.ids.push(point.id)
        this.addLabel(
          text,
          Cesium.Cartesian3.fromDegrees(longitude, latitude, height)
        )
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
  }

  async drawLine() {
    this.handler?.destroy()

    const viewer = this.viewer
    let positions = []
    let tempPositions = []
    let tempLine
    this.handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
    const handler = this.handler

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
          outlineWidth: 2,
          heightReference: Cesium.HeightReference.CLAMP_TO_TERRAIN
        }
      })
      this.ids.push(point.id)
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

    // right click
    handler.setInputAction(async (e) => {
      // const ray = viewer.camera.getPickRay(e.position)
      // const position = viewer.scene.globe.pick(ray, viewer.scene)
      const polyline = viewer.entities.add({
        polyline: {
          positions: positions,
          width: 2,
          material: Cesium.Color.YELLOWGREEN,
          clampToGround: true
        }
      })

      if (positions.length >= 2) {
        const distPromises = positions.map(async (pos, index) => {
          if (positions[index + 1]) {
            const p1 = Cesium.Cartographic.fromCartesian(positions[index])
            const p2 = Cesium.Cartographic.fromCartesian(positions[index + 1])
            const dist = await this.getTerrainDistance(p1, p2)
            return dist
          } else {
            return 0
          }
        })

        const distances = await Promise.all(distPromises)
        const totalDistance = distances.reduce((acc, curr) => acc + curr, 0)

        let distanceText = totalDistance.toFixed(2) + 'm'
        if (totalDistance > 10000) {
          distanceText = (totalDistance / 1000.0).toFixed(2) + 'km'
        }
        this.addLabel(distanceText, positions[positions.length - 1])
      }

      this.ids.push(polyline.id)
      positions = []
      tempPositions = []
      viewer.entities.remove(tempLine.id)
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)
  }

  drawPolygon() {
    this.handler?.destroy()

    const viewer = this.viewer
    this.handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
    const handler = this.handler

    let positions = []
    let tempPositions = []
    let tempPoints = []
    let tempPolygon

    handler.setInputAction((e) => {
      const ray = viewer.camera.getPickRay(e.endPosition)
      const position = viewer.scene.globe.pick(ray, viewer.scene)
      if (!Cesium.defined(position)) {
        return
      }

      tempPositions = [...positions, position]

      if (tempPositions.length >= 3) {
        if (!Cesium.defined(tempPolygon)) {
          tempPolygon = viewer.entities.add({
            polygon: {
              hierarchy: new Cesium.CallbackProperty(
                () => ({
                  positions: tempPositions
                }),
                false
              ),
              material: Cesium.Color.YELLOWGREEN.withAlpha(0.6),
              outline: true,
              outlineColor: Cesium.Color.WHITE
              // clampToGround: true
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
      const cartographic = Cesium.Cartographic.fromCartesian(
        positions[positions.length - 1]
      )
      const longitudeString = Cesium.Math.toDegrees(cartographic.longitude)
      const latitudeString = Cesium.Math.toDegrees(cartographic.latitude)
      const heightString = cartographic.height
      tempPoints.push({
        lon: longitudeString,
        lat: latitudeString,
        hei: heightString
      })

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

    handler.setInputAction((e) => {
      const ray = viewer.camera.getPickRay(e.position)
      const position = viewer.scene.globe.pick(ray, viewer.scene)

      const polygon = viewer.entities.add({
        polygon: {
          hierarchy: { positions },
          material: Cesium.Color.YELLOWGREEN.withAlpha(0.6),
          outline: true,
          outlineColor: Cesium.Color.WHITE
          // clampToGround: true
        }
      })

      this.ids.push(polygon.id)
      viewer.entities.remove(tempPolygon.id)

      const area = this.getArea(positions)
      const centerPoint = this.getCenterOfGravityPoint(positions)
      this.addLabel(area, centerPoint)

      positions = []
      tempPositions = []
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)
  }

  addLabel(text, position) {
    const label = this.viewer.entities.add({
      name: 'dist_label',
      position: position,
      label: {
        text: text,
        font: '16px sans-serif',
        fillColor: Cesium.Color.GOLD,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        outlineWidth: 1,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(20, -20)
      }
    })
    this.ids.push(label.id)
  }

  async getTerrainDistance(point1cartographic, point2cartographic) {
    let distance = 0
    const geodesic = new Cesium.EllipsoidGeodesic()
    geodesic.setEndPoints(point1cartographic, point2cartographic)
    const s = geodesic.surfaceDistance
    const cartoPoints = [point1cartographic]
    for (let jj = 1000; jj < s; jj += 1000) {
      const cartoPt = geodesic.interpolateUsingSurfaceDistance(jj)
      cartoPoints.push(cartoPt)
    }
    cartoPoints.push(point2cartographic)
    const promise = Cesium.sampleTerrain(
      this.viewer.terrainProvider,
      8,
      cartoPoints
    )

    return new Promise((resolve, reject) => {
      promise.then((updatedPositions) => {
        for (var jj = 0; jj < updatedPositions.length - 1; jj++) {
          var geoD = new Cesium.EllipsoidGeodesic()
          const thisUpdatedPosition = updatedPositions[jj]
          const nextUpdatedPosition = updatedPositions[jj + 1]
          if (!thisUpdatedPosition.height) {
            thisUpdatedPosition.height = 0
          }
          if (!nextUpdatedPosition.height) {
            nextUpdatedPosition.height = 0
          }
          geoD.setEndPoints(updatedPositions[jj], updatedPositions[jj + 1])
          var innerS = geoD.surfaceDistance
          innerS = Math.sqrt(
            Math.pow(innerS, 2) +
              Math.pow(
                updatedPositions[jj + 1].height ||
                  0 - updatedPositions[jj].height ||
                  0,
                2
              )
          )
          distance += innerS
        }
        resolve(distance)
      })
    })

    // const startCartographic = Cesium.Cartographic.fromDegrees(...startPosition)
    // const endCartographic = Cesium.Cartographic.fromDegrees(...endPosition)
    // geodesic.setEndPoints(startCartographic, endCartographic)
    // return geodesic.surfaceDistance
  }

  distance(point1, point2) {
    const point1cartographic = Cesium.Cartographic.fromCartesian(point1)
    const point2cartographic = Cesium.Cartographic.fromCartesian(point2)
    /**根据经纬度计算出距离**/
    const geodesic = new Cesium.EllipsoidGeodesic()
    geodesic.setEndPoints(point1cartographic, point2cartographic)
    let s = geodesic.surfaceDistance
    //console.log(Math.sqrt(Math.pow(distance, 2) + Math.pow(endheight, 2)));
    //返回两点之间的距离
    s = Math.sqrt(
      Math.pow(s, 2) +
        Math.pow(point2cartographic.height - point1cartographic.height, 2)
    )
    return s
  }

  getArea(points) {
    let res = 0
    for (let i = 0; i < points.length - 2; i++) {
      const j = (i + 1) % points.length
      const k = (i + 2) % points.length
      const totalAngle = this.angle(points[i], points[j], points[k])
      const dis_temp1 = this.distance(points[j], points[0])
      const dis_temp2 = this.distance(points[k], points[0])
      // res += (dis_temp1 * dis_temp2 * Math.sin(totalAngle)) / 2
      res += (dis_temp1 * dis_temp2 * Math.abs(Math.sin(totalAngle))) / 2
    }

    if (res < 1000000) {
      res = Math.abs(res).toFixed(4) + ' m²'
    } else {
      res = Math.abs((res / 1000000.0).toFixed(4)) + ' km²'
    }

    return res
  }

  getCenterOfGravityPoint(mPoints) {
    var centerPoint = mPoints[0]
    for (var i = 1; i < mPoints.length; i++) {
      centerPoint = Cesium.Cartesian3.midpoint(
        centerPoint,
        mPoints[i],
        new Cesium.Cartesian3()
      )
    }
    return centerPoint
  }

  angle(p1, p2, p3) {
    var bearing21 = this.bearing(p2, p1)
    var bearing23 = this.bearing(p2, p3)
    var angle = bearing21 - bearing23
    if (angle < 0) {
      angle += 360
    }
    return angle
  }

  bearing(from, to) {
    from = Cesium.Cartographic.fromCartesian(from)
    to = Cesium.Cartographic.fromCartesian(to)

    var lat1 = from.latitude
    var lon1 = from.longitude
    var lat2 = to.latitude
    var lon2 = to.longitude
    var angle = -Math.atan2(
      Math.sin(lon1 - lon2) * Math.cos(lat2),
      Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon1 - lon2)
    )
    if (angle < 0) {
      angle += Math.PI * 2.0
    }
    var degreesPerRadian = 180.0 / Math.PI //弧度转化为角度

    angle = angle * degreesPerRadian //角度
    return angle
  }

  clearAll() {
    this.viewer.entities.removeAll()
    this.handler?.destroy()
    this.handler = null
    this.ids = []
  }
}

export default DrawingTool
