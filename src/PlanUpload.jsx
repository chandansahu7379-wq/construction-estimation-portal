import React,{useState} from 'react';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc=workerUrl;

const parseOverallDimensions=text=>{
 const t=text.replace(/\s+/g,' ').replace(/[×✕]/g,'x');
 const unit='(?:m|metres?|meters?)';
 const pair=new RegExp('(?:overall|plot|building|floor|plan|external)?\\s*(?:dimensions?|size)?\\s*[:=-]?\\s*(\\d+(?:\\.\\d+)?)\\s*'+unit+'?\\s*[xX]\\s*(\\d+(?:\\.\\d+)?)\\s*'+unit,'i');
 const match=t.match(pair);
 if(match)return {length:Number(match[1]),width:Number(match[2]),source:match[0]};
 const lm=t.match(/(?:overall\s+)?length\s*[:=]\s*(\d+(?:\.\d+)?)\s*(?:m|metres?|meters?)\b/i);
 const wm=t.match(/(?:overall\s+)?width\s*[:=]\s*(\d+(?:\.\d+)?)\s*(?:m|metres?|meters?)\b/i);
 return lm&&wm?{length:Number(lm[1]),width:Number(wm[1]),source:lm[0]+'; '+wm[0]}:null;
};
export default function PlanUpload({onDimensions}){
 const[file,setFile]=useState(null);
 const[preview,setPreview]=useState('');
 const[length,setLength]=useState('');
 const[width,setWidth]=useState('');
 const[message,setMessage]=useState('');
 const[busy,setBusy]=useState(false);
 const[detected,setDetected]=useState('');
 const choose=async e=>{
  const f=e.target.files?.[0];if(!f)return;
  if(!['application/pdf','image/png','image/jpeg','image/webp'].includes(f.type)){setMessage('Upload a PDF, PNG, JPG or WebP plan.');return}
  if(f.size>15*1024*1024){setMessage('Maximum file size is 15 MB.');return}
  if(preview)URL.revokeObjectURL(preview);
  setFile(f);setPreview(URL.createObjectURL(f));setMessage('');setDetected('');
  if(f.type!=='application/pdf'){setMessage('Image preview ready. Automatic image OCR is not available yet; enter overall dimensions below.');return}
  setBusy(true);
  try{
   const pdf=await pdfjs.getDocument({data:new Uint8Array(await f.arrayBuffer())}).promise;
   const texts=[];
   for(let i=1;i<=Math.min(pdf.numPages,5);i++){
    const page=await pdf.getPage(i);
    const items=(await page.getTextContent()).items;
    texts.push(items.map(x=>x.str||'').join(' '));
   }
   const match=parseOverallDimensions(texts.join(' '));
   if(match&&match.length>0&&match.width>0&&match.length<=10000&&match.width<=10000){
    setLength(String(match.length));setWidth(String(match.width));setDetected(match.source);
    setMessage('Possible overall dimensions found in PDF text. Verify them against the drawing, then apply.');
   }else setMessage('No clear overall dimensions found in selectable PDF text. Scanned PDFs need OCR; enter dimensions manually.');
  }catch{setMessage('Could not extract PDF text. You can still preview the plan and enter dimensions manually.')}
  finally{setBusy(false)}
 };
 const apply=()=>{
  const l=Number(length),w=Number(width);
  if(!Number.isFinite(l)||!Number.isFinite(w)||l<=0||w<=0){setMessage('Enter positive plan length and width in metres.');return}
  onDimensions(l,w);setMessage('Dimensions applied. Review wall height, floors, openings, beam/column volumes and material rates before exporting.');
 };
 return <section className="panel" style={{marginBottom:18}}>
  <h2>2D Floor Plan Upload (PDF Dimension Assistant)</h2>
  <p className="muted">Text-based PDFs: try detecting clearly labelled overall length and width. Verify detected values before applying. Scanned PDFs and images are preview-only. Room/wall recognition and structural quantity extraction are not supported yet.</p>
  <label>2D plan (PDF, PNG, JPG, WebP; max 15 MB)<input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={choose}/></label>
  {file&&<p className="muted">Selected: {file.name}</p>}
  {preview&&(file?.type==='application/pdf'?<iframe title="Uploaded floor plan" src={preview} style={{width:'100%',height:360,border:'1px solid #d5e0ed',borderRadius:8}}/>:<img alt="Uploaded floor plan preview" src={preview} style={{maxWidth:'100%',maxHeight:400,objectFit:'contain'}}/>)}
  {busy&&<p role="status">Reading selectable PDF text...</p>}
  {detected&&<p className="muted">Detected text: {detected}</p>}
  <div className="fields" style={{marginTop:16}}><label>Overall plan length (m)<input type="number" min="0" step="any" value={length} onChange={e=>setLength(e.target.value)}/></label><label>Overall plan width (m)<input type="number" min="0" step="any" value={width} onChange={e=>setWidth(e.target.value)}/></label></div>
  <button className="primary" onClick={apply} disabled={busy}>Use verified dimensions for estimate</button>
  {message&&<p role="status" className="muted">{message}</p>}
 </section>;
}