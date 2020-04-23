# react-msdf-text

> Display text in WebGL using Multichannel Signed Distance Field text fonts using React and React-Three-Fiber

This project borrows heavily from [Jam3's work](https://github.com/Jam3/three-bmfont-text) on MSDF text in Three.js

[![NPM](https://img.shields.io/npm/v/react-msdf-text.svg)](https://www.npmjs.com/package/react-msdf-text) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Install

```bash
npm install --save react-msdf-text
```

## Usage
[![Edit react-msdf-text](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/react-msdf-text-sbmdd?fontsize=14&hidenavigation=1&theme=dark)

```jsx
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
      </Suspense>
    </Canvas>
  )
}

export default App
```

## License

MIT © [Shags](https://github.com/Shags)
