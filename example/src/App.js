import React, {Suspense} from 'react'
import { Canvas } from 'react-three-fiber'
import { Text } from 'react-msdf-text'

const App = () => {
  return (
    <Canvas
      style={{ width: "100vw", height: "100vh" }}
      pixelRatio={window.devicePixelRatio} // Super Important. Small fonts look bad without this.
    >
      <ambientLight />
      <pointLight position={[10, 60, 260]} />
      <Suspense fallback={<></>}>
      <Text
        fontSize={10}
        text={"Hello World!"}
        borderBuffer={20}
        borderRadius={20}
        borderWidth={10}
        borderColor="blue"
        borderAlpha={1}
        borderSmoothing={0.1}
        backgroundColor="lightblue"
        backgroundAlpha={0}
        positionVert={40}
      />
      <Text
        fontSize={15}
        text={"Hello World!"}
        borderBuffer={20}
        borderRadius={20}
        borderWidth={10}
        borderColor="blue"
        borderAlpha={1}
        borderSmoothing={0.1}
        backgroundColor="lightblue"
        backgroundAlpha={0.5}
      />
      <Text
        fontSize={20}
        text={"Hello World!"}
        borderBuffer={20}
        borderRadius={20}
        borderWidth={10}
        borderColor="blue"
        borderAlpha={1}
        borderSmoothing={0.1}
        backgroundColor="lightblue"
        backgroundAlpha={0.5}
        positionVert={60}
      />
      </Suspense>
    </Canvas>
  )
}

export default App
