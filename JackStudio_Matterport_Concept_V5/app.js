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
// Suitcase panels use their own photo sheet (JS_LUG_*): rectified lid fronts, backs and ribbed sides.
const LR=window.JS_LUG_RECTS||{},lV=[],lU=[],lS=[];
function lt(id){const r=LR[id];return r?[(r[0]+1)/2048,(r[1]+1)/1024,(r[0]+r[2]-1)/2048,(r[1]+r[3]-1)/1024]:[0,0,.001,.001]}
function ltri(a,b,c,ta,tb,tc,tile,sh){if(XF){a=XF(a);b=XF(b);c=XF(c)}for(const [p,t] of [[a,ta],[b,tb],[c,tc]]){lV.push(...p);lU.push(tile[0]+t[0]*(tile[2]-tile[0]),tile[1]+(1-t[1])*(tile[3]-tile[1]));lS.push(sh)}}
function sprite(x,zc,hw,y0,y1,key,shade=1,turn=true){const m=SP[key];if(!m)return;const [u,v,w,h]=m.uv;
 let b=[x,y0,zc],t=[x,y1,zc],e=[x,y0,zc+hw];if(XF){b=XF(b);t=XF(t);e=XF(e)}
 SPR.push({x:b[0],z:b[2],y0:b[1],y1:t[1],hw:e[2]-b[2],turn,uv:[(u+.5)/SPS[0],(v+.5)/SPS[1],(u+w-.5)/SPS[0],(v+h-.5)/SPS[1]],shade})}
function spriteGeometry(camX,camZ){const P=[];for(const s of SPR){let nx=-1,nz=0;
 if(s.turn){let a=Math.atan2(camZ-s.z,camX-s.x),d=Math.atan2(Math.sin(a-Math.PI),Math.cos(a-Math.PI));d=Math.max(-.9,Math.min(.9,d));nx=-Math.cos(d);nz=-Math.sin(d)}
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
function buildWorld(){
// Floor: repeated genuine volumetric floor geometry, light-oak texture.
for(let x=-5.4;x<5.4;x+=1.35)for(let z=-10.1;z<9.3;z+=1.6)
quad([x,0,z+1.6],[x+1.35,0,z+1.6],[x+1.35,0,z],[x,0,z],'floor',.95+((Math.round(z*5+x*2)%3)*.018));
box(0,4.14,-.4,11,0.17,19.7,'cream',1.04);
// White plaster walls, room boundary and entrance side returns.
box(-5.52,2,-.4,.18,4,19.7,'wall',.95);box(5.52,2,-.4,.18,4,19.7,'wall',.99);
box(-4.4,2,9.42,2.2,4,.16,'wall',1);box(4.4,2,9.42,2.2,4,.16,'wall',1);
box(-1.61,2,9.42,.13,4,.15,'metal');box(1.61,2,9.42,.13,4,.15,'metal');box(0,3.7,9.42,3.2,.14,.12,'metal');
// Glass entrance doors and side mullions (light gray, intentionally translucent-looking).
xpanel(-1.58,9.37,9.40,.1,3.65,'glass',1,-1);box(0,1.8,9.4,.045,3.6,.065,'metal',.9);
// Wall skirt/baseboard around all sides
for(const x of [-5.38,5.38])box(x,.13,-.4,.12,.26,19.5,'wood',.82);
for(const s of [-1,1])box(s*(5.3+2.17)/2,.11,-10.075,5.3-2.17,.22,.11,'wood',.85);
// Ceiling tracks and multiple recessed lights
for(const x of [-2.5,2.5]){
 box(x,4,-.4,.07,.06,16.6,'metal',1);
 for(const z of [-7.4,-4.8,-2.0,1.0,3.6,6.3]){
  box(x,3.955,z,.44,.05,.22,'white',1.14);
  box(x,3.915,z,.34,.035,.14,'cream',1.25);
 }
}
for(const z of [-7.3,-2.1,3.1,7.15])box(0,4.0,z,3.2,.06,.06,'metal',.8);
backWall();
// Main wall arrays with actual store photos integrated into the display backing.
rack(-1,3.0,'essential','ESSENTIAL');rack(-1,-2.15,'heritage','CRAFT HERITAGE');rack(-1,-7.10,'fashion','EVERYDAY STYLE');
rack(1,3.0,'urban','URBAN CARRY');rack(1,-2.15,'professional','PROFESSIONAL');travelZone();
// Main freestanding display islands, with three-dimensional leather products.
island(0,3.35,'CRAFT INNOVATIVE',1);island(0,-2.25,'CRAFT HERITAGE',2);
// Entrance side pedestal and accessories.
box(4.55,.68,7.6,.6,1.35,.75,'cream');box(4.55,1.39,7.6,.72,.11,.85,'wood');bag(4.55,1.64,7.6,.45,.45,.23,'darkleather',true);
box(-4.55,.53,7.7,.74,1.04,.68,'wood');box(-4.55,1.11,7.7,.82,.12,.75,'cream');bag(-4.55,1.38,7.7,.37,.41,.21,'brownleather',true);
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
[['white',.135],['lav',.365],['grey',.635],['orange',.865]].forEach(([c,f])=>suitcase(cx-.16,dy,cz(f),c));
// products: straight-on photo cut-outs, placed at their measured positions (metres from the
// left ladder frame). Items standing on a shelf are seated on it; raised/hanging ones keep their height.
for(const [k,m] of Object.entries(SP)){
 const zc=frames[0]+(m.z[0]+m.z[1])/2,hw=(m.z[1]-m.z[0])/2,h=m.y[1]-m.y[0],gap=m.y[0]-SH[m.shelf];
 const y0=Math.abs(gap)<.06?SH[m.shelf]:m.y[0],crate=k==='b_crate'||k==='b_olivecrate';
 sprite(crate?cx-.05:cx-.02-m.order*.002,zc,hw,y0,y0+h,k,1.05,!crate);
 if(k==='b_crate')box(cx+.15,y0+.15,zc,.2,.3,hw*1.9,'crate',.92);
 if(k==='b_olivecrate')box(cx+.15,y0+.14,zc,.2,.28,hw*1.8,'crate',.92);
}
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
// 29-inch front-opening hard case, modelled from the product photos (79 x 50 x 31 cm, 4 double spinners).
// Local frame: u across the front (world +z), v up, w toward the viewer (world -x). x = front face.
function suitcase(x,y,z,col,S=1){
 const H=.71*S,W=.455*S,D=.28*S,WH=.078*S,LID0=.10*S,R=.035*S,cz=z,bx=x+D/2;
 const P=(u,v,w)=>[bx-w,y+v,cz+u];
 const prof=(w0,h0,w1,h1,r)=>{const pts=[],c=[[w1-r,h1-r,0],[w0+r,h1-r,90],[w0+r,h0+r,180],[w1-r,h0+r,270]];
  for(const [cu,cv,a0] of c)for(let i=0;i<=5;i++){const a=(a0+i*18)*Math.PI/180;pts.push([cu+r*Math.cos(a),cv+r*Math.sin(a)])}return pts};
 // body: rounded profile extruded through the depth
 const body=prof(-W/2,WH,W/2,H,R),n=body.length,fw=D/2,bw=-D/2;
 const side=lt('s_'+col),back=lt('b_'+col),plain=lt('c_'+col);
 for(let i=0;i<n;i++){const [u0,v0]=body[i],[u1,v1]=body[(i+1)%n],vert=Math.abs(u1-u0)<Math.abs(v1-v0),tex=vert?side:plain,sh=vert?.84:(v0>H/2?1.06:.6);
  const t0=(v0-WH)/(H-WH),t1=(v1-WH)/(H-WH);
  ltri(P(u0,v0,fw),P(u1,v1,fw),P(u1,v1,bw),[0,t0],[0,t1],[1,t1],tex,sh);ltri(P(u0,v0,fw),P(u1,v1,bw),P(u0,v0,bw),[0,t0],[1,t1],[1,t0],tex,sh)}
 const fan=(pts,w,tile,u0,v0,uw,vh,sh,flip)=>{const cu=(u0+u0+uw)/2,cv=v0+vh/2,m=[(cu-u0)/uw,(cv-v0)/vh];
  for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length],ta=[(a[0]-u0)/uw,(a[1]-v0)/vh],tb=[(b[0]-u0)/uw,(b[1]-v0)/vh];
   if(flip)ta[0]=1-ta[0],tb[0]=1-tb[0],m[0]=1-m[0];ltri(P(cu,cv,w),P(a[0],a[1],w),P(b[0],b[1],w),flip?[1-(cu-u0)/uw,m[1]]:m,ta,tb,tile,sh)}};
 fan(body,bw,back,-W/2,WH,W,H-WH,.9,true);   // back panel (photo)
 fan(body,fw,plain,-W/2,WH,W,H-WH,.95,false); // body front (visible only under the lid)
 // front-opening lid: photo panel standing 1.4 cm proud, with the black zip rim around it
 const LW=W-.012*S,lid=prof(-LW/2,LID0,LW/2,H-.006*S,R*.9),lf=fw+.014*S;
 fan(lid,lf,lt('f_'+col),-LW/2,LID0,LW,H-.006*S-LID0,1.0,false);
 for(let i=0;i<lid.length;i++){const [u0,v0]=lid[i],[u1,v1]=lid[(i+1)%lid.length];quad(P(u0,v0,fw),P(u1,v1,fw),P(u1,v1,lf),P(u0,v0,lf),'metal',.7)}
 // base: black wheel housings at the four corners, recessed black grip in the front centre
 for(const su of [-1,1])for(const sw of [-1,1]){const hu=su*(W/2-.05*S),hw=sw*(D/2-.045*S);
  const c=P(hu,WH-.004*S,hw);box(c[0],c[1],c[2],.07*S,.03*S,.075*S,'metal',.65);
  const k=P(hu,.045*S,hw);box(k[0],k[1],k[2],.016*S,.03*S,.016*S,'metal',.6);
  for(const du of [-.016,.016]){const wc=P(hu+du*S,.028*S,hw);wheel(wc[0],wc[1],wc[2],.027*S,.012*S)}}
 {const g=P(0,WH+.012*S,fw+.002*S);box(g[0],g[1],g[2],.01*S,.022*S,.13*S,'metal',.55)}
 // top carry handle (back half) and the two side feet
 {const t=P(0,H+.008*S,bw+.05*S);box(t[0],t[1],t[2],.06*S,.016*S,.16*S,'metal',.75)}
 for(const v of [.16,.6]){const f=P(-W/2-.006*S,v*S,fw-.05*S);box(f[0],f[1],f[2],.035*S,.04*S,.012*S,'metal',.7)}
}
// double spinner disc: axle along world z (discs face the room)
function wheel(x,y,z,r,t){const N=10;for(let i=0;i<N;i++){const a=i/N*Math.PI*2,b=(i+1)/N*Math.PI*2,
 p=(ang,dz)=>[x+Math.cos(ang)*r*0,y+Math.sin(ang)*r,z+dz];
 const A=[x+Math.cos(a)*r,y+Math.sin(a)*r],B=[x+Math.cos(b)*r,y+Math.sin(b)*r];
 quad([A[0],A[1],z-t/2],[B[0],B[1],z-t/2],[B[0],B[1],z+t/2],[A[0],A[1],z+t/2],'metal',.55);
 for(const dz of [-t/2,t/2])quad([x,y,z+dz],[A[0],A[1],z+dz],[B[0],B[1],z+dz],[B[0],B[1],z+dz],'metal',dz<0?.8:.9)}}
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
const worldMesh=mesh(verts,UVS,shades),lugMesh=mesh(lV,lU,lS);let lugTex=null;
for(const s of SPR){const [U0,V0,U1,V1]=s.uv;for(const t of [[U0,V1],[U1,V1],[U1,V0],[U0,V1],[U1,V0],[U0,V0]]){sU.push(...t);sS.push(s.shade)}}
const spriteMesh=mesh(spriteGeometry(0,0),sU,sS);let lastSprCam='';
function updateSprites(){const k=cam.x.toFixed(2)+','+cam.z.toFixed(2);if(k===lastSprCam)return;lastSprCam=k;gl.bindBuffer(gl.ARRAY_BUFFER,spriteMesh.p);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(spriteGeometry(cam.x,cam.z)),gl.DYNAMIC_DRAW)}let atlasTex=null,spriteTex=null;
// Standard column-major camera/view matrix, all geometry positioned in world coordinates.
function perspective(fovy,aspect,near,far){const f=1/Math.tan(fovy/2),a=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*a,-1,0,0,2*far*near*a,0])}
function lookAt(eye,target){let z=[eye[0]-target[0],eye[1]-target[1],eye[2]-target[2]];let n=Math.hypot(...z);z=z.map(a=>a/n);let x=[z[2],0,-z[0]];n=Math.hypot(...x);x=x.map(a=>a/n);const y=[z[1]*x[2]-z[2]*x[1],z[2]*x[0]-z[0]*x[2],z[0]*x[1]-z[1]*x[0]];
return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-(x[0]*eye[0]+x[1]*eye[1]+x[2]*eye[2]),-(y[0]*eye[0]+y[1]*eye[1]+y[2]*eye[2]),-(z[0]*eye[0]+z[1]*eye[1]+z[2]*eye[2]),1])}
function mul(a,b){const o=new Float32Array(16);for(let col=0;col<4;col++)for(let row=0;row<4;row++){let v=0;for(let k=0;k<4;k++)v+=a[k*4+row]*b[col*4+k];o[col*4+row]=v}return o}
function project(m,x,y,z){const w=m[3]*x+m[7]*y+m[11]*z+m[15];if(w<=.01)return null;return {x:(m[0]*x+m[4]*y+m[8]*z+m[12])/w,y:(m[1]*x+m[5]*y+m[9]*z+m[13])/w,w};}
const cam={x:0,y:1.65,z:8.15,yaw:0,pitch:-.10};let mvp=null,last=performance.now(),keys=new Set(),auto=null,tour=false,tourPause=0,tourIndex=0,mouseDown=null,dragged=false,toastTimer=0,activeID='entrance';
const stops=[
 {id:'entrance',name:'Entrance',x:0,z:8.05,yaw:0,detail:'island',desc:'Welcome to the Jack Studio concept showroom.'},
 {id:'innovative',name:'Craft Innovative',x:2.40,z:4.15,yaw:-1.45,detail:'island',desc:'Walk around the central leather-goods display.'},
 {id:'urban',name:'Urban Carry',x:2.85,z:2.45,yaw:1.57,detail:'urban',desc:'Explore the everyday bag and backpack collection.'},
 {id:'professional',name:'Professional',x:2.85,z:-2.15,yaw:1.57,detail:'professional',desc:'Office-ready leather goods and work bags.'},
 {id:'travel',name:'Travel Movement',x:1.5,z:-7.0,yaw:1.57,detail:'travel',desc:'Travel bags, cabin luggage and accessories.'},
 {id:'counter',name:'Brand Wall',x:0,z:-5.40,yaw:0,detail:'counter',desc:'The JACK STUDiO brand wall.'},
 {id:'fashion',name:'Everyday Style',x:-2.85,z:-7.10,yaw:-1.57,detail:'fashion',desc:'Discover the apparel and everyday collection.'},
 {id:'heritage',name:'Craft Heritage',x:-2.85,z:-2.25,yaw:-1.57,detail:'heritage',desc:'Take a closer look at handcrafted leather goods.'},
 {id:'essential',name:'Essential',x:-2.85,z:3.05,yaw:-1.57,detail:'essential',desc:'Explore accessories, wallets and daily essentials.'},
];
const tourOrder=['entrance','innovative','urban','professional','travel','counter','fashion','heritage','essential','entrance'];
function findStop(id){return stops.find(s=>s.id===id)||stops[0]}
function nearestStop(){let best=stops[0],d=Infinity;for(const s of stops){const d2=(cam.x-s.x)**2+(cam.z-s.z)**2;if(d2<d){d=d2;best=s}}return best}
function wrap(a){return Math.atan2(Math.sin(a),Math.cos(a))}
function updateArea(){const s=nearestStop();if(s.id!==activeID){activeID=s.id;$('areaTitle').textContent=s.name;$('areaDescription').textContent=s.desc}}
function blocked(x,z,r=.32){if(Math.abs(x)>5.04-r||z< -9.52+r||z>9.04-r)return true;
// central island & service counter; white glass door not obstructed
for(const obj of [{x:0,z:3.35,w:2.35,h:1.9},{x:0,z:-2.25,w:2.35,h:1.9},{x:-4.55,z:7.7,w:.74,h:.68},{x:4.55,z:7.6,w:.6,h:.75}])
if(Math.abs(x-obj.x)<obj.w/2+r&&Math.abs(z-obj.z)<obj.h/2+r)return true;
return false}
function gridPath(tx,tz){tx=clamp(tx,-4.6,4.6);tz=clamp(tz,-9.04,8.84);const step=.4,nx=25,nz=46,x0=-4.8,z0=-9.1;
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
const dir=forward.map((v,i)=>v+n.x*tf*aspect*right[i]+n.y*tf*up[i]);if(dir[1]>-.055){toast('Click a point on the floor to walk');return}const t=-cam.y/dir[1];if(t>80){toast('Choose a closer spot on the floor');return}const x=cam.x+dir[0]*t,z=cam.z+dir[2]*t;if(x < -5.2||x>5.2||z< -9.7||z>9.2)return;
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
gl.uniformMatrix4fv(loc.mvp,false,mvp);gl.uniform3f(loc.camera,cam.x,cam.y,cam.z);bindMesh(worldMesh);gl.bindTexture(gl.TEXTURE_2D,atlasTex);gl.uniform1f(loc.cut,-1.);gl.drawArrays(gl.TRIANGLES,0,worldMesh.n);if(lugTex&&lugMesh.n){bindMesh(lugMesh);gl.bindTexture(gl.TEXTURE_2D,lugTex);gl.drawArrays(gl.TRIANGLES,0,lugMesh.n)}if(spriteTex&&spriteMesh.n){updateSprites();bindMesh(spriteMesh);gl.bindTexture(gl.TEXTURE_2D,spriteTex);gl.uniform1f(loc.cut,.5);gl.drawArrays(gl.TRIANGLES,0,spriteMesh.n)}if(now-lastOverlay>45){updateOverlay();lastOverlay=now}requestAnimationFrame(render)}
function loadTex(url,fmt){return new Promise((ok,bad)=>{const im=new Image();im.onload=()=>{const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,fmt,fmt,gl.UNSIGNED_BYTE,im);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.generateMipmap(gl.TEXTURE_2D);ok(t)};im.onerror=bad;im.src=url})}
function launch(){gl.activeTexture(gl.TEXTURE0);gl.uniform1i(loc.sampler,0);
Promise.all([loadTex(window.JS_ATLAS_URL,gl.RGB),window.JS_SPRITE_URL?loadTex(window.JS_SPRITE_URL,gl.RGBA).catch(()=>null):Promise.resolve(null),window.JS_LUG_URL?loadTex(window.JS_LUG_URL,gl.RGB).catch(()=>null):Promise.resolve(null)]).then(([a,b,c])=>{atlasTex=a;spriteTex=b;lugTex=c;gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);$('loading').hidden=true;setArea('entrance');last=performance.now();requestAnimationFrame(render)}).catch(()=>{$('loading').innerHTML='<div class="loadbox">Unable to load 3D textures. Extract the whole ZIP first.</div>'})}
launch();
})();
