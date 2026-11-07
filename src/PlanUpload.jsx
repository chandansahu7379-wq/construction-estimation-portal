import React,{useState} from 'react';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc=workerUrl;

const parseOverallDimensions=text=>{
 const t=text.replace(/\s+/g,' ').replace(/[×✕]/g,'x');
 const pair=t.match(/(?:overall|plot|building|floor|plan)?\s*(?:dimensions?|size)?\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*(?:m|metres?|meters?)?\s*[xX]\s*(\d+(?:\.\d+)?)\s*(?:m|metres?|meters?)\b/i);
 if(pair)return {length:Number(pair[1]),width:Number(pair[2]),source:pair[0]};
 const lm=t.match(/(?:overall\s+)?length\s*[:=]\s*(\d+(?:\.\d+)?)\s*(?:m|metres?|meters?)\b/i);
 const wm=t.match(/(?:overall\s+)?width\s*[:=]\s*(\d+(?:\.\d+)?)\s*(?:m|metres?|meters?)\b/i);
 return lm&&wm?{length:Number(lm[1]),width:Number(wm[1]),source:lm[0]+'; '+wm[0]}:null;
};
const blankRoom=()=>({id:Date.now()+Math.random(),name:'Room',length:'',width:'',openings:'0'});
export default function PlanUpload({onDimensions,onTakeoff}){
 const[file,setFile]=useState(null),[preview,setPreview]=useState('');
 const[length,setLength]=useState(''),[width,setWidth]=useState('');
 const[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[detected,setDetected]=useState('');
 const[rooms,setRooms]=useState([blankRoom()]);
 const roomTotals=rooms.reduce((a,r)=>{const l=Math.max(0,Number(r.length)||0),w=Math.max(0,Number(r.width)||0);a.area+=l*w;a.perimeter+=2*(l+w);a.openings+=Math.max(0,Number(r.openings)||0);return a},{area:0,perimeter:0,openings:0});
 const updateRoom=(id,key,value)=>setRooms(old=>old.map(r=>r.id===id?{...r,[key]:value}:r));
 const choose=async e=>{
  const f=e.target.files?.[0];if(!f)return;
  if(!['application/pdf','image/png','image/jpeg','image/webp'].includes(f.type)){setMessage('Please upload a PDF, PNG, JPG or WebP plan.');return}
  if(f.size>15*1024*1024){setMessage('Maximum file size is 15 MB.');return}
  if(preview)URL.revokeObjectURL(preview);
  setFile(f);setPreview(URL.createObjectURL(f));setMessage('');setDetected('');
  if(f.type!=='application/pdf'){setMessage('Image preview ready. Fill the room schedule below; image OCR is not available in this version.');return}
  setBusy(true);
  try{
   const pdf=await pdfjs.getDocument({data:new Uint8Array(await f.arrayBuffer())}).promise,texts=[];
   for(let i=1;i<=Math.min(pdf.numPages,5);i++){const page=await pdf.getPage(i);texts.push((await page.getTextContent()).items.map(x=>x.str||'').join(' '))}
   const match=parseOverallDimensions(texts.join(' '));
   if(match&&match.length>0&&match.width>0&&match.length<=10000&&match.width<=10000){setLength(String(match.length));setWidth(String(match.width));setDetected(match.source);setMessage('Possible overall dimensions found in selectable PDF text. Check them against the drawing before applying.')}
   else setMessage('No clear overall dimensions found. Scanned PDFs need OCR; enter dimensions and room sizes manually.');
  }catch{setMessage('Could not read PDF text. Preview is available; enter dimensions manually.')}
  finally{setBusy(false)}
 };
 const apply=()=>{
  const l=Number(length),w=Number(width);
  if(!Number.isFinite(l)||!Number.isFinite(w)||l<=0||w<=0){setMessage('Enter positive overall length and width in metres.');return}
  onDimensions(l,w);setMessage('Overall dimensions applied to the estimator.');
 };
 const applyRoomTakeoff=()=>{
  const valid=rooms.filter(r=>Number(r.length)>0&&Number(r.width)>0);
  if(!valid.length){setMessage('Add at least one room with a valid length and width.');return}
  onTakeoff({rooms:valid.map(r=>({name:r.name,length:Number(r.length),width:Number(r.width),openings:Math.max(0,Number(r.openings)||0)}))});
  setMessage('Room schedule applied. Check the updated floor area and internal partition estimate in the quantity report.');
 };
 return <section className="panel" style={{marginBottom:18}}>
  <h2>2D Floor Plan – Upload & Room-wise Take-off</h2>
  <p className="muted">Upload your drawing for reference. Enter the overall dimensions and room dimensions from the drawing; the portal will calculate room floor area and an approximate internal partition length for the estimate.</p>
  <label>2D plan (PDF, PNG, JPG, WebP; max 15 MB)<input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={choose}/></label>
  {file&&<p className="muted">Selected: {file.name}</p>}
  {preview&&(file?.type==='application/pdf'?<iframe title="Uploaded floor plan" src={preview} style={{width:'100%',height:360,border:'1px solid #d5e0ed',borderRadius:8}}/>:<img alt="Uploaded floor plan preview" src={preview} style={{maxWidth:'100%',maxHeight:400,objectFit:'contain'}}/>)}
  {busy&&<p role="status">Reading selectable PDF text…</p>}
  {detected&&<p className="muted">Possible detected dimensions: {detected}</p>}
  <div className="fields" style={{marginTop:16}}>
   <label>Overall length (m)<input type="number" min="0" step="any" value={length} onChange={e=>setLength(e.target.value)}/></label>
   <label>Overall width (m)<input type="number" min="0" step="any" value={width} onChange={e=>setWidth(e.target.value)}/></label>
  </div>
  <button className="primary" onClick={apply} disabled={busy}>Apply overall dimensions</button>
  <h3 style={{marginTop:22}}>Room-wise dimensions</h3>
  <p className="muted">Read each room's inside length and width from your 2D plan. Enter internal door/opening area only. Add all rooms on one floor; repeat the schedule only if the floor layout is different.</p>
  <div className="tablewrap"><table><thead><tr><th>Room name</th><th>Length (m)</th><th>Width (m)</th><th>Internal openings (m²)</th><th></th></tr></thead><tbody>
   {rooms.map(r=><tr key={r.id}><td><input aria-label="Room name" value={r.name} onChange={e=>updateRoom(r.id,'name',e.target.value)}/></td><td><input aria-label="Room length" type="number" min="0" step="any" value={r.length} onChange={e=>updateRoom(r.id,'length',e.target.value)}/></td><td><input aria-label="Room width" type="number" min="0" step="any" value={r.width} onChange={e=>updateRoom(r.id,'width',e.target.value)}/></td><td><input aria-label="Room openings" type="number" min="0" step="any" value={r.openings} onChange={e=>updateRoom(r.id,'openings',e.target.value)}/></td><td><button type="button" onClick={()=>setRooms(old=>old.length>1?old.filter(x=>x.id!==r.id):old)}>Remove</button></td></tr>)}
  </tbody></table></div>
  <button type="button" onClick={()=>setRooms(old=>[...old,blankRoom()])}>+ Add room</button>
  <div className="notice" style={{marginTop:14}}><strong>Room schedule totals (one floor)</strong><p>Floor area: {roomTotals.area.toFixed(2)} m² · Room perimeter total: {roomTotals.perimeter.toFixed(2)} m · Internal openings entered: {roomTotals.openings.toFixed(2)} m²</p></div>
  <button className="primary" onClick={applyRoomTakeoff}>Apply room schedule to estimate</button>
  {message&&<p role="status" className="muted">{message}</p>}
  <p className="muted" style={{marginTop:12}}>Important: this version does not automatically recognize walls, rooms, doors or windows from a scanned drawing. Room sizes must be read and entered by you. Partition length is an approximation derived from room perimeters and the overall building perimeter; verify it against the drawing before using the estimate.</p>
 </section>;
}
