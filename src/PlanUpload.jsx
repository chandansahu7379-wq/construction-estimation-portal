import React,{useState} from 'react';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import {createWorker} from 'tesseract.js';
pdfjs.GlobalWorkerOptions.workerSrc=workerUrl;

const clean=text=>text.replace(/[×✕]/g,'x').replace(/[|]/g,' ').replace(/\s+/g,' ').trim();
const parseOverallDimensions=text=>{
 const t=clean(text);
 const labelled=t.match(/(?:overall|plot|building|floor)\s*(?:dimensions?|size)?\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*(?:m|metres?|meters?)?\s*x\s*(\d+(?:\.\d+)?)\s*(?:m|metres?|meters?)?/i);
 if(labelled)return {length:Number(labelled[1]),width:Number(labelled[2]),source:labelled[0]};
 const lm=t.match(/(?:overall\s+)?length\s*[:=]\s*(\d+(?:\.\d+)?)/i),wm=t.match(/(?:overall\s+)?width\s*[:=]\s*(\d+(?:\.\d+)?)/i);
 return lm&&wm?{length:Number(lm[1]),width:Number(wm[1]),source:lm[0]+'; '+wm[0]}:null;
};
const parseRoomDimensions=text=>{
 const t=clean(text);
 const pattern=/\b(LIVING\s+ROOM|BED\s*ROOM\s*\d*|BEDROOM\s*\d*|KITCHEN|BATH\s*\/\s*WC|BATHROOM|TOILET|DINING\s+ROOM)\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*(?:m)?\s*x\s*(\d+(?:\.\d+)?)\s*m?\b/gi;
 const found=[];let match;
 while((match=pattern.exec(t))!==null){
  const name=match[1].replace(/\s+/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
  const length=Number(match[2]),width=Number(match[3]);
  if(length>0&&width>0&&length<=100&&width<=100&&!found.some(r=>r.name.toLowerCase()===name.toLowerCase()))found.push({id:name+'-'+found.length,name,length:String(length),width:String(width),openings:'0'});
 }
 return found;
};
const blankRoom=()=>({id:'room-'+Date.now()+'-'+Math.random(),name:'Room',length:'',width:'',openings:'0'});
async function imageToCanvas(file){
 const url=URL.createObjectURL(file);
 try{const img=new Image();img.src=url;await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject});
 const canvas=document.createElement('canvas');const scale=Math.min(2,2400/Math.max(img.width,img.height));canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);
 canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);return canvas;
 }finally{URL.revokeObjectURL(url)}
}
export default function PlanUpload({onDimensions,onTakeoff}){
 const[file,setFile]=useState(null),[preview,setPreview]=useState('');
 const[length,setLength]=useState(''),[width,setWidth]=useState('');
 const[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[detected,setDetected]=useState(''),[progress,setProgress]=useState(0);
 const[rooms,setRooms]=useState([blankRoom()]);
 const roomTotals=rooms.reduce((a,r)=>{const l=Math.max(0,Number(r.length)||0),w=Math.max(0,Number(r.width)||0);a.area+=l*w;a.perimeter+=2*(l+w);a.openings+=Math.max(0,Number(r.openings)||0);return a;},{area:0,perimeter:0,openings:0});
 const updateRoom=(id,key,value)=>setRooms(old=>old.map(r=>r.id===id?{...r,[key]:value}:r));
 const choose=async e=>{
  const f=e.target.files?.[0];if(!f)return;
  if(!['application/pdf','image/png','image/jpeg','image/webp'].includes(f.type)){setMessage('Please upload a PDF, PNG, JPG or WebP plan.');return}
  if(f.size>15*1024*1024){setMessage('Maximum file size is 15 MB.');return}
  if(preview)URL.revokeObjectURL(preview);
  setFile(f);setPreview(URL.createObjectURL(f));setMessage('');setDetected('');setProgress(0);setBusy(true);
  let worker;
  try{
   worker=await createWorker('eng');
   let texts=[];
   if(f.type==='application/pdf'){
    const pdf=await pdfjs.getDocument({data:new Uint8Array(await f.arrayBuffer())}).promise;
    for(let i=1;i<=Math.min(pdf.numPages,5);i++){
     const page=await pdf.getPage(i),viewport=page.getViewport({scale:2});
     const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
     await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
     const result=await worker.recognize(canvas);texts.push(result.data.text||'');setProgress(Math.round(i/Math.min(pdf.numPages,5)*100));
    }
   }else{
    const canvas=await imageToCanvas(f);const result=await worker.recognize(canvas);texts.push(result.data.text||'');setProgress(100);
   }
   const fullText=texts.join(' '),match=parseOverallDimensions(fullText),foundRooms=parseRoomDimensions(fullText);
   if(foundRooms.length)setRooms(foundRooms);
   if(match&&match.length>0&&match.width>0&&match.length<=10000&&match.width<=10000){setLength(String(match.length));setWidth(String(match.width));setDetected(match.source)}
   setMessage(match||foundRooms.length
    ?'OCR scan finished. Possible dimensions were detected. Carefully verify every value against the drawing before applying.'
    :'OCR scan finished, but clear dimensions were not found. Enter the overall size and room dimensions manually.');
  }catch(err){setMessage('Could not scan this file. You can still use the preview and enter dimensions manually. '+(err?.message||''))}
  finally{if(worker)await worker.terminate();setBusy(false)}
 };
 const apply=()=>{const l=Number(length),w=Number(width);if(!Number.isFinite(l)||!Number.isFinite(w)||l<=0||w<=0){setMessage('Enter positive overall length and width in metres.');return}onDimensions(l,w);setMessage('Overall dimensions applied to the estimator.')};
 const applyRoomTakeoff=()=>{const valid=rooms.filter(r=>Number(r.length)>0&&Number(r.width)>0);if(!valid.length){setMessage('Add at least one room with a valid length and width.');return}onTakeoff({rooms:valid.map(r=>({name:r.name,length:Number(r.length),width:Number(r.width),openings:Math.max(0,Number(r.openings)||0)}))});setMessage('Room schedule applied. Review the updated quantities and cost report.')};
 return <section className="panel" style={{marginBottom:18}}>
  <h2>2D Floor Plan – Upload, OCR & Room-wise Take-off</h2>
  <p className="muted">Upload a PDF or image. OCR scans printed dimensions and common room labels. OCR can misread drawings, so verify all detected values before using the estimate.</p>
  <label>2D plan (PDF, PNG, JPG, WebP; max 15 MB)<input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={choose}/></label>
  {file&&<p className="muted">Selected: {file.name}</p>}
  {preview&&(file?.type==='application/pdf'?<iframe title="Uploaded floor plan" src={preview} style={{width:'100%',height:360,border:'1px solid #d5e0ed',borderRadius:8}}/>:<img alt="Uploaded floor plan preview" src={preview} style={{maxWidth:'100%',maxHeight:400,objectFit:'contain'}}/>)}
  {busy&&<div role="status" className="notice">Scanning plan with OCR… {progress}%<div style={{height:7,background:'#dce8f5',borderRadius:8,marginTop:8}}><div style={{height:7,width:progress+'%',background:'#136bc1',borderRadius:8}}/></div></div>}
  {detected&&<p className="muted">Possible detected overall dimensions: {detected}</p>}
  <div className="fields" style={{marginTop:16}}><label>Overall length (m)<input type="number" min="0" step="any" value={length} onChange={e=>setLength(e.target.value)}/></label><label>Overall width (m)<input type="number" min="0" step="any" value={width} onChange={e=>setWidth(e.target.value)}/></label></div>
  <button className="primary" onClick={apply} disabled={busy}>Apply overall dimensions</button>
  <h3 style={{marginTop:22}}>Room-wise dimensions</h3>
  <p className="muted">OCR may prefill labelled rooms where dimensions are printed clearly. Check names, lengths, widths and opening areas.</p>
  <div className="tablewrap"><table><thead><tr><th>Room name</th><th>Length (m)</th><th>Width (m)</th><th>Internal openings (m²)</th><th></th></tr></thead><tbody>
   {rooms.map(r=><tr key={r.id}><td><input aria-label="Room name" value={r.name} onChange={e=>updateRoom(r.id,'name',e.target.value)}/></td><td><input aria-label="Room length" type="number" min="0" step="any" value={r.length} onChange={e=>updateRoom(r.id,'length',e.target.value)}/></td><td><input aria-label="Room width" type="number" min="0" step="any" value={r.width} onChange={e=>updateRoom(r.id,'width',e.target.value)}/></td><td><input aria-label="Room openings" type="number" min="0" step="any" value={r.openings} onChange={e=>updateRoom(r.id,'openings',e.target.value)}/></td><td><button type="button" onClick={()=>setRooms(old=>old.length>1?old.filter(x=>x.id!==r.id):old)}>Remove</button></td></tr>)}
  </tbody></table></div>
  <button type="button" onClick={()=>setRooms(old=>[...old,blankRoom()])}>+ Add room</button>
  <div className="notice" style={{marginTop:14}}><strong>Room schedule totals (one floor)</strong><p>Floor area: {roomTotals.area.toFixed(2)} m² · Room perimeter total: {roomTotals.perimeter.toFixed(2)} m · Internal openings entered: {roomTotals.openings.toFixed(2)} m²</p></div>
  <button className="primary" onClick={applyRoomTakeoff}>Apply room schedule to estimate</button>
  {message&&<p role="status" className="muted">{message}</p>}
  <p className="muted" style={{marginTop:12}}>Important limitation: OCR reads printed text only. It does not reliably understand drawing geometry or automatically calculate wall paths, door/window schedules, foundations or structural reinforcement. Room-derived partition length is an approximation. Verify the complete BOQ with the actual architectural/structural drawings before construction.</p>
 </section>;
}
