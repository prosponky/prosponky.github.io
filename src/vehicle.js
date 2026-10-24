import catalog from './data/vehicle-makes-compact.json' with {type:'json'};
const commonBrands=['ACURA','ALFA ROMEO','ASTON MARTIN','AUDI','BENTLEY','BMW','BUICK','CADILLAC','CHEVROLET','CHRYSLER','DODGE','FIAT','FORD','GENESIS','GMC','HONDA','HYUNDAI','INFINITI','JAGUAR','JEEP','KIA','LAND ROVER','LEXUS','LINCOLN','LOTUS','LUCID','MASERATI','MAZDA','MERCEDES-BENZ','MINI','MITSUBISHI','NISSAN','POLESTAR','PORSCHE','RAM','RIVIAN','SUBARU','TESLA','TOYOTA','VINFAST','VOLKSWAGEN','VOLVO','FISKER','PONTIAC','MERCURY','SAAB','SATURN','SCION','SUZUKI'];
export const makes=commonBrands.map(name=>catalog.records.find(m=>m.name===name)).filter(Boolean).sort((a,b)=>a.name.localeCompare(b.name));
export const shortModel=name=>name.replace(/\s+(?:AWD|FWD|RWD|2WD|4WD|4X4|ALL[- ]WHEEL DRIVE|FRONT[- ]WHEEL DRIVE|REAR[- ]WHEEL DRIVE)$/i,'').trim();
export async function models(makeId,year,fetcher=fetch){
 const key=`pd-models-simple-${makeId}-${year}`;try{const cached=JSON.parse(localStorage.getItem(key));if(cached?.length)return cached}catch{}
 const url=`https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeIdYear/makeId/${encodeURIComponent(makeId)}/modelyear/${encodeURIComponent(year)}?format=json`;
 const response=await fetcher(url,{signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('Vehicle catalog unavailable. Skip or enter a description.');
 const data=await response.json();if(!Array.isArray(data.Results))throw Error('Vehicle catalog returned no usable model list.');
 const rows=[...new Set(data.Results.map(r=>typeof r.Model_Name==='string'?shortModel(r.Model_Name):null).filter(v=>typeof v==='string'&&v.length<=150))].sort();
 try{localStorage.setItem(key,JSON.stringify(rows))}catch{}
 return rows;
}
