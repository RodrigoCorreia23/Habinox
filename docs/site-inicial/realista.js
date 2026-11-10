// Tempos do original: luz ascendente, vaivém de 24 s e travelling de login de 2,3 s.
const root=document.documentElement;
const photograph=document.querySelector('.house-photo');
const canvas=document.querySelector('.house-scene');
const control=document.querySelector('.house-control');
const replay=document.querySelector('.house-replay');
const H=window.HABINOX;
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
const narrow=matchMedia('(max-width: 900px)');
const clamp=value=>Math.max(0,Math.min(1,value));
const INTRO=3.2, PERIOD=24, AMPLITUDE=.028, LOGIN_DURATION=2300;
// A mesma curva cubic-bezier(.77,0,.175,1) da câmara original.
function loginEase(x){
  const bez=(a,b,t)=>3*a*t*(1-t)**2+3*b*t*t*(1-t)+t**3;
  let low=0,high=1;
  for(let i=0;i<18;i++){
    const mid=(low+high)/2;
    if(bez(.77,.175,mid)<x)low=mid;else high=mid;
  }
  return bez(0,1,(low+high)/2);
}
let renderer=null,loadId=0;
let position=0,shot=H.T||0,login=H.route==='entrar'?1:0,targetShot=shot,targetLogin=login;
let loginTween=null;
let last=0,drawnAt=0,raf=0;
let age=0,loopTime=0,rest=1,stillFor=1,lastY=scrollY;
let paused=false,failed=false;

function frame(now){
  raf=0;
  const dt=Math.min(last?(now-last)/1000:0,.05);last=now;
  if(H.shot){targetShot=H.shot.T;if(H.shot.instant)shot=targetShot;H.shot=null;}
  if(H.login){
    const to=H.login.on?1:0;
    if(H.login.instant||reduce.matches){login=to;loginTween=null;}
    else if(to!==targetLogin){
      loginTween={from:login,to,start:now,duration:LOGIN_DURATION*Math.max(.45,Math.abs(to-login))};
    }
    targetLogin=to;H.login=null;
  }
  let arrived=false;
  if(loginTween){
    const progress=clamp((now-loginTween.start)/loginTween.duration);
    login=loginTween.from+(loginTween.to-loginTween.from)*loginEase(progress);
    if(progress===1){login=loginTween.to;loginTween=null;arrived=true;}
  }
  const targetPosition=H.route==='inicio'?clamp(scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight)):position;
  const ease=reduce.matches?1:1-Math.exp(-dt*5);
  position+=(targetPosition-position)*ease;shot+=(targetShot-shot)*ease;
  H.T=shot;H.update(position);if(shot>.6)H.heroIn();
  const visible=!root.classList.contains('covered')&&(H.route==='inicio'||scrollY<innerHeight*1.45);
  stillFor=Math.abs(scrollY-lastY)>.5?0:stillFor+dt;lastY=scrollY;
  rest+=((stillFor>.4?1:0)-rest)*(1-Math.exp(-dt*(stillFor>.4?1.5:7)));
  if(renderer&&visible&&!paused&&!reduce.matches){
    age+=dt;
    // Retomar o vaivém só quando a câmara regressa à loja evita um salto de fase.
    if(age>=INTRO&&H.route==='loja'&&!loginTween&&login===0)loopTime+=dt*rest;
  }
  if(age>1.1||H.route!=='loja'||failed||reduce.matches)root.classList.add('lit');
  const orbit=Math.sin(2*Math.PI*loopTime/PERIOD)*AMPLITUDE;
  const angle=orbit*shot*(1-login)+position*.022*(1-shot)-login*.018;
  if(renderer&&visible&&(now-drawnAt>=1000/30||arrived)){
    renderer.draw(reduce.matches?INTRO:age,reduce.matches?0:angle,login);drawnAt=now;
    H.scene={age,loopTime,angle,login,paused,lights:renderer.count,renderer:'webgl-depth'};
  }
  const moving=loginTween||Math.abs(targetPosition-position)+Math.abs(targetShot-shot)>.0001;
  const ambient=age<INTRO||H.route==='loja';
  if((renderer&&visible&&ambient&&!paused&&!reduce.matches)||moving)schedule();
}
function schedule(){if(!raf&&!document.hidden)raf=requestAnimationFrame(frame);}
function wake(){last=performance.now();schedule();}
function setPaused(value){
  paused=value;control.setAttribute('aria-pressed',String(paused));
  // Pausar a abertura nunca deve esconder indefinidamente a navegação.
  if(paused)root.classList.add('lit');
  if(H.scene)H.scene={...H.scene,age,loopTime,paused};
  control.querySelector('span').textContent=paused?'Retomar ambiente':'Pausar ambiente';wake();
}
control.addEventListener('click',()=>setPaused(!paused));
replay.addEventListener('click',()=>{
  age=0;loopTime=0;rest=1;stillFor=1;root.classList.remove('lit');setPaused(false);
});
async function loadScene(){
  const id=++loadId;root.classList.remove('scene-ready');renderer?.dispose();renderer=null;
  try{
    await photograph.decode();if(id!==loadId)return;
    if(reduce.matches){root.classList.add('ready','lit');window.__ready=true;return;}
    renderer=createHouseRenderer(canvas,photograph,narrow.matches);
    if(!renderer)throw new Error('WebGL indisponível');
    renderer.draw(age,-login*.018,login);root.classList.add('scene-ready','ready');control.disabled=false;replay.disabled=false;failed=false;
  }catch(error){
    console.warn('Ambiente estático:',error.message);
    failed=true;control.disabled=true;replay.disabled=true;root.classList.add('ready','lit');
  }
  window.__ready=true;wake();
}
addEventListener('scroll',wake,{passive:true});
addEventListener('resize',()=>{renderer?.resize();drawnAt=0;wake();},{passive:true});
addEventListener('hashchange',()=>{if(H.route!=='loja')age=INTRO;wake();});
document.addEventListener('click',()=>requestAnimationFrame(wake));
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){cancelAnimationFrame(raf);raf=0;last=0;}else wake();
});
narrow.addEventListener('change',()=>requestAnimationFrame(loadScene));
reduce.addEventListener('change',()=>{
  age=INTRO;login=H.route==='entrar'?1:0;targetLogin=login;loginTween=null;
  if(reduce.matches){cancelAnimationFrame(raf);raf=0;root.classList.remove('scene-ready');}
  loadScene();
});
canvas.addEventListener('webglcontextlost',event=>{
  event.preventDefault();cancelAnimationFrame(raf);raf=0;renderer=null;
  root.classList.remove('scene-ready');root.classList.add('lit');control.disabled=true;replay.disabled=true;
});
canvas.addEventListener('webglcontextrestored',loadScene);
H.driven=true;
if(H.route!=='loja')age=INTRO;
loadScene();
