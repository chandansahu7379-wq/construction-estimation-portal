import React,{useEffect,useMemo,useState} from 'react';
import{createRoot}from'react-dom/client';
import {downloadEstimateReport} from './EstimateReport.js';
import{Building2,Calculator,FileDown,Info,IndianRupee,Layers3}from'lucide-react';
import './style.css';
import PlanUpload from './PlanUpload.jsx';
const initialRates={concrete:6500,steel:68,bricks:10,plaster:260,paint:32,tiles:850,excavation:350,waterproofing:450};
const fmt=n=>new Intl.NumberFormat('en-IN',{maximumFractionDigits:2}).format(n);
const money=n=>'₹'+fmt(n);
function App(){
 const[tab,setTab]=useState('estimate');
 const[storageLoaded,setStorageLoaded]=useState(false);
 const[project,setProject]=useState('College Construction Project');
 const[roomTakeoff,setRoomTakeoff]=useState([]);
 const[dim,setDim]=useState({length:10,width:8,floors:1,height:3,wallThickness:0.23,openings:15,partitionLength:0,partitionThickness:0.115,partitionOpenings:0,slabThickness:0.125,beamVolume:0,columnVolume:0,steelDensity:95,bricksPerM3:500,plasterSides:2,paintCoats:2,excavationLength:0,excavationWidth:0,excavationDepth:0,waterproofArea:0});
 const[rates,setRates]=useState(initialRates);
 const[extras,setExtras]=useState({wastage:5,contingency:5,labour:20});
 const[include,setInclude]=useState({concrete:true,steel:true,bricks:true,plaster:true,paint:true,tiles:true,excavation:true,waterproofing:true});
 const change=(k,v)=>setDim(p=>({...p,[k]:v}));
 useEffect(()=>{
  try{const saved=JSON.parse(localStorage.getItem('buildestimate-project-v1')||'null');if(saved){if(saved.project)setProject(saved.project);if(Array.isArray(saved.roomTakeoff))setRoomTakeoff(saved.roomTakeoff);if(saved.dim)setDim(p=>({...p,...saved.dim}));if(saved.rates)setRates(p=>({...p,...saved.rates}));if(saved.extras)setExtras(p=>({...p,...saved.extras}));if(saved.include)setInclude(p=>({...p,...saved.include}));}}catch{}setStorageLoaded(true);
 },[]);
 useEffect(()=>{if(!storageLoaded)return;try{localStorage.setItem('buildestimate-project-v1',JSON.stringify({project,dim,rates,extras,include,roomTakeoff}));}catch{}},[storageLoaded,project,dim,rates,extras,include,roomTakeoff]);
 const calc=useMemo(()=>{
  const d=Object.fromEntries(Object.entries(dim).map(([k,v])=>[k,Math.max(0,Number(v)||0)]));
  const area=d.length*d.width,perimeter=2*(d.length+d.width),floorCount=Math.max(1,Math.floor(d.floors));
  const grossWall=perimeter*d.height*floorCount,netWall=Math.max(0,grossWall-Math.min(perimeter*d.height,d.openings)*floorCount);
  const roomArea=roomTakeoff.reduce((s,r)=>s+r.length*r.width,0);
  const measuredPartitionLength=d.partitionLength; // Always use the partition length measured from the actual drawing; room perimeters cannot reliably determine wall layout.
  const measuredPartitionOpenings=roomTakeoff.length?roomTakeoff.reduce((s,r)=>s+r.openings,0):d.partitionOpenings;
  const grossPartitions=measuredPartitionLength*d.height*floorCount;
  const netPartitions=Math.max(0,grossPartitions-Math.min(grossPartitions,measuredPartitionOpenings*floorCount));
  const wallVol=netWall*d.wallThickness+netPartitions*d.partitionThickness,slabVol=area*d.slabThickness*floorCount;
  const concrete=slabVol+d.beamVolume+d.columnVolume; // measured beam/column volumes entered separately, total for entire project
  const steel=concrete*d.steelDensity; // editable conceptual kg per m3; not a bar bending schedule
  const bricks=wallVol*d.bricksPerM3;
  const plaster=netWall*d.plasterSides+netPartitions*2;
  const paint=plaster*d.paintCoats;
  const tiles=(roomTakeoff.length?roomArea:area)*floorCount;
  const excavation=d.excavationLength*d.excavationWidth*d.excavationDepth;
  const waterproofing=d.waterproofArea;
  const rows=[
   {key:'concrete',name:'RCC Concrete (slabs + entered beams/columns)',quantity:concrete,unit:'m³',rate:Math.max(0,Number(rates.concrete)||0)},
   {key:'steel',name:'Reinforcement Steel (editable kg/m³ assumption)',quantity:steel,unit:'kg',rate:Math.max(0,Number(rates.steel)||0)},
   {key:'bricks',name:'Brickwork (editable bricks/m³ assumption)',quantity:bricks,unit:'nos',rate:Math.max(0,Number(rates.bricks)||0)},
   {key:'plaster',name:'Wall Plaster',quantity:plaster,unit:'m²',rate:Math.max(0,Number(rates.plaster)||0)},
   {key:'paint',name:'Paint (area × coats)',quantity:paint,unit:'coat-m²',rate:Math.max(0,Number(rates.paint)||0)},
   {key:'tiles',name:'Floor Tiles',quantity:tiles,unit:'m²',rate:Math.max(0,Number(rates.tiles)||0)},
   {key:'excavation',name:'Excavation (entered dimensions)',quantity:excavation,unit:'m³',rate:Math.max(0,Number(rates.excavation)||0)},
   {key:'waterproofing',name:'Waterproofing (entered treated area)',quantity:waterproofing,unit:'m²',rate:Math.max(0,Number(rates.waterproofing)||0)}
  ].filter(r=>include[r.key]).map(r=>({...r,amount:r.quantity*(Number(r.rate)||0)}));
  const base=rows.reduce((a,r)=>a+r.amount,0);
  const pct=k=>Math.min(100,Math.max(0,Number(extras[k])||0))/100;
  const wastage=base*pct('wastage');
  const labour=base*pct('labour');
  const contingency=(base+wastage+labour)*pct('contingency');
  return{rows,area,roomArea,measuredPartitionLength,netWall,netPartitions,wallVol,slabVol,base,wastage,labour,contingency,total:base+wastage+labour+contingency};
 },[dim,rates,extras,include,roomTakeoff]);
 const download=()=>downloadEstimateReport({project,dim,rates,extras,calc,roomTakeoff});
 return <div className="app"><aside><div className="brand"><Building2/> <span>Build<span className="accent">Estimate</span></span></div><p className="small">SMART CONSTRUCTION PORTAL</p><button className={tab==='estimate'?'nav active':'nav'} onClick={()=>setTab('estimate')}><Calculator size={18}/> Estimator</button><button className={tab==='rates'?'nav active':'nav'} onClick={()=>setTab('rates')}><IndianRupee size={18}/> Market Rates</button><button className={tab==='about'?'nav active':'nav'} onClick={()=>setTab('about')}><Info size={18}/> About & Assumptions</button><div className="sidefoot"><strong>Chandan Sahu</strong><br/>TY CIVIL ENGINEERING<br/>College Project • Estimation Tool</div></aside>
 <main><header><div><span className="eyebrow">TY CIVIL ENGINEERING</span><h1>Construction Material & Cost Estimator</h1><p>Quick quantity take-off and preliminary budget in Indian Rupees.</p></div><div className="student-id"><strong>Chandan Sahu</strong><span>TY CIVIL ENGINEERING</span></div><button className="primary" onClick={download}><FileDown size={18}/> Download PDF</button></header>
 {tab==='estimate'?<><PlanUpload onDimensions={(length,width)=>setDim(p=>({...p,length,width}))} onTakeoff={({rooms})=>setRoomTakeoff(rooms)}/><div className="metrics"><div className="metric"><span>Floor area (per floor)</span><strong>{fmt(calc.area)} m²</strong></div><div className="metric"><span>Room area (from plan schedule)</span><strong>{fmt(calc.roomArea||calc.area)} m²</strong></div><div className="metric"><span>Material subtotal</span><strong>{money(calc.base)}</strong></div><div className="metric highlighted"><span>Estimated project total</span><strong>{money(calc.total)}</strong></div></div><div className="columns"><section className="panel"><h2><Layers3 size={20}/> Project Dimensions</h2><label>Project name<input value={project} onChange={e=>setProject(e.target.value)}/></label><div className="fields">{[['length','Length (m)'],['width','Width (m)'],['floors','Number of floors'],['height','Wall height per floor (m)'],['wallThickness','Wall thickness (m)'],['openings','External wall openings per floor (m²)'],['partitionLength','Internal partition total length per floor (m)'],['partitionThickness','Internal partition thickness (m)'],['partitionOpenings','Internal partition openings per floor (m²)'],['slabThickness','Slab thickness (m)'],['beamVolume','Total beam concrete volume (m³, all floors)'],['columnVolume','Total column concrete volume (m³, all floors)'],['steelDensity','Steel assumption (kg per m³ RCC)'],['bricksPerM3','Bricks per m³ brickwork'],['plasterSides','Plastered wall faces'],['paintCoats','Paint coats'],['excavationLength','Excavation length (m)'],['excavationWidth','Excavation width (m)'],['excavationDepth','Excavation depth (m)'],['waterproofArea','Waterproofing treated area (m²)']].map(([key,label])=><label key={key}>{label}<input type="number" min="0" step="any" value={dim[key]} onChange={e=>change(key,e.target.value)}/></label>)}</div><h3>Extra cost allowances (%)</h3><div className="fields">{[['wastage','Material wastage'],['labour','Labour'],['contingency','Contingency']].map(([key,label])=><label key={key}>{label}<input type="number" min="0" value={extras[key]} onChange={e=>setExtras(p=>({...p,[key]:e.target.value}))}/></label>)}</div></section><section className="panel"><h2>Choose Materials</h2><p className="muted">Select the items to include in the report.</p><div className="checks">{Object.keys(include).map(k=><label key={k}><input type="checkbox" checked={include[k]} onChange={e=>setInclude(p=>({...p,[k]:e.target.checked}))}/>{k.charAt(0).toUpperCase()+k.slice(1)}</label>)}</div><div className="notice"><strong>About 2D drawings</strong><p>Upload a PDF or image plan, enter overall dimensions and add each room in the room-wise take-off table. OCR can suggest printed dimensions and room labels, but every value must be checked. Room areas are used for floor tiles only. Measure internal partition length from the actual plan and enter it manually; OCR does not recognize wall paths, doors or windows.</p></div><div className="notice"><strong>Accuracy note</strong><p>Slab concrete is calculated from floor dimensions. Enter total beam and column concrete volumes separately for the entire project (avoid double-counting overlapping concrete). Steel density and brick count are editable assumptions, not a bar bending schedule or detailed BOQ. Excavation and waterproofing require manually entered dimensions. Room dimensions calculate floor area only. Internal partition length must be measured from the drawing and entered manually; it is not inferred from room perimeters.</p></div></section></div><section className="panel tablepanel"><h2>Material-wise Quantity & Cost Report</h2><div className="tablewrap"><table><thead><tr><th>Material</th><th>Quantity</th><th>Unit</th><th>Rate (₹)</th><th>Amount (₹)</th></tr></thead><tbody>{calc.rows.map(r=><tr key={r.key}><td>{r.name}</td><td>{fmt(r.quantity)}</td><td>{r.unit}</td><td>{fmt(r.rate)}</td><td>{fmt(r.amount)}</td></tr>)}</tbody></table></div><div className="totals"><div>Materials <b>{money(calc.base)}</b></div><div>Wastage <b>{money(calc.wastage)}</b></div><div>Labour <b>{money(calc.labour)}</b></div><div>Contingency <b>{money(calc.contingency)}</b></div><div className="grand">Grand Total <b>{money(calc.total)}</b></div></div></section></>:tab==='rates'?<section className="panel"><h2>Editable Material Rates</h2><p className="muted">Sample rates only, NOT verified live market prices. Update according to your local supplier quotation. Rates must match the listed units.</p><div className="fields">{Object.entries(rates).map(([key,val])=><label key={key}>{key.charAt(0).toUpperCase()+key.slice(1)} (₹ per {({concrete:'m³',steel:'kg',bricks:'brick',plaster:'m²',paint:'coat-m²',tiles:'m²',excavation:'m³',waterproofing:'m²'})[key]})<input type="number" min="0" value={val} onChange={e=>setRates(p=>({...p,[key]:e.target.value}))}/></label>)}</div><button className="primary" onClick={()=>setTab('estimate')}>Back to estimate</button></section>:<section className="panel"><h2>Methodology & Scope</h2><p>This tool computes preliminary floor area, external wall area, manually measured internal wall quantities, slab concrete, and editable cost allowances. It is not a complete construction BOQ.</p><p>Assumptions: RCC is slab volume plus user-entered beam and column volumes. Steel kg/m³ and bricks/m³ are user-editable approximate factors, not structural design or a detailed brick schedule. Foundations, columns, beams in detail, staircase, roof treatments, electrical, plumbing, doors, windows, transportation, taxes and professional fees are not calculated.</p><p>For real construction use, consult a licensed engineer or quantity surveyor and prepare item-wise BOQ from detailed drawings and specifications.</p></section>}
 <footer>Project by Chandan Sahu · TY Civil Engineering<br/>BuildEstimate • Educational prototype • Values are indicative, not professional quotations</footer></main></div>
}
createRoot(document.getElementById('root')).render(<App/>);
