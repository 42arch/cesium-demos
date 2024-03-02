import * as Cesium from 'cesium'
import h337 from '@/libs/heatmap.js'

export default class Heatmap {
  constructor(viewer, options) {
    this.viewer = viewer
    this.options = options
    this.points = options.points
    this.dynamic = options.dynamic
    this.renderType = options.renderType
    this.heatmapOptions = {
      radius: 20,
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
    this.heatmapDataOptions = {}
    this.provider = null
    this.heatmap = null
    this.element = null
    this.cameraMoveEnd = null
    this.bounds = this.getBounds(options.points)
    this.lastCameraHeight = 0
    this.initRadius = 10
    this.width = 1000
    this.height = parseInt(
      (
        (1000 / (this.bounds[2] - this.bounds[0])) *
        (this.bounds[3] - this.bounds[1])
      ).toFixed(0)
    )
    if (this.heatmapOptions?.radius) {
      this.initRadius = this.heatmapOptions.radius
    }

    this.createHeatmap()
    this.createLayer()

    if (this.dynamic) {
      this.addListener()
    }

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

  createLayer() {
    if (this.renderType === 'primitive') {
      this.createPrimitive()
    } else if (this.renderType === 'imageryLayer') {
      this.createImageryLayer()
    } else {
      this.createEntity()
    }
  }

  /**
   * create heatmap canvas by using heatmap.js
   * @param {*} points {x: number, y: number, value: number}[]
   */
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

    const { min, max } = this.getMinMax(values)
    this.heatmapDataOptions = {
      min: this.heatmapOptions.min || min,
      max: this.heatmapOptions.max || max
    }

    this.heatmap = h337.create({
      container: this.element,
      ...this.heatmapOptions
    })
    this.heatmap.setData({
      ...this.heatmapDataOptions,
      data: data
    })
  }

  createPrimitive() {
    const url = this.heatmap.getDataURL()
    this.provider = this.viewer.scene.primitives.add(
      new Cesium.Primitive({
        geometryInstances: new Cesium.GeometryInstance({
          geometry: new Cesium.RectangleGeometry({
            rectangle: Cesium.Rectangle.fromDegrees(...this.bounds),
            vertexFormat: Cesium.EllipsoidSurfaceAppearance.VERTEX_FORMAT
          })
        }),
        appearance: new Cesium.EllipsoidSurfaceAppearance({
          aboveGround: false
        }),
        show: true
      })
    )
    if (this.provider) {
      this.provider.appearance.material = new Cesium.Material({
        fabric: {
          type: 'Image',
          uniforms: {
            image: url
          }
        }
      })
    }
  }

  createEntity() {
    this.provider = this.viewer.entities.add({
      show: true,
      rectangle: {
        coordinates: Cesium.Rectangle.fromDegrees(...this.bounds),
        material: this.getImageMaterialProperty()
      }
    })
  }

  createImageryLayer() {
    const url = this.heatmap.getDataURL()
    this.provider = this.viewer.imageryLayers.addImageryProvider(
      new Cesium.SingleTileImageryProvider({
        url: url,
        tileWidth: 10,
        tileHeight: 10,
        rectangle: Cesium.Rectangle.fromDegrees(...this.bounds)
      })
    )
  }

  destory() {
    if (this.element) {
      document.body.removeChild(this.element)
      this.element = null
      if (this.provider instanceof Cesium.ImageryLayer) {
        this.viewer.imageryLayers.remove(this.provider)
      } else if (this.provider instanceof Cesium.Primitive) {
        this.viewer.scene.primitives.remove(this.provider)
      } else if (this.provider instanceof Cesium.Entity) {
        this.viewer.entities.remove(this.provider)
      }
      if (this.cameraMoveEnd) {
        this.viewer.camera.moveEnd.removeEventListener(this.cameraMoveEnd)
        this.cameraMoveEnd = null
      }
      this.provider = null
    }
  }

  getImageMaterialProperty() {
    const url = this.heatmap.getDataURL()
    const material = new Cesium.ImageMaterialProperty({
      image: url
    })
    return material
  }

  getMinMax(values) {
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

  updateLayer() {
    const src = this.heatmap.getDataURL()
    if (this.provider instanceof Cesium.ImageryLayer) {
      this.viewer.imageryLayers.remove(this.provider)

      this.createImageryLayer()
    } else if (this.provider instanceof Cesium.Primitive) {
      this.provider.appearance.material.uniforms.image = src
    } else if (this.provider instanceof Cesium.Entity) {
      if (this.provider.rectangle)
        this.provider.rectangle.material = this.getImageMaterialProperty()
    }
  }

  updateRadius(radius) {
    const { heatmapOptions } = this
    const currentData = this.heatmap.getData()
    if (currentData?.data) {
      for (let i in currentData.data) {
        const data = currentData.data[i]
        data.radius = radius
      }
    }
    this.heatmap.setData(currentData)
    this.heatmapOptions = { ...heatmapOptions, ...{ radius } }
    this.updateLayer()
    // if (this.options?.onRadiusChange) {
    //   this.options.onRadiusChange(radius)
    // }
  }
  addListener() {
    const maxRadius = 100
    const min = 6375000
    const max = 10000000
    this.cameraMoveEnd = () => {
      if (this.heatmapOptions && this.heatmap && this.heatmapDataOptions) {
        const h = this.viewer.camera.getMagnitude()
        const distance = this?.options?.cameraHeightDistance
          ? this.options.cameraHeightDistance
          : 1000
        if (Math.abs(h - this.lastCameraHeight) > distance) {
          this.lastCameraHeight = h
          if (typeof min === 'number' && typeof max === 'number') {
            const radius = parseInt(
              (
                this.initRadius +
                ((maxRadius - this.initRadius) * (h - min)) / (max - min)
              ).toFixed(0)
            )
            if (radius) {
              this.updateRadius(radius)
            }
          }
        }
      }
    }
    this.viewer.camera.moveEnd.addEventListener(this.cameraMoveEnd)
  }
}
