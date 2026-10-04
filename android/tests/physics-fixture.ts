import {initPhysics,MergeGame,checkpointPhysics} from './core';
import {Scene,PerspectiveCamera,WebGLRenderer,Mesh,SphereGeometry,MeshBasicMaterial} from 'three';
// Offline test harness only: no wallet, server, eligibility or ranking integration.
(async()=>{
 await initPhysics();
 const game=new MergeGame(8);
 try{
  game.spawn(1,-.29,1.5);game.spawn(1,.29,1.5);
  for(let i=0;i<15;i++)game.step();
  if(game.merges!==0)throw Error('Separated pieces merged');
  game.spawn(1,0,1.5);for(let i=0;i<60;i++)game.step();
  if(game.score!==20||game.merges!==1||game.pieces.size!==2)throw Error('Original engine merge mismatch');
  checkpointPhysics(game);for(let i=0;i<30;i++)game.step();
  const renderer=new WebGLRenderer({preserveDrawingBuffer:true});renderer.setSize(320,480);document.body.append(renderer.domElement);
  const scene=new Scene(),camera=new PerspectiveCamera(50,320/480,.1,100);camera.position.set(0,2,9);camera.lookAt(0,2,0);
  for(const piece of game.pieces.values()){const mesh=new Mesh(new SphereGeometry(piece.radius),new MeshBasicMaterial({color:0xc1ec73}));const p=piece.body.translation();mesh.position.set(p.x,p.y,p.z);scene.add(mesh);}
  renderer.render(scene,camera);
  const gl=renderer.getContext(),pixels=new Uint8Array(320*480*4);gl.readPixels(0,0,320,480,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  let colored=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i+1]>150&&pixels[i]>100)colored++;
  if(colored<100)throw Error('Three.js failed to render the physics pieces');
  (window as any).fixtureResult={ok:true,score:game.score,merges:game.merges,pieces:game.pieces.size,coloredPixels:colored,ticks:game.tick};
  renderer.dispose();
 }finally{game.dispose();}
})().catch(error=>{(window as any).fixtureResult={ok:false,error:String(error)};});
