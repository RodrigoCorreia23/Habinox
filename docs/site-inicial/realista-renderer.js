// Reprojeção 2.5D da fotografia, com iluminação presa às coordenadas dos degraus.
// Incorporado por cenarios/realista.mjs antes do controlador realista.js.
function createHouseRenderer(canvas, image, portrait) {
  const gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false});
  if (!gl) return null;
  const width=image.naturalWidth, height=image.naturalHeight, aspect=width/height;
  const config=portrait ? {
    size:[941,1672],
    lights:[[487,1098,641,1103],[479,1072,639,1072],[478,1045,637,1045],[486,1008,636,1006],[507,976,636,975],[527,945,639,944],[551,910,644,910],[586,874,654,875],[624,835,662,840],[657,802,674,806]],
    stair:[[.497,.66],[.65,.67],[.75,.46],[1,.34],[1,.25],[.61,.39],[.493,.54]],
    window:[[0,.18],[.37,.35],[.38,.65],[0,.72]],
    ceiling:[[0,0],[1,0],[1,.25],[.72,.34],[.37,.35],[0,.18]],
    floor:[[0,.72],[.51,.65],[1,.61],[1,1],[0,1]],foot:.67,top:.29,horizon:.59,
  } : {
    size:[1672,941],
    lights:[[744,815,982,815],[746,780,984,780],[761,744,985,743],[783,705,993,704],[815,668,1005,666],[865,625,1019,627],[926,578,1034,586],[985,535,1055,546],[1045,498,1071,506]],
    stair:[[.44,.89],[.60,.89],[.65,.54],[.76,.38],[1,.16],[1,0],[.88,0],[.59,.28],[.44,.69]],
    window:[[0,0],[.35,.29],[.43,.85],[0,.88]],
    ceiling:[[0,0],[1,0],[.64,.26],[.35,.29]],
    floor:[[0,.88],[.44,.84],[.65,.81],[1,.80],[1,1],[0,1]],foot:.88,top:.13,horizon:.69,
  };
  const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
  function polygonDistance(x,y,points) {
    let inside=false,distance=1;
    for (let i=0,j=points.length-1;i<points.length;j=i++) {
      const [ax,ay]=points[j], [bx,by]=points[i],dx=bx-ax,dy=by-ay;
      if ((ay>y)!==(by>y) && x<(bx-ax)*(y-ay)/(by-ay)+ax) inside=!inside;
      const t=clamp(((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy));
      distance=Math.min(distance,Math.hypot(x-ax-t*dx,y-ay-t*dy));
    }
    return (inside?1:-1)*distance;
  }
  function depthAt(u,v) {
    // A sala fica num plano rígido: caixilharias e portas não devem ondular.
    // O relevo da escada é contínuo nas margens, sem saltos de profundidade.
    const t=clamp((polygonDistance(u,v,config.stair)+.055)/.11);
    const weight=t*t*(3-2*t);
    const near=clamp((v-config.top)/(config.foot-config.top));
    return 10.5-weight*(1.5+near*1.6);
  }
  const vertex=`
    attribute vec3 a_vertex;
    uniform vec2 u_fit,u_offset,u_travel;
    uniform float u_aspect,u_angle,u_zoom;
    varying vec2 v_uv;
    void main(){
      v_uv=a_vertex.xy;
      float depth=a_vertex.z;
      float lens=.4244748;
      vec3 p=vec3((v_uv.x-.5)*2.0*u_aspect*depth*lens,(.5-v_uv.y)*2.0*depth*lens,-depth);
      p.z+=7.3;
      float c=cos(u_angle),s=sin(u_angle);
      p.xz=mat2(c,-s,s,c)*p.xz;
      p.z-=7.3;
      vec2 projected=vec2(p.x/u_aspect,p.y)/(-p.z*lens);
      gl_Position=vec4((projected*u_fit+u_offset)*u_zoom+u_travel,0.0,1.0);
    }`;
  const fragment=`
    precision mediump float;
    uniform sampler2D u_photo,u_lights;
    uniform float u_age;
    varying vec2 v_uv;
    void main(){
      vec3 base=texture2D(u_photo,v_uv).rgb;
      vec3 light=texture2D(u_lights,v_uv).rgb;
      float delay=.25+light.g*2.2;
      float lit=smoothstep(delay,delay+.38,u_age);
      vec3 color=base*(1.0-(1.0-lit)*(light.r*.62+light.b*.12));
      color+=vec3(1.0,.64,.28)*lit*(light.r*.36+light.b*.075);
      color*=.86+.14*smoothstep(.25,2.83,u_age);
      gl_FragColor=vec4(color,1.0);
    }`;
  function shader(type,source){
    const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const message=gl.getShaderInfoLog(s);gl.deleteShader(s);throw new Error(message);}
    return s;
  }
  const program=gl.createProgram(),vs=shader(gl.VERTEX_SHADER,vertex),fs=shader(gl.FRAGMENT_SHADER,fragment);
  gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const uniforms=Object.fromEntries(['fit','offset','travel','aspect','angle','zoom','photo','lights','age'].map(n=>[n,gl.getUniformLocation(program,'u_'+n)]));
  const cols=portrait?120:200,rows=portrait?214:114,vertices=[],indices=[];
  for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++){
    const u=x/cols,v=y/rows;vertices.push(u,v,depthAt(u,v));
    if(x<cols&&y<rows){const a=y*(cols+1)+x,b=a+cols+1;indices.push(a,b,a+1,a+1,b,b+1);}
  }
  const vertexBuffer=gl.createBuffer(),indexBuffer=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
  const attr=gl.getAttribLocation(program,'a_vertex');gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,3,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
  function texture(unit,source){
    const t=gl.createTexture();gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);return t;
  }
  const photoTexture=texture(0,image),mask=new ImageData(width,height),sx=width/config.size[0],sy=height/config.size[1];
  // R: emissão; G: ordem do degrau; B: luz difusa na pedra e no metal.
  config.lights.forEach(([x1,y1,x2,y2],i)=>{
    x1*=sx;x2*=sx;y1*=sy;y2*=sy;
    const radius=(portrait?1.8:2.2)*sx,halo=radius*5,dx=x2-x1,dy=y2-y1,length=dx*dx+dy*dy;
    for(let y=Math.max(0,Math.floor(Math.min(y1,y2)-halo));y<Math.min(height,Math.ceil(Math.max(y1,y2)+halo));y++){
      for(let x=Math.max(0,Math.floor(Math.min(x1,x2)-halo));x<Math.min(width,Math.ceil(Math.max(x1,x2)+halo));x++){
        const t=clamp(((x-x1)*dx+(y-y1)*dy)/length),distance=Math.hypot(x-x1-t*dx,y-y1-t*dy);
        const core=Math.exp(-Math.pow(distance/radius,2)*1.5),spill=Math.exp(-Math.pow(distance/(radius*3.5),2)*1.5),p=(y*width+x)*4;
        if(spill*255<mask.data[p+2])continue;
        mask.data[p]=Math.round(core*255);mask.data[p+1]=Math.round(i/(config.lights.length-1)*255);mask.data[p+2]=Math.round(spill*255);mask.data[p+3]=255;
      }
    }
  });
  const lightTexture=texture(1,mask);
  gl.uniform1i(uniforms.photo,0);gl.uniform1i(uniforms.lights,1);gl.uniform1f(uniforms.aspect,aspect);
  let fitX=1,fitY=1,offsetX=0,offsetY=0;
  function resize(){
    const dpr=Math.min(devicePixelRatio||1,1.5);
    canvas.width=Math.round(innerWidth*dpr);canvas.height=Math.round(innerHeight*dpr);gl.viewport(0,0,canvas.width,canvas.height);
    const viewport=canvas.width/canvas.height,fx=Math.max(1,aspect/viewport),fy=Math.max(1,viewport/aspect);
    fitX=fx;fitY=fy;offsetX=-(fx-1)*(portrait?0:.16);offsetY=(fy-1)*(portrait?.08:.04);
    gl.uniform2f(uniforms.fit,fx,fy);gl.uniform2f(uniforms.offset,offsetX,offsetY);
  }
  resize();
  return {
    count:config.lights.length,resize,
    draw(age,angle,login=0){
      // A escada aproxima-se e abre espaço à direita, como no enquadramento original.
      // No telemóvel, o movimento é menor para manter a escada acima do formulário.
      const mobile=innerWidth<=760,targetZoom=mobile?1.22:1.48;
      const zoom=1.035+(targetZoom-1.035)*login;
      // O limite usa a pose final: o travelling mantém a curva original sem expor margens.
      const pan=Math.min(mobile?.18:.58,Math.max(0,(fitX+offsetX)*targetZoom-1-.065));
      const lift=Math.min(mobile?.08:.32,Math.max(0,(fitY-offsetY)*targetZoom-1-.065));
      gl.uniform1f(uniforms.age,age);gl.uniform1f(uniforms.angle,angle);gl.uniform1f(uniforms.zoom,zoom);
      gl.uniform2f(uniforms.travel,-pan*login,lift*login);
      gl.clear(gl.COLOR_BUFFER_BIT);gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);
    },
    dispose(){gl.deleteTexture(photoTexture);gl.deleteTexture(lightTexture);gl.deleteBuffer(vertexBuffer);gl.deleteBuffer(indexBuffer);gl.deleteProgram(program);},
  };
}
