import React, { useMemo, useCallback, Fragment } from 'react'
import {
  computeBoundingBox,
  computeBoundingSphere,
  getGlyphs,
  getIndexAttribute,
  getPages,
  getPositions,
  getUvs
} from './utils'

// Creates the geometry for the text, background, and borders
const TextGeometry = (props) => {
  const {
    font, // Required
    text,
    width,
    lineHeight = null,
    letterSpacing = null,
    multipage = false,
    flipY = true,
    tabSize = null,
    mode = null, // 'nowrap', 'pre'
    start = null,
    end = null,
    align = null, // 'left', 'right', 'center'
    hasBackground = false,
    hasBorders = false,
    borderRadius = 0,
    borderWidth = 0,
    borderBuffer = 0
  } = props

  // Array of glyphs for the text
  const glyphs = useMemo(
    () => getGlyphs(
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
    ),
    [align, end, font, letterSpacing, lineHeight, mode, start, tabSize, text, width]
  )

  // Geometeric positions of the text background and borders
  const positions = useMemo(
    () => getPositions(glyphs, hasBackground, hasBorders, borderRadius, borderWidth, borderBuffer),
    [borderBuffer, borderRadius, borderWidth, glyphs, hasBackground, hasBorders]
  )

  // Textile postions used for retrieving data from the font texture and determining how to color the background and borders
  const uvs = useMemo(() => {
    const texWidth = font.common.scaleW
    const texHeight = font.common.scaleH
    const uvs = getUvs(glyphs, texWidth, texHeight, flipY, hasBackground, hasBorders)
    return uvs
  }, [flipY, font.common.scaleH, font.common.scaleW, glyphs, hasBackground, hasBorders])

  const index = useMemo(() => {
    return getIndexAttribute(glyphs.length, hasBackground, hasBorders)
  }, [glyphs.length, hasBackground, hasBorders])

  const pages = useMemo(() => {
    return getPages(glyphs)
  }, [glyphs]) 

  const update = useCallback(self => {
    self.boundingBox = computeBoundingBox(self.attributes.position.array)
    self.boundingSphere = computeBoundingSphere(self.attributes.position.array)

    self.attributes.position.needsUpdate = true
    self.attributes.uv.needsUpdate = true
  }, [])

  return (
    <bufferGeometry
      name='TextGeometry'
      index={index}
      onUpdate={update}
      {...props}
    >
      {multipage ?
        <bufferAttribute
          attachObject={['attributes', 'page']}
          array={pages}
          itemSize={1}
        /> : <></>
      }
      <bufferAttribute
        attachObject={['attributes', 'position']}
        array={positions}
        itemSize={2}
      />
      <bufferAttribute
        attachObject={['attributes', 'uv']}
        array={uvs}
        itemSize={2}
      />
    </bufferGeometry>
  )
}

export default TextGeometry