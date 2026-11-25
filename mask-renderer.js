// MediaPipe's canonical landmarks give the material the same UVs in preview and on video.
const studioGeometry = (() => {
  const oval = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377,
    152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
  const innerLips = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95];
  const faceSize = studioFaceMesh.vertices.length / 3;
  const size = faceSize + oval.length * 2;
  const faces = Array.from(studioFaceMesh.triangles);
  for (let i = 1; i < innerLips.length - 1; i++) {
    faces.push(innerLips[0], innerLips[i + 1], innerLips[i]);
  }

  for (let i = 0; i < oval.length; i++) {
    const next = (i + 1) % oval.length;
    const a = faceSize + i;
    const b = faceSize + next;
    const rearA = a + oval.length;
    const rearB = b + oval.length;
    faces.push(oval[i], oval[next], a, oval[next], b, a, a, b, rearA, b, rearB, rearA);
  }

  // Pull the hood up over the forehead, then fold the rim back along the head's 3D axes.
  function extend(positions) {
    const forehead = 10 * 3;
    const chin = 152 * 3;
    const left = 234 * 3;
    const right = 454 * 3;
    const ux = positions[forehead] - positions[chin];
    const uy = positions[forehead + 1] - positions[chin + 1];
    const uz = positions[forehead + 2] - positions[chin + 2];
    const rx = positions[right] - positions[left];
    const ry = positions[right + 1] - positions[left + 1];
    const rz = positions[right + 2] - positions[left + 2];
    const height = Math.hypot(ux, uy, uz);
    const cx = (positions[forehead] + positions[chin]) * 0.5;
    const cy = (positions[forehead + 1] + positions[chin + 1]) * 0.5;
    const cz = (positions[forehead + 2] + positions[chin + 2]) * 0.5;
    const nx = ry * uz - rz * uy;
    const ny = rz * ux - rx * uz;
    const nz = rx * uy - ry * ux;
    const forward = (nz < 0 ? -height : height) / (Math.hypot(nx, ny, nz) || 1);

    for (let i = 0; i < oval.length; i++) {
      const source = oval[i] * 3;
      const crown = Math.max(0, (studioFaceMesh.vertices[source + 1] - 0.5) / 7.8) ** 1.8;
      const x = positions[source];
      const y = positions[source + 1];
      const z = positions[source + 2];
      for (let ring = 0; ring < 2; ring++) {
        const index = (faceSize + ring * oval.length + i) * 3;
        const margin = ring === 0 ? 0.065 : 0.096;
        const lift = crown * (ring === 0 ? 0.13 : 0.16);
        const setback = (ring === 0 ? 0.074 : 0.25) * forward;
        positions[index] = x + (x - cx) * margin + ux * lift - nx * setback;
        positions[index + 1] = y + (y - cy) * margin + uy * lift - ny * setback;
        positions[index + 2] = z + (z - cz) * margin + uz * lift - nz * setback;
      }
    }
  }

  const rest = new Float32Array(size * 3);
  rest.set(studioFaceMesh.vertices);
  extend(rest);
  const uv = new Float32Array(rest.length);
  for (let i = 0; i < size; i++) {
    const offset = i * 3;
    // The third coordinate fades the lip of the hood into its inner lining.
    uv[offset] = 0.5 + rest[offset] / 18.4;
    uv[offset + 1] = (11.95 - rest[offset + 1]) / 23.1;
    uv[offset + 2] = i < faceSize ? 0 : i < faceSize + oval.length ? 0.18 : 0.7;
  }
  return { rest, uv, faces: new Uint16Array(faces), faceSize, extend };
})();

function createStudioRenderer(canvas) {
  const gl = canvas.getContext("webgl", { alpha: true, antialias: true, powerPreference: "low-power" });
  if (!gl) return null;

  const vertexSource = `
    attribute vec3 aPoint;
    attribute vec3 aNormal;
    attribute vec3 aUv;
    uniform vec2 uScale;
    uniform float uDepth;
    uniform float uPerspective;
    uniform float uMirror;
    varying vec3 vUv;
    varying vec3 vNormal;
    void main() {
      gl_Position = vec4(aPoint.xy * uScale, -aPoint.z / uDepth, 1.0 - aPoint.z * uPerspective);
      vUv = vec3(mix(aUv.x, 1.0 - aUv.x, uMirror), aUv.yz);
      vNormal = aNormal;
    }
  `;
  const fragmentSource = `
    precision mediump float;
    uniform sampler2D uMaterial;
    varying vec3 vUv;
    varying vec3 vNormal;
    void main() {
      vec4 texel = texture2D(uMaterial, vUv.xy);
      if (texel.a < 0.20) discard;
      vec3 normal = normalize(vNormal);
      vec3 light = normalize(vec3(-0.48, 0.74, 1.0));
      float diffuse = max(0.0, dot(normal, light));
      float side = pow(1.0 - abs(normal.z), 2.5);
      float sheen = pow(max(0.0, dot(normal, normalize(light + vec3(0.0, 0.0, 1.0)))), 18.0);
      float reflective = smoothstep(0.22, 0.72, max(max(texel.r, texel.g), texel.b));
      vec3 color = texel.rgb * (0.57 + 0.58 * diffuse) * (1.0 - vUv.z * 0.59);
      color += sheen * (0.027 + reflective * 0.23) * vec3(1.0, 0.91, 0.85);
      color += side * (0.045 + vUv.z * 0.09) * vec3(1.0, 0.44, 0.48);
      float coverage = smoothstep(0.20, 0.88, texel.a);
      gl_FragColor = vec4(color * coverage, coverage);
    }
  `;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(shader));
    return shader;
  }

  const program = gl.createProgram();
  const vertex = compile(gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);

  function attribute(name, data, usage) {
    const location = gl.getAttribLocation(program, name);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, usage);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 0, 0);
    return buffer;
  }

  const { rest, uv, faces, faceSize, extend } = studioGeometry;
  const points = new Float32Array(rest.length);
  const normals = new Float32Array(rest.length);
  const tracking = new Float32Array(faceSize * 3);
  const pointBuffer = attribute("aPoint", points, gl.DYNAMIC_DRAW);
  const normalBuffer = attribute("aNormal", normals, gl.DYNAMIC_DRAW);
  attribute("aUv", uv, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, faces, gl.STATIC_DRAW);
  const projection = gl.getUniformLocation(program, "uScale");
  const depth = gl.getUniformLocation(program, "uDepth");
  const perspective = gl.getUniformLocation(program, "uPerspective");
  const mirror = gl.getUniformLocation(program, "uMirror");
  gl.uniform1i(gl.getUniformLocation(program, "uMaterial"), 0);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  const textures = new Map();
  let hasFace = false;
  let width, height;

  function select(mask) {
    let texture = textures.get(mask);
    if (!texture) {
      texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, paintStudioMask(mask));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.generateMipmap(gl.TEXTURE_2D);
      textures.set(mask, texture);
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
  }

  function sizeCanvas() {
    width = canvas.clientWidth || 1;
    height = canvas.clientHeight || 1;
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const physicalWidth = Math.round(width * ratio);
    const physicalHeight = Math.round(height * ratio);
    if (canvas.width !== physicalWidth || canvas.height !== physicalHeight) {
      canvas.width = physicalWidth;
      canvas.height = physicalHeight;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function clear() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  function draw(mirrored, cameraPerspective) {
    normals.fill(0);
    const sign = mirrored ? -1 : 1;
    for (let i = 0; i < faces.length; i += 3) {
      const a = faces[i] * 3;
      const b = faces[i + 1] * 3;
      const c = faces[i + 2] * 3;
      const ux = points[b] - points[a];
      const uy = points[b + 1] - points[a + 1];
      const uz = points[b + 2] - points[a + 2];
      const vx = points[c] - points[a];
      const vy = points[c + 1] - points[a + 1];
      const vz = points[c + 2] - points[a + 2];
      const nx = sign * (uy * vz - uz * vy);
      const ny = sign * (uz * vx - ux * vz);
      const nz = sign * (ux * vy - uy * vx);
      normals[a] += nx;
      normals[b] += nx;
      normals[c] += nx;
      normals[a + 1] += ny;
      normals[b + 1] += ny;
      normals[c + 1] += ny;
      normals[a + 2] += nz;
      normals[b + 2] += nz;
      normals[c + 2] += nz;
    }
    // Normalize before interpolation so big triangles and high-DPI displays do not swamp the lighting.
    for (let i = 0; i < normals.length; i += 3) {
      const magnitude = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
      normals[i] /= magnitude;
      normals[i + 1] /= magnitude;
      normals[i + 2] /= magnitude;
    }

    clear();
    gl.uniform2f(projection, 2 / width, 2 / height);
    gl.uniform1f(depth, Math.max(width, height) * 3);
    gl.uniform1f(perspective, cameraPerspective);
    gl.uniform1f(mirror, Number(mirrored));
    gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, points);
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, normals);
    gl.drawElements(gl.TRIANGLES, faces.length, gl.UNSIGNED_SHORT, 0);
  }

  function preview(yaw, pitch, float, approach) {
    sizeCanvas();
    const scale = Math.min(width * 0.76 / 17, height * 0.71 / 22) * approach;
    const sinY = Math.sin(yaw);
    const cosY = Math.cos(yaw);
    const sinX = Math.sin(pitch);
    const cosX = Math.cos(pitch);
    for (let i = 0; i < rest.length; i += 3) {
      const x = rest[i];
      const y = rest[i + 1] - 1;
      const z = rest[i + 2] - 2.2;
      const turn = z * cosY - x * sinY;
      points[i] = (x * cosY + z * sinY) * scale;
      points[i + 1] = (y * cosX - turn * sinX + float) * scale;
      points[i + 2] = (y * sinX + turn * cosX) * scale;
    }
    draw(false, 1 / (scale * 40));
  }

  function track(landmarks) {
    const movement = Math.hypot(landmarks[1].x - tracking[3], landmarks[1].y - tracking[4]);
    const follow = hasFace ? Math.min(0.88, 0.58 + movement * 7) : 1;
    for (let i = 0; i < faceSize; i++) {
      const point = landmarks[i];
      const offset = i * 3;
      tracking[offset] += (point.x - tracking[offset]) * follow;
      tracking[offset + 1] += (point.y - tracking[offset + 1]) * follow;
      tracking[offset + 2] += (point.z - tracking[offset + 2]) * follow;
    }
    hasFace = true;
  }

  function videoFrame(video) {
    sizeCanvas();
    const cover = Math.max(width / video.videoWidth, height / video.videoHeight);
    const sourceWidth = video.videoWidth * cover;
    const sourceHeight = video.videoHeight * cover;
    for (let i = 0; i < tracking.length; i += 3) {
      points[i] = (0.5 - tracking[i]) * sourceWidth;
      points[i + 1] = (0.5 - tracking[i + 1]) * sourceHeight;
      points[i + 2] = -tracking[i + 2] * sourceWidth;
    }
    extend(points);
    draw(true, 0);
  }

  function resetFace() {
    hasFace = false;
    clear();
  }

  return { select, preview, track, videoFrame, resetFace };
}
