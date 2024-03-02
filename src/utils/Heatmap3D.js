import * as Cesium from 'cesium'
import h337 from '@/libs/heatmap.js'

export default class Heatmap {
  constructor(viewer, options) {
    this.viewer = viewer
    this.options = options
    this.points = options.points
    this.baseHeight = options.baseHeight
    this.heatmapOptions = {
      radius: 10,
      maxOpacity: 0.9,
      minOpacity: 0.1,
      blur: 0.75,
      gradient: {
        '.3': 'blue',
        '.5': 'green',
        '.7': 'yellow',
        '.95': 'red'
      },
      ...options.heatmap
    }

    this.provider = null
    this.heatmap = null

    this.element = null
    this.bounds = this.getBounds(options.points)

    this.width = 1000
    this.height = parseInt(
      (
        (1000 / (this.bounds[2] - this.bounds[0])) *
        (this.bounds[3] - this.bounds[1])
      ).toFixed(0)
    )

    this.createHeatmap()
    this.create3DPrimitive()
    this.fit()
  }

  /**
   *
   * @param {*} points {x: number, y: number, value: number}[]
   */
  getBounds(points) {
    if (points) {
      let lonMin = 180
      let lonMax = -180
      let latMin = 90
      let latMax = -180
      points.forEach(function (point) {
        const { x: longitude, y: latitude } = point
        lonMin = longitude < lonMin ? longitude : lonMin
        latMin = latitude < latMin ? latitude : latMin
        lonMax = longitude > lonMax ? longitude : lonMax
        latMax = latitude > latMax ? latitude : latMax
      })
      const xRange = lonMax - lonMin ? lonMax - lonMin : 1
      const yRange = latMax - latMin ? latMax - latMin : 1
      return [
        lonMin - xRange / 10,
        latMin - yRange / 10,
        lonMax + xRange / 10,
        latMax + yRange / 10
      ]
    }
    return [0, 0, 0, 0]
  }

  fit() {
    this.viewer.camera.flyTo({
      destination: Cesium.Rectangle.fromDegrees(
        this.bounds[0],
        this.bounds[1],
        this.bounds[2],
        this.bounds[3]
      )
    })
  }

  createHeatmap() {
    const bounds = this.bounds
    const points = this.points

    const domElement = document.createElement('div')
    const width = 1000
    const height = parseInt(
      ((1000 / (bounds[2] - bounds[0])) * (bounds[3] - bounds[1])).toFixed(0)
    )
    domElement.setAttribute(
      'style',
      `width:${width}px;height:${height}px;display:none;`
    )
    document.body.appendChild(domElement)
    this.element = domElement

    const data = []
    const values = []

    for (let p of points) {
      const x = ((p.x - bounds[0]) / (bounds[2] - bounds[0])) * width
      const y = ((bounds[3] - p.y) / (bounds[3] - bounds[1])) * height
      const screenPoint = {
        x: x,
        y: y,
        value: p.value
      }
      if (typeof p.value === 'number') values.push(p.value)
      data.push(screenPoint)
    }

    const { min, max } = this._getMinMax(values)
    this.heatmap = h337.create({
      container: this.element,
      ...this.heatmapOptions
    })
    this.heatmap.setData({
      min,
      max,
      data
    })
  }

  create3DPrimitive() {
    const instance = new Cesium.GeometryInstance({
      geometry: this.generateGeometry()
    })
    const appearance = new Cesium.MaterialAppearance({
      material: new Cesium.Material({
        fabric: {
          type: 'Image',
          uniforms: {
            image: this.heatmap.getDataURL()
          }
        }
      }),
      translucent: true,
      flat: true
    })
    const opt = {
      geometryInstances: instance,
      appearance: appearance,
      allowPicking: false,
      asynchronous: false
    }
    this.provider = this.viewer.scene.primitives.add(new Cesium.Primitive(opt))
  }

  destory() {
    if (this.element) {
      document.body.removeChild(this.element)
      this.element = null
      if (this.provider instanceof Cesium.Primitive) {
        this.viewer.scene.primitives.remove(this.provider)
      }

      this.provider = null
    }
  }

  _getMinMax(values) {
    let _min = Math.min(...values)
    let _max = Math.max(...values)
    if (this.options?.heatmap) {
      const { min, max } = this.options.heatmap
      if (typeof min === 'number') {
        _min = min
      }
      if (typeof max === 'number') {
        _max = max
      }
    }

    return { min: _min, max: _max }
  }

  generateGeometry() {
    const { positions, st, indices } = this.getGrain()

    let attributes = new Cesium.GeometryAttributes({
      position: new Cesium.GeometryAttribute({
        componentDatatype: Cesium.ComponentDatatype.DOUBLE,
        componentsPerAttribute: 3,
        values: new Float64Array(positions)
      }),
      // color: new Cesium.GeometryAttribute({
      //   componentDatatype: Cesium.ComponentDatatype.FLOAT,
      //   componentsPerAttribute: 4,
      //   values: new Float32Array(colors)
      // }),
      st: new Cesium.GeometryAttribute({
        componentDatatype: Cesium.ComponentDatatype.FLOAT,
        componentsPerAttribute: 2,
        values: new Float32Array(st)
      })
    })
    // 计算包围球
    const boundingSphere = Cesium.BoundingSphere.fromVertices(
      positions,
      new Cesium.Cartesian3(0.0, 0.0, 0.0),
      3
    )
    //
    const geometry = new Cesium.Geometry({
      attributes: attributes,
      indices: indices,
      primitiveType: Cesium.PrimitiveType.TRIANGLES,
      boundingSphere: boundingSphere
    })
    return geometry
  }

  // 根据经纬度跨度和canvas的宽高 来计算顶点坐标及顶点法向量
  getGrain() {
    const canvasW = this.width || 200
    const canvasH = this.height || 200

    const maxLng = this.bounds[2]
    const maxLat = this.bounds[3]
    const minLng = this.bounds[0]
    const minLat = this.bounds[1]

    const granLng_w = (maxLng - minLng) / canvasW // 经度粒度
    const granLat_H = (maxLat - minLat) / canvasH // 经度粒度
    const positions = []
    const st = []
    const indices = []

    for (let i = 0; i < canvasW; i++) {
      const nowLng = minLng + granLng_w * i
      for (let j = 0; j < canvasH; j++) {
        const nowLat = minLat + granLat_H * j
        const value = this.heatmap.getValueAt({
          x: i,
          y: j
        })

        const cartesian3 = Cesium.Cartesian3.fromDegrees(
          nowLng,
          nowLat,
          this.baseHeight + value
        )
        positions.push(cartesian3.x, cartesian3.y, cartesian3.z)
        st.push(i / canvasW, 1 - j / canvasH)
        if (j != canvasH - 1 && i != canvasW - 1) {
          indices.push(
            i * canvasH + j,
            i * canvasH + j + 1,
            (i + 1) * canvasH + j
          )
          indices.push(
            (i + 1) * canvasH + j,
            (i + 1) * canvasH + j + 1,
            i * canvasH + j + 1
          )
        }
      }
    }

    return {
      positions: positions,
      st: st,
      indices: indices
    }
  }
}
