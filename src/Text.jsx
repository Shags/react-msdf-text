import React, { useMemo, useRef } from 'react'
import { useLoader, useThree, useFrame } from 'react-three-fiber'
import {
  Vector3,
  Font,
  TextureLoader,
  Color,
  DoubleSide,
  Quaternion,
  Matrix4,
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

const ZERO = new Vector3(0, 0, 0)

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
    const textWidth =
      (size.width * font.data.info.size * (1 / fontSize) * width) / 100
    return textWidth - borderBuffer * 2
  }, [size.width, font.data.info.size, fontSize, width, borderBuffer])

  // Create userData based on the text so that the screen will update if the text changes
  const userData = useMemo(() => {
    return { text }
  }, [text])

  // Capture the camera postion so we can orient the text towards it
  const cameraPosition = useMemo(() => {
    const vec = new Vector3()
    camera.getWorldPosition(vec)
    return vec
  }, [camera])
  const { current: cameraDirection } = useRef(new Vector3())
  const { current: cameraToPointProjection } = useRef(new Vector3())
  const { current: worldQuaternion } = useRef(new Quaternion())
  const { current: worldPosition } = useRef(new Vector3())
  const { current: matrixWorld } = useRef(new Matrix4())
  const { current: modelViewMatrix } = useRef(new Matrix4())

  const { current: textBoxSize } = useRef(new Vector3())
  const { current: adjustmentSpace } = useRef(new Vector3())
  const { current: bottomLeftAdj } = useRef(new Vector3())
  const { current: upperRightAdj } = useRef(new Vector3())

  const { current: position } = useRef(new Vector3())
  const { current: rotation } = useRef(new Quaternion())
  const { current: upright } = useRef(
    new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI)
  )

  const meshRef = useRef()

  // Called whenever the mesh updates. Here we calculate and set the postion of the text.
  useFrame(({ camera }) => {
    // Refresh some variables
    const self = meshRef.current

    matrixWorld.copy(self.parent.matrixWorld)

    worldPosition.setFromMatrixPosition(matrixWorld)
    worldQuaternion.setFromRotationMatrix(matrixWorld)

    // Calculate the model view matrix. The parents is not set initially.
    modelViewMatrix.multiplyMatrices(camera.matrixWorldInverse, matrixWorld)

    // Initialize the box adjustment values to the screen coordinates
    bottomLeftAdj.setFromMatrixPosition(modelViewMatrix)
    upperRightAdj.setFromMatrixPosition(modelViewMatrix)

    camera.getWorldPosition(cameraPosition)
    camera.getWorldDirection(cameraDirection)

    // The rotation required to get the text to face the camera. This is different than 'lookAt'.
    rotation
      .copy(worldQuaternion)
      .conjugate()
      .multiply(camera.quaternion)
      .multiply(upright)

    /** Z distance in the camera frame.
     * Caculate depth of the text's parent in relation to the camera by projecting the
     * vector of the worlds position to the camera onto the camera's direction vector. */
    cameraToPointProjection
      .copy(worldPosition)
      .sub(cameraPosition)
      .projectOnVector(cameraDirection)

    const textBox = self.geometry.boundingBox
    const sphere = self.geometry.boundingSphere
    textBox.getSize(textBoxSize)

    // Calculate the offset of the anchor position
    const anchorOffset = {
      x:
        anchorHorz === LEFT
          ? -textBox.min.x
          : anchorHorz === CENTER
          ? -sphere.center.x
          : anchorHorz === RIGHT
          ? -textBox.max.x
          : 0,
      y:
        anchorVert === TOP
          ? textBox.min.y
          : anchorVert === CENTER
          ? sphere.center.y
          : anchorVert === BOTTOM
          ? textBox.max.y
          : 0,
    }

    // View calculations
    const aspect = size.width / size.height
    const distance = cameraToPointProjection.length() // z distance to point
    const fov = (camera.fov * Math.PI) / 180 // convert vertical fov to radians
    const viewHeight = 2 * Math.tan(fov / 2) * distance // visible
    const viewWidth = viewHeight * aspect
    const factor = size.width / viewWidth
    const scale = fontSize / (factor * font.data.info.size)

    // Calculate the screen position offset
    const placementOffset = {
      x: (viewWidth * positionHorz) / 100 - viewWidth / 2,
      y: viewHeight / 2 - (viewHeight * positionVert) / 100,
    }

    // Use the offsets and scale to deterine the initial text position
    position.set(
      anchorOffset.x * scale + placementOffset.x,
      anchorOffset.y * scale + placementOffset.y,
      0
    )

    // Include the translation changes as we calculate the adjustments
    bottomLeftAdj.add(position)
    upperRightAdj.add(position)

    // We determine ho much the text box must be moved to keep it visible.
    // This is the amount of space that would be available around the text box if it was centered on the screen (how much we can move the text before it is off of the screen).
    adjustmentSpace.set(
      (viewWidth - textBoxSize.x * scale) * 0.5,
      (viewHeight - textBoxSize.y * scale) * 0.5,
      0
    )
    // If the text box is completely on the screen, then the current center of the text will be inside the adjustment space available.
    // If the text box has moved off the bottom/left side of the screen, then adding the adjustment space to the text box position will result in negative values.
    bottomLeftAdj.add(adjustmentSpace).min(ZERO)
    // If the text box has moved off the upper/right side of the screen, then subtracting the text box position from the adjustment space will reslt in negative values.
    upperRightAdj.multiplyScalar(-1).add(adjustmentSpace).min(ZERO)
    // We combine these values to get the needed adjustment. Only one of them will contain non zero values, since we can't move off of the top/right and bottom left at the same time, and these will be negative numbers.
    // The result is either negative postions adjustments for bringing the text back onto the screen from the upper/right, or negative values for the bottom/left.
    // We zero out the z axis because we are only calculating in 2D space here.
    const adj = upperRightAdj.clone().sub(bottomLeftAdj).setZ(0)

    // Add in the translations to the adjustments so that they will occur on the same plain
    adj.add(position)

    // The adjument is calculated based on the camera view. We need to rotate these adjustments into the text objects space so they can be correctly applied.
    adj.applyQuaternion(
      worldQuaternion.clone().conjugate().multiply(camera.quaternion)
    )

    self.position.copy(adj)
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
