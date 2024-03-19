import * as Cesium from 'cesium'

let particleSystem

export const loadParticles = (viewer) => {
  const position = Cesium.Cartesian3.fromDegrees(
    116.34516786934411,
    39.99753297677145,
    80
  )
  let scratchCartographic = new Cesium.Cartographic()
  const matrix4Scratch = new Cesium.Matrix4()
  const scratchOffset = new Cesium.Cartesian3()
  const particlesModelMatrix = Cesium.Matrix4.fromTranslation(
    position,
    new Cesium.Matrix4()
  )

  const emitterModelMatrix = Cesium.Matrix4.fromTranslation(
    scratchOffset,
    matrix4Scratch
  )
  const update = (particle, time) => {
    scratchCartographic = Cesium.Cartographic.fromCartesian(
      particle.position,
      Cesium.Ellipsoid.WGS84,
      scratchCartographic
    )
    scratchCartographic.height += 0.3
    particle.position = Cesium.Cartographic.toCartesian(scratchCartographic)
  }

  particleSystem = viewer.scene.primitives.add(
    new Cesium.ParticleSystem({
      image: './images/smoke.png', //1 (2) fire3 粒子图像
      startColor: Cesium.Color.YELLOW,
      endColor: Cesium.Color.RED.withAlpha(0.1),
      startScale: 1,
      endScale: 5,
      maximumMass: 50,
      particleLife: 2,
      speed: 0.0002,
      imageSize: new Cesium.Cartesian2(24.0, 24.0),
      maximumParticleLife: 15.0,
      minimumParticleLife: 2.1,
      maximumSpeed: 4,
      minimumSpeed: 1,
      emissionRate: 5,
      bursts: [
        // these burst will occasionally sync to create a multicolored effect
        new Cesium.ParticleBurst({
          time: 5.0,
          minimum: 10,
          maximum: 100
        }),
        new Cesium.ParticleBurst({
          time: 10.0,
          minimum: 50,
          maximum: 100
        }),
        new Cesium.ParticleBurst({
          time: 15.0,
          minimum: 200,
          maximum: 300
        })
      ],
      emitter: new Cesium.CircleEmitter(5),
      lifetime: 200,
      updateCallback: update,
      modelMatrix: particlesModelMatrix,
      emitterModelMatrix: emitterModelMatrix,
      loop: true
    })
  )

  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(
      116.34485552299206,
      39.99754814959118,
      500.0
    )
  })
}

export const removeParticles = (viewer) => {
  particleSystem && viewer.scene.primitives.remove(particleSystem)
}
