import * as THREE from 'three'
import createIndices from 'quad-indices'
import createLayout from 'layout-bmfont-text'

// finds the bounds that will hold the array of positions
const bounds = (positions) => {
  const itemSize = 2
  const box = {
    min: [positions[0], positions[1]],
    max: [positions[0], positions[1]],
  }

  const count = positions.length / itemSize

  for (let i = 0; i < count; i++) {
    const x = positions[i * itemSize + 0]
    const y = positions[i * itemSize + 1]
    box.min[0] = Math.min(x, box.min[0])
    box.min[1] = Math.min(y, box.min[1])
    box.max[0] = Math.max(x, box.max[0])
    box.max[1] = Math.max(y, box.max[1])
  }
  return box
}

// get the minimum box that can hold the positions
const computeBox = (positions) => {
  const box = bounds(positions)
  const min = new THREE.Vector3(box.min[0], box.min[1], 0)
  const max = new THREE.Vector3(box.max[0], box.max[1], 0)
  return { min, max }
}

// get the minimum sphere that will hold the postions
const computeSphere = (positions) => {
  const box = bounds(positions)
  const minX = box.min[0]
  const minY = box.min[1]
  const maxX = box.max[0]
  const maxY = box.max[1]
  const width = maxX - minX
  const height = maxY - minY
  const length = Math.sqrt(width * width + height * height)

  const center = new THREE.Vector3(minX + width / 2, minY + height / 2, 0)
  const radius = length / 2
  return { center, radius }
}

// get the UV texture mapping for the text. Also adds in magic numbers for drawing border and background if requested.
export const getUvs = (
  glyphs,
  texWidth,
  texHeight,
  flipY,
  hasBack = false,
  hasBorders = false
) => {
  const extras = (hasBack ? 1 : 0) + (hasBorders ? 8 : 0)
  var uvs = new Float32Array((glyphs.length + extras) * 4 * 2)

  var i = 0

  // We use negative uvs values to inform the shader which part of the background is being rendered.
  const offset = hasBack ? 0 : 1 // offset to keep partIds consistent even when background is not used
  for (var extra = offset; extra < extras + offset; extra++) {
    const partId = extra * -2.0 - 1.0 // -1, -3, -5, ...
    // BL
    uvs[i++] = partId - 1.0
    uvs[i++] = partId
    // TL
    uvs[i++] = partId - 1.0
    uvs[i++] = partId - 1.0
    // TR
    uvs[i++] = partId
    uvs[i++] = partId - 1.0
    // BR
    uvs[i++] = partId
    uvs[i++] = partId
  }

  glyphs.forEach((glyph) => {
    var bitmap = glyph.data
    var bw = bitmap.x + bitmap.width
    var bh = bitmap.y + bitmap.height

    // top left position
    var u0 = bitmap.x / texWidth
    var v1 = bitmap.y / texHeight
    var u1 = bw / texWidth
    var v0 = bh / texHeight

    if (flipY) {
      v1 = (texHeight - bitmap.y) / texHeight
      v0 = (texHeight - bh) / texHeight
    }

    // BL
    uvs[i++] = u0
    uvs[i++] = v1
    // TL
    uvs[i++] = u0
    uvs[i++] = v0
    // TR
    uvs[i++] = u1
    uvs[i++] = v0
    // BR
    uvs[i++] = u1
    uvs[i++] = v1
  })

  return uvs
}

// get the geometric postions for the text, background and borders.
export const getPositions = (
  glyphs,
  hasBack = false,
  hasBorders = false,
  borderRadius = 0,
  borderWidth = 0,
  borderBuffer = 0
) => {
  const size = 4 * 2
  const extras = (hasBack ? 1 : 0) + (hasBorders ? 8 : 0)
  var positions = new Float32Array((glyphs.length + extras) * size)
  var i = extras * size

  glyphs.forEach(function (glyph) {
    var bitmap = glyph.data

    // bottom left position
    var x = glyph.position[0] + bitmap.xoffset
    var y = glyph.position[1] + bitmap.yoffset

    // quad size
    var w = bitmap.width
    var h = bitmap.height

    // BL
    positions[i++] = x
    positions[i++] = y
    // TL
    positions[i++] = x
    positions[i++] = y + h
    // TR
    positions[i++] = x + w
    positions[i++] = y + h
    // BR
    positions[i++] = x + w
    positions[i++] = y
  })

  // For the background and borders, we create 9 boxes. The corner boxes are squares so that the rounded border is always circular.
  // The boxes on the edges hold the straight portions of the border on their outside edge. The center is just he backgound.
  if (hasBack || hasBorders) {
    // Get the dimensions of the text box without borders
    const { min, max } = computeBox(positions.slice(extras * size))

    // Limit the border to total size so that the border geometry doesn't overlap
    const maxBorder = Math.min(max.x - min.x, max.y - min.y) / 2 + borderBuffer
    const radius = Math.min(borderRadius, maxBorder)
    const width = Math.min(borderWidth, maxBorder)
    const borderSize = Math.max(radius, width)

    const offset = borderBuffer - borderSize
    i = 0
    if (hasBack) {
      // BL
      positions[i++] = min.x - offset
      positions[i++] = min.y - offset
      // TL
      positions[i++] = min.x - offset
      positions[i++] = max.y + offset
      // TR
      positions[i++] = max.x + offset
      positions[i++] = max.y + offset
      // BR
      positions[i++] = max.x + offset
      positions[i++] = min.y - offset
    }

    if (hasBorders) {
      const borderBox = {
        min: { x: min.x - offset, y: min.y - offset },
        max: { x: max.x + offset, y: max.y + offset },
      }
      const boxes = [
        {
          // TOP
          min: { x: borderBox.min.x, y: borderBox.min.y - borderSize },
          max: { x: borderBox.max.x, y: borderBox.min.y },
        },
        {
          // LEFT
          min: { x: borderBox.min.x - borderSize, y: borderBox.min.y },
          max: { x: borderBox.min.x, y: borderBox.max.y },
        },
        {
          // BOTTOM
          min: { x: borderBox.min.x, y: borderBox.max.y },
          max: { x: borderBox.max.x, y: borderBox.max.y + borderSize },
        },
        {
          // RIGHT
          min: { x: borderBox.max.x, y: borderBox.min.y },
          max: { x: borderBox.max.x + borderSize, y: borderBox.max.y },
        },
        {
          // TOP/LEFT
          min: {
            x: borderBox.min.x - borderSize,
            y: borderBox.min.y - borderSize,
          },
          max: { x: borderBox.min.x, y: borderBox.min.y },
        },
        {
          // LEFT/BOTTOM
          min: { x: borderBox.min.x - borderSize, y: borderBox.max.y },
          max: { x: borderBox.min.x, y: borderBox.max.y + borderSize },
        },
        {
          // BOTTOM/RIGHT
          min: { x: borderBox.max.x, y: borderBox.max.y },
          max: {
            x: borderBox.max.x + borderSize,
            y: borderBox.max.y + borderSize,
          },
        },
        {
          // RIGHT/ TOP
          min: { x: borderBox.max.x, y: borderBox.min.y - borderSize },
          max: { x: borderBox.max.x + borderSize, y: borderBox.min.y },
        },
      ]
      for (var side = 0; side < 8; side++) {
        // BL
        positions[i++] = boxes[side].min.x
        positions[i++] = boxes[side].min.y
        // TL
        positions[i++] = boxes[side].min.x
        positions[i++] = boxes[side].max.y
        // TR
        positions[i++] = boxes[side].max.x
        positions[i++] = boxes[side].max.y
        // BR
        positions[i++] = boxes[side].max.x
        positions[i++] = boxes[side].min.y
      }
    }
  }

  return positions
}

// get the glyphs that represent the text once it has been layed out
export const getGlyphs = (
  font,
  text,
  width,
  align,
  lineHeight,
  letterSpacing,
  tabSize,
  mode,
  start,
  end
) => {
  const layoutProps = {
    font,
    text,
    width,
    align,
    lineHeight,
    letterSpacing,
    tabSize,
    mode,
    start,
    end,
  }
  const layout = createLayout(layoutProps)
  const glyphs = layout.glyphs.filter(
    (glyph) => glyph.data.width * glyph.data.height > 0
  )
  return glyphs
}

export const getPages = (glyphs) => {
  const pages = new Float32Array(glyphs.length * 4 * 1)
  let i = 0
  glyphs.forEach(function (glyph) {
    const id = glyph.data.page || 0
    pages[i++] = id
    pages[i++] = id
    pages[i++] = id
    pages[i++] = id
  })
  return pages
}

export const getIndexAttribute = (
  length,
  hasBack = false,
  hasBorders = false
) => {
  const extras = (hasBack ? 1 : 0) + (hasBorders ? 8 : 0)
  var indices = createIndices({
    clockwise: true,
    type: 'uint16',
    count: length + extras,
  })

  const index = new THREE.BufferAttribute(indices, 1)
  return index
}

export const computeBoundingSphere = (positions) => {
  if (!positions || positions.length < 2) {
    return new THREE.Sphere([0, 0, 0], 0)
  }
  const sphere = computeSphere(positions)
  if (isNaN(sphere.radius)) {
    console.error(
      'THREE.BufferGeometry.computeBoundingSphere(): ' +
        'Computed radius is NaN. The ' +
        '"position" attribute is likely to have NaN values.'
    )
  }
  return new THREE.Sphere(sphere.center, sphere.radius)
}

export const computeBoundingBox = (positions) => {
  if (!positions || positions.length < 2) {
    return new THREE.Box3().makeEmpty()
  }
  const box = computeBox(positions)
  return new THREE.Box3(box.min, box.max)
}
