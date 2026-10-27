export function monthlyBonuses(records,period){return records.filter(r=>r.kind==='bonus'&&!r.deletedAt&&(r.bonusDate?r.bonusDate.slice(0,7):r.period)===period).sort((a,b)=>(a.bonusDate||'').localeCompare(b.bonusDate||''));}
export function totalBonuses(records){return records.reduce((sum,r)=>sum+Math.round((Number.isFinite(r.amount)?r.amount:0)*100),0)/100;}
