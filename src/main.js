import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import './style.css';

const canvas = document.querySelector('#scene-canvas');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x72847f, 0.0035);
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 500);
camera.position.set(38, 18, 48);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;
orbit.target.set(0, 5, 0);
orbit.maxPolarAngle = Math.PI * 0.47;
orbit.minDistance = 10;
orbit.maxDistance = 150;

let timeOfDay = 12;
let terrainScale = 1;
let terrainSegments = 70;
let terrainAlgorithm = 'perlin';
const MAP_SIZE = 220;
const world = new THREE.Group();
const terrainGroup = new THREE.Group();
const sceneryGroup = new THREE.Group();
const debugGroup = new THREE.Group();
world.add(terrainGroup, sceneryGroup, debugGroup);
scene.add(world);

function hash2D(x,z){const s=Math.sin(x*127.1+z*311.7)*43758.5453;return s-Math.floor(s);}
function fade(t){return t*t*t*(t*(t*6-15)+10);}
function gradientNoise(x,z){
 const x0=Math.floor(x),z0=Math.floor(z),fx=x-x0,fz=z-z0;
 const grad=(ix,iz,dx,dz)=>{const a=hash2D(ix,iz)*Math.PI*2;return Math.cos(a)*dx+Math.sin(a)*dz;};
 const u=fade(fx),v=fade(fz);
 const n00=grad(x0,z0,fx,fz),n10=grad(x0+1,z0,fx-1,fz),n01=grad(x0,z0+1,fx,fz-1),n11=grad(x0+1,z0+1,fx-1,fz-1);
 return THREE.MathUtils.lerp(THREE.MathUtils.lerp(n00,n10,u),THREE.MathUtils.lerp(n01,n11,u),v)*1.75;
}
function perlinNoise(x,z){let value=0,amplitude=1,frequency=.045,total=0;for(let i=0;i<4;i++){value+=gradientNoise(x*frequency,z*frequency)*amplitude;total+=amplitude;amplitude*=.5;frequency*=2;}return value/total;}
function erosionHeight(x,z){
 const base=perlinNoise(x,z)*15;
 const slope=Math.abs(perlinNoise(x-4,z)-perlinNoise(x+4,z))+Math.abs(perlinNoise(x,z-4)-perlinNoise(x,z+4));
 const valley=Math.max(0,1-Math.hypot(x+1,z+7)/30)*5.5;
 return base-slope*5.5-valley+Math.sin(x*.08+z*.04)*.55;
}
function terrainHeight(x,z){return (terrainAlgorithm==='erosion'?erosionHeight(x,z):perlinNoise(x,z)*15)*terrainScale+3.5;}
function buildTerrainGeometry(){
 const geo=new THREE.PlaneGeometry(MAP_SIZE,MAP_SIZE,terrainSegments,terrainSegments);geo.rotateX(-Math.PI/2);
 const p=geo.attributes.position,colors=[];
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),y=terrainHeight(x,z);p.setY(i,y);const h=THREE.MathUtils.clamp((y-1)/18,0,1),c=new THREE.Color().setHSL(.29-h*.11,.24+h*.24,.27+h*.18);colors.push(c.r,c.g,c.b);}
 geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();return geo;
}
const terrainMesh=new THREE.Mesh(buildTerrainGeometry(),new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95,metalness:.02,flatShading:true}));
terrainMesh.name='procedural-terrain';terrainMesh.receiveShadow=true;terrainGroup.add(terrainMesh);
const terrainWire=new THREE.LineSegments(new THREE.WireframeGeometry(terrainMesh.geometry),new THREE.LineBasicMaterial({color:0xd6f2d5,transparent:true,opacity:.26}));
terrainWire.name='terrain-wireframe';terrainWire.visible=false;debugGroup.add(terrainWire);

function addBox(name,pos,size,material,castShadow=true){const m=new THREE.Mesh(new THREE.BoxGeometry(...size),material);m.name=name;m.position.set(...pos);m.castShadow=castShadow;m.receiveShadow=true;sceneryGroup.add(m);return m;}
const treeAnchors=[];
function createTree(x,z,scale=1,hue=.31){
 const g=new THREE.Group();g.userData.terrainAnchor={x,z};g.position.set(x,terrainHeight(x,z),z);g.scale.setScalar(scale);
 const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.22,.32,3.4,7),new THREE.MeshStandardMaterial({color:0x72543d,roughness:1}));trunk.position.y=1.7;trunk.castShadow=true;g.add(trunk);
 const mat=new THREE.MeshStandardMaterial({color:new THREE.Color().setHSL(hue,.34,.32),roughness:.9,flatShading:true});
 const crown=new THREE.Mesh(new THREE.ConeGeometry(2.15,4.4,8),mat);crown.position.y=4.15;crown.castShadow=true;g.add(crown);
 const top=new THREE.Mesh(new THREE.ConeGeometry(1.55,3.2,8),mat);top.position.y=6.2;top.castShadow=true;g.add(top);
 sceneryGroup.add(g);treeAnchors.push(g);
}
[[-47,-37,1.5],[-39,-20,1.2],[-45,4,1.4],[-35,26,1.3],[-24,35,1.5],[25,-38,1.5],[39,-23,1.3],[46,-4,1.6],[38,19,1.3],[28,37,1.5],[-12,37,1.1],[13,39,1.2],[-49,27,1.2],[48,34,1.15],[32,-3,1],[-83,-64,1.25],[-61,-78,1.05],[-19,-83,1.35],[20,-81,1.2],[64,-73,1.28],[84,-47,1.1],[88,2,1.35],[80,51,1.2],[56,79,1.3],[6,84,1.15],[-45,79,1.2],[-82,61,1.3],[-89,22,1.1],[-83,-7,1.25]].forEach(([x,z,s],i)=>createTree(x,z,s,.28+(i%3)*.02));

const anchors=[];
const wood=new THREE.MeshStandardMaterial({color:0x967052,roughness:.82}),roofMat=new THREE.MeshStandardMaterial({color:0x263d37,roughness:.88}),cream=new THREE.MeshStandardMaterial({color:0xd8c5a0,roughness:.8});
const cabinX=17,cabinZ=13,cabinY=()=>terrainHeight(cabinX,cabinZ);
const body=addBox('cabin-body',[cabinX,cabinY()+2.3,cabinZ],[7,4.6,5.8],wood);anchors.push([body,2.3]);
const roof=new THREE.Mesh(new THREE.ConeGeometry(5.6,2.5,4),roofMat);roof.rotation.y=Math.PI/4;roof.position.set(cabinX,cabinY()+5.8,cabinZ);roof.scale.z=.58;roof.castShadow=true;sceneryGroup.add(roof);anchors.push([roof,5.8]);
const windowA=addBox('cabin-window',[14.45,cabinY()+2.6,10.03],[1.2,1.25,.12],cream,false),windowB=addBox('cabin-window',[19.55,cabinY()+2.6,10.03],[1.2,1.25,.12],cream,false);
anchors.push([windowA,2.6,[14.45,10.03]],[windowB,2.6,[19.55,10.03]]);

const ambient=new THREE.HemisphereLight(0xc9dfdb,0x334239,1.25);scene.add(ambient);
const sun=new THREE.DirectionalLight(0xffd9a0,3.2);sun.position.set(-30,42,25);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-120;sun.shadow.camera.right=120;sun.shadow.camera.top=120;sun.shadow.camera.bottom=-120;scene.add(sun);
const moon=new THREE.DirectionalLight(0x85a9d1,0);moon.position.set(20,30,-30);scene.add(moon);
const sky=new THREE.Mesh(new THREE.SphereGeometry(220,24,16),new THREE.ShaderMaterial({side:THREE.BackSide,uniforms:{uTop:{value:new THREE.Color(0x91b6b0)},uBottom:{value:new THREE.Color(0xf0cf9f)}},vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'uniform vec3 uTop;uniform vec3 uBottom;varying vec3 vP;void main(){float h=normalize(vP).y*.5+.5;gl_FragColor=vec4(mix(uBottom,uTop,smoothstep(.15,.8,h)),1.0);}'}));scene.add(sky);

function updateAnchors(){treeAnchors.forEach(t=>{const {x,z}=t.userData.terrainAnchor;t.position.y=terrainHeight(x,z);});anchors.forEach(([o,offset,fixed])=>{o.position.y=cabinY()+offset;if(fixed){o.position.x=fixed[0];o.position.z=fixed[1];}});}
function rebuildTerrain(){const g=buildTerrainGeometry();terrainMesh.geometry.dispose();terrainMesh.geometry=g;terrainWire.geometry.dispose();terrainWire.geometry=new THREE.WireframeGeometry(g);updateAnchors();}
function updateEnvironment(){
 const daylight=Math.max(0,Math.sin(((timeOfDay-6)/12)*Math.PI)),sunset=Math.max(0,1-Math.abs(timeOfDay-17)/3);
 sun.intensity=.28+daylight*3.5;sun.color.setHSL(.08+daylight*.03,.66,.65+sunset*.12);sun.position.set(Math.cos(timeOfDay/24*Math.PI*2)*45,10+daylight*42,Math.sin(timeOfDay/24*Math.PI*2)*45);moon.intensity=daylight<.12?.7:0;ambient.intensity=.38+daylight*.9;
 sky.material.uniforms.uTop.value.set(daylight<.15?0x172b43:sunset>.55?0xa05b58:0x91b6b0);sky.material.uniforms.uBottom.value.set(daylight<.15?0x111b2b:sunset>.55?0xf0a56e:0xf0cf9f);scene.fog.color.set(daylight<.15?0x1a2931:sunset>.55?0x916d66:0x72847f);scene.fog.density=daylight<.15?.0048:.0035;
}
function toast(message){const el=document.querySelector('#toast');el.textContent=message;el.classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('visible'),2200);}
function hour(v){return String(Math.floor(v)%24).padStart(2,'0')+':'+String(Math.round((v-Math.floor(v))*60)).padStart(2,'0');}
function resetCamera(){camera.position.set(38,18,48);orbit.target.set(0,5,0);orbit.update();toast('已重置为湖畔观察视角');}
function overview(){camera.position.set(0,112,128);orbit.target.set(0,0,0);orbit.update();toast('已切换至高空观察视角');}
function bindUI(){
 const time=document.querySelector('#time-slider');time.addEventListener('input',()=>{timeOfDay=+time.value;const t=hour(timeOfDay);document.querySelector('#time-value').textContent=t;document.querySelector('#clock-readout').textContent=t;updateEnvironment();});
 document.querySelector('#terrain-slider').addEventListener('input',e=>{terrainScale=+e.target.value;document.querySelector('#terrain-value').textContent=terrainScale.toFixed(2);rebuildTerrain();});
 document.querySelector('#terrain-algorithm').addEventListener('change',e=>{terrainAlgorithm=e.target.value;rebuildTerrain();toast('地形算法已切换为'+e.target.options[e.target.selectedIndex].text);});
 document.querySelector('#terrain-density').addEventListener('change',e=>{terrainSegments=+e.target.value;rebuildTerrain();toast('网格密度已调整为'+terrainSegments+'×'+terrainSegments);});
 document.querySelector('#wireframe-toggle').addEventListener('change',e=>{terrainWire.visible=e.target.checked;});
 document.querySelector('#reset-camera').addEventListener('click',resetCamera);document.querySelector('#overview-camera').addEventListener('click',overview);
 document.querySelector('#panel-toggle').addEventListener('click',()=>{const p=document.querySelector('.control-panel');p.classList.toggle('collapsed');document.querySelector('#panel-toggle').textContent=p.classList.contains('collapsed')?'+':'−';});
}
bindUI();updateEnvironment();setTimeout(()=>document.querySelector('#loading-screen').classList.add('hidden'),650);
function animate(){requestAnimationFrame(animate);orbit.update();renderer.render(scene,camera);}animate();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
