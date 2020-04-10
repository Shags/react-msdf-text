import React, {Suspense} from 'react'
import { Canvas } from 'react-three-fiber'
import {Text, CENTER}  from 'react-msdf-text'

const App = () => {
  return (
    <Canvas style={{ width: "100vw", height: "100vh" }}>
      <Suspense fallback={<></>}>
        <Text
          text={'Here is an example of high quality MSDF text. The text will wrap at the edges. The font color, font size, and backgound color are all configureable. The border color, width, blend, radius are also configurable.'}
          positionVert={50}
          anchorVert={CENTER}
          width={80}
          fontSize={50}
          textColor={[.1, .1, .1, 1]}
          backgroundColor={[1.0, .8, .8, 1]}
          borderColor={[.7, 0, .7, 1]}
          borderWidth={20}
          borderRadius={50}
          borderSmoothing={0.1}
          borderBuffer={30}
        />
      </Suspense>
    </Canvas>
  )
}

export default App
