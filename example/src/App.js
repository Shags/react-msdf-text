import React, {Suspense} from 'react'
import { Canvas } from 'react-three-fiber'
import { Text, CENTER } from 'react-msdf-text'

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
          textColor={0x0E0E0E}
          backgroundColor={'hsl(0, 100%, 50%)'}
          backgroundAlpha={.8}
          borderColor={'skyblue'}
          borderAlpha={.9}
          borderWidth={5}
          borderRadius={10}
          borderSmoothing={0.1}
          borderBuffer={3}
        />
      </Suspense>
    </Canvas>
  )
}

export default App
