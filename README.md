# react-msdf-text

> Display text in WebGL using Multichannel Signed Distance Field text fonts using React and React-Three-Fiber

This project borrows heavily from [Jam3's work](https://github.com/Jam3/three-bmfont-text) on MSDF text in Three.js

[![NPM](https://img.shields.io/npm/v/react-msdf-text.svg)](https://www.npmjs.com/package/react-msdf-text) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Install

```bash
npm install --save react-msdf-text
```

## Usage

```jsx
import React, { Component } from 'react'
import { Canvas } from 'react-three-fiber'
import { Text } from 'react-msdf-text'
import 'react-msdf-text/dist/index.css'

class Example extends Component {
  render() {
    return (
      <Canvas>
        <Text text={'Hello World!'} />
      </Canvas>
    )
  }
}
```

## License

MIT © [Shags](https://github.com/Shags)
