export const vertex = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0);
  }
  `
export const fragment = `
  #ifdef GL_OES_standard_derivatives
  #extension GL_OES_standard_derivatives : enable
  #endif

  precision highp float;
  uniform vec4 textColor;
  uniform vec4 backgroundColor;
  uniform vec4 borderColor;
  uniform float borderWidth; 
  uniform float borderRadius;
  uniform float borderSmoothing;
  uniform sampler2D map;
  varying vec2 vUv;
  
  // Subtractive smoothing smooths the existing border edges vs adding more pixels to the border that are smoothed.
  const bool subtractiveSmoothing = true;

  float borderSize = max(borderWidth, borderRadius);
  float borderWidthPct = borderSize > 0.0 ? borderWidth/borderSize : 0.0;
  float borderRadiusPct = borderSize > 0.0 ? borderRadius/borderSize : 0.0;

  float median(float r, float g, float b) {
    return max(min(r, g), min(max(r, g), b));
  }

  vec4 border(float dist) {
    vec4 empty = vec4(0., 0., 0., 0.);

    float outer = borderSmoothing > 0.0 
      ? (
        subtractiveSmoothing 
          ? smoothstep(0.0, 0.0 + borderSmoothing, 1.0 - dist) 
          : smoothstep(-borderSmoothing, 0.0, 1.0 - dist - borderSmoothing)
      )
      : step(0.0, 1.0 - dist); // Outside border - no smoothing

    float inner = borderSmoothing > 0.0 
      ? (
        subtractiveSmoothing 
          ? smoothstep(1.0, 1.0 + borderSmoothing, dist + borderWidthPct) 
          : smoothstep(1.0 - borderSmoothing, 1.0, dist + borderWidthPct)
      )
      : step(1.0, dist + borderWidthPct); // Inside border - no smoothing
    
    vec4 innerMix = mix(backgroundColor, borderColor, inner); // Colors the inside like the background and everything else like the border
    vec4 fullMix = mix(empty, innerMix, outer); // Colors everything ouside the outer border transparent
    return fullMix;
  }

  // Draws an 1/4 circle arc. 
  // The insideCorner sets the corner that is on the inside of the border. This should be one of the corners [0,0], [0,1], [1,0], [1,1].
  vec4 arc(vec2 uv, vec2 insideCorner){
    vec2 center = abs(insideCorner - 1.0 + borderRadiusPct);
    vec2 cornerCenterDiff = abs(insideCorner - center);
    vec2 cornerPointDiff = abs(insideCorner - uv);
    float pointDistance = distance(center, insideCorner);
    // Check if the point is in the square that the arc is rendered. 
    if(cornerCenterDiff.x <= cornerPointDiff.x && cornerCenterDiff.y <= cornerPointDiff.y){
      // Use the distance from the "center" point plus the centers offfset from the corner as the border distance.
      float centerDist = distance(uv, center) + cornerCenterDiff.x;
      return border(centerDist);
    }else{
      // Draw the line border when the point is outside the arc square. This applies when the border radius is less than the border width.
      float linearDist = max(cornerPointDiff.x, cornerPointDiff.y);
      return border(linearDist);
    }
  }

  // Draws a vertical or horizontal border on the outer edge of the unit.
  // The edge describes which edge to draw the border against.
  //   [-1,0] will draw the border against left edge. 
  //   [1,0] right edge.
  //   [0,-1] top edge.
  //   [0,1] bottom edge.
  vec4 line(vec2 uv, vec2 edge){
    float dist = 0.0;
    if(edge.x != 0.0){ // This is a vertical border
      dist = edge.x > 0.0 ? uv.x : 1.0 - uv.x;
    }
    
    if(edge.y != 0.0){ // This is a horizontal border
      dist = edge.y > 0.0 ? uv.y : 1.0 - uv.y;
    }

    return border(dist);
  }
  
  void main() {
    if(vUv.x < 0.0 && vUv.y < 0.0) { // We are dealing with one of the background/border components
      float BG = -2.0;
      float T = -4.0;
      float L = -6.0;
      float B = -8.0;
      float R = -10.0;
      float TL = -12.0;
      float BL = -14.0;
      float BR = -16.0;
      float TR = -18.0;
      float sigma = 0.5; // increase the uv capture range to make sure we draw all the pixels

      // Background
      if(vUv.x >= BG - sigma && vUv.y >= BG - sigma) {
        gl_FragColor = backgroundColor;
      } 

      // Vert/Horz Borders 
      else if(vUv.x >= T - sigma && vUv.y >= T - sigma) { // Top
        gl_FragColor = line(vUv - vec2(T), vec2(0.0, 1.0));
      } else if(vUv.x >= L - sigma && vUv.y >= L - sigma) { // Left
        gl_FragColor = line(vUv - vec2(L), vec2(-1.0, 0.0));
      } else if(vUv.x >= B - sigma && vUv.y >= B - sigma) { // Bottom
        gl_FragColor = line(vUv - vec2(B), vec2(0.0, -1.0));
      } else if(vUv.x >= R - sigma && vUv.y >= R - sigma) { // Right
        gl_FragColor = line(vUv - vec2(R), vec2(1.0, 0.0));
      } 

      // Corner Borders
      else if(vUv.x >= TL - sigma && vUv.y >= TL - sigma) { // Top/Left
        gl_FragColor = arc(vUv - vec2(TL), vec2(1.0, 0.0));
      } else if(vUv.x >= BL - sigma && vUv.y >= BL - sigma) { // Left/Bottom
        gl_FragColor = arc(vUv - vec2(BL), vec2(1.0, 1.0));
      } else if(vUv.x >= BR - sigma && vUv.y >= BR - sigma) { // Bottom/Right
        gl_FragColor = arc(vUv - vec2(BR), vec2(0.0, 1.0));
      } else { // if(vUv.x >= TR - sigma && vUv.y >= TR - sigma) { // Right/Top
        gl_FragColor = arc(vUv - vec2(TR), vec2(0.0, 0.0));
      }
    } else { 
      // This is where we draw the text from the msdf texture
      vec3 sample = texture2D(map, vUv).rgb;
      float sigDist = median(sample.r, sample.g, sample.b) - 0.5;
      float alpha = clamp(sigDist/fwidth(sigDist) + 0.5, 0.0, 1.0);
      
      gl_FragColor = vec4(textColor.xyz, textColor.w * alpha);
    }
  }
  `
