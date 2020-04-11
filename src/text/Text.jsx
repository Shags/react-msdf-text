import React, { useMemo, useCallback } from 'react'
import { useLoader, useThree } from 'react-three-fiber'
import * as THREE from 'three'
import TextGeometry from './TextGeometry'
import robotoFont from './fonts/roboto/Roboto-Regular.json'
import robotoTexture from './fonts/roboto/Roboto-Regular.png'
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
}) => {
  // Font Data
  const font = useMemo(() => {
    return new THREE.Font(fontData)
  }, [fontData])

  const hasBackground = useMemo(() => backgroundAlpha > 0, [backgroundAlpha])
  const hasBorders = useMemo(() => borderRadius > 0 || borderWidth > 0, [
    borderRadius,
    borderWidth,
  ])

  // Texture Data
  const { texture } = useLoader(THREE.TextureLoader, textureData)

  // Uniforms for shader
  const uniforms = useMemo(() => {
    const textColorArray = new THREE.Color(textColor).toArray()
    textColorArray.push(textAlpha)
    const borderColorArray = new THREE.Color(borderColor).toArray()
    borderColorArray.push(borderAlpha)
    const backgroundColorArray = new THREE.Color(backgroundColor).toArray()
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
  const { viewport } = useThree()

  // Calculate the scale of the font using the viewport factor
  const scale = useMemo(() => {
    const view = 1 / viewport.factor
    return (view / font.data.info.size) * fontSize
  }, [font.data.info.size, fontSize, viewport.factor])

  // Calculate the desired width of the text (for wrapping) based on the "width" prop (percentage of the screen width)
  const adjustedTextWidth = useMemo(() => {
    return ((viewport.width / scale) * width) / 100
  }, [scale, viewport.width, width])

  // Create userData based on the text so that the screen will update if the text changes
  const userData = useMemo(() => {
    return { text }
  }, [text])

  // Called whenever the mesh updates. Here we calculate and set the postion of the text.
  const update = useCallback(
    (self) => {
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

      const placementOffset = {
        x: (viewport.width * positionHorz) / 100 - viewport.width / 2,
        y: viewport.height / 2 - (viewport.height * positionVert) / 100,
      }

      const position = [
        anchorOffset.x * scale + placementOffset.x,
        anchorOffset.y * scale + placementOffset.y,
        0,
      ]

      self.scale.set(scale, scale, scale)
      self.position.set(...position)
      self.rotation.set(Math.PI, 0, 0)
    },
    [
      anchorHorz,
      anchorVert,
      positionHorz,
      positionVert,
      scale,
      viewport.height,
      viewport.width,
    ]
  )

  return (
    <mesh name='Text' onUpdate={update} userData={userData}>
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
