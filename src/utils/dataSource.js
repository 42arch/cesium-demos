import * as Cesium from 'cesium'

let geojson
let topojson
let osmBuildings

export const loadGeoJSON = (viewer, path) => {
  const promise = Cesium.GeoJsonDataSource.load(path, {
    stroke: Cesium.Color.WHITE.withAlpha(0.2),
    fill: Cesium.Color.YELLOW.withAlpha(0.2),
    strokeWidth: 2
  })
  promise.then((dataSource) => {
    geojson = dataSource
    viewer.dataSources.add(dataSource)
    const entities = dataSource.entities.values

    viewer.flyTo(entities)
  })
}

export const removeGeoJSON = (viewer) => {
  if (geojson) {
    viewer.dataSources.remove(geojson)
  }
}

export const loadTopoJSON = (viewer, path) => {
  Cesium.Math.setRandomNumberSeed(0)
  const promise = Cesium.GeoJsonDataSource.load(path, {
    stroke: Cesium.Color.WHITE.withAlpha(0.2),
    fill: Cesium.Color.YELLOW.withAlpha(0.2),
    strokeWidth: 2
  })
  promise.then((dataSource) => {
    topojson = dataSource
    viewer.dataSources.add(dataSource)
    const entities = dataSource.entities.values

    const colorHash = {}
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i]
      const name = entity.name
      let color = colorHash[name]
      if (!color) {
        color = Cesium.Color.fromRandom({
          alpha: 0.9
        })
        colorHash[name] = color
      }

      entity.polygon.material = color
      entity.polygon.outline = false

      entity.polygon.extrudedHeight = entity.properties.Population / 100.0
    }

    viewer.flyTo(entities)
  })
}

export const removeTopoJSON = (viewer) => {
  if (topojson) {
    viewer.dataSources.remove(topojson)
  }
}

export const loadOSMBuildings = async (viewer) => {
  osmBuildings = await Cesium.createOsmBuildingsAsync()
  viewer.scene.primitives.add(osmBuildings)

  viewer.scene.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(121.5, 31.24, 370),
    orientation: {
      heading: Cesium.Math.toRadians(10),
      pitch: Cesium.Math.toRadians(-10)
    }
  })
}

export const removeOSMBuildings = (viewer) => {
  viewer.scene.primitives.remove(osmBuildings)
}
