import { ImageResponse } from 'next/og';
export const runtime = 'edge';
export const alt = 'DevFridge Hackathon — Your meme. Your game.';
export const size = {width:1200,height:630};
export const contentType = 'image/png';
export default function Image() {
  return new ImageResponse(<div style={{display:'flex',flexDirection:'column',width:'100%',height:'100%',background:'#121d19',padding:'55px 65px',color:'#f4f2e6',fontFamily:'sans-serif'}}><div style={{display:'flex',justifyContent:'space-between',fontSize:23,color:'#d7ff65'}}><span>DEVFRIDGE / HACKATHON</span><span>AGENTIC GAME BUILDING</span></div><div style={{display:'flex',flexDirection:'column',fontSize:112,fontWeight:900,letterSpacing:-7,marginTop:44,lineHeight:1}}><span>Your meme.</span><span style={{color:'#d7ff65'}}>Your game.</span></div><div style={{display:'flex',fontSize:29,marginTop:30}}>Build a world your community comes back to.</div><div style={{display:'flex',justifyContent:'space-between',fontSize:20,marginTop:'auto',color:'#d7ff65'}}><span>SOLANA + THREE.JS + PHANTOM + YOUR AGENT</span><span>hackathon.devfridge.cool</span></div></div>,size);
}
