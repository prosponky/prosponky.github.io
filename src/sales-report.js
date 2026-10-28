import {displaySalesPhone} from './sales-phone.js';
import {jsPDF} from 'jspdf';
import {salesByCondition} from './sales-recap.js';
import {totalBonuses} from './sales-bonuses.js';
const clean=v=>String(v??'').replace(/[^\x20-\x7E\n]/g,' ').trim();
const cash=v=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:0,maximumFractionDigits:2}).format(Number(v)||0);
export function createSalesReport({period,name='',sales=[],bonuses=[],orientation='portrait',phoneReference=false}){
 const doc=new jsPDF({orientation:orientation==='landscape'?'landscape':'portrait',unit:'pt',format:'letter'});const w=doc.internal.pageSize.getWidth(),h=doc.internal.pageSize.getHeight(),margin=30,width=w-margin*2;let y=34;
 doc.setProperties({title:'Monthly washout - '+period,author:clean(name),creator:'Pocket Desking'});
 const types=salesByCondition(sales),units=types.new+types.used+types.unspecified;
 const header=()=>{doc.setFont('helvetica','bold');doc.setFontSize(15);doc.setTextColor(20,35,40);doc.text('MONTHLY WASHOUT',margin,34);doc.setFont('helvetica','normal');doc.setFontSize(10);doc.text(doc.splitTextToSize(clean(name||'Salesperson')+'  |  '+reportMonth(period),width-210).slice(0,2),margin,50);doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text('New: '+unitText(types.new),w-margin,25,{align:'right'});doc.text('Used: '+unitText(types.used),w-margin,37,{align:'right'});doc.text('Total units: '+unitText(units),w-margin,49,{align:'right'});if(types.unspecified)doc.text('Unspecified: '+types.unspecified,w-margin,61,{align:'right'});y=78;};header();
 const room=height=>{if(y+height>h-36){doc.addPage();header();return true;}return false;};
 function table(title,labels,weights,rows,summary=null){const fixed=new Set(['Date','Phone #','Deal #','Stock #','Type','Units','Front','Back','Earned','Amount']);doc.setFont('helvetica','normal');doc.setFontSize(8);const widths=labels.map((label,i)=>fixed.has(label)?Math.min(label==='Type'?32:label==='Units'?30:85,Math.max(doc.getTextWidth(label),...rows.map(r=>doc.getTextWidth(clean(r[i]))),...(summary?[doc.getTextWidth(clean(summary[i]))]:[]))+10):0);const flexible=labels.map((label,i)=>fixed.has(label)?0:weights[i]);const available=width-widths.reduce((a,b)=>a+b,0),flexTotal=flexible.reduce((a,b)=>a+b,0);for(let i=0;i<widths.length;i++)if(!fixed.has(labels[i]))widths[i]=available*flexible[i]/flexTotal;const heading=()=>{doc.setFont('helvetica','bold');doc.setFontSize(11);doc.text(title,margin,y+12);y+=18;doc.setFillColor(225,233,235);doc.rect(margin,y,width,20,'F');doc.setFontSize(8);let x=margin;labels.forEach((v,i)=>{doc.text(v,x+5,y+13);x+=widths[i];});y+=20;};room(65);heading();doc.setFontSize(8);
 for(const row of rows.length?rows:[labels.map((_,i)=>i===0?'No entries':'')]){doc.setFont('helvetica','normal');let cells=row.map((v,i)=>fixed.has(labels[i])?[clean(v)]:doc.splitTextToSize(clean(v),widths[i]-10));let lines=Math.max(...cells.map(c=>c.length));const maxLines=Math.max(1,Math.floor((h-36-111)/10));for(let start=0;start<lines;){const count=Math.min(lines-start,maxLines);const height=count*10+8;if(room(height))heading();doc.setFont('helvetica','normal');doc.setFontSize(8);let x=margin;cells.forEach((c,i)=>{doc.setDrawColor(190,202,206);doc.rect(x,y,widths[i],height);const content=c.slice(start,start+count);doc.setFontSize(fixed.has(labels[i])?Math.min(8,8*(widths[i]-10)/Math.max(1,doc.getTextWidth(clean(content[0]||'')))):8);doc.text(content,x+5,y+11);doc.setFontSize(8);x+=widths[i];});y+=height;start+=count;}}if(summary){const cells=summary.map((v,i)=>fixed.has(labels[i])?[clean(v)]:doc.splitTextToSize(clean(v),widths[i]-10));const height=Math.max(...cells.map(c=>c.length))*10+10;if(room(height))heading();doc.setFont('helvetica','bold');doc.setFontSize(8);let x=margin;cells.forEach((c,i)=>{doc.setFillColor(237,242,243);doc.setDrawColor(190,202,206);doc.rect(x,y,widths[i],height,'FD');doc.text(c,x+5,y+12);x+=widths[i];});y+=height;}y+=12;}
 const {columns,rows}=salesReportTable(sales,{phoneReference,orientation});
 const earnedTotal=sales.reduce((n,r)=>n+(phoneReference&&r.front===0?(r.isSplit?100:200):(Number(r.back)||0)),0);const splitCount=sales.filter(r=>r.isSplit).length;
 table('Sales',columns.map(c=>c.label),columns.map(c=>c.width),rows,columns.map((c,i)=>c.label==='Units'?unitText(units):c.label==='Date'?'Totals':c.label==='Split with'?'Splits: '+splitCount:['Earned','Back'].includes(c.label)?cash(earnedTotal):''));
 const bonusTotal=totalBonuses(bonuses);
 table('Bonuses',['Date','Bonus type','Notes','Amount'],[70,90,orientation==='landscape'?440:240,95],bonuses.map(r=>[r.bonusDate?reportDate(r.bonusDate):'Monthly',r.bonusType||'',r.notes||'',cash(r.amount)]),['Totals','','',cash(bonusTotal)]);
 room(40);doc.setFillColor(225,233,235);doc.setDrawColor(190,202,206);doc.rect(margin,y,width,30,'FD');doc.setFont('helvetica','bold');doc.setFontSize(11);doc.text('Sales + bonuses',margin+8,y+20);doc.text(cash(earnedTotal+bonusTotal),w-margin-8,y+20,{align:'right'});y+=42;
 if(y+40>h-115){doc.addPage();header();}doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text('I confirm that the sales and bonuses listed in this report are correct.',margin,h-101);doc.setDrawColor(70);doc.line(margin,h-65,w-margin-155,h-65);doc.line(w-margin-125,h-65,w-margin,h-65);doc.text('Salesperson signature',margin,h-51);doc.text('Date',w-margin-125,h-51);
 const pages=doc.getNumberOfPages();for(let i=1;i<=pages;i++){doc.setPage(i);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(90);doc.text('Page '+i+' of '+pages,w/2,h-18,{align:'center'});}return doc;
}

export function salesReportTable(sales,{phoneReference=false,orientation='portrait'}={}){
 const earned=r=>phoneReference&&r.front===0?(r.isSplit?100:200):r.back;
 const hasText=field=>sales.some(r=>String(r[field]??'').trim());
 const columns=[
 {label:'Units',width:28,value:r=>r.isSplit?'.5':'1'},
 {label:'Date',width:75,value:r=>reportDate(r.soldDate)},
 ...(hasText('dealNumber')?[{label:phoneReference?'Phone #':'Deal #',width:phoneReference?75:55,value:r=>phoneReference?displaySalesPhone(r.dealNumber):r.dealNumber||''}]:[]),
 ...(hasText('condition')?[{label:'Type',width:38,value:r=>r.condition||''}]:[]),
 ...(hasText('stockNumber')?[{label:'Stock #',width:65,value:r=>r.stockNumber||''}]:[]),
 ...(hasText('vehicle')?[{label:'Vehicle',width:orientation==='landscape'?150:100,value:r=>r.vehicle||''}]:[]),
 ...(hasText('lastName')?[{label:'Customer',width:80,value:r=>r.lastName||''}]:[]),
 {label:'Split with',width:80,value:r=>r.isSplit?(r.splitWith||'Not entered'):''},
 ...(sales.some(r=>Number.isFinite(r.front)&&r.front!==0)?[{label:'Front',width:53,value:r=>r.front?cash(r.front):''}]:[]),
 ...(!phoneReference&&sales.some(r=>Number.isFinite(earned(r))&&earned(r)!==0)?[{label:'Back',width:53,value:r=>earned(r)?cash(earned(r)):''}]:[])
 ];return {columns,rows:sales.map(r=>columns.map(c=>c.value(r)))};
}

export function reportDate(value){const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));if(!match)return clean(value);return ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][Number(match[2])-1]+' '+Number(match[3])+', '+match[1];}

export function unitText(value){return String(value).replace(/^0\./,'.');}

export function reportMonth(period){const match=/^(\d{4})-(0[1-9]|1[0-2])$/.exec(String(period));return match?['January','February','March','April','May','June','July','August','September','October','November','December'][Number(match[2])-1]+' '+match[1]:clean(period);}
