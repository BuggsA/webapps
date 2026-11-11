/* apps/ip/js/08-gl.js — the WebGL2 renderer: shaders, HDR, bloom, reflection.
 * One of the files ip used to be. Read ../MAP.md first: it lists what
 * every file defines and uses. All files share one global scope and
 * load in numeric order from index.html. */

'use strict';

/* ══ GL ══════════════════════════════════════════════════════════════ */

function makeGL(canvas) {
  var gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
  if (!gl) return null;
  var hasFloat = !!gl.getExtension('EXT_color_buffer_float');
  gl.getExtension('OES_texture_float_linear');

  function sh(t, src) {
    var s = gl.createShader(t);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function prog(vs, fs) {
    var p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    p.u = {};
    var n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS), i, inf;
    for (i = 0; i < n; i++) {
      inf = gl.getActiveUniform(p, i);
      p.u[inf.name.replace('[0]', '')] = gl.getUniformLocation(p, inf.name);
    }
    return p;
  }

  var H = '#version 300 es\nprecision highp float;\n';

  /* uFlip = -1 mirrors the world about the ground plane: the whole of the
   * planar reflection, with no second camera and no second target. The
   * gloss falloff falls out of height above the plane. */
  var COMMON = [
    'uniform mat4 uVP;',
    'uniform vec3 uEye;',
    'uniform vec2 uRes;',
    'uniform float uScale[' + LAYERS + '];',
    'uniform float uAlpha[' + LAYERS + '];',
    'uniform vec2 uPan[' + LAYERS + '];',
    'uniform float uFocal;',
    'uniform float uFlip;',
    'uniform float uGloss;',
    'uniform float uFogK;',
    'uniform float uHot;',
    'vec3 pan(vec3 p, int li){ return p + vec3(uPan[li].x, 0.0, uPan[li].y); }',
    'vec3 place(vec3 p, float ws){ vec3 q = p * ws; q.y *= uFlip; return q; }',
    'float reflFade(float h, float ws){ return uFlip > 0.0 ? 1.0 : uGloss * exp(-h*ws*9.0); }',
    'float reflBlur(float h, float ws){ return uFlip > 0.0 ? 0.0 : clamp(h*ws*3.4, 0.0, 1.0); }'
  ].join('\n') + '\n';

  var LINE_VS = H + COMMON + [
    'layout(location=0) in vec2 aCorner;',
    'layout(location=1) in vec3 aA;',
    'layout(location=2) in vec3 aB;',
    'layout(location=3) in vec4 aCol;',
    'layout(location=4) in vec4 aMeta;',
    'out float vSide; out vec4 vCol; out float vFeather; out float vFog; out float vGlow;',
    'void main(){',
    '  int li = int(aMeta.z);',
    '  float ws = uScale[li], la = uAlpha[li];',
    '  float hi = max(aA.y, aB.y);',
    '  if (la < 0.002 || (uFlip < 0.0 && hi < 0.004)) { gl_Position = vec4(2.0); return; }',
    '  vec3 A = place(pan(aA, li), ws), B = place(pan(aB, li), ws);',
    '  vec4 ca = uVP*vec4(A,1.0), cb = uVP*vec4(B,1.0);',
    '  vec4 cp = mix(ca, cb, aCorner.x);',
    '  vec3 wp = mix(A, B, aCorner.x);',
    '  vec2 na = ca.xy/max(ca.w,1e-4), nb = cb.xy/max(cb.w,1e-4);',
    '  vec2 d = (nb-na)*uRes; d /= max(length(d),1e-4);',
    '  vec2 nrm = vec2(-d.y, d.x);',
    '  float dist = distance(wp, uEye);',
    '  float coc = clamp(abs(dist-uFocal)/max(uFocal,0.001), 0.0, 3.0);',
    '  float blur = reflBlur(hi, ws);',
    '  float depthW = clamp(2.1/max(dist,0.6), 0.5, 1.7);',
    '  float lit = (uHot > 0.5 && abs(aMeta.w-uHot) < 0.5) ? 1.45 : 1.0;',
    '  float w = aMeta.x * depthW * (1.0 + coc*2.0) * (1.0 + blur*3.0);',
    '  cp.xy += (nrm * aCorner.y * w * 0.5 / uRes) * 2.0 * cp.w;',
    '  gl_Position = cp;',
    '  vSide = aCorner.y;',
    '  vCol = vec4(aCol.rgb, aCol.a * la * reflFade(hi, ws) * lit);',
    '  vFeather = clamp(0.24 + coc*0.5 + blur*0.5, 0.24, 0.97);',
    '  vFog = exp(-uFogK * dist);',
    '  vGlow = aMeta.y;',
    '}'
  ].join('\n');

  var LINE_FS = H + [
    'in float vSide; in vec4 vCol; in float vFeather; in float vFog; in float vGlow;',
    'out vec4 o;',
    'void main(){',
    '  float a = abs(vSide);',
    '  float core = 1.0 - smoothstep(1.0-vFeather, 1.0, a);',
    '  o = vec4(vCol.rgb * vCol.a * (core + exp(-a*a*2.6)*vGlow) * vFog, 1.0);',
    '}'
  ].join('\n');

  /* A tight core; the spreading is the bloom chain's job. */
  var PT_VS = H + COMMON + [
    'layout(location=0) in vec3 aP;',
    'layout(location=1) in vec4 aCol;',
    'layout(location=2) in vec3 aMeta;',
    'uniform float uDpr;',
    'out vec4 vCol; out float vFog; out float vSoft;',
    'void main(){',
    '  int li = int(aMeta.y);',
    '  float ws = uScale[li], la = uAlpha[li];',
    '  if (la < 0.002 || (uFlip < 0.0 && aP.y < 0.004)) { gl_Position = vec4(2.0); gl_PointSize = 1.0; return; }',
    '  vec3 Pp = place(pan(aP, li), ws);',
    '  float dist = distance(Pp, uEye);',
    '  float coc = clamp(abs(dist-uFocal)/max(uFocal,0.001), 0.0, 3.0);',
    '  float blur = reflBlur(aP.y, ws);',
    '  float lit = (uHot > 0.5 && abs(aMeta.z-uHot) < 0.5) ? 1.5 : 1.0;',
    '  float s = aMeta.x * clamp(2.1/max(dist,0.6), 0.35, 1.8) * (1.0+coc*1.5) * (1.0+blur*2.4);',
    '  gl_PointSize = max(s, 1.0) * uDpr;',
    '  gl_Position = uVP * vec4(Pp, 1.0);',
    '  vCol = vec4(aCol.rgb, aCol.a * la * reflFade(aP.y, ws) * lit);',
    '  vFog = exp(-uFogK * dist);',
    '  vSoft = clamp(0.10 + coc*0.30 + blur*0.55, 0.10, 0.92);',
    '}'
  ].join('\n');

  var PT_FS = H + [
    'in vec4 vCol; in float vFog; in float vSoft; out vec4 o;',
    'void main(){',
    '  float r = length(gl_PointCoord*2.0-1.0);',
    '  float core = 1.0 - smoothstep(1.0-vSoft, 1.0, r);',
    '  o = vec4(vCol.rgb * vCol.a * (core + exp(-r*r*3.6)*0.34) * vFog, 1.0);',
    '}'
  ].join('\n');

  /* A faint face with a bright rim: the difference between a solid and a
   * handful of sticks. */
  var SURF_VS = H + COMMON + [
    'layout(location=0) in vec2 aCorner;',
    'layout(location=1) in vec3 aC;',
    'layout(location=2) in vec3 aU;',
    'layout(location=3) in vec3 aV;',
    'layout(location=4) in vec4 aCol;',
    'layout(location=5) in vec2 aMeta;',
    'out vec2 vUv; out vec4 vCol; out float vFog; out float vGraze;',
    'void main(){',
    '  int li = int(aMeta.x);',
    '  float ws = uScale[li], la = uAlpha[li];',
    '  if (la < 0.002 || (uFlip < 0.0 && aC.y < 0.004)) { gl_Position = vec4(2.0); return; }',
    '  vec3 p = pan(aC, li) + aU*aCorner.x + aV*aCorner.y;',
    '  vec3 Pp = place(p, ws);',
    '  gl_Position = uVP * vec4(Pp, 1.0);',
    '  vUv = aCorner + 0.5;',
    '  float lit = (uHot > 0.5 && abs(aMeta.y-uHot) < 0.5) ? 1.55 : 1.0;',
    '  vCol = vec4(aCol.rgb, aCol.a * la * reflFade(aC.y, ws) * lit);',
    '  vFog = exp(-uFogK * distance(Pp, uEye));',
    '  vec3 nn = normalize(cross(aU, aV));',
    '  vGraze = pow(1.0 - abs(dot(nn, normalize(uEye - Pp))), 2.2);',
    '}'
  ].join('\n');

  var SURF_FS = H + [
    'in vec2 vUv; in vec4 vCol; in float vFog; in float vGraze; out vec4 o;',
    'void main(){',
    '  vec2 d = min(vUv, 1.0-vUv);',
    '  float rim = 1.0 - smoothstep(0.0, 0.035, min(d.x, d.y));',
    '  o = vec4(vCol.rgb * vCol.a * (0.020 + vGraze*0.12 + rim*1.15) * vFog, 1.0);',
    '}'
  ].join('\n');

  var POOL_VS = H + [
    'layout(location=0) in vec2 aCorner;',
    'layout(location=1) in vec3 aC;',
    'layout(location=2) in vec4 aCol;',
    'layout(location=3) in vec2 aMeta;',
    'uniform mat4 uVP; uniform vec3 uEye; uniform float uFogK;',
    'uniform float uScale[' + LAYERS + '];',
    'uniform float uAlpha[' + LAYERS + '];',
    /* the pool program does not include COMMON, so it needs its own copy
       of uPan and its own pan(): leaving it out was a compile error, which
       took the whole renderer down rather than just the pools */
    'uniform vec2 uPan[' + LAYERS + '];',
    'vec3 pan(vec3 p, int li){ return p + vec3(uPan[li].x, 0.0, uPan[li].y); }',
    'out vec2 vUv; out vec4 vCol; out float vFog;',
    'void main(){',
    '  int li = int(aMeta.y);',
    '  float ws = uScale[li], la = uAlpha[li];',
    '  if (la < 0.002) { gl_Position = vec4(2.0); return; }',
    '  vec3 p = pan(vec3(aC.x,0.0,aC.z), li)*ws + vec3(aCorner.x,0.0,aCorner.y)*aMeta.x*ws*2.0;',
    '  p.y = 0.0015 * ws;',
    '  gl_Position = uVP * vec4(p,1.0);',
    '  vUv = aCorner; vCol = vec4(aCol.rgb, aCol.a * la);',
    '  vFog = exp(-uFogK * distance(p, uEye));',
    '}'
  ].join('\n');

  var POOL_FS = H + [
    'in vec2 vUv; in vec4 vCol; in float vFog; out vec4 o;',
    'void main(){',
    '  float r = length(vUv)*2.0;',
    '  o = vec4(vCol.rgb * vCol.a * exp(-r*r*2.6) * (1.0-smoothstep(0.70,1.0,r)) * vFog, 1.0);',
    '}'
  ].join('\n');

  var FS_VS = H + [
    'out vec2 vUv;',
    'void main(){ vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);',
    '  vUv = p; gl_Position = vec4(p*2.0-1.0, 0.0, 1.0); }'
  ].join('\n');

  var BRIGHT_FS = H + [
    'in vec2 vUv; out vec4 o;',
    'uniform sampler2D uTex; uniform float uThresh; uniform float uKnee;',
    'void main(){',
    '  vec3 c = texture(uTex, vUv).rgb;',
    '  float b = max(c.r, max(c.g, c.b));',
    '  float s = clamp((b-uThresh+uKnee)/max(2.0*uKnee,1e-4), 0.0, 1.0);',
    '  float w = max(s*s*uKnee, b-uThresh);',
    '  o = vec4(c * clamp(w/max(b,1e-4), 0.0, 1.0), 1.0);',
    '}'
  ].join('\n');

  var DOWN_FS = H + [
    'in vec2 vUv; out vec4 o;',
    'uniform sampler2D uTex; uniform vec2 uTexel;',
    'void main(){',
    '  vec3 a = texture(uTex, vUv+uTexel*vec2(-1.0, 1.0)).rgb;',
    '  vec3 b = texture(uTex, vUv+uTexel*vec2( 0.0, 1.0)).rgb;',
    '  vec3 c = texture(uTex, vUv+uTexel*vec2( 1.0, 1.0)).rgb;',
    '  vec3 d = texture(uTex, vUv+uTexel*vec2(-1.0, 0.0)).rgb;',
    '  vec3 e = texture(uTex, vUv).rgb;',
    '  vec3 f = texture(uTex, vUv+uTexel*vec2( 1.0, 0.0)).rgb;',
    '  vec3 g = texture(uTex, vUv+uTexel*vec2(-1.0,-1.0)).rgb;',
    '  vec3 h = texture(uTex, vUv+uTexel*vec2( 0.0,-1.0)).rgb;',
    '  vec3 i = texture(uTex, vUv+uTexel*vec2( 1.0,-1.0)).rgb;',
    '  o = vec4(e*0.25 + (b+d+f+h)*0.125 + (a+c+g+i)*0.0625, 1.0);',
    '}'
  ].join('\n');

  var UP_FS = H + [
    'in vec2 vUv; out vec4 o;',
    'uniform sampler2D uTex; uniform vec2 uTexel;',
    'void main(){',
    '  vec3 s = texture(uTex, vUv+uTexel*vec2(-1.0, 1.0)).rgb',
    '         + texture(uTex, vUv+uTexel*vec2( 0.0, 1.0)).rgb*2.0',
    '         + texture(uTex, vUv+uTexel*vec2( 1.0, 1.0)).rgb',
    '         + texture(uTex, vUv+uTexel*vec2(-1.0, 0.0)).rgb*2.0',
    '         + texture(uTex, vUv).rgb*4.0',
    '         + texture(uTex, vUv+uTexel*vec2( 1.0, 0.0)).rgb*2.0',
    '         + texture(uTex, vUv+uTexel*vec2(-1.0,-1.0)).rgb',
    '         + texture(uTex, vUv+uTexel*vec2( 0.0,-1.0)).rgb*2.0',
    '         + texture(uTex, vUv+uTexel*vec2( 1.0,-1.0)).rgb;',
    '  o = vec4(s/16.0, 1.0);',
    '}'
  ].join('\n');

  var COMP_FS = H + [
    'in vec2 vUv; out vec4 o;',
    'uniform sampler2D uScene; uniform sampler2D uBloom;',
    'uniform float uBloomAmt; uniform float uSeed;',
    'vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }',
    'float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }',
    'void main(){',
    '  vec3 c = texture(uScene, vUv).rgb + texture(uBloom, vUv).rgb * uBloomAmt;',
    '  c = aces(c);',
    '  vec2 q = vUv - 0.5;',
    '  c *= clamp(1.0 - dot(q,q)*1.05, 0.0, 1.0);',
    '  float g = (hash(gl_FragCoord.xy + uSeed) - 0.5) * 0.030;',
    '  c += g * smoothstep(0.0, 0.10, max(c.r, max(c.g, c.b)));',
    '  o = vec4(c, 1.0);',
    '}'
  ].join('\n');

  var pLine, pPt, pSurf, pPool, pBright, pDown, pUp, pComp;
  try {
    pLine = prog(LINE_VS, LINE_FS);
    pPt = prog(PT_VS, PT_FS);
    pSurf = prog(SURF_VS, SURF_FS);
    pPool = prog(POOL_VS, POOL_FS);
    pBright = prog(FS_VS, BRIGHT_FS);
    pDown = prog(FS_VS, DOWN_FS);
    pUp = prog(FS_VS, UP_FS);
    pComp = prog(FS_VS, COMP_FS);
  } catch (_) { return null; }

  var qLine = new Float32Array([0,-1, 1,-1, 0,1, 1,1]);
  var qCen = new Float32Array([-0.5,-0.5, 0.5,-0.5, -0.5,0.5, 0.5,0.5]);
  var emptyVao = gl.createVertexArray();
  var vaos = {}, counts = {}, owned = [];

  /* every VAO and buffer this renderer makes, so a rebuild can release
   * the previous set instead of orphaning it */
  function keep(o) { owned.push(o); return o; }
  function releaseAll() {
    owned.forEach(function (o) {
      if (o.vao) gl.deleteVertexArray(o.vao);
      if (o.buf) gl.deleteBuffer(o.buf);
    });
    owned = [];
  }

  function instVao(quad, data, stride, attrs) {
    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    var qb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, qb);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    var ib = gl.createBuffer();
    keep({ vao: vao, buf: ib }); keep({ buf: qb });
    gl.bindBuffer(gl.ARRAY_BUFFER, ib);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    attrs.forEach(function (a) {
      gl.enableVertexAttribArray(a[0]);
      gl.vertexAttribPointer(a[0], a[1], gl.FLOAT, false, stride, a[2]);
      gl.vertexAttribDivisor(a[0], 1);
    });
    gl.bindVertexArray(null);
    return { vao: vao, buf: ib };
  }

  function upload() {
    var i, o;
    releaseAll();
    counts.line = lines.length; counts.pt = points.length;
    counts.surf = surfs.length; counts.pool = pools.length;

    var ld = new Float32Array(Math.max(counts.line, 1) * 14);
    for (i = 0; i < counts.line; i++) {
      o = i * 14;
      ld.set(lines[i].a, o); ld.set(lines[i].b, o+3); ld.set(lines[i].col, o+6);
      ld[o+9] = lines[i].i; ld[o+10] = lines[i].w; ld[o+11] = lines[i].glow;
      ld[o+12] = lines[i].layer; ld[o+13] = lines[i].id;
    }
    vaos.line = instVao(qLine, ld, 56, [[1,3,0],[2,3,12],[3,4,24],[4,4,40]]).vao;

    var sd = new Float32Array(Math.max(counts.surf, 1) * 15);
    for (i = 0; i < counts.surf; i++) {
      o = i * 15;
      sd.set(surfs[i].cen, o); sd.set(surfs[i].u, o+3); sd.set(surfs[i].v, o+6);
      sd.set(surfs[i].col, o+9); sd[o+12] = surfs[i].i;
      sd[o+13] = surfs[i].layer; sd[o+14] = surfs[i].id;
    }
    vaos.surf = instVao(qCen, sd, 60, [[1,3,0],[2,3,12],[3,3,24],[4,4,36],[5,2,52]]).vao;

    var od = new Float32Array((counts.pool + 1) * 9);
    for (i = 0; i < counts.pool; i++) {
      o = i * 9;
      od[o] = pools[i].x; od[o+1] = 0; od[o+2] = pools[i].z;
      od.set(pools[i].col, o+3); od[o+6] = pools[i].i;
      od[o+7] = pools[i].r; od[o+8] = pools[i].layer;
    }
    var pk = instVao(qCen, od, 36, [[1,3,0],[2,4,12],[3,2,28]]);
    vaos.pool = pk.vao; vaos.poolBuf = pk.buf;

    var pd = new Float32Array((counts.pt + 1) * 10);
    for (i = 0; i < counts.pt; i++) {
      o = i * 10;
      pd.set(points[i].p, o); pd.set(points[i].col, o+3);
      pd[o+6] = points[i].i; pd[o+7] = points[i].size;
      pd[o+8] = points[i].layer; pd[o+9] = points[i].id;
    }
    vaos.pt = gl.createVertexArray();
    keep({ vao: vaos.pt });
    gl.bindVertexArray(vaos.pt);
    vaos.ptBuf = gl.createBuffer();
    keep({ buf: vaos.ptBuf });
    gl.bindBuffer(gl.ARRAY_BUFFER, vaos.ptBuf);
    gl.bufferData(gl.ARRAY_BUFFER, pd, gl.DYNAMIC_DRAW);
    [[0,3,0],[1,4,12],[2,3,28]].forEach(function (a) {
      gl.enableVertexAttribArray(a[0]);
      gl.vertexAttribPointer(a[0], a[1], gl.FLOAT, false, 40, a[2]);
    });
    gl.bindVertexArray(null);
  }

  var MIPS = 5, sceneT = null, chain = [], PW = 0, PH = 0;

  function mkTarget(w, h) {
    var t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, hasFloat ? gl.RGBA16F : gl.RGBA8, w, h, 0,
                  gl.RGBA, hasFloat ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    var f = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { fb: f, tex: t, w: w, h: h };
  }
  function sized() {
    var w = Math.max(2, Math.round(S.W * S.DPR));
    var h = Math.max(2, Math.round(S.H * S.DPR));
    if (w === PW && h === PH) return;
    PW = w; PH = h;
    canvas.width = w; canvas.height = h;
    if (sceneT) { gl.deleteTexture(sceneT.tex); gl.deleteFramebuffer(sceneT.fb); }
    chain.forEach(function (c) { gl.deleteTexture(c.tex); gl.deleteFramebuffer(c.fb); });
    chain = [];
    sceneT = mkTarget(w, h);
    var cw = w, ch = h, i;
    for (i = 0; i < MIPS; i++) {
      cw = Math.max(2, cw >> 1); ch = Math.max(2, ch >> 1);
      chain.push(mkTarget(cw, ch));
    }
  }

  function geometry(VP, eye, flip, hot) {
    var gloss = flip < 0 ? 0.55 : 1.0;
    function common(p) {
      gl.uniformMatrix4fv(p.u.uVP, false, VP);
      gl.uniform3fv(p.u.uEye, eye);
      gl.uniform1fv(p.u.uScale, layerScale);
      gl.uniform1fv(p.u.uAlpha, layerLight);
      gl.uniform2fv(p.u.uPan, layerPan);
      gl.uniform1f(p.u.uFocal, FOCAL);
      gl.uniform1f(p.u.uFlip, flip);
      gl.uniform1f(p.u.uGloss, gloss);
      gl.uniform1f(p.u.uFogK, FOG);
      gl.uniform1f(p.u.uHot, hot);
      if (p.u.uRes) gl.uniform2f(p.u.uRes, PW, PH);
    }
    if (counts.surf) {
      gl.useProgram(pSurf); common(pSurf);
      gl.bindVertexArray(vaos.surf);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, counts.surf);
    }
    gl.useProgram(pLine); common(pLine);
    gl.bindVertexArray(vaos.line);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, counts.line);

    gl.useProgram(pPt); common(pPt);
    gl.uniform1f(pPt.u.uDpr, S.DPR);
    gl.bindVertexArray(vaos.pt);
    gl.drawArrays(gl.POINTS, 0, counts.pt + 1);
  }

  /* the cursor lives in the spare slot on the end of each buffer, so the
   * field it moves over is never re-uploaded */
  var cur = new Float32Array(10), curPool = new Float32Array(9);
  function writeCursor() {
    var c = cursor;
    cur.fill(0); curPool.fill(0);
    if (c) {
      cur[0] = c.x; cur[1] = c.y; cur[2] = c.z;
      if (c.mine) { cur[3] = C.amber[0]; cur[4] = C.amber[1]; cur[5] = C.amber[2]; }
      else { cur[3] = 1.0; cur[4] = 0.97; cur[5] = 0.88; }
      /* IN THE CURSOR'S OWN LAYER. This was pinned to LY.BLOCK, so a
       * highlight whose coordinates are in a field's local space was being
       * drawn at the block's world scale — a glowing ball wandering the
       * frame nowhere near the cell it was meant to be on. It only ever
       * looked right back when the block was the one pickable thing. */
      var cl = c.layer === undefined ? LY.BLOCK : c.layer;
      cur[6] = 2.2; cur[7] = 5.0; cur[8] = cl; cur[9] = 0;
      curPool[0] = c.x; curPool[2] = c.z;
      curPool[3] = cur[3]; curPool[4] = cur[4]; curPool[5] = cur[5];
      curPool[6] = 0.20; curPool[7] = 0.07; curPool[8] = cl;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, vaos.ptBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, counts.pt * 40, cur);
    gl.bindBuffer(gl.ARRAY_BUFFER, vaos.poolBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, counts.pool * 36, curPool);
  }

  function frame(hot) {
    sized();
    writeCursor();
    var VP = viewProj(), eye = eyePos(), i;

    gl.bindFramebuffer(gl.FRAMEBUFFER, sceneT.fb);
    gl.viewport(0, 0, PW, PH);
    gl.clearColor(C.ground[0], C.ground[1], C.ground[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);

    geometry(VP, eye, -1.0, hot);

    {
      gl.useProgram(pPool);
      gl.uniformMatrix4fv(pPool.u.uVP, false, VP);
      gl.uniform3fv(pPool.u.uEye, eye);
      gl.uniform1fv(pPool.u.uScale, layerScale);
      gl.uniform1fv(pPool.u.uAlpha, layerLight);
      gl.uniform2fv(pPool.u.uPan, layerPan);
      gl.uniform1f(pPool.u.uFogK, FOG);
      gl.bindVertexArray(vaos.pool);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, counts.pool + 1);
    }

    geometry(VP, eye, 1.0, hot);

    gl.disable(gl.BLEND);
    gl.bindVertexArray(emptyVao);

    gl.useProgram(pBright);
    gl.bindFramebuffer(gl.FRAMEBUFFER, chain[0].fb);
    gl.viewport(0, 0, chain[0].w, chain[0].h);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sceneT.tex);
    gl.uniform1i(pBright.u.uTex, 0);
    gl.uniform1f(pBright.u.uThresh, 0.68);
    gl.uniform1f(pBright.u.uKnee, 0.26);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.useProgram(pDown);
    var src = chain[0];
    for (i = 1; i < MIPS; i++) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, chain[i].fb);
      gl.viewport(0, 0, chain[i].w, chain[i].h);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, src.tex);
      gl.uniform1i(pDown.u.uTex, 0);
      gl.uniform2f(pDown.u.uTexel, 1/src.w, 1/src.h);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      src = chain[i];
    }
    gl.useProgram(pUp);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    for (i = MIPS - 1; i > 0; i--) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, chain[i-1].fb);
      gl.viewport(0, 0, chain[i-1].w, chain[i-1].h);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, chain[i].tex);
      gl.uniform1i(pUp.u.uTex, 0);
      gl.uniform2f(pUp.u.uTexel, 1/chain[i].w, 1/chain[i].h);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    gl.disable(gl.BLEND);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, PW, PH);
    gl.useProgram(pComp);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sceneT.tex);
    gl.uniform1i(pComp.u.uScene, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, chain[0].tex);
    gl.uniform1i(pComp.u.uBloom, 1);
    gl.uniform1f(pComp.u.uBloomAmt, 0.85);
    gl.uniform1f(pComp.u.uSeed, S.reduced ? 7.0 : (Date.now() % 10000) / 1000);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  return { kind: 'gl', upload: upload, frame: frame };
}
