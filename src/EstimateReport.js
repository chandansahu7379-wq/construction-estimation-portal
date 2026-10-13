import {jsPDF} from 'jspdf';
const number=n=>new Intl.NumberFormat('en-IN',{maximumFractionDigits:2}).format(Number(n)||0);
const rupees=n=>'Rs. '+number(n);
export function downloadEstimateReport({project,dim,rates,extras,calc}){
 const pdf=new jsPDF({unit:'mm',format:'a4'}), W=210, margin=15, right=195;
 const navy=[22,42,69],blue=[31,101,172],gray=[90,104,120],light=[239,245,251];
 let y=0,page=0;
 const txt=(s,x,yy,size=10,bold=false,color=navy,options={})=>{
  pdf.setFont('helvetica',bold?'bold':'normal');pdf.setFontSize(size);pdf.setTextColor(...color);
  pdf.text(String(s),x,yy,options);
 };
 const start=()=>{
  if(page)pdf.addPage();page++;
  pdf.setFillColor(...navy);pdf.rect(0,0,W,24,'F');
  txt('BUILD ESTIMATE',margin,11,15,true,[255,255,255]);
  txt('Created by Chandan Sahu',right,11,8,true,[255,255,255],{align:'right'});
  txt('CONSTRUCTION ESTIMATION & COSTING',margin,18,8,false,[211,226,244]);
  pdf.setDrawColor(220,228,238);pdf.line(margin,281,right,281);
  txt('Prepared by Chandan Sahu  |  Preliminary educational estimate',margin,287,8,false,gray);
  txt('Page '+page,right,287,8,false,gray,{align:'right'});
  y=34;
 };
 const ensure=h=>{if(y+h>274)start()};
 const heading=s=>{ensure(14);pdf.setFillColor(...light);pdf.roundedRect(margin,y-5,180,11,2,2,'F');txt(s,margin+4,y+2,11,true);y+=16};
 const wrap=(s,x,width,size=9,color=gray)=>{
  const lines=pdf.splitTextToSize(String(s),width);
  lines.forEach(line=>{ensure(5);txt(line,x,y,size,false,color);y+=5});
 };
 const pair=(label,value)=>{
  ensure(8);txt(label,margin,y,9,false,gray);txt(value,right,y,9,true,navy,{align:'right'});y+=8;
 };
 start();
 txt('PROJECT ESTIMATE',margin,y+2,19,true);y+=13;
 wrap('Item-wise material quantities, indicative rates and preliminary construction budget.',margin,178,9);y+=5;
 heading('01  PROJECT INFORMATION');
 pair('Project',String(project||'Untitled project').slice(0,65));
 pair('Prepared by','Chandan Sahu');
 pair('Discipline','Civil Engineering');
 pair('Report date',new Date().toLocaleDateString('en-IN'));
 pair('Plan length x width',number(dim.length)+' m x '+number(dim.width)+' m');
 pair('Number of floors',String(dim.floors));
 pair('Wall height per floor',number(dim.height)+' m');
 pair('Total indicative floor area',number(calc.area*Math.max(1,Math.floor(Math.max(0,Number(dim.floors)||0))))+' sq.m');
 heading('02  QUANTITY TAKE-OFF / BOQ');
 const widths=[12,75,28,20,24,21],xs=[15,27,102,130,150,174];
 const tableHead=()=>{
  ensure(12);pdf.setFillColor(...blue);pdf.rect(margin,y-6,180,11,'F');
  ['No.','Description','Qty','Unit','Rate (Rs.)','Amount (Rs.)'].forEach((s,i)=>txt(s,i===5?right-2:xs[i]+2,y+1,7.5,true,[255,255,255],i===5?{align:'right'}:{}));y+=10;
 };
 tableHead();
 calc.rows.forEach((r,i)=>{
  const nameLines=pdf.splitTextToSize(r.name,70),h=Math.max(12,nameLines.length*4+5);
  if(y+h>272){start();heading('02  QUANTITY TAKE-OFF / BOQ (continued)');tableHead()}
  if(i%2===0){pdf.setFillColor(246,249,252);pdf.rect(margin,y-5,180,h,'F')}
  txt(i+1,xs[0]+2,y+1,8);
  nameLines.forEach((line,j)=>txt(line,xs[1]+2,y+1+j*4,7.8));
  txt(number(r.quantity),xs[2]+26,y+1,8,false,navy,{align:'right'});
  txt(r.unit,xs[3]+2,y+1,7.5);
  txt(number(r.rate),xs[4]+22,y+1,8,false,navy,{align:'right'});
  txt(number(r.amount),right-2,y+1,8,true,navy,{align:'right'});
  y+=h;
 });
 y+=5;heading('03  COST SUMMARY');
 pair('Material subtotal',rupees(calc.base));
 pair('Wastage allowance ('+number(extras.wastage)+'%)',rupees(calc.wastage));
 pair('Labour allowance ('+number(extras.labour)+'%)',rupees(calc.labour));
 pair('Contingency allowance ('+number(extras.contingency)+'%)',rupees(calc.contingency));
 ensure(17);pdf.setFillColor(...navy);pdf.roundedRect(margin,y-5,180,16,2,2,'F');
 txt('ESTIMATED PROJECT TOTAL',margin+5,y+5,11,true,[255,255,255]);
 txt(rupees(calc.total),right-5,y+5,12,true,[255,255,255],{align:'right'});y+=24;
 heading('04  QUANTITY BASIS & ASSUMPTIONS');
 const notes=[
  'Slab RCC volume = plan area x slab thickness x floor count. Entered beam and column volumes are added separately for all floors; avoid overlap/double-counting.',
  'Steel is an assumed kg per cubic metre of RCC, not a reinforcement design or bar bending schedule.',
  'Brickwork uses net external wall area x wall thickness x editable bricks-per-cubic-metre factor. Internal partitions are not measured.',
  'Plaster is net external wall area x selected faces. Paint quantity is plaster area x number of coats.',
  'Excavation is entered length x width x depth. Waterproofing uses the entered treated area.',
  'Rates are editable sample values, not live supplier quotations. All quantities and costs are indicative.'
 ];
 notes.forEach((n,i)=>{ensure(9);txt(String(i+1)+'.',margin,y,8,true,blue);wrap(n,margin+8,172,8);y+=2});
 heading('05  IMPORTANT EXCLUSIONS');
 wrap('Detailed foundations and footing design, internal walls, staircases, electrical and plumbing work, doors, windows, transport, GST, approvals and professional fees are not comprehensively included. User-entered beam and column volumes are only approximate quantities.',margin,178,8);
 y+=5;wrap('Verify all dimensions, specifications, structural drawings, site conditions, quantities and local supplier rates with a qualified engineer or quantity surveyor before construction.',margin,178,8);
 const safe=(String(project||'project').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,45)||'project');
 pdf.save(safe+'-estimation-report.pdf');
}
