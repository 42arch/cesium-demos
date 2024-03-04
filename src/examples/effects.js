import * as Cesium from 'cesium'

const centerPosition = [121.48, 31.21]
let verticalLine
let radarLine
let diffuse

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
    viewer.resolutionScale = window.devicePixelRatio
  }
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
  verticalLine = viewer.scene.primitives.add(
    new Cesium.Primitive({
      geometryInstances: generateRandomLines([121.48, 31.21], 100),
      appearance: new Cesium.PolylineMaterialAppearance({
        material: new Cesium.Material({
          fabric: {
            uniforms: {
              color: new Cesium.Color(0.8, 0.5, 0.8, 0.5),
              speed: 3.0,
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
  const center = Cesium.Cartesian3.fromDegrees(121.48, 31.21)
  viewer.camera.lookAt(center, new Cesium.Cartesian3(0.0, -10000.0, 3930.0))

  viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY)
}

export const removeVerticalLineEffect = (viewer) => {
  viewer.scene.primitives.remove(verticalLine)
}

export const loadCircleScanEffect1 = (viewer) => {
  viewer.scene.postProcessStages.fxaa.enabled = true

  const radarShader = `
  in vec2 v_textureCoordinates;
  uniform sampler2D colorTexture;
  uniform sampler2D depthTexture;
  uniform vec3 centerWC;
  uniform vec3 planeNormalWC;
  uniform vec3 lineNormalWC;
  uniform float radius;
  uniform vec4 color;

  float getDepth(){
    float z_window = czm_unpackDepth(texture(depthTexture, v_textureCoordinates));
    z_window = czm_reverseLogDepth(z_window);
    float n_range = czm_depthRange.near;
    float f_range = czm_depthRange.far;
    return  (2.0 * z_window - n_range - f_range) / (f_range - n_range);
  }

  vec4 toEye(in vec2 uv, in float depth){
    vec2 xy = vec2((uv.x * 2.0 - 1.0),(uv.y * 2.0 - 1.0));
    vec4 posInCamera =czm_inverseProjection * vec4(xy, depth, 1.0);
    posInCamera = posInCamera / posInCamera.w;
    return posInCamera;
  }

  bool isPointOnLineRight(in vec3 ptOnLine, in vec3 lineNormal, in vec3 testPt)
  {
    vec3 v01 = testPt - ptOnLine;
    normalize(v01);
    vec3 temp = cross(v01, lineNormal);
    vec4 planeNormalEC = czm_view * vec4(planeNormalWC,0);
    float d = dot(temp, planeNormalEC.xyz);
    return d > 0.5;
  }

  vec3 pointProjectOnPlane(in vec3 planeNormal, in vec3 planeOrigin, in vec3 point)
  {
    vec3 v01 = point -planeOrigin;
    float d = dot(planeNormal, v01) ;
    return (point - planeNormal * d);
  }

  float distancePointToLine(in vec3 ptOnLine, in vec3 lineNormal, in vec3 testPt)
  {
    vec3 tempPt = pointProjectOnPlane(lineNormal, ptOnLine, testPt);
    return length(tempPt - ptOnLine);
  }

  void main() {
    out_FragColor = texture(colorTexture, v_textureCoordinates);
    float depth = getDepth();
    vec4 viewPos = toEye(v_textureCoordinates, depth);
    vec4 centerEC = czm_view * vec4(centerWC,1);
    vec4 planeNormalEC = czm_view * vec4(planeNormalWC,0);
    vec4 lineNormalEC = czm_view * vec4(lineNormalWC,0);
    vec3 prjOnPlane = pointProjectOnPlane(planeNormalEC.xyz, centerEC.xyz, viewPos.xyz);
    float dis = length(prjOnPlane.xyz - centerEC.xyz);
    float diameter = radius * 2.0;
    if(dis < radius){
      float f0 = 1.0 -abs(radius - dis) / radius;
      f0 = pow(f0, 64.0);
      vec3 lineEndPt = vec3(centerEC.xyz) + vec3(lineNormalEC.xyz) * radius;
      float f = 0.0;
      if(isPointOnLineRight(centerEC.xyz, lineNormalEC.xyz, prjOnPlane.xyz)) {
        float dis1= length(prjOnPlane.xyz - lineEndPt);
        f = abs(diameter - dis1) / diameter;
        f = pow(f, 3.0);
      }
      out_FragColor = mix(out_FragColor, color, f + f0);
    }
  }

  `

  const center = Cesium.Cartesian3.fromDegrees(
    121.48,
    31.21,
    0,
    Cesium.Ellipsoid.WGS84
  )
  let up = Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(
    center,
    new Cesium.Cartesian3()
  )
  let time = new Date().getTime()

  const stage = new Cesium.PostProcessStage({
    name: 'radar-scan',
    fragmentShader: radarShader,
    uniforms: {
      centerWC: center,
      planeNormalWC: up,
      lineNormalWC: function () {
        let rotateQ = new Cesium.Quaternion()
        let rotateM = new Cesium.Matrix3()

        let east = Cesium.Cartesian3.cross(
          Cesium.Cartesian3.UNIT_Z,
          up,
          new Cesium.Cartesian3()
        )

        let now = new Date().getTime()
        let angle = Cesium.Math.PI * 2 * ((now - time) / 1e4) * 1

        Cesium.Quaternion.fromAxisAngle(up, angle, rotateQ)

        Cesium.Matrix3.fromQuaternion(rotateQ, rotateM)

        Cesium.Matrix3.multiplyByVector(rotateM, east, east)

        Cesium.Cartesian3.normalize(east, east)

        return east
      },
      radius: 10000,
      color: Cesium.Color.AQUAMARINE
    }
  })

  viewer.scene.postProcessStages.add(stage)
  viewer.scene.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(...centerPosition, 370)
    // orientation: {
    //   heading: Cesium.Math.toRadians(10),
    //   pitch: Cesium.Math.toRadians(-10)
    // }
  })
}

// 雷达线效果
class RadarScanMaterialProperty {
  constructor(options) {
    this._definitionChanged = new Cesium.Event()
    this._color = undefined
    this._speed = undefined
    this.color = options.color
    this.speed = options.speed
  }

  get isConstant() {
    return false
  }

  get definitionChanged() {
    return this._definitionChanged
  }

  getType() {
    return Cesium.Material.RadarScanMaterialType
  }

  getValue(time, result) {
    if (!Cesium.defined(result)) {
      result = {}
    }

    result.color = Cesium.Property.getValueOrDefault(
      this._color,
      time,
      Cesium.Color.RED,
      result.color
    )
    result.speed = Cesium.Property.getValueOrDefault(
      this._speed,
      time,
      10,
      result.speed
    )
    return result
  }

  equals(other) {
    return (
      this === other ||
      (other instanceof RadarScanMaterialProperty &&
        Cesium.Property.equals(this._color, other._color) &&
        Cesium.Property.equals(this._speed, other._speed))
    )
  }
}

Object.defineProperties(RadarScanMaterialProperty.prototype, {
  color: Cesium.createPropertyDescriptor('color'),
  speed: Cesium.createPropertyDescriptor('speed')
})

Cesium.Material.RadarScanMaterialProperty = 'RadarScanMaterialProperty'
Cesium.Material.RadarScanMaterialType = 'RadarScanMaterialType'
const radarScanMaterialSource = `
    uniform vec4 color;
    uniform float speed;

    #define PI 3.14159265359

    czm_material czm_getMaterial(czm_materialInput materialInput){
    czm_material material = czm_getDefaultMaterial(materialInput);
    vec2 st = materialInput.st;
    vec2 scrPt = st * 2.0 - 1.0;
    float time = czm_frameNumber * speed / 1000.0 ;
    vec3 col = vec3(0.0);
    mat2 rot;
    float theta = -time * 1.0 * PI - 2.2;
    float cosTheta, sinTheta;
    cosTheta = cos(theta);
    sinTheta = sin(theta);
    rot[0][0] = cosTheta;
    rot[0][1] = -sinTheta;
    rot[1][0] = sinTheta;
    rot[1][1] = cosTheta;
    vec2 scrPtRot = rot * scrPt;
    float angle = 1.0 - (atan(scrPtRot.y, scrPtRot.x) / 6.2831 + 0.5);
    float falloff = length(scrPtRot);
    material.alpha = pow(length(col + vec3(.5)),5.0);
    material.diffuse =  (0.5 +  pow(angle, 2.0) * falloff ) *   color.rgb    ;
    return material;
    }

     `

Cesium.Material._materialCache.addMaterial(
  Cesium.Material.RadarScanMaterialType,
  {
    fabric: {
      type: Cesium.Material.RadarScanMaterialType,
      uniforms: {
        color: new Cesium.Color(1.0, 0.0, 0.0, 1.0),
        speed: 10.0
      },
      source: radarScanMaterialSource
    },
    translucent: function () {
      return true
    }
  }
)

export const loadRadarLineEffect = (viewer) => {
  radarLine = viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(...centerPosition),
    name: 'radar-scan',
    ellipse: {
      semiMajorAxis: 3000.0,
      semiMinorAxis: 3000.0,
      material: new RadarScanMaterialProperty({
        color: new Cesium.Color(1.0, 1.0, 0.0, 0.7),
        speed: 10.0
      }),
      height: 20.0,
      heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
      outline: true,
      outlineColor: new Cesium.Color(1.0, 1.0, 0.0, 1.0)
    }
  })

  viewer.scene.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(...centerPosition, 20000)
  })
}

export const removeRadarLineEffect = (viewer) => {
  viewer.entities.remove(radarLine)
}

// 扩散圆效果
class CircleDiffuseMaterialProperty {
  constructor(options) {
    this._definitionChanged = new Cesium.Event()
    this._color = undefined
    this._colorSubscription = undefined
    this._speed = undefined
    this._speedSubscription = undefined
    this.color = options.color || Cesium.Color.fromBytes(0, 255, 255, 255)
    this.speed = options.speed || 1
  }

  get isConstant() {
    return false
  }

  get definitionChanged() {
    return this._definitionChanged
  }

  getType() {
    return Cesium.Material.CircleDiffuseType
  }

  getValue(time, result) {
    if (!Cesium.defined(result)) {
      result = {}
    }

    result.color = Cesium.Property.getValueOrDefault(
      this._color,
      time,
      Cesium.Color.RED,
      result.color
    )
    result.speed = Cesium.Property.getValueOrDefault(
      this._speed,
      time,
      10,
      result.speed
    )
    return result
  }
}

Object.defineProperties(CircleDiffuseMaterialProperty.prototype, {
  color: Cesium.createPropertyDescriptor('color'),
  speed: Cesium.createPropertyDescriptor('speed')
})

Cesium.Material.CircleDiffuseMaterialProperty = 'CircleDiffuseMaterialProperty'
Cesium.Material.CircleDiffuseType = 'CircleDiffuse'

const CircleDiffuseSource = `
uniform vec4 color;
uniform float speed;

vec3 circlePing(float r, float innerTail,  float frontierBorder, float timeResetSeconds,  float radarPingSpeed,  float fadeDistance){
  float t = fract(czm_frameNumber * speed / 1000.0);
  float time = mod(t, timeResetSeconds) * radarPingSpeed;
  float circle;
  circle += smoothstep(time - innerTail, time, r) * smoothstep(time + frontierBorder,time, r);
  circle *= smoothstep(fadeDistance, 0.0, r);
  return vec3(circle);
}

czm_material czm_getMaterial(czm_materialInput materialInput){
  czm_material material = czm_getDefaultMaterial(materialInput);
  vec2 st = materialInput.st * 2.0  - 1.0 ;
  vec2 center = vec2(0.);
  float time = fract(czm_frameNumber * speed / 1000.0);
  vec3 flagColor;
  float r = length(st - center) / 4.;
  flagColor += circlePing(r, 0.25, 0.025, 4.0, 0.3, 1.0) * color.rgb;
  material.alpha = length(flagColor);
  material.diffuse = flagColor.rgb;
  return material;
}

     `

Cesium.Material._materialCache.addMaterial(Cesium.Material.CircleDiffuseType, {
  fabric: {
    type: Cesium.Material.CircleDiffuseType,
    uniforms: {
      color: new Cesium.Color(1.0, 0.0, 0.0, 0.7),
      speed: 3.0
    },
    source: CircleDiffuseSource
  },
  translucent: function (material) {
    return true
  }
})

export const loadDiffuseEffect = (viewer) => {
  diffuse = viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(...centerPosition),
    name: 'diffuse',
    ellipse: {
      semiMajorAxis: 3000.0,
      semiMinorAxis: 3000.0,
      material: new CircleDiffuseMaterialProperty({
        color: Cesium.Color.RED.withAlpha(0.1),
        speed: 8.0
      })
    }
  })

  viewer.scene.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(...centerPosition, 20000)
  })
}

export const removeDiffuseEffect = (viewer) => {
  viewer.entities.remove(diffuse)
}
