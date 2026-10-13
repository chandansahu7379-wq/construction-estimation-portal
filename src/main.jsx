import React,{useMemo,useState} from 'react';
import{createRoot}from'react-dom/client';
import{jsPDF}from'jspdf';
import{Building2,Calculator,FileDown,Info,IndianRupee,Layers3}from'lucide-react';
import './style.css';
const initialRates={concrete:6500,steel:68,bricks:10,plaster:260,paint:32,tiles:850};
const fmt=n=>new Intl.NumberFormat('en-IN',{maximumFractionDigits:2}).format(n);
const money=n=>'₹'+fmt(n);
function App(){
 const[tab,setTab]=useState('estimate');
 const[project,setProject]=useState('College Construction Project');
 const[dim,setDim]=useState({length:10,width:8,floors:1,height:3,wallThickness:0.23,openings:15,slabThickness:0.125,plasterSides:2,paintCoats:2});
 const[rates,setRates]=useState(initialRates);
 const[extras,setExtras]=useState({wastage:5,contingency:5,labour:20});
 const[include,setInclude]=useState({concrete:true,steel:true,bricks:true,plaster:true,paint:true,tiles:true});
 const change=(k,v)=>setDim(p=>({...p,[k]:v}));
 const calc=useMemo(()=>{
  const d=Object.fromEntries(Object.entries(dim).map(([k,v])=>[k,Math.max(0,Number(v)||0)]));
  const area=d.length*d.width,perimeter=2*(d.length+d.width),floorCount=Math.max(1,d.floors);
  const grossWall=perimeter*d.height*floorCount,netWall=Math.max(0,grossWall-d.openings*floorCount);
  const wallVol=netWall*d.wallThickness,slabVol=area*d.slabThickness*floorCount;
  const concrete=slabVol*1.12; // allowance for beams; conceptual only
  const steel=concrete*95;
  const bricks=wallVol*500;
  const plaster=netWall*d.plasterSides;
  const paint=plaster*d.paintCoats;
  const tiles=area*floorCount;
  const rows=[
   {key:'concrete',name:'RCC Concrete (indicative slab + 12%)',quantity:concrete,unit:'m³',rate:rates.concrete},
   {key:'steel',name:'Reinforcement Steel (assumed 95 kg/m³)',quantity:steel,unit:'kg',rate:rates.steel},
   {key:'bricks',name:'Brickwork (assumed 500 bricks/m³)',quantity:bricks,unit:'nos',rate:rates.bricks},
   {key:'plaster',name:'Wall Plaster',quantity:plaster,unit:'m²',rate:rates.plaster},
   {key:'paint',name:'Paint (area × coats)',quantity:paint,unit:'coat-m²',rate:rates.paint},
   {key:'tiles',name:'Floor Tiles',quantity:tiles,unit:'m²',rate:rates.tiles}
  ].filter(r=>include[r.key]).map(r=>({...r,amount:r.quantity*(Number(r.rate)||0)}));
  const base=rows.reduce((a,r)=>a+r.amount,0);
  const wastage=base*(Number(extras.wastage)||0)/100;
  const labour=base*(Number(extras.labour)||0)/100;
  const contingency=(base+wastage+labour)*(Number(extras.contingency)||0)/100;
  return{rows,area,netWall,slabVol,base,wastage,labour,contingency,total:base+wastage+labour+contingency};
 },[dim,rates,extras,include]);
 const download=()=>{
  const pdf=new jsPDF();let y=18;
  const line=(s)=>{if(y>275){pdf.addPage();y=18;}pdf.text(String(s),15,y);y+=8};
  pdf.setFontSize(17);line('CONSTRUCTION ESTIMATION REPORT');pdf.setFontSize(10);
  line('Project: '+project);line('Date: '+new Date().toLocaleDateString('en-IN'));
  line(`Dimensions: ${dim.length}m x ${dim.width}m | Floors: ${dim.floors} | Height: ${dim.height}m`);
  line('Built-up area (indicative): '+fmt(calc.area*Math.max(1,Number(dim.floors)||1))+' sq.m');
  y+=4;pdf.setFont('helvetica','bold');line('MATERIAL QUANTITY AND COST');pdf.setFont('helvetica','normal');
  calc.rows.forEach(r=>line(`${r.name.slice(0,34)}: ${fmt(r.quantity)} ${r.unit} x Rs.${fmt(r.rate)} = Rs.${fmt(r.amount)}`));
  y+=3;line('Material subtotal: Rs.'+fmt(calc.base));line('Wastage: Rs.'+fmt(calc.wastage));line('Labour: Rs.'+fmt(calc.labour));line('Contingency: Rs.'+fmt(calc.contingency));
  pdf.setFont('helvetica','bold');line('ESTIMATED TOTAL: Rs.'+fmt(calc.total));pdf.setFont('helvetica','normal');
  y+=4;['IMPORTANT: Preliminary conceptual estimate only.','Structural steel and RCC quantities are assumptions, not structural design.','Foundation, columns, MEP, doors, windows, transport, GST and approvals excluded.','Verify local rates, drawings and quantities with a qualified engineer.'].forEach(line);
  pdf.save('construction-estimate.pdf');
 };
 return <div className="app"><aside><div className="brand"><Building2/> <span>Build<span className="accent">Estimate</span></span></div><p className="small">SMART CONSTRUCTION PORTAL</p><button className={tab==='estimate'?'nav active':'nav'} onClick={()=>setTab('estimate')}><Calculator size={18}/> Estimator</button><button className={tab==='rates'?'nav active':'nav'} onClick={()=>setTab('rates')}><IndianRupee size={18}/> Market Rates</button><button className={tab==='about'?'nav active':'nav'} onClick={()=>setTab('about')}><Info size={18}/> About & Assumptions</button><div className="sidefoot">Civil Engineering • College Project<br/>Conceptual estimation tool</div></aside>
 <main><header><div><span className="eyebrow">ESTIMATION DASHBOARD</span><h1>Construction Material & Cost Estimator</h1><p>Quick quantity take-off and preliminary budget in Indian Rupees.</p></div><button className="primary" onClick={download}><FileDown size={18}/> Download PDF</button></header>
 {tab==='estimate'?<><div className="metrics"><div className="metric"><span>Floor area (per floor)</span><strong>{fmt(calc.area)} m²</strong></div><div className="metric"><span>Material subtotal</span><strong>{money(calc.base)}</strong></div><div className="metric highlighted"><span>Estimated project total</span><strong>{money(calc.total)}</strong></div></div><div className="columns"><section className="panel"><h2><Layers3 size={20}/> Project Dimensions</h2><label>Project name<input value={project} onChange={e=>setProject(e.target.value)}/></label><div className="fields">{[['length','Length (m)'],['width','Width (m)'],['floors','Number of floors'],['height','Wall height per floor (m)'],['wallThickness','Wall thickness (m)'],['openings','Opening area per floor (m²)'],['slabThickness','Slab thickness (m)'],['plasterSides','Plastered wall faces'],['paintCoats','Paint coats']].map(([key,label])=><label key={key}>{label}<input type="number" min="0" step="any" value={dim[key]} onChange={e=>change(key,e.target.value)}/></label>)}</div><h3>Extra cost allowances (%)</h3><div className="fields">{[['wastage','Material wastage'],['labour','Labour'],['contingency','Contingency']].map(([key,label])=><label key={key}>{label}<input type="number" min="0" value={extras[key]} onChange={e=>setExtras(p=>({...p,[key]:e.target.value}))}/></label>)}</div></section><section className="panel"><h2>Choose Materials</h2><p className="muted">Select the items to include in the report.</p><div className="checks">{Object.keys(include).map(k=><label key={k}><input type="checkbox" checked={include[k]} onChange={e=>setInclude(p=>({...p,[k]:e.target.checked}))}/>{k.charAt(0).toUpperCase()+k.slice(1)}</label>)}</div><div className="notice"><strong>About 2D drawings</strong><p>Automatic measurement from uploaded CAD/PDF drawings is not included in this version. Enter dimensions from your 2D plan for an estimate.</p></div><div className="notice"><strong>Accuracy note</strong><p>RCC volume and steel are illustrative assumptions. This is not a BOQ, structural design, or contractor quotation.</p></div></section></div><section className="panel tablepanel"><h2>Material-wise Quantity & Cost Report</h2><div className="tablewrap"><table><thead><tr><th>Material</th><th>Quantity</th><th>Unit</th><th>Rate (₹)</th><th>Amount (₹)</th></tr></thead><tbody>{calc.rows.map(r=><tr key={r.key}><td>{r.name}</td><td>{fmt(r.quantity)}</td><td>{r.unit}</td><td>{fmt(r.rate)}</td><td>{fmt(r.amount)}</td></tr>)}</tbody></table></div><div className="totals"><div>Materials <b>{money(calc.base)}</b></div><div>Wastage <b>{money(calc.wastage)}</b></div><div>Labour <b>{money(calc.labour)}</b></div><div>Contingency <b>{money(calc.contingency)}</b></div><div className="grand">Grand Total <b>{money(calc.total)}</b></div></div></section></>:tab==='rates'?<section className="panel"><h2>Editable Material Rates</h2><p className="muted">Sample rates only, NOT verified live market prices. Update according to your local supplier quotation. Rates must match the listed units.</p><div className="fields">{Object.entries(rates).map(([key,val])=><label key={key}>{key.charAt(0).toUpperCase()+key.slice(1)} (₹ per {({concrete:'m³',steel:'kg',bricks:'brick',plaster:'m²',paint:'coat-m²',tiles:'m²'})[key]})<input type="number" min="0" value={val} onChange={e=>setRates(p=>({...p,[key]:e.target.value}))}/></label>)}</div><button className="primary" onClick={()=>setTab('estimate')}>Back to estimate</button></section>:<section className="panel"><h2>Methodology & Scope</h2><p>This tool computes floor area, external perimeter, gross external wall area less assumed openings, and approximate slab and wall quantities. It applies editable rates and allowances.</p><p>Assumptions: RCC volume is slab volume plus 12%; steel is 95 kg/m³ of RCC; brickwork is 500 bricks/m³ of wall. Internal partitions, foundations, columns, beams in detail, staircase, roof treatments, electrical, plumbing, doors, windows, transportation, taxes and professional fees are not calculated.</p><p>For real construction use, consult a licensed engineer or quantity surveyor and prepare item-wise BOQ from detailed drawings and specifications.</p></section>}
 <footer>BuildEstimate • Educational prototype • Values are indicative, not professional quotations</footer></main></div>
}
createRoot(document.getElementById('root')).render(<App/>);
