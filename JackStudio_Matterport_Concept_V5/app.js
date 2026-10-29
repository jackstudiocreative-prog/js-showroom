(()=>{'use strict';
const $=id=>document.getElementById(id),canvas=$('world');
const gl=canvas.getContext('webgl2',{antialias:true,alpha:false,powerPreference:'high-performance'})||canvas.getContext('webgl',{antialias:true,alpha:false});
if(!gl){$('loading').innerHTML='<div class="loadbox">Your browser does not support WebGL.<br>Please use Chrome or Edge.</div>';return;}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t;
const rects=window.JS_ATLAS_RECTS||{};
const vs=`attribute vec3 aPos;attribute vec2 aUV;attribute float aShade;uniform mat4 uVP;uniform vec3 uCamera;varying vec2 vUV;varying float vShade;varying float vDist;void main(){gl_Position=uVP*vec4(aPos,1.);vUV=aUV;vShade=aShade;vDist=distance(aPos,uCamera);}`;
const fs=`precision highp float;varying vec2 vUV;varying float vShade;varying float vDist;uniform sampler2D uTexture;uniform float uCut;void main(){vec4 tex=texture2D(uTexture,vUV);if(tex.a<uCut)discard;vec3 color=tex.rgb*vShade;color=mix(color,vec3(.81,.78,.74),clamp((vDist-10.)/24.,0.,.28));gl_FragColor=vec4(color,1.);}`;
function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}
const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vs));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
const loc={pos:gl.getAttribLocation(program,'aPos'),uv:gl.getAttribLocation(program,'aUV'),shade:gl.getAttribLocation(program,'aShade'),mvp:gl.getUniformLocation(program,'uVP'),camera:gl.getUniformLocation(program,'uCamera'),sampler:gl.getUniformLocation(program,'uTexture'),cut:gl.getUniformLocation(program,'uCut')};
const verts=[],UVS=[],shades=[];
// Photo cut-out products (RGBA sprite sheet, alpha-tested), drawn as a second pass.
const SP=window.JS_SPRITES||{},SPS=window.JS_SPRITE_SIZE||[1,1],sV=[],sU=[],sS=[];
// Each product is a photo card that turns (around its vertical axis) to face the viewer, so it is
// always seen from the front; the turn is limited so cards never swing out of their shelf.
const SPR=[];
function sprite(x,zc,hw,y0,y1,key,shade=1,turn=true){const m=SP[key];if(!m)return;const [u,v,w,h]=m.uv;
 let b=[x,y0,zc],t=[x,y1,zc],e=[x,y0,zc+hw];if(XF){b=XF(b);t=XF(t);e=XF(e)}
 SPR.push({x:b[0],z:b[2],y0:b[1],y1:t[1],hw:e[2]-b[2],turn,uv:[(u+.5)/SPS[0],(v+.5)/SPS[1],(u+w-.5)/SPS[0],(v+h-.5)/SPS[1]],shade})}
// a photo panel fixed in space: q = bottom-left, bottom-right, top-right, top-left
function photoQuad(key,q,shade=1){const m=SP[key];if(!m)return;const [u,v,w,h]=m.uv;
 SPR.push({quad:q,uv:[(u+.5)/SPS[0],(v+.5)/SPS[1],(u+w-.5)/SPS[0],(v+h-.5)/SPS[1]],shade})}
// cards stay parallel to the screen (face the view direction), so a row of them always lines up
function spriteGeometry(yaw){const P=[];const a0=Math.atan2(Math.cos(yaw),-Math.sin(yaw));for(const s of SPR){if(s.quad){for(const i of [0,1,2,0,2,3])P.push(...s.quad[i]);continue}let nx=-1,nz=0;
 if(typeof s.turn==='number'){nx=-Math.cos(s.turn);nz=-Math.sin(s.turn)}else if(s.turn){let a=a0,d=Math.atan2(Math.sin(a-Math.PI),Math.cos(a-Math.PI));d=Math.max(-.9,Math.min(.9,d));nx=-Math.cos(d);nz=-Math.sin(d)}
 const rx=nz*s.hw,rz=-nx*s.hw,q=[[s.x-rx,s.y0,s.z-rz],[s.x+rx,s.y0,s.z+rz],[s.x+rx,s.y1,s.z+rz],[s.x-rx,s.y1,s.z-rz]];
 for(const i of [0,1,2,0,2,3])P.push(...q[i])}return P}
const vw=4096;function uvTile(id){const r=rects[id]||rects.white;return [(r[0]+2)/vw,(r[1]+2)/vw,(r[0]+r[2]-2)/vw,(r[1]+r[3]-2)/vw]}
let XF=null;// optional point transform (used to scale a whole zone)
function quad(a,b,c,d,texture='wall',shade=1){if(XF){a=XF(a);b=XF(b);c=XF(c);d=XF(d)}const uv=uvTile(texture),p=[a,b,c,a,c,d],t=[[uv[0],uv[3]],[uv[2],uv[3]],[uv[2],uv[1]],[uv[0],uv[3]],[uv[2],uv[1]],[uv[0],uv[1]]];for(let i=0;i<6;i++){verts.push(...p[i]);UVS.push(...t[i]);shades.push(shade)}}
function box(x,y,z,w,h,d,tex='wood',light=1){const a=x-w/2,b=x+w/2,c=y-h/2,e=y+h/2,f=z-d/2,g=z+d/2;
quad([a,c,g],[b,c,g],[b,e,g],[a,e,g],tex,light*.96);quad([b,c,f],[a,c,f],[a,e,f],[b,e,f],tex,light*.85);
quad([a,c,f],[a,c,g],[a,e,g],[a,e,f],tex,light*.77);quad([b,c,g],[b,c,f],[b,e,f],[b,e,g],tex,light*.91);
quad([a,e,g],[b,e,g],[b,e,f],[a,e,f],tex,light*1.07);quad([a,c,f],[b,c,f],[b,c,g],[a,c,g],tex,light*.58)}
function xpanel(x,zb,ze,yb,yt,tex,shade=1,side=1){const l=side===1?zb:ze,r=side===1?ze:zb;quad([x,yb,l],[x,yb,r],[x,yt,r],[x,yt,l],tex,shade)}
function zpanel(z,xb,xe,yb,yt,tex,shade=1){quad([xb,yb,z],[xe,yb,z],[xe,yt,z],[xb,yt,z],tex,shade)}
function ring(cx,cz,r=0.28,shade=1){const seg=24,y=.035;for(let i=0;i<seg;i++){const a=i*Math.PI*2/seg,b=(i+1)*Math.PI*2/seg;
quad([cx+Math.cos(a)*(r-.065),y,cz+Math.sin(a)*(r-.065)],[cx+Math.cos(b)*(r-.065),y,cz+Math.sin(b)*(r-.065)],[cx+Math.cos(b)*r,y,cz+Math.sin(b)*r],[cx+Math.cos(a)*r,y,cz+Math.sin(a)*r],'cream',shade)}}
function line3(a,b,w=0.045,tex='metal'){// square-section beam between two points
const d=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],L=Math.hypot(...d);if(L<1e-6)return;const n=d.map(v=>v/L);
let r=Math.abs(n[1])<.9?[n[2],0,-n[0]]:[1,0,0];let rl=Math.hypot(...r);r=r.map(v=>v/rl*w/2);
const u=[n[1]*r[2]-n[2]*r[1],n[2]*r[0]-n[0]*r[2],n[0]*r[1]-n[1]*r[0]];
const P=(p,sr,su)=>[p[0]+r[0]*sr+u[0]*su,p[1]+r[1]*sr+u[1]*su,p[2]+r[2]*sr+u[2]*su];
const C=[[1,1],[-1,1],[-1,-1],[1,-1]],sh=[1.02,.9,.7,.86];
for(let i=0;i<4;i++){const [s1,u1]=C[i],[s2,u2]=C[(i+1)%4];quad(P(a,s1,u1),P(a,s2,u2),P(b,s2,u2),P(b,s1,u1),tex,.83*sh[i])}}
// Environment geometry: phototextured racks in a walkable world, not panorama cards.
// Our Story recess under the staircase (left wall): runs from m=-.45 to 3.2 along the wall, 0.75 m deep
const OS={zs:.3,W:3.2,m2:-.45,SW:.3,d:m=>.9+.85*m};
const FRONT=4.55,RC=(-10.22+FRONT)/2,RL=FRONT+10.22; // room front (entrance) and centre/length along z
function buildWorld(){
// Floor: repeated genuine volumetric floor geometry, light-oak texture.
for(let x=-5.4;x<5.4;x+=1.35)for(let z=-10.1;z<FRONT-.05;z+=1.6)
quad([x,0,z+1.6],[x+1.35,0,z+1.6],[x+1.35,0,z],[x,0,z],'floor',.95+((Math.round(z*5+x*2)%3)*.018));
box(0,4.14,RC,11,0.17,RL,'cream',1.04);
// White plaster walls, room boundary and entrance side returns.
box(5.52,2,RC,.18,4,RL,'wall',.99);
{const zA=OS.zs-OS.m2,zB=OS.zs-OS.W;box(-5.52+OS.SW/2,2.03,(FRONT+zA)/2,.18+OS.SW,4.06,FRONT-zA,'wall',.95);box(-5.52,2,(zB-10.22)/2,.18,4,zB+10.22,'wall',.95);
 {const m0=OS.m2,m1=OS.W;quad([-5.43,OS.d(m0),OS.zs-m0],[-5.43,OS.d(m1),OS.zs-m1],[-5.43,4.06,OS.zs-m1],[-5.43,4.06,OS.zs-m0],'wall',.82)}}
box(-4.4,2,FRONT,2.2,4,.16,'wall',1);box(4.4,2,FRONT,2.2,4,.16,'wall',1);
box(-1.61,2,FRONT,.13,4,.15,'metal');box(1.61,2,FRONT,.13,4,.15,'metal');box(0,3.7,FRONT,3.2,.14,.12,'metal');
// Glass entrance doors and side mullions (light gray, intentionally translucent-looking).
xpanel(-1.58,FRONT-.05,FRONT-.02,.1,3.65,'glass',1,-1);box(0,1.8,FRONT-.02,.045,3.6,.065,'metal',.9);
// Wall skirt/baseboard around all sides
box(5.38,.13,RC,.12,.26,RL-.2,'wood',.82);{const zA=OS.zs-OS.m2,zB=OS.zs-OS.W;box(-5.38+OS.SW,.13,(FRONT-.1+zA)/2,.12,.26,FRONT-.1-zA,'wood',.82);box(-5.38,.13,(zB-10.12)/2,.12,.26,zB+10.12,'wood',.82)}
for(const s of [-1,1])box(s*(5.3+2.17)/2,.11,-10.075,5.3-2.17,.22,.11,'wood',.85);
// Ceiling tracks and multiple recessed lights
for(const x of [-2.5,2.5]){
 box(x,4,RC,.07,.06,RL-2,'metal',1);
 for(const z of [-7.4,-4.8,-2.0,1.0,3.4]){
  box(x,3.955,z,.44,.05,.22,'white',1.14);
  box(x,3.915,z,.34,.035,.14,'cream',1.25);
 }
}
for(const z of [-7.3,-2.1,3.1])box(0,4.0,z,3.2,.06,.06,'metal',.8);
backWall();
// Main wall arrays with actual store photos integrated into the display backing.
brandWalls();essentialZone(-6.75);
urbanZone();profZone();travelZone();
// Main freestanding display islands, with three-dimensional leather products.
craftInnovative(0.3,0.35);craftHeritage(0,-2.25);giftTable(0,-5.8);walletCounter(0,-7.45);
}
// Back of store, rebuilt from the storefront photo: lit JACK STUDiO letters over a wide
// solid white end wall, nothing else on the wall.
function backWall(){
// Proportions measured from the storefront photo: fascia ~1/3 of the wall height, letters 0.44 m
// tall and 3.24 m wide, sitting 0.35 m above a 4.3 m wide opening. The opening is kept as a
// shallow white recess (structure only; nothing behind it is shown).
const Z=-10.22,T=.18,F=Z+T/2,OW=2.17,OH=2.70,R=.12,CEIL=4.055;
box(-(5.5+OW)/2,OH/2,Z,5.5-OW,OH,T,'bw_lower',1.04);box((5.5+OW)/2,OH/2,Z,5.5-OW,OH,T,'bw_lower',1.04);
box(0,(OH+4.1)/2,Z,11,4.1-OH,T,'bw_lower',1.04);
zpanel(F+.003,-5.5,5.5,OH,CEIL,'bw_fascia',1.0);
// recess: back face, side reveals, soffit and a strip of floor
zpanel(F-R,-OW,OW,0,OH,'bw_lower',.95);
xpanel(-OW,F-R,F,0,OH,'bw_lower',.84,1);xpanel(OW,F-R,F,0,OH,'bw_lower',.9,-1);
quad([-OW,OH,F],[OW,OH,F],[OW,OH,F-R],[-OW,OH,F-R],'bw_lower',.72);
quad([-OW,.001,F+.04],[OW,.001,F+.04],[OW,.001,F-R],[-OW,.001,F-R],'floor',.9);
// thin shadow line where the soffit meets the fascia
box(0,OH-.004,F+.002,OW*2,.008,.004,'metal',.6);
}
// TRAVEL MOVEMENT corner (right wall, back), rebuilt from the store photos.
// Shelf heights, bay width and every product's size/position are measured from the wide store
// photo; the products themselves are cut out of that photo (JS_SPRITES), so they match exactly.
// PROFESSIONAL zone (right wall, between Travel Movement and Urban Carry), rebuilt from the store photos.
// Units u are the photos' own (pegboard panel = 1.22 u); G scales them into this room.
// Left: the tall black ladder shelf with its products (cut out of the photo, one card per product).
// Right: the PROFESSIONAL wall (perspective-corrected photo: lettering, two pegboards, belts) and
// the two mannequins standing in front of it.
function profZone(){
const W=5.43,G=1.12,ZP=-1.85,Z=u=>ZP+u*G,id=(p,n)=>[p,n];
// ---- wall photo
{const m=SP.pf_wall;if(m)sprite(W-.006,Z((m.u0+m.u1)/2),(m.u1-m.u0)*G/2,(m.v0+.13)*G,(m.v1+.13)*G,'pf_wall',.76,false);}
// ---- tall ladder shelf: 1.23 u wide, 0.45 u deep, left side is a ladder with an angled top
const SW=1.23*G,SD=.45*G,zl=Z(-2.56),zr=zl+SW,xf=W-SD,xb=W-.03,post=(x,z,y0,y1)=>box(x,(y0+y1)/2,z,.04,y1-y0,.04,'metal',1);
const top=3.58*G,LV=[.14,1.11,2.03,2.75].map(v=>v*G);
post(xf,zl,0,top-.25);post(xb,zl,0,top);line3([xf,top-.25,zl],[xf+.18,top,zl],.04,'metal');line3([xf+.18,top,zl],[xb,top,zl],.04,'metal');
post(xf,zr,0,top);post(xb,zr,0,top);box((xf+xb)/2,top,zr,SD,.04,.04,'metal',1);
for(let y=.33;y<top-.3;y+=.33)box((xf+xb)/2,y,zl,SD,.035,.035,'metal',1);
box((xf+xb)/2,.06,zr,SD,.04,.04,'metal',1);
for(const y of LV){box((xf+xb)/2,y-.015,(zl+zr)/2,SD-.02,.03,SW-.03,'birch',1.1);if(y>1)box(xf+.06,y-.034,(zl+zr)/2,.02,.008,SW-.1,'white',1.6)}
for(const [y0,y1] of [[LV[0],LV[1]],[LV[1],LV[2]]]){line3([xb-.01,y0+.03,zl+.03],[xb-.01,y1-.03,zr-.03],.014,'metal');line3([xb-.01,y1-.03,zl+.03],[xb-.01,y0+.03,zr-.03],.014,'metal')}
// products (cards face the viewer like the other shelves); chrome poles under the hanging pieces
const xc=xf+SD*.48;
for(const k of ['pf_bp_black','pf_bp_blue','pf_bp_brown','pf_bag_l','pf_bag_m','pf_bag_r','pf_hang','pf_tags','pf_bp_navy','pf_wallets3','pf_poster','pf_belts','pf_bags4','pf_books','pf_wallets4']){
 const m=SP[k];if(!m)continue;const zc=zl+m.z*G,y0=m.y*G;sprite(xc,zc,m.w*G/2,y0,y0+m.h*G,k,1.05,true);}
for(const [k,lv] of [['pf_bag_r',2],['pf_hang',1],['pf_tags',1]]){const m=SP[k];if(!m)continue;const zc=zl+m.z*G;box(xc+.05,(LV[lv]+m.y*G+.05)/2,zc,.012,m.y*G+.05-LV[lv],.012,'white',.95);box(xc+.05,LV[lv]+.004,zc,.14,.008,.14,'metal',1.3)}
{const m=SP.pf_poster;if(m)box(xc+.06,(LV[1]+m.y*G)/2,zl+m.z*G,.16,m.y*G-LV[1],m.w*G*.8,'metal',.75);}
// ---- mannequins (cut out of the photos; base on the floor, facing the room)
for(const [k,u,d] of [['pf_mq_lanyard',-.9,.55],['pf_mq_suit',-.21,.62]]){const m=SP[k];if(m)sprite(W-d*G,Z(u),m.w*G/2,0,m.h*G,k,1.0,true)}
}
// URBAN CARRY zone (right wall, after Professional), rebuilt from the store photos (same units as
// profZone). Left: the open ladder frame in front of the URBAN CARRY lettering and poster, with one
// shelf and a hanging rail. Right: the big two-bay ladder shelf. Products are cut out of the photos.
function ladderSide(xf,xb,z,top,angled,dir){const post=(x,h)=>box(x,h/2,z,.04,h,.04,'metal',1);
 if(angled){post(xf,top-.28);post(xb,top);line3([xf,top-.28,z],[xf+.2,top,z],.04,'metal');line3([xf+.2,top,z],[xb,top,z],.04,'metal')}
 else{post(xf,top);post(xb,top);box((xf+xb)/2,top,z,xb-xf,.04,.04,'metal',1)}
 for(let y=.3;y<top-.32;y+=.3)box((xf+xb)/2,y,z,xb-xf,.035,.035,'metal',1)}
function urbanZone(){
const W=5.43,G=1.12,Z0=-1.85+1.22*G,Z=u=>Z0+u*G,D=.45*G,xf=W-D,xb=W-.03,xm=(xf+xb)/2;
const card=(k,x,turn=true)=>{const m=SP[k];if(m)sprite(x,Z(m.z0!==undefined?0:m.z),m.w*G/2,m.y*G,(m.y+m.h)*G,k,1.05,turn)};
// ---- wall: lettering + poster (photo, above the frame's shelf)
{const m=SP.uw_wall;if(m)sprite(W-.006,Z((m.u0+m.u1)/2),(m.u1-m.u0)*G/2,m.v0*G,m.v1*G,'uw_wall',.76,false);}
// ---- open ladder frame: two ladder sides, one shelf with LED strip, hanging rail
// its right side is the big shelf's left ladder (shared, as in the store)
const fl=Z(0.0),fr=Z(1.41),ftop=3.4*G,SV=1.62*G,RV=1.36*G;
ladderSide(xf,xb,fl,ftop,true);
box(xm,SV-.015,(fl+fr)/2,D-.02,.03,fr-fl-.03,'birch',1.1);box(xf+.06,SV-.034,(fl+fr)/2,.02,.008,fr-fl-.1,'white',1.6);
box(xf+.12,RV,(fl+fr)/2,.035,.035,fr-fl,'metal',1);
for(const k of ['uf_coffee','uf_duffel','uf_card','uf_bags'])card(k,xm-.02);
for(const k of ['uf_hangL','uf_hangR']){const m=SP[k];if(!m)continue;const zc=Z(m.z);sprite(xf+.12,zc,m.w*G/2,m.y*G,(m.y+m.h)*G,k,1.05,false);
 box(xf+.12,RV-.02,zc,.03,.05,.025,'metal',1);
 if(k==='uf_hangR'){const ty=(m.y+m.h)*G-.02;for(const dz of [-.12,.12])line3([xf+.12,ty,zc+dz*G],[xf+.12,RV-.03,zc],.012,'darkleather')}}
// ---- big two-bay ladder shelf (image 2): 2 x 1.22 u bays, 5 levels, X bracing, LED strips
const sl=Z(1.41),BW=1.22*G,sr=sl+2*BW,top=3.36*G,LV=[.11,.58,1.28,1.94,2.62].map(v=>v*G);
ladderSide(xf,xb,sl,top,true);ladderSide(xf,xb,sr,top,true);
box(xf,top/2,sl+BW,.04,top,.04,'metal',1);box(xb,top/2,sl+BW,.04,top,.04,'metal',1);box(xm,top,sl+BW,D,.04,.04,'metal',1);
for(let b=0;b<2;b++){const zc=sl+BW*(b+.5);for(const y of LV){box(xm,y-.015,zc,D-.02,.03,BW-.03,'birch',1.1);if(y>.5)box(xf+.06,y-.034,zc,.02,.008,BW-.1,'white',1.6)}}
for(const [b,y0,y1] of [[0,LV[1],LV[2]],[1,LV[2],LV[3]]]){const z0=sl+BW*b+.03,z1=sl+BW*(b+1)-.03;line3([xb-.01,y0+.03,z0],[xb-.01,y1-.03,z1],.014,'metal');line3([xb-.01,y1-.03,z0],[xb-.01,y0+.03,z1],.014,'metal')}
for(const [k,m] of Object.entries(SP)){if(!k.startsWith('ub_'))continue;const zc=sl+(m.z-0.0)*G*(2*BW/(2*1.22*G));sprite(xf+D*.48,zc,m.w*G/2,m.y*G,(m.y+m.h)*G,k,1.05,true)}
}
// CRAFT INNOVATIVE: the MagWallet display near the entrance and the chrome sign stand beside it,
// rebuilt from the store photos (white plinth, black tray with light strip, backboard with the
// three wallets, CRAFT INNOVATIVE poster on a two-arm chrome stand). S = room scale.
function craftInnovative(cx,cz){
 const S=1.3,PW=.45*S,PD=.36*S,PH=.92*S,TW=.55*S,TD=.42*S,BW=.49*S,BH=BW*SP.ci_board.aspect,F=cz+PD/2;
 // plinth (white), its front panel lettering is the photo
 box(cx,PH/2,cz,PW,PH,PD,'white',.97);
 photoQuad('ci_plinth',[[cx-PW/2,.004,F+.002],[cx+PW/2,.004,F+.002],[cx+PW/2,PH,F+.002],[cx-PW/2,PH,F+.002]],1.0);
 // tray: thin black band, white light strip, black top slab
 const tz=cz+.02*S,y1=PH+.014*S,y2=y1+.011*S,y3=y2+.028*S;
 box(cx,PH+.007*S,tz,TW-.01*S,.014*S,TD-.01*S,'metal',1);box(cx,(y1+y2)/2,tz,TW-.004*S,.011*S,TD-.004*S,'white',1.35);box(cx,(y2+y3)/2,tz,TW,.028*S,TD,'metal',1.1);
 const tf=tz+TD/2,tb=tz-TD/2+.03*S,ty=y3+.002;
 photoQuad('ci_tray',[[cx-TW/2+.004,ty,tf-.004],[cx+TW/2-.004,ty,tf-.004],[cx+TW/2-.004,ty,tb+.10*S],[cx-TW/2+.004,ty,tb+.10*S]],1.15);
 box(cx,ty-.001,(tb+tb+.10*S)/2,TW-.01,.002,.10*S,'metal',1);
 // backboard with the wallets (photo), a thin black panel behind it
 box(cx,ty+BH/2,tb-.006,BW,BH,.008,'metal',1);
 photoQuad('ci_board',[[cx-BW/2,ty,tb],[cx+BW/2,ty,tb],[cx+BW/2,ty+BH,tb],[cx-BW/2,ty+BH,tb]],1.15);
 // chrome sign stand on the left: rounded base plate, pole, two arms, poster clipped to the top arm
 const sx=cx-.6*S,sz=cz-.03*S,ST=1.5*S,AR=.37*S,ch='white';
 box(sx,.008,sz,.36*S,.016,.30*S,ch,.82);box(sx,.018,sz,.33*S,.006,.27*S,ch,1.05);
 box(sx,ST/2,sz,.03,ST,.03,ch,.9);box(sx,ST-.12*S,sz,.045,.03,.045,ch,.75);
 for(const ay of [ST-.04*S,.88*S]){box(sx+AR/2,ay,sz,AR,.024,.024,ch,.92);box(sx+AR+.006,ay,sz,.03,.03,.03,'metal',1)}
 const pw=.22*S,ph=pw*SP.ci_poster.aspect,px=sx+.03+pw/2+.03*S,ptop=ST-.04*S-.05*S;
 photoQuad('ci_poster',[[px-pw/2,ptop-ph,sz+.006],[px+pw/2,ptop-ph,sz+.006],[px+pw/2,ptop,sz+.006],[px-pw/2,ptop,sz+.006]],1.12);
 for(const dx of [-pw*.3,pw*.3]){box(px+dx,ptop+.025*S,sz+.006,.008,.05*S,.006,ch,.8);box(px+dx,ptop+.002,sz+.006,.025,.02,.012,ch,.95)}
}
// CRAFT HERITAGE: the long walnut table with black U-frame legs, rebuilt from the store photos.
// As in the store it stands lengthways (long side along the room); its display side faces the
// right-hand wall (+x), so from the entrance you see its end. The table top is the straightened
// photo of the top; everything standing on it is cut out of the same photo and set at its own depth.
function craftHeritage(cx,cz){
 const S=1.15,L=2.66*S,DP=.9*S,TH=.75*S,T=.05*S,front=cx+DP/2,back=cx-DP/2,y=TH;
 box(cx,y-T/2,cz,DP,T,L,'wood',.48);                                   // dark walnut slab
 photoQuad('ch_top',[[front,y+.002,cz+L/2],[front,y+.002,cz-L/2],[back,y+.002,cz-L/2],[back,y+.002,cz+L/2]],1.0);
 for(const sz of [-1,1]){const lz=cz+sz*(L/2-.35*S);                     // U-frame legs at both ends
  for(const x of [front-.07*S,back+.07*S])box(x,(y-T)/2,lz,.06*S,y-T,.06*S,'metal',1);
  box(cx,.03*S,lz,DP-.08*S,.06*S,.06*S,'metal',1);box(cx,y-T-.03*S,lz,DP-.08*S,.06*S,.06*S,'metal',.9)}
 // standing products: lower in the photo = nearer the display side; viewer's left is +z
 for(const [k,m] of Object.entries(SP)){if(!k.startsWith('chp_'))continue;
  const t=Math.max(0,Math.min(1,(478-m.yb)/78)),ppm=316/(1+.6*t)/S,w=m.w/ppm,h=m.h/ppm,z=cz-(m.xc-558)/ppm,x=front-.06*S-t*(DP-.16*S);
  sprite(x,z,w/2,y+.002,y+.002+h,k,1.08,Math.PI);
  const Z=u=>z-(u-m.xc)/ppm,H=v=>y+(m.yb-v)/ppm;
  if(k==='chp_0'){box(x-.03,(y+H(300))/2,Z(372),.018,H(300)-y,.018,'metal',1);box(x-.03,y+.01,Z(372),.12,.02,.12,'metal',1)}   // desk-lamp stem
  if(k==='chp_1'){const top=H(277);box(x-.04,(y+top)/2,Z(783),.02,top-y,.02,'white',.9);box(x-.04,y+.008,Z(783),.16,.016,.16,'white',.85);
   for(const sz of [-1,1])line3([x-.04,top,Z(783)],[x-.04,top-.05,Z(783)+sz*.13],.014,'white')}   // chrome hanging stand
 }
}
// GIFTING / MAKE IT PERSONAL table at the back, from the store photos: a live-edge teak table on
// black U-frame legs, facing the entrance; everything on it (gift boxes, Just for You cards, sticker
// pack, MAKE IT PERSONAL and ENGRAVING signs, paper bag, keychain board, wrapping tray) is one
// cut-out from the straight-on photo, standing on the table.
function giftTable(cx,cz){
 const L=1.55,DP=.7,TH=.76,T=.045,front=cz+DP/2,y=TH;
 box(cx,y-T/2,cz,L,T,DP,'wood',.9);box(cx,y-T-.006,cz,L-.04,.012,DP-.04,'wood',.55);
 for(const sx of [-1,1]){const lx=cx+sx*(L/2-.22);
  for(const z of [front-.06,cz-DP/2+.06])box(lx,(y-T)/2,z,.05,y-T,.05,'metal',1);
  box(lx,.025,cz,.05,.05,DP-.08,'metal',1);box(lx,y-T-.025,cz,.05,.05,DP-.08,'metal',.9)}
 const m=SP.gt_items;if(m){const w=1.58,h=w*m.aspect,zc=cz-.12;
  photoQuad('gt_items',[[cx-w/2+.02,y,zc],[cx+w/2+.02,y,zc],[cx+w/2+.02,y+h,zc],[cx-w/2+.02,y+h,zc]],1.08)}
}
// Wallet counter behind the gifting table: light-wood top on a black frame with the black
// JACK STUDIO cloth hanging in front (photo), dressed like the wallet display photo - two linen
// trays (one raised on a black wire stand), black step racks of wallets, a chrome keychain spinner
// and a small easel card.
function walletCounter(cx,cz){
 const L=1.5,DP=.66,H=.9,front=cz+DP/2,back=cz-DP/2,y=H+.03,K='metal',lin='birch';
 box(cx,H+.015,cz,L+.04,.03,DP+.04,'birch',1.1);
 for(const sx of [-1,1])for(const z of [front-.02,back+.02])box(cx+sx*(L/2-.02),H/2,z,.04,H,.04,'metal',1);
 box(cx,H-.02,back+.02,L,.04,.04,'metal',1);box(cx,.03,back+.02,L,.04,.04,'metal',1);
 for(const sx of [-1,1])box(cx+sx*(L/2-.02),H/2,cz,.03,H-.05,DP-.04,'metal',.55);
 photoQuad('ct_front',[[cx-L/2,.0,front+.004],[cx+L/2,.0,front+.004],[cx+L/2,H,front+.004],[cx-L/2,H,front+.004]],.72);
 const tray=(x,yb,z,w,d)=>{box(x,yb+.004,z,w,.008,d,lin,.86);for(const [dx,dz,ww,dd] of [[0,d/2,w,.012],[0,-d/2,w,.012],[w/2,0,.012,d],[-w/2,0,.012,d]])box(x+dx,yb+.025,z+dz,ww,.05,dd,lin,.92)};
 const wallet=(x,yb,z,w,d,tex='darkleather')=>box(x,yb+.009,z,w,.018,d,tex,1);
 // front tray (on the counter) with wallets laid out in two rows
 const t1x=cx-.18,t1z=cz+.1;tray(t1x,y,t1z,.62,.3);
 for(let i=0;i<4;i++)wallet(t1x-.22+i*.12,y+.008,t1z-.07,.1,.12,i===1?'brownleather':'darkleather');
 for(let i=0;i<3;i++)wallet(t1x-.17+i*.16,y+.008,t1z+.07,.13,.1,i===1?'brownleather':'darkleather');
 // raised tray on a black wire stand, behind
 const t2x=cx-.05,t2z=cz-.13,t2y=y+.13;
 for(let i=0;i<5;i++)box(t2x-.26+i*.13,y+.065,t2z,.008,.13,.24,'metal',1);
 box(t2x,y+.004,t2z,.6,.008,.24,'metal',.9);tray(t2x,t2y,t2z,.62,.26);
 wallet(t2x+.12,t2y+.008,t2z+.03,.12,.09,'brownleather');wallet(t2x+.2,t2y+.008,t2z-.02,.12,.09,'darkleather');
 // keychain spinner + easel card on the raised tray
 const sx=t2x-.2,sz=t2z;box(sx,t2y+.15,sz,.01,.3,.01,'white',.95);
 for(let i=0;i<6;i++){const a=i/6*Math.PI*2;line3([sx,t2y+.27,sz],[sx+Math.cos(a)*.07,t2y+.25,sz+Math.sin(a)*.07],.006,'white');
  box(sx+Math.cos(a)*.07,t2y+.2,sz+Math.sin(a)*.07,.03,.08,.015,i%2?'darkleather':'brownleather',1)}
 box(t2x-.06,t2y+.07,t2z+.04,.08,.11,.006,'brownleather',1.15);line3([t2x-.06,t2y,t2z+.08],[t2x-.06,t2y+.12,t2z+.04],.006,'wood');
 // black step racks of standing wallets (left and right ends)
 const rack=(x,z,n,dir)=>{for(let i=0;i<n;i++){const zz=z-i*.05*dir,yy=y+.04+i*.025;box(x,yy+.05,zz,.11,.1,.016,'darkleather',.55-.02*i);box(x,yy,zz,.12,.004,.03,'metal',1)}
  line3([x-.06,y,z+.02*dir],[x-.06,y+.04+n*.025+.1,z-(n-1)*.05*dir],.006,'metal');line3([x+.06,y,z+.02*dir],[x+.06,y+.04+n*.025+.1,z-(n-1)*.05*dir],.006,'metal')};
 rack(cx-.6,cz+.18,5,1);rack(cx+.48,cz+.2,6,1);
 // price tags
 for(const [x,z] of [[cx-.6,cz+.25],[cx+.48,cz+.27],[t1x,t1z+.16]])box(x,y+.03,z,.08,.05,.006,'white',1.2);
}
// ESSENTIAL (left wall, by the entrance), from the store photo: lettering, MADE FOR EVERYDAY EASE
// poster, pegboard with belts and wallets (wall photo, mannequin painted out), the bust mannequin
// standing in front, and the tall black ladder shelf with its two rows of bags (photo cut-outs).
// Photo units: 350 px = 1 u, scaled by G; viewer faces -x, so photo-right is -z.
function essentialZone(zL){
 const G=1.27,X=-5.43,Z=u=>zL-u*G,P=350;
 // wall graphics (ESSENTIAL lettering, poster, pegboard with belts) as separate cut-outs, spread along the bay
 const SH=-2.3,EU=x=>Z(x/P+SH),EV=y=>(3.0428-y/P)*G;
 for(const [k,sh] of [['lw_esstext',.9],['lw_poster',1],['lw_peg',1]]){const q=SP[k];if(!q)continue;const [x0,y0,x1,y1]=q.px;photoQuad(k,[[X+.012,EV(y1),EU(x0)],[X+.012,EV(y1),EU(x1)],[X+.012,EV(y0),EU(x1)],[X+.012,EV(y0),EU(x0)]],sh)}
 const m=SP.es_mq;if(m){const h=m.ph/P*G;sprite(X+.6,Z(-.43),m.pw/P*G/2,0,h,'es_mq',1.0,true)}
 // tall ladder shelf: ladder sides at both ends, four birch shelves, LED strips under the top two
 const xf=X+.5*G,xb=X+.03,xm=(xf+xb)/2,zl=Z(1.6),zr=Z(2.64),top=3.16*G,LV=[.13,.97,1.84,2.54].map(v=>v*G);
 for(const z of [zl,zr]){box(xf,top/2,z,.04,top,.04,'metal',1);box(xb,top/2,z,.04,top,.04,'metal',1);box(xm,top,z,xb-xf,.04,.04,'metal',1);
  for(let y=.3;y<top-.2;y+=.3)box(xm,y,z,xb-xf,.035,.035,'metal',1)}
 for(const y of LV){box(xm,y-.015,(zl+zr)/2,xb-xf-.02,.03,zl-zr-.03,'birch',1.1);if(y>2)box(xf+.06,y-.034,(zl+zr)/2,.02,.008,zl-zr-.1,'white',1.6)}
 box(xm,LV[1]+.45,(zl+zr)/2,.03,.03,zl-zr,'metal',1);line3([xb-.01,LV[0]+.03,zl-.03],[xb-.01,LV[1]-.03,zr+.03],.014,'metal');line3([xb-.01,LV[1]-.03,zl-.03],[xb-.01,LV[0]+.03,zr+.03],.014,'metal');
 for(const [k,lv] of [['es_top',2],['es_mid',1]]){const q=SP[k];if(!q)continue;const ww=q.pw/P*G*1.35,hh=q.ph/P*G*1.35;sprite(xf+.16,(zl+zr)/2,ww/2,LV[lv],LV[lv]+hh,k,1.05,true)}
}
// Left wall from the entrance, built as real pieces (no photo rectangles):
// 1) BRAND PROMISE: wall lettering and the acrylic promise panel as cut-out graphics on the wall,
//    three wooden shelves in 3D with their products (photo cut-outs) standing on them, QR sign.
// 2) OUR STORY: wood-panelled wall under the staircase (3D stair mass), OUR STORY plaque, felt
//    panel, 185,249+ CUSTOMERS lettering, and three drawer units in 3D (no mannequins).
let LWX=-5.43;
function wallCard(k,zl,zr,yb,yt,sh=.86,off=.006){photoQuad(k,[[LWX+off,yb,zl],[LWX+off,yb,zr],[LWX+off,yt,zr],[LWX+off,yt,zl]],sh)}
function brandWalls(){
 LWX=-5.43+OS.SW;
 // ---- brand promise, laid out like the straight-on store photo (531 px = 1 m; middle shelf top 0.95 m)
 // raised black lettering (with a soft shadow), a 3D black OUR BRAND PROMISE plate, the clear acrylic
 // promise panel on four chrome stand-offs, QR card, three wooden floating shelves with the products.
 const P=450,z0=4.3,Z=x=>z0-(x-345)/P,Y=y=>.95+(1185-y)/P;
 const card=(k,off,sh)=>{const m=SP[k];if(!m)return;const [x0,y0,x1,y1]=m.px;wallCard(k,Z(x0),Z(x1),Y(y1),Y(y0),sh,off)};
 const shadow=(k)=>{const m=SP[k];if(!m)return;const [x0,y0,x1,y1]=m.px,d=.006;photoQuad(k,[[LWX+.004,Y(y1)-d,Z(x0)-d*.5],[LWX+.004,Y(y1)-d,Z(x1)-d*.5],[LWX+.004,Y(y0)-d,Z(x1)-d*.5],[LWX+.004,Y(y0)-d,Z(x0)-d*.5]],.62)};
 shadow('bw_logo');card('bw_logo',.012,1.0);card('bw_tag',.008,1.0);
 {const [x0,y0,x1,y1]=[760,328,1216,394];box(LWX+.012,(Y(y0)+Y(y1))/2,(Z(x0)+Z(x1))/2,.02,Y(y0)-Y(y1),Z(x0)-Z(x1),'metal',.55);
  card('bw_platetext',.024,1.05);for(const x of [770,1206])for(const y of [338,384])box(LWX+.024,Y(y),Z(x),.006,.008,.008,'white',.8)}
 {const [x0,y0,x1,y1]=[445,442,1560,852],zc=(Z(x0)+Z(x1))/2,yc=(Y(y0)+Y(y1))/2,w=Z(x0)-Z(x1),h=Y(y0)-Y(y1),PX=LWX+.045;
  // acrylic: only its polished edges and the stand-offs show; the print sits on the sheet
  for(const [dy,hh,dz,ww] of [[h/2,.006,0,w],[-h/2,.006,0,w],[0,h,w/2,.006],[0,h,-w/2,.006]])box(PX,yc+dy,zc+dz,.008,hh+.006,ww+.006,'glass',1.25);
  for(const x of [462,1532])for(const y of [452,842]){box(LWX+.024,Y(y),Z(x),.045,.022,.022,'white',.95);box(PX+.006,Y(y),Z(x),.006,.03,.03,'white',1.1)}
  card('bw_promise',.049,1.0)}
 {const [x0,y0,x1,y1]=[745,900,843,1040];box(LWX+.008,(Y(y0)+Y(y1))/2,(Z(x0)+Z(x1))/2,.006,Y(y0)-Y(y1),Z(x0)-Z(x1),'white',1.05);card('bw_qr',.012,1.02)}
 for(const [x0,x1,top] of [[345,612,1090],[657,1210,1188],[1230,1637,1010]]){const zc=(Z(x0)+Z(x1))/2,y=Y(top),w=Z(x0)-Z(x1);
  box(LWX+.13,y-.018,zc,.25,.036,w,'wood',1.08);box(LWX+.255,y-.018,zc,.004,.036,w,'wood',.82)}
 for(const [k,top] of [['bw_s1',1090],['bw_s2',1188],['bw_s3',1010]]){const m=SP[k];if(!m)continue;const [x0,y0,x1,y1]=m.px;
  sprite(LWX+.12,(Z(x0)+Z(x1))/2,(x1-x0)/P/2,Y(Math.max(y1,top)),Y(Math.max(y1,top))+(y1-y0)/P,k,1.04,Math.PI)}
 LWX=-5.43;
 { // ---- OUR STORY, built from the store photos (real-size metres; m = distance along the wall from
 // the wood panel's entrance-side edge). Under-stair wall with vertical wood planks, the white
 // staircase sloping over it, frosted acrylic OUR STORY plaque on stand-offs, 185,249+ CUSTOMERS
 // lettering, a 4x3 acoustic felt panel with alternating grooves, and the three drawer units.
 const {zs,W,m2,SW,d}=OS,ze=zs-W,Z=m=>zs-m,X=LWX;
 // wood planks: 0.32 m wide, vertical grain, varied by flipping, thin dark joints
 const PW=W/10,PH=.62;
 for(let i=0;i<10;i++){const m0=i*PW,m1=m0+PW,top0=d(m0),top1=d(m1),fl=i%2,vf=(i*7)%3;
  for(let y=0,j=0;y<top1-1e-3;y+=PH,j++){const yA=Math.min(y+PH,top0),yB=Math.min(y+PH,top1);if(y>=top0&&y>=top1)continue;
   const BL=[X+.012,y,Z(fl?m1:m0)],BR=[X+.012,y,Z(fl?m0:m1)],TR=[X+.012,fl?yA:yB,Z(fl?m0:m1)],TL=[X+.012,fl?yB:yA,Z(fl?m1:m0)];
   photoQuad('os_plank',(j+vf)%2?[TL,TR,BR,BL].map((p,k)=>[p[0],[BL,BR,TR,TL][k][1],p[2]]):[BL,BR,TR,TL],.92)}
  if(i>0)box(X+.013,d(m0)/2,Z(m0),.002,d(m0),.005,'wood',.42)}
 // the recess: sloped white stair underside across its depth, floor, end walls, dark storage at the low end
 // the stair: a white mass standing out SW from the wood, flush with the Brand Promise wall; its sloped
 // underside shows along the top of the wood; above the slope its face runs up to the ceiling
 for(let k=0;k<24;k++){const a=m2+(W-m2)*k/24,b=m2+(W-m2)*(k+1)/24;quad([X,d(a),Z(a)],[X,d(b),Z(b)],[X+SW,d(b),Z(b)],[X+SW,d(a),Z(a)],'white',.8)}
 quad([X+SW,d(m2),Z(m2)],[X+SW,d(W),Z(W)],[X+SW,4.06,Z(W)],[X+SW,4.06,Z(m2)],'wall',.865);
 quad([X,d(W),Z(W)],[X+SW,d(W),Z(W)],[X+SW,4.06,Z(W)],[X,4.06,Z(W)],'wall',.78);

 // OUR STORY: frosted acrylic, 0.64 x 0.66 m, 2 cm off the panel on four chrome stand-offs
 {const m0=1.12,m1=1.76,y0=1.15,y1=1.81,PX=X+.035;box(PX,(y0+y1)/2,Z((m0+m1)/2),.006,y1-y0,m1-m0,'white',.86);
  for(const m of [m0+.03,m1-.03])for(const y of [y0+.03,y1-.03]){box(X+.024,y,Z(m),.024,.018,.018,'white',1.0);box(PX+.005,y,Z(m),.006,.024,.024,'white',1.15)}
  photoQuad('os_plaque',[[PX+.004,y0,Z(m0)],[PX+.004,y0,Z(m1)],[PX+.004,y1,Z(m1)],[PX+.004,y1,Z(m0)]],1.0)}
 // WE'VE SERVED 185,249+ CUSTOMERS lettering
 {const q=SP.os_cust;if(q){const w=.62,h=w*q.aspect,mc=2.5,y0=2.06;photoQuad('os_cust',[[X+.016,y0,Z(mc-w/2)],[X+.016,y0,Z(mc+w/2)],[X+.016,y0+h,Z(mc+w/2)],[X+.016,y0+h,Z(mc-w/2)]],1.0)}}
 // acoustic felt panel: 4 x 3 tiles of 0.30 m, grooves alternate horizontal / vertical
 {const m0=1.9,y0=1.15,T=.3,F=X+.03;
  for(let r=0;r<3;r++)for(let c=0;c<4;c++){const mc=m0+c*T+T/2,yc=y0+(2-r)*T+T/2,horiz=(r+c)%2===0,zc=Z(mc);
   box(X+.02,yc,zc,.016,T-.004,T-.004,'white',.78);
   for(let k=0;k<9;k++){const o=-T/2+.012+k*(T-.024)/8;
    if(horiz)box(F,yc+o,zc,.01,.021,T-.008,'white',.9);else box(F,yc,zc-o,.01,T-.008,.021,'white',.86)}}}
 // drawer units: handle-less birch fronts with shadow gaps, black steel frames, mesh side, castors
 const D=.5,XF=X+.03+D,H=.9;
 const front=(m0,m1,y0,y1)=>{box(XF-.008,(y0+y1)/2,Z((m0+m1)/2),.016,y1-y0-.012,m1-m0-.012,'birch',1.08);box(XF-.017,y1-.004,Z((m0+m1)/2),.002,.008,m1-m0-.01,'metal',.55)};
 const castor=(m,xx)=>{box(xx,.045,Z(m),.035,.05,.018,'metal',.7);box(xx,.022,Z(m),.045,.045,.02,'metal',.45)};
 const top=(m0,m1)=>box(X+.03+D/2,H-.012,Z((m0+m1)/2),D+.01,.024,m1-m0,'birch',1.16);
 // 1) cabinet: two drawers over a pair of doors, solid to the floor
 {const m0=0,m1=.8;box(X+.03+D/2,(H+.08)/2,Z((m0+m1)/2),D-.02,H-.08,m1-m0,'birch',.98);top(m0,m1);
  front(m0,m1,.70,.86);front(m0,m1,.48,.70);front(m0,(m0+m1)/2,.08,.48);front((m0+m1)/2,m1,.08,.48);
  for(const m of [m0+.06,m1-.06])for(const xx of [X+.1,XF-.06])castor(m,xx)}
 // 2) & 3) desk units on black steel frames, open underneath
 for(const [m0,m1,fr] of [[.8,1.75,[[.66,.86],[.40,.66]]],[1.79,2.89,[[.70,.86],[.42,.68]]]]){const zc=Z((m0+m1)/2);
  box(X+.03+D/2,.63,zc,D-.04,.46,m1-m0-.04,'birch',.95);top(m0,m1);for(const [a,b] of fr)front(m0,m1,a,b);
  for(const m of [m0+.015,m1-.015])for(const xx of [X+.05,XF-.02]){box(xx,.45,Z(m),.03,.9,.03,'metal',1);castor(m,xx)}
  for(const m of [m0+.015,m1-.015])box(X+.03+D/2,.09,Z(m),D-.03,.025,.025,'metal',1);
  box(X+.05,.25,zc,.012,.3,m1-m0-.03,'metal',.5)}
 // mesh side panel on the right-hand unit
 box(X+.03+D/2,.48,Z(2.89-.012),D-.06,.78,.006,'metal',.45);

 }
}
function travelZone(){
const W=5.43,FR=W-.45;
const K=4.055/2.78,ZA=-10.06;XF=p=>[W+(p[0]-W)*K,p[1]*K,ZA+(p[2]-ZA)*K];
const BW=1.083,frames=[ZA,ZA+BW,ZA+2*BW];
const tops=[[2.55,2.4],[2.71,2.56],[2.55,2.4]];          // middle frame tallest, as in the photo
const post=(x,z,h)=>box(x,h/2,z,.035,h,.035,'metal',1);
frames.forEach((z,i)=>{const [hf,hb]=tops[i];post(FR,z,hf);post(W-.02,z,hb);line3([FR,hf,z],[W-.02,hb,z],.03,'metal');
 for(let y=.3;y<=2.42;y+=.27)box((FR+W)/2,y,z,.43,.025,.025,'metal',1)});
const cx=(FR+W)/2,DECK=.05,SH={A:.90,B:1.64,C:2.228};
for(let bay=0;bay<2;bay++){const z0=frames[bay],zc=z0+BW/2,len=BW-.04;
 box(cx,DECK,zc,.48,.04,len,'birch',1.05);box(cx+.22,.025,zc,.03,.05,len,'birch',.8);
 for(const y of [SH.A,SH.B,SH.C]){box(cx-.01,y-.014,zc,.48,.028,len,'birch',1.1);box(FR+.07,y-.036,zc,.02,.01,len-.08,'white',1.6)}
 line3([W-.03,SH.A+.04,z0+.03],[W-.03,SH.B-.06,z0+BW-.03],.012,'metal');line3([W-.03,SH.B-.06,z0+.03],[W-.03,SH.A+.04,z0+BW-.03],.012,'metal');
}
// deck: cabin cases in the same order as the photo
const cz=t=>frames[0]+t*BW*2,dy=DECK+.02;
[['white',.135],['lav',.365],['grey',.635],['orange',.865]].forEach(([c,f])=>suitcase(cx-.17,dy,cz(f),c));
// products: straight-on photo cut-outs, placed at their measured positions (metres from the
// left ladder frame). Items standing on a shelf are seated on it; raised/hanging ones keep their height.
for(const [k,m] of Object.entries(SP)){if(!m.shelf||k==='a_left2'||k==='a_left1'||k.startsWith('u'))continue;
 const zc=frames[0]+(m.z[0]+m.z[1])/2,hw=(m.z[1]-m.z[0])/2,h=m.y[1]-m.y[0],gap=m.y[0]-SH[m.shelf];
 const y0=Math.abs(gap)<.06?SH[m.shelf]:m.y[0],crate=k==='b_crate'||k==='b_olivecrate';
 sprite(crate?cx-.05:cx-.02-m.order*.002,zc,hw,y0,y0+h,k,1.05,!crate);
 if(k==='b_crate')box(cx+.15,y0+.15,zc,.2,.3,hw*1.9,'crate',.92);
 if(k==='b_olivecrate')box(cx+.15,y0+.14,zc,.2,.28,hw*1.8,'crate',.92);
}
// the three Daily Sling Bags on the right of the left bay
{const zb=frames[0];box(cx+.03,SH.A+.035,zb+.68,.10,.07,.17,'metal',.8);
 // one whole product photo per bag (front-facing card), sized from the photo: 28 cm wide
 const sb=(x,y,z,k)=>{const m=SP['sling_'+k];if(m)sprite(x,z,m.w/2,y,y+m.h,'sling_'+k,1.05,true)};
 // black bag hangs on the chrome stand: its strap goes up from both tabs and over the stand's top bar
 {const zc=zb+.84,top=SH.A+.506,m=SP.sling_black,bx=cx-.01,y0=top-.05-m.h,yt=y0+m.h-.012,id=(p,n)=>[p,n],K=[.12,.11,.10];
  sprite(bx,zc,m.w/2,y0,y0+m.h,'sling_black',1.05,false);
  const L=[bx+.004,yt,zc-.104],R=[bx+.004,yt,zc+.098],TL=[cx+.04,top+.012,zc-.014],TR=[cx+.04,top+.012,zc+.014];
  const st=(a,b)=>{const d=b.map((v,i)=>v-a[i]);bar(id,a,b,crs(d,[1,0,0]),.024,.004,K,LEA)};
  st(L,TL);st(TL,TR);st(TR,R);
  const mid=L.map((v,i)=>v+(TL[i]-v)*.45),d=n3(TL.map((v,i)=>v-L[i])),a=mid.map((v,i)=>v-d[i]*.013),b=mid.map((v,i)=>v+d[i]*.013);
  bar(id,a,b,crs(d,[1,0,0]),.032,.009,SILVER,MET);bar(id,a.map((v,i)=>v+d[i]*.003),b.map((v,i)=>v-d[i]*.003),crs(d,[1,0,0]),.034,.0095,K,LEA);}sb(cx+.03,SH.A+.07,zb+.68,'brown');sb(cx-.075,SH.A+.002,zb+.85,'dark');}
// the three hobo shoulder bags on the left of the left bay: one whole product photo each
{const zb=frames[0],id=(p,n)=>[p,n];
 box(cx+.045,SH.A+.035,zb+.405,.10,.07,.17,'metal',.8);
 const hb=(x,y,z,k,turn)=>{const m=SP['hobo_'+k];if(m)sprite(x,z,m.w/2,y,y+m.h,'hobo_'+k,1.05,turn);return m};
 hb(cx+.045,SH.A+.07,zb+.405,'brown',true);hb(cx-.075,SH.A+.002,zb+.225,'dark',true);
 // black one hangs on the stand: strap from both rings up and over the top bar
 const zc=zb+.17,top=SH.A+.486,m=SP.hobo_black;if(m){const bx=cx-.01,y0=top-.06-m.h;hb(bx,y0,zc,'metal',false);
  const rp=m.ring.map(([u,v])=>[bx+.004,y0+m.h*(1-v),zc-m.w/2+u*m.w]),TL=[cx+.04,top+.012,zc-.016],TR=[cx+.04,top+.012,zc+.016],K=[.12,.11,.10];
  const st=(a,b)=>{const d=b.map((v,i)=>v-a[i]);bar(id,a,b,crs(d,[1,0,0]),.03,.004,K,LEA)};st(rp[0],TL);st(TL,TR);st(TR,rp[1]);
  const mid=rp[1].map((v,i)=>v+(TR[i]-v)*.5),d=n3(TR.map((v,i)=>v-rp[1][i])),a=mid.map((v,i)=>v-d[i]*.014),b=mid.map((v,i)=>v+d[i]*.014);
  bar(id,a,b,crs(d,[1,0,0]),.038,.009,SILVER,MET);bar(id,a.map((v,i)=>v+d[i]*.003),b.map((v,i)=>v-d[i]*.003),crs(d,[1,0,0]),.04,.0095,K,LEA);}}
// chrome display stands behind the hanging bags (thin in the photo, so rebuilt in 3D)
for(const [z,t0] of [[.17,1.22],[.84,1.24],[1.24,1.2],[1.77,1.16]]){const top=t0-.734+SH.A;const zz=frames[0]+z;
 box(cx+.05,SH.A+.006,zz,.16,.012,.16,'metal',1.4);box(cx+.05,(SH.A+top)/2,zz,.014,top-SH.A,.014,'white',.9);box(cx+.05,top,zz,.014,.014,.2,'white',.9)}
// TRAVEL MOVEMENT wall: rectified photo of the lettering, cork map and pegboard
const ZP=frames[2]+.14,Y0=.36;
xpanel(W-.005,ZP-.11,ZP+1.29,Y0+1.0,Y0+2.2,'tm_upper',.76,1);
xpanel(W-.005,ZP-.11,ZP+1.29,Y0-.33,Y0+1.0,'tm_lower',.76,1);
suitcase(W-.31,0,ZP+.2,'orange');suitcase(W-.31,0,ZP+.72,'orange');
XF=null;
}
// ---------------------------------------------------------------------------------------------
// 29-inch UNBREAKABLE front-opening case, modelled in 3D (79 x 50 x 31 cm) and drawn with real
// lighting: rounded polycarbonate shell, moulded horizontal ribs, front lid standing proud on a
// black zip, expander zip round the waist, black wheel housings with 4 double spinner wheels,
// top carry handle, side feet and the logo badge. Only the white sticker print is a decal.
// ---------------------------------------------------------------------------------------------
const MV=[];   // lit mesh: pos3 normal3 colour3 rib2(v, strength) uv2  -> 13 floats per vertex
const LUGCOL={white:[.86,.85,.83],lav:[.74,.74,.80],grey:[.40,.42,.43],orange:[.80,.50,.37]};
function mpush(p,n,c,rib,uv){if(XF)p=XF(p);MV.push(p[0],p[1],p[2],n[0],n[1],n[2],c[0],c[1],c[2],rib[0],rib[1],uv[0],uv[1])}
function arcAxis(h,r,mid,m=5){const a=[];for(let k=m;k>0;k--)a.push(-(h-r)-r*Math.tan(k/m*Math.PI/4));
 for(let k=0;k<=mid;k++)a.push(-(h-r)+2*(h-r)*k/mid);for(let k=1;k<=m;k++)a.push((h-r)+r*Math.tan(k/m*Math.PI/4));return a}
// rounded box in case-local coords (u across, v up, w toward the viewer); toW maps local -> world
function rbox(toW,c,h,r0,col,ribF,mids=[6,14,4]){
 // per-axis corner radius (an edge can't be rounder than the slab is thick)
 const r=h.map(v=>Math.min(r0,v*.98));
 // flat faces need no subdivision (rib shading is per pixel); corner segments scale with the radius
 const seg=v=>v>=.02?4:v>=.008?2:1,ax=[0,1,2].map(i=>arcAxis(h[i],r[i],1,seg(r[i])));
 const map=q=>{const inner=q.map((v,i)=>Math.max(-(h[i]-r[i]),Math.min(h[i]-r[i],v))),e=q.map((v,i)=>(v-inner[i])/r[i]),l=Math.hypot(...e)||1,u=e.map(v=>v/l);
  const nn=u.map((v,i)=>v/r[i]),nl=Math.hypot(...nn)||1;return [inner.map((v,i)=>c[i]+v+u[i]*r[i]),nn.map(v=>v/nl)]};
 for(let i=0;i<3;i++)for(const sg of [-1,1]){const j=(i+1)%3,k=(i+2)%3,A=ax[j],B=ax[k],G=[];
  for(const a of A){const row=[];for(const b of B){const q=[0,0,0];q[i]=sg*h[i];q[j]=a;q[k]=b;row.push(map(q))}G.push(row)}
  for(let x=0;x<A.length-1;x++)for(let y=0;y<B.length-1;y++){const t=[G[x][y],G[x+1][y],G[x+1][y+1],G[x][y+1]];
   for(const idx of [0,1,2,0,2,3]){const [pp,nn]=t[idx];const W=toW(pp,nn);mpush(W[0],W[1],col,ribF?ribF(pp,nn):[0,0],[-1,-1])}}}}
function cylU(toW,c,rad,len,col,seg=10){ // cylinder with its axle across the case (local u)
 for(let i=0;i<seg;i++){const a0=i/seg*Math.PI*2,a1=(i+1)/seg*Math.PI*2,P=(a,du)=>[c[0]+du,c[1]+Math.sin(a)*rad,c[2]+Math.cos(a)*rad],N=a=>[0,Math.sin(a),Math.cos(a)];
  const q=[[P(a0,-len/2),N(a0)],[P(a1,-len/2),N(a1)],[P(a1,len/2),N(a1)],[P(a0,len/2),N(a0)]];
  for(const idx of [0,1,2,0,2,3]){const W=toW(q[idx][0],q[idx][1]);mpush(W[0],W[1],col,[0,0],[-1,-1])}
  for(const du of [-len/2,len/2]){const hub=du>0?[.62,.63,.65]:[.55,.56,.58],cc=[c[0]+du,c[1],c[2]];
   const pts=[[cc,hub],[P(a0,du),col],[P(a1,du),col]];if(true){const ri=rad*.45;pts[0]=[cc,hub]}
   for(const [pp,cl] of [[cc,hub],[P(a0,du),col],[P(a1,du),col]]){const W=toW(pp,[Math.sign(du),0,0]);mpush(W[0],W[1],cl,[0,0],[-1,-1])}}}}
function suitcase(x,y,z,col,S=1){
 const W=.455*S,D=.28*S,H=.71*S,WH=.078*S,R=.034*S,bx=x+D/2,C=LUGCOL[col]||LUGCOL.orange,K=[.06,.06,.065],dk=[.12,.12,.13];
 const toW=(p,n)=>[[bx-p[2],y+p[1],z+p[0]],[-n[2],n[1],n[0]]];
 const LT=.03*S,FRONT=D/2,bodyF=FRONT-LT-.004*S;          // lid thickness, body front plane
 const ribs=(top,bot,edge)=>(p,n)=>{if(Math.abs(n[1])>.55)return [0,0];const v=p[1];
  const s=Math.min(1,Math.max(0,(v-bot)/.012),Math.max(0,(top-v)/.012));const e=edge?Math.min(1,Math.max(0,(edge-Math.abs(p[0]))/.008)):1;return [v,s*e]};
 // back shell + base (ribbed between a plain top band and a plain base band)
 const bH=(H-WH)/2,bC=WH+bH,bD=(bodyF+D/2)/2,bZc=(bodyF-D/2)/2;
 rbox(toW,[0,bC,bZc],[W/2,bH,bD],R,C,ribs(H-.045*S,WH+.055*S),[6,16,6]);
 // expander zip: black band round the waist of the shell
 rbox(toW,[0,bC,-.035*S],[W/2+.0025*S,bH+.0025*S,.006*S],R+.0025*S,K,null,[3,4,1]);
 // lid zip (black rubber rim) and the front lid itself
 const LW=W/2-.004*S,L0=.098*S,L1=H-.004*S,lC=(L0+L1)/2,lH=(L1-L0)/2;
 rbox(toW,[0,lC,bodyF+.006*S],[LW+.003*S,lH+.003*S,.008*S],R*.9,K,null,[3,4,1]);
 rbox(toW,[0,lC,FRONT-LT/2],[LW,lH,LT/2],R*.85,C,ribs(L1-.03*S,L0+.022*S,LW-.012*S),[8,18,2]);
 // logo badge (top right of the lid) and the sticker print decal
 rbox(toW,[LW-.075*S,L1-.12*S,FRONT+.002*S],[.016*S,.016*S,.003*S],.004*S,C.map(v=>v*.82),null,[1,1,1]);
 {const z0=FRONT+.0012*S,u0=-LW,u1=LW,v0=L0,v1=L1,c=[1,1,1],q=[[u0,v0,0,1],[u1,v0,1,1],[u1,v1,1,0],[u0,v1,0,0]];
  for(const idx of [0,1,2,0,2,3]){const [u,v,tu,tv]=q[idx],Wd=toW([u,v,z0],[0,0,1]);mpush(Wd[0],Wd[1],c,[0,0],[tu,tv])}}
 // base: front grip recess, black wheel housings, double spinner wheels
 rbox(toW,[0,WH+.03*S,bodyF+.004*S],[.075*S,.012*S,.006*S],.004*S,dk,null,[1,1,1]);
 for(const su of [-1,1])for(const sw of [-1,1]){const hu=su*(W/2-.047*S),hw=sw*(D/2-.055*S);
  rbox(toW,[hu,WH-.002*S,hw],[.042*S,.016*S,.045*S],.012*S,K,null,[2,1,2]);
  rbox(toW,[hu,.052*S,hw],[.016*S,.012*S,.016*S],.005*S,dk,null,[1,1,1]);
  for(const du of [-.0125,.0125])cylU(toW,[hu+du*S,.027*S,hw],.027*S,.016*S,[.08,.08,.09])}
 // top carry handle (towards the back) and the side feet
 rbox(toW,[0,H+.006*S,-D/2+.075*S],[.085*S,.01*S,.032*S],.008*S,K,null,[2,1,2]);
 for(const v of [.17,.6])for(const w of [-D/2+.06*S,bodyF-.05*S])rbox(toW,[-W/2-.004*S,v*S,w],[.006*S,.018*S,.012*S],.004*S,K,null,[1,1,1]);
}
// ---------------------------------------------------------------------------------------------
// Daily Sling Bag, modelled from the product photos (approx. 27 x 16 x 11.5 cm): rounded body,
// front flap with the diagonal lower edge wrapping over the top, diagonal zip pocket with metal
// teeth and puller, round JACK STUDIO badge, side zips with pullers, strap tabs with D-rings,
// adjustable strap with buckle. Colour per bag; leather grain and polished metal are shaded.
// ---------------------------------------------------------------------------------------------
const LEA=[0,-1],MET=[0,-2],SILVER=[.80,.81,.83];
const BAGCOL={black:[.16,.145,.13],brown:[.40,.24,.13],dark:[.29,.255,.235]};
function n3(a){const l=Math.hypot(...a)||1;return a.map(v=>v/l)}
function crs(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}
function prism(toW,ring,off,col,mat){const top=ring.map(p=>p.map((v,i)=>v+off[i])),all=ring.concat(top),C=[0,1,2].map(i=>all.reduce((s,p)=>s+p[i],0)/all.length);
 const tri=(a,b,c)=>{let n=n3(crs(b.map((v,i)=>v-a[i]),c.map((v,i)=>v-a[i])));const m=[0,1,2].map(i=>(a[i]+b[i]+c[i])/3-C[i]);if(n[0]*m[0]+n[1]*m[1]+n[2]*m[2]<0)n=n.map(v=>-v);for(const q of [a,b,c]){const W=toW(q,n);mpush(W[0],W[1],col,mat,[-1,-1])}};
 for(let i=1;i<ring.length-1;i++){tri(ring[0],ring[i],ring[i+1]);tri(top[0],top[i],top[i+1])}
 for(let i=0;i<ring.length;i++){const j=(i+1)%ring.length;tri(ring[i],ring[j],top[j]);tri(ring[i],top[j],top[i])}}
function bar(toW,a,b,wdir,wid,thk,col,mat){const d=b.map((v,i)=>v-a[i]),sv=n3(wdir).map(v=>v*wid/2),t=n3(crs(d,wdir)).map(v=>v*thk);
 const A=a.map((v,i)=>v-t[i]/2),B=b.map((v,i)=>v-t[i]/2);prism(toW,[A.map((v,i)=>v-sv[i]),A.map((v,i)=>v+sv[i]),B.map((v,i)=>v+sv[i]),B.map((v,i)=>v-sv[i])],t,col,mat)}
function disc(toW,c,rad,thk,col,mat,N=22){const ring=[];for(let i=0;i<N;i++){const a=i/N*Math.PI*2;ring.push([c[0]+Math.cos(a)*rad,c[1]+Math.sin(a)*rad,c[2]])}prism(toW,ring,[0,0,thk],col,mat)}
function slingBag(x,y,z,colName,opt={}){
 const C=BAGCOL[colName]||BAGCOL.black,W=.27,H=.16,D=.115,R=.024,e=.0035,toW=(p,n)=>[[x-p[2],y+p[1],z+p[0]],[-n[2],n[1],n[0]]];
 const U=px=>(px-405)/510*W,V=py=>(490-py)/305*H,F=D/2;
 rbox(toW,[0,H/2,0],[W/2,H/2,D/2],R,C,null,[6,6,4]);
 // flap: front panel with the diagonal lower edge, then wrapping over the top towards the back
 const ring=[[175,192],[615,192],[617,375],[600,412],[560,432],[530,428],[175,232]].map(([px,py])=>[U(px),Math.min(V(py),H-R),F+.0005]);
 prism(toW,ring,[0,0,e-.0005],C.map(v=>v*1.06),LEA);
 for(let i=6;i>2;i--){const a=ring[i],b=ring[i-1],d=b.map((v,k)=>v-a[k]),pn=n3(crs([0,0,1],d)).map(v=>-v*.003);
  bar(toW,a.map((v,k)=>k===2?F+.0003:v+pn[k]),b.map((v,k)=>k===2?F+.0003:v+pn[k]),crs(d,[0,0,1]),.006,.0004,C.map(v=>v*.3),LEA)}
 {const u0=U(175),u1=U(615),pr=[];for(let k=0;k<=8;k++){const t=k/8*Math.PI*.75;pr.push([H-R+(R+e)*Math.sin(t),(F-R)+(R+e)*Math.cos(t),Math.sin(t),Math.cos(t)])}
  for(let k=0;k<pr.length-1;k++){const [v0,w0,a0,b0]=pr[k],[v1,w1,a1,b1]=pr[k+1],w1b=k+1===pr.length-1?w1:w1;
   const q=[[u0,v0,w0,a0,b0],[u1,v0,w0,a0,b0],[u1,v1,w1b,a1,b1],[u0,v1,w1b,a1,b1]];
   for(const idx of [0,1,2,0,2,3]){const [uu,vv,ww,ny,nw]=q[idx],Wd=toW([uu,vv,ww],[0,ny,nw]);mpush(Wd[0],Wd[1],C.map(v=>v*1.06),LEA,[-1,-1])}}
  for(const uu of [u0,u1])for(let k=0;k<pr.length-1;k++){const [v0,w0]=pr[k],[v1,w1]=pr[k+1];const sgn=uu<0?-1:1;
   prism(toW,[[uu,v0,w0],[uu,v1,w1],[uu,H-R+(R)*Math.sin((k+1)/8*Math.PI*.75),(F-R)+R*Math.cos((k+1)/8*Math.PI*.75)],[uu,H-R+R*Math.sin(k/8*Math.PI*.75),(F-R)+R*Math.cos(k/8*Math.PI*.75)]],[sgn*.0015,0,0],C,LEA)}}
 // diagonal zip pocket: tape, metal teeth, slider and pull tab
 const za=[U(215),V(300),F],zb=[U(525),V(435),F];
 bar(toW,za,zb,[0,0,1].map((v,i)=>i===2?0:0).length?crs(zb.map((v,i)=>v-za[i]),[0,0,1]):[0,1,0],.011,.0016,C.map(v=>v*.55),LEA);
 bar(toW,za.map((v,i)=>i===2?v+.0012:v),zb.map((v,i)=>i===2?v+.0012:v),crs(zb.map((v,i)=>v-za[i]),[0,0,1]),.0035,.0018,SILVER,MET);
 bar(toW,[U(222),V(306),F+.002],[U(240),V(314),F+.002],[0,1,0],.009,.004,SILVER,MET);
 bar(toW,[U(230),V(318),F+.004],[U(230),V(386),F+.004],[1,0,0],.0105,.0018,SILVER,MET);
 bar(toW,[U(230),V(366),F+.0052],[U(230),V(378),F+.0052],[1,0,0],.005,.0008,[.05,.05,.05],LEA);
 // round JACK STUDIO badge on the flap
 disc(toW,[U(382),V(280),F+e],.0088,.0014,SILVER,MET);disc(toW,[U(382),V(280),F+e+.0014],.0068,.0006,[.07,.07,.075],MET);
 // side zips along the top of both side panels, pullers hanging at the front end
 for(const sg of [-1,1]){const uu=sg*(W/2+.0008),vv=H*.68;
  bar(toW,[uu,vv,-F+.025],[uu,vv,F-.02],[0,1,0],.009,.0016,C.map(v=>v*.55),LEA);
  bar(toW,[uu+sg*.001,vv,-F+.025],[uu+sg*.001,vv,F-.02],[0,1,0],.003,.0016,SILVER,MET);
  bar(toW,[uu+sg*.0025,vv+.004,F-.03],[uu+sg*.0025,vv-.034,F-.03],[0,0,1],.0105,.0018,SILVER,MET);}
 // strap tabs + D-rings, then the strap with an adjustable buckle
 const tab=[-.40*W,.36*W],ringV=H+.03,rings=[];
 for(const uu of tab){bar(toW,[uu,H-.012,0],[uu,H+.02,0],[1,0,0],.02,.004,C,LEA);
  for(const [a,b] of [[[uu-.013,ringV-.008,0],[uu+.013,ringV-.008,0]],[[uu-.013,ringV+.008,0],[uu+.013,ringV+.008,0]],[[uu-.013,ringV-.008,0],[uu-.013,ringV+.008,0]],[[uu+.013,ringV-.008,0],[uu+.013,ringV+.008,0]]])bar(toW,a,b,[0,0,1],.003,.003,SILVER,MET);
  rings.push([uu,ringV+.008,0])}
 let path;
 if(opt.hang!==undefined){const vt=opt.hang-y,wb=-.07;path=[[rings[0],[-.012,vt,wb]],[[.012,vt,wb],rings[1]]];}
 else{const p1=[-.07,H+.075,-.045],p2=[.07,H+.075,-.045];path=[[rings[0],p1],[p1,p2],[p2,rings[1]]];}
 const fw=(a,b)=>{const d=b.map((v,i)=>v-a[i]);return crs([d[0],d[1],0],[0,0,1])};
 for(const [a,b] of path)bar(toW,a,b,fw(a,b),.024,.004,C.map(v=>v*.9),LEA);
 {const [a,b]=path[0],m=a.map((v,i)=>v+(b[i]-v)*.55),d=n3(b.map((v,i)=>v-a[i])),s=[m.map((v,i)=>v-d[i]*.012),m.map((v,i)=>v+d[i]*.012)];
  bar(toW,s[0],s[1],fw(a,b),.031,.008,SILVER,MET);bar(toW,s[0].map((v,i)=>v+d[i]*.003),s[1].map((v,i)=>v-d[i]*.003),fw(a,b),.033,.0095,C.map(v=>v*.85),LEA);}
}
function bagZ(x,y,z,len,h,dep,tex){box(x,y+h/2,z,dep,h,len,tex,1);box(x-dep/2-.004,y+h*.62,z,.01,.018,len*.75,'brass',.9);
const t=y+h;line3([x,t,z-len*.25],[x,t+h*.6,z-len*.15],.016,tex);line3([x,t+h*.6,z-len*.15],[x,t+h*.6,z+len*.15],.016,tex);line3([x,t+h*.6,z+len*.15],[x,t,z+len*.25],.016,tex);}
function duffel(x,y,z,len,h,tex){box(x,y+h/2,z,h*.95,h,len,tex,1);box(x,y+h*.55,z,h*1.02,h*.7,len*.97,tex,.92);
box(x-h*.5,y+h*.55,z,.012,h*.42,len*.55,tex,.75);line3([x,y+h,z-.12],[x,y+h+.1,z],.02,tex);line3([x,y+h+.1,z],[x,y+h,z+.12],.02,tex);}
function backpack(x,y,z,w,h,tex){box(x,y+h/2,z,.2,h,w,tex,1);box(x-.12,y+h*.32,z,.06,h*.42,w*.78,tex,.9);box(x,y+h+.02,z,.12,.04,w*.82,tex,1.04);
line3([x,y+h+.03,z-.05],[x,y+h+.09,z],.014,tex);line3([x,y+h+.09,z],[x,y+h+.03,z+.05],.014,tex);}
function stand(x,y,z,h){box(x,y+.005,z,.12,.01,.12,'metal',1.2);box(x,y+h/2,z,.012,h,.012,'metal',1.3);}
function rack(side,z,photo,title){const x=side*5.13,front=side*4.71,W=3.08;
// wood wall backing and photo inset. The photos provide real bags, not a full-room illusion.
box(side*5.31,1.87,z,.13,3.62,3.56,'peg',1.0);
xpanel(x,z-W/2,z+W/2,.48,3.25,photo,1.08,side);
// Independent shelving geometry makes parallax visible when walking.
for(const zz of [z-1.57,z+1.57])box(front,1.83,zz,.49,3.25,.063,'metal',.79);
for(const yy of [.71,1.43,2.22,3.05])box(front,yy,z,.54,.095,3.2,'wood',.96);
box(front,3.52,z,.5,.06,3.2,'metal',.9);
// Branded category header above each shelving module.
const signTile='label_'+title.toLowerCase().replace(/ /g,'_');
xpanel(side*4.79,z-1.51,z+1.51,3.36,3.73,signTile,1.03,side);
// Side metal framing and suspended shelf lighting.
for(const zz of [z-1.55,z+1.55])box(side*4.48,2,zz,.055,3.5,.055,'metal',.84);
box(side*4.46,3.15,z,.23,.06,2.8,'white',1.2);
// Mesh product silhouettes in the foreground physically move relative to the photo texture.
for(let i=0;i<3;i++){
const dz=z-1.05+i*1.05;
let product=(title==='TRAVEL MOVEMENT'?'darkleather':i===1?'brownleather':'darkleather');
// Tiny depth-bearing handbags, intentionally spaced so the real photographed stock remains visible.
bag(side*4.4,1.07,dz,.34,.34,.22,product,true);
}
}
function bag(x,y,z,w,h,d,tex='darkleather',handle=true){
box(x,y,z,w,h,d,tex,.98);box(x,y+h*.26,z+d*.5+.018,w*.82,.03,.035,'brass',.92);
if(handle){const top=y+h/2;const a=[x-w*.23,top,z],b=[x-w*.22,top+.20,z],c=[x+w*.22,top+.20,z],end=[x+w*.23,top,z];line3(a,b,.026,tex);line3(b,c,.026,tex);line3(c,end,.026,tex)}
}
function island(x,z,title,variation){
const w=2.35,d=1.9;
// tabletop, legs, floating rack and two-sided composition.
box(x,.96,z,w,.14,d,'wood',1.09);
for(const xx of [-w/2+.15,w/2-.15])for(const zz of [-d/2+.12,d/2-.12])box(x+xx,.47,z+zz,.066,.87,.065,'metal',.87);
box(x,.65,z,1.75,.08,1.30,'wood',.84);
// High-end tabletop displays from bags and small leather goods, each spatial.
const items=[[-.76,-.54,.40,.45,'darkleather'],[-.1,-.5,.38,.38,'brownleather'],[.63,-.43,.48,.5,'darkleather'],[-.69,.48,.45,.45,'brownleather'],[.12,.44,.37,.35,'darkleather'],[.76,.41,.31,.33,'brownleather']];
for(const [xx,zz,ww,hh,tex] of items){const Y=1.05+hh/2;bag(x+xx,Y,z+zz,ww,hh,.22,tex,true)}
// Lower platform products visible from sides
for(const xx of [-.56,.52]){box(x+xx,.79,z,.62,.12,.43,'darkleather',.97)}
// side sign panel
const tex=variation===1?'label_craft_innovative':'label_craft_heritage';
zpanel(z+d/2+.03,x-1.08,x+1.08,.21,.48,tex,1.03);
}
buildWorld();
function mesh(V,U,S){const m={n:V.length/3};for(const [k,d,n] of [['p',V,3],['u',U,2],['s',S,1]]){m[k]=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,m[k]);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(d),gl.STATIC_DRAW)}return m}
function bindMesh(m){for(const [k,l,n] of [['p',loc.pos,3],['u',loc.uv,2],['s',loc.shade,1]]){gl.bindBuffer(gl.ARRAY_BUFFER,m[k]);gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,n,gl.FLOAT,false,0,0)}}
const worldMesh=mesh(verts,UVS,shades);
const litVS=`attribute vec3 aP,aN,aC;attribute vec2 aR,aT;uniform mat4 uVP;varying vec3 vW,vN,vC;varying vec2 vR,vT;void main(){gl_Position=uVP*vec4(aP,1.);vW=aP;vN=aN;vC=aC;vR=aR;vT=aT;}`;
const litFS=`precision highp float;varying vec3 vW,vN,vC;varying vec2 vR,vT;uniform vec3 uCam;uniform sampler2D uDec;uniform float uPer;
void main(){vec3 n=normalize(vN);float ao=1.;
 if(vR.y>.01){float ph=vR.x*6.2831853/uPer;n=normalize(n+vec3(0.,sin(ph)*.62*vR.y,0.));ao=1.-.16*vR.y*smoothstep(.55,1.,cos(ph));}
 float mat=vR.y<-1.5?2.:(vR.y<-.5?1.:0.);
 if(mat==1.){vec3 g=floor(vW*1700.);float h1=fract(sin(dot(g,vec3(12.9898,78.233,37.719)))*43758.5453),h2=fract(sin(dot(g,vec3(39.346,11.135,83.155)))*24634.6345);n=normalize(n+vec3(h1-.5,h2-.5,(h1+h2)*.5-.5)*.06);}
 vec3 V=normalize(uCam-vW),L1=normalize(vec3(.12,1.,.18)),L2=normalize(vec3(-1.,.45,.2)),H2=normalize(L2+V),H1=normalize(L1+V);
 float dif=.40+.40*max(dot(n,L1),0.)+.34*max(dot(n,L2),0.)+.06*max(-n.y,0.);
 float sp=.09*pow(max(dot(n,H2),0.),26.)+.06*pow(max(dot(n,H1),0.),40.);
 float rim=pow(1.-max(dot(n,V),0.),3.)*.08;
 vec3 col=vC*dif*ao+vec3(sp+rim);
 if(mat==1.)col=vC*dif+vec3(sp*1.8+rim*.6);
 if(mat==2.){float env=.55+.45*n.y;col=vC*(.30+.30*dif)*env+vec3(sp*9.+rim*2.5+.10*pow(max(dot(reflect(-V,n),L1),0.),6.));}
 if(vT.x>=0.){vec4 d=texture2D(uDec,vT);if(d.a<.5)discard;col=vec3(.95)*(.55+.45*dif)+vec3(sp*.6);}
 col=mix(col,vec3(.81,.78,.74),clamp((distance(vW,uCam)-10.)/24.,0.,.28));gl_FragColor=vec4(col,1.);}`;
const litProg=gl.createProgram();gl.attachShader(litProg,shader(gl.VERTEX_SHADER,litVS));gl.attachShader(litProg,shader(gl.FRAGMENT_SHADER,litFS));gl.linkProgram(litProg);
if(!gl.getProgramParameter(litProg,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(litProg));
const LL={P:gl.getAttribLocation(litProg,'aP'),N:gl.getAttribLocation(litProg,'aN'),C:gl.getAttribLocation(litProg,'aC'),R:gl.getAttribLocation(litProg,'aR'),T:gl.getAttribLocation(litProg,'aT'),
 vp:gl.getUniformLocation(litProg,'uVP'),cam:gl.getUniformLocation(litProg,'uCam'),dec:gl.getUniformLocation(litProg,'uDec'),per:gl.getUniformLocation(litProg,'uPer')};
const litBuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,litBuf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(MV),gl.STATIC_DRAW);const litN=MV.length/13;let decTex=null;
function drawLit(){if(!litN)return;gl.useProgram(litProg);gl.bindBuffer(gl.ARRAY_BUFFER,litBuf);
 for(let i=0;i<8;i++)gl.disableVertexAttribArray(i);
 for(const [l,n,o] of [[LL.P,3,0],[LL.N,3,3],[LL.C,3,6],[LL.R,2,9],[LL.T,2,11]]){if(l<0)continue;gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,n,gl.FLOAT,false,52,o*4)}
 gl.uniformMatrix4fv(LL.vp,false,mvp);gl.uniform3f(LL.cam,cam.x,cam.y,cam.z);gl.uniform1f(LL.per,.0136);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,decTex);gl.uniform1i(LL.dec,0);
 gl.drawArrays(gl.TRIANGLES,0,litN);
 for(let i=0;i<8;i++)gl.disableVertexAttribArray(i);gl.useProgram(program)}
for(const s of SPR){const [U0,V0,U1,V1]=s.uv;for(const t of [[U0,V1],[U1,V1],[U1,V0],[U0,V1],[U1,V0],[U0,V0]]){sU.push(...t);sS.push(s.shade)}}
const spriteMesh=mesh(spriteGeometry(Math.PI/2),sU,sS);let lastSprCam='';
function updateSprites(){const k=cam.yaw.toFixed(3);if(k===lastSprCam)return;lastSprCam=k;gl.bindBuffer(gl.ARRAY_BUFFER,spriteMesh.p);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(spriteGeometry(cam.yaw)),gl.DYNAMIC_DRAW)}let atlasTex=null,spriteTex=null;
// Standard column-major camera/view matrix, all geometry positioned in world coordinates.
function perspective(fovy,aspect,near,far){const f=1/Math.tan(fovy/2),a=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*a,-1,0,0,2*far*near*a,0])}
function lookAt(eye,target){let z=[eye[0]-target[0],eye[1]-target[1],eye[2]-target[2]];let n=Math.hypot(...z);z=z.map(a=>a/n);let x=[z[2],0,-z[0]];n=Math.hypot(...x);x=x.map(a=>a/n);const y=[z[1]*x[2]-z[2]*x[1],z[2]*x[0]-z[0]*x[2],z[0]*x[1]-z[1]*x[0]];
return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-(x[0]*eye[0]+x[1]*eye[1]+x[2]*eye[2]),-(y[0]*eye[0]+y[1]*eye[1]+y[2]*eye[2]),-(z[0]*eye[0]+z[1]*eye[1]+z[2]*eye[2]),1])}
function mul(a,b){const o=new Float32Array(16);for(let col=0;col<4;col++)for(let row=0;row<4;row++){let v=0;for(let k=0;k<4;k++)v+=a[k*4+row]*b[col*4+k];o[col*4+row]=v}return o}
function project(m,x,y,z){const w=m[3]*x+m[7]*y+m[11]*z+m[15];if(w<=.01)return null;return {x:(m[0]*x+m[4]*y+m[8]*z+m[12])/w,y:(m[1]*x+m[5]*y+m[9]*z+m[13])/w,w};}
const cam={x:0,y:1.65,z:3.75,yaw:0,pitch:-.10};let mvp=null,last=performance.now(),keys=new Set(),auto=null,tour=false,tourPause=0,tourIndex=0,mouseDown=null,dragged=false,toastTimer=0,activeID='entrance';
const stops=[
 {id:'entrance',name:'Entrance',x:0,z:3.75,yaw:0,detail:'island',desc:'Welcome to the Jack Studio concept showroom.'},
 {id:'innovative',name:'Craft Innovative',x:-.9,z:1.7,yaw:.62,detail:'island',desc:'Walk around the central leather-goods display.'},
 {id:'urban',name:'Urban Carry',x:2.0,z:1.35,yaw:1.57,detail:'urban',desc:'Explore the everyday bag and backpack collection.'},
 {id:'professional',name:'Professional',x:2.2,z:-2.65,yaw:1.57,detail:'professional',desc:'Office-ready leather goods and work bags.'},
 {id:'travel',name:'Travel Movement',x:1.5,z:-7.0,yaw:1.57,detail:'travel',desc:'Travel bags, cabin luggage and accessories.'},
 {id:'counter',name:'Brand Wall',x:0,z:-8.7,yaw:0,detail:'counter',desc:'The JACK STUDiO brand wall.'},
 {id:'fashion',name:'Essential',x:-2.4,z:-8.1,yaw:-1.57,detail:'fashion',desc:'Discover the apparel and everyday collection.'},
 {id:'heritage',name:'Our Story',x:-2.3,z:-1.25,yaw:-1.57,detail:'heritage',desc:'How Jack Studio began, and the customers who are part of it.'},
 {id:'essential',name:'Brand Promise',x:-2.6,z:2.9,yaw:-1.57,detail:'essential',desc:'Our brand promise: more trust, more relevant, more personal.'},
];
const tourOrder=['entrance','innovative','urban','professional','travel','counter','fashion','heritage','essential','entrance'];
function findStop(id){return stops.find(s=>s.id===id)||stops[0]}
function nearestStop(){let best=stops[0],d=Infinity;for(const s of stops){const d2=(cam.x-s.x)**2+(cam.z-s.z)**2;if(d2<d){d=d2;best=s}}return best}
function wrap(a){return Math.atan2(Math.sin(a),Math.cos(a))}
function updateArea(){const s=nearestStop();if(s.id!==activeID){activeID=s.id;$('areaTitle').textContent=s.name;$('areaDescription').textContent=s.desc}}
function blocked(x,z,r=.32){if(Math.abs(x)>5.04-r||z< -9.52+r||z>FRONT-.25-r)return true;
// central island & service counter; white glass door not obstructed
for(const obj of [{x:.3,z:.35,w:.75,h:.62},{x:.3-.78,z:.31,w:.5,h:.42},{x:0,z:-2.25,w:1.08,h:3.1},{x:0,z:-5.8,w:1.6,h:.75},{x:0,z:-7.45,w:1.6,h:.75}])
if(Math.abs(x-obj.x)<obj.w/2+r&&Math.abs(z-obj.z)<obj.h/2+r)return true;
return false}
function gridPath(tx,tz){tx=clamp(tx,-4.6,4.6);tz=clamp(tz,-9.04,FRONT-.6);const step=.4,nx=25,nz=46,x0=-4.8,z0=-9.1;
const ix=x=>Math.round(clamp((x-x0)/step,0,nx-1)),iz=z=>Math.round(clamp((z-z0)/step,0,nz-1));const cx=i=>x0+(i%nx)*step,cz=i=>z0+Math.floor(i/nx)*step;const nearestClear=(x,z)=>{let best=null,d=1e10;for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const px=x0+i*step,pz=z0+j*step;if(blocked(px,pz))continue;const v=(px-x)**2+(pz-z)**2;if(v<d){best=j*nx+i;d=v}}return best};
const start=nearestClear(cam.x,cam.z),goal=nearestClear(tx,tz);if(start===null||goal===null)return[];
const open=[start],came=new Int32Array(nx*nz).fill(-1),cost=new Float64Array(nx*nz).fill(Infinity),closed=new Set();cost[start]=0;
const score=i=>cost[i]+Math.hypot(cx(i)-cx(goal),cz(i)-cz(goal));
while(open.length){open.sort((a,b)=>score(b)-score(a));const c=open.pop();if(c===goal){const rev=[];let at=c;while(at!==-1){rev.push({x:cx(at),z:cz(at)});at=came[at]}rev.reverse();rev.shift();
// trim unnecessary grid corners with line-of-sight checks
const out=[];let base={x:cam.x,z:cam.z};for(let i=0;i<rev.length;){let j=rev.length-1;while(j>i&&!clearLine(base,rev[j]))j--;out.push(rev[j]);base=rev[j];i=j+1}
if(clearLine(base,{x:tx,z:tz}))out.push({x:tx,z:tz});return out;}
closed.add(c);const row=Math.floor(c/nx),col=c%nx;for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]){
const i=col+di,j=row+dj;if(i<0||i>=nx||j<0||j>=nz)continue;const id=j*nx+i;if(closed.has(id)||blocked(cx(id),cz(id)))continue;
if(di&&dj&&(blocked(x0+(col+di)*step,z0+row*step)||blocked(x0+col*step,z0+(row+dj)*step)))continue;
const newC=cost[c]+Math.hypot(di,dj);if(newC<cost[id]){cost[id]=newC;came[id]=c;if(!open.includes(id))open.push(id)}}}
return []}
function clearLine(a,b){const n=Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/.11);for(let i=1;i<=n;i++){const t=i/n;if(blocked(lerp(a.x,b.x,t),lerp(a.z,b.z,t),.32))return false}return true}
function goTo(pos,opt={}){auto={path:gridPath(pos.x,pos.z),targetYaw:opt.yaw,forTour:!!opt.forTour};if(!auto.path.length){if(Number.isFinite(opt.yaw))cam.yaw=opt.yaw;auto=null;onArrive();}else if(!opt.forTour){tour=false;showTourButtons();$('status').innerHTML='<i></i> WALKING'} }
function stopAuto(){auto=null;tour=false;showTourButtons();$('status').innerHTML='<i></i> FREE WALK'}
function showTourButtons(){$('autoTour').hidden=tour;$('stopTour').hidden=!tour}
function beginTour(){tour=true;tourIndex=0;tourPause=0;showTourButtons();nextTour()}
function nextTour(){if(!tour)return;const id=tourOrder[++tourIndex];if(!id){stopAuto();return}const s=findStop(id);goTo(s,{yaw:s.yaw,forTour:true});$('status').innerHTML='<i></i> GUIDED WALK'}
function onArrive(){if(tour){tourPause=1.65;}else {$('status').innerHTML='<i></i> FREE WALK'} }
function setArea(id){const s=findStop(id);$('areaTitle').textContent=s.name;$('areaDescription').textContent=s.desc;activeID=s.id}
const spotNodes=[],mapStops=$('mapStops');
for(const s of stops){if(s.id==='entrance')continue;
 const spot=document.createElement('button');spot.className='navspot';spot.textContent='↑';spot.dataset.label=s.name;spot.title='Walk to '+s.name;spot.onclick=()=>{stopAuto();goTo(s,{yaw:s.yaw});setArea(s.id)};$('navspots').appendChild(spot);spotNodes.push({s,el:spot});
 const mp=document.createElementNS('http://www.w3.org/2000/svg','g');mp.classList.add('map-stop');mp.setAttribute('tabindex','0');mp.setAttribute('role','button');mp.setAttribute('aria-label','Walk to '+s.name);const c=document.createElementNS('http://www.w3.org/2000/svg','circle');c.setAttribute('cx',102+s.x*13.9);c.setAttribute('cy',130+s.z*11.7);c.setAttribute('r',6);mp.appendChild(c);mp.addEventListener('click',()=>{stopAuto();goTo(s,{yaw:s.yaw});setArea(s.id)});mp.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();mp.dispatchEvent(new Event('click'))}});mapStops.appendChild(mp)
}
function updateOverlay(){if(!mvp)return;const width=canvas.clientWidth,height=canvas.clientHeight;for(const {s,el} of spotNodes){const p=project(mvp,s.x,.06,s.z),dist=Math.hypot(cam.x-s.x,cam.z-s.z);if(!p||Math.abs(p.x)>1.05||Math.abs(p.y)>1.05||dist<.58||dist>12){el.hidden=true;continue}el.hidden=false;el.style.left=((p.x+1)*.5*width)+'px';el.style.top=((1-p.y)*.5*height)+'px';el.style.opacity=Math.min(1,3.2/dist).toFixed(2)}
const map=$('mapDot');map.setAttribute('transform',`translate(${102+cam.x*13.9} ${130+cam.z*11.7}) rotate(${-cam.yaw*180/Math.PI})`);
}
function toast(msg){$('toast').textContent=msg;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2100)}
function openPhoto(){const stop=nearestStop();$('photoTitle').textContent=stop.name;$('realPhoto').src='assets/'+stop.detail+'.jpg';$('photoModal').hidden=false;keys.clear();stopAuto();}
$('viewPhoto').onclick=openPhoto;$('closePhoto').onclick=$('returnRoom').onclick=()=>$('photoModal').hidden=true;
$('help').onclick=()=>$('helpModal').hidden=false;
$('closeHelp').onclick=$('startFromHelp').onclick=()=>$('helpModal').hidden=true;
$('autoTour').onclick=beginTour;$('stopTour').onclick=stopAuto;$('restart').onclick=()=>{stopAuto();goTo(stops[0],{yaw:0});cam.pitch=-.08;setArea('entrance')};
let mapVisible=true;$('mapToggle').onclick=()=>{mapVisible=!mapVisible;$('floorMap').hidden=!mapVisible;$('mapContainer').querySelector('.mapFooter').hidden=!mapVisible;$('mapToggle').textContent=mapVisible?'⌄':'⌃'};
function normalizedPoint(e){const r=canvas.getBoundingClientRect();return {x:((e.clientX-r.left)/r.width)*2-1,y:1-((e.clientY-r.top)/r.height)*2}}
function floorClick(e){const n=normalizedPoint(e),aspect=canvas.clientWidth/canvas.clientHeight,tf=Math.tan(Math.PI/3.1/2);const forward=[Math.sin(cam.yaw)*Math.cos(cam.pitch),Math.sin(cam.pitch),-Math.cos(cam.yaw)*Math.cos(cam.pitch)],right=[Math.cos(cam.yaw),0,Math.sin(cam.yaw)],up=[-Math.sin(cam.yaw)*Math.sin(cam.pitch),Math.cos(cam.pitch),Math.cos(cam.yaw)*Math.sin(cam.pitch)];
const dir=forward.map((v,i)=>v+n.x*tf*aspect*right[i]+n.y*tf*up[i]);if(dir[1]>-.055){toast('Click a point on the floor to walk');return}const t=-cam.y/dir[1];if(t>80){toast('Choose a closer spot on the floor');return}const x=cam.x+dir[0]*t,z=cam.z+dir[2]*t;if(x < -5.2||x>5.2||z< -9.7||z>FRONT-.2)return;
stopAuto();goTo({x,z});}
canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);mouseDown={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY};dragged=false;canvas.classList.add('dragging')});
canvas.addEventListener('pointermove',e=>{if(!mouseDown)return;const dx=e.clientX-mouseDown.lastX,dy=e.clientY-mouseDown.lastY;if(Math.hypot(e.clientX-mouseDown.x,e.clientY-mouseDown.y)>6)dragged=true;if(dragged){cam.yaw+=dx*.0042;cam.pitch=clamp(cam.pitch-dy*.0034,-1.05,1.05);if(tour)stopAuto()}mouseDown.lastX=e.clientX;mouseDown.lastY=e.clientY});
canvas.addEventListener('pointerup',e=>{canvas.classList.remove('dragging');if(mouseDown&&!dragged)floorClick(e);mouseDown=null});canvas.addEventListener('pointercancel',()=>{mouseDown=null;canvas.classList.remove('dragging')});
function moveKey(e,pressed){const key=e.key.toLowerCase();const mapped=key==='arrowup'?'w':key==='arrowdown'?'s':key==='arrowleft'?'q':key==='arrowright'?'e':key;if(['w','a','s','d','q','e','shift'].includes(mapped)){e.preventDefault();if(pressed){keys.add(mapped);if(tour||auto)stopAuto()}else keys.delete(mapped)}}
document.addEventListener('keydown',e=>{if($('photoModal').hidden&&$('helpModal').hidden)moveKey(e,true);if(e.key==='Escape'){$('photoModal').hidden=true;$('helpModal').hidden=true;stopAuto()}});document.addEventListener('keyup',e=>moveKey(e,false));
for(const btn of document.querySelectorAll('[data-key]')){const k=btn.dataset.key;btn.addEventListener('pointerdown',e=>{e.preventDefault();btn.setPointerCapture(e.pointerId);keys.add(k);stopAuto()});for(const evt of ['pointerup','pointercancel','lostpointercapture'])btn.addEventListener(evt,()=>keys.delete(k))}
function animate(dt){if(!$('photoModal').hidden||!$('helpModal').hidden)return;
let manual=false;
if(keys.has('q')){cam.yaw-=1.45*dt;manual=true}if(keys.has('e')){cam.yaw+=1.45*dt;manual=true}
let f=(keys.has('w')?1:0)-(keys.has('s')?1:0),r=(keys.has('d')?1:0)-(keys.has('a')?1:0);const mag=Math.hypot(f,r);if(mag){f/=mag;r/=mag;const spd=keys.has('shift')?4.1:2.45;const dx=(Math.sin(cam.yaw)*f+Math.cos(cam.yaw)*r)*spd*dt,dz=(-Math.cos(cam.yaw)*f+Math.sin(cam.yaw)*r)*spd*dt;
if(!blocked(cam.x+dx,cam.z))cam.x+=dx;if(!blocked(cam.x,cam.z+dz))cam.z+=dz;manual=true}
if(auto&&!manual){const next=auto.path[0];if(next){const dx=next.x-cam.x,dz=next.z-cam.z,dist=Math.hypot(dx,dz);if(dist<.08){auto.path.shift()}else{const speed=Math.min(dist,2.15*dt);const desired=Math.atan2(dx,-dz);cam.yaw+=wrap(desired-cam.yaw)*Math.min(1,dt*4.5);const px=cam.x+dx/dist*speed,pz=cam.z+dz/dist*speed;if(!blocked(px,pz,.21)){cam.x=px;cam.z=pz}else auto.path.shift()}}
if(auto.path.length===0){if(Number.isFinite(auto.targetYaw)){const diff=wrap(auto.targetYaw-cam.yaw);cam.yaw+=diff*Math.min(1,dt*4.2);if(Math.abs(diff)<.055){auto=null;onArrive()}}else{auto=null;onArrive()}}}
if(tour&&tourPause>0){tourPause-=dt;if(tourPause<=0)nextTour()}
updateArea();}
let lastOverlay=0;
function render(now){const dt=Math.min(.055,(now-last)/1000||.016);last=now;animate(dt);const dpr=Math.min(window.devicePixelRatio||1,1.6);const w=Math.round(canvas.clientWidth*dpr),h=Math.round(canvas.clientHeight*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h)}
gl.clearColor(.81,.79,.73,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
const fw=[Math.sin(cam.yaw)*Math.cos(cam.pitch),Math.sin(cam.pitch),-Math.cos(cam.yaw)*Math.cos(cam.pitch)];const proj=perspective(Math.PI/3.1,w/h,.09,75),view=lookAt([cam.x,cam.y,cam.z],[cam.x+fw[0],cam.y+fw[1],cam.z+fw[2]]);mvp=mul(proj,view);
gl.uniformMatrix4fv(loc.mvp,false,mvp);gl.uniform3f(loc.camera,cam.x,cam.y,cam.z);bindMesh(worldMesh);gl.bindTexture(gl.TEXTURE_2D,atlasTex);gl.uniform1f(loc.cut,-1.);gl.drawArrays(gl.TRIANGLES,0,worldMesh.n);if(decTex)drawLit();if(spriteTex&&spriteMesh.n){updateSprites();bindMesh(spriteMesh);gl.bindTexture(gl.TEXTURE_2D,spriteTex);gl.uniform1f(loc.cut,.5);gl.drawArrays(gl.TRIANGLES,0,spriteMesh.n)}if(now-lastOverlay>45){updateOverlay();lastOverlay=now}requestAnimationFrame(render)}
function loadTex(url,fmt){return new Promise((ok,bad)=>{const im=new Image();im.onload=()=>{const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,fmt,fmt,gl.UNSIGNED_BYTE,im);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.generateMipmap(gl.TEXTURE_2D);ok(t)};im.onerror=bad;im.src=url})}
function launch(){gl.activeTexture(gl.TEXTURE0);gl.uniform1i(loc.sampler,0);
Promise.all([loadTex(window.JS_ATLAS_URL,gl.RGB),window.JS_SPRITE_URL?loadTex(window.JS_SPRITE_URL,gl.RGBA).catch(()=>null):Promise.resolve(null),window.JS_DECAL_URL?loadTex(window.JS_DECAL_URL,gl.RGBA).catch(()=>null):Promise.resolve(null)]).then(([a,b,c])=>{atlasTex=a;spriteTex=b;decTex=c;gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);$('loading').hidden=true;setArea('entrance');last=performance.now();requestAnimationFrame(render)}).catch(()=>{$('loading').innerHTML='<div class="loadbox">Unable to load 3D textures. Extract the whole ZIP first.</div>'})}
launch();
})();
