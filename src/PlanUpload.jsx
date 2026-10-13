import React,{useState} from 'react';
export default function PlanUpload({onDimensions}){
 const [file,setFile]=useState(null);
 const [preview,setPreview]=useState('');
 const [length,setLength]=useState('');
 const [width,setWidth]=useState('');
 const [message,setMessage]=useState('');
 const choose=e=>{
  const f=e.target.files?.[0];if(!f)return;
  if(!['application/pdf','image/png','image/jpeg','image/webp'].includes(f.type)){setMessage('Upload a PDF, PNG, JPG or WebP plan.');return}
  if(f.size>15*1024*1024){setMessage('Maximum file size is 15 MB.');return}
  if(preview)URL.revokeObjectURL(preview);
  setFile(f);setPreview(URL.createObjectURL(f));setMessage('');
 };
 const apply=()=>{
  const l=Number(length),w=Number(width);
  if(!Number.isFinite(l)||!Number.isFinite(w)||l<=0||w<=0){setMessage('Enter positive plan length and width in metres.');return}
  onDimensions(l,w);setMessage('Plan dimensions applied. Review wall height, floors, openings and structural quantities before exporting.');
 };
 return <section className="panel" style={{marginBottom:18}}>
  <h2>2D Floor Plan Upload (Assisted Estimation)</h2>
  <p className="muted">Upload a dimensioned floor plan to view it while entering its overall dimensions. This version does not automatically read PDF/image dimensions or identify rooms, walls, beams and columns.</p>
  <label>2D plan (PDF, PNG, JPG, WebP; max 15 MB)<input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={choose}/></label>
  {file&&<p className="muted">Selected: {file.name}</p>}
  {preview&&(file?.type==='application/pdf'?<iframe title="Uploaded floor plan" src={preview} style={{width:'100%',height:360,border:'1px solid #d5e0ed',borderRadius:8}}/>:<img alt="Uploaded floor plan preview" src={preview} style={{maxWidth:'100%',maxHeight:400,objectFit:'contain'}}/>)}
  <div className="fields" style={{marginTop:16}}><label>Overall plan length (m)<input type="number" min="0" step="any" value={length} onChange={e=>setLength(e.target.value)}/></label><label>Overall plan width (m)<input type="number" min="0" step="any" value={width} onChange={e=>setWidth(e.target.value)}/></label></div>
  <button className="primary" onClick={apply}>Use dimensions for estimate</button>
  {message&&<p role="status" className="muted">{message}</p>}
 </section>;
}