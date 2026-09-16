/* Iran Aryaei offline QR Lite
   Version 1 / byte mode / EC-L. No network, no dependency.
   For Persian/UTF-8 payloads the byte limit is enforced explicitly. */
(function(g){
"use strict";
const EXP=new Uint8Array(512),LOG=new Int16Array(256);let x=1;
for(let i=0;i<255;i++){EXP[i]=x;LOG[x]=i;x<<=1;if(x&256)x^=0x11d}
for(let i=255;i<512;i++)EXP[i]=EXP[i-255];
function mul(a,b){return a&&b?EXP[LOG[a]+LOG[b]]:0}
function rs(data,n){let gen=[1];for(let i=0;i<n;i++){let ng=new Array(gen.length+1).fill(0),p=EXP[i];for(let j=0;j<gen.length;j++){ng[j]^=gen[j];ng[j+1]^=mul(gen[j],p)}gen=ng}
let out=data.slice();for(let i=0;i<data.length;i++){let f=out[i];if(!f)continue;for(let j=0;j<gen.length;j++)out[i+j]^=mul(gen[j],f)}return out.slice(data.length)}
function bitsPush(a,v,n){for(let i=n-1;i>=0;i--)a.push((v>>>i)&1)}
function make(text){
 let bytes=[...new TextEncoder().encode(text)]; if(bytes.length>17) throw new Error("برای این نسخه، متن QR حداکثر ۱۷ بایت باشد.");
 let bits=[];bitsPush(bits,4,4);bitsPush(bits,bytes.length,8);bytes.forEach(b=>bitsPush(bits,b,8));
 while(bits.length<152)bits.push(0); let pad=0;while(bits.length%8)bits.push(0);let arr=[];for(let i=0;i<bits.length;i+=8)arr.push(bits.slice(i,i+8).reduce((a,b)=>a*2+b,0));while(arr.length<19){arr.push(pad%2?0x11:0xec);pad++}
 let ecc=rs(arr,7),all=arr.concat(ecc), dataBits=[];all.forEach(b=>bitsPush(dataBits,b,8));
 const n=21,m=Array.from({length:n},()=>Array(n).fill(null));
 function finder(r,c){for(let y=-1;y<=7;y++)for(let z=-1;z<=7;z++){let yy=r+y,xx=c+z;if(yy<0||yy>=n||xx<0||xx>=n)continue;m[yy][xx]=(y>=0&&y<=6&&z>=0&&z<=6&&(y==0||y==6||z==0||z==6|| (y>=2&&y<=4&&z>=2&&z<=4)))}}
 finder(0,0);finder(0,n-7);finder(n-7,0);
 for(let i=8;i<n-8;i++){if(m[6][i]===null)m[6][i]=i%2===0;if(m[i][6]===null)m[i][6]=i%2===0}
 m[n-8][8]=true;
 // Format info: EC-L, mask 0 => 0x77c4 (precomputed).
 const fmt=0x77c4;for(let i=0;i<15;i++){let b=((fmt>>i)&1)===1;
   if(i<6)m[i][8]=b; else if(i<8)m[i+1][8]=b; else m[n-15+i][8]=b;
   if(i<8)m[8][n-i-1]=b; else if(i<9)m[8][15-i]=b; else m[8][15-i-1]=b;
 }
 let bit=0,col=n-1,up=true;
 while(col>0){if(col===6)col--;for(let k=0;k<n;k++){let r=up?n-1-k:k;for(let j=0;j<2;j++){let c=col-j;if(m[r][c]!==null)continue;let v=bit<dataBits.length?dataBits[bit++]:0;if((r+c)%2===0)v^=1;m[r][c]=!!v}}up=!up;col-=2}
 return m;
}
function render(canvas,text,size){
 const mat=make(text), ctx=canvas.getContext("2d"), n=mat.length, q=4, scale=size/(n+q*2);canvas.width=canvas.height=size;ctx.fillStyle="#fff";ctx.fillRect(0,0,size,size);ctx.fillStyle="#000";
 for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(mat[r][c])ctx.fillRect(Math.round((c+q)*scale),Math.round((r+q)*scale),Math.ceil(scale),Math.ceil(scale));
}
g.QRLite={render,make};
})(window);