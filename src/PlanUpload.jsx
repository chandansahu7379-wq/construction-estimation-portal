import React,{useState} from 'react';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import {createWorker} from 'tesseract.js';
pdfjs.GlobalWorkerOptions.workerSrc=workerUrl;

const tidy=s=>String(s||'').replace(/[×✕]/g,'x').replace(/,/g,'.').replace(/\s+/g,' ').trim();
const num='(\\d{1,4}(?:\\.\\d{1,3})?)';
const pair=new RegExp(num+'\\s*(m|mm)?\\s*x\\s*'+num+'\\s*(m|mm)?','i');
const metres=(v,u)=>Number(v)/(String(u||'').toLowerCase()==='mm'?1000:1);

function parseOverall(text){
 const t=tidy(text);
 let m=t.match(new RegExp('(?:overall|plot|building|floor)\\s*(?:dimensions?|size)?\\s*[:=-]?\\s*'+num+'\\s*(?:m)?\\s*x\\s*'+num+'\\s*m?','i'));
 if(m)return {length:Number(m[1]),width:Number(m[2]),source:m[0]};
 const l=t.match(new RegExp('(?:overall\\s+)?length\\s*(?:\\(m\\))?\\s*[:=-]?\\s*'+num+'\\s*(m|mm)?','i'));
 const w=t.match(new RegExp('(?:overall\\s+)?width\\s*(?:\\(m\\))?\\s*[:=-]?\\s*'+num+'\\s*(m|mm)?','i'));
 if(l&&w)return {length:metres(l[1],l[2]),width:metres(w[1],w[2]),source:l[0]+'; '+w[0]};
 return null;
}
function parseRooms(text){
 const lines=String(text||'').split(/\r?\n/).map(tidy).filter(Boolean),out=[];
 const aliases=[
  ['LIVING / DINING',/living.*(dining)|(dining).*living/i],
  ['LIVING ROOM',/living/i],['BEDROOM 1',/bed\s*room\\s*1|bedroom\\s*1|bed\\s*1/i],
  ['BEDROOM 2',/bed\s*room\\s*2|bedroom\\s*2|bed\\s*2/i],['BEDROOM 3',/bed\s*room\\s*3|bedroom\\s*3|bed\\s*3/i],
  ['KITCHEN',/kitchen/i],['TOILET 1',/toilet\s*1|wc\\s*1/i],['TOILET 2',/toilet\s*2|wc\\s*2/i],
  ['TOILET',/toilet|\\bwc\\b/i],['BATHROOM',/bath/i],['UTILITY',/utility|wash\s*area/i],['DINING ROOM',/dining/i]
 ];
 const add=(name,m,raw)=>{
  const l=metres(m[1],m[2]),w=metres(m[3],m[4]);
  if(l>0&&w>0&&l<=50&&w<=50&&!out.some(r=>r.name===name))out.push({id:name+'-'+out.length,name,length:String(l),width:String(w),openings:'0'});
 };
 for(let i=0;i<lines.length;i++){
  for(const [name,re] of aliases){
   if(!re.test(lines[i]))continue;
   let m=lines[i].match(pair),raw=lines[i];
   if(!m&&lines[i+1]){m=lines[i+1].match(pair);raw=lines[i+1];}
   if(!m&&lines[i-1]){m=lines[i-1].match(pair);raw=lines[i-1];}
   if(m){add(name,m,raw);break;}
  }
 }
 // Also parse compact forms such as "BEDROOM 1 3.5 x 4.5".
 const compact=new RegExp('(living\\s*(?:/|and|&)\\s*dining|living\\s*room|bed\\s*room\\s*\\d*|bedroom\\s*\\d*|kitchen|toilet\\s*\\d*|wc\\s*\\d*|bathroom|utility|dining)\\s*[:=-]?\\s*'+num+'\\s*(m|mm)?\\s*x\\s*'+num+'\\s*(m|mm)?','gi');
 let m;while((m=compact.exec(String(text||''))){
  const s=m[1].toLowerCase(),digit=(s.match(/\\d+/)||[])[0];
  const name=/living/.test(s)&&/dining/.test(s)?'LIVING / DINING':/living/.test(s)?'LIVING ROOM':/bed/.test(s)?'BEDROOM '+(digit||'1'):/kitchen/.test(s)?'KITCHEN':/toilet|wc/.test(s)?'TOILET '+(digit||''):/bath/.test(s)?'BATHROOM':/utility/.test(s)?'UTILITY':'DINING ROOM';
  add(name,[m[0],m[2],m[3],m[4],m[5]],m[0]);
 }
 return out;
}
const blank=()=>({id:'room-'+Date.now()+'-'+Math.random(),name:'Room',length:'',width:'',openings:'0'});
async function imageCanvas(file){
 const url=URL.createObjectURL(file);
 try{const img=new Image();img.src=url;await new Promise((ok,no)=>{img.onload=ok;img.onerror=no;});
 const c=document.createElement('canvas'),scale=Math.min(3,3000/Math.max(img.width,img.height));
 c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext('2d').drawImage(img,0,0,c.width,c.height);return c;
 }finally{URL.revokeObjectURL(url);}
}
export default function PlanUpload({onDimensions,onTakeoff}){
 const[file,setFile]=useState(null),[preview,setPreview]=useState(''),[length,setLength]=useState(''),[width,setWidth]=useState('');
 const[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[detected,setDetected]=useState(''),[progress,setProgress]=useState(0),[rooms,setRooms]=useState([blank()]);
 const totals=rooms.reduce((a,r)=>{const l=Number(r.length)||0,w=Number(r.width)||0;a.area+=l*w;a.perimeter+=2*(l+w);a.openings+=Number(r.openings)||0;return a;},{area:0,perimeter:0,openings:0});
 const update=(id,k,v)=>setRooms(old=>old.map(r=>r.id===id?{...r,[k]:v}:r));
 const scan=async f=>{
  if(!f)return;
  if(!['application/pdf','image/png','image/jpeg','image/webp'].includes(f.type)){setMessage('Please upload a PDF, PNG, JPG or WebP plan.');return;}
  if(f.size>15*1024*1024){setMessage('Maximum file size is 15 MB.');return;}
  if(preview)URL.revokeObjectURL(preview);setFile(f);setPreview(URL.createObjectURL(f));setMessage('');setDetected('');setProgress(0);setBusy(true);
  let worker;
  try{
   worker=await createWorker('eng');let texts=[];
   if(f.type==='application/pdf'){
    const pdf=await pdfjs.getDocument({data:new Uint8Array(await f.arrayBuffer())}).promise;
    for(let i=1;i<=Math.min(pdf.numPages,5);i++){
     const page=await pdf.getPage(i),vp=page.getViewport({scale:2.5}),c=document.createElement('canvas');
     c.width=Math.ceil(vp.width);c.height=Math.ceil(vp.height);await page.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;
     const result=await worker.recognize(c);texts.push(result.data.text||'');setProgress(Math.round(i/Math.min(pdf.numPages,5)*100));
    }
   }else{const result=await worker.recognize(await imageCanvas(f));texts.push(result.data.text||'');setProgress(100);}
   const text=texts.join('\\n'),overall=parseOverall(text),found=parseRooms(text);
   if(found.length)setRooms(found);
   if(overall&&overall.length>0&&overall.width>0&&overall.length<=100&&overall.width<=100){setLength(String(overall.length));setWidth(String(overall.width));setDetected(overall.source);}
   setMessage(overall||found.length?'OCR found possible values. Verify them against the drawing before applying.':'Scan completed, but readable labelled dimensions were not detected. Faint, rotated or dimension-line-only drawings may need manual checking.');
  }catch(e){setMessage('Could not scan this file. Preview is available; enter dimensions manually. '+(e?.message||''));}
  finally{if(worker)await worker.terminate();setBusy(false);}
 };
 const apply=()=>{const l=Number(length),w=Number(width);if(l<=0||w<=0){setMessage('Enter positive overall length and width in metres.');return;}onDimensions(l,w);setMessage('Overall dimensions applied to the estimator.');};
 const applyRooms=()=>{const valid=rooms.filter(r=>Number(r.length)>0&&Number(r.width)>0);if(!valid.length){setMessage('Add at least one room with valid dimensions.');return;}onTakeoff({rooms:valid.map(r=>({name:r.name,length:Number(r.length),width:Number(r.width),openings:Math.max(0,Number(r.openings)||0)}))});setMessage('Room schedule applied. Review the updated estimate.');};
 return <section className="panel" style={{marginBottom:18}}>
  <h2>2D Floor Plan – Upload, OCR & Room-wise Take-off</h2>
  <p className="muted">Upload a clear dimension-labelled PDF or image. OCR suggests printed dimensions and room labels; it cannot interpret all wall geometry. Verify every suggested value.</p>
  <label>2D plan (PDF, PNG, JPG, WebP; max 15 MB)<input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={e=>scan(e.target.files?.[0])}/></label>
  {file&&<p className="muted">Selected: {file.name}</p>}
  {preview&&(file?.type==='application/pdf'?<iframe title="Uploaded floor plan" src={preview} style={{width:'100%',height:360,border:'1px solid #d5e0ed',borderRadius:8}}/>:<img alt="Uploaded floor plan preview" src={preview} style={{maxWidth:'100%',maxHeight:400,objectFit:'contain'}}/>)}
  {busy&&<div role="status" className="notice">Scanning plan with OCR… {progress}%<div style={{height:7,background:'#dce8f5',borderRadius:8,marginTop:8}}><div style={{height:7,width:progress+'%',background:'#136bc1',borderRadius:8}}/></div></div>}
  {detected&&<p className="muted">Possible overall dimensions detected: {detected}</p>}
  <div className="fields" style={{marginTop:16}}><label>Overall length (m)<input type="number" min="0" step="any" value={length} onChange={e=>setLength(e.target.value)}/></label><label>Overall width (m)<input type="number" min="0" step="any" value={width} onChange={e=>setWidth(e.target.value)}/></label></div>
  <button className="primary" onClick={apply} disabled={busy}>Apply overall dimensions</button>
  <h3 style={{marginTop:22}}>Room-wise dimensions</h3><p className="muted">Detected room values appear here when a room label and its printed dimensions are readable.</p>
  <div className="tablewrap"><table><thead><tr><th>Room name</th><th>Length (m)</th><th>Width (m)</th><th>Internal openings (m²)</th><th></th></tr></thead><tbody>
   {rooms.map(r=><tr key={r.id}><td><input aria-label="Room name" value={r.name} onChange={e=>update(r.id,'name',e.target.value)}/></td><td><input aria-label="Room length" type="number" min="0" step="any" value={r.length} onChange={e=>update(r.id,'length',e.target.value)}/></td><td><input aria-label="Room width" type="number" min="0" step="any" value={r.width} onChange={e=>update(r.id,'width',e.target.value)}/></td><td><input aria-label="Room openings" type="number" min="0" step="any" value={r.openings} onChange={e=>update(r.id,'openings',e.target.value)}/></td><td><button type="button" onClick={()=>setRooms(old=>old.length>1?old.filter(x=>x.id!==r.id):old)}>Remove</button></td></tr>)}
  </tbody></table></div>
  <button type="button" onClick={()=>setRooms(old=>[...old,blank()])}>+ Add room</button>
  <div className="notice" style={{marginTop:14}}><strong>Room schedule totals (one floor)</strong><p>Floor area: {totals.area.toFixed(2)} m² · Room perimeter total: {totals.perimeter.toFixed(2)} m · Internal openings entered: {totals.openings.toFixed(2)} m²</p></div>
  <button className="primary" onClick={applyRooms}>Apply room schedule to estimate</button>
  {message&&<p role="status" className="muted">{message}</p>}
  <p className="muted" style={{marginTop:12}}>Important: OCR reads printed text only. It cannot reliably identify wall paths, wall intersections, door/window geometry, foundations or reinforcement. Internal partition lengths and structural quantities must be measured or supplied separately. This is a preliminary educational estimate, not a construction BOQ.</p>
 </section>;
}
