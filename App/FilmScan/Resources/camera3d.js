"use strict";var Camera3D=(()=>{var fi=Object.defineProperty;var Wr=Object.getOwnPropertyDescriptor;var Xr=Object.getOwnPropertyNames;var Yr=Object.prototype.hasOwnProperty;var qr=(a,e)=>{for(var t in e)fi(a,t,{get:e[t],enumerable:!0})},Zr=(a,e,t,n)=>{if(e&&typeof e=="object"||typeof e=="function")for(let i of Xr(e))!Yr.call(a,i)&&i!==t&&fi(a,i,{get:()=>e[i],enumerable:!(n=Wr(e,i))||n.enumerable});return a};var $r=a=>Zr(fi({},"__esModule",{value:!0}),a);var uh={};qr(uh,{build:()=>ch,buildLens:()=>hh});var _r="169";var zi=0,Jr=1;var Ts=1;var As=100;var Rs=204,Cs=205;var Ps=0,Is=1,Ls=2,qn=3,Ds=4,Us=5,Ns=6,Fs=7,Kr=0;var xr=300;var Zn=1e3,Sn=1001,ks=1002,Os=1003;var jr=1006;var Qr=1008;var vr=1009;var Mr=1015;var yr=1023;var eo=1028;var $n=2300,Bi=2301,di=2302,zs=2400,Bs=2401,Hs=2402;var to=0;var br="",He="srgb",ps="srgb-linear",no="display-p3",Sr="display-p3-linear",Hi="linear",Vs="srgb",Gs="rec709",Ws="p3";var At=7680;var Xs=519;var Ys=35044;var En=2e3,qs=2001,Vt=class{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){if(this._listeners===void 0)return!1;let n=this._listeners;return n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){if(this._listeners===void 0)return;let i=this._listeners[e];if(i!==void 0){let s=i.indexOf(t);s!==-1&&i.splice(s,1)}}dispatchEvent(e){if(this._listeners===void 0)return;let n=this._listeners[e.type];if(n!==void 0){e.target=this;let i=n.slice(0);for(let s=0,r=i.length;s<r;s++)i[s].call(this,e);e.target=null}}},_e=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];var dh=Math.PI/180,ph=180/Math.PI;function Jt(){let a=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(_e[a&255]+_e[a>>8&255]+_e[a>>16&255]+_e[a>>24&255]+"-"+_e[e&255]+_e[e>>8&255]+"-"+_e[e>>16&15|64]+_e[e>>24&255]+"-"+_e[t&63|128]+_e[t>>8&255]+"-"+_e[t>>16&255]+_e[t>>24&255]+_e[n&255]+_e[n>>8&255]+_e[n>>16&255]+_e[n>>24&255]).toLowerCase()}function he(a,e,t){return Math.max(e,Math.min(t,a))}function io(a,e){return(a%e+e)%e}function pi(a,e,t){return(1-t)*a+t*e}function Qt(a,e){switch(e.constructor){case Float32Array:return a;case Uint32Array:return a/4294967295;case Uint16Array:return a/65535;case Uint8Array:return a/255;case Int32Array:return Math.max(a/2147483647,-1);case Int16Array:return Math.max(a/32767,-1);case Int8Array:return Math.max(a/127,-1);default:throw new Error("Invalid component type.")}}function Me(a,e){switch(e.constructor){case Float32Array:return a;case Uint32Array:return Math.round(a*4294967295);case Uint16Array:return Math.round(a*65535);case Uint8Array:return Math.round(a*255);case Int32Array:return Math.round(a*2147483647);case Int16Array:return Math.round(a*32767);case Int8Array:return Math.round(a*127);default:throw new Error("Invalid component type.")}}var R=class a{constructor(e=0,t=0){a.prototype.isVector2=!0,this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){let t=this.x,n=this.y,i=e.elements;return this.x=i[0]*t+i[3]*n+i[6],this.y=i[1]*t+i[4]*n+i[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(e,Math.min(t,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(he(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){let n=Math.cos(t),i=Math.sin(t),s=this.x-e.x,r=this.y-e.y;return this.x=s*n-r*i+e.x,this.y=s*i+r*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},z=class a{constructor(e,t,n,i,s,r,o,l,c){a.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,i,s,r,o,l,c)}set(e,t,n,i,s,r,o,l,c){let u=this.elements;return u[0]=e,u[1]=i,u[2]=o,u[3]=t,u[4]=s,u[5]=l,u[6]=n,u[7]=r,u[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){let t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,i=t.elements,s=this.elements,r=n[0],o=n[3],l=n[6],c=n[1],u=n[4],f=n[7],h=n[2],d=n[5],p=n[8],m=i[0],g=i[3],_=i[6],M=i[1],y=i[4],v=i[7],b=i[2],S=i[5],w=i[8];return s[0]=r*m+o*M+l*b,s[3]=r*g+o*y+l*S,s[6]=r*_+o*v+l*w,s[1]=c*m+u*M+f*b,s[4]=c*g+u*y+f*S,s[7]=c*_+u*v+f*w,s[2]=h*m+d*M+p*b,s[5]=h*g+d*y+p*S,s[8]=h*_+d*v+p*w,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[1],i=e[2],s=e[3],r=e[4],o=e[5],l=e[6],c=e[7],u=e[8];return t*r*u-t*o*c-n*s*u+n*o*l+i*s*c-i*r*l}invert(){let e=this.elements,t=e[0],n=e[1],i=e[2],s=e[3],r=e[4],o=e[5],l=e[6],c=e[7],u=e[8],f=u*r-o*c,h=o*l-u*s,d=c*s-r*l,p=t*f+n*h+i*d;if(p===0)return this.set(0,0,0,0,0,0,0,0,0);let m=1/p;return e[0]=f*m,e[1]=(i*c-u*n)*m,e[2]=(o*n-i*r)*m,e[3]=h*m,e[4]=(u*t-i*l)*m,e[5]=(i*s-o*t)*m,e[6]=d*m,e[7]=(n*l-c*t)*m,e[8]=(r*t-n*s)*m,this}transpose(){let e,t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){let t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,i,s,r,o){let l=Math.cos(s),c=Math.sin(s);return this.set(n*l,n*c,-n*(l*r+c*o)+r+e,-i*c,i*l,-i*(-c*r+l*o)+o+t,0,0,1),this}scale(e,t){return this.premultiply(mi.makeScale(e,t)),this}rotate(e){return this.premultiply(mi.makeRotation(-e)),this}translate(e,t){return this.premultiply(mi.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){let t=this.elements,n=e.elements;for(let i=0;i<9;i++)if(t[i]!==n[i])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}},mi=new z;function so(a){for(let e=a.length-1;e>=0;--e)if(a[e]>=65535)return!0;return!1}function Zs(a){return document.createElementNS("http://www.w3.org/1999/xhtml",a)}var $s=new z().set(.8224621,.177538,0,.0331941,.9668058,0,.0170827,.0723974,.9105199),Js=new z().set(1.2249401,-.2249404,0,-.0420569,1.0420571,0,-.0196376,-.0786361,1.0982735),en={[ps]:{transfer:Hi,primaries:Gs,luminanceCoefficients:[.2126,.7152,.0722],toReference:a=>a,fromReference:a=>a},[He]:{transfer:Vs,primaries:Gs,luminanceCoefficients:[.2126,.7152,.0722],toReference:a=>a.convertSRGBToLinear(),fromReference:a=>a.convertLinearToSRGB()},[Sr]:{transfer:Hi,primaries:Ws,luminanceCoefficients:[.2289,.6917,.0793],toReference:a=>a.applyMatrix3(Js),fromReference:a=>a.applyMatrix3($s)},[no]:{transfer:Vs,primaries:Ws,luminanceCoefficients:[.2289,.6917,.0793],toReference:a=>a.convertSRGBToLinear().applyMatrix3(Js),fromReference:a=>a.applyMatrix3($s).convertLinearToSRGB()}},ro=new Set([ps,Sr]),Ue={enabled:!0,_workingColorSpace:ps,get workingColorSpace(){return this._workingColorSpace},set workingColorSpace(a){if(!ro.has(a))throw new Error(`Unsupported working color space, "${a}".`);this._workingColorSpace=a},convert:function(a,e,t){if(this.enabled===!1||e===t||!e||!t)return a;let n=en[e].toReference,i=en[t].fromReference;return i(n(a))},fromWorkingColorSpace:function(a,e){return this.convert(a,this._workingColorSpace,e)},toWorkingColorSpace:function(a,e){return this.convert(a,e,this._workingColorSpace)},getPrimaries:function(a){return en[a].primaries},getTransfer:function(a){return a===br?Hi:en[a].transfer},getLuminanceCoefficients:function(a,e=this._workingColorSpace){return a.fromArray(en[e].luminanceCoefficients)}};function Ht(a){return a<.04045?a*.0773993808:Math.pow(a*.9478672986+.0521327014,2.4)}function gi(a){return a<.0031308?a*12.92:1.055*Math.pow(a,.41666)-.055}var Rt,Vi=class{static getDataURL(e){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let t;if(e instanceof HTMLCanvasElement)t=e;else{Rt===void 0&&(Rt=Zs("canvas")),Rt.width=e.width,Rt.height=e.height;let n=Rt.getContext("2d");e instanceof ImageData?n.putImageData(e,0,0):n.drawImage(e,0,0,e.width,e.height),t=Rt}return t.width>2048||t.height>2048?(console.warn("THREE.ImageUtils.getDataURL: Image converted to jpg for performance reasons",e),t.toDataURL("image/jpeg",.6)):t.toDataURL("image/png")}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){let t=Zs("canvas");t.width=e.width,t.height=e.height;let n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);let i=n.getImageData(0,0,e.width,e.height),s=i.data;for(let r=0;r<s.length;r++)s[r]=Ht(s[r]/255)*255;return n.putImageData(i,0,0),t}else if(e.data){let t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(Ht(t[n]/255)*255):t[n]=Ht(t[n]);return{data:t,width:e.width,height:e.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}},oo=0,Gi=class{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:oo++}),this.uuid=Jt(),this.data=e,this.dataReady=!0,this.version=0}set needsUpdate(e){e===!0&&this.version++}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];let n={uuid:this.uuid,url:""},i=this.data;if(i!==null){let s;if(Array.isArray(i)){s=[];for(let r=0,o=i.length;r<o;r++)i[r].isDataTexture?s.push(_i(i[r].image)):s.push(_i(i[r]))}else s=_i(i);n.url=s}return t||(e.images[this.uuid]=n),n}};function _i(a){return typeof HTMLImageElement<"u"&&a instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&a instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&a instanceof ImageBitmap?Vi.getDataURL(a):a.data?{data:Array.from(a.data),width:a.width,height:a.height,type:a.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}var ao=0,gt=class a extends Vt{constructor(e=a.DEFAULT_IMAGE,t=a.DEFAULT_MAPPING,n=Sn,i=Sn,s=jr,r=Qr,o=yr,l=vr,c=a.DEFAULT_ANISOTROPY,u=br){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:ao++}),this.uuid=Jt(),this.name="",this.source=new Gi(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=i,this.magFilter=s,this.minFilter=r,this.anisotropy=c,this.format=o,this.internalFormat=null,this.type=l,this.offset=new R(0,0),this.repeat=new R(1,1),this.center=new R(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new z,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=u,this.userData={},this.version=0,this.onUpdate=null,this.isRenderTargetTexture=!1,this.pmremVersion=0}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];let n={metadata:{version:4.6,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==xr)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case Zn:e.x=e.x-Math.floor(e.x);break;case Sn:e.x=e.x<0?0:1;break;case ks:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case Zn:e.y=e.y-Math.floor(e.y);break;case Sn:e.y=e.y<0?0:1;break;case ks:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}};gt.DEFAULT_IMAGE=null;gt.DEFAULT_MAPPING=xr;gt.DEFAULT_ANISOTROPY=1;var un=class a{constructor(e=0,t=0,n=0,i=1){a.prototype.isVector4=!0,this.x=e,this.y=t,this.z=n,this.w=i}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,i){return this.x=e,this.y=t,this.z=n,this.w=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){let t=this.x,n=this.y,i=this.z,s=this.w,r=e.elements;return this.x=r[0]*t+r[4]*n+r[8]*i+r[12]*s,this.y=r[1]*t+r[5]*n+r[9]*i+r[13]*s,this.z=r[2]*t+r[6]*n+r[10]*i+r[14]*s,this.w=r[3]*t+r[7]*n+r[11]*i+r[15]*s,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);let t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,i,s,l=e.elements,c=l[0],u=l[4],f=l[8],h=l[1],d=l[5],p=l[9],m=l[2],g=l[6],_=l[10];if(Math.abs(u-h)<.01&&Math.abs(f-m)<.01&&Math.abs(p-g)<.01){if(Math.abs(u+h)<.1&&Math.abs(f+m)<.1&&Math.abs(p+g)<.1&&Math.abs(c+d+_-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;let y=(c+1)/2,v=(d+1)/2,b=(_+1)/2,S=(u+h)/4,w=(f+m)/4,E=(p+g)/4;return y>v&&y>b?y<.01?(n=0,i=.707106781,s=.707106781):(n=Math.sqrt(y),i=S/n,s=w/n):v>b?v<.01?(n=.707106781,i=0,s=.707106781):(i=Math.sqrt(v),n=S/i,s=E/i):b<.01?(n=.707106781,i=.707106781,s=0):(s=Math.sqrt(b),n=w/s,i=E/s),this.set(n,i,s,t),this}let M=Math.sqrt((g-p)*(g-p)+(f-m)*(f-m)+(h-u)*(h-u));return Math.abs(M)<.001&&(M=1),this.x=(g-p)/M,this.y=(f-m)/M,this.z=(h-u)/M,this.w=Math.acos((c+d+_-1)/2),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this.z=Math.max(e.z,Math.min(t.z,this.z)),this.w=Math.max(e.w,Math.min(t.w,this.w)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this.z=Math.max(e,Math.min(t,this.z)),this.w=Math.max(e,Math.min(t,this.w)),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(e,Math.min(t,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}};var ot=class{constructor(e=0,t=0,n=0,i=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=i}static slerpFlat(e,t,n,i,s,r,o){let l=n[i+0],c=n[i+1],u=n[i+2],f=n[i+3],h=s[r+0],d=s[r+1],p=s[r+2],m=s[r+3];if(o===0){e[t+0]=l,e[t+1]=c,e[t+2]=u,e[t+3]=f;return}if(o===1){e[t+0]=h,e[t+1]=d,e[t+2]=p,e[t+3]=m;return}if(f!==m||l!==h||c!==d||u!==p){let g=1-o,_=l*h+c*d+u*p+f*m,M=_>=0?1:-1,y=1-_*_;if(y>Number.EPSILON){let b=Math.sqrt(y),S=Math.atan2(b,_*M);g=Math.sin(g*S)/b,o=Math.sin(o*S)/b}let v=o*M;if(l=l*g+h*v,c=c*g+d*v,u=u*g+p*v,f=f*g+m*v,g===1-o){let b=1/Math.sqrt(l*l+c*c+u*u+f*f);l*=b,c*=b,u*=b,f*=b}}e[t]=l,e[t+1]=c,e[t+2]=u,e[t+3]=f}static multiplyQuaternionsFlat(e,t,n,i,s,r){let o=n[i],l=n[i+1],c=n[i+2],u=n[i+3],f=s[r],h=s[r+1],d=s[r+2],p=s[r+3];return e[t]=o*p+u*f+l*d-c*h,e[t+1]=l*p+u*h+c*f-o*d,e[t+2]=c*p+u*d+o*h-l*f,e[t+3]=u*p-o*f-l*h-c*d,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,i){return this._x=e,this._y=t,this._z=n,this._w=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){let n=e._x,i=e._y,s=e._z,r=e._order,o=Math.cos,l=Math.sin,c=o(n/2),u=o(i/2),f=o(s/2),h=l(n/2),d=l(i/2),p=l(s/2);switch(r){case"XYZ":this._x=h*u*f+c*d*p,this._y=c*d*f-h*u*p,this._z=c*u*p+h*d*f,this._w=c*u*f-h*d*p;break;case"YXZ":this._x=h*u*f+c*d*p,this._y=c*d*f-h*u*p,this._z=c*u*p-h*d*f,this._w=c*u*f+h*d*p;break;case"ZXY":this._x=h*u*f-c*d*p,this._y=c*d*f+h*u*p,this._z=c*u*p+h*d*f,this._w=c*u*f-h*d*p;break;case"ZYX":this._x=h*u*f-c*d*p,this._y=c*d*f+h*u*p,this._z=c*u*p-h*d*f,this._w=c*u*f+h*d*p;break;case"YZX":this._x=h*u*f+c*d*p,this._y=c*d*f+h*u*p,this._z=c*u*p-h*d*f,this._w=c*u*f-h*d*p;break;case"XZY":this._x=h*u*f-c*d*p,this._y=c*d*f-h*u*p,this._z=c*u*p+h*d*f,this._w=c*u*f+h*d*p;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+r)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){let n=t/2,i=Math.sin(n);return this._x=e.x*i,this._y=e.y*i,this._z=e.z*i,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){let t=e.elements,n=t[0],i=t[4],s=t[8],r=t[1],o=t[5],l=t[9],c=t[2],u=t[6],f=t[10],h=n+o+f;if(h>0){let d=.5/Math.sqrt(h+1);this._w=.25/d,this._x=(u-l)*d,this._y=(s-c)*d,this._z=(r-i)*d}else if(n>o&&n>f){let d=2*Math.sqrt(1+n-o-f);this._w=(u-l)/d,this._x=.25*d,this._y=(i+r)/d,this._z=(s+c)/d}else if(o>f){let d=2*Math.sqrt(1+o-n-f);this._w=(s-c)/d,this._x=(i+r)/d,this._y=.25*d,this._z=(l+u)/d}else{let d=2*Math.sqrt(1+f-n-o);this._w=(r-i)/d,this._x=(s+c)/d,this._y=(l+u)/d,this._z=.25*d}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<Number.EPSILON?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(he(this.dot(e),-1,1)))}rotateTowards(e,t){let n=this.angleTo(e);if(n===0)return this;let i=Math.min(1,t/n);return this.slerp(e,i),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){let n=e._x,i=e._y,s=e._z,r=e._w,o=t._x,l=t._y,c=t._z,u=t._w;return this._x=n*u+r*o+i*c-s*l,this._y=i*u+r*l+s*o-n*c,this._z=s*u+r*c+n*l-i*o,this._w=r*u-n*o-i*l-s*c,this._onChangeCallback(),this}slerp(e,t){if(t===0)return this;if(t===1)return this.copy(e);let n=this._x,i=this._y,s=this._z,r=this._w,o=r*e._w+n*e._x+i*e._y+s*e._z;if(o<0?(this._w=-e._w,this._x=-e._x,this._y=-e._y,this._z=-e._z,o=-o):this.copy(e),o>=1)return this._w=r,this._x=n,this._y=i,this._z=s,this;let l=1-o*o;if(l<=Number.EPSILON){let d=1-t;return this._w=d*r+t*this._w,this._x=d*n+t*this._x,this._y=d*i+t*this._y,this._z=d*s+t*this._z,this.normalize(),this}let c=Math.sqrt(l),u=Math.atan2(c,o),f=Math.sin((1-t)*u)/c,h=Math.sin(t*u)/c;return this._w=r*f+this._w*h,this._x=n*f+this._x*h,this._y=i*f+this._y*h,this._z=s*f+this._z*h,this._onChangeCallback(),this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){let e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),i=Math.sqrt(1-n),s=Math.sqrt(n);return this.set(i*Math.sin(e),i*Math.cos(e),s*Math.sin(t),s*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},x=class a{constructor(e=0,t=0,n=0){a.prototype.isVector3=!0,this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(Ks.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(Ks.setFromAxisAngle(e,t))}applyMatrix3(e){let t=this.x,n=this.y,i=this.z,s=e.elements;return this.x=s[0]*t+s[3]*n+s[6]*i,this.y=s[1]*t+s[4]*n+s[7]*i,this.z=s[2]*t+s[5]*n+s[8]*i,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){let t=this.x,n=this.y,i=this.z,s=e.elements,r=1/(s[3]*t+s[7]*n+s[11]*i+s[15]);return this.x=(s[0]*t+s[4]*n+s[8]*i+s[12])*r,this.y=(s[1]*t+s[5]*n+s[9]*i+s[13])*r,this.z=(s[2]*t+s[6]*n+s[10]*i+s[14])*r,this}applyQuaternion(e){let t=this.x,n=this.y,i=this.z,s=e.x,r=e.y,o=e.z,l=e.w,c=2*(r*i-o*n),u=2*(o*t-s*i),f=2*(s*n-r*t);return this.x=t+l*c+r*f-o*u,this.y=n+l*u+o*c-s*f,this.z=i+l*f+s*u-r*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){let t=this.x,n=this.y,i=this.z,s=e.elements;return this.x=s[0]*t+s[4]*n+s[8]*i,this.y=s[1]*t+s[5]*n+s[9]*i,this.z=s[2]*t+s[6]*n+s[10]*i,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this.z=Math.max(e.z,Math.min(t.z,this.z)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this.z=Math.max(e,Math.min(t,this.z)),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(e,Math.min(t,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){let n=e.x,i=e.y,s=e.z,r=t.x,o=t.y,l=t.z;return this.x=i*l-s*o,this.y=s*r-n*l,this.z=n*o-i*r,this}projectOnVector(e){let t=e.lengthSq();if(t===0)return this.set(0,0,0);let n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return xi.copy(this).projectOnVector(e),this.sub(xi)}reflect(e){return this.sub(xi.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(he(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y,i=this.z-e.z;return t*t+n*n+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){let i=Math.sin(t)*e;return this.x=i*Math.sin(n),this.y=Math.cos(t)*e,this.z=i*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){let t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),i=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=i,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},xi=new x,Ks=new ot,Ie=class{constructor(e=new x(1/0,1/0,1/0),t=new x(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(Ne.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(Ne.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){let n=Ne.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);let n=e.geometry;if(n!==void 0){let s=n.getAttribute("position");if(t===!0&&s!==void 0&&e.isInstancedMesh!==!0)for(let r=0,o=s.count;r<o;r++)e.isMesh===!0?e.getVertexPosition(r,Ne):Ne.fromBufferAttribute(s,r),Ne.applyMatrix4(e.matrixWorld),this.expandByPoint(Ne);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),wn.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),wn.copy(n.boundingBox)),wn.applyMatrix4(e.matrixWorld),this.union(wn)}let i=e.children;for(let s=0,r=i.length;s<r;s++)this.expandByObject(i[s],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,Ne),Ne.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(tn),Tn.subVectors(this.max,tn),Ct.subVectors(e.a,tn),Pt.subVectors(e.b,tn),It.subVectors(e.c,tn),tt.subVectors(Pt,Ct),nt.subVectors(It,Pt),ft.subVectors(Ct,It);let t=[0,-tt.z,tt.y,0,-nt.z,nt.y,0,-ft.z,ft.y,tt.z,0,-tt.x,nt.z,0,-nt.x,ft.z,0,-ft.x,-tt.y,tt.x,0,-nt.y,nt.x,0,-ft.y,ft.x,0];return!vi(t,Ct,Pt,It,Tn)||(t=[1,0,0,0,1,0,0,0,1],!vi(t,Ct,Pt,It,Tn))?!1:(An.crossVectors(tt,nt),t=[An.x,An.y,An.z],vi(t,Ct,Pt,It,Tn))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Ne).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(Ne).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Xe[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Xe[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Xe[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Xe[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Xe[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Xe[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Xe[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Xe[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Xe),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}},Xe=[new x,new x,new x,new x,new x,new x,new x,new x],Ne=new x,wn=new Ie,Ct=new x,Pt=new x,It=new x,tt=new x,nt=new x,ft=new x,tn=new x,Tn=new x,An=new x,dt=new x;function vi(a,e,t,n,i){for(let s=0,r=a.length-3;s<=r;s+=3){dt.fromArray(a,s);let o=i.x*Math.abs(dt.x)+i.y*Math.abs(dt.y)+i.z*Math.abs(dt.z),l=e.dot(dt),c=t.dot(dt),u=n.dot(dt);if(Math.max(-Math.max(l,c,u),Math.min(l,c,u))>o)return!1}return!0}var lo=new Ie,nn=new x,Mi=new x,Gt=class{constructor(e=new x,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){let n=this.center;t!==void 0?n.copy(t):lo.setFromPoints(e).getCenter(n);let i=0;for(let s=0,r=e.length;s<r;s++)i=Math.max(i,n.distanceToSquared(e[s]));return this.radius=Math.sqrt(i),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){let t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){let n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;nn.subVectors(e,this.center);let t=nn.lengthSq();if(t>this.radius*this.radius){let n=Math.sqrt(t),i=(n-this.radius)*.5;this.center.addScaledVector(nn,i/n),this.radius+=i}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Mi.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(nn.copy(e.center).add(Mi)),this.expandByPoint(nn.copy(e.center).sub(Mi))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}},Ye=new x,yi=new x,Rn=new x,it=new x,bi=new x,Cn=new x,Si=new x,Wi=class{constructor(e=new x,t=new x(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Ye)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);let n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){let t=Ye.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Ye.copy(this.origin).addScaledVector(this.direction,t),Ye.distanceToSquared(e))}distanceSqToSegment(e,t,n,i){yi.copy(e).add(t).multiplyScalar(.5),Rn.copy(t).sub(e).normalize(),it.copy(this.origin).sub(yi);let s=e.distanceTo(t)*.5,r=-this.direction.dot(Rn),o=it.dot(this.direction),l=-it.dot(Rn),c=it.lengthSq(),u=Math.abs(1-r*r),f,h,d,p;if(u>0)if(f=r*l-o,h=r*o-l,p=s*u,f>=0)if(h>=-p)if(h<=p){let m=1/u;f*=m,h*=m,d=f*(f+r*h+2*o)+h*(r*f+h+2*l)+c}else h=s,f=Math.max(0,-(r*h+o)),d=-f*f+h*(h+2*l)+c;else h=-s,f=Math.max(0,-(r*h+o)),d=-f*f+h*(h+2*l)+c;else h<=-p?(f=Math.max(0,-(-r*s+o)),h=f>0?-s:Math.min(Math.max(-s,-l),s),d=-f*f+h*(h+2*l)+c):h<=p?(f=0,h=Math.min(Math.max(-s,-l),s),d=h*(h+2*l)+c):(f=Math.max(0,-(r*s+o)),h=f>0?s:Math.min(Math.max(-s,-l),s),d=-f*f+h*(h+2*l)+c);else h=r>0?-s:s,f=Math.max(0,-(r*h+o)),d=-f*f+h*(h+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,f),i&&i.copy(yi).addScaledVector(Rn,h),d}intersectSphere(e,t){Ye.subVectors(e.center,this.origin);let n=Ye.dot(this.direction),i=Ye.dot(Ye)-n*n,s=e.radius*e.radius;if(i>s)return null;let r=Math.sqrt(s-i),o=n-r,l=n+r;return l<0?null:o<0?this.at(l,t):this.at(o,t)}intersectsSphere(e){return this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){let t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){let n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){let t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,i,s,r,o,l,c=1/this.direction.x,u=1/this.direction.y,f=1/this.direction.z,h=this.origin;return c>=0?(n=(e.min.x-h.x)*c,i=(e.max.x-h.x)*c):(n=(e.max.x-h.x)*c,i=(e.min.x-h.x)*c),u>=0?(s=(e.min.y-h.y)*u,r=(e.max.y-h.y)*u):(s=(e.max.y-h.y)*u,r=(e.min.y-h.y)*u),n>r||s>i||((s>n||isNaN(n))&&(n=s),(r<i||isNaN(i))&&(i=r),f>=0?(o=(e.min.z-h.z)*f,l=(e.max.z-h.z)*f):(o=(e.max.z-h.z)*f,l=(e.min.z-h.z)*f),n>l||o>i)||((o>n||n!==n)&&(n=o),(l<i||i!==i)&&(i=l),i<0)?null:this.at(n>=0?n:i,t)}intersectsBox(e){return this.intersectBox(e,Ye)!==null}intersectTriangle(e,t,n,i,s){bi.subVectors(t,e),Cn.subVectors(n,e),Si.crossVectors(bi,Cn);let r=this.direction.dot(Si),o;if(r>0){if(i)return null;o=1}else if(r<0)o=-1,r=-r;else return null;it.subVectors(this.origin,e);let l=o*this.direction.dot(Cn.crossVectors(it,Cn));if(l<0)return null;let c=o*this.direction.dot(bi.cross(it));if(c<0||l+c>r)return null;let u=-o*it.dot(Si);return u<0?null:this.at(u/r,s)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},me=class a{constructor(e,t,n,i,s,r,o,l,c,u,f,h,d,p,m,g){a.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,i,s,r,o,l,c,u,f,h,d,p,m,g)}set(e,t,n,i,s,r,o,l,c,u,f,h,d,p,m,g){let _=this.elements;return _[0]=e,_[4]=t,_[8]=n,_[12]=i,_[1]=s,_[5]=r,_[9]=o,_[13]=l,_[2]=c,_[6]=u,_[10]=f,_[14]=h,_[3]=d,_[7]=p,_[11]=m,_[15]=g,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new a().fromArray(this.elements)}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){let t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){let t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){let t=this.elements,n=e.elements,i=1/Lt.setFromMatrixColumn(e,0).length(),s=1/Lt.setFromMatrixColumn(e,1).length(),r=1/Lt.setFromMatrixColumn(e,2).length();return t[0]=n[0]*i,t[1]=n[1]*i,t[2]=n[2]*i,t[3]=0,t[4]=n[4]*s,t[5]=n[5]*s,t[6]=n[6]*s,t[7]=0,t[8]=n[8]*r,t[9]=n[9]*r,t[10]=n[10]*r,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){let t=this.elements,n=e.x,i=e.y,s=e.z,r=Math.cos(n),o=Math.sin(n),l=Math.cos(i),c=Math.sin(i),u=Math.cos(s),f=Math.sin(s);if(e.order==="XYZ"){let h=r*u,d=r*f,p=o*u,m=o*f;t[0]=l*u,t[4]=-l*f,t[8]=c,t[1]=d+p*c,t[5]=h-m*c,t[9]=-o*l,t[2]=m-h*c,t[6]=p+d*c,t[10]=r*l}else if(e.order==="YXZ"){let h=l*u,d=l*f,p=c*u,m=c*f;t[0]=h+m*o,t[4]=p*o-d,t[8]=r*c,t[1]=r*f,t[5]=r*u,t[9]=-o,t[2]=d*o-p,t[6]=m+h*o,t[10]=r*l}else if(e.order==="ZXY"){let h=l*u,d=l*f,p=c*u,m=c*f;t[0]=h-m*o,t[4]=-r*f,t[8]=p+d*o,t[1]=d+p*o,t[5]=r*u,t[9]=m-h*o,t[2]=-r*c,t[6]=o,t[10]=r*l}else if(e.order==="ZYX"){let h=r*u,d=r*f,p=o*u,m=o*f;t[0]=l*u,t[4]=p*c-d,t[8]=h*c+m,t[1]=l*f,t[5]=m*c+h,t[9]=d*c-p,t[2]=-c,t[6]=o*l,t[10]=r*l}else if(e.order==="YZX"){let h=r*l,d=r*c,p=o*l,m=o*c;t[0]=l*u,t[4]=m-h*f,t[8]=p*f+d,t[1]=f,t[5]=r*u,t[9]=-o*u,t[2]=-c*u,t[6]=d*f+p,t[10]=h-m*f}else if(e.order==="XZY"){let h=r*l,d=r*c,p=o*l,m=o*c;t[0]=l*u,t[4]=-f,t[8]=c*u,t[1]=h*f+m,t[5]=r*u,t[9]=d*f-p,t[2]=p*f-d,t[6]=o*u,t[10]=m*f+h}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(co,e,ho)}lookAt(e,t,n){let i=this.elements;return we.subVectors(e,t),we.lengthSq()===0&&(we.z=1),we.normalize(),st.crossVectors(n,we),st.lengthSq()===0&&(Math.abs(n.z)===1?we.x+=1e-4:we.z+=1e-4,we.normalize(),st.crossVectors(n,we)),st.normalize(),Pn.crossVectors(we,st),i[0]=st.x,i[4]=Pn.x,i[8]=we.x,i[1]=st.y,i[5]=Pn.y,i[9]=we.y,i[2]=st.z,i[6]=Pn.z,i[10]=we.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,i=t.elements,s=this.elements,r=n[0],o=n[4],l=n[8],c=n[12],u=n[1],f=n[5],h=n[9],d=n[13],p=n[2],m=n[6],g=n[10],_=n[14],M=n[3],y=n[7],v=n[11],b=n[15],S=i[0],w=i[4],E=i[8],U=i[12],L=i[1],D=i[5],V=i[9],k=i[13],O=i[2],$=i[6],Y=i[10],re=i[14],be=i[3],q=i[7],Q=i[11],ne=i[15];return s[0]=r*S+o*L+l*O+c*be,s[4]=r*w+o*D+l*$+c*q,s[8]=r*E+o*V+l*Y+c*Q,s[12]=r*U+o*k+l*re+c*ne,s[1]=u*S+f*L+h*O+d*be,s[5]=u*w+f*D+h*$+d*q,s[9]=u*E+f*V+h*Y+d*Q,s[13]=u*U+f*k+h*re+d*ne,s[2]=p*S+m*L+g*O+_*be,s[6]=p*w+m*D+g*$+_*q,s[10]=p*E+m*V+g*Y+_*Q,s[14]=p*U+m*k+g*re+_*ne,s[3]=M*S+y*L+v*O+b*be,s[7]=M*w+y*D+v*$+b*q,s[11]=M*E+y*V+v*Y+b*Q,s[15]=M*U+y*k+v*re+b*ne,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[4],i=e[8],s=e[12],r=e[1],o=e[5],l=e[9],c=e[13],u=e[2],f=e[6],h=e[10],d=e[14],p=e[3],m=e[7],g=e[11],_=e[15];return p*(+s*l*f-i*c*f-s*o*h+n*c*h+i*o*d-n*l*d)+m*(+t*l*d-t*c*h+s*r*h-i*r*d+i*c*u-s*l*u)+g*(+t*c*f-t*o*d-s*r*f+n*r*d+s*o*u-n*c*u)+_*(-i*o*u-t*l*f+t*o*h+i*r*f-n*r*h+n*l*u)}transpose(){let e=this.elements,t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){let i=this.elements;return e.isVector3?(i[12]=e.x,i[13]=e.y,i[14]=e.z):(i[12]=e,i[13]=t,i[14]=n),this}invert(){let e=this.elements,t=e[0],n=e[1],i=e[2],s=e[3],r=e[4],o=e[5],l=e[6],c=e[7],u=e[8],f=e[9],h=e[10],d=e[11],p=e[12],m=e[13],g=e[14],_=e[15],M=f*g*c-m*h*c+m*l*d-o*g*d-f*l*_+o*h*_,y=p*h*c-u*g*c-p*l*d+r*g*d+u*l*_-r*h*_,v=u*m*c-p*f*c+p*o*d-r*m*d-u*o*_+r*f*_,b=p*f*l-u*m*l-p*o*h+r*m*h+u*o*g-r*f*g,S=t*M+n*y+i*v+s*b;if(S===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let w=1/S;return e[0]=M*w,e[1]=(m*h*s-f*g*s-m*i*d+n*g*d+f*i*_-n*h*_)*w,e[2]=(o*g*s-m*l*s+m*i*c-n*g*c-o*i*_+n*l*_)*w,e[3]=(f*l*s-o*h*s-f*i*c+n*h*c+o*i*d-n*l*d)*w,e[4]=y*w,e[5]=(u*g*s-p*h*s+p*i*d-t*g*d-u*i*_+t*h*_)*w,e[6]=(p*l*s-r*g*s-p*i*c+t*g*c+r*i*_-t*l*_)*w,e[7]=(r*h*s-u*l*s+u*i*c-t*h*c-r*i*d+t*l*d)*w,e[8]=v*w,e[9]=(p*f*s-u*m*s-p*n*d+t*m*d+u*n*_-t*f*_)*w,e[10]=(r*m*s-p*o*s+p*n*c-t*m*c-r*n*_+t*o*_)*w,e[11]=(u*o*s-r*f*s-u*n*c+t*f*c+r*n*d-t*o*d)*w,e[12]=b*w,e[13]=(u*m*i-p*f*i+p*n*h-t*m*h-u*n*g+t*f*g)*w,e[14]=(p*o*i-r*m*i-p*n*l+t*m*l+r*n*g-t*o*g)*w,e[15]=(r*f*i-u*o*i+u*n*l-t*f*l-r*n*h+t*o*h)*w,this}scale(e){let t=this.elements,n=e.x,i=e.y,s=e.z;return t[0]*=n,t[4]*=i,t[8]*=s,t[1]*=n,t[5]*=i,t[9]*=s,t[2]*=n,t[6]*=i,t[10]*=s,t[3]*=n,t[7]*=i,t[11]*=s,this}getMaxScaleOnAxis(){let e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],i=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,i))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){let t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){let n=Math.cos(t),i=Math.sin(t),s=1-n,r=e.x,o=e.y,l=e.z,c=s*r,u=s*o;return this.set(c*r+n,c*o-i*l,c*l+i*o,0,c*o+i*l,u*o+n,u*l-i*r,0,c*l-i*o,u*l+i*r,s*l*l+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,i,s,r){return this.set(1,n,s,0,e,1,r,0,t,i,1,0,0,0,0,1),this}compose(e,t,n){let i=this.elements,s=t._x,r=t._y,o=t._z,l=t._w,c=s+s,u=r+r,f=o+o,h=s*c,d=s*u,p=s*f,m=r*u,g=r*f,_=o*f,M=l*c,y=l*u,v=l*f,b=n.x,S=n.y,w=n.z;return i[0]=(1-(m+_))*b,i[1]=(d+v)*b,i[2]=(p-y)*b,i[3]=0,i[4]=(d-v)*S,i[5]=(1-(h+_))*S,i[6]=(g+M)*S,i[7]=0,i[8]=(p+y)*w,i[9]=(g-M)*w,i[10]=(1-(h+m))*w,i[11]=0,i[12]=e.x,i[13]=e.y,i[14]=e.z,i[15]=1,this}decompose(e,t,n){let i=this.elements,s=Lt.set(i[0],i[1],i[2]).length(),r=Lt.set(i[4],i[5],i[6]).length(),o=Lt.set(i[8],i[9],i[10]).length();this.determinant()<0&&(s=-s),e.x=i[12],e.y=i[13],e.z=i[14],Fe.copy(this);let c=1/s,u=1/r,f=1/o;return Fe.elements[0]*=c,Fe.elements[1]*=c,Fe.elements[2]*=c,Fe.elements[4]*=u,Fe.elements[5]*=u,Fe.elements[6]*=u,Fe.elements[8]*=f,Fe.elements[9]*=f,Fe.elements[10]*=f,t.setFromRotationMatrix(Fe),n.x=s,n.y=r,n.z=o,this}makePerspective(e,t,n,i,s,r,o=En){let l=this.elements,c=2*s/(t-e),u=2*s/(n-i),f=(t+e)/(t-e),h=(n+i)/(n-i),d,p;if(o===En)d=-(r+s)/(r-s),p=-2*r*s/(r-s);else if(o===qs)d=-r/(r-s),p=-r*s/(r-s);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return l[0]=c,l[4]=0,l[8]=f,l[12]=0,l[1]=0,l[5]=u,l[9]=h,l[13]=0,l[2]=0,l[6]=0,l[10]=d,l[14]=p,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(e,t,n,i,s,r,o=En){let l=this.elements,c=1/(t-e),u=1/(n-i),f=1/(r-s),h=(t+e)*c,d=(n+i)*u,p,m;if(o===En)p=(r+s)*f,m=-2*f;else if(o===qs)p=s*f,m=-1*f;else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return l[0]=2*c,l[4]=0,l[8]=0,l[12]=-h,l[1]=0,l[5]=2*u,l[9]=0,l[13]=-d,l[2]=0,l[6]=0,l[10]=m,l[14]=-p,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(e){let t=this.elements,n=e.elements;for(let i=0;i<16;i++)if(t[i]!==n[i])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}},Lt=new x,Fe=new me,co=new x(0,0,0),ho=new x(1,1,1),st=new x,Pn=new x,we=new x,js=new me,Qs=new ot,Wt=class a{constructor(e=0,t=0,n=0,i=a.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=i}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,i=this._order){return this._x=e,this._y=t,this._z=n,this._order=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){let i=e.elements,s=i[0],r=i[4],o=i[8],l=i[1],c=i[5],u=i[9],f=i[2],h=i[6],d=i[10];switch(t){case"XYZ":this._y=Math.asin(he(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-u,d),this._z=Math.atan2(-r,s)):(this._x=Math.atan2(h,c),this._z=0);break;case"YXZ":this._x=Math.asin(-he(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(o,d),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-f,s),this._z=0);break;case"ZXY":this._x=Math.asin(he(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(-f,d),this._z=Math.atan2(-r,c)):(this._y=0,this._z=Math.atan2(l,s));break;case"ZYX":this._y=Math.asin(-he(f,-1,1)),Math.abs(f)<.9999999?(this._x=Math.atan2(h,d),this._z=Math.atan2(l,s)):(this._x=0,this._z=Math.atan2(-r,c));break;case"YZX":this._z=Math.asin(he(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-u,c),this._y=Math.atan2(-f,s)):(this._x=0,this._y=Math.atan2(o,d));break;case"XZY":this._z=Math.asin(-he(r,-1,1)),Math.abs(r)<.9999999?(this._x=Math.atan2(h,c),this._y=Math.atan2(o,s)):(this._x=Math.atan2(-u,d),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return js.makeRotationFromQuaternion(e),this.setFromRotationMatrix(js,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return Qs.setFromEuler(this),this.setFromQuaternion(Qs,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};Wt.DEFAULT_ORDER="XYZ";var Xi=class{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}},uo=0,er=new x,Dt=new ot,qe=new me,In=new x,sn=new x,fo=new x,po=new ot,tr=new x(1,0,0),nr=new x(0,1,0),ir=new x(0,0,1),sr={type:"added"},mo={type:"removed"},Ut={type:"childadded",child:null},Ei={type:"childremoved",child:null},Ae=class a extends Vt{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:uo++}),this.uuid=Jt(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=a.DEFAULT_UP.clone();let e=new x,t=new Wt,n=new ot,i=new x(1,1,1);function s(){n.setFromEuler(t,!1)}function r(){t.setFromQuaternion(n,void 0,!1)}t._onChange(s),n._onChange(r),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:i},modelViewMatrix:{value:new me},normalMatrix:{value:new z}}),this.matrix=new me,this.matrixWorld=new me,this.matrixAutoUpdate=a.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=a.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Xi,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return Dt.setFromAxisAngle(e,t),this.quaternion.multiply(Dt),this}rotateOnWorldAxis(e,t){return Dt.setFromAxisAngle(e,t),this.quaternion.premultiply(Dt),this}rotateX(e){return this.rotateOnAxis(tr,e)}rotateY(e){return this.rotateOnAxis(nr,e)}rotateZ(e){return this.rotateOnAxis(ir,e)}translateOnAxis(e,t){return er.copy(e).applyQuaternion(this.quaternion),this.position.add(er.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(tr,e)}translateY(e){return this.translateOnAxis(nr,e)}translateZ(e){return this.translateOnAxis(ir,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(qe.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?In.copy(e):In.set(e,t,n);let i=this.parent;this.updateWorldMatrix(!0,!1),sn.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?qe.lookAt(sn,In,this.up):qe.lookAt(In,sn,this.up),this.quaternion.setFromRotationMatrix(qe),i&&(qe.extractRotation(i.matrixWorld),Dt.setFromRotationMatrix(qe),this.quaternion.premultiply(Dt.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(sr),Ut.child=e,this.dispatchEvent(Ut),Ut.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}let t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(mo),Ei.child=e,this.dispatchEvent(Ei),Ei.child=null),this}removeFromParent(){let e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),qe.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),qe.multiply(e.parent.matrixWorld)),e.applyMatrix4(qe),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(sr),Ut.child=e,this.dispatchEvent(Ut),Ut.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,i=this.children.length;n<i;n++){let r=this.children[n].getObjectByProperty(e,t);if(r!==void 0)return r}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);let i=this.children;for(let s=0,r=i.length;s<r;s++)i[s].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(sn,e,fo),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(sn,po,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);let t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);let t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);let t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].traverseVisible(e)}traverseAncestors(e){let t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);let t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t){let n=this.parent;if(e===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),t===!0){let i=this.children;for(let s=0,r=i.length;s<r;s++)i[s].updateWorldMatrix(!1,!0)}}toJSON(e){let t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.6,type:"Object",generator:"Object3D.toJSON"});let i={};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.castShadow===!0&&(i.castShadow=!0),this.receiveShadow===!0&&(i.receiveShadow=!0),this.visible===!1&&(i.visible=!1),this.frustumCulled===!1&&(i.frustumCulled=!1),this.renderOrder!==0&&(i.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(i.userData=this.userData),i.layers=this.layers.mask,i.matrix=this.matrix.toArray(),i.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(i.matrixAutoUpdate=!1),this.isInstancedMesh&&(i.type="InstancedMesh",i.count=this.count,i.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(i.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(i.type="BatchedMesh",i.perObjectFrustumCulled=this.perObjectFrustumCulled,i.sortObjects=this.sortObjects,i.drawRanges=this._drawRanges,i.reservedRanges=this._reservedRanges,i.visibility=this._visibility,i.active=this._active,i.bounds=this._bounds.map(o=>({boxInitialized:o.boxInitialized,boxMin:o.box.min.toArray(),boxMax:o.box.max.toArray(),sphereInitialized:o.sphereInitialized,sphereRadius:o.sphere.radius,sphereCenter:o.sphere.center.toArray()})),i.maxInstanceCount=this._maxInstanceCount,i.maxVertexCount=this._maxVertexCount,i.maxIndexCount=this._maxIndexCount,i.geometryInitialized=this._geometryInitialized,i.geometryCount=this._geometryCount,i.matricesTexture=this._matricesTexture.toJSON(e),this._colorsTexture!==null&&(i.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(i.boundingSphere={center:i.boundingSphere.center.toArray(),radius:i.boundingSphere.radius}),this.boundingBox!==null&&(i.boundingBox={min:i.boundingBox.min.toArray(),max:i.boundingBox.max.toArray()}));function s(o,l){return o[l.uuid]===void 0&&(o[l.uuid]=l.toJSON(e)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?i.background=this.background.toJSON():this.background.isTexture&&(i.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(i.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){i.geometry=s(e.geometries,this.geometry);let o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){let l=o.shapes;if(Array.isArray(l))for(let c=0,u=l.length;c<u;c++){let f=l[c];s(e.shapes,f)}else s(e.shapes,l)}}if(this.isSkinnedMesh&&(i.bindMode=this.bindMode,i.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(s(e.skeletons,this.skeleton),i.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let o=[];for(let l=0,c=this.material.length;l<c;l++)o.push(s(e.materials,this.material[l]));i.material=o}else i.material=s(e.materials,this.material);if(this.children.length>0){i.children=[];for(let o=0;o<this.children.length;o++)i.children.push(this.children[o].toJSON(e).object)}if(this.animations.length>0){i.animations=[];for(let o=0;o<this.animations.length;o++){let l=this.animations[o];i.animations.push(s(e.animations,l))}}if(t){let o=r(e.geometries),l=r(e.materials),c=r(e.textures),u=r(e.images),f=r(e.shapes),h=r(e.skeletons),d=r(e.animations),p=r(e.nodes);o.length>0&&(n.geometries=o),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),u.length>0&&(n.images=u),f.length>0&&(n.shapes=f),h.length>0&&(n.skeletons=h),d.length>0&&(n.animations=d),p.length>0&&(n.nodes=p)}return n.object=i,n;function r(o){let l=[];for(let c in o){let u=o[c];delete u.metadata,l.push(u)}return l}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){let i=e.children[n];this.add(i.clone())}return this}};Ae.DEFAULT_UP=new x(0,1,0);Ae.DEFAULT_MATRIX_AUTO_UPDATE=!0;Ae.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var ke=new x,Ze=new x,wi=new x,$e=new x,Nt=new x,Ft=new x,rr=new x,Ti=new x,Ai=new x,Ri=new x,Ci=new un,Pi=new un,Ii=new un,Je=class a{constructor(e=new x,t=new x,n=new x){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,i){i.subVectors(n,t),ke.subVectors(e,t),i.cross(ke);let s=i.lengthSq();return s>0?i.multiplyScalar(1/Math.sqrt(s)):i.set(0,0,0)}static getBarycoord(e,t,n,i,s){ke.subVectors(i,t),Ze.subVectors(n,t),wi.subVectors(e,t);let r=ke.dot(ke),o=ke.dot(Ze),l=ke.dot(wi),c=Ze.dot(Ze),u=Ze.dot(wi),f=r*c-o*o;if(f===0)return s.set(0,0,0),null;let h=1/f,d=(c*l-o*u)*h,p=(r*u-o*l)*h;return s.set(1-d-p,p,d)}static containsPoint(e,t,n,i){return this.getBarycoord(e,t,n,i,$e)===null?!1:$e.x>=0&&$e.y>=0&&$e.x+$e.y<=1}static getInterpolation(e,t,n,i,s,r,o,l){return this.getBarycoord(e,t,n,i,$e)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(s,$e.x),l.addScaledVector(r,$e.y),l.addScaledVector(o,$e.z),l)}static getInterpolatedAttribute(e,t,n,i,s,r){return Ci.setScalar(0),Pi.setScalar(0),Ii.setScalar(0),Ci.fromBufferAttribute(e,t),Pi.fromBufferAttribute(e,n),Ii.fromBufferAttribute(e,i),r.setScalar(0),r.addScaledVector(Ci,s.x),r.addScaledVector(Pi,s.y),r.addScaledVector(Ii,s.z),r}static isFrontFacing(e,t,n,i){return ke.subVectors(n,t),Ze.subVectors(e,t),ke.cross(Ze).dot(i)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,i){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[i]),this}setFromAttributeAndIndices(e,t,n,i){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,i),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return ke.subVectors(this.c,this.b),Ze.subVectors(this.a,this.b),ke.cross(Ze).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return a.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return a.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,n,i,s){return a.getInterpolation(e,this.a,this.b,this.c,t,n,i,s)}containsPoint(e){return a.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return a.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){let n=this.a,i=this.b,s=this.c,r,o;Nt.subVectors(i,n),Ft.subVectors(s,n),Ti.subVectors(e,n);let l=Nt.dot(Ti),c=Ft.dot(Ti);if(l<=0&&c<=0)return t.copy(n);Ai.subVectors(e,i);let u=Nt.dot(Ai),f=Ft.dot(Ai);if(u>=0&&f<=u)return t.copy(i);let h=l*f-u*c;if(h<=0&&l>=0&&u<=0)return r=l/(l-u),t.copy(n).addScaledVector(Nt,r);Ri.subVectors(e,s);let d=Nt.dot(Ri),p=Ft.dot(Ri);if(p>=0&&d<=p)return t.copy(s);let m=d*c-l*p;if(m<=0&&c>=0&&p<=0)return o=c/(c-p),t.copy(n).addScaledVector(Ft,o);let g=u*p-d*f;if(g<=0&&f-u>=0&&d-p>=0)return rr.subVectors(s,i),o=(f-u)/(f-u+(d-p)),t.copy(i).addScaledVector(rr,o);let _=1/(g+m+h);return r=m*_,o=h*_,t.copy(n).addScaledVector(Nt,r).addScaledVector(Ft,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}},Er={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},rt={h:0,s:0,l:0},Ln={h:0,s:0,l:0};function Li(a,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?a+(e-a)*6*t:t<1/2?e:t<2/3?a+(e-a)*6*(2/3-t):a}var te=class{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){let i=e;i&&i.isColor?this.copy(i):typeof i=="number"?this.setHex(i):typeof i=="string"&&this.setStyle(i)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=He){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,Ue.toWorkingColorSpace(this,t),this}setRGB(e,t,n,i=Ue.workingColorSpace){return this.r=e,this.g=t,this.b=n,Ue.toWorkingColorSpace(this,i),this}setHSL(e,t,n,i=Ue.workingColorSpace){if(e=io(e,1),t=he(t,0,1),n=he(n,0,1),t===0)this.r=this.g=this.b=n;else{let s=n<=.5?n*(1+t):n+t-n*t,r=2*n-s;this.r=Li(r,s,e+1/3),this.g=Li(r,s,e),this.b=Li(r,s,e-1/3)}return Ue.toWorkingColorSpace(this,i),this}setStyle(e,t=He){function n(s){s!==void 0&&parseFloat(s)<1&&console.warn("THREE.Color: Alpha component of "+e+" will be ignored.")}let i;if(i=/^(\w+)\(([^\)]*)\)/.exec(e)){let s,r=i[1],o=i[2];switch(r){case"rgb":case"rgba":if(s=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(s[4]),this.setRGB(Math.min(255,parseInt(s[1],10))/255,Math.min(255,parseInt(s[2],10))/255,Math.min(255,parseInt(s[3],10))/255,t);if(s=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(s[4]),this.setRGB(Math.min(100,parseInt(s[1],10))/100,Math.min(100,parseInt(s[2],10))/100,Math.min(100,parseInt(s[3],10))/100,t);break;case"hsl":case"hsla":if(s=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(s[4]),this.setHSL(parseFloat(s[1])/360,parseFloat(s[2])/100,parseFloat(s[3])/100,t);break;default:console.warn("THREE.Color: Unknown color model "+e)}}else if(i=/^\#([A-Fa-f\d]+)$/.exec(e)){let s=i[1],r=s.length;if(r===3)return this.setRGB(parseInt(s.charAt(0),16)/15,parseInt(s.charAt(1),16)/15,parseInt(s.charAt(2),16)/15,t);if(r===6)return this.setHex(parseInt(s,16),t);console.warn("THREE.Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=He){let n=Er[e.toLowerCase()];return n!==void 0?this.setHex(n,t):console.warn("THREE.Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=Ht(e.r),this.g=Ht(e.g),this.b=Ht(e.b),this}copyLinearToSRGB(e){return this.r=gi(e.r),this.g=gi(e.g),this.b=gi(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=He){return Ue.fromWorkingColorSpace(xe.copy(this),e),Math.round(he(xe.r*255,0,255))*65536+Math.round(he(xe.g*255,0,255))*256+Math.round(he(xe.b*255,0,255))}getHexString(e=He){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=Ue.workingColorSpace){Ue.fromWorkingColorSpace(xe.copy(this),t);let n=xe.r,i=xe.g,s=xe.b,r=Math.max(n,i,s),o=Math.min(n,i,s),l,c,u=(o+r)/2;if(o===r)l=0,c=0;else{let f=r-o;switch(c=u<=.5?f/(r+o):f/(2-r-o),r){case n:l=(i-s)/f+(i<s?6:0);break;case i:l=(s-n)/f+2;break;case s:l=(n-i)/f+4;break}l/=6}return e.h=l,e.s=c,e.l=u,e}getRGB(e,t=Ue.workingColorSpace){return Ue.fromWorkingColorSpace(xe.copy(this),t),e.r=xe.r,e.g=xe.g,e.b=xe.b,e}getStyle(e=He){Ue.fromWorkingColorSpace(xe.copy(this),e);let t=xe.r,n=xe.g,i=xe.b;return e!==He?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${i.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(i*255)})`}offsetHSL(e,t,n){return this.getHSL(rt),this.setHSL(rt.h+e,rt.s+t,rt.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(rt),e.getHSL(Ln);let n=pi(rt.h,Ln.h,t),i=pi(rt.s,Ln.s,t),s=pi(rt.l,Ln.l,t);return this.setHSL(n,i,s),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){let t=this.r,n=this.g,i=this.b,s=e.elements;return this.r=s[0]*t+s[3]*n+s[6]*i,this.g=s[1]*t+s[4]*n+s[7]*i,this.b=s[2]*t+s[5]*n+s[8]*i,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},xe=new te;te.NAMES=Er;var go=0,Xt=class extends Vt{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:go++}),this.uuid=Jt(),this.name="",this.type="Material",this.blending=Ts,this.side=zi,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Rs,this.blendDst=Cs,this.blendEquation=As,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new te(0,0,0),this.blendAlpha=0,this.depthFunc=qn,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Xs,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=At,this.stencilZFail=At,this.stencilZPass=At,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(let t in e){let n=e[t];if(n===void 0){console.warn(`THREE.Material: parameter '${t}' has value of undefined.`);continue}let i=this[t];if(i===void 0){console.warn(`THREE.Material: '${t}' is not a property of THREE.${this.type}.`);continue}i&&i.isColor?i.set(n):i&&i.isVector3&&n&&n.isVector3?i.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});let n={metadata:{version:4.6,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==Ts&&(n.blending=this.blending),this.side!==zi&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==Rs&&(n.blendSrc=this.blendSrc),this.blendDst!==Cs&&(n.blendDst=this.blendDst),this.blendEquation!==As&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==qn&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Xs&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==At&&(n.stencilFail=this.stencilFail),this.stencilZFail!==At&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==At&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function i(s){let r=[];for(let o in s){let l=s[o];delete l.metadata,r.push(l)}return r}if(t){let s=i(e.textures),r=i(e.images);s.length>0&&(n.textures=s),r.length>0&&(n.images=r)}return n}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;let t=e.clippingPlanes,n=null;if(t!==null){let i=t.length;n=new Array(i);for(let s=0;s!==i;++s)n[s]=t[s].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}onBuild(){console.warn("Material: onBuild() has been removed.")}},_t=class extends Xt{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new te(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Wt,this.combine=Kr,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}};var ce=new x,Dn=new R,Ke=class{constructor(e,t,n=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=Ys,this.updateRanges=[],this.gpuType=Mr,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let i=0,s=this.itemSize;i<s;i++)this.array[e+i]=t.array[n+i];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)Dn.fromBufferAttribute(this,t),Dn.applyMatrix3(e),this.setXY(t,Dn.x,Dn.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)ce.fromBufferAttribute(this,t),ce.applyMatrix3(e),this.setXYZ(t,ce.x,ce.y,ce.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)ce.fromBufferAttribute(this,t),ce.applyMatrix4(e),this.setXYZ(t,ce.x,ce.y,ce.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)ce.fromBufferAttribute(this,t),ce.applyNormalMatrix(e),this.setXYZ(t,ce.x,ce.y,ce.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)ce.fromBufferAttribute(this,t),ce.transformDirection(e),this.setXYZ(t,ce.x,ce.y,ce.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=Qt(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=Me(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=Qt(t,this.array)),t}setX(e,t){return this.normalized&&(t=Me(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=Qt(t,this.array)),t}setY(e,t){return this.normalized&&(t=Me(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=Qt(t,this.array)),t}setZ(e,t){return this.normalized&&(t=Me(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=Qt(t,this.array)),t}setW(e,t){return this.normalized&&(t=Me(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=Me(t,this.array),n=Me(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,i){return e*=this.itemSize,this.normalized&&(t=Me(t,this.array),n=Me(n,this.array),i=Me(i,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=i,this}setXYZW(e,t,n,i,s){return e*=this.itemSize,this.normalized&&(t=Me(t,this.array),n=Me(n,this.array),i=Me(i,this.array),s=Me(s,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=i,this.array[e+3]=s,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==Ys&&(e.usage=this.usage),e}};var Yi=class extends Ke{constructor(e,t,n){super(new Uint16Array(e),t,n)}};var qi=class extends Ke{constructor(e,t,n){super(new Uint32Array(e),t,n)}};var J=class extends Ke{constructor(e,t,n){super(new Float32Array(e),t,n)}},_o=0,Pe=new me,Di=new Ae,kt=new x,Te=new Ie,rn=new Ie,pe=new x,Re=class a extends Vt{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:_o++}),this.uuid=Jt(),this.name="",this.type="BufferGeometry",this.index=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(so(e)?qi:Yi)(e,1):this.index=e,this}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){let t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);let n=this.attributes.normal;if(n!==void 0){let s=new z().getNormalMatrix(e);n.applyNormalMatrix(s),n.needsUpdate=!0}let i=this.attributes.tangent;return i!==void 0&&(i.transformDirection(e),i.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return Pe.makeRotationFromQuaternion(e),this.applyMatrix4(Pe),this}rotateX(e){return Pe.makeRotationX(e),this.applyMatrix4(Pe),this}rotateY(e){return Pe.makeRotationY(e),this.applyMatrix4(Pe),this}rotateZ(e){return Pe.makeRotationZ(e),this.applyMatrix4(Pe),this}translate(e,t,n){return Pe.makeTranslation(e,t,n),this.applyMatrix4(Pe),this}scale(e,t,n){return Pe.makeScale(e,t,n),this.applyMatrix4(Pe),this}lookAt(e){return Di.lookAt(e),Di.updateMatrix(),this.applyMatrix4(Di.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(kt).negate(),this.translate(kt.x,kt.y,kt.z),this}setFromPoints(e){let t=[];for(let n=0,i=e.length;n<i;n++){let s=e[n];t.push(s.x,s.y,s.z||0)}return this.setAttribute("position",new J(t,3)),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Ie);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new x(-1/0,-1/0,-1/0),new x(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,i=t.length;n<i;n++){let s=t[n];Te.setFromBufferAttribute(s),this.morphTargetsRelative?(pe.addVectors(this.boundingBox.min,Te.min),this.boundingBox.expandByPoint(pe),pe.addVectors(this.boundingBox.max,Te.max),this.boundingBox.expandByPoint(pe)):(this.boundingBox.expandByPoint(Te.min),this.boundingBox.expandByPoint(Te.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Gt);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new x,1/0);return}if(e){let n=this.boundingSphere.center;if(Te.setFromBufferAttribute(e),t)for(let s=0,r=t.length;s<r;s++){let o=t[s];rn.setFromBufferAttribute(o),this.morphTargetsRelative?(pe.addVectors(Te.min,rn.min),Te.expandByPoint(pe),pe.addVectors(Te.max,rn.max),Te.expandByPoint(pe)):(Te.expandByPoint(rn.min),Te.expandByPoint(rn.max))}Te.getCenter(n);let i=0;for(let s=0,r=e.count;s<r;s++)pe.fromBufferAttribute(e,s),i=Math.max(i,n.distanceToSquared(pe));if(t)for(let s=0,r=t.length;s<r;s++){let o=t[s],l=this.morphTargetsRelative;for(let c=0,u=o.count;c<u;c++)pe.fromBufferAttribute(o,c),l&&(kt.fromBufferAttribute(e,c),pe.add(kt)),i=Math.max(i,n.distanceToSquared(pe))}this.boundingSphere.radius=Math.sqrt(i),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let n=t.position,i=t.normal,s=t.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new Ke(new Float32Array(4*n.count),4));let r=this.getAttribute("tangent"),o=[],l=[];for(let E=0;E<n.count;E++)o[E]=new x,l[E]=new x;let c=new x,u=new x,f=new x,h=new R,d=new R,p=new R,m=new x,g=new x;function _(E,U,L){c.fromBufferAttribute(n,E),u.fromBufferAttribute(n,U),f.fromBufferAttribute(n,L),h.fromBufferAttribute(s,E),d.fromBufferAttribute(s,U),p.fromBufferAttribute(s,L),u.sub(c),f.sub(c),d.sub(h),p.sub(h);let D=1/(d.x*p.y-p.x*d.y);isFinite(D)&&(m.copy(u).multiplyScalar(p.y).addScaledVector(f,-d.y).multiplyScalar(D),g.copy(f).multiplyScalar(d.x).addScaledVector(u,-p.x).multiplyScalar(D),o[E].add(m),o[U].add(m),o[L].add(m),l[E].add(g),l[U].add(g),l[L].add(g))}let M=this.groups;M.length===0&&(M=[{start:0,count:e.count}]);for(let E=0,U=M.length;E<U;++E){let L=M[E],D=L.start,V=L.count;for(let k=D,O=D+V;k<O;k+=3)_(e.getX(k+0),e.getX(k+1),e.getX(k+2))}let y=new x,v=new x,b=new x,S=new x;function w(E){b.fromBufferAttribute(i,E),S.copy(b);let U=o[E];y.copy(U),y.sub(b.multiplyScalar(b.dot(U))).normalize(),v.crossVectors(S,U);let D=v.dot(l[E])<0?-1:1;r.setXYZW(E,y.x,y.y,y.z,D)}for(let E=0,U=M.length;E<U;++E){let L=M[E],D=L.start,V=L.count;for(let k=D,O=D+V;k<O;k+=3)w(e.getX(k+0)),w(e.getX(k+1)),w(e.getX(k+2))}}computeVertexNormals(){let e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new Ke(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let h=0,d=n.count;h<d;h++)n.setXYZ(h,0,0,0);let i=new x,s=new x,r=new x,o=new x,l=new x,c=new x,u=new x,f=new x;if(e)for(let h=0,d=e.count;h<d;h+=3){let p=e.getX(h+0),m=e.getX(h+1),g=e.getX(h+2);i.fromBufferAttribute(t,p),s.fromBufferAttribute(t,m),r.fromBufferAttribute(t,g),u.subVectors(r,s),f.subVectors(i,s),u.cross(f),o.fromBufferAttribute(n,p),l.fromBufferAttribute(n,m),c.fromBufferAttribute(n,g),o.add(u),l.add(u),c.add(u),n.setXYZ(p,o.x,o.y,o.z),n.setXYZ(m,l.x,l.y,l.z),n.setXYZ(g,c.x,c.y,c.z)}else for(let h=0,d=t.count;h<d;h+=3)i.fromBufferAttribute(t,h+0),s.fromBufferAttribute(t,h+1),r.fromBufferAttribute(t,h+2),u.subVectors(r,s),f.subVectors(i,s),u.cross(f),n.setXYZ(h+0,u.x,u.y,u.z),n.setXYZ(h+1,u.x,u.y,u.z),n.setXYZ(h+2,u.x,u.y,u.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){let e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)pe.fromBufferAttribute(e,t),pe.normalize(),e.setXYZ(t,pe.x,pe.y,pe.z)}toNonIndexed(){function e(o,l){let c=o.array,u=o.itemSize,f=o.normalized,h=new c.constructor(l.length*u),d=0,p=0;for(let m=0,g=l.length;m<g;m++){o.isInterleavedBufferAttribute?d=l[m]*o.data.stride+o.offset:d=l[m]*u;for(let _=0;_<u;_++)h[p++]=c[d++]}return new Ke(h,u,f)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let t=new a,n=this.index.array,i=this.attributes;for(let o in i){let l=i[o],c=e(l,n);t.setAttribute(o,c)}let s=this.morphAttributes;for(let o in s){let l=[],c=s[o];for(let u=0,f=c.length;u<f;u++){let h=c[u],d=e(h,n);l.push(d)}t.morphAttributes[o]=l}t.morphTargetsRelative=this.morphTargetsRelative;let r=this.groups;for(let o=0,l=r.length;o<l;o++){let c=r[o];t.addGroup(c.start,c.count,c.materialIndex)}return t}toJSON(){let e={metadata:{version:4.6,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){let l=this.parameters;for(let c in l)l[c]!==void 0&&(e[c]=l[c]);return e}e.data={attributes:{}};let t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});let n=this.attributes;for(let l in n){let c=n[l];e.data.attributes[l]=c.toJSON(e.data)}let i={},s=!1;for(let l in this.morphAttributes){let c=this.morphAttributes[l],u=[];for(let f=0,h=c.length;f<h;f++){let d=c[f];u.push(d.toJSON(e.data))}u.length>0&&(i[l]=u,s=!0)}s&&(e.data.morphAttributes=i,e.data.morphTargetsRelative=this.morphTargetsRelative);let r=this.groups;r.length>0&&(e.data.groups=JSON.parse(JSON.stringify(r)));let o=this.boundingSphere;return o!==null&&(e.data.boundingSphere={center:o.center.toArray(),radius:o.radius}),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let t={};this.name=e.name;let n=e.index;n!==null&&this.setIndex(n.clone(t));let i=e.attributes;for(let c in i){let u=i[c];this.setAttribute(c,u.clone(t))}let s=e.morphAttributes;for(let c in s){let u=[],f=s[c];for(let h=0,d=f.length;h<d;h++)u.push(f[h].clone(t));this.morphAttributes[c]=u}this.morphTargetsRelative=e.morphTargetsRelative;let r=e.groups;for(let c=0,u=r.length;c<u;c++){let f=r[c];this.addGroup(f.start,f.count,f.materialIndex)}let o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());let l=e.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}},or=new me,pt=new Wi,Un=new Gt,ar=new x,Nn=new x,Fn=new x,kn=new x,Ui=new x,On=new x,lr=new x,zn=new x,ue=class extends Ae{constructor(e=new Re,t=new _t){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){let t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){let i=t[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,r=i.length;s<r;s++){let o=i[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=s}}}}getVertexPosition(e,t){let n=this.geometry,i=n.attributes.position,s=n.morphAttributes.position,r=n.morphTargetsRelative;t.fromBufferAttribute(i,e);let o=this.morphTargetInfluences;if(s&&o){On.set(0,0,0);for(let l=0,c=s.length;l<c;l++){let u=o[l],f=s[l];u!==0&&(Ui.fromBufferAttribute(f,e),r?On.addScaledVector(Ui,u):On.addScaledVector(Ui.sub(t),u))}t.add(On)}return t}raycast(e,t){let n=this.geometry,i=this.material,s=this.matrixWorld;i!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),Un.copy(n.boundingSphere),Un.applyMatrix4(s),pt.copy(e.ray).recast(e.near),!(Un.containsPoint(pt.origin)===!1&&(pt.intersectSphere(Un,ar)===null||pt.origin.distanceToSquared(ar)>(e.far-e.near)**2))&&(or.copy(s).invert(),pt.copy(e.ray).applyMatrix4(or),!(n.boundingBox!==null&&pt.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,pt)))}_computeIntersections(e,t,n){let i,s=this.geometry,r=this.material,o=s.index,l=s.attributes.position,c=s.attributes.uv,u=s.attributes.uv1,f=s.attributes.normal,h=s.groups,d=s.drawRange;if(o!==null)if(Array.isArray(r))for(let p=0,m=h.length;p<m;p++){let g=h[p],_=r[g.materialIndex],M=Math.max(g.start,d.start),y=Math.min(o.count,Math.min(g.start+g.count,d.start+d.count));for(let v=M,b=y;v<b;v+=3){let S=o.getX(v),w=o.getX(v+1),E=o.getX(v+2);i=Bn(this,_,e,n,c,u,f,S,w,E),i&&(i.faceIndex=Math.floor(v/3),i.face.materialIndex=g.materialIndex,t.push(i))}}else{let p=Math.max(0,d.start),m=Math.min(o.count,d.start+d.count);for(let g=p,_=m;g<_;g+=3){let M=o.getX(g),y=o.getX(g+1),v=o.getX(g+2);i=Bn(this,r,e,n,c,u,f,M,y,v),i&&(i.faceIndex=Math.floor(g/3),t.push(i))}}else if(l!==void 0)if(Array.isArray(r))for(let p=0,m=h.length;p<m;p++){let g=h[p],_=r[g.materialIndex],M=Math.max(g.start,d.start),y=Math.min(l.count,Math.min(g.start+g.count,d.start+d.count));for(let v=M,b=y;v<b;v+=3){let S=v,w=v+1,E=v+2;i=Bn(this,_,e,n,c,u,f,S,w,E),i&&(i.faceIndex=Math.floor(v/3),i.face.materialIndex=g.materialIndex,t.push(i))}}else{let p=Math.max(0,d.start),m=Math.min(l.count,d.start+d.count);for(let g=p,_=m;g<_;g+=3){let M=g,y=g+1,v=g+2;i=Bn(this,r,e,n,c,u,f,M,y,v),i&&(i.faceIndex=Math.floor(g/3),t.push(i))}}}};function xo(a,e,t,n,i,s,r,o){let l;if(e.side===Jr?l=n.intersectTriangle(r,s,i,!0,o):l=n.intersectTriangle(i,s,r,e.side===zi,o),l===null)return null;zn.copy(o),zn.applyMatrix4(a.matrixWorld);let c=t.ray.origin.distanceTo(zn);return c<t.near||c>t.far?null:{distance:c,point:zn.clone(),object:a}}function Bn(a,e,t,n,i,s,r,o,l,c){a.getVertexPosition(o,Nn),a.getVertexPosition(l,Fn),a.getVertexPosition(c,kn);let u=xo(a,e,t,n,Nn,Fn,kn,lr);if(u){let f=new x;Je.getBarycoord(lr,Nn,Fn,kn,f),i&&(u.uv=Je.getInterpolatedAttribute(i,o,l,c,f,new R)),s&&(u.uv1=Je.getInterpolatedAttribute(s,o,l,c,f,new R)),r&&(u.normal=Je.getInterpolatedAttribute(r,o,l,c,f,new x),u.normal.dot(n.direction)>0&&u.normal.multiplyScalar(-1));let h={a:o,b:l,c,normal:new x,materialIndex:0};Je.getNormal(Nn,Fn,kn,h.normal),u.face=h,u.barycoord=f}return u}var je=class a extends Re{constructor(e=1,t=1,n=1,i=1,s=1,r=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:i,heightSegments:s,depthSegments:r};let o=this;i=Math.floor(i),s=Math.floor(s),r=Math.floor(r);let l=[],c=[],u=[],f=[],h=0,d=0;p("z","y","x",-1,-1,n,t,e,r,s,0),p("z","y","x",1,-1,n,t,-e,r,s,1),p("x","z","y",1,1,e,n,t,i,r,2),p("x","z","y",1,-1,e,n,-t,i,r,3),p("x","y","z",1,-1,e,t,n,i,s,4),p("x","y","z",-1,-1,e,t,-n,i,s,5),this.setIndex(l),this.setAttribute("position",new J(c,3)),this.setAttribute("normal",new J(u,3)),this.setAttribute("uv",new J(f,2));function p(m,g,_,M,y,v,b,S,w,E,U){let L=v/w,D=b/E,V=v/2,k=b/2,O=S/2,$=w+1,Y=E+1,re=0,be=0,q=new x;for(let Q=0;Q<Y;Q++){let ne=Q*D-k;for(let ve=0;ve<$;ve++){let Be=ve*L-V;q[m]=Be*M,q[g]=ne*y,q[_]=O,c.push(q.x,q.y,q.z),q[m]=0,q[g]=0,q[_]=S>0?1:-1,u.push(q.x,q.y,q.z),f.push(ve/w),f.push(1-Q/E),re+=1}}for(let Q=0;Q<E;Q++)for(let ne=0;ne<w;ne++){let ve=h+ne+$*Q,Be=h+ne+$*(Q+1),Kt=h+(ne+1)+$*(Q+1),ht=h+(ne+1)+$*Q;l.push(ve,Be,ht),l.push(Be,Kt,ht),be+=6}o.addGroup(d,be,U),d+=be,h+=re}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new a(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}};function vo(a){let e={};for(let t in a){e[t]={};for(let n in a[t]){let i=a[t][n];i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)?i.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][n]=null):e[t][n]=i.clone():Array.isArray(i)?e[t][n]=i.slice():e[t][n]=i}}return e}function ye(a){let e={};for(let t=0;t<a.length;t++){let n=vo(a[t]);for(let i in n)e[i]=n[i]}return e}var Ni=new x,Mo=new x,yo=new z,Jn=class{constructor(e=new x(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,i){return this.normal.set(e,t,n),this.constant=i,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){let i=Ni.subVectors(n,t).cross(Mo.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(i,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){let e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){let n=e.delta(Ni),i=this.normal.dot(n);if(i===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;let s=-(e.start.dot(this.normal)+this.constant)/i;return s<0||s>1?null:t.copy(e.start).addScaledVector(n,s)}intersectsLine(e){let t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){let n=t||yo.getNormalMatrix(e),i=this.coplanarPoint(Ni).applyMatrix4(e),s=this.normal.applyMatrix3(n).normalize();return this.constant=-i.dot(s),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}};var bo=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,So=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,Eo=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,wo=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,To=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Ao=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Ro=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,Co=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Po=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec3 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 ).rgb;
	}
#endif`,Io=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Lo=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Do=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Uo=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,No=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,Fo=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,ko=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,Oo=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,zo=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Bo=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Ho=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,Vo=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,Go=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,Wo=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif
#ifdef USE_BATCHING_COLOR
	vec3 batchingColor = getBatchingColor( getIndirectIndex( gl_DrawID ) );
	vColor.xyz *= batchingColor.xyz;
#endif`,Xo=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,Yo=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,qo=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,Zo=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,$o=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Jo=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Ko=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,jo="gl_FragColor = linearToOutputTexel( gl_FragColor );",Qo=`
const mat3 LINEAR_SRGB_TO_LINEAR_DISPLAY_P3 = mat3(
	vec3( 0.8224621, 0.177538, 0.0 ),
	vec3( 0.0331941, 0.9668058, 0.0 ),
	vec3( 0.0170827, 0.0723974, 0.9105199 )
);
const mat3 LINEAR_DISPLAY_P3_TO_LINEAR_SRGB = mat3(
	vec3( 1.2249401, - 0.2249404, 0.0 ),
	vec3( - 0.0420569, 1.0420571, 0.0 ),
	vec3( - 0.0196376, - 0.0786361, 1.0982735 )
);
vec4 LinearSRGBToLinearDisplayP3( in vec4 value ) {
	return vec4( value.rgb * LINEAR_SRGB_TO_LINEAR_DISPLAY_P3, value.a );
}
vec4 LinearDisplayP3ToLinearSRGB( in vec4 value ) {
	return vec4( value.rgb * LINEAR_DISPLAY_P3_TO_LINEAR_SRGB, value.a );
}
vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,ea=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,ta=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,na=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,ia=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,sa=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,ra=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,oa=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,aa=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,la=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,ca=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,ha=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,ua=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,fa=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,da=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,pa=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,ma=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,ga=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,_a=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,xa=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,va=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,Ma=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,ya=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,ba=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,Sa=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Ea=`#if defined( USE_LOGDEPTHBUF )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,wa=`#if defined( USE_LOGDEPTHBUF )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Ta=`#ifdef USE_LOGDEPTHBUF
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Aa=`#ifdef USE_LOGDEPTHBUF
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,Ra=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = vec4( mix( pow( sampledDiffuseColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), sampledDiffuseColor.rgb * 0.0773993808, vec3( lessThanEqual( sampledDiffuseColor.rgb, vec3( 0.04045 ) ) ) ), sampledDiffuseColor.w );
	
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Ca=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Pa=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,Ia=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,La=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Da=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Ua=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,Na=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Fa=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,ka=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,Oa=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,za=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,Ba=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,Ha=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Va=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Ga=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,Wa=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,Xa=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Ya=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,qa=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Za=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,$a=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Ja=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,Ka=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,ja=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Qa=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,el=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,tl=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,nl=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,il=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		return step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow (sampler2D shadow, vec2 uv, float compare ){
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		float hard_shadow = step( compare , distribution.x );
		if (hard_shadow != 1.0 ) {
			float distance = compare - distribution.x ;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		
		float lightToPositionLength = length( lightToPosition );
		if ( lightToPositionLength - shadowCameraFar <= 0.0 && lightToPositionLength - shadowCameraNear >= 0.0 ) {
			float dp = ( lightToPositionLength - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
			#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
				vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
				shadow = (
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
				) * ( 1.0 / 9.0 );
			#else
				shadow = texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
			#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
#endif`,sl=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,rl=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,ol=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,al=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,ll=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,cl=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,hl=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,ul=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,fl=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,dl=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,pl=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,ml=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,gl=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
		
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
		
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		
		#else
		
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,_l=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,xl=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,vl=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,Ml=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,yl=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,bl=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Sl=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,El=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,wl=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Tl=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Al=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,Rl=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,Cl=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,Pl=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,Il=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Ll=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Dl=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Ul=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Nl=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,Fl=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,kl=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Ol=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,zl=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,Bl=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Hl=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,Vl=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,Gl=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Wl=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Xl=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,Yl=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,ql=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Zl=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,$l=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,Jl=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Kl=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,jl=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Ql=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,ec=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,H={alphahash_fragment:bo,alphahash_pars_fragment:So,alphamap_fragment:Eo,alphamap_pars_fragment:wo,alphatest_fragment:To,alphatest_pars_fragment:Ao,aomap_fragment:Ro,aomap_pars_fragment:Co,batching_pars_vertex:Po,batching_vertex:Io,begin_vertex:Lo,beginnormal_vertex:Do,bsdfs:Uo,iridescence_fragment:No,bumpmap_pars_fragment:Fo,clipping_planes_fragment:ko,clipping_planes_pars_fragment:Oo,clipping_planes_pars_vertex:zo,clipping_planes_vertex:Bo,color_fragment:Ho,color_pars_fragment:Vo,color_pars_vertex:Go,color_vertex:Wo,common:Xo,cube_uv_reflection_fragment:Yo,defaultnormal_vertex:qo,displacementmap_pars_vertex:Zo,displacementmap_vertex:$o,emissivemap_fragment:Jo,emissivemap_pars_fragment:Ko,colorspace_fragment:jo,colorspace_pars_fragment:Qo,envmap_fragment:ea,envmap_common_pars_fragment:ta,envmap_pars_fragment:na,envmap_pars_vertex:ia,envmap_physical_pars_fragment:pa,envmap_vertex:sa,fog_vertex:ra,fog_pars_vertex:oa,fog_fragment:aa,fog_pars_fragment:la,gradientmap_pars_fragment:ca,lightmap_pars_fragment:ha,lights_lambert_fragment:ua,lights_lambert_pars_fragment:fa,lights_pars_begin:da,lights_toon_fragment:ma,lights_toon_pars_fragment:ga,lights_phong_fragment:_a,lights_phong_pars_fragment:xa,lights_physical_fragment:va,lights_physical_pars_fragment:Ma,lights_fragment_begin:ya,lights_fragment_maps:ba,lights_fragment_end:Sa,logdepthbuf_fragment:Ea,logdepthbuf_pars_fragment:wa,logdepthbuf_pars_vertex:Ta,logdepthbuf_vertex:Aa,map_fragment:Ra,map_pars_fragment:Ca,map_particle_fragment:Pa,map_particle_pars_fragment:Ia,metalnessmap_fragment:La,metalnessmap_pars_fragment:Da,morphinstance_vertex:Ua,morphcolor_vertex:Na,morphnormal_vertex:Fa,morphtarget_pars_vertex:ka,morphtarget_vertex:Oa,normal_fragment_begin:za,normal_fragment_maps:Ba,normal_pars_fragment:Ha,normal_pars_vertex:Va,normal_vertex:Ga,normalmap_pars_fragment:Wa,clearcoat_normal_fragment_begin:Xa,clearcoat_normal_fragment_maps:Ya,clearcoat_pars_fragment:qa,iridescence_pars_fragment:Za,opaque_fragment:$a,packing:Ja,premultiplied_alpha_fragment:Ka,project_vertex:ja,dithering_fragment:Qa,dithering_pars_fragment:el,roughnessmap_fragment:tl,roughnessmap_pars_fragment:nl,shadowmap_pars_fragment:il,shadowmap_pars_vertex:sl,shadowmap_vertex:rl,shadowmask_pars_fragment:ol,skinbase_vertex:al,skinning_pars_vertex:ll,skinning_vertex:cl,skinnormal_vertex:hl,specularmap_fragment:ul,specularmap_pars_fragment:fl,tonemapping_fragment:dl,tonemapping_pars_fragment:pl,transmission_fragment:ml,transmission_pars_fragment:gl,uv_pars_fragment:_l,uv_pars_vertex:xl,uv_vertex:vl,worldpos_vertex:Ml,background_vert:yl,background_frag:bl,backgroundCube_vert:Sl,backgroundCube_frag:El,cube_vert:wl,cube_frag:Tl,depth_vert:Al,depth_frag:Rl,distanceRGBA_vert:Cl,distanceRGBA_frag:Pl,equirect_vert:Il,equirect_frag:Ll,linedashed_vert:Dl,linedashed_frag:Ul,meshbasic_vert:Nl,meshbasic_frag:Fl,meshlambert_vert:kl,meshlambert_frag:Ol,meshmatcap_vert:zl,meshmatcap_frag:Bl,meshnormal_vert:Hl,meshnormal_frag:Vl,meshphong_vert:Gl,meshphong_frag:Wl,meshphysical_vert:Xl,meshphysical_frag:Yl,meshtoon_vert:ql,meshtoon_frag:Zl,points_vert:$l,points_frag:Jl,shadow_vert:Kl,shadow_frag:jl,sprite_vert:Ql,sprite_frag:ec},A={common:{diffuse:{value:new te(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new z},alphaMap:{value:null},alphaMapTransform:{value:new z},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new z}},envmap:{envMap:{value:null},envMapRotation:{value:new z},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new z}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new z}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new z},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new z},normalScale:{value:new R(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new z},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new z}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new z}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new z}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new te(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new te(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new z},alphaTest:{value:0},uvTransform:{value:new z}},sprite:{diffuse:{value:new te(16777215)},opacity:{value:1},center:{value:new R(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new z},alphaMap:{value:null},alphaMapTransform:{value:new z},alphaTest:{value:0}}},cr={basic:{uniforms:ye([A.common,A.specularmap,A.envmap,A.aomap,A.lightmap,A.fog]),vertexShader:H.meshbasic_vert,fragmentShader:H.meshbasic_frag},lambert:{uniforms:ye([A.common,A.specularmap,A.envmap,A.aomap,A.lightmap,A.emissivemap,A.bumpmap,A.normalmap,A.displacementmap,A.fog,A.lights,{emissive:{value:new te(0)}}]),vertexShader:H.meshlambert_vert,fragmentShader:H.meshlambert_frag},phong:{uniforms:ye([A.common,A.specularmap,A.envmap,A.aomap,A.lightmap,A.emissivemap,A.bumpmap,A.normalmap,A.displacementmap,A.fog,A.lights,{emissive:{value:new te(0)},specular:{value:new te(1118481)},shininess:{value:30}}]),vertexShader:H.meshphong_vert,fragmentShader:H.meshphong_frag},standard:{uniforms:ye([A.common,A.envmap,A.aomap,A.lightmap,A.emissivemap,A.bumpmap,A.normalmap,A.displacementmap,A.roughnessmap,A.metalnessmap,A.fog,A.lights,{emissive:{value:new te(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:H.meshphysical_vert,fragmentShader:H.meshphysical_frag},toon:{uniforms:ye([A.common,A.aomap,A.lightmap,A.emissivemap,A.bumpmap,A.normalmap,A.displacementmap,A.gradientmap,A.fog,A.lights,{emissive:{value:new te(0)}}]),vertexShader:H.meshtoon_vert,fragmentShader:H.meshtoon_frag},matcap:{uniforms:ye([A.common,A.bumpmap,A.normalmap,A.displacementmap,A.fog,{matcap:{value:null}}]),vertexShader:H.meshmatcap_vert,fragmentShader:H.meshmatcap_frag},points:{uniforms:ye([A.points,A.fog]),vertexShader:H.points_vert,fragmentShader:H.points_frag},dashed:{uniforms:ye([A.common,A.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:H.linedashed_vert,fragmentShader:H.linedashed_frag},depth:{uniforms:ye([A.common,A.displacementmap]),vertexShader:H.depth_vert,fragmentShader:H.depth_frag},normal:{uniforms:ye([A.common,A.bumpmap,A.normalmap,A.displacementmap,{opacity:{value:1}}]),vertexShader:H.meshnormal_vert,fragmentShader:H.meshnormal_frag},sprite:{uniforms:ye([A.sprite,A.fog]),vertexShader:H.sprite_vert,fragmentShader:H.sprite_frag},background:{uniforms:{uvTransform:{value:new z},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:H.background_vert,fragmentShader:H.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new z}},vertexShader:H.backgroundCube_vert,fragmentShader:H.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:H.cube_vert,fragmentShader:H.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:H.equirect_vert,fragmentShader:H.equirect_frag},distanceRGBA:{uniforms:ye([A.common,A.displacementmap,{referencePosition:{value:new x},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:H.distanceRGBA_vert,fragmentShader:H.distanceRGBA_frag},shadow:{uniforms:ye([A.lights,A.fog,{color:{value:new te(0)},opacity:{value:1}}]),vertexShader:H.shadow_vert,fragmentShader:H.shadow_frag}};cr.physical={uniforms:ye([cr.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new z},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new z},clearcoatNormalScale:{value:new R(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new z},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new z},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new z},sheen:{value:0},sheenColor:{value:new te(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new z},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new z},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new z},transmissionSamplerSize:{value:new R},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new z},attenuationDistance:{value:0},attenuationColor:{value:new te(0)},specularColor:{value:new te(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new z},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new z},anisotropyVector:{value:new R},anisotropyMap:{value:null},anisotropyMapTransform:{value:new z}}]),vertexShader:H.meshphysical_vert,fragmentShader:H.meshphysical_frag};var mt=(1+Math.sqrt(5))/2,Ot=1/mt,mh=[new x(-mt,Ot,0),new x(mt,Ot,0),new x(-Ot,0,mt),new x(Ot,0,mt),new x(0,mt,-Ot),new x(0,mt,Ot),new x(-1,1,-1),new x(1,1,-1),new x(-1,1,1),new x(1,1,1)];var gh=new Float32Array(16),_h=new Float32Array(9),xh=new Float32Array(4);var vh={[Ps]:Is,[Ls]:Ns,[Ds]:Fs,[qn]:Us,[Is]:Ps,[Ns]:Ls,[Fs]:Ds,[Us]:qn};var fn=class extends Ae{constructor(){super(),this.isGroup=!0,this.type="Group"}};var Zi=class extends gt{constructor(e=null,t=1,n=1,i,s,r,o,l,c=Os,u=Os,f,h){super(null,r,o,l,c,u,i,s,f,h),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var Kn=class extends Ke{constructor(e,t,n,i=1){super(e,t,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=i}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){let e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}},zt=new me,hr=new me,Hn=[],ur=new Ie,tc=new me,on=new ue,an=new Gt,Qe=class extends ue{constructor(e,t,n){super(e,t),this.isInstancedMesh=!0,this.instanceMatrix=new Kn(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let i=0;i<n;i++)this.setMatrixAt(i,tc)}computeBoundingBox(){let e=this.geometry,t=this.count;this.boundingBox===null&&(this.boundingBox=new Ie),e.boundingBox===null&&e.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,zt),ur.copy(e.boundingBox).applyMatrix4(zt),this.boundingBox.union(ur)}computeBoundingSphere(){let e=this.geometry,t=this.count;this.boundingSphere===null&&(this.boundingSphere=new Gt),e.boundingSphere===null&&e.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,zt),an.copy(e.boundingSphere).applyMatrix4(zt),this.boundingSphere.union(an)}copy(e,t){return super.copy(e,t),this.instanceMatrix.copy(e.instanceMatrix),e.morphTexture!==null&&(this.morphTexture=e.morphTexture.clone()),e.instanceColor!==null&&(this.instanceColor=e.instanceColor.clone()),this.count=e.count,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}getColorAt(e,t){t.fromArray(this.instanceColor.array,e*3)}getMatrixAt(e,t){t.fromArray(this.instanceMatrix.array,e*16)}getMorphAt(e,t){let n=t.morphTargetInfluences,i=this.morphTexture.source.data.data,s=n.length+1,r=e*s+1;for(let o=0;o<n.length;o++)n[o]=i[r+o]}raycast(e,t){let n=this.matrixWorld,i=this.count;if(on.geometry=this.geometry,on.material=this.material,on.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),an.copy(this.boundingSphere),an.applyMatrix4(n),e.ray.intersectsSphere(an)!==!1))for(let s=0;s<i;s++){this.getMatrixAt(s,zt),hr.multiplyMatrices(n,zt),on.matrixWorld=hr,on.raycast(e,Hn);for(let r=0,o=Hn.length;r<o;r++){let l=Hn[r];l.instanceId=s,l.object=this,t.push(l)}Hn.length=0}}setColorAt(e,t){this.instanceColor===null&&(this.instanceColor=new Kn(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),t.toArray(this.instanceColor.array,e*3)}setMatrixAt(e,t){t.toArray(this.instanceMatrix.array,e*16)}setMorphAt(e,t){let n=t.morphTargetInfluences,i=n.length+1;this.morphTexture===null&&(this.morphTexture=new Zi(new Float32Array(i*this.count),i,this.count,eo,Mr));let s=this.morphTexture.source.data.data,r=0;for(let c=0;c<n.length;c++)r+=n[c];let o=this.geometry.morphTargetsRelative?1:1-r,l=i*e;s[l]=o,s.set(n,l+1)}updateMorphTargets(){}dispose(){return this.dispatchEvent({type:"dispose"}),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null),this}};var jn=class extends gt{constructor(e,t,n,i,s,r,o,l,c){super(e,t,n,i,s,r,o,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}},Le=class{constructor(){this.type="Curve",this.arcLengthDivisions=200}getPoint(){return console.warn("THREE.Curve: .getPoint() not implemented."),null}getPointAt(e,t){let n=this.getUtoTmapping(e);return this.getPoint(n,t)}getPoints(e=5){let t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return t}getSpacedPoints(e=5){let t=[];for(let n=0;n<=e;n++)t.push(this.getPointAt(n/e));return t}getLength(){let e=this.getLengths();return e[e.length-1]}getLengths(e=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===e+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;let t=[],n,i=this.getPoint(0),s=0;t.push(0);for(let r=1;r<=e;r++)n=this.getPoint(r/e),s+=n.distanceTo(i),t.push(s),i=n;return this.cacheArcLengths=t,t}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(e,t){let n=this.getLengths(),i=0,s=n.length,r;t?r=t:r=e*n[s-1];let o=0,l=s-1,c;for(;o<=l;)if(i=Math.floor(o+(l-o)/2),c=n[i]-r,c<0)o=i+1;else if(c>0)l=i-1;else{l=i;break}if(i=l,n[i]===r)return i/(s-1);let u=n[i],h=n[i+1]-u,d=(r-u)/h;return(i+d)/(s-1)}getTangent(e,t){let i=e-1e-4,s=e+1e-4;i<0&&(i=0),s>1&&(s=1);let r=this.getPoint(i),o=this.getPoint(s),l=t||(r.isVector2?new R:new x);return l.copy(o).sub(r).normalize(),l}getTangentAt(e,t){let n=this.getUtoTmapping(e);return this.getTangent(n,t)}computeFrenetFrames(e,t){let n=new x,i=[],s=[],r=[],o=new x,l=new me;for(let d=0;d<=e;d++){let p=d/e;i[d]=this.getTangentAt(p,new x)}s[0]=new x,r[0]=new x;let c=Number.MAX_VALUE,u=Math.abs(i[0].x),f=Math.abs(i[0].y),h=Math.abs(i[0].z);u<=c&&(c=u,n.set(1,0,0)),f<=c&&(c=f,n.set(0,1,0)),h<=c&&n.set(0,0,1),o.crossVectors(i[0],n).normalize(),s[0].crossVectors(i[0],o),r[0].crossVectors(i[0],s[0]);for(let d=1;d<=e;d++){if(s[d]=s[d-1].clone(),r[d]=r[d-1].clone(),o.crossVectors(i[d-1],i[d]),o.length()>Number.EPSILON){o.normalize();let p=Math.acos(he(i[d-1].dot(i[d]),-1,1));s[d].applyMatrix4(l.makeRotationAxis(o,p))}r[d].crossVectors(i[d],s[d])}if(t===!0){let d=Math.acos(he(s[0].dot(s[e]),-1,1));d/=e,i[0].dot(o.crossVectors(s[0],s[e]))>0&&(d=-d);for(let p=1;p<=e;p++)s[p].applyMatrix4(l.makeRotationAxis(i[p],d*p)),r[p].crossVectors(i[p],s[p])}return{tangents:i,normals:s,binormals:r}}clone(){return new this.constructor().copy(this)}copy(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}toJSON(){let e={metadata:{version:4.6,type:"Curve",generator:"Curve.toJSON"}};return e.arcLengthDivisions=this.arcLengthDivisions,e.type=this.type,e}fromJSON(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}},dn=class extends Le{constructor(e=0,t=0,n=1,i=1,s=0,r=Math.PI*2,o=!1,l=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=e,this.aY=t,this.xRadius=n,this.yRadius=i,this.aStartAngle=s,this.aEndAngle=r,this.aClockwise=o,this.aRotation=l}getPoint(e,t=new R){let n=t,i=Math.PI*2,s=this.aEndAngle-this.aStartAngle,r=Math.abs(s)<Number.EPSILON;for(;s<0;)s+=i;for(;s>i;)s-=i;s<Number.EPSILON&&(r?s=0:s=i),this.aClockwise===!0&&!r&&(s===i?s=-i:s=s-i);let o=this.aStartAngle+e*s,l=this.aX+this.xRadius*Math.cos(o),c=this.aY+this.yRadius*Math.sin(o);if(this.aRotation!==0){let u=Math.cos(this.aRotation),f=Math.sin(this.aRotation),h=l-this.aX,d=c-this.aY;l=h*u-d*f+this.aX,c=h*f+d*u+this.aY}return n.set(l,c)}copy(e){return super.copy(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}toJSON(){let e=super.toJSON();return e.aX=this.aX,e.aY=this.aY,e.xRadius=this.xRadius,e.yRadius=this.yRadius,e.aStartAngle=this.aStartAngle,e.aEndAngle=this.aEndAngle,e.aClockwise=this.aClockwise,e.aRotation=this.aRotation,e}fromJSON(e){return super.fromJSON(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}},$i=class extends dn{constructor(e,t,n,i,s,r){super(e,t,n,n,i,s,r),this.isArcCurve=!0,this.type="ArcCurve"}};function ms(){let a=0,e=0,t=0,n=0;function i(s,r,o,l){a=s,e=o,t=-3*s+3*r-2*o-l,n=2*s-2*r+o+l}return{initCatmullRom:function(s,r,o,l,c){i(r,o,c*(o-s),c*(l-r))},initNonuniformCatmullRom:function(s,r,o,l,c,u,f){let h=(r-s)/c-(o-s)/(c+u)+(o-r)/u,d=(o-r)/u-(l-r)/(u+f)+(l-o)/f;h*=u,d*=u,i(r,o,h,d)},calc:function(s){let r=s*s,o=r*s;return a+e*s+t*r+n*o}}}var Vn=new x,Fi=new ms,ki=new ms,Oi=new ms,Ji=class extends Le{constructor(e=[],t=!1,n="centripetal",i=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=e,this.closed=t,this.curveType=n,this.tension=i}getPoint(e,t=new x){let n=t,i=this.points,s=i.length,r=(s-(this.closed?0:1))*e,o=Math.floor(r),l=r-o;this.closed?o+=o>0?0:(Math.floor(Math.abs(o)/s)+1)*s:l===0&&o===s-1&&(o=s-2,l=1);let c,u;this.closed||o>0?c=i[(o-1)%s]:(Vn.subVectors(i[0],i[1]).add(i[0]),c=Vn);let f=i[o%s],h=i[(o+1)%s];if(this.closed||o+2<s?u=i[(o+2)%s]:(Vn.subVectors(i[s-1],i[s-2]).add(i[s-1]),u=Vn),this.curveType==="centripetal"||this.curveType==="chordal"){let d=this.curveType==="chordal"?.5:.25,p=Math.pow(c.distanceToSquared(f),d),m=Math.pow(f.distanceToSquared(h),d),g=Math.pow(h.distanceToSquared(u),d);m<1e-4&&(m=1),p<1e-4&&(p=m),g<1e-4&&(g=m),Fi.initNonuniformCatmullRom(c.x,f.x,h.x,u.x,p,m,g),ki.initNonuniformCatmullRom(c.y,f.y,h.y,u.y,p,m,g),Oi.initNonuniformCatmullRom(c.z,f.z,h.z,u.z,p,m,g)}else this.curveType==="catmullrom"&&(Fi.initCatmullRom(c.x,f.x,h.x,u.x,this.tension),ki.initCatmullRom(c.y,f.y,h.y,u.y,this.tension),Oi.initCatmullRom(c.z,f.z,h.z,u.z,this.tension));return n.set(Fi.calc(l),ki.calc(l),Oi.calc(l)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let i=e.points[t];this.points.push(i.clone())}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){let i=this.points[t];e.points.push(i.toArray())}return e.closed=this.closed,e.curveType=this.curveType,e.tension=this.tension,e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let i=e.points[t];this.points.push(new x().fromArray(i))}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}};function fr(a,e,t,n,i){let s=(n-e)*.5,r=(i-t)*.5,o=a*a,l=a*o;return(2*t-2*n+s+r)*l+(-3*t+3*n-2*s-r)*o+s*a+t}function nc(a,e){let t=1-a;return t*t*e}function ic(a,e){return 2*(1-a)*a*e}function sc(a,e){return a*a*e}function ln(a,e,t,n){return nc(a,e)+ic(a,t)+sc(a,n)}function rc(a,e){let t=1-a;return t*t*t*e}function oc(a,e){let t=1-a;return 3*t*t*a*e}function ac(a,e){return 3*(1-a)*a*a*e}function lc(a,e){return a*a*a*e}function cn(a,e,t,n,i){return rc(a,e)+oc(a,t)+ac(a,n)+lc(a,i)}var Qn=class extends Le{constructor(e=new R,t=new R,n=new R,i=new R){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=e,this.v1=t,this.v2=n,this.v3=i}getPoint(e,t=new R){let n=t,i=this.v0,s=this.v1,r=this.v2,o=this.v3;return n.set(cn(e,i.x,s.x,r.x,o.x),cn(e,i.y,s.y,r.y,o.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},Ki=class extends Le{constructor(e=new x,t=new x,n=new x,i=new x){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=e,this.v1=t,this.v2=n,this.v3=i}getPoint(e,t=new x){let n=t,i=this.v0,s=this.v1,r=this.v2,o=this.v3;return n.set(cn(e,i.x,s.x,r.x,o.x),cn(e,i.y,s.y,r.y,o.y),cn(e,i.z,s.z,r.z,o.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},ei=class extends Le{constructor(e=new R,t=new R){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=e,this.v2=t}getPoint(e,t=new R){let n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new R){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},ji=class extends Le{constructor(e=new x,t=new x){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=e,this.v2=t}getPoint(e,t=new x){let n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new x){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},ti=class extends Le{constructor(e=new R,t=new R,n=new R){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new R){let n=t,i=this.v0,s=this.v1,r=this.v2;return n.set(ln(e,i.x,s.x,r.x),ln(e,i.y,s.y,r.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Qi=class extends Le{constructor(e=new x,t=new x,n=new x){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new x){let n=t,i=this.v0,s=this.v1,r=this.v2;return n.set(ln(e,i.x,s.x,r.x),ln(e,i.y,s.y,r.y),ln(e,i.z,s.z,r.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},ni=class extends Le{constructor(e=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=e}getPoint(e,t=new R){let n=t,i=this.points,s=(i.length-1)*e,r=Math.floor(s),o=s-r,l=i[r===0?r:r-1],c=i[r],u=i[r>i.length-2?i.length-1:r+1],f=i[r>i.length-3?i.length-1:r+2];return n.set(fr(o,l.x,c.x,u.x,f.x),fr(o,l.y,c.y,u.y,f.y)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let i=e.points[t];this.points.push(i.clone())}return this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){let i=this.points[t];e.points.push(i.toArray())}return e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let i=e.points[t];this.points.push(new R().fromArray(i))}return this}},es=Object.freeze({__proto__:null,ArcCurve:$i,CatmullRomCurve3:Ji,CubicBezierCurve:Qn,CubicBezierCurve3:Ki,EllipseCurve:dn,LineCurve:ei,LineCurve3:ji,QuadraticBezierCurve:ti,QuadraticBezierCurve3:Qi,SplineCurve:ni}),ts=class extends Le{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1}add(e){this.curves.push(e)}closePath(){let e=this.curves[0].getPoint(0),t=this.curves[this.curves.length-1].getPoint(1);if(!e.equals(t)){let n=e.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new es[n](t,e))}return this}getPoint(e,t){let n=e*this.getLength(),i=this.getCurveLengths(),s=0;for(;s<i.length;){if(i[s]>=n){let r=i[s]-n,o=this.curves[s],l=o.getLength(),c=l===0?0:1-r/l;return o.getPointAt(c,t)}s++}return null}getLength(){let e=this.getCurveLengths();return e[e.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;let e=[],t=0;for(let n=0,i=this.curves.length;n<i;n++)t+=this.curves[n].getLength(),e.push(t);return this.cacheLengths=e,e}getSpacedPoints(e=40){let t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return this.autoClose&&t.push(t[0]),t}getPoints(e=12){let t=[],n;for(let i=0,s=this.curves;i<s.length;i++){let r=s[i],o=r.isEllipseCurve?e*2:r.isLineCurve||r.isLineCurve3?1:r.isSplineCurve?e*r.points.length:e,l=r.getPoints(o);for(let c=0;c<l.length;c++){let u=l[c];n&&n.equals(u)||(t.push(u),n=u)}}return this.autoClose&&t.length>1&&!t[t.length-1].equals(t[0])&&t.push(t[0]),t}copy(e){super.copy(e),this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){let i=e.curves[t];this.curves.push(i.clone())}return this.autoClose=e.autoClose,this}toJSON(){let e=super.toJSON();e.autoClose=this.autoClose,e.curves=[];for(let t=0,n=this.curves.length;t<n;t++){let i=this.curves[t];e.curves.push(i.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.autoClose=e.autoClose,this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){let i=e.curves[t];this.curves.push(new es[i.type]().fromJSON(i))}return this}},Yt=class extends ts{constructor(e){super(),this.type="Path",this.currentPoint=new R,e&&this.setFromPoints(e)}setFromPoints(e){this.moveTo(e[0].x,e[0].y);for(let t=1,n=e.length;t<n;t++)this.lineTo(e[t].x,e[t].y);return this}moveTo(e,t){return this.currentPoint.set(e,t),this}lineTo(e,t){let n=new ei(this.currentPoint.clone(),new R(e,t));return this.curves.push(n),this.currentPoint.set(e,t),this}quadraticCurveTo(e,t,n,i){let s=new ti(this.currentPoint.clone(),new R(e,t),new R(n,i));return this.curves.push(s),this.currentPoint.set(n,i),this}bezierCurveTo(e,t,n,i,s,r){let o=new Qn(this.currentPoint.clone(),new R(e,t),new R(n,i),new R(s,r));return this.curves.push(o),this.currentPoint.set(s,r),this}splineThru(e){let t=[this.currentPoint.clone()].concat(e),n=new ni(t);return this.curves.push(n),this.currentPoint.copy(e[e.length-1]),this}arc(e,t,n,i,s,r){let o=this.currentPoint.x,l=this.currentPoint.y;return this.absarc(e+o,t+l,n,i,s,r),this}absarc(e,t,n,i,s,r){return this.absellipse(e,t,n,n,i,s,r),this}ellipse(e,t,n,i,s,r,o,l){let c=this.currentPoint.x,u=this.currentPoint.y;return this.absellipse(e+c,t+u,n,i,s,r,o,l),this}absellipse(e,t,n,i,s,r,o,l){let c=new dn(e,t,n,i,s,r,o,l);if(this.curves.length>0){let f=c.getPoint(0);f.equals(this.currentPoint)||this.lineTo(f.x,f.y)}this.curves.push(c);let u=c.getPoint(1);return this.currentPoint.copy(u),this}copy(e){return super.copy(e),this.currentPoint.copy(e.currentPoint),this}toJSON(){let e=super.toJSON();return e.currentPoint=this.currentPoint.toArray(),e}fromJSON(e){return super.fromJSON(e),this.currentPoint.fromArray(e.currentPoint),this}},ii=class a extends Re{constructor(e=[new R(0,-.5),new R(.5,0),new R(0,.5)],t=12,n=0,i=Math.PI*2){super(),this.type="LatheGeometry",this.parameters={points:e,segments:t,phiStart:n,phiLength:i},t=Math.floor(t),i=he(i,0,Math.PI*2);let s=[],r=[],o=[],l=[],c=[],u=1/t,f=new x,h=new R,d=new x,p=new x,m=new x,g=0,_=0;for(let M=0;M<=e.length-1;M++)switch(M){case 0:g=e[M+1].x-e[M].x,_=e[M+1].y-e[M].y,d.x=_*1,d.y=-g,d.z=_*0,m.copy(d),d.normalize(),l.push(d.x,d.y,d.z);break;case e.length-1:l.push(m.x,m.y,m.z);break;default:g=e[M+1].x-e[M].x,_=e[M+1].y-e[M].y,d.x=_*1,d.y=-g,d.z=_*0,p.copy(d),d.x+=m.x,d.y+=m.y,d.z+=m.z,d.normalize(),l.push(d.x,d.y,d.z),m.copy(p)}for(let M=0;M<=t;M++){let y=n+M*u*i,v=Math.sin(y),b=Math.cos(y);for(let S=0;S<=e.length-1;S++){f.x=e[S].x*v,f.y=e[S].y,f.z=e[S].x*b,r.push(f.x,f.y,f.z),h.x=M/t,h.y=S/(e.length-1),o.push(h.x,h.y);let w=l[3*S+0]*v,E=l[3*S+1],U=l[3*S+0]*b;c.push(w,E,U)}}for(let M=0;M<t;M++)for(let y=0;y<e.length-1;y++){let v=y+M*e.length,b=v,S=v+e.length,w=v+e.length+1,E=v+1;s.push(b,S,E),s.push(w,E,S)}this.setIndex(s),this.setAttribute("position",new J(r,3)),this.setAttribute("uv",new J(o,2)),this.setAttribute("normal",new J(c,3))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new a(e.points,e.segments,e.phiStart,e.phiLength)}};var qt=class a extends Re{constructor(e=1,t=32,n=0,i=Math.PI*2){super(),this.type="CircleGeometry",this.parameters={radius:e,segments:t,thetaStart:n,thetaLength:i},t=Math.max(3,t);let s=[],r=[],o=[],l=[],c=new x,u=new R;r.push(0,0,0),o.push(0,0,1),l.push(.5,.5);for(let f=0,h=3;f<=t;f++,h+=3){let d=n+f/t*i;c.x=e*Math.cos(d),c.y=e*Math.sin(d),r.push(c.x,c.y,c.z),o.push(0,0,1),u.x=(r[h]/e+1)/2,u.y=(r[h+1]/e+1)/2,l.push(u.x,u.y)}for(let f=1;f<=t;f++)s.push(f,f+1,0);this.setIndex(s),this.setAttribute("position",new J(r,3)),this.setAttribute("normal",new J(o,3)),this.setAttribute("uv",new J(l,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new a(e.radius,e.segments,e.thetaStart,e.thetaLength)}},xt=class a extends Re{constructor(e=1,t=1,n=1,i=32,s=1,r=!1,o=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:n,radialSegments:i,heightSegments:s,openEnded:r,thetaStart:o,thetaLength:l};let c=this;i=Math.floor(i),s=Math.floor(s);let u=[],f=[],h=[],d=[],p=0,m=[],g=n/2,_=0;M(),r===!1&&(e>0&&y(!0),t>0&&y(!1)),this.setIndex(u),this.setAttribute("position",new J(f,3)),this.setAttribute("normal",new J(h,3)),this.setAttribute("uv",new J(d,2));function M(){let v=new x,b=new x,S=0,w=(t-e)/n;for(let E=0;E<=s;E++){let U=[],L=E/s,D=L*(t-e)+e;for(let V=0;V<=i;V++){let k=V/i,O=k*l+o,$=Math.sin(O),Y=Math.cos(O);b.x=D*$,b.y=-L*n+g,b.z=D*Y,f.push(b.x,b.y,b.z),v.set($,w,Y).normalize(),h.push(v.x,v.y,v.z),d.push(k,1-L),U.push(p++)}m.push(U)}for(let E=0;E<i;E++)for(let U=0;U<s;U++){let L=m[U][E],D=m[U+1][E],V=m[U+1][E+1],k=m[U][E+1];e>0&&(u.push(L,D,k),S+=3),t>0&&(u.push(D,V,k),S+=3)}c.addGroup(_,S,0),_+=S}function y(v){let b=p,S=new R,w=new x,E=0,U=v===!0?e:t,L=v===!0?1:-1;for(let V=1;V<=i;V++)f.push(0,g*L,0),h.push(0,L,0),d.push(.5,.5),p++;let D=p;for(let V=0;V<=i;V++){let O=V/i*l+o,$=Math.cos(O),Y=Math.sin(O);w.x=U*Y,w.y=g*L,w.z=U*$,f.push(w.x,w.y,w.z),h.push(0,L,0),S.x=$*.5+.5,S.y=Y*.5*L+.5,d.push(S.x,S.y),p++}for(let V=0;V<i;V++){let k=b+V,O=D+V;v===!0?u.push(O,O+1,k):u.push(O+1,O,k),E+=3}c.addGroup(_,E,v===!0?1:2),_+=E}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new a(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}};var at=class extends Yt{constructor(e){super(e),this.uuid=Jt(),this.type="Shape",this.holes=[]}getPointsHoles(e){let t=[];for(let n=0,i=this.holes.length;n<i;n++)t[n]=this.holes[n].getPoints(e);return t}extractPoints(e){return{shape:this.getPoints(e),holes:this.getPointsHoles(e)}}copy(e){super.copy(e),this.holes=[];for(let t=0,n=e.holes.length;t<n;t++){let i=e.holes[t];this.holes.push(i.clone())}return this}toJSON(){let e=super.toJSON();e.uuid=this.uuid,e.holes=[];for(let t=0,n=this.holes.length;t<n;t++){let i=this.holes[t];e.holes.push(i.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.uuid=e.uuid,this.holes=[];for(let t=0,n=e.holes.length;t<n;t++){let i=e.holes[t];this.holes.push(new Yt().fromJSON(i))}return this}},cc={triangulate:function(a,e,t=2){let n=e&&e.length,i=n?e[0]*t:a.length,s=wr(a,0,i,t,!0),r=[];if(!s||s.next===s.prev)return r;let o,l,c,u,f,h,d;if(n&&(s=pc(a,e,s,t)),a.length>80*t){o=c=a[0],l=u=a[1];for(let p=t;p<i;p+=t)f=a[p],h=a[p+1],f<o&&(o=f),h<l&&(l=h),f>c&&(c=f),h>u&&(u=h);d=Math.max(c-o,u-l),d=d!==0?32767/d:0}return pn(s,r,t,o,l,d,0),r}};function wr(a,e,t,n,i){let s,r;if(i===wc(a,e,t,n)>0)for(s=e;s<t;s+=n)r=dr(s,a[s],a[s+1],r);else for(s=t-n;s>=e;s-=n)r=dr(s,a[s],a[s+1],r);return r&&oi(r,r.next)&&(gn(r),r=r.next),r}function vt(a,e){if(!a)return a;e||(e=a);let t=a,n;do if(n=!1,!t.steiner&&(oi(t,t.next)||se(t.prev,t,t.next)===0)){if(gn(t),t=e=t.prev,t===t.next)break;n=!0}else t=t.next;while(n||t!==e);return e}function pn(a,e,t,n,i,s,r){if(!a)return;!r&&s&&vc(a,n,i,s);let o=a,l,c;for(;a.prev!==a.next;){if(l=a.prev,c=a.next,s?uc(a,n,i,s):hc(a)){e.push(l.i/t|0),e.push(a.i/t|0),e.push(c.i/t|0),gn(a),a=c.next,o=c.next;continue}if(a=c,a===o){r?r===1?(a=fc(vt(a),e,t),pn(a,e,t,n,i,s,2)):r===2&&dc(a,e,t,n,i,s):pn(vt(a),e,t,n,i,s,1);break}}}function hc(a){let e=a.prev,t=a,n=a.next;if(se(e,t,n)>=0)return!1;let i=e.x,s=t.x,r=n.x,o=e.y,l=t.y,c=n.y,u=i<s?i<r?i:r:s<r?s:r,f=o<l?o<c?o:c:l<c?l:c,h=i>s?i>r?i:r:s>r?s:r,d=o>l?o>c?o:c:l>c?l:c,p=n.next;for(;p!==e;){if(p.x>=u&&p.x<=h&&p.y>=f&&p.y<=d&&Bt(i,o,s,l,r,c,p.x,p.y)&&se(p.prev,p,p.next)>=0)return!1;p=p.next}return!0}function uc(a,e,t,n){let i=a.prev,s=a,r=a.next;if(se(i,s,r)>=0)return!1;let o=i.x,l=s.x,c=r.x,u=i.y,f=s.y,h=r.y,d=o<l?o<c?o:c:l<c?l:c,p=u<f?u<h?u:h:f<h?f:h,m=o>l?o>c?o:c:l>c?l:c,g=u>f?u>h?u:h:f>h?f:h,_=ns(d,p,e,t,n),M=ns(m,g,e,t,n),y=a.prevZ,v=a.nextZ;for(;y&&y.z>=_&&v&&v.z<=M;){if(y.x>=d&&y.x<=m&&y.y>=p&&y.y<=g&&y!==i&&y!==r&&Bt(o,u,l,f,c,h,y.x,y.y)&&se(y.prev,y,y.next)>=0||(y=y.prevZ,v.x>=d&&v.x<=m&&v.y>=p&&v.y<=g&&v!==i&&v!==r&&Bt(o,u,l,f,c,h,v.x,v.y)&&se(v.prev,v,v.next)>=0))return!1;v=v.nextZ}for(;y&&y.z>=_;){if(y.x>=d&&y.x<=m&&y.y>=p&&y.y<=g&&y!==i&&y!==r&&Bt(o,u,l,f,c,h,y.x,y.y)&&se(y.prev,y,y.next)>=0)return!1;y=y.prevZ}for(;v&&v.z<=M;){if(v.x>=d&&v.x<=m&&v.y>=p&&v.y<=g&&v!==i&&v!==r&&Bt(o,u,l,f,c,h,v.x,v.y)&&se(v.prev,v,v.next)>=0)return!1;v=v.nextZ}return!0}function fc(a,e,t){let n=a;do{let i=n.prev,s=n.next.next;!oi(i,s)&&Tr(i,n,n.next,s)&&mn(i,s)&&mn(s,i)&&(e.push(i.i/t|0),e.push(n.i/t|0),e.push(s.i/t|0),gn(n),gn(n.next),n=a=s),n=n.next}while(n!==a);return vt(n)}function dc(a,e,t,n,i,s){let r=a;do{let o=r.next.next;for(;o!==r.prev;){if(r.i!==o.i&&bc(r,o)){let l=Ar(r,o);r=vt(r,r.next),l=vt(l,l.next),pn(r,e,t,n,i,s,0),pn(l,e,t,n,i,s,0);return}o=o.next}r=r.next}while(r!==a)}function pc(a,e,t,n){let i=[],s,r,o,l,c;for(s=0,r=e.length;s<r;s++)o=e[s]*n,l=s<r-1?e[s+1]*n:a.length,c=wr(a,o,l,n,!1),c===c.next&&(c.steiner=!0),i.push(yc(c));for(i.sort(mc),s=0;s<i.length;s++)t=gc(i[s],t);return t}function mc(a,e){return a.x-e.x}function gc(a,e){let t=_c(a,e);if(!t)return e;let n=Ar(t,a);return vt(n,n.next),vt(t,t.next)}function _c(a,e){let t=e,n=-1/0,i,s=a.x,r=a.y;do{if(r<=t.y&&r>=t.next.y&&t.next.y!==t.y){let h=t.x+(r-t.y)*(t.next.x-t.x)/(t.next.y-t.y);if(h<=s&&h>n&&(n=h,i=t.x<t.next.x?t:t.next,h===s))return i}t=t.next}while(t!==e);if(!i)return null;let o=i,l=i.x,c=i.y,u=1/0,f;t=i;do s>=t.x&&t.x>=l&&s!==t.x&&Bt(r<c?s:n,r,l,c,r<c?n:s,r,t.x,t.y)&&(f=Math.abs(r-t.y)/(s-t.x),mn(t,a)&&(f<u||f===u&&(t.x>i.x||t.x===i.x&&xc(i,t)))&&(i=t,u=f)),t=t.next;while(t!==o);return i}function xc(a,e){return se(a.prev,a,e.prev)<0&&se(e.next,a,a.next)<0}function vc(a,e,t,n){let i=a;do i.z===0&&(i.z=ns(i.x,i.y,e,t,n)),i.prevZ=i.prev,i.nextZ=i.next,i=i.next;while(i!==a);i.prevZ.nextZ=null,i.prevZ=null,Mc(i)}function Mc(a){let e,t,n,i,s,r,o,l,c=1;do{for(t=a,a=null,s=null,r=0;t;){for(r++,n=t,o=0,e=0;e<c&&(o++,n=n.nextZ,!!n);e++);for(l=c;o>0||l>0&&n;)o!==0&&(l===0||!n||t.z<=n.z)?(i=t,t=t.nextZ,o--):(i=n,n=n.nextZ,l--),s?s.nextZ=i:a=i,i.prevZ=s,s=i;t=n}s.nextZ=null,c*=2}while(r>1);return a}function ns(a,e,t,n,i){return a=(a-t)*i|0,e=(e-n)*i|0,a=(a|a<<8)&16711935,a=(a|a<<4)&252645135,a=(a|a<<2)&858993459,a=(a|a<<1)&1431655765,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,a|e<<1}function yc(a){let e=a,t=a;do(e.x<t.x||e.x===t.x&&e.y<t.y)&&(t=e),e=e.next;while(e!==a);return t}function Bt(a,e,t,n,i,s,r,o){return(i-r)*(e-o)>=(a-r)*(s-o)&&(a-r)*(n-o)>=(t-r)*(e-o)&&(t-r)*(s-o)>=(i-r)*(n-o)}function bc(a,e){return a.next.i!==e.i&&a.prev.i!==e.i&&!Sc(a,e)&&(mn(a,e)&&mn(e,a)&&Ec(a,e)&&(se(a.prev,a,e.prev)||se(a,e.prev,e))||oi(a,e)&&se(a.prev,a,a.next)>0&&se(e.prev,e,e.next)>0)}function se(a,e,t){return(e.y-a.y)*(t.x-e.x)-(e.x-a.x)*(t.y-e.y)}function oi(a,e){return a.x===e.x&&a.y===e.y}function Tr(a,e,t,n){let i=Wn(se(a,e,t)),s=Wn(se(a,e,n)),r=Wn(se(t,n,a)),o=Wn(se(t,n,e));return!!(i!==s&&r!==o||i===0&&Gn(a,t,e)||s===0&&Gn(a,n,e)||r===0&&Gn(t,a,n)||o===0&&Gn(t,e,n))}function Gn(a,e,t){return e.x<=Math.max(a.x,t.x)&&e.x>=Math.min(a.x,t.x)&&e.y<=Math.max(a.y,t.y)&&e.y>=Math.min(a.y,t.y)}function Wn(a){return a>0?1:a<0?-1:0}function Sc(a,e){let t=a;do{if(t.i!==a.i&&t.next.i!==a.i&&t.i!==e.i&&t.next.i!==e.i&&Tr(t,t.next,a,e))return!0;t=t.next}while(t!==a);return!1}function mn(a,e){return se(a.prev,a,a.next)<0?se(a,e,a.next)>=0&&se(a,a.prev,e)>=0:se(a,e,a.prev)<0||se(a,a.next,e)<0}function Ec(a,e){let t=a,n=!1,i=(a.x+e.x)/2,s=(a.y+e.y)/2;do t.y>s!=t.next.y>s&&t.next.y!==t.y&&i<(t.next.x-t.x)*(s-t.y)/(t.next.y-t.y)+t.x&&(n=!n),t=t.next;while(t!==a);return n}function Ar(a,e){let t=new is(a.i,a.x,a.y),n=new is(e.i,e.x,e.y),i=a.next,s=e.prev;return a.next=e,e.prev=a,t.next=i,i.prev=t,n.next=t,t.prev=n,s.next=n,n.prev=s,n}function dr(a,e,t,n){let i=new is(a,e,t);return n?(i.next=n.next,i.prev=n,n.next.prev=i,n.next=i):(i.prev=i,i.next=i),i}function gn(a){a.next.prev=a.prev,a.prev.next=a.next,a.prevZ&&(a.prevZ.nextZ=a.nextZ),a.nextZ&&(a.nextZ.prevZ=a.prevZ)}function is(a,e,t){this.i=a,this.x=e,this.y=t,this.prev=null,this.next=null,this.z=0,this.prevZ=null,this.nextZ=null,this.steiner=!1}function wc(a,e,t,n){let i=0;for(let s=e,r=t-n;s<t;s+=n)i+=(a[r]-a[s])*(a[s+1]+a[r+1]),r=s;return i}var hn=class a{static area(e){let t=e.length,n=0;for(let i=t-1,s=0;s<t;i=s++)n+=e[i].x*e[s].y-e[s].x*e[i].y;return n*.5}static isClockWise(e){return a.area(e)<0}static triangulateShape(e,t){let n=[],i=[],s=[];pr(e),mr(n,e);let r=e.length;t.forEach(pr);for(let l=0;l<t.length;l++)i.push(r),r+=t[l].length,mr(n,t[l]);let o=cc.triangulate(n,i);for(let l=0;l<o.length;l+=3)s.push(o.slice(l,l+3));return s}};function pr(a){let e=a.length;e>2&&a[e-1].equals(a[0])&&a.pop()}function mr(a,e){for(let t=0;t<e.length;t++)a.push(e[t].x),a.push(e[t].y)}var Mt=class a extends Re{constructor(e=new at([new R(.5,.5),new R(-.5,.5),new R(-.5,-.5),new R(.5,-.5)]),t={}){super(),this.type="ExtrudeGeometry",this.parameters={shapes:e,options:t},e=Array.isArray(e)?e:[e];let n=this,i=[],s=[];for(let o=0,l=e.length;o<l;o++){let c=e[o];r(c)}this.setAttribute("position",new J(i,3)),this.setAttribute("uv",new J(s,2)),this.computeVertexNormals();function r(o){let l=[],c=t.curveSegments!==void 0?t.curveSegments:12,u=t.steps!==void 0?t.steps:1,f=t.depth!==void 0?t.depth:1,h=t.bevelEnabled!==void 0?t.bevelEnabled:!0,d=t.bevelThickness!==void 0?t.bevelThickness:.2,p=t.bevelSize!==void 0?t.bevelSize:d-.1,m=t.bevelOffset!==void 0?t.bevelOffset:0,g=t.bevelSegments!==void 0?t.bevelSegments:3,_=t.extrudePath,M=t.UVGenerator!==void 0?t.UVGenerator:Tc,y,v=!1,b,S,w,E;_&&(y=_.getSpacedPoints(u),v=!0,h=!1,b=_.computeFrenetFrames(u,!1),S=new x,w=new x,E=new x),h||(g=0,d=0,p=0,m=0);let U=o.extractPoints(c),L=U.shape,D=U.holes;if(!hn.isClockWise(L)){L=L.reverse();for(let T=0,C=D.length;T<C;T++){let P=D[T];hn.isClockWise(P)&&(D[T]=P.reverse())}}let k=hn.triangulateShape(L,D),O=L;for(let T=0,C=D.length;T<C;T++){let P=D[T];L=L.concat(P)}function $(T,C,P){return C||console.error("THREE.ExtrudeGeometry: vec does not exist"),T.clone().addScaledVector(C,P)}let Y=L.length,re=k.length;function be(T,C,P){let N,I,G,X=T.x-C.x,ee=T.y-C.y,F=P.x-T.x,W=P.y-T.y,le=X*X+ee*ee,oe=X*W-ee*F;if(Math.abs(oe)>Number.EPSILON){let j=Math.sqrt(le),de=Math.sqrt(F*F+W*W),Ee=C.x-ee/j,Ve=C.y+X/j,et=P.x-W/de,Ge=P.y+F/de,We=((et-Ee)*W-(Ge-Ve)*F)/(X*W-ee*F);N=Ee+X*We-T.x,I=Ve+ee*We-T.y;let jt=N*N+I*I;if(jt<=2)return new R(N,I);G=Math.sqrt(jt/2)}else{let j=!1;X>Number.EPSILON?F>Number.EPSILON&&(j=!0):X<-Number.EPSILON?F<-Number.EPSILON&&(j=!0):Math.sign(ee)===Math.sign(W)&&(j=!0),j?(N=-ee,I=X,G=Math.sqrt(le)):(N=X,I=ee,G=Math.sqrt(le/2))}return new R(N/G,I/G)}let q=[];for(let T=0,C=O.length,P=C-1,N=T+1;T<C;T++,P++,N++)P===C&&(P=0),N===C&&(N=0),q[T]=be(O[T],O[P],O[N]);let Q=[],ne,ve=q.concat();for(let T=0,C=D.length;T<C;T++){let P=D[T];ne=[];for(let N=0,I=P.length,G=I-1,X=N+1;N<I;N++,G++,X++)G===I&&(G=0),X===I&&(X=0),ne[N]=be(P[N],P[G],P[X]);Q.push(ne),ve=ve.concat(ne)}for(let T=0;T<g;T++){let C=T/g,P=d*Math.cos(C*Math.PI/2),N=p*Math.sin(C*Math.PI/2)+m;for(let I=0,G=O.length;I<G;I++){let X=$(O[I],q[I],N);fe(X.x,X.y,-P)}for(let I=0,G=D.length;I<G;I++){let X=D[I];ne=Q[I];for(let ee=0,F=X.length;ee<F;ee++){let W=$(X[ee],ne[ee],N);fe(W.x,W.y,-P)}}}let Be=p+m;for(let T=0;T<Y;T++){let C=h?$(L[T],ve[T],Be):L[T];v?(w.copy(b.normals[0]).multiplyScalar(C.x),S.copy(b.binormals[0]).multiplyScalar(C.y),E.copy(y[0]).add(w).add(S),fe(E.x,E.y,E.z)):fe(C.x,C.y,0)}for(let T=1;T<=u;T++)for(let C=0;C<Y;C++){let P=h?$(L[C],ve[C],Be):L[C];v?(w.copy(b.normals[T]).multiplyScalar(P.x),S.copy(b.binormals[T]).multiplyScalar(P.y),E.copy(y[T]).add(w).add(S),fe(E.x,E.y,E.z)):fe(P.x,P.y,f/u*T)}for(let T=g-1;T>=0;T--){let C=T/g,P=d*Math.cos(C*Math.PI/2),N=p*Math.sin(C*Math.PI/2)+m;for(let I=0,G=O.length;I<G;I++){let X=$(O[I],q[I],N);fe(X.x,X.y,f+P)}for(let I=0,G=D.length;I<G;I++){let X=D[I];ne=Q[I];for(let ee=0,F=X.length;ee<F;ee++){let W=$(X[ee],ne[ee],N);v?fe(W.x,W.y+y[u-1].y,y[u-1].x+P):fe(W.x,W.y,f+P)}}}Kt(),ht();function Kt(){let T=i.length/3;if(h){let C=0,P=Y*C;for(let N=0;N<re;N++){let I=k[N];ut(I[2]+P,I[1]+P,I[0]+P)}C=u+g*2,P=Y*C;for(let N=0;N<re;N++){let I=k[N];ut(I[0]+P,I[1]+P,I[2]+P)}}else{for(let C=0;C<re;C++){let P=k[C];ut(P[2],P[1],P[0])}for(let C=0;C<re;C++){let P=k[C];ut(P[0]+Y*u,P[1]+Y*u,P[2]+Y*u)}}n.addGroup(T,i.length/3-T,0)}function ht(){let T=i.length/3,C=0;Tt(O,C),C+=O.length;for(let P=0,N=D.length;P<N;P++){let I=D[P];Tt(I,C),C+=I.length}n.addGroup(T,i.length/3-T,1)}function Tt(T,C){let P=T.length;for(;--P>=0;){let N=P,I=P-1;I<0&&(I=T.length-1);for(let G=0,X=u+g*2;G<X;G++){let ee=Y*G,F=Y*(G+1),W=C+N+ee,le=C+I+ee,oe=C+I+F,j=C+N+F;bn(W,le,oe,j)}}}function fe(T,C,P){l.push(T),l.push(C),l.push(P)}function ut(T,C,P){Se(T),Se(C),Se(P);let N=i.length/3,I=M.generateTopUV(n,i,N-3,N-2,N-1);Ce(I[0]),Ce(I[1]),Ce(I[2])}function bn(T,C,P,N){Se(T),Se(C),Se(N),Se(C),Se(P),Se(N);let I=i.length/3,G=M.generateSideWallUV(n,i,I-6,I-3,I-2,I-1);Ce(G[0]),Ce(G[1]),Ce(G[3]),Ce(G[1]),Ce(G[2]),Ce(G[3])}function Se(T){i.push(l[T*3+0]),i.push(l[T*3+1]),i.push(l[T*3+2])}function Ce(T){s.push(T.x),s.push(T.y)}}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){let e=super.toJSON(),t=this.parameters.shapes,n=this.parameters.options;return Ac(t,n,e)}static fromJSON(e,t){let n=[];for(let s=0,r=e.shapes.length;s<r;s++){let o=t[e.shapes[s]];n.push(o)}let i=e.options.extrudePath;return i!==void 0&&(e.options.extrudePath=new es[i.type]().fromJSON(i)),new a(n,e.options)}},Tc={generateTopUV:function(a,e,t,n,i){let s=e[t*3],r=e[t*3+1],o=e[n*3],l=e[n*3+1],c=e[i*3],u=e[i*3+1];return[new R(s,r),new R(o,l),new R(c,u)]},generateSideWallUV:function(a,e,t,n,i,s){let r=e[t*3],o=e[t*3+1],l=e[t*3+2],c=e[n*3],u=e[n*3+1],f=e[n*3+2],h=e[i*3],d=e[i*3+1],p=e[i*3+2],m=e[s*3],g=e[s*3+1],_=e[s*3+2];return Math.abs(o-u)<Math.abs(r-c)?[new R(r,1-l),new R(c,1-f),new R(h,1-p),new R(m,1-_)]:[new R(o,1-l),new R(u,1-f),new R(d,1-p),new R(g,1-_)]}};function Ac(a,e,t){if(t.shapes=[],Array.isArray(a))for(let n=0,i=a.length;n<i;n++){let s=a[n];t.shapes.push(s.uuid)}else t.shapes.push(a.uuid);return t.options=Object.assign({},e),e.extrudePath!==void 0&&(t.options.extrudePath=e.extrudePath.toJSON()),t}var yt=class a extends Re{constructor(e=.5,t=1,n=32,i=1,s=0,r=Math.PI*2){super(),this.type="RingGeometry",this.parameters={innerRadius:e,outerRadius:t,thetaSegments:n,phiSegments:i,thetaStart:s,thetaLength:r},n=Math.max(3,n),i=Math.max(1,i);let o=[],l=[],c=[],u=[],f=e,h=(t-e)/i,d=new x,p=new R;for(let m=0;m<=i;m++){for(let g=0;g<=n;g++){let _=s+g/n*r;d.x=f*Math.cos(_),d.y=f*Math.sin(_),l.push(d.x,d.y,d.z),c.push(0,0,1),p.x=(d.x/t+1)/2,p.y=(d.y/t+1)/2,u.push(p.x,p.y)}f+=h}for(let m=0;m<i;m++){let g=m*(n+1);for(let _=0;_<n;_++){let M=_+g,y=M,v=M+n+1,b=M+n+2,S=M+1;o.push(y,v,S),o.push(v,b,S)}}this.setIndex(o),this.setAttribute("position",new J(l,3)),this.setAttribute("normal",new J(c,3)),this.setAttribute("uv",new J(u,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new a(e.innerRadius,e.outerRadius,e.thetaSegments,e.phiSegments,e.thetaStart,e.thetaLength)}};var Zt=class a extends Re{constructor(e=1,t=32,n=16,i=0,s=Math.PI*2,r=0,o=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:i,phiLength:s,thetaStart:r,thetaLength:o},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));let l=Math.min(r+o,Math.PI),c=0,u=[],f=new x,h=new x,d=[],p=[],m=[],g=[];for(let _=0;_<=n;_++){let M=[],y=_/n,v=0;_===0&&r===0?v=.5/t:_===n&&l===Math.PI&&(v=-.5/t);for(let b=0;b<=t;b++){let S=b/t;f.x=-e*Math.cos(i+S*s)*Math.sin(r+y*o),f.y=e*Math.cos(r+y*o),f.z=e*Math.sin(i+S*s)*Math.sin(r+y*o),p.push(f.x,f.y,f.z),h.copy(f).normalize(),m.push(h.x,h.y,h.z),g.push(S+v,1-y),M.push(c++)}u.push(M)}for(let _=0;_<n;_++)for(let M=0;M<t;M++){let y=u[_][M+1],v=u[_][M],b=u[_+1][M],S=u[_+1][M+1];(_!==0||r>0)&&d.push(y,v,S),(_!==n-1||l<Math.PI)&&d.push(v,b,S)}this.setIndex(d),this.setAttribute("position",new J(p,3)),this.setAttribute("normal",new J(m,3)),this.setAttribute("uv",new J(g,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new a(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}};var _n=class a extends Re{constructor(e=1,t=.4,n=12,i=48,s=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:e,tube:t,radialSegments:n,tubularSegments:i,arc:s},n=Math.floor(n),i=Math.floor(i);let r=[],o=[],l=[],c=[],u=new x,f=new x,h=new x;for(let d=0;d<=n;d++)for(let p=0;p<=i;p++){let m=p/i*s,g=d/n*Math.PI*2;f.x=(e+t*Math.cos(g))*Math.cos(m),f.y=(e+t*Math.cos(g))*Math.sin(m),f.z=t*Math.sin(g),o.push(f.x,f.y,f.z),u.x=e*Math.cos(m),u.y=e*Math.sin(m),h.subVectors(f,u).normalize(),l.push(h.x,h.y,h.z),c.push(p/i),c.push(d/n)}for(let d=1;d<=n;d++)for(let p=1;p<=i;p++){let m=(i+1)*d+p-1,g=(i+1)*(d-1)+p-1,_=(i+1)*(d-1)+p,M=(i+1)*d+p;r.push(m,g,M),r.push(g,_,M)}this.setIndex(r),this.setAttribute("position",new J(o,3)),this.setAttribute("normal",new J(l,3)),this.setAttribute("uv",new J(c,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new a(e.radius,e.tube,e.radialSegments,e.tubularSegments,e.arc)}};var xn=class extends Xt{constructor(e){super(),this.isMeshStandardMaterial=!0,this.defines={STANDARD:""},this.type="MeshStandardMaterial",this.color=new te(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new te(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=to,this.normalScale=new R(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Wt,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}},lt=class extends xn{constructor(e){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new R(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return he(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(t){this.ior=(1+.4*t)/(1-.4*t)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new te(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new te(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new te(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._sheen=0,this._transmission=0,this.setValues(e)}get anisotropy(){return this._anisotropy}set anisotropy(e){this._anisotropy>0!=e>0&&this.version++,this._anisotropy=e}get clearcoat(){return this._clearcoat}set clearcoat(e){this._clearcoat>0!=e>0&&this.version++,this._clearcoat=e}get iridescence(){return this._iridescence}set iridescence(e){this._iridescence>0!=e>0&&this.version++,this._iridescence=e}get dispersion(){return this._dispersion}set dispersion(e){this._dispersion>0!=e>0&&this.version++,this._dispersion=e}get sheen(){return this._sheen}set sheen(e){this._sheen>0!=e>0&&this.version++,this._sheen=e}get transmission(){return this._transmission}set transmission(e){this._transmission>0!=e>0&&this.version++,this._transmission=e}copy(e){return super.copy(e),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=e.anisotropy,this.anisotropyRotation=e.anisotropyRotation,this.anisotropyMap=e.anisotropyMap,this.clearcoat=e.clearcoat,this.clearcoatMap=e.clearcoatMap,this.clearcoatRoughness=e.clearcoatRoughness,this.clearcoatRoughnessMap=e.clearcoatRoughnessMap,this.clearcoatNormalMap=e.clearcoatNormalMap,this.clearcoatNormalScale.copy(e.clearcoatNormalScale),this.dispersion=e.dispersion,this.ior=e.ior,this.iridescence=e.iridescence,this.iridescenceMap=e.iridescenceMap,this.iridescenceIOR=e.iridescenceIOR,this.iridescenceThicknessRange=[...e.iridescenceThicknessRange],this.iridescenceThicknessMap=e.iridescenceThicknessMap,this.sheen=e.sheen,this.sheenColor.copy(e.sheenColor),this.sheenColorMap=e.sheenColorMap,this.sheenRoughness=e.sheenRoughness,this.sheenRoughnessMap=e.sheenRoughnessMap,this.transmission=e.transmission,this.transmissionMap=e.transmissionMap,this.thickness=e.thickness,this.thicknessMap=e.thicknessMap,this.attenuationDistance=e.attenuationDistance,this.attenuationColor.copy(e.attenuationColor),this.specularIntensity=e.specularIntensity,this.specularIntensityMap=e.specularIntensityMap,this.specularColor.copy(e.specularColor),this.specularColorMap=e.specularColorMap,this}};function Xn(a,e,t){return!a||!t&&a.constructor===e?a:typeof e.BYTES_PER_ELEMENT=="number"?new e(a):Array.prototype.slice.call(a)}function Rc(a){return ArrayBuffer.isView(a)&&!(a instanceof DataView)}var $t=class{constructor(e,t,n,i){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=i!==void 0?i:new t.constructor(n),this.sampleValues=t,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(e){let t=this.parameterPositions,n=this._cachedIndex,i=t[n],s=t[n-1];n:{e:{let r;t:{i:if(!(e<i)){for(let o=n+2;;){if(i===void 0){if(e<s)break i;return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===o)break;if(s=i,i=t[++n],e<i)break e}r=t.length;break t}if(!(e>=s)){let o=t[1];e<o&&(n=2,s=o);for(let l=n-2;;){if(s===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===l)break;if(i=s,s=t[--n-1],e>=s)break e}r=n,n=0;break t}break n}for(;n<r;){let o=n+r>>>1;e<t[o]?r=o:n=o+1}if(i=t[n],s=t[n-1],s===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(i===void 0)return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,s,i)}return this.interpolate_(n,s,e,i)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){let t=this.resultBuffer,n=this.sampleValues,i=this.valueSize,s=e*i;for(let r=0;r!==i;++r)t[r]=n[s+r];return t}interpolate_(){throw new Error("call to abstract method")}intervalChanged_(){}},ss=class extends $t{constructor(e,t,n,i){super(e,t,n,i),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:zs,endingEnd:zs}}intervalChanged_(e,t,n){let i=this.parameterPositions,s=e-2,r=e+1,o=i[s],l=i[r];if(o===void 0)switch(this.getSettings_().endingStart){case Bs:s=e,o=2*t-n;break;case Hs:s=i.length-2,o=t+i[s]-i[s+1];break;default:s=e,o=n}if(l===void 0)switch(this.getSettings_().endingEnd){case Bs:r=e,l=2*n-t;break;case Hs:r=1,l=n+i[1]-i[0];break;default:r=e-1,l=t}let c=(n-t)*.5,u=this.valueSize;this._weightPrev=c/(t-o),this._weightNext=c/(l-n),this._offsetPrev=s*u,this._offsetNext=r*u}interpolate_(e,t,n,i){let s=this.resultBuffer,r=this.sampleValues,o=this.valueSize,l=e*o,c=l-o,u=this._offsetPrev,f=this._offsetNext,h=this._weightPrev,d=this._weightNext,p=(n-t)/(i-t),m=p*p,g=m*p,_=-h*g+2*h*m-h*p,M=(1+h)*g+(-1.5-2*h)*m+(-.5+h)*p+1,y=(-1-d)*g+(1.5+d)*m+.5*p,v=d*g-d*m;for(let b=0;b!==o;++b)s[b]=_*r[u+b]+M*r[c+b]+y*r[l+b]+v*r[f+b];return s}},rs=class extends $t{constructor(e,t,n,i){super(e,t,n,i)}interpolate_(e,t,n,i){let s=this.resultBuffer,r=this.sampleValues,o=this.valueSize,l=e*o,c=l-o,u=(n-t)/(i-t),f=1-u;for(let h=0;h!==o;++h)s[h]=r[c+h]*f+r[l+h]*u;return s}},os=class extends $t{constructor(e,t,n,i){super(e,t,n,i)}interpolate_(e){return this.copySampleValue_(e-1)}},Oe=class{constructor(e,t,n,i){if(e===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(t===void 0||t.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+e);this.name=e,this.times=Xn(t,this.TimeBufferType),this.values=Xn(n,this.ValueBufferType),this.setInterpolation(i||this.DefaultInterpolation)}static toJSON(e){let t=e.constructor,n;if(t.toJSON!==this.toJSON)n=t.toJSON(e);else{n={name:e.name,times:Xn(e.times,Array),values:Xn(e.values,Array)};let i=e.getInterpolation();i!==e.DefaultInterpolation&&(n.interpolation=i)}return n.type=e.ValueTypeName,n}InterpolantFactoryMethodDiscrete(e){return new os(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new rs(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new ss(this.times,this.values,this.getValueSize(),e)}setInterpolation(e){let t;switch(e){case $n:t=this.InterpolantFactoryMethodDiscrete;break;case Bi:t=this.InterpolantFactoryMethodLinear;break;case di:t=this.InterpolantFactoryMethodSmooth;break}if(t===void 0){let n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(n);return console.warn("THREE.KeyframeTrack:",n),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return $n;case this.InterpolantFactoryMethodLinear:return Bi;case this.InterpolantFactoryMethodSmooth:return di}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){let t=this.times;for(let n=0,i=t.length;n!==i;++n)t[n]+=e}return this}scale(e){if(e!==1){let t=this.times;for(let n=0,i=t.length;n!==i;++n)t[n]*=e}return this}trim(e,t){let n=this.times,i=n.length,s=0,r=i-1;for(;s!==i&&n[s]<e;)++s;for(;r!==-1&&n[r]>t;)--r;if(++r,s!==0||r!==i){s>=r&&(r=Math.max(r,1),s=r-1);let o=this.getValueSize();this.times=n.slice(s,r),this.values=this.values.slice(s*o,r*o)}return this}validate(){let e=!0,t=this.getValueSize();t-Math.floor(t)!==0&&(console.error("THREE.KeyframeTrack: Invalid value size in track.",this),e=!1);let n=this.times,i=this.values,s=n.length;s===0&&(console.error("THREE.KeyframeTrack: Track is empty.",this),e=!1);let r=null;for(let o=0;o!==s;o++){let l=n[o];if(typeof l=="number"&&isNaN(l)){console.error("THREE.KeyframeTrack: Time is not a valid number.",this,o,l),e=!1;break}if(r!==null&&r>l){console.error("THREE.KeyframeTrack: Out of order keys.",this,o,l,r),e=!1;break}r=l}if(i!==void 0&&Rc(i))for(let o=0,l=i.length;o!==l;++o){let c=i[o];if(isNaN(c)){console.error("THREE.KeyframeTrack: Value is not a valid number.",this,o,c),e=!1;break}}return e}optimize(){let e=this.times.slice(),t=this.values.slice(),n=this.getValueSize(),i=this.getInterpolation()===di,s=e.length-1,r=1;for(let o=1;o<s;++o){let l=!1,c=e[o],u=e[o+1];if(c!==u&&(o!==1||c!==e[0]))if(i)l=!0;else{let f=o*n,h=f-n,d=f+n;for(let p=0;p!==n;++p){let m=t[f+p];if(m!==t[h+p]||m!==t[d+p]){l=!0;break}}}if(l){if(o!==r){e[r]=e[o];let f=o*n,h=r*n;for(let d=0;d!==n;++d)t[h+d]=t[f+d]}++r}}if(s>0){e[r]=e[s];for(let o=s*n,l=r*n,c=0;c!==n;++c)t[l+c]=t[o+c];++r}return r!==e.length?(this.times=e.slice(0,r),this.values=t.slice(0,r*n)):(this.times=e,this.values=t),this}clone(){let e=this.times.slice(),t=this.values.slice(),n=this.constructor,i=new n(this.name,e,t);return i.createInterpolant=this.createInterpolant,i}};Oe.prototype.TimeBufferType=Float32Array;Oe.prototype.ValueBufferType=Float32Array;Oe.prototype.DefaultInterpolation=Bi;var bt=class extends Oe{constructor(e,t,n){super(e,t,n)}};bt.prototype.ValueTypeName="bool";bt.prototype.ValueBufferType=Array;bt.prototype.DefaultInterpolation=$n;bt.prototype.InterpolantFactoryMethodLinear=void 0;bt.prototype.InterpolantFactoryMethodSmooth=void 0;var as=class extends Oe{};as.prototype.ValueTypeName="color";var ls=class extends Oe{};ls.prototype.ValueTypeName="number";var cs=class extends $t{constructor(e,t,n,i){super(e,t,n,i)}interpolate_(e,t,n,i){let s=this.resultBuffer,r=this.sampleValues,o=this.valueSize,l=(n-t)/(i-t),c=e*o;for(let u=c+o;c!==u;c+=4)ot.slerpFlat(s,0,r,c-o,r,c,l);return s}},si=class extends Oe{InterpolantFactoryMethodLinear(e){return new cs(this.times,this.values,this.getValueSize(),e)}};si.prototype.ValueTypeName="quaternion";si.prototype.InterpolantFactoryMethodSmooth=void 0;var St=class extends Oe{constructor(e,t,n){super(e,t,n)}};St.prototype.ValueTypeName="string";St.prototype.ValueBufferType=Array;St.prototype.DefaultInterpolation=$n;St.prototype.InterpolantFactoryMethodLinear=void 0;St.prototype.InterpolantFactoryMethodSmooth=void 0;var hs=class extends Oe{};hs.prototype.ValueTypeName="vector";var us=class{constructor(e,t,n){let i=this,s=!1,r=0,o=0,l,c=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this.itemStart=function(u){o++,s===!1&&i.onStart!==void 0&&i.onStart(u,r,o),s=!0},this.itemEnd=function(u){r++,i.onProgress!==void 0&&i.onProgress(u,r,o),r===o&&(s=!1,i.onLoad!==void 0&&i.onLoad())},this.itemError=function(u){i.onError!==void 0&&i.onError(u)},this.resolveURL=function(u){return l?l(u):u},this.setURLModifier=function(u){return l=u,this},this.addHandler=function(u,f){return c.push(u,f),this},this.removeHandler=function(u){let f=c.indexOf(u);return f!==-1&&c.splice(f,2),this},this.getHandler=function(u){for(let f=0,h=c.length;f<h;f+=2){let d=c[f],p=c[f+1];if(d.global&&(d.lastIndex=0),d.test(u))return p}return null}}},Cc=new us,fs=class{constructor(e){this.manager=e!==void 0?e:Cc,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={}}load(){}loadAsync(e,t){let n=this;return new Promise(function(i,s){n.load(e,i,t,s)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}};fs.DEFAULT_MATERIAL_NAME="__DEFAULT";var gs="\\[\\]\\.:\\/",Pc=new RegExp("["+gs+"]","g"),_s="[^"+gs+"]",Ic="[^"+gs.replace("\\.","")+"]",Lc=/((?:WC+[\/:])*)/.source.replace("WC",_s),Dc=/(WCOD+)?/.source.replace("WCOD",Ic),Uc=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",_s),Nc=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",_s),Fc=new RegExp("^"+Lc+Dc+Uc+Nc+"$"),kc=["material","materials","bones","map"],ds=class{constructor(e,t,n){let i=n||ie.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,i)}getValue(e,t){this.bind();let n=this._targetGroup.nCachedObjects_,i=this._bindings[n];i!==void 0&&i.getValue(e,t)}setValue(e,t){let n=this._bindings;for(let i=this._targetGroup.nCachedObjects_,s=n.length;i!==s;++i)n[i].setValue(e,t)}bind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].bind()}unbind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].unbind()}},ie=class a{constructor(e,t,n){this.path=t,this.parsedPath=n||a.parseTrackName(t),this.node=a.findNode(e,this.parsedPath.nodeName),this.rootNode=e,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(e,t,n){return e&&e.isAnimationObjectGroup?new a.Composite(e,t,n):new a(e,t,n)}static sanitizeNodeName(e){return e.replace(/\s/g,"_").replace(Pc,"")}static parseTrackName(e){let t=Fc.exec(e);if(t===null)throw new Error("PropertyBinding: Cannot parse trackName: "+e);let n={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},i=n.nodeName&&n.nodeName.lastIndexOf(".");if(i!==void 0&&i!==-1){let s=n.nodeName.substring(i+1);kc.indexOf(s)!==-1&&(n.nodeName=n.nodeName.substring(0,i),n.objectName=s)}if(n.propertyName===null||n.propertyName.length===0)throw new Error("PropertyBinding: can not parse propertyName from trackName: "+e);return n}static findNode(e,t){if(t===void 0||t===""||t==="."||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){let n=e.skeleton.getBoneByName(t);if(n!==void 0)return n}if(e.children){let n=function(s){for(let r=0;r<s.length;r++){let o=s[r];if(o.name===t||o.uuid===t)return o;let l=n(o.children);if(l)return l}return null},i=n(e.children);if(i)return i}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){let n=this.resolvedProperty;for(let i=0,s=n.length;i!==s;++i)e[t++]=n[i]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){let n=this.resolvedProperty;for(let i=0,s=n.length;i!==s;++i)n[i]=e[t++]}_setValue_array_setNeedsUpdate(e,t){let n=this.resolvedProperty;for(let i=0,s=n.length;i!==s;++i)n[i]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){let n=this.resolvedProperty;for(let i=0,s=n.length;i!==s;++i)n[i]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let e=this.node,t=this.parsedPath,n=t.objectName,i=t.propertyName,s=t.propertyIndex;if(e||(e=a.findNode(this.rootNode,t.nodeName),this.node=e),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!e){console.warn("THREE.PropertyBinding: No target node found for track: "+this.path+".");return}if(n){let c=t.objectIndex;switch(n){case"materials":if(!e.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.materials){console.error("THREE.PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}e=e.material.materials;break;case"bones":if(!e.skeleton){console.error("THREE.PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}e=e.skeleton.bones;for(let u=0;u<e.length;u++)if(e[u].name===c){c=u;break}break;case"map":if("map"in e){e=e.map;break}if(!e.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.map){console.error("THREE.PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}e=e.material.map;break;default:if(e[n]===void 0){console.error("THREE.PropertyBinding: Can not bind to objectName of node undefined.",this);return}e=e[n]}if(c!==void 0){if(e[c]===void 0){console.error("THREE.PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,e);return}e=e[c]}}let r=e[i];if(r===void 0){let c=t.nodeName;console.error("THREE.PropertyBinding: Trying to update property for track: "+c+"."+i+" but it wasn't found.",e);return}let o=this.Versioning.None;this.targetObject=e,e.needsUpdate!==void 0?o=this.Versioning.NeedsUpdate:e.matrixWorldNeedsUpdate!==void 0&&(o=this.Versioning.MatrixWorldNeedsUpdate);let l=this.BindingType.Direct;if(s!==void 0){if(i==="morphTargetInfluences"){if(!e.geometry){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!e.geometry.morphAttributes){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}e.morphTargetDictionary[s]!==void 0&&(s=e.morphTargetDictionary[s])}l=this.BindingType.ArrayElement,this.resolvedProperty=r,this.propertyIndex=s}else r.fromArray!==void 0&&r.toArray!==void 0?(l=this.BindingType.HasFromToArray,this.resolvedProperty=r):Array.isArray(r)?(l=this.BindingType.EntireArray,this.resolvedProperty=r):this.propertyName=i;this.getValue=this.GetterByBindingType[l],this.setValue=this.SetterByBindingTypeAndVersioning[l][o]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};ie.Composite=ds;ie.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};ie.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};ie.prototype.GetterByBindingType=[ie.prototype._getValue_direct,ie.prototype._getValue_array,ie.prototype._getValue_arrayElement,ie.prototype._getValue_toArray];ie.prototype.SetterByBindingTypeAndVersioning=[[ie.prototype._setValue_direct,ie.prototype._setValue_direct_setNeedsUpdate,ie.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[ie.prototype._setValue_array,ie.prototype._setValue_array_setNeedsUpdate,ie.prototype._setValue_array_setMatrixWorldNeedsUpdate],[ie.prototype._setValue_arrayElement,ie.prototype._setValue_arrayElement_setNeedsUpdate,ie.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[ie.prototype._setValue_fromArray,ie.prototype._setValue_fromArray_setNeedsUpdate,ie.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var Mh=new Float32Array(1);var gr=new x,Yn=new x,ri=class{constructor(e=new x,t=new x){this.start=e,this.end=t}set(e,t){return this.start.copy(e),this.end.copy(t),this}copy(e){return this.start.copy(e.start),this.end.copy(e.end),this}getCenter(e){return e.addVectors(this.start,this.end).multiplyScalar(.5)}delta(e){return e.subVectors(this.end,this.start)}distanceSq(){return this.start.distanceToSquared(this.end)}distance(){return this.start.distanceTo(this.end)}at(e,t){return this.delta(t).multiplyScalar(e).add(this.start)}closestPointToPointParameter(e,t){gr.subVectors(e,this.start),Yn.subVectors(this.end,this.start);let n=Yn.dot(Yn),s=Yn.dot(gr)/n;return t&&(s=he(s,0,1)),s}closestPointToPoint(e,t,n){let i=this.closestPointToPointParameter(e,t);return this.delta(n).multiplyScalar(i).add(this.start)}applyMatrix4(e){return this.start.applyMatrix4(e),this.end.applyMatrix4(e),this}equals(e){return e.start.equals(this.start)&&e.end.equals(this.end)}clone(){return new this.constructor().copy(this)}};typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:_r}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=_r);var vn=new x;function De(a,e,t,n,i,s){let r=2*Math.PI*i/4,o=Math.max(s-2*i,0),l=Math.PI/4;vn.copy(e),vn[n]=0,vn.normalize();let c=.5*r/(r+o),u=1-vn.angleTo(a)/l;return Math.sign(vn[t])===1?u*c:o/(r+o)+c+c*(1-u)}var Mn=class extends je{constructor(e=1,t=1,n=1,i=2,s=.1){if(i=i*2+1,s=Math.min(e/2,t/2,n/2,s),super(1,1,1,i,i,i),i===1)return;let r=this.toNonIndexed();this.index=null,this.attributes.position=r.attributes.position,this.attributes.normal=r.attributes.normal,this.attributes.uv=r.attributes.uv;let o=new x,l=new x,c=new x(e,t,n).divideScalar(2).subScalar(s),u=this.attributes.position.array,f=this.attributes.normal.array,h=this.attributes.uv.array,d=u.length/6,p=new x,m=.5/i;for(let g=0,_=0;g<u.length;g+=3,_+=2)switch(o.fromArray(u,g),l.copy(o),l.x-=Math.sign(l.x)*m,l.y-=Math.sign(l.y)*m,l.z-=Math.sign(l.z)*m,l.normalize(),u[g+0]=c.x*Math.sign(o.x)+l.x*s,u[g+1]=c.y*Math.sign(o.y)+l.y*s,u[g+2]=c.z*Math.sign(o.z)+l.z*s,f[g+0]=l.x,f[g+1]=l.y,f[g+2]=l.z,Math.floor(g/d)){case 0:p.set(1,0,0),h[_+0]=De(p,l,"z","y",s,n),h[_+1]=1-De(p,l,"y","z",s,t);break;case 1:p.set(-1,0,0),h[_+0]=1-De(p,l,"z","y",s,n),h[_+1]=1-De(p,l,"y","z",s,t);break;case 2:p.set(0,1,0),h[_+0]=1-De(p,l,"x","z",s,e),h[_+1]=De(p,l,"z","x",s,n);break;case 3:p.set(0,-1,0),h[_+0]=1-De(p,l,"x","z",s,e),h[_+1]=1-De(p,l,"z","x",s,n);break;case 4:p.set(0,0,1),h[_+0]=1-De(p,l,"x","y",s,e),h[_+1]=1-De(p,l,"y","x",s,t);break;case 5:p.set(0,0,-1),h[_+0]=De(p,l,"x","y",s,e),h[_+1]=1-De(p,l,"y","x",s,t);break}}};var li=0,Oc=1,zc=new x,Cr=new ri,xs=new Jn,Pr=new x,ai=new Je,ci=class{constructor(){this.tolerance=-1,this.faces=[],this.newFaces=[],this.assigned=new hi,this.unassigned=new hi,this.vertices=[]}setFromPoints(e){if(e.length>=4){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.vertices.push(new vs(e[t]));this.compute()}return this}setFromObject(e){let t=[];return e.updateMatrixWorld(!0),e.traverse(function(n){let i=n.geometry;if(i!==void 0){let s=i.attributes.position;if(s!==void 0)for(let r=0,o=s.count;r<o;r++){let l=new x;l.fromBufferAttribute(s,r).applyMatrix4(n.matrixWorld),t.push(l)}}}),this.setFromPoints(t)}containsPoint(e){let t=this.faces;for(let n=0,i=t.length;n<i;n++)if(t[n].distanceToPoint(e)>this.tolerance)return!1;return!0}intersectRay(e,t){let n=this.faces,i=-1/0,s=1/0;for(let r=0,o=n.length;r<o;r++){let l=n[r],c=l.distanceToPoint(e.origin),u=l.normal.dot(e.direction);if(c>0&&u>=0)return null;let f=u!==0?-c/u:0;if(!(f<=0)&&(u>0?s=Math.min(f,s):i=Math.max(f,i),i>s))return null}return i!==-1/0?e.at(i,t):e.at(s,t),t}intersectsRay(e){return this.intersectRay(e,zc)!==null}makeEmpty(){return this.faces=[],this.vertices=[],this}addVertexToFace(e,t){return e.face=t,t.outside===null?this.assigned.append(e):this.assigned.insertBefore(t.outside,e),t.outside=e,this}removeVertexFromFace(e,t){return e===t.outside&&(e.next!==null&&e.next.face===t?t.outside=e.next:t.outside=null),this.assigned.remove(e),this}removeAllVerticesFromFace(e){if(e.outside!==null){let t=e.outside,n=e.outside;for(;n.next!==null&&n.next.face===e;)n=n.next;return this.assigned.removeSubList(t,n),t.prev=n.next=null,e.outside=null,t}}deleteFaceVertices(e,t){let n=this.removeAllVerticesFromFace(e);if(n!==void 0)if(t===void 0)this.unassigned.appendChain(n);else{let i=n;do{let s=i.next;t.distanceToPoint(i.point)>this.tolerance?this.addVertexToFace(i,t):this.unassigned.append(i),i=s}while(i!==null)}return this}resolveUnassignedPoints(e){if(this.unassigned.isEmpty()===!1){let t=this.unassigned.first();do{let n=t.next,i=this.tolerance,s=null;for(let r=0;r<e.length;r++){let o=e[r];if(o.mark===li){let l=o.distanceToPoint(t.point);if(l>i&&(i=l,s=o),i>1e3*this.tolerance)break}}s!==null&&this.addVertexToFace(t,s),t=n}while(t!==null)}return this}computeExtremes(){let e=new x,t=new x,n=[],i=[];for(let s=0;s<3;s++)n[s]=i[s]=this.vertices[0];e.copy(this.vertices[0].point),t.copy(this.vertices[0].point);for(let s=0,r=this.vertices.length;s<r;s++){let o=this.vertices[s],l=o.point;for(let c=0;c<3;c++)l.getComponent(c)<e.getComponent(c)&&(e.setComponent(c,l.getComponent(c)),n[c]=o);for(let c=0;c<3;c++)l.getComponent(c)>t.getComponent(c)&&(t.setComponent(c,l.getComponent(c)),i[c]=o)}return this.tolerance=3*Number.EPSILON*(Math.max(Math.abs(e.x),Math.abs(t.x))+Math.max(Math.abs(e.y),Math.abs(t.y))+Math.max(Math.abs(e.z),Math.abs(t.z))),{min:n,max:i}}computeInitialHull(){let e=this.vertices,t=this.computeExtremes(),n=t.min,i=t.max,s=0,r=0;for(let h=0;h<3;h++){let d=i[h].point.getComponent(h)-n[h].point.getComponent(h);d>s&&(s=d,r=h)}let o=n[r],l=i[r],c,u;s=0,Cr.set(o.point,l.point);for(let h=0,d=this.vertices.length;h<d;h++){let p=e[h];if(p!==o&&p!==l){Cr.closestPointToPoint(p.point,!0,Pr);let m=Pr.distanceToSquared(p.point);m>s&&(s=m,c=p)}}s=-1,xs.setFromCoplanarPoints(o.point,l.point,c.point);for(let h=0,d=this.vertices.length;h<d;h++){let p=e[h];if(p!==o&&p!==l&&p!==c){let m=Math.abs(xs.distanceToPoint(p.point));m>s&&(s=m,u=p)}}let f=[];if(xs.distanceToPoint(u.point)<0){f.push(ze.create(o,l,c),ze.create(u,l,o),ze.create(u,c,l),ze.create(u,o,c));for(let h=0;h<3;h++){let d=(h+1)%3;f[h+1].getEdge(2).setTwin(f[0].getEdge(d)),f[h+1].getEdge(1).setTwin(f[d+1].getEdge(0))}}else{f.push(ze.create(o,c,l),ze.create(u,o,l),ze.create(u,l,c),ze.create(u,c,o));for(let h=0;h<3;h++){let d=(h+1)%3;f[h+1].getEdge(2).setTwin(f[0].getEdge((3-h)%3)),f[h+1].getEdge(0).setTwin(f[d+1].getEdge(1))}}for(let h=0;h<4;h++)this.faces.push(f[h]);for(let h=0,d=e.length;h<d;h++){let p=e[h];if(p!==o&&p!==l&&p!==c&&p!==u){s=this.tolerance;let m=null;for(let g=0;g<4;g++){let _=this.faces[g].distanceToPoint(p.point);_>s&&(s=_,m=this.faces[g])}m!==null&&this.addVertexToFace(p,m)}}return this}reindexFaces(){let e=[];for(let t=0;t<this.faces.length;t++){let n=this.faces[t];n.mark===li&&e.push(n)}return this.faces=e,this}nextVertexToAdd(){if(this.assigned.isEmpty()===!1){let e,t=0,n=this.assigned.first().face,i=n.outside;do{let s=n.distanceToPoint(i.point);s>t&&(t=s,e=i),i=i.next}while(i!==null&&i.face===n);return e}}computeHorizon(e,t,n,i){this.deleteFaceVertices(n),n.mark=Oc;let s;t===null?s=t=n.getEdge(0):s=t.next;do{let r=s.twin,o=r.face;o.mark===li&&(o.distanceToPoint(e)>this.tolerance?this.computeHorizon(e,r,o,i):i.push(s)),s=s.next}while(s!==t);return this}addAdjoiningFace(e,t){let n=ze.create(e,t.tail(),t.head());return this.faces.push(n),n.getEdge(-1).setTwin(t.twin),n.getEdge(0)}addNewFaces(e,t){this.newFaces=[];let n=null,i=null;for(let s=0;s<t.length;s++){let r=t[s],o=this.addAdjoiningFace(e,r);n===null?n=o:o.next.setTwin(i),this.newFaces.push(o.face),i=o}return n.next.setTwin(i),this}addVertexToHull(e){let t=[];return this.unassigned.clear(),this.removeVertexFromFace(e,e.face),this.computeHorizon(e.point,null,e.face,t),this.addNewFaces(e,t),this.resolveUnassignedPoints(this.newFaces),this}cleanup(){return this.assigned.clear(),this.unassigned.clear(),this.newFaces=[],this}compute(){let e;for(this.computeInitialHull();(e=this.nextVertexToAdd())!==void 0;)this.addVertexToHull(e);return this.reindexFaces(),this.cleanup(),this}},ze=class a{constructor(){this.normal=new x,this.midpoint=new x,this.area=0,this.constant=0,this.outside=null,this.mark=li,this.edge=null}static create(e,t,n){let i=new a,s=new yn(e,i),r=new yn(t,i),o=new yn(n,i);return s.next=o.prev=r,r.next=s.prev=o,o.next=r.prev=s,i.edge=s,i.compute()}getEdge(e){let t=this.edge;for(;e>0;)t=t.next,e--;for(;e<0;)t=t.prev,e++;return t}compute(){let e=this.edge.tail(),t=this.edge.head(),n=this.edge.next.head();return ai.set(e.point,t.point,n.point),ai.getNormal(this.normal),ai.getMidpoint(this.midpoint),this.area=ai.getArea(),this.constant=this.normal.dot(this.midpoint),this}distanceToPoint(e){return this.normal.dot(e)-this.constant}},yn=class{constructor(e,t){this.vertex=e,this.prev=null,this.next=null,this.twin=null,this.face=t}head(){return this.vertex}tail(){return this.prev?this.prev.vertex:null}length(){let e=this.head(),t=this.tail();return t!==null?t.point.distanceTo(e.point):-1}lengthSquared(){let e=this.head(),t=this.tail();return t!==null?t.point.distanceToSquared(e.point):-1}setTwin(e){return this.twin=e,e.twin=this,this}},vs=class{constructor(e){this.point=e,this.prev=null,this.next=null,this.face=null}},hi=class{constructor(){this.head=null,this.tail=null}first(){return this.head}last(){return this.tail}clear(){return this.head=this.tail=null,this}insertBefore(e,t){return t.prev=e.prev,t.next=e,t.prev===null?this.head=t:t.prev.next=t,e.prev=t,this}insertAfter(e,t){return t.prev=e,t.next=e.next,t.next===null?this.tail=t:t.next.prev=t,e.next=t,this}append(e){return this.head===null?this.head=e:this.tail.next=e,e.prev=this.tail,e.next=null,this.tail=e,this}appendChain(e){for(this.head===null?this.head=e:this.tail.next=e,e.prev=this.tail;e.next!==null;)e=e.next;return this.tail=e,this}remove(e){return e.prev===null?this.head=e.next:e.prev.next=e.next,e.next===null?this.tail=e.prev:e.next.prev=e.prev,this}removeSubList(e,t){return e.prev===null?this.head=t.next:e.prev.next=t.next,t.next===null?this.tail=e.prev:t.next.prev=e.prev,this}isEmpty(){return this.head===null}};var ui=class extends Re{constructor(e=[]){super();let t=[],n=[],s=new ci().setFromPoints(e).faces;for(let r=0;r<s.length;r++){let o=s[r],l=o.edge;do{let c=l.head().point;t.push(c.x,c.y,c.z),n.push(o.normal.x,o.normal.y,o.normal.z),l=l.next}while(l!==o.edge)}this.setAttribute("position",new J(t,3)),this.setAttribute("normal",new J(n,3))}};function Ir(a,e=1e-4){e=Math.max(e,Number.EPSILON);let t={},n=a.getIndex(),i=a.getAttribute("position"),s=n?n.count:i.count,r=0,o=Object.keys(a.attributes),l={},c={},u=[],f=["getX","getY","getZ","getW"],h=["setX","setY","setZ","setW"];for(let M=0,y=o.length;M<y;M++){let v=o[M],b=a.attributes[v];l[v]=new b.constructor(new b.array.constructor(b.count*b.itemSize),b.itemSize,b.normalized);let S=a.morphAttributes[v];S&&(c[v]||(c[v]=[]),S.forEach((w,E)=>{let U=new w.array.constructor(w.count*w.itemSize);c[v][E]=new w.constructor(U,w.itemSize,w.normalized)}))}let d=e*.5,p=Math.log10(1/e),m=Math.pow(10,p),g=d*m;for(let M=0;M<s;M++){let y=n?n.getX(M):M,v="";for(let b=0,S=o.length;b<S;b++){let w=o[b],E=a.getAttribute(w),U=E.itemSize;for(let L=0;L<U;L++)v+=`${~~(E[f[L]](y)*m+g)},`}if(v in t)u.push(t[v]);else{for(let b=0,S=o.length;b<S;b++){let w=o[b],E=a.getAttribute(w),U=a.morphAttributes[w],L=E.itemSize,D=l[w],V=c[w];for(let k=0;k<L;k++){let O=f[k],$=h[k];if(D[$](r,E[O](y)),U)for(let Y=0,re=U.length;Y<re;Y++)V[Y][$](r,U[Y][O](y))}}t[v]=r,u.push(r),r++}}let _=a.clone();for(let M in a.attributes){let y=l[M];if(_.setAttribute(M,new y.constructor(y.array.slice(0,r*y.itemSize),y.itemSize,y.normalized)),M in c)for(let v=0;v<c[M].length;v++){let b=c[M][v];_.morphAttributes[M][v]=new b.constructor(b.array.slice(0,r*b.itemSize),b.itemSize,b.normalized)}}return _.setIndex(u),_}var Z=(a,e,t,n,i={})=>({kind:a,body:e,lensR:t,lensLen:n,...i}),Bc={slr:Z("slr",[14,8.8,5],2.8,4.2,{prism:"nikon",lever:!0}),rangefinder:Z("rf",[13.6,7.8,3.6],2.1,2.6,{lever:!0,lensX:-.4}),compact:Z("compact",[11.8,6.4,3.8],1.5,1.2,{shape:"pill",lensX:.6}),mediumFormat:Z("cube",[8.4,8.4,7.2],3.5,6.4)},ge=(a,e,t={})=>Z("slr",a,2.8,4,{prism:e,lever:!0,...t}),Ms=(a,e=3,t=5.6)=>Z("afslr",a,e,t),Lr=(a={})=>Z("rf",[13.8,7.7,3.8],2.1,2.5,{lens:"leica",lever:!0,roundEnds:!0,lensX:-.5,...a}),Et=(a,e,t,n={})=>Z("rf",a,e,t,{lens:"fixed",windows:"two",lever:!0,lensX:0,...n}),ae=(a,e,t,n,i={})=>Z("compact",a,t,n,{shape:e,lensX:.6,...i}),Hc=[[["nikonfm","nikonfm2","nikonfm3a","nikonfe","nikonfe2","nikonfa","nikonfm10","nikonfe10","nikonem","nikonfg","nikonfg-20"],ge([14.2,8.9,5],"nikon")],[["nikonnikkormatft2","nikonnikkormatftn"],ge([14.8,9.6,5.4],"pointed")],[["nikonf","nikonf2"],ge([14.8,9.8,5.4],"f")],[["nikonf3"],ge([14.8,9.6,5.6],"tall",{lever:!0})],[["canonae-1","canonae-1program","canona-1","canonav-1","canonat-1","canonal-1"],ge([14.1,8.7,4.8],"canon")],[["canonftb"],ge([14.4,9.3,4.4],"pointed")],[["canonf-1","canonnewf-1"],ge([14.7,9.9,4.8],"tall")],[["olympusom-1","olympusom-1n","olympusom-2","olympusom-2n","olympusom-2sp","olympusom-3","olympusom-4","olympusom-4ti","olympusom-10","olympusom-20","olympusom-40"],ge([13.6,8.3,5],"om",{lens:"prime"})],[["pentaxk1000","pentaxkx","pentaxkm","pentaxspotmatic","pentaxspotmaticf"],ge([14.3,9.2,4.8],"pointed")],[["pentaxmx","pentaxme","pentaxmesuper","pentaxlx","pentaxsupera","pentaxprograma"],ge([13.1,8.3,4.9],"om")],[["minoltax-700","minoltax-570","minoltax-370","minoltax-300","minoltaxd","minoltaxg-m","minoltaxg-1","minoltaxe"],ge([13.6,8.9,5.1],"canon")],[["minoltasr-t101","minoltasr-t102","minoltasr-t201"],ge([14.8,9.3,4.8],"pointed")],[["zenite","zenitet","zenit12xp"],ge([14.2,10,5],"pointed")],[["prakticamtl3","prakticamtl5","prakticabx20"],ge([14.3,9.4,4.8],"pointed")],[["contaxrtsii","contax167mt","contaxaria","contax139quartz","contaxst","leicar6.2"],ge([14.2,9.2,5],"tall")],[["yashicafx-3super2000","yashicafx-d","yashicafr","ricohkr-5","ricohxr-7","chinonce-4","cosinact-1","fujicast801","konicaautoreflext3","konicafs-1"],ge([13.8,8.8,4.8],"nikon")],[["kiev60"],ge([18.6,15,8],"canon",{lens:"mf",grip:!0})],[["pentax67","pentax67ii"],Z("slr",[18.4,15,7.4],4,6,{prism:"canon",lens:"mf",lever:!0,grip:!0})],[["nikonf100","nikonf5","nikonf6","canoneos-1v","canoneos-1n","canoneos3","nikonf4"],Ms([15.6,11.2,7],3.2,6.2)],[["nikonf90x","nikonf-801","nikonf-601","nikonf-501","canont90","canoneos5","canoneos650","canoneos620","minoltaalpha7","minoltaalpha9","minoltamaxxum7000","minoltax-7"],Ms([15,10.4,6.8])],[["nikonf80","nikonf75","nikonf65","nikonf55","nikonf-401","nikonf-301","canoneos30","canoneos300","canoneos300v","canoneos500n","canont70","canont50","pentaxmz-5","pentaxmz-3","pentaxmz-s","pentaxp30"],Ms([14.1,9.6,6.6],2.9,5)],[["leicam6","leicam6ttl","leicam7","leicam4-p","leicam4-2","leicam5"],Lr({badge:"red"})],[["leicam2","leicam3","leicam4","leicamp","leicam-a"],Lr()],[["minoltacle","leicacl"],Z("rf",[12.1,7.6,3.2],2,2.4,{lens:"leica",lever:!0,roundEnds:!0,lensX:-.3})],[["konicahexarrf","zeissikonzm","voigtl\xE4nderbessar2","voigtl\xE4nderbessar2a","voigtl\xE4nderbessar3a","voigtl\xE4nderbessar4a","voigtl\xE4nderbessar","voigtl\xE4nderbessa-l"],Z("rf",[13.6,8,3.6],2.1,2.5,{lens:"leica",lever:!0,lensX:-.4,windows:"two"})],[["leicaiiif","leicaiiig","fed2","fed3","zorki4"],Z("rf",[13.4,6.8,3.3],1.8,2.2,{lens:"small",roundEnds:!0,lensX:0,windows:"two"})],[["fed5","canonp","canon7"],Z("rf",[14.2,8.2,3.6],2,2.6,{lens:"small",lever:!0,lensX:0,windows:"two"})],[["contaxg1","contaxg2"],Z("rf",[13.9,8,4],2.2,2.6,{lens:"small",grip:!0,lensX:-.6,windows:"two"})],[["hasselbladxpan","fujifilmtx-1"],Z("rf",[16.5,8,4.4],2.4,3.2,{lens:"small",grip:!0,windows:"two"})],[["olympus35rc","olympus35sp","olympus35dc","olympus35ecr"],Et([11.3,7,4.2],2.2,2.2)],[["canoncanonetql17giii","canoncanonetql19","minoltahi-matic7s","minoltahi-matic7sii","konicac35","konicaautos2","yashicalynx14e","ricoh500g","kodaksignet35"],Et([12,7.5,4.2],2.3,2.6)],[["yashicaelectro35gsn","yashicaelectro35gt","yashicaelectro35cc"],Et([14,8.7,4.4],2.6,3)],[["olympustrip35"],Et([12.2,7.2,4.4],2,2,{selenium:!0,lever:!1})],[["zeissikoncontessa","kodakretinaiia"],Et([12.4,8,4],1.9,2.4,{lever:!1})],[["mamiya7","mamiya7ii"],Z("rf",[15.9,11.2,6],2.8,3.8,{lens:"small",grip:!0,lever:!0,lensX:-.4,windows:"two"})],[["mamiya6","mamiya6mf"],Z("rf",[16.6,11,6.2],2.9,2.2,{lens:"small",grip:!0,lensX:-.4,windows:"two"})],[["fujifilmgw690","fujifilmgw670","fujifilmgf670","fujifilmgsw690"],Et([18.2,12,8],3,4.4,{grip:!0})],[["plaubelmakina67"],Et([16.6,10.8,5.8],3,2.2,{lever:!1})],[["olympuspenf","olympuspenft"],Z("flattop",[12.4,7,3.6],2,2.6,{lens:"small",lever:!0,lensX:-.6})],[["contaxt2"],ae([11.9,6.7,3.3],"box",1.6,2.4,{lensX:.2,flash:"left"})],[["contaxt3","contaxt","yashicat5","yashicat4","yashicat3","yashicat2"],ae([10.5,6.3,3.2],"pill",1.4,1.2,{lensX:.5})],[["contaxtvs","contaxtvsii","contaxtvsiii","nikon28ti","nikon35ti"],ae([11.8,6.5,3.8],"box",1.7,2,{lensX:.4})],[["leicaminilux","leicacm","leicamini","leicaminiii","leicac2","leicaz2x","minoltatc-1","ricohr1","ricohr1s"],ae([11.8,6.4,3.4],"box",1.5,1.6,{lensX:.6})],[["ricohgr1","ricohgr1s","ricohgr1v","ricohgr10","ricohgr21"],ae([11.7,6.1,2.7],"box",1.3,.8,{grip:!0,lensX:.9})],[["nikonaf600","nikonlitetouchzoom70w","nikonzoom300"],ae([11.7,6.3,3.8],"pill",1.4,1,{lensX:.4,flash:"right"})],[["konicabigmini","konicabigminibm-301","konicabigminibm-302"],ae([11.3,6.4,3.2],"round",1.4,1,{lensX:.9,flash:"left"})],[["konicahexaraf"],ae([13,7.3,4.6],"box",2.2,2.2,{lensX:.6,flash:"none"})],[["fujifilmklassew","fujifilmklasses","fujifilmklasse","fujifilmtiara","fujifilmtiaraii","fujifilmnaturaclassica","fujifilmnaturablack","fujifilmsilvif2.8","fujifilmcardiamini","fujifilmdlsupermini","pentaxespiomini","minoltarivamini","canonprimamini","canonprimaminiii"],ae([11.7,6.3,3.8],"pill",1.4,1.2,{lensX:.6})],[["nikonl35af","nikonl35af2","nikonl35ad","nikonl35aw","nikonaf230","canonaf35m","canonaf35mii","canonaf35ml","canonautoboy3","canonautoboyluna","pentaxpc35af","pentaxpc35af-m","konicac35af","konicapop","minoltahi-maticaf2","olympusaf-1","olympusaf-10","yashicapartner","ricohff-1","ricohff-9","ricohyf-20","agfaoptima","canonsnappy"],ae([13,7.5,5],"box",1.9,1.6,{lensX:.4})],[["canonprimasuper105","pentaxzoom60","minoltarivazoom70","konicaz-up80","konicalexio70","fujifilmzoomdate90","nikontwzoom"],ae([12.4,7,5],"pill",1.7,2.2,{lensX:.5})],[["lomographylc-a","lomographylc-a+","lomographylc-wide"],ae([10.7,6.8,4.3],"box",1.4,.8,{lensX:0,flash:"none"})],[["rolleirollei35","rolleirollei35s","rolleirollei35se","rolleirollei35t"],ae([9.7,6,3.2],"box",1.5,2.2,{lensX:0,flash:"none"})],[["rolleipregomicron"],ae([11.4,6.2,3.6],"pill",1.4,1.2,{lensX:.5})],[["kodakm35","kodakm38","kodakfunsaver","lomographysimpleuse","vivitarultrawide&slim","ilfordsprite35-ii","ilfordilfocolorrapidretro","agfaphotolebox","superheadzblackslimdevil","halina35x","fujifilmquicksnap"],ae([11.6,6.2,3.4],"box",1.1,.5,{lensX:0})],[["lomographysprocketrocket"],ae([17,8.4,6.6],"box",2.6,1.6,{lensX:0,flash:"none"})],[["pentax17"],ae([11.8,7.5,4.6],"box",1.6,1.4,{lever:!0,lensX:0,flash:"none"})],[["kodakektarh35","kodakektarh35n"],ae([11,6.4,3.8],"box",1.3,.8,{lensX:0,flash:"right"})],[["olympuspenee-2","olympuspenee-3","olympuspenee-s","olympuspend","canondemiee17","konicarecorder"],ae([10.8,6.7,3.6],"box",1.5,1.4,{selenium:!0,lensX:0,flash:"none"})],[["yashicasamuraix3.0"],Z("slr",[9.2,13.4,9],2.8,5,{prism:"round",lens:"af"})],[["holga120n","holga120cfn","lomographydianaf+"],ae([13.6,9.6,7.6],"box",3,2.6,{lensX:0,flash:"none"})],[["fujifilmga645","fujifilmga645zi","fujifilmgs645s"],ae([13,9.6,6.8],"box",2.6,3.2,{lensX:.4})],[["olympusmju","olympusmju-ii"],Z("clamshell",[10.8,5.9,3.5],1.1,.4,{lensX:2})],[["olympusmjuzoom","olympusmju-iizoom80"],Z("clamshell",[11.8,6.4,4.2],1.4,.8,{lensX:2})],[["olympusxa"],Z("clamshell",[10.2,6.5,4],1.1,.4,{shape:"box",lensX:1.4,badge:"redbutton"})],[["olympusxa2","olympusxa3","olympusxa4"],Z("clamshell",[10.2,6.5,4],1.1,.4,{shape:"box",lensX:1.4})],[["rolleirolleiflex2.8f","rolleirolleiflex3.5f","rolleirolleicord","yashicamat-124g","yashicamat-124","yashicad","seagull4a","lomolubitel166"],Z("tlr",[9.8,14.4,9],2.5,2.6)],[["mamiyac330","mamiyac220"],Z("tlr",[11,15,10],2.8,3.6)],[["hasselblad500c","hasselblad500c/m","hasselblad501cm","hasselblad503cw","kiev88"],Z("cube",[8.5,8.5,7],3.4,6.2)],[["bronicasq-a","bronicasq-ai"],Z("cube",[9,9.2,7.4],3.5,6.4)],[["bronicags-1"],Z("cube",[10,10,8.6],3.9,6.8)],[["mamiyarb67","mamiyarz67"],Z("rb",[11,12,12],4.2,7.5)],[["pentax645","pentax645n","mamiya645pro","mamiya6451000s","bronicaetrs","bronicaetrsi"],Z("mf645",[14.6,10.8,9.8],3.4,5.6)]],Vc=(a,e)=>`${a}${e}`.toLowerCase().replace(/\s+/g,"");function ys(a,e,t){let n=Vc(a,e),i=Hc.find(([s])=>s.includes(n));return i?i[1]:Bc[t]}var B=Math.PI;function Gc(a){let e=a.clone().convertLinearToSRGB();return .299*e.r+.587*e.g+.114*e.b}function bs(a,e){let t=a.clone().convertLinearToSRGB();return t.r=Math.min(Math.max(t.r+e,0),1),t.g=Math.min(Math.max(t.g+e,0),1),t.b=Math.min(Math.max(t.b+e,0),1),t.convertSRGBToLinear()}var Dr=new Map;function wt(a,e,t,n,i=!0){if(typeof document>"u")return null;let s=Dr.get(a);if(s)return s;let r=document.createElement("canvas");r.width=e,r.height=t,n(r.getContext("2d"));let o=new jn(r);return i&&(o.colorSpace=He),o.anisotropy=4,Dr.set(a,o),o}function Ur(){let a=wt("leather",256,256,e=>{e.fillStyle="#d8d8d8",e.fillRect(0,0,256,256);let t=2654435769,n=()=>(t=t*1664525+1013904223>>>0)/2**32;for(let i=0;i<5200;i++){let s=200+(n()-.5)*90;e.fillStyle=`rgb(${s},${s},${s})`,e.beginPath(),e.arc(n()*256,n()*256,.6+n()*1.4,0,B*2),e.fill()}},!1);return a&&(a.wrapS=a.wrapT=Zn,a.repeat.set(.9,.9)),a}function Wc(){return wt("glass",256,256,a=>{let t=a.createRadialGradient(128,128,0,128,128,128);t.addColorStop(0,"#1a1a20"),t.addColorStop(.7,"#0c0c10"),t.addColorStop(1,"#050507"),a.fillStyle=t,a.fillRect(0,0,256,256);let n=(s,r,o)=>{a.strokeStyle=r,a.lineWidth=o,a.beginPath(),a.arc(256/2,256/2,s,0,B*2),a.stroke()};n(96,"rgba(120,120,124,0.22)",8),n(60,"rgba(110,110,114,0.18)",5);let i=(s,r,o,l)=>{let c=a.createRadialGradient(s,r,0,s,r,o);c.addColorStop(0,`rgba(255,255,255,${l})`),c.addColorStop(1,"rgba(255,255,255,0)"),a.fillStyle=c,a.fillRect(0,0,256,256)};i(256*.36,256*.33,36,.95),i(256*.6,256*.62,12,.6),i(256*.45,256*.42,80,.2)})}function Xc(){return wt("coated-glass",256,256,a=>{let t=a.createRadialGradient(128,128,6,128,128,128);t.addColorStop(0,"#22182c"),t.addColorStop(.45,"#101816"),t.addColorStop(1,"#07080a"),a.fillStyle=t,a.fillRect(0,0,256,256),a.strokeStyle="rgba(80, 190, 140, 0.4)",a.lineWidth=11,a.beginPath(),a.arc(256/2,256/2,86,.4,2.4),a.stroke(),a.strokeStyle="rgba(168, 96, 190, 0.34)",a.lineWidth=8,a.beginPath(),a.arc(256/2,256/2,54,2.6,5.4),a.stroke();let n=a.createRadialGradient(256*.36,256*.32,0,256*.36,256*.32,42);n.addColorStop(0,"rgba(255,255,255,0.9)"),n.addColorStop(1,"rgba(255,255,255,0)"),a.fillStyle=n,a.fillRect(0,0,256,256)})}function Yc(a){return wt(`lensring:${a}`,512,512,e=>{e.fillStyle="#101012",e.beginPath(),e.arc(256,256,256,0,B*2),e.fill(),e.fillStyle="#ececee",e.font="600 26px Helvetica, Arial, sans-serif",e.textAlign="center";let t=`LENS   MULTI COATED   \u2300${a}   `,n=214;for(let i=0;i<t.length;i++){let s=-B*.85+i/t.length*B*1.7;e.save(),e.translate(256+Math.cos(s)*n,256+Math.sin(s)*n),e.rotate(s+B/2),e.fillText(t[i],0,0),e.restore()}})}function Fr(a,e="#f2f2f2",t="#111113"){return wt(`scale:${a.join(",")}:${e}`,1024,64,n=>{n.fillStyle=t,n.fillRect(0,0,1024,64),n.fillStyle=e,n.font="600 30px Helvetica, Arial, sans-serif",n.textAlign="center",n.textBaseline="middle";let i=380;a.forEach((s,r)=>{let o=512-i/2+i*r/Math.max(1,a.length-1);n.save(),n.translate(o,32),n.scale(-1,1),n.fillText(s,0,2),n.restore()})})}function qc(a,e){return wt(`dial:${a.join(",")}:${e}`,256,256,t=>{t.fillStyle=e,t.strokeStyle=e,t.font="600 22px Helvetica, Arial, sans-serif",t.textAlign="center",t.textBaseline="middle",a.forEach((n,i)=>{let s=i/a.length*B*2;t.save(),t.translate(128+Math.sin(s)*92,128-Math.cos(s)*92),t.rotate(s),t.fillText(n,0,0),t.restore()}),t.lineWidth=3,t.beginPath(),t.arc(128,128,60,0,B*2),t.stroke()})}function Zc(a){let e=$c(a);for(let[t,n]of Object.entries(e))n instanceof Xt&&(n.name=t);return e}function $c(a){let e=new te(a),t=Gc(e)<.35,n=(i,s,r,o={})=>new lt({color:i,roughness:s,metalness:r,...o});return{leather:n(bs(e,t?.03:-.1),.88,0,{map:Ur(),bumpMap:Ur(),bumpScale:1.2}),plate:n(bs(e,t?.08:.02),t?.36:.3,t?.35:.8,{clearcoat:t?.6:.2,clearcoatRoughness:.3}),accent:n(bs(e,t?.12:.06),.28,t?.5:.9,{clearcoat:.4}),plastic:n(e,.5,.05,{clearcoat:.25,clearcoatRoughness:.5}),lensBlack:n(1118482,.4,.3,{clearcoat:.5,clearcoatRoughness:.35}),lensSatin:n(1710620,.55,.2),rubber:n(855310,.9,0),window:n(921620,.05,.2,{clearcoat:1,clearcoatRoughness:.02}),frosted:n(14474460,.45,.05),glass:new _t({map:Wc()}),red:n(13111342,.35,.1,{clearcoat:.8}),ink:t?"#e8e8e8":"#1a1a1a"}}function K(a,e,t,n=0,i=0){let s=Math.min(a,e)/2-.001,[r,o,l,c]=(typeof t=="number"?[t,t,t,t]:t).map(m=>Math.max(.001,Math.min(m,s))),u=n-a/2,f=n+a/2,h=i-e/2,d=i+e/2,p=new at;return p.moveTo(u+r,h),p.lineTo(f-o,h),p.absarc(f-o,h+o,o,-B/2,0,!1),p.lineTo(f,d-l),p.absarc(f-l,d-l,l,0,B/2,!1),p.lineTo(u+c,d),p.absarc(u+c,d-c,c,B/2,B,!1),p.lineTo(u,h+r),p.absarc(u+r,h+r,r,B,B*1.5,!1),p}var Ss=class{constructor(e,t){this.group=e;this.k=t}add(e,t){let n=new ue(e,t);return this.group.add(n),n}box(e,t,n,i,s,r,o,l,c=0,u=0,f=0){let h=this.add(new Mn(e,t,n,3,Math.max(.005,Math.min(i,e/2,t/2,n/2)-.001)),s);return h.position.set(r,o,l),h.rotation.set(f,c,u),h}extY(e,t,n,i,s,r=28){let o=Math.min(n,t/2-.001),l=new Mt(e(o),{depth:Math.max(.001,t-o*2),bevelEnabled:o>0,bevelThickness:o,bevelSize:o,bevelSegments:5,curveSegments:r});return l.translate(0,0,o),l.rotateX(B/2),l.translate(0,s+t,0),this.add(l,i)}extZ(e,t,n,i,s,r=28){let o=Math.min(n,t/2-.001),l=new Mt(e(o),{depth:Math.max(.001,t-o*2),bevelEnabled:o>0,bevelThickness:o,bevelSize:o,bevelSegments:4,curveSegments:r});return l.translate(0,0,s+o),this.add(l,i)}extX(e,t,n,i,s){let r=Math.min(n,t/2-.001),o=new Mt(e(r),{depth:Math.max(.001,t-r*2),bevelEnabled:r>0,bevelThickness:r,bevelSize:r,bevelSegments:4,curveSegments:24});return o.translate(0,0,r),o.rotateY(B/2),o.translate(s,0,0),this.add(o,i)}hull(e,t,n=!1){let i=[];for(let[r,o,l,c,u]of e){let f=Math.max(.001,Math.min(u,o/2,l/2));for(let h=0;h<4;h++){let d=(h===0||h===3?1:-1)*(o/2-f),p=c+(h<2?1:-1)*(l/2-f),m=[0,B/2,B,B*1.5][h],g=u>.05?5:1;for(let _=0;_<=g;_++){let M=m+B/2*_/g;i.push(new x(d+Math.cos(M)*f,r,p+Math.sin(M)*f))}}}let s=new ui(i);return n&&(s.deleteAttribute("normal"),s.deleteAttribute("uv"),s=Ir(s,.01),s.computeVertexNormals()),this.add(s,t)}cylZ(e,t,n,i,s,r,o=e,l=64){let c=this.add(new xt(e,o,t,l),n);return c.rotation.x=B/2,c.position.set(i,s,r+t/2),c}cylY(e,t,n,i,s,r,o=e){let l=this.add(new xt(e,o,t,48),n);return l.position.set(i,s,r),l}cylX(e,t,n,i,s,r){let o=this.add(new xt(e,e,t,48),n);return o.rotation.z=B/2,o.position.set(i,s,r),o}ringZ(e,t,n,i,s,r){let o=this.add(new yt(e,t,64),n);return o.position.set(i,s,r),o}ridges(e,t,n,i,s,r,o,l,c=.1){let u=e==="z"?new je(c,c*1.2,n):e==="y"?new je(c,n,c*1.2):new je(n,c,c*1.2),f=new Qe(u,s,i),h=new Ae;for(let d=0;d<i;d++){let p=d/i*B*2;e==="z"?(h.position.set(r+t*Math.cos(p),o+t*Math.sin(p),l+n/2),h.rotation.set(0,0,p)):e==="y"?(h.position.set(r+t*Math.cos(p),o,l+t*Math.sin(p)),h.rotation.set(0,-p,0)):(h.position.set(r,o+t*Math.cos(p),l+t*Math.sin(p)),h.rotation.set(-p,0,0)),h.updateMatrix(),f.setMatrixAt(d,h.matrix)}this.group.add(f)}speedDial(e,t,n,i,s,r=["B","1","2","4","8","15","30","60","125","250","500","1000"]){let o=this.k;this.cylY(i,s,o.accent,e,t+s/2,n),this.ridges("y",i,s*.85,40,o.accent,e,t+s/2,n,.08);let l=new _t({map:qc(r,o.ink),transparent:!0});l.name=`dial:${r.join(",")}`;let c=this.add(new qt(i*.95,48),l);c.rotation.x=-B/2,c.position.set(e,t+s+.005,n)}knob(e,t,n,i,s){this.cylY(i,s,this.k.accent,e,t+s/2,n),this.ridges("y",i,s*.8,28,this.k.accent,e,t+s/2,n,.08)}lever(e,t,n,i,s){let r=this.k;this.cylY(.5,.1,r.accent,e,t+.05,n);let o=this.extY(()=>{let c=new at;return c.moveTo(0,-.34),c.lineTo(i*.75,-.2),c.quadraticCurveTo(i,-.2,i,.02),c.lineTo(i,.12),c.quadraticCurveTo(i*.85,.2,i*.6,.2),c.lineTo(0,.34),c.absarc(0,0,.34,B/2,B*1.5,!1),c},.09,.02,r.accent,t+.1);o.rotation.y=s,o.position.set(e,0,n);let l=this.box(.7,.26,.42,.1,r.lensBlack,0,0,0);l.position.set(e+Math.cos(s)*(i-.25),t+.26,n-Math.sin(s)*(i-.25)),l.rotation.y=s}shutterButton(e,t,n,i=!1){this.cylY(.42,.14,this.k.accent,e,t+.07,n),this.cylY(.26,.24,i?this.k.red:this.k.accent,e,t+.2,n)}hotShoe(e,t,n){this.box(1.9,.22,1.9,.04,this.k.accent,e,t+.11,n),this.box(1.5,.08,1.7,.02,this.k.lensBlack,e,t+.24,n)}lugs(e,t,n=0){for(let i of[-1,1]){let s=this.add(new _n(.28,.07,10,24),this.k.accent);s.position.set(i*(e+.12),t,n),s.rotation.y=B/2}}windowAt(e,t,n,i,s,r=this.k.window){this.box(e+.16,t+.16,.12,.08,this.k.accent,n,i,s+.02),this.box(e,t,.14,.06,r,n,i,s+.04)}frontRing(e,t,n,i,s){let r=wt("frontring",512,512,h=>{h.fillStyle="#121214",h.beginPath(),h.arc(256,256,256,0,B*2),h.fill(),h.fillStyle="#e6e6e6",h.font="600 26px Helvetica, Arial, sans-serif",h.textAlign="center";let d="LENS  1:1.8  f=50mm  \u230052  \xB7  MULTI COATED  \xB7  ",p=222;for(let m=0;m<d.length;m++){let g=-B*.95+m/d.length*B*1.9;h.save(),h.translate(256+Math.cos(g)*p,256+Math.sin(g)*p),h.rotate(g+B/2),h.fillText(d[m],0,0),h.restore()}}),o=new yt(e,t,64),l=o.attributes.uv,c=o.attributes.position;for(let h=0;h<l.count;h++)l.setXY(h,c.getX(h)/(t*2)+.5,c.getY(h)/(t*2)+.5);let u=new lt({map:r,roughness:.5,metalness:.2});u.name="frontring",this.add(o,u).position.set(n,i,s)}glassFront(e,t,n,i,s=.3){let r=new xn({color:328965,roughness:.8});r.name="recess",this.ringZ(e*.86,e,r,t,n,i+.004),this.add(new qt(e*.86,64),this.k.glass).position.set(t,n,i+.006)}lens(e,t,n,i,s=0,r=0){let o=this.k,l=p=>{let m=new lt({map:Fr(p),roughness:.45,metalness:.2,clearcoat:.4});return m.name=`scale:${p.join(",")}`,m},c=l(["16","11","8","5.6","4","2.8","2"]),u=l(["\u221E","10","5","3","2","1.5","1",".7","m"]),f=p=>[p,o.lensBlack,o.lensBlack],h=i,d=(p,m,g,_=p)=>{this.cylZ(p,m,g,s,r,h,_),h+=m};if(e==="af"){this.cylZ(t*1.12,.3,o.accent,s,r,h),h+=.3,d(t*.98,n*.18,o.lensSatin,t*1.02),this.ridges("z",t*1,n*.08,70,o.rubber,s,r,h,.07),d(t*.99,n*.1,o.rubber),d(t*1,n*.12,f(u)),this.ridges("z",t*1.04,n*.3,90,o.rubber,s,r,h,.08),d(t*1.04,n*.32,o.rubber),d(t*1.03,n*.28,o.lensSatin),this.ringZ(t*.82,t*1.03,o.lensBlack,s,r,h+.001),this.glassFront(t*.82,s,r,h,.5);return}if(e==="fixed"){d(t*1.25,n*.25,o.accent,t*1.3),d(t*1.05,n*.35,o.lensBlack),d(t*1,n*.4,o.lensSatin),this.ringZ(t*.78,t*1,o.lensBlack,s,r,h+.001),this.glassFront(t*.78,s,r,h,.2);return}if(e==="leica"||e==="small"){this.cylZ(t*1.1,.2,o.accent,s,r,h),h+=.2,d(t*1,n*.22,f(u)),this.ridges("z",t*1,n*.16,40,o.lensBlack,s,r,h,.08),d(t*.98,n*.2,o.lensBlack),d(t*.96,n*.18,f(c)),d(t*.92,n*.4,o.lensBlack),e==="leica"&&this.box(.5,.5,.3,.15,o.lensBlack,s,r-t*1.1,i+.2+n*.1),this.ringZ(t*.7,t*.92,o.lensBlack,s,r,h+.001),this.glassFront(t*.7,s,r,h,.3);return}if(e==="mf"){this.cylZ(t*1.1,.4,o.accent,s,r,h),h+=.4,d(t*1,n*.14,f(l(["1","2","4","8","15","30","60","125","250","500"]))),this.ridges("z",t*1.01,n*.08,40,o.lensBlack,s,r,h,.12),d(t*1,n*.1,o.lensBlack),d(t*.98,n*.12,f(c)),this.ridges("z",t*1.04,n*.3,80,o.rubber,s,r,h,.12),d(t*1.04,n*.3,o.rubber),d(t*.96,n*.25,o.lensBlack),this.ringZ(t*.78,t*.96,o.lensBlack,s,r,h+.001),this.glassFront(t*.78,s,r,h,.5);return}this.cylZ(t*1.12,.25,o.accent,s,r,h),h+=.25,this.ridges("z",t*1.03,n*.12,18,o.lensBlack,s,r,h,.16),d(t*1,n*.12,f(c)),d(t*.97,n*.08,o.lensBlack),d(t*.99,n*.12,f(u)),this.ridges("z",t*1.04,n*.3,72,o.rubber,s,r,h,.09),d(t*1.04,n*.3,o.rubber),d(t*.98,n*.32,o.lensBlack),this.ringZ(t*.8,t*.98,o.lensBlack,s,r,h+.001),this.glassFront(t*.8,s,r,h,.35)}selenium(e,t,n,i){let s=this.k;this.cylZ(e*1.65,.35,s.accent,t,n,i);let r=new Qe(new Zt(.11,8,6),s.frosted,120),o=new Ae,l=0;for(let c=0;c<3;c++){let u=e*(1.18+c*.15),f=40;for(let h=0;h<f&&l<120;h++,l++){let d=h/f*B*2+c*.08;o.position.set(t+u*Math.cos(d),n+u*Math.sin(d),i+.36),o.updateMatrix(),r.setMatrixAt(l,o.matrix)}}this.group.add(r)}};function Jc(a,e,t,n){let i={nikon:[.5,.26,.92,.46,.4,.12,.15],canon:[.46,.3,.92,.5,.42,.08,.35],om:[.4,.2,.86,.4,.34,.1,.3],tall:[.48,.32,.95,.6,.48,.1,.15],pointed:[.46,.14,.9,.34,.44,.12,.12],f:[.5,.42,.95,.72,.42,.06,.12],round:[.5,.24,.9,.42,.4,.1,.8]},[s,r,o,l,c,u,f]=i[a.prism??"nikon"],h=n*c;return[[0,e*s,t*o,0,.1],[h*.15,e*s*.98,t*o*.97,-t*u*.1,f*.6],[h-f*.5,e*r,t*l,-t*u,f],[h,e*r-f*.8,t*l-f*.8,-t*u,f*.5]]}function Kc(a,e){let[t,n,i]=e.body,s=n*.7,r=a.k,o=s*.3,l=-n/2,c=l+s;a.extY(v=>K(t-v*2,i-v*2,.55),s-o,.12,r.plate,l),a.extY(v=>K(t-.5-v*2,i+.08-v*2,.45),s-o-.9,.03,r.leather,l+.45),a.extY(v=>K(t-v*2,i-v*2,.6),o,.28,r.plate,c-o);let u=Jc(e,t,i,n*.3/.4);a.hull(u,r.plate,e.prism==="round").position.set(0,c-.05,.1);let[h,d,p,m]=[u[3][0],u[3][1],u[3][2],u[3][3]];a.hotShoe(0,c-.05+h-.05,m+.1),e.prism==="canon"&&a.box(t*.26,n*.08,.2,.08,r.accent,0,c+n*.06,i*.4),a.box(2.1,1.5,.8,.3,r.rubber,0,c+n*.1,-i/2-.2);let g=-t*.3;a.speedDial(g+t*.04,c,-i*.12,Math.min(1.05,t*.075),.45);let _=-t*.4,M=i*.2;e.lever&&a.lever(_,c,M,Math.min(3.4,t*.24),-.22),a.shutterButton(_,c+(e.lever?.19:0),M),a.cylY(1.2,.18,r.accent,t*.32,c+.09,0),a.knob(t*.32,c+.18,0,.85,.5),a.box(.5,1.6,.35,.15,r.accent,-t*.3,l+s*.55,i/2+.15,0,.35),a.cylZ(.3,.3,r.accent,t*.2,l+s*.35,i/2),a.lugs(t/2,c-o/2);let y=l+s*.45;a.cylZ(e.lensR*1.22,.35,r.accent,0,y,i/2-.05),a.lens(e.lens??"prime",e.lensR,e.lensLen,i/2+.3,0,y),e.grip&&a.extZ(v=>K(1.6-v*2,s*.68-v*2,.6),.9,.3,r.leather,i/2-.2).position.set(-t*.42,l+s*.45,0)}function jc(a,e){let[t,n,i]=e.body,s=a.k,r=-n/2,o=n*.76,l=t*.26,c=i*.32;a.extY(h=>K(t-h*2,i-h*2,[1,1.4,1.4,1]),o,.7,s.plastic,r),a.extY(h=>K(l-h*2,i+c-h*2,[1.2,1,2.2,2.2],-t/2+l/2,c/2),o*.97,.9,s.rubber,r+.02),a.hull([[0,t*.52,i*.95,0,.6],[n*.1,t*.42,i*.8,-.2,1],[n*.2,t*.3,i*.56,-.4,1.1],[n*.26,t*.2,i*.4,-.5,.8]],s.plastic,!0).position.set(0,r+o-.4,.2),a.hotShoe(0,r+o+n*.26-.45,-.3),a.box(t*.2,.12,i*.42,.05,s.window,-t*.26,r+o+.02,-.2),a.speedDial(t*.3,r+o-.05,-.2,1.1,.5,["P","S","A","M","","","","",""]),a.shutterButton(-t/2+l*.55,r+o-.1,i/2+c*.25),a.cylX(.9,.3,s.lensSatin,-t/2+l*.85,r+o-.6,i/2+c*.45),a.box(2.1,1.6,.9,.4,s.rubber,0,r+o+n*.1,-i/2-.2),a.lugs(t/2,r+o-1);let f=r+o*.48;a.cylZ(e.lensR*1.2,.3,s.accent,0,f,i/2-.05),a.lens("af",e.lensR,e.lensLen,i/2+.25,0,f)}function Nr(a,e,t=!1){let[n,i,s]=e.body,r=a.k,o=i*.3,l=-i/2,c=i/2,u=e.roundEnds?s/2-.02:.6;a.extY(_=>K(n-_*2,s-_*2,u),i,.22,r.plate,l),e.roundEnds?a.extY(_=>K(n+.06-_*2,s+.08-_*2,u+.03),i-o-.55,.02,r.leather,l+.35):a.extY(_=>K(n-.5-_*2,s+.08-_*2,.4),i-o-.55,.02,r.leather,l+.35),a.extY(_=>K(n+.02-_*2,s+.02-_*2,u),.05,0,r.lensSatin,c-o-.05);let f=c-o/2-.05,h=s/2;t||(a.windowAt(n*.15,o*.5,n*.3,f,h),e.windows!=="two"&&a.windowAt(n*.09,o*.4,n*.12,f,h,r.frosted),a.windowAt(n*.07,o*.4,-n*.31,f,h)),e.badge==="red"&&a.cylZ(.3,.08,r.red,-n*.1,f,h),e.lens==="fixed"||a.speedDial(-n*.22,c,0,Math.min(1,n*.075),.45),e.lever&&a.lever(-n*.37,c,s*.1,Math.min(2.8,n*.2),-.2),a.shutterButton(-n*.37,c+(e.lever?.19:0),s*.1),a.knob(n*.36,c,0,.8,.45),a.hotShoe(n*.08,c,0),e.grip&&a.extZ(_=>K(1.7-_*2,i*.7-_*2,.6),.9,.3,r.leather,s/2-.2).position.set(-n*.42,-i*.08,0),a.lugs(n/2,c-o/2);let p=e.lensX??0,m=-i*.08,g=h;e.selenium&&(a.selenium(e.lensR,p,m,h),g+=.35),a.cylZ(e.lensR*1.2,.25,r.accent,p,m,g-.05),a.lens(e.lens??"small",e.lensR,e.lensLen,g+.2,p,m)}function Qc(a,e){let[t,n,i]=e.body,s=a.k,r=-n/2,o=n/2,l=e.shape??"box",c=l==="round"?i/2-.02:l==="pill"?i*.42:Math.min(.8,i*.25),u=l==="box"?.35:.6;a.extY(_=>K(t-_*2,i-_*2,c),n,u,s.plastic,r);let f=e.lensX??0,h=-n*.06,d=i/2;l==="pill"?a.extZ(_=>K(e.lensR*3.2-_*2,n*.86-_*2,e.lensR*1.5),.9,.35,s.plastic,d-.5).position.set(f,h*.5,0):e.lensLen>1.4&&a.extZ(_=>K(e.lensR*3-_*2,e.lensR*3-_*2,e.lensR*.9),.6,.25,s.plate,d-.3).position.set(f,h,0);let p=d+(l==="pill"?.35:e.lensLen>1.4?.25:0);e.selenium&&(a.selenium(e.lensR,f,h,p),p+=.35),a.lens("fixed",e.lensR,e.lensLen,p,f,h);let m=o-n*.17,g=e.flash==="left"?-1:1;a.windowAt(t*.09,n*.11,-g*t*.12+(f>0?-t*.05:0),m,d-.05),a.windowAt(t*.045,n*.07,-g*t*.26,m,d-.05),a.windowAt(t*.045,n*.07,-g*t*.36,m,d-.05),e.flash!=="none"&&a.windowAt(t*.15,n*.13,g*t*.33,m,d-.05,s.frosted),a.shutterButton(-t*.32,o-.05+(e.lever?.19:0),0,e.badge==="redbutton"),e.lever||a.box(t*.16,.08,i*.35,.03,s.window,t*.12,o-.02,-i*.05),e.lever&&a.lever(-t*.32,o-.05,0,2.4,-.2),e.grip&&a.extZ(_=>K(t*.16-_*2,n*.8-_*2,.5),.5,.2,s.rubber,d-.3).position.set(-t*.38,-.1,0),a.lugs(t/2-.1,o-n*.25)}function eh(a,e){let[t,n,i]=e.body,s=a.k,r=-n/2,o=i/2,l=e.shape!=="box";a.extY(h=>K(t-h*2,i-h*2,l?i/2-.02:.7),n,l?Math.min(1.4,n*.25):.4,s.plastic,r);let c=t*.46;if(a.extZ(h=>K(c-h*2,n*.88-h*2,l?n*.4:.5),.55,l?.25:.12,s.plastic,o-.35).position.set(-t/2+c/2+.2,0,0),!l)for(let h=0;h<9;h++)a.box(.08,n*.7,.08,.02,s.lensSatin,-t/2+c-.3-h*.16,0,o+.22);let f=e.lensX??t*.08;a.cylZ(e.lensR*1.6,.25,s.lensBlack,f,0,o-.15),a.lens("fixed",e.lensR,e.lensLen,o+.05,f,0),a.windowAt(t*.09,n*.12,t*.33,n*.28,o-.15),a.windowAt(t*.12,n*.14,-t*.3,n*.28,o+.15,s.frosted),a.shutterButton(-t*.28,n/2-(l?.25:.05),0,e.badge==="redbutton")}function th(a,e){let[t,n,i]=e.body,s=a.k,r=-n/2,o=i/2;a.extY(h=>K(t-h*2,i-h*2,.5),n,.2,s.plate,r),a.extY(h=>K(t+.06-h*2,i+.06-h*2,.52),n-1.2,.02,s.leather,r+.6),a.extZ(h=>K(t*.84-h*2,n*.82-h*2,.4),1.4,.2,s.plate,o-.1).position.set(0,-n*.04,0);let c=o+1.3,u=n*.19,f=-n*.2;a.lens("small",e.lensR*.95,e.lensLen*.9,c,0,u),a.lens("mf",e.lensR,e.lensLen,c,0,f),a.box(t*.6,n*.07,.25,.06,s.accent,0,u-e.lensR*1.25,c+.1);for(let h of[-1,1])a.cylZ(.75,.35,s.accent,h*t*.32,(u+f)/2-.3,c-.1),a.ridges("z",.75,.3,24,s.accent,h*t*.32,(u+f)/2-.3,c-.08,.07);a.extY(h=>K(t*.94-h*2,i*.94-h*2,.4),1.5,.15,s.plate,n/2),a.box(t*.88,.12,i*.88,.05,s.lensBlack,0,n/2+1.52,0),a.box(t*.4,.15,.6,.05,s.accent,0,n/2+1.55,i*.3),a.cylX(n*.12,.7,s.accent,t/2+.35,n*.12,-i*.05),a.ridges("x",n*.12,.6,40,s.accent,t/2+.35,n*.12,-i*.05,.1),a.cylX(n*.08,.5,s.accent,-t/2-.25,n*.05,i*.05),a.box(.3,n*.13,.5,.12,s.accent,-t/2-.55,n*.05-n*.06,i*.05),a.cylX(.3,.7,s.lensBlack,-t/2-.9,n*.05-n*.12,i*.05),a.lugs(t/2,n*.32)}function nh(a,e){let[t,n,i]=e.body,s=a.k,r=-n/2,o=f=>{let h=.9-f,d=t/2-f,p=i/2-f;return new at([[-d+h,-p],[d-h,-p],[d,-p+h],[d,p-h],[d-h,p],[-d+h,p],[-d,p-h],[-d,-p+h]].map(([m,g])=>new R(m,g)))};a.extY(o,n,.15,s.plate,r),a.extY(f=>o(f-.04),n*.76,.02,s.leather,r+n*.12);let l=3.4,c=a.extY(f=>K(t*1.02-f*2,l-f*2,.4),n*1.02,.2,s.plate,r-n*.01);c.position.z=-i/2-l/2-.12,a.box(t*.98,n*.05,l*.8,.05,s.lensSatin,0,r+n*.98,-i/2-l/2-.12),a.extY(f=>K(t*1.03-f*2,l*.7-f*2,.3),n*.7,.02,s.leather,r+n*.15).position.z=-i/2-l/2-.12,a.extY(f=>K(t*.94-f*2,i*.94-f*2,.4),1.8,.15,s.plate,n/2),a.box(t*.86,.12,i*.86,.05,s.lensBlack,0,n/2+1.82,0),a.cylX(1.9,.9,s.accent,-t/2-.45,n*.05,-.4),a.ridges("x",1.9,.8,36,s.accent,-t/2-.45,n*.05,-.4,.12),a.cylX(.6,1.05,s.lensBlack,-t/2-.5,n*.05,-.4),a.cylZ(.35,.3,s.accent,t*.32,n*.32,i/2);let u=-n*.04;a.cylZ(e.lensR*1.08,.5,s.accent,0,u,i/2-.1),a.lens("mf",e.lensR,e.lensLen,i/2+.4,0,u)}function ih(a,e){let[t,n,i]=e.body,s=a.k,r=-n/2;a.extY(o=>K(t-o*2,i-o*2,.6),n,.3,s.plastic,r),a.extZ(o=>K(t*1.06-o*2,n*1.06-o*2,.6),3,.25,s.plate,-i/2-3),a.extY(o=>K(t*.9-o*2,i*.8-o*2,.4),2.4,.15,s.plate,n/2).position.z=-.4;for(let o=0;o<9;o++)a.box(t*(.78-o%2*.04),n*(.74-o%2*.04),.4,.25,s.rubber,0,-.5,i/2+.2+o*.36);a.box(t*.82,n*.82,.8,.3,s.plate,0,-.5,i/2+3.6);for(let o of[-1,1])a.cylX(1.5,.8,s.accent,o*(t/2+.4),-n*.28,i*.2),a.ridges("x",1.5,.7,30,s.accent,o*(t/2+.4),-n*.28,i*.2,.1);a.lens("mf",e.lensR,e.lensLen*.8,i/2+4,0,-.5)}function sh(a,e){let[t,n,i]=e.body,s=a.k,r=-n/2,o=t*.72,l=t/2-o/2;a.extY(f=>K(o-f*2,i-f*2,.6,l),n*.78,.3,s.plastic,r).position.x=0,a.extY(f=>K(t*.3-f*2,i*.85-f*2,[1.5,1.5,1.5,1.5],-t/2+t*.15,.4),n*.95,.8,s.rubber,r),a.shutterButton(-t/2+t*.15,r+n*.95-.05,i*.3),a.hull([[0,o*.8,i*.9,0,.5],[n*.12,o*.6,i*.62,-.4,.9],[n*.22,o*.42,i*.45,-.6,.6]],s.plastic,!0).position.set(l,r+n*.78-.3,0);let u=-n*.12;a.cylZ(e.lensR*1.12,.5,s.accent,l,u,i/2-.1),a.lens("mf",e.lensR,e.lensLen,i/2+.4,l,u)}function kr(a,e){let t=new fn,n=new Ss(t,Zc(e));switch(a.kind){case"slr":Kc(n,a);break;case"afslr":jc(n,a);break;case"rf":Nr(n,a);break;case"flattop":Nr(n,a,!0);break;case"compact":Qc(n,a);break;case"clamshell":eh(n,a);break;case"tlr":th(n,a);break;case"cube":nh(n,a);break;case"rb":ih(n,a);break;case"mf645":sh(n,a);break}return t.traverse(i=>{i instanceof ue&&(i.castShadow=!0)}),t.rotation.y=-.42,t}function ct(a,e){let t=new lt(e);return t.name=a,t}function Or(a){let e=new fn;e.name="lens";let t=F=>F/10,n=Math.max(2.2,t(a.lengthMm)),i=Math.max(1.5,t(a.diameterMm)/2),s=Math.min(i*.78,Math.max(.7,t(a.frontMm)*.36)),r=ct("lensBlack",{color:1184276,roughness:.36,metalness:.48,clearcoat:.55,clearcoatRoughness:.28}),o=ct("lensSatin",{color:1842208,roughness:.55,metalness:.28}),l=ct("accent",{color:13158606,roughness:.2,metalness:.95,clearcoat:.5,clearcoatRoughness:.16}),c=ct("rubber",{color:789517,roughness:.94,metalness:0}),u=ct("plate",{color:11908538,roughness:.32,metalness:.88,clearcoat:.25}),f=a.finish==="silver"?l:r,h=a.finish==="black"?r:l,d=a.focusRing.startsWith("rubber")||a.focusRing==="thin-af"?c:a.finish==="black"?o:l,p=a.finish==="black"?r:l,m=a.finish==="black"?l:r,g=.26,_=Math.max(1.5,n-g),M={ap:a.apertureRing?a.zoom?.13:.15:0,scale:a.zoom?.1:.12,focus:a.focusRing==="thin-af"?.12:a.zoom?.2:.3,zoom:a.zoom?.18:0},y=M.ap+M.scale+M.focus+M.zoom,v=Math.max(.2,1-y),b=_/(v+y),S=M.ap*b,w=M.scale*b,E=M.focus*b,U=M.zoom*b,L=v*b,D=g,V=D;D+=S;let k=D;D+=w;let O=D;D+=E;let $=D;D+=U;let Y=D,re=D+L,be=(F,W)=>{let le=F.map(([j,de])=>new R(Math.max(.05,de),j)),oe=new ue(new ii(le,64),W);return oe.rotation.x=B/2,e.add(oe),oe},q=(F,W,le,oe,j=F,de=!1)=>{if(W<.04)return;let Ee=new ue(new xt(F,j,W,64,1,de),oe);Ee.rotation.x=B/2,Ee.position.z=le+W/2,e.add(Ee)},Q=(F,W,le,oe,j,de)=>{let Ee=new je(de,de*1.15,W*.86),Ve=new Qe(Ee,j,oe),et=new Ae;for(let Ge=0;Ge<oe;Ge++){let We=Ge/oe*B*2;et.position.set(Math.cos(We)*le,Math.sin(We)*le,F+W/2),et.rotation.z=We,et.updateMatrix(),Ve.setMatrixAt(Ge,et.matrix)}e.add(Ve)},ne=(F,W,le,oe)=>{for(let j=1;j<=3;j++){let de=new ue(new _n(le,.03,6,40),oe);de.position.z=F+W*j/4,e.add(de)}};be([[.02,i*.7],[.08,i*.98],[g,i*.98],[g+.08,i*.82],[k,i*.84],[Y,i*.8],[re,Math.max(s*1.15,i*.72)]],f),q(i*1.05,g,0,u,i*.86),a.apertureRing&&S>.05&&(q(i*.98,S,V,p),Q(V,S*.45,i*.99,18,m,.05));let ve=["\u221E","10","5","2","1","0.7"],Be=Fr(ve),Kt=ct(`scale:${ve.join(",")}`,{color:1315862,roughness:.42,metalness:.25,clearcoat:.3,...Be?{map:Be}:{}});q(i*.9,w,k,[Kt,r,r]);let ht=new ue(new Zt(.055,8,8),ct("frosted",{color:15263978,roughness:.4,metalness:.05}));if(ht.position.set(0,i*.96,k+w*.5),e.add(ht),q(i,E,O,d),a.focusRing==="rubber-grid")Q(O,E,i*1.01,32,c,.05),ne(O,E,i*1.01,c);else if(a.focusRing==="rubber-ribbed"||a.focusRing==="thin-af")Q(O,E,i*1.01,a.focusRing==="thin-af"?46:26,c,a.focusRing==="thin-af"?.04:.07);else if(a.focusRing==="metal-scalloped"){let W=new Zt(Math.min(.16,E*.28),10,8),le=new Qe(W,d,12),oe=new Ae;for(let j=0;j<12;j++){let de=j/12*B*2;oe.position.set(Math.cos(de)*i,Math.sin(de)*i,O+E/2),oe.updateMatrix(),le.setMatrixAt(j,oe.matrix)}e.add(le)}else Q(O,E,i*1.005,70,d,.032);if(a.focusTab){let F=new ue(new Mn(.26,.58,Math.min(.5,E*.75),2,.06),d);F.position.set(i*.2,i+.22,O+E*.45),e.add(F)}a.zoom&&U>.05&&(q(i*.97,U,$,c),Q($,U,i*.98,30,c,.06)),a.finish==="chrome-nose"?q(i*.9,L,Y,h,i*.84):q(i*.86,L*.55,Y+L*.4,h);let Tt=Math.max(s*1.22,i*.62),fe=Math.max(Tt+.12,i*.84),ut=Yc(a.frontMm),bn=new lt({color:1184276,roughness:.45,metalness:.3,...ut?{map:ut}:{}});bn.name="frontring";let Se=new yt(Tt,fe,64),Ce=Se.attributes.uv,T=Se.attributes.position;for(let F=0;F<Ce.count;F++)Ce.setXY(F,T.getX(F)/(fe*2)+.5,T.getY(F)/(fe*2)+.5);let C=new ue(Se,bn);C.position.z=re+.02,e.add(C);let P=ct("recess",{color:328965,roughness:.8,metalness:0}),N=new ue(new yt(s,Tt,64),P);N.position.z=re+.012,e.add(N);let I=Xc(),G=new _t({color:1314328,...I?{map:I}:{}});G.name="glass";let X=new ue(new qt(s,64),G);X.position.z=re+.028,e.add(X);let ee=a.hood==="round"?Math.min(2.4,i*1.1):a.hood==="petal"?Math.min(1.5,i*.75):a.hood==="built-in"?Math.min(1.1,i*.55):0;if(a.hood==="petal"){let F=new at,W=72,le=fe*.98,oe=fe*1.18;for(let Ee=0;Ee<=W;Ee++){let Ve=Ee/W*B*2,et=Math.abs(Math.cos(2*Ve)),Ge=le+(oe-le)*(.2+.8*et**.6),We=Math.cos(Ve)*Ge,jt=Math.sin(Ve)*Ge;Ee===0?F.moveTo(We,jt):F.lineTo(We,jt)}let j=new Yt;j.absarc(0,0,s*1.05,0,B*2,!0),F.holes.push(j);let de=new ue(new Mt(F,{depth:ee,bevelEnabled:!0,bevelThickness:.04,bevelSize:.03,bevelSegments:1,curveSegments:6}),r);de.position.z=re,e.add(de)}else if(ee>0){let F=a.hood==="built-in"?fe*1.08:fe*1.02;q(F,ee,re,r,fe*.98,!0)}return e.traverse(F=>{F instanceof ue&&(F.castShadow=!0)}),e}function zr(a){let e=a.replace(/[–—~]/g,"-"),t={zoom:!1,focalMin:0,focalMax:0,open:"",close:""},n=e.match(/(\d+)\s*-\s*(\d+)\s*mm/i),i=e.match(/(\d+)\s*mm/i);if(n){let r=Number(n[1]),o=Number(n[2]);t.focalMin=Math.min(r,o),t.focalMax=Math.max(r,o),t.zoom=t.focalMax>t.focalMin}else i&&(t.focalMin=Number(i[1]),t.focalMax=t.focalMin);let s=e.match(/f\s*\/?\s*(\d+(?:\.\d+)?)(?:\s*-\s*(\d+(?:\.\d+)?))?/i);if(s){let r=Number(s[1]),o=s[2]?Number(s[2]):0;s[2]&&o>=11&&o>r?(t.open=s[1],t.close=s[2]):s[2]?t.open=`${s[1]}\u2013${s[2]}`:t.open=s[1]}return/zoom/i.test(e)&&(t.zoom=!0),t}var rh={"Nikkor-S Auto 50mm f/1.4":{lengthMm:48,diameterMm:63,frontMm:52,finish:"silver",focusRing:"metal-scalloped",apertureRing:!0,hood:"none",zoom:!1},"Nikkor-H Auto 50mm f/2":{lengthMm:38,diameterMm:62,frontMm:52,finish:"silver",focusRing:"metal-scalloped",apertureRing:!0,hood:"none",zoom:!1},"Nikkor 50mm f/1.4 AI-S":{lengthMm:49,diameterMm:63,frontMm:52,finish:"black",focusRing:"rubber-grid",apertureRing:!0,hood:"none",zoom:!1},"Nikkor 50mm f/1.8 AI-S":{lengthMm:36,diameterMm:63,frontMm:52,finish:"black",focusRing:"rubber-grid",apertureRing:!0,hood:"none",zoom:!1},"Nikkor 50mm f/2 AI":{lengthMm:40,diameterMm:64,frontMm:52,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"Nikkor 55mm f/1.2 AI":{lengthMm:58,diameterMm:74,frontMm:52,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"Noct-Nikkor 58mm f/1.2 AI-S":{lengthMm:63,diameterMm:74,frontMm:52,finish:"black",focusRing:"rubber-grid",apertureRing:!0,hood:"none",zoom:!1},"Nikkor 35mm f/1.4 AI-S":{lengthMm:68,diameterMm:68,frontMm:52,finish:"black",focusRing:"rubber-grid",apertureRing:!0,hood:"none",zoom:!1},"Nikkor 35mm f/2 AI-S":{lengthMm:53,diameterMm:63,frontMm:52,finish:"black",focusRing:"rubber-grid",apertureRing:!0,hood:"none",zoom:!1},"Nikkor 28mm f/2.8 AI-S":{lengthMm:46,diameterMm:63,frontMm:52,finish:"black",focusRing:"rubber-grid",apertureRing:!0,hood:"none",zoom:!1},"Nikkor 28mm f/2 AI-S":{lengthMm:58,diameterMm:63,frontMm:52,finish:"black",focusRing:"rubber-grid",apertureRing:!0,hood:"none",zoom:!1},"Nikkor 24mm f/2.8 AI-S":{lengthMm:48,diameterMm:63,frontMm:52,finish:"black",focusRing:"rubber-grid",apertureRing:!0,hood:"none",zoom:!1},"Nikkor 24mm f/2 AI-S":{lengthMm:61,diameterMm:63,frontMm:52,finish:"black",focusRing:"rubber-grid",apertureRing:!0,hood:"built-in",zoom:!1},"Nikkor 20mm f/3.5 AI":{lengthMm:50,diameterMm:63,frontMm:52,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"built-in",zoom:!1},"Nikkor 20mm f/2.8 AI-S":{lengthMm:54,diameterMm:65,frontMm:62,finish:"black",focusRing:"rubber-grid",apertureRing:!0,hood:"none",zoom:!1},"Nikkor 85mm f/1.4 AI-S":{lengthMm:72,diameterMm:80,frontMm:72,finish:"black",focusRing:"rubber-grid",apertureRing:!0,hood:"round",zoom:!1},"Nikkor 85mm f/2 AI-S":{lengthMm:61,diameterMm:64,frontMm:52,finish:"black",focusRing:"rubber-grid",apertureRing:!0,hood:"round",zoom:!1},"Nikkor 85mm f/1.8":{lengthMm:70,diameterMm:72,frontMm:52,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"round",zoom:!1},"Nikkor 105mm f/2.5 AI-S":{lengthMm:78,diameterMm:66,frontMm:52,finish:"black",focusRing:"rubber-grid",apertureRing:!0,hood:"round",zoom:!1},"Nikkor 105mm f/1.8 AI-S":{lengthMm:106,diameterMm:79,frontMm:62,finish:"black",focusRing:"rubber-grid",apertureRing:!0,hood:"round",zoom:!1},"Nikkor 135mm f/2.8 AI-S":{lengthMm:91,diameterMm:65,frontMm:52,finish:"black",focusRing:"rubber-grid",apertureRing:!0,hood:"round",zoom:!1},"Nikkor 180mm f/2.8 ED AI-S":{lengthMm:140,diameterMm:79,frontMm:72,finish:"black",focusRing:"rubber-grid",apertureRing:!0,hood:"round",zoom:!1},"Nikkor 45mm f/2.8 GN":{lengthMm:31,diameterMm:64,frontMm:52,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"Micro-Nikkor 55mm f/2.8 AI-S":{lengthMm:64,diameterMm:64,frontMm:52,finish:"black",focusRing:"rubber-grid",apertureRing:!0,hood:"none",zoom:!1},"Series E 50mm f/1.8":{lengthMm:33,diameterMm:63,frontMm:52,finish:"black",focusRing:"rubber-grid",apertureRing:!0,hood:"none",zoom:!1},"Series E 28mm f/2.8":{lengthMm:45,diameterMm:63,frontMm:52,finish:"black",focusRing:"rubber-grid",apertureRing:!0,hood:"none",zoom:!1},"Series E 100mm f/2.8":{lengthMm:72,diameterMm:63,frontMm:52,finish:"black",focusRing:"rubber-grid",apertureRing:!0,hood:"round",zoom:!1},"AF Nikkor 50mm f/1.8D":{lengthMm:39,diameterMm:64,frontMm:52,finish:"black",focusRing:"thin-af",apertureRing:!0,hood:"none",zoom:!1},"AF Nikkor 50mm f/1.4D":{lengthMm:42,diameterMm:65,frontMm:52,finish:"black",focusRing:"thin-af",apertureRing:!0,hood:"none",zoom:!1},"AF Nikkor 35mm f/2D":{lengthMm:55,diameterMm:65,frontMm:52,finish:"black",focusRing:"thin-af",apertureRing:!0,hood:"none",zoom:!1},"AF Nikkor 85mm f/1.8D":{lengthMm:71,diameterMm:72,frontMm:62,finish:"black",focusRing:"thin-af",apertureRing:!0,hood:"round",zoom:!1},"AF Micro-Nikkor 60mm f/2.8D":{lengthMm:75,diameterMm:70,frontMm:62,finish:"black",focusRing:"thin-af",apertureRing:!0,hood:"none",zoom:!1},"AF Nikkor 35-70mm f/2.8D":{lengthMm:95,diameterMm:73,frontMm:62,finish:"black",focusRing:"thin-af",apertureRing:!0,hood:"petal",zoom:!0},"AF Nikkor 80-200mm f/2.8D":{lengthMm:187,diameterMm:87,frontMm:77,finish:"black",focusRing:"thin-af",apertureRing:!0,hood:"round",zoom:!0},"AF-S Nikkor 50mm f/1.8G":{lengthMm:52,diameterMm:72,frontMm:58,finish:"black",focusRing:"thin-af",apertureRing:!1,hood:"none",zoom:!1},"AF-S Nikkor 50mm f/1.4G":{lengthMm:54,diameterMm:73,frontMm:58,finish:"black",focusRing:"thin-af",apertureRing:!1,hood:"none",zoom:!1},"FL 50mm f/1.8":{lengthMm:45,diameterMm:62,frontMm:48,finish:"silver",focusRing:"metal-scalloped",apertureRing:!0,hood:"none",zoom:!1},"FD 50mm f/1.8":{lengthMm:45,diameterMm:63,frontMm:55,finish:"silver",focusRing:"metal-scalloped",apertureRing:!0,hood:"none",zoom:!1},"FD 50mm f/1.4":{lengthMm:49,diameterMm:66,frontMm:55,finish:"black",focusRing:"metal-scalloped",apertureRing:!0,hood:"none",zoom:!1},"FD 50mm f/1.4 SSC":{lengthMm:49,diameterMm:66,frontMm:55,finish:"black",focusRing:"metal-scalloped",apertureRing:!0,hood:"none",zoom:!1},"FD 55mm f/1.2":{lengthMm:53,diameterMm:76,frontMm:58,finish:"black",focusRing:"metal-scalloped",apertureRing:!0,hood:"none",zoom:!1},"FD 35mm f/2":{lengthMm:60,diameterMm:66,frontMm:55,finish:"black",focusRing:"metal-scalloped",apertureRing:!0,hood:"none",zoom:!1},"FD 28mm f/2.8":{lengthMm:48,diameterMm:64,frontMm:55,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"FD 24mm f/2.8":{lengthMm:52,diameterMm:66,frontMm:55,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"FD 85mm f/1.8":{lengthMm:71,diameterMm:67,frontMm:55,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"round",zoom:!1},"FD 135mm f/3.5":{lengthMm:85,diameterMm:66,frontMm:55,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"round",zoom:!1},"New FD 50mm f/1.8":{lengthMm:35,diameterMm:63,frontMm:52,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"New FD 50mm f/1.4":{lengthMm:46,diameterMm:63,frontMm:52,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"New FD 35mm f/2":{lengthMm:58,diameterMm:63,frontMm:52,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"New FD 85mm f/1.8":{lengthMm:63,diameterMm:63,frontMm:52,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"round",zoom:!1},"New FD 35-70mm f/4":{lengthMm:85,diameterMm:66,frontMm:52,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"petal",zoom:!0},"EF 50mm f/1.8 II":{lengthMm:41,diameterMm:68,frontMm:52,finish:"black",focusRing:"thin-af",apertureRing:!1,hood:"none",zoom:!1},"EF 50mm f/1.8 STM":{lengthMm:39,diameterMm:69,frontMm:49,finish:"black",focusRing:"thin-af",apertureRing:!1,hood:"none",zoom:!1},"EF 50mm f/1.4 USM":{lengthMm:51,diameterMm:74,frontMm:58,finish:"black",focusRing:"thin-af",apertureRing:!1,hood:"none",zoom:!1},"EF 40mm f/2.8 STM":{lengthMm:23,diameterMm:68,frontMm:52,finish:"black",focusRing:"thin-af",apertureRing:!1,hood:"none",zoom:!1},"EF 35mm f/2":{lengthMm:43,diameterMm:67,frontMm:52,finish:"black",focusRing:"thin-af",apertureRing:!1,hood:"none",zoom:!1},"EF 85mm f/1.8 USM":{lengthMm:72,diameterMm:75,frontMm:58,finish:"black",focusRing:"thin-af",apertureRing:!1,hood:"round",zoom:!1},"EF 85mm f/1.2L USM":{lengthMm:84,diameterMm:92,frontMm:72,finish:"black",focusRing:"thin-af",apertureRing:!1,hood:"round",zoom:!1},"EF 24-70mm f/2.8L USM":{lengthMm:124,diameterMm:83,frontMm:77,finish:"black",focusRing:"thin-af",apertureRing:!1,hood:"petal",zoom:!0},"EF 70-200mm f/2.8L USM":{lengthMm:194,diameterMm:85,frontMm:77,finish:"black",focusRing:"thin-af",apertureRing:!1,hood:"round",zoom:!0},"SMC Pentax 55mm f/1.8":{lengthMm:46,diameterMm:63,frontMm:52,finish:"black",focusRing:"metal-knurled",apertureRing:!0,hood:"none",zoom:!1},"SMC Pentax 50mm f/1.4":{lengthMm:48,diameterMm:63,frontMm:52,finish:"black",focusRing:"metal-knurled",apertureRing:!0,hood:"none",zoom:!1},"SMC Pentax 50mm f/1.2":{lengthMm:50,diameterMm:65,frontMm:52,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"SMC Pentax-M 50mm f/1.7":{lengthMm:31,diameterMm:63,frontMm:49,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"SMC Pentax-M 50mm f/1.4":{lengthMm:37,diameterMm:63,frontMm:49,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"SMC Pentax-M 40mm f/2.8":{lengthMm:18,diameterMm:63,frontMm:49,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"SMC Pentax-M 28mm f/2.8":{lengthMm:37,diameterMm:63,frontMm:49,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"SMC Pentax-M 85mm f/2":{lengthMm:56,diameterMm:63,frontMm:49,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"round",zoom:!1},"SMC Pentax-A 50mm f/1.7":{lengthMm:31,diameterMm:63,frontMm:49,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"SMC Pentax-FA 43mm f/1.9 Limited":{lengthMm:27,diameterMm:64,frontMm:49,finish:"black",focusRing:"metal-knurled",apertureRing:!0,hood:"none",zoom:!1},"SMC Pentax-FA 77mm f/1.8 Limited":{lengthMm:48,diameterMm:64,frontMm:49,finish:"black",focusRing:"metal-knurled",apertureRing:!0,hood:"round",zoom:!1},"SMC Pentax-FA 31mm f/1.8 Limited":{lengthMm:69,diameterMm:66,frontMm:58,finish:"black",focusRing:"metal-knurled",apertureRing:!0,hood:"none",zoom:!1},"Super-Takumar 55mm f/1.8":{lengthMm:46,diameterMm:59,frontMm:49,finish:"silver",focusRing:"metal-scalloped",apertureRing:!0,hood:"none",zoom:!1},"Super-Takumar 50mm f/1.4":{lengthMm:47,diameterMm:60,frontMm:49,finish:"silver",focusRing:"metal-scalloped",apertureRing:!0,hood:"none",zoom:!1},"Super-Takumar 35mm f/3.5":{lengthMm:42,diameterMm:58,frontMm:49,finish:"silver",focusRing:"metal-scalloped",apertureRing:!0,hood:"none",zoom:!1},"SMC Takumar 55mm f/1.8":{lengthMm:42,diameterMm:60,frontMm:49,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"SMC Takumar 50mm f/1.4":{lengthMm:46,diameterMm:60,frontMm:49,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"Helios 44-2 58mm f/2":{lengthMm:47,diameterMm:60,frontMm:49,finish:"silver",focusRing:"metal-knurled",apertureRing:!0,hood:"none",zoom:!1},"Helios-44M 58mm f/2":{lengthMm:50,diameterMm:62,frontMm:52,finish:"black",focusRing:"metal-knurled",apertureRing:!0,hood:"none",zoom:!1},"Helios-40-2 85mm f/1.5":{lengthMm:98,diameterMm:82,frontMm:67,finish:"black",focusRing:"metal-knurled",apertureRing:!0,hood:"round",zoom:!1},"Jupiter-9 85mm f/2":{lengthMm:80,diameterMm:68,frontMm:49,finish:"silver",focusRing:"metal-knurled",apertureRing:!0,hood:"round",zoom:!1},"Carl Zeiss Jena Pancolar 50mm f/1.8":{lengthMm:52,diameterMm:62,frontMm:49,finish:"silver",focusRing:"metal-knurled",apertureRing:!0,hood:"none",zoom:!1},"Carl Zeiss Jena Biotar 58mm f/2":{lengthMm:55,diameterMm:62,frontMm:49,finish:"silver",focusRing:"metal-knurled",apertureRing:!0,hood:"none",zoom:!1},"Carl Zeiss Jena Tessar 50mm f/2.8":{lengthMm:40,diameterMm:58,frontMm:49,finish:"silver",focusRing:"metal-scalloped",apertureRing:!0,hood:"none",zoom:!1},"Carl Zeiss Jena Flektogon 35mm f/2.8":{lengthMm:58,diameterMm:70,frontMm:49,finish:"black",focusRing:"metal-knurled",apertureRing:!0,hood:"none",zoom:!1},"Industar-61 L/Z 50mm f/2.8":{lengthMm:48,diameterMm:56,frontMm:49,finish:"silver",focusRing:"metal-knurled",apertureRing:!0,hood:"none",zoom:!1},"MC Rokkor-PF 50mm f/1.7":{lengthMm:45,diameterMm:64,frontMm:55,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"MC Rokkor-PG 50mm f/1.4":{lengthMm:48,diameterMm:65,frontMm:55,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"MC Rokkor-PF 58mm f/1.4":{lengthMm:50,diameterMm:66,frontMm:55,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"MD Rokkor 50mm f/1.7":{lengthMm:40,diameterMm:64,frontMm:55,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"MD Rokkor 50mm f/1.4":{lengthMm:46,diameterMm:64,frontMm:55,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"MD 50mm f/1.7":{lengthMm:36,diameterMm:64,frontMm:49,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"MD 45mm f/2":{lengthMm:28,diameterMm:63,frontMm:49,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"MD 28mm f/2.8":{lengthMm:43,diameterMm:64,frontMm:49,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"MD 35-70mm f/3.5":{lengthMm:67,diameterMm:64,frontMm:55,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"petal",zoom:!0},"AF 50mm f/1.7":{lengthMm:39,diameterMm:65,frontMm:49,finish:"black",focusRing:"thin-af",apertureRing:!1,hood:"none",zoom:!1},"AF 50mm f/1.4":{lengthMm:39,diameterMm:65,frontMm:55,finish:"black",focusRing:"thin-af",apertureRing:!1,hood:"none",zoom:!1},"AF 35-70mm f/4":{lengthMm:52,diameterMm:68,frontMm:49,finish:"black",focusRing:"thin-af",apertureRing:!1,hood:"none",zoom:!0},"Zuiko 50mm f/1.8":{lengthMm:31,diameterMm:59,frontMm:49,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"Zuiko 50mm f/1.4":{lengthMm:40,diameterMm:60,frontMm:49,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"Zuiko 50mm f/1.2":{lengthMm:48,diameterMm:65,frontMm:49,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"Zuiko 28mm f/2.8":{lengthMm:32,diameterMm:60,frontMm:49,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"Zuiko 24mm f/2.8":{lengthMm:42,diameterMm:60,frontMm:49,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"Zuiko 100mm f/2.8":{lengthMm:70,diameterMm:60,frontMm:49,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"round",zoom:!1},"Zuiko 50mm f/3.5 Macro":{lengthMm:40,diameterMm:60,frontMm:49,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"F.Zuiko 38mm f/1.8":{lengthMm:32,diameterMm:56,frontMm:43,finish:"black",focusRing:"metal-knurled",apertureRing:!0,hood:"none",zoom:!1},"G.Zuiko 40mm f/1.4":{lengthMm:38,diameterMm:60,frontMm:49,finish:"black",focusRing:"metal-knurled",apertureRing:!0,hood:"none",zoom:!1},"E.Zuiko 25mm f/4":{lengthMm:28,diameterMm:52,frontMm:43,finish:"silver",focusRing:"metal-scalloped",apertureRing:!0,hood:"built-in",zoom:!1},"Summicron-M 50mm f/2":{lengthMm:43,diameterMm:53,frontMm:39,finish:"chrome-nose",focusRing:"metal-knurled",apertureRing:!0,hood:"none",zoom:!1,focusTab:!0},"Summicron-M 35mm f/2":{lengthMm:34,diameterMm:52,frontMm:39,finish:"chrome-nose",focusRing:"metal-knurled",apertureRing:!0,hood:"none",zoom:!1,focusTab:!0},"Summicron-M 35mm f/2 ASPH":{lengthMm:35,diameterMm:53,frontMm:39,finish:"black",focusRing:"metal-knurled",apertureRing:!0,hood:"none",zoom:!1,focusTab:!0},"Summicron-M 28mm f/2":{lengthMm:41,diameterMm:53,frontMm:46,finish:"black",focusRing:"metal-knurled",apertureRing:!0,hood:"none",zoom:!1,focusTab:!0},"Summicron-M 90mm f/2":{lengthMm:77,diameterMm:58,frontMm:55,finish:"black",focusRing:"metal-knurled",apertureRing:!0,hood:"round",zoom:!1},"Summilux-M 50mm f/1.4":{lengthMm:52,diameterMm:53,frontMm:43,finish:"chrome-nose",focusRing:"metal-knurled",apertureRing:!0,hood:"none",zoom:!1,focusTab:!0},"Summilux-M 50mm f/1.4 ASPH":{lengthMm:52,diameterMm:53,frontMm:46,finish:"black",focusRing:"metal-knurled",apertureRing:!0,hood:"none",zoom:!1,focusTab:!0},"Summilux-M 35mm f/1.4":{lengthMm:46,diameterMm:53,frontMm:46,finish:"black",focusRing:"metal-knurled",apertureRing:!0,hood:"none",zoom:!1,focusTab:!0},"Noctilux-M 50mm f/1":{lengthMm:62,diameterMm:61,frontMm:58,finish:"black",focusRing:"metal-knurled",apertureRing:!0,hood:"none",zoom:!1},"Elmar-M 50mm f/2.8":{lengthMm:38,diameterMm:52,frontMm:39,finish:"silver",focusRing:"metal-scalloped",apertureRing:!0,hood:"none",zoom:!1,focusTab:!0},"Summaron 35mm f/2.8":{lengthMm:29,diameterMm:51,frontMm:39,finish:"chrome-nose",focusRing:"metal-scalloped",apertureRing:!0,hood:"none",zoom:!1,focusTab:!0},"Elmarit-M 28mm f/2.8":{lengthMm:42,diameterMm:52,frontMm:46,finish:"black",focusRing:"metal-knurled",apertureRing:!0,hood:"none",zoom:!1,focusTab:!0},"Voigtl\xE4nder Nokton 40mm f/1.4":{lengthMm:30,diameterMm:55,frontMm:43,finish:"black",focusRing:"metal-knurled",apertureRing:!0,hood:"none",zoom:!1,focusTab:!0},"Voigtl\xE4nder Color Skopar 35mm f/2.5":{lengthMm:25,diameterMm:51,frontMm:39,finish:"chrome-nose",focusRing:"metal-knurled",apertureRing:!0,hood:"none",zoom:!1,focusTab:!0},"Voigtl\xE4nder Nokton Classic 35mm f/1.4":{lengthMm:28,diameterMm:55,frontMm:43,finish:"chrome-nose",focusRing:"metal-scalloped",apertureRing:!0,hood:"none",zoom:!1,focusTab:!0},"Zeiss Biogon 35mm f/2":{lengthMm:44,diameterMm:52,frontMm:43,finish:"black",focusRing:"metal-knurled",apertureRing:!0,hood:"none",zoom:!1,focusTab:!0},"Konica M-Hexanon 50mm f/2":{lengthMm:45,diameterMm:54,frontMm:46,finish:"black",focusRing:"metal-knurled",apertureRing:!0,hood:"none",zoom:!1,focusTab:!0},"Minolta M-Rokkor 40mm f/2":{lengthMm:24,diameterMm:51,frontMm:40.5,finish:"black",focusRing:"metal-knurled",apertureRing:!0,hood:"none",zoom:!1,focusTab:!0},"Leica Summitar 50mm f/2":{lengthMm:45,diameterMm:48,frontMm:36,finish:"chrome-nose",focusRing:"metal-scalloped",apertureRing:!0,hood:"none",zoom:!1,focusTab:!0},"Elmar 50mm f/3.5":{lengthMm:38,diameterMm:48,frontMm:19,finish:"silver",focusRing:"metal-scalloped",apertureRing:!0,hood:"none",zoom:!1,focusTab:!0},"Jupiter-8 50mm f/2":{lengthMm:42,diameterMm:49,frontMm:40.5,finish:"chrome-nose",focusRing:"metal-knurled",apertureRing:!0,hood:"none",zoom:!1,focusTab:!0},"Jupiter-3 50mm f/1.5":{lengthMm:46,diameterMm:50,frontMm:40.5,finish:"chrome-nose",focusRing:"metal-knurled",apertureRing:!0,hood:"none",zoom:!1,focusTab:!0},"Industar-61 L/D 55mm f/2.8":{lengthMm:48,diameterMm:55,frontMm:40.5,finish:"silver",focusRing:"metal-knurled",apertureRing:!0,hood:"none",zoom:!1,focusTab:!0},"Canon 50mm f/1.8 LTM":{lengthMm:40,diameterMm:49,frontMm:40,finish:"chrome-nose",focusRing:"metal-scalloped",apertureRing:!0,hood:"none",zoom:!1,focusTab:!0},"Canon 35mm f/2.8 LTM":{lengthMm:32,diameterMm:48,frontMm:34,finish:"chrome-nose",focusRing:"metal-scalloped",apertureRing:!0,hood:"none",zoom:!1,focusTab:!0},"Planar 45mm f/2":{lengthMm:41,diameterMm:56,frontMm:46,finish:"black",focusRing:"thin-af",apertureRing:!1,hood:"none",zoom:!1},"Planar 35mm f/2":{lengthMm:35,diameterMm:56,frontMm:46,finish:"black",focusRing:"thin-af",apertureRing:!1,hood:"none",zoom:!1},"Biogon 28mm f/2.8":{lengthMm:31,diameterMm:56,frontMm:46,finish:"black",focusRing:"thin-af",apertureRing:!1,hood:"built-in",zoom:!1},"Biogon 21mm f/2.8":{lengthMm:36,diameterMm:59,frontMm:55,finish:"black",focusRing:"thin-af",apertureRing:!1,hood:"built-in",zoom:!1},"Sonnar 90mm f/2.8":{lengthMm:63,diameterMm:56,frontMm:46,finish:"black",focusRing:"thin-af",apertureRing:!1,hood:"round",zoom:!1},"Planar 50mm f/1.4":{lengthMm:46,diameterMm:63,frontMm:55,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"Planar 50mm f/1.7":{lengthMm:38,diameterMm:62,frontMm:55,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"Tessar 45mm f/2.8":{lengthMm:25,diameterMm:60,frontMm:49,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"Distagon 28mm f/2.8":{lengthMm:50,diameterMm:63,frontMm:55,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"Yashica ML 50mm f/1.7":{lengthMm:40,diameterMm:64,frontMm:52,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"Yashica ML 50mm f/1.9":{lengthMm:38,diameterMm:63,frontMm:52,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"Planar C 80mm f/2.8":{lengthMm:65,diameterMm:80,frontMm:50,finish:"black",focusRing:"metal-knurled",apertureRing:!0,hood:"none",zoom:!1},"Planar CF 80mm f/2.8":{lengthMm:65,diameterMm:81,frontMm:60,finish:"black",focusRing:"rubber-grid",apertureRing:!0,hood:"none",zoom:!1},"Distagon CF 50mm f/4":{lengthMm:98,diameterMm:84,frontMm:60,finish:"black",focusRing:"rubber-grid",apertureRing:!0,hood:"none",zoom:!1},"Sonnar CF 150mm f/4":{lengthMm:96,diameterMm:81,frontMm:60,finish:"black",focusRing:"rubber-grid",apertureRing:!0,hood:"round",zoom:!1},"45mm f/4":{lengthMm:52,diameterMm:60,frontMm:49,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"30mm f/5.6":{lengthMm:60,diameterMm:66,frontMm:58,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"built-in",zoom:!1},"90mm f/4":{lengthMm:73,diameterMm:60,frontMm:49,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"round",zoom:!1},"Sekor C 90mm f/3.8":{lengthMm:96,diameterMm:98,frontMm:77,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"Sekor C 127mm f/3.8":{lengthMm:92,diameterMm:98,frontMm:77,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"round",zoom:!1},"K/L 90mm f/3.5":{lengthMm:90,diameterMm:96,frontMm:77,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"Sekor Z 110mm f/2.8 W":{lengthMm:98,diameterMm:100,frontMm:77,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"N 80mm f/4":{lengthMm:56,diameterMm:64,frontMm:58,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"N 65mm f/4":{lengthMm:65,diameterMm:64,frontMm:58,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"N 150mm f/4.5":{lengthMm:96,diameterMm:70,frontMm:67,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"round",zoom:!1},"Sekor C 80mm f/2.8":{lengthMm:58,diameterMm:76,frontMm:67,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"Sekor C 80mm f/1.9":{lengthMm:72,diameterMm:88,frontMm:77,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"Sekor 80mm f/2.8":{lengthMm:70,diameterMm:62,frontMm:46,finish:"black",focusRing:"metal-knurled",apertureRing:!0,hood:"none",zoom:!1},"SMC Takumar 6x7 105mm f/2.4":{lengthMm:92,diameterMm:99,frontMm:67,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"SMC Pentax 67 90mm f/2.8":{lengthMm:90,diameterMm:98,frontMm:67,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"SMC Pentax 67 75mm f/4.5":{lengthMm:90,diameterMm:96,frontMm:67,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"SMC Pentax 67 165mm f/2.8":{lengthMm:140,diameterMm:106,frontMm:67,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"round",zoom:!1},"SMC Pentax-A 645 75mm f/2.8":{lengthMm:48,diameterMm:76,frontMm:58,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"Zenzanon-S 80mm f/2.8":{lengthMm:60,diameterMm:80,frontMm:67,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"Zenzanon-PS 80mm f/2.8":{lengthMm:58,diameterMm:80,frontMm:67,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"Zenzanon-E 75mm f/2.8":{lengthMm:52,diameterMm:74,frontMm:62,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"Zenzanon-PG 100mm f/3.5":{lengthMm:80,diameterMm:90,frontMm:72,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"G 75mm f/3.5":{lengthMm:55,diameterMm:64,frontMm:58,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"Volna-3 80mm f/2.8":{lengthMm:70,diameterMm:84,frontMm:62,finish:"black",focusRing:"metal-knurled",apertureRing:!0,hood:"none",zoom:!1},"Biometar 80mm f/2.8":{lengthMm:68,diameterMm:82,frontMm:58,finish:"silver",focusRing:"metal-knurled",apertureRing:!0,hood:"none",zoom:!1},"Summicron-R 50mm f/2":{lengthMm:51,diameterMm:66,frontMm:55,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"Summilux-R 50mm f/1.4":{lengthMm:58,diameterMm:68,frontMm:55,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"Elmarit-R 35mm f/2.8":{lengthMm:48,diameterMm:63,frontMm:55,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"Hexanon AR 40mm f/1.8":{lengthMm:27,diameterMm:63,frontMm:55,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"Hexanon AR 50mm f/1.7":{lengthMm:40,diameterMm:64,frontMm:55,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"Hexanon AR 57mm f/1.4":{lengthMm:50,diameterMm:66,frontMm:55,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1},"Prakticar 50mm f/1.8":{lengthMm:40,diameterMm:62,frontMm:49,finish:"black",focusRing:"rubber-ribbed",apertureRing:!0,hood:"none",zoom:!1}};function Es(a){return a.toLowerCase().replace(/\s+/g,"")}var oh=new Set(["the","lens","auto","smc","super","multi","coated","new","series"]);function ws(a){return a.toLowerCase().replace(/voigtländer/g,"voigtlander").replace(/[^a-z0-9./+]+/g," ").split(" ").filter(e=>e&&!oh.has(e))}function ah(a,e){let t=a.toLowerCase(),n=e.toLowerCase();return n.includes("nikon")&&/nikkor|series e/.test(t)||n.includes("canon fd")&&/new fd|\bfd\b|\bfl\b/.test(t)||n.includes("canon ef")&&/\bef\b/.test(t)?8:n==="leica m"&&/-m\b|voigt|summi|elmar|hexanon|m-rokkor|biogon|planar|sonnar/.test(t)||(n.includes("l39")||n.includes("ltm"))&&/ltm|jupiter|industar|summitar|elmar|summar|canon|w-nikkor|nikkor/.test(t)||n.includes("pentax")&&/pentax|takumar/.test(t)||n.includes("olympus")&&/zuiko/.test(t)?6:n.includes("minolta")&&/rokkor|\bmd\b|\bmc\b|\baf\b/.test(t)?5:n==="m42"&&/takumar|helios|jupiter|jena|pancolar|flektogon|industar|pentacon|biotar|orest|mir-/.test(t)||n.includes("contax g")&&/planar|biogon|sonnar|hologon|vario/.test(t)?6:(n.includes("yashica")||n.includes("contax/"))&&/yashica|planar|distagon|tessar|sonnar|makro/.test(t)||n.includes("hasselblad")&&/planar|distagon|sonnar|tessar|\bcf\b|\bc\b/.test(t)||n.includes("mamiya")&&/sekor|k\/l|\bn\b|\bg\b/.test(t)?4:n.includes("bronica")&&/zenzanon/.test(t)||n.includes("konica")&&/hexanon/.test(t)||n.includes("leica r")&&/-r\b/.test(t)?6:0}var Br=[39,40.5,43,46,49,52,55,58,62,67,72,77,82,86,95];function lh(a){let e=a*.82;return Br.reduce((t,n)=>Math.abs(n-e)<Math.abs(t-e)?n:t,Br[0])}function Hr(a,e,t=""){let n=zr(`${a} ${e}`),i=`${a} ${e}`.toLowerCase(),s=t.toLowerCase(),r=n.focalMax||n.focalMin||50,o=n.focalMin||r,l=Number(String(n.open).split(/[–-]/)[0])||2.8,c=n.zoom,u=/hasselblad|pentax 67|pentax 645|bronica|kiev|pentacon six|mamiya rb|mamiya rz|mamiya 645|mamiya c/.test(s),f=/mamiya 7|mamiya 6|xpan/.test(s),h=/leica m$|leica l39|\bl39\b|contax g|pen f/.test(s),d=/canon ef|minolta a|contax g/.test(s)||/\baf\b|af-s|af-d|\busm\b|\bstm\b|pentax-f/.test(i),p=46,m=64;c?(p=48+r*.42+(r-o)*.2+(l<=2.8?16:0),m=(h?58:u?84:68)+(l<=2.8?6:0)):u?(p=42+r*.32+Math.max(0,2.8-l)*6,m=80+Math.max(0,2.8-l)*4):f?(p=36+r*.28,m=68):h?(p=16+r*.48+Math.max(0,2-l)*8,m=51+Math.max(0,2-l)*5):r<35?(p=46+(35-r)*.35+Math.max(0,2.8-l)*4,m=63+Math.max(0,2.8-l)*3):r>85?(p=28+r*.55,m=66+Math.min(18,(r-85)*.08)):(p=24+r*.42+Math.max(0,2.2-l)*10,m=62+Math.max(0,2-l)*6),p=Math.round(Math.min(190,Math.max(22,p))),m=Math.round(Math.min(110,Math.max(48,m)));let g="black";h&&!/asph|apo|noctilux/.test(i)&&(g=r<=50?"chrome-nose":"silver"),/silver|chrome/.test(i)&&(g="silver"),/super-takumar|auto-takumar|biotar|tessar 50/.test(i)&&(g="silver");let _="rubber-ribbed";d?_="thin-af":/series e/.test(i)?_="rubber-grid":/takumar|\belmar\b|summar/.test(i)?_="metal-scalloped":(h||/helios|jupiter|industar|biotar|pancolar|flektogon/.test(i))&&(_="metal-knurled");let M=/nikkor|nikon/.test(i+" "+s)&&/af-s|\bf\/\d+(?:\.\d+)?g\b|\bg\b/.test(i)&&!/\baf\b.*\bd\b|\bd\b/.test(i),y=!(/canon ef|minolta a|contax g/.test(s)||/^ef\b/.test(e.toLowerCase())||M),v="none";!c&&o<24?v="built-in":c&&o<36?v="petal":!c&&r>=100&&(v="round");let b={lengthMm:p,diameterMm:m,frontMm:lh(m),finish:g,focusRing:_,apertureRing:y,hood:v,zoom:c};return!c&&h&&r<=50&&!d&&(b.focusTab=!0),b}function Vr(a="",e="",t=""){let n=`${a} ${e}`.trim();if(!n)return Hr("","50mm f/1.8",t);let i=Es(e),s=Es(n),r=ws(n),o,l=0;for(let[c,u]of Object.entries(rh)){let f=Es(c);if(f===s||i&&f===i)return{...u};let h=ws(c),d=new Set(ws(a)),p=r.filter(S=>!d.has(S)&&!/^\d+(?:-\d+)?mm$/.test(S)&&!/^f\/\d/.test(S));if(p.length&&!p.some(S=>h.includes(S)))continue;let m=r.find(S=>/^\d+(?:-\d+)?mm$/.test(S)),g=h.find(S=>/^\d+(?:-\d+)?mm$/.test(S));if(m&&g&&m!==g)continue;let _=r.find(S=>/^f\/\d/.test(S)),M=h.find(S=>/^f\/\d/.test(S));if(_&&M&&_!==M)continue;let y=0;for(let S of r)h.includes(S)&&y++;if(y<2)continue;let v=Math.max(0,h.length-y),b=y*10-v*3+ah(c,t)+(i.length>5&&f.includes(i)?25:0);b>l&&(l=b,o=u)}return o&&l>=18?{...o}:Hr(a,e,t)}function Gr(a){let e=new Map,t=l=>{let c=e.get(l);return c||e.set(l,c={p:[],n:[],t:[]}),c},n=new x,i=new z,s=(l,c,u)=>{let f=l.index?l.toNonIndexed():l,h=f.attributes.position,d=f.attributes.normal,p=f.attributes.uv;i.getNormalMatrix(c);let m=Array.isArray(u)&&f.groups.length?f.groups.map(g=>({start:g.start,count:g.count,mat:u[g.materialIndex??0]})):[{start:0,count:h.count,mat:Array.isArray(u)?u[0]:u}];for(let g of m){let _=t(g.mat.name||"plate"),M=Math.min(h.count,g.start+g.count);for(let y=g.start;y<M;y++)n.fromBufferAttribute(h,y).applyMatrix4(c),_.p.push(n.x,n.y,n.z),d?(n.fromBufferAttribute(d,y).applyMatrix3(i).normalize(),_.n.push(n.x,n.y,n.z)):_.n.push(0,1,0),p?_.t.push(p.getX(y),p.getY(y)):_.t.push(0,0)}f!==l&&f.dispose()};a.updateMatrixWorld(!0);let r=new me,o=new me;return a.traverse(l=>{if(l instanceof Qe)for(let c=0;c<l.count;c++)l.getMatrixAt(c,r),o.multiplyMatrices(l.matrixWorld,r),s(l.geometry,o,l.material);else l instanceof ue&&(l.geometry.attributes.normal||l.geometry.computeVertexNormals(),s(l.geometry,l.matrixWorld,l.material))}),[...e.entries()].map(([l,c])=>({role:l,position:new Float32Array(c.p),normal:new Float32Array(c.n),uv:new Float32Array(c.t)}))}function ch(a,e,t){let n=ys(a,e,t),i=kr(n,"#1c1c1c");return i.rotation.y=0,{parts:Gr(i),bottom:n.body[1]/2,profile:JSON.stringify(n)}}function hh(a,e,t=""){let n=Vr(a,e,t),i=Or(n);i.rotation.set(0,0,0),i.updateMatrixWorld(!0);let s=new Ie().setFromObject(i);return{parts:Gr(i),bottom:-s.min.y,spec:JSON.stringify(n)}}return $r(uh);})();
/*! Bundled license information:

three/build/three.module.js:
  (**
   * @license
   * Copyright 2010-2024 Three.js Authors
   * SPDX-License-Identifier: MIT
   *)
*/
