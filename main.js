const canvas = document.getElementById('topo-bg');
const gl = canvas.getContext('webgl2');

if (!gl) {
    console.error('WebGL 2 not supported');
}

const vertexShaderSource = `#version 300 es
in vec4 a_position;
void main() {
    gl_Position = a_position;
}`;

const fragmentShaderSource = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

out vec4 outColor;

// Simplex 3D Noise from Ashima
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

  float n_ = 0.142857142857; // 1.0/7.0
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                dot(p2,x2), dot(p3,x3) ) );
}

void main() {
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    st.x *= u_resolution.x / u_resolution.y;

    float scale = 1.0; // Control zoom of the topographic map
    float speed = 0.015; // Animation speed
    
    float n = snoise(vec3(st * scale, u_time * speed));
    
    // Add fractal details
    n += 0.5 * snoise(vec3(st * (scale * 2.0), u_time * (speed * 1.2)));
    n += 0.25 * snoise(vec3(st * (scale * 4.0), u_time * (speed * 1.4)));
    
    // Normalize to 0.0 - 1.0
    n = n * 0.5 + 0.5;

    float lines_count = 10.0; // Number of contour lines
    float scaled_n = n * lines_count;
    
    float f = fract(scaled_n);
    float df = max(fwidth(scaled_n), 0.0001); // Standard derivative to keep lines same width
    
    // Draw solid lines with sharp, anti-aliased edges
    float half_width = 3.0 * df * 0.5; // Thickness: 3
    float aa = 1.5 * df; // Anti-aliasing falloff window (1.5 pixels)
    float distance_to_line = min(f, 1.0 - f);
    float line = 1.0 - smoothstep(half_width - aa * 0.5, half_width + aa * 0.5, distance_to_line);
    
    // RGB converted from Hex
    // Main background: #050d17
    vec3 bg_color = vec3(5.0/255.0, 13.0/255.0, 23.0/255.0); 
    // Lines: #121923
    vec3 line_color = vec3(18.0/255.0, 25.0/255.0, 35.0/255.0); 

    vec3 color = mix(bg_color, line_color, line);

    outColor = vec4(color, 1.0);
}
`;

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(program));
}

const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
const positions = [
    -1.0, -1.0,
     1.0, -1.0,
    -1.0,  1.0,
    -1.0,  1.0,
     1.0, -1.0,
     1.0,  1.0,
];
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

const vao = gl.createVertexArray();
gl.bindVertexArray(vao);
gl.enableVertexAttribArray(positionAttributeLocation);
gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

const resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");
const timeUniformLocation = gl.getUniformLocation(program, "u_time");

function resizeCanvasToDisplaySize(canvas) {
    const displayWidth  = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width  = displayWidth;
        canvas.height = displayHeight;
    }
}

function render(time) {
    time *= 0.001; // Convert to seconds

    resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    
    gl.useProgram(program);
    gl.bindVertexArray(vao);
    
    gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);
    gl.uniform1f(timeUniformLocation, time);
    
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    
    requestAnimationFrame(render);
}

requestAnimationFrame(render);
