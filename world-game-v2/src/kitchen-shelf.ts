import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { KitchenPool, type PoolJar, type PoolState } from './kitchen-pool';

const COLORS = ['#bba944', '#629c75', '#c2643c', '#84617e', '#d3a844', '#668b9b', '#b66b70', '#749551', '#bb8051', '#60938d', '#95758f', '#b0a85e'];
const PROFILE = [[0,.02],[.34,.02],[.415,.045],[.45,.12],[.45,.88],[.44,.97],[.39,1.06],[.36,1.09],[.36,1.17],[.325,1.17],[.325,1.08],[.4,.94],[.413,.87],[.413,.14],[.34,.09],[0,.09]];

/** Physical kitchen furniture: no overlay, interaction blocker, or wallet action. */
export class KitchenShelf {
  root = new T.Group();
  private jars = new T.Group();
  private wood = new T.MeshStandardMaterial({color: '#86603e', roughness: .85});
  private caption = document.createElement('canvas');
  private captionMap: T.CanvasTexture;
  private feed = new KitchenPool(state => this.update(state));
  private texturesStarted = false;
  private signature = '';
  private generation = 0;
  private disposed = false;
  private onVisibility = () => { if (document.hidden) this.feed.setActive(false); };
  private onPageHide = () => this.feed.setActive(false);
  constructor() {
    this.root.name = 'TopShelf top four token jars';
    this.root.position.set(6.45, 5.95, -1.8);
    const box = (x: number, y: number, z: number, w: number, h: number, d: number, material: T.Material = this.wood) => {
      const mesh = new T.Mesh(new RoundedBoxGeometry(w,h,d,2,.025), material);
      mesh.position.set(x,y,z); this.root.add(mesh);
    };
    box(0,1,-.52,4.7,2.45,.12);
    for (const x of [-2.3,2.3]) box(x,1,0,.18,2.45,1.15);
    for (const y of [-.13,2.13]) box(0,y,0,4.7,.18,1.15);
    const bracket = new T.MeshStandardMaterial({color:'#393028',metalness:.45,roughness:.5});
    for (const x of [-1.85,1.85]) box(x,-.3,-.1,.1,.25,.95,bracket);
    this.caption.width=1024; this.caption.height=160;
    this.captionMap=new T.CanvasTexture(this.caption); this.captionMap.colorSpace=T.SRGBColorSpace;
    const plaque=new T.Mesh(new T.PlaneGeometry(4.28,.56),new T.MeshBasicMaterial({map:this.captionMap,toneMapped:false}));
    plaque.position.set(0,1.76,.585); this.root.add(plaque,this.jars);
    this.drawCaption('TOP 4 TOKENS · POOL TVL','Loading Pons valuations…');
    document.addEventListener('visibilitychange',this.onVisibility);
    window.addEventListener('pagehide',this.onPageHide);
  }
  tick(active: boolean) {
    this.feed.setActive(active);
    if (!active || this.disposed) return;
    if (!this.texturesStarted) { this.texturesStarted=true; void this.loadWood(); }
    void this.feed.refresh();
  }
  private async loadWood() {
    const loader=new T.TextureLoader();
    await Promise.all(['color','normal','roughness'].map(async (name,index)=>{
      try {
        const map=await loader.loadAsync(`/world/textures/oak/${name}.webp`);
        if(this.disposed){map.dispose();return;}
        map.colorSpace=index===0?T.SRGBColorSpace:T.NoColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(2,1);map.anisotropy=4;
        if(index===0){this.wood.map=map;this.wood.color.set('#b98e66');}
        else if(index===1){this.wood.normalMap=map;this.wood.normalScale.set(.3,.3);}
        else this.wood.roughnessMap=map;
        this.wood.needsUpdate=true;
      } catch { /* Keep the wooden material if the optional texture is unavailable. */ }
    }));
  }
  private drawCaption(title: string, detail: string) {
    const ctx=this.caption.getContext('2d')!;
    ctx.fillStyle='#253327';ctx.fillRect(0,0,1024,160);ctx.textAlign='center';
    ctx.fillStyle='#dcf5a3';ctx.font='bold 53px Arial';ctx.fillText(title,512,64,980);
    ctx.fillStyle='#e9e0c8';ctx.font='32px Arial';ctx.fillText(detail,512,122,980);this.captionMap.needsUpdate=true;
  }
  private update(state: PoolState) {
    const signature=JSON.stringify(state);
    if(this.disposed||signature===this.signature)return;
    this.signature=signature;this.generation++;
    this.clearJars();
    const detail=state.status==='unavailable'?'Valuations unavailable · retrying':state.status==='unconfigured'?'TopShelf is not active yet':!state.jars.length?'Awaiting season tokens':'Highest estimated USD value · left to right';
    this.drawCaption('TOP 4 TOKENS · POOL TVL',detail);
    for(const [index,token] of state.jars.entries())this.addJar(token,index);
  }
  private addJar(token: PoolJar,index: number) {
    const group=new T.Group();group.position.set(-1.68+index*1.12,-.055,.12);this.jars.add(group);
    const glass=new T.MeshPhysicalMaterial({color:'#d7eddf',roughness:.1,metalness:.08,transparent:true,opacity:.24,depthWrite:false});
    group.add(new T.Mesh(new T.LatheGeometry(PROFILE.map(([x,y])=>new T.Vector2(x,y)),32),glass));
    if(BigInt(token.balance)>0n){const contents=new T.Mesh(new T.CylinderGeometry(.402,.402,.69,24),new T.MeshStandardMaterial({color:COLORS[parseInt(token.address.slice(-4),16)%COLORS.length],roughness:.5}));contents.position.y=.43;group.add(contents);}
    const metal=new T.MeshStandardMaterial({color:'#a8a28b',metalness:.65,roughness:.3});
    const lid=new T.Mesh(new T.CylinderGeometry(.4,.4,.14,40),metal);lid.position.y=1.205;group.add(lid);
    for(const y of [.08,1.14,1.27]){const rim=new T.Mesh(new T.TorusGeometry(.4,.018,6,32),metal);rim.rotation.x=Math.PI/2;rim.position.y=y;group.add(rim);}
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
    const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
    const ctx=canvas.getContext('2d')!;
    const draw=(logo?:HTMLImageElement)=>{
      ctx.fillStyle='#f0e8d6';ctx.fillRect(0,0,512,512);ctx.strokeStyle='#8c927b';ctx.lineWidth=4;ctx.strokeRect(12,12,488,488);
      ctx.textAlign='center';ctx.fillStyle='#263a29';ctx.font='bold 38px Arial';ctx.fillText(`#${index+1} · ${token.symbol}`,256,60,470);
      ctx.save();ctx.beginPath();ctx.arc(256,243,143,0,Math.PI*2);ctx.clip();ctx.fillStyle='#d0dab9';ctx.fillRect(105,95,302,302);
      if(logo){const scale=Math.max(286/logo.naturalWidth,286/logo.naturalHeight);ctx.drawImage(logo,256-logo.naturalWidth*scale/2,243-logo.naturalHeight*scale/2,logo.naturalWidth*scale,logo.naturalHeight*scale);}
      else{ctx.fillStyle='#314536';ctx.font='bold 72px Arial';ctx.fillText(token.symbol.slice(0,3),256,267);}
      ctx.restore();ctx.fillStyle='#263a29';ctx.font='bold 37px Arial';ctx.fillText(token.tvlUsd===null?'PRICE UNAVAILABLE':token.tvlUsd.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2})+' TVL',256,454,470);map.needsUpdate=true;
    };
    draw();
    const label=new T.Mesh(new T.CylinderGeometry(.456,.456,.74,24,1,true,-.9,1.8),new T.MeshBasicMaterial({map,side:T.DoubleSide,toneMapped:false}));label.position.y=.58;group.add(label);
    const generation=this.generation,image=new Image();
    image.onload=()=>{if(!this.disposed&&generation===this.generation&&image.naturalWidth)draw(image);};
    image.src=`/api/world/topshelf/logo?token=${token.address}`;
  }
  private clearJars() {
    const materials=new Set<T.Material>(),geometries=new Set<T.BufferGeometry>();
    this.jars.traverse(node=>{if(node instanceof T.Mesh){geometries.add(node.geometry);for(const mat of Array.isArray(node.material)?node.material:[node.material])materials.add(mat);}});
    materials.forEach(mat=>{(mat as T.MeshBasicMaterial).map?.dispose();mat.dispose();});geometries.forEach(g=>g.dispose());this.jars.clear();
  }
  dispose() {
    this.disposed=true;this.generation++;this.feed.setActive(false);document.removeEventListener('visibilitychange',this.onVisibility);window.removeEventListener('pagehide',this.onPageHide);this.clearJars();
    this.wood.map?.dispose();this.wood.normalMap?.dispose();this.wood.roughnessMap?.dispose();this.captionMap.dispose();
    this.root.traverse(node=>{if(node instanceof T.Mesh){node.geometry.dispose();for(const mat of Array.isArray(node.material)?node.material:[node.material])mat.dispose();}});this.root.removeFromParent();
  }
}
