import * as Cesium from 'cesium'

export const loadDiffuseEffect = (viewer) => {
  viewer.scene.postProcessStages.fxaa.enabled = true
  viewer.scene.primitives.add(Cesium.createOsmBuildingsAsync())

  const positions = [
    Cesium.Cartographic.fromDegrees(-122.4041, 37.7833),
    Cesium.Cartographic.fromDegrees(-118.2437, 34.0522),
    Cesium.Cartographic.fromDegrees(-74.0059, 40.7128)
  ]
  const property = new Cesium.SampledPositionProperty()

  for (let i = 0; i < positions.length; i++) {
    const position = Cesium.Cartesian3.fromRadians(
      positions[i].longitude,
      positions[i].latitude,
      positions[i].height
    )
    const time = Cesium.JulianDate.addSeconds(
      viewer.clock.startTime,
      i * 10,
      new Cesium.JulianDate()
    )
    property.addSample(time, position)
  }

  const entity = viewer.entities.add({
    name: 'Path',
    position: property,
    path: {
      leadTime: 0,
      trailTime: 60,
      resolution: 1,
      width: 3,
      material: new Cesium.PolylineGlowMaterialProperty({
        glowPower: 0.1,
        color: Cesium.Color.YELLOW
      })
    }
  })

  viewer.camera.flyTo(entity)

  const path = entity.path
  // viewer.camera.flyPath(path, {
  //   duration: 10,
  //   pitchAdjustHeight: 1000,
  //   maxPitch: Cesium.Math.toRadians(70),
  //   onComplete: function () {
  //     viewer.clock.shouldAnimate = false
  //   }
  // })
  // 播放动画
  viewer.clock.shouldAnimate = true
}

const generateRandomLines = (center, num) => {
  let geometryInstances = []
  for (let i = 0; i < num; i++) {
    let lon = center[0] + (Math.random() - 0.5) * 0.1
    let lat = center[1] + (Math.random() - 0.5) * 0.1
    const geometry = new Cesium.PolylineGeometry({
      positions: Cesium.Cartesian3.fromDegreesArrayHeights([
        lon,
        lat,
        0,
        lon,
        lat,
        5000 * Math.random()
      ]),
      width: 1.0
    })
    const instance = new Cesium.GeometryInstance({ geometry: geometry })
    geometryInstances.push(instance)
  }
  return geometryInstances
}

export const loadVerticalLineEffect = (viewer) => {
  if (Cesium.FeatureDetection.supportsImageRenderingPixelated()) {
    //判断是否支持图像渲染像素化处理
    viewer.resolutionScale = window.devicePixelRatio
  }
  viewer.scene.postProcessStages.fxaa.enabled = true
  const fragmentShaderSource = `
        uniform vec4 color;
        uniform float speed;
        uniform float percent;
        uniform float gradient;
        
        czm_material czm_getMaterial(czm_materialInput materialInput){
          czm_material material = czm_getDefaultMaterial(materialInput);
          vec2 st = materialInput.st;
          float t = fract(czm_frameNumber * speed / 1000.0);
          t *= (1.0 + percent);
          float alpha = smoothstep(t- percent, t, st.s) * step(-t, -st.s);
          alpha += gradient;
          material.diffuse = color.rgb;
          material.alpha = alpha;
          material.emission = vec3(0.7);
          return material;
        }
        `
  viewer.scene.primitives.add(
    new Cesium.Primitive({
      geometryInstances: generateRandomLines([104.065, 30.659], 100),
      appearance: new Cesium.PolylineMaterialAppearance({
        material: new Cesium.Material({
          fabric: {
            uniforms: {
              color: new Cesium.Color(1.0, 0.5, 0.0, 0.5),
              speed: 5.0,
              percent: 0.2,
              gradient: 0.0
            },
            source: fragmentShaderSource
          }
        })
      }),
      allowPicking: false
    })
  )
  const center = Cesium.Cartesian3.fromDegrees(104.065, 30.659)
  viewer.camera.lookAt(center, new Cesium.Cartesian3(0.0, -10000.0, 3930.0))
  viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY)
}
