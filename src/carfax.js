// Only dealer-provided report destinations; never synthesize a report from a VIN.
export function verifiedCarfaxUrl(value){
 try{const url=new URL(value);return url.protocol==='https:'&&['www.carfax.com','carfax.com'].includes(url.hostname)&&!url.username&&!url.password&&/^\/(vehiclehistory|VehicleHistory)\//.test(url.pathname)?url.href:null;}catch{return null;}
}
