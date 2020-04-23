import React, { useMemo, useRef } from 'react'
import { useLoader, useThree, useFrame } from 'react-three-fiber'
import {
  Vector3,
  Font,
  TextureLoader,
  Color,
  DoubleSide,
  Quaternion,
} from 'three'
import TextGeometry from './TextGeometry'
import robotoFont from './fonts/roboto/regular.json'
import robotoTexture from './fonts/roboto/regular.png'
import { vertex, fragment } from './shaders'

export const TOP = 'top'
export const LEFT = 'left'
export const CENTER = 'center'
export const BOTTOM = 'bottom'
export const RIGHT = 'right'

/**
 * Displays the disired text with background and border using the supplied msdf (Multi-Signed Distance Fields) font.
 * text: string
 * width: percentage of viewport width - defaults to 100 (full width)
 * alignment: text alignment when there is a width <LEFT, CENTER, RIGHT> - defaults to 'CENTER'
 * textColor: hexadecimal triplet or CSS-style string for the color - defaults to black
 * textAlpha: alpha value of 0.0 to 1.0 - defaults to 1.0 (opaque)
 * backgroundColor: hexadecimal triplet or CSS-style string for the color - defaults to black
 * backgroundAlpha: alpha value of 0.0 to 1.0 - defaults to 0.0 (transparent)
 * borderColor: hexadecimal triplet or CSS-style string for the color - defaults to black
 * borderAlpha: alpha value of 0.0 to 1.0 - defaults to 0.0 (transparent)
 * borderWidth: width of the border area to fill in - defaults to 0
 * borderSmoothing: fraction portion of the border to smooth - defaults to 0
 * borderRadius: radius for the corners - defaults to 0,
 * borderBuffer: extra padding to add onto the background (mostly so the border doesn't draw over the text) - defaults to 0,
 * fontSize: numeric pixel size of font - defaults to 12
 * fontData: json font definition date - defaults to roboto-regular
 * textureData: png font texture date - deafaults to roboto-regular
 * anchorVert, anchorHorz: The anchor point of the text object that will be placed at the placement point - defaults to the center
 * positionVert, positionHorz: Percentage of viewport between the anchor and the top/left - defaults to the center of the viewport
 * depthTest: Turn on/off render depth testinting - defaults to true
 */
export const Text = ({
  text = '',
  width = 100,
  alignment = CENTER,
  textColor = 0x000000,
  textAlpha = 1.0,
  backgroundColor = 0x000000,
  backgroundAlpha = 0.0,
  borderColor = 0x000000,
  borderAlpha = 0.0,
  borderWidth = 0,
  borderSmoothing = 0,
  borderRadius = 0,
  borderBuffer = 0,
  fontSize = 12,
  fontData = robotoFont,
  textureData = robotoTexture,
  anchorVert = CENTER,
  anchorHorz = CENTER,
  positionVert = 50,
  positionHorz = 50,
  depthTest = true,
}) => {
  // Font Data
  const font = useMemo(() => {
    return new Font(fontData)
  }, [fontData])

  const hasBackground = useMemo(() => backgroundAlpha > 0, [backgroundAlpha])
  const hasBorders = useMemo(() => borderRadius > 0 || borderWidth > 0, [
    borderRadius,
    borderWidth,
  ])

  // Texture Data
  const texture = useLoader(TextureLoader, textureData)

  // Uniforms for shader
  const uniforms = useMemo(() => {
    const textColorArray = new Color(textColor).toArray()
    textColorArray.push(textAlpha)
    const borderColorArray = new Color(borderColor).toArray()
    borderColorArray.push(borderAlpha)
    const backgroundColorArray = new Color(backgroundColor).toArray()
    backgroundColorArray.push(backgroundAlpha)

    const uniforms = {
      textColor: { value: textColorArray },
      backgroundColor: { value: backgroundColorArray },
      borderColor: { value: borderColorArray },
      borderWidth: { value: borderWidth },
      borderRadius: { value: borderRadius },
      borderSmoothing: { value: borderSmoothing },
      map: { value: texture },
    }
    return uniforms
  }, [
    textColor,
    textAlpha,
    backgroundColor,
    backgroundAlpha,
    borderColor,
    borderAlpha,
    borderWidth,
    borderRadius,
    borderSmoothing,
    texture,
  ])

  // Retrieve the viewport from the rendering engine
  const { camera, size } = useThree()

  // Calculate the desired width of the text (for wrapping) based on the "width" prop (percentage of the screen width)
  const adjustedTextWidth = useMemo(() => {
    return (size.width * font.data.info.size * (1 / fontSize) * width) / 100
  }, [size.width, font.data.info.size, fontSize, width])

  // Create userData based on the text so that the screen will update if the text changes
  const userData = useMemo(() => {
    return { text }
  }, [text])

  // Capture the camera postion so we can orient the txt towards it
  const cameraPosition = useMemo(() => {
    const vec = new Vector3()
    camera.getWorldPosition(vec)
    return vec
  }, [camera])

  const worldQuaternion = useMemo(() => new Quaternion())

  const meshRef = useRef()

  // Called whenever the mesh updates. Here we calculate and set the postion of the text.
  useFrame(() => {
    const self = meshRef.current

    const box = self.geometry.boundingBox
    const sphere = self.geometry.boundingSphere

    const anchorOffset = {
      x:
        anchorHorz === LEFT
          ? -box.min.x
          : anchorHorz === CENTER
          ? -sphere.center.x
          : anchorHorz === RIGHT
          ? -box.max.x
          : 0,
      y:
        anchorVert === TOP
          ? box.min.y
          : anchorVert === CENTER
          ? sphere.center.y
          : anchorVert === BOTTOM
          ? box.max.y
          : 0,
    }

    const worldPosition = self.getWorldPosition(self.position)

    const aspect = size.width / size.height
    const distance = cameraPosition.distanceTo(worldPosition)
    const fov = (camera.fov * Math.PI) / 180 // convert vertical fov to radians
    const viewHeight = 2 * Math.tan(fov / 2) * distance // visible
    const viewWidth = viewHeight * aspect
    const factor = size.width / viewWidth
    const scale = fontSize / (factor * font.data.info.size)

    const placementOffset = {
      x: (viewWidth * positionHorz) / 100 - viewWidth / 2,
      y: viewHeight / 2 - (viewHeight * positionVert) / 100,
    }

    const position = [
      anchorOffset.x * scale + placementOffset.x,
      anchorOffset.y * scale + placementOffset.y,
      0,
    ]

    const upright = new Quaternion().setFromAxisAngle(
      new Vector3(1, 0, 0),
      Math.PI
    )

    const rotation = self.parent
      .getWorldQuaternion(worldQuaternion)
      .conjugate()
      .multiply(camera.quaternion)
      .multiply(upright)

    self.position.set(...position)
    self.setRotationFromQuaternion(rotation)
    self.scale.set(scale, scale, scale)
  })

  return (
    <mesh name='Text' ref={meshRef} userData={userData}>
      <TextGeometry
        attach='geometry'
        text={text}
        width={adjustedTextWidth}
        align={alignment}
        font={font.data}
        borderRadius={borderRadius}
        borderWidth={borderWidth}
        borderBuffer={borderBuffer}
        hasBackground={hasBackground}
        hasBorders={hasBorders}
      />
      <shaderMaterial
        attach='material'
        depthTest={depthTest}
        side={DoubleSide}
        args={[
          {
            transparent: true,
            vertexShader: vertex,
            fragmentShader: fragment,
            uniforms,
          },
        ]}
      />
    </mesh>
  )
}
