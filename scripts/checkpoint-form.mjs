import {isDeepStrictEqual} from 'node:util';

export const checkpointHtmlHeaders={'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'};
const escapeHtml=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');

// Explicit encoding is essential: a legacy single-byte document also submits
// form text in that encoding, replacing unsupported evidence with HTML entities.
export function checkpointForm(state,status,title,delta=false){
 if(delta)return '<!doctype html><html><head><meta charset="utf-8"></head><body><h1>'+escapeHtml(title)+'</h1><p id="status">'+escapeHtml(status)+'</p><textarea id="checkpoint" readonly style="display:none">'+escapeHtml(JSON.stringify(state))+'</textarea><form method="post" accept-charset="UTF-8"><label>Checkpoint update<textarea id="update" name="checkpoint"></textarea></label><button>Save checkpoint</button></form></body></html>';
 return '<!doctype html><html><head><meta charset="utf-8"></head><body><h1>'+escapeHtml(title)+'</h1><p id="status">'+escapeHtml(status)+'</p><form method="post" accept-charset="UTF-8"><label>Checkpoint<textarea id="checkpoint" name="checkpoint">'+escapeHtml(JSON.stringify(state))+'</textarea></label><button>Save checkpoint</button></form></body></html>';
}

export function checkpointError(message){
 return '<!doctype html><html><head><meta charset="utf-8"></head><body><h1>Checkpoint failed</h1><p id="status">'+escapeHtml(message)+'</p></body></html>';
}

export async function readCheckpointForm(req,maxBytes){
 if(!/^application\/x-www-form-urlencoded(?:;|$)/i.test(req.headers['content-type']||''))throw Error('Local checkpoint form encoding required');
 const chunks=[];let size=0;
 for await(const chunk of req){const bytes=Buffer.from(chunk);size+=bytes.length;if(size>maxBytes)throw Error('Checkpoint too large');chunks.push(bytes);}
 // Never silently replace a malformed byte sequence in accepted dealer evidence.
 // Validate both literal UTF-8 bytes and percent-encoded form bytes before the
 // forgiving URLSearchParams decoder can turn them into replacement characters.
 const body=new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks));
 decodeURIComponent(body.replaceAll('+',' '));
 const fields=new URLSearchParams(body);
 if(fields.getAll('checkpoint').length!==1)throw Error('One checkpoint is required');
 return JSON.parse(fields.get('checkpoint'));
}

export function assertAcceptedPrefix(previous,next,fields){
 for(const field of fields){
  if(!Array.isArray(previous[field])||!Array.isArray(next[field])||next[field].length<previous[field].length||previous[field].some((value,index)=>!isDeepStrictEqual(value,next[field][index])))throw Error('Accepted evidence changed: '+field);
 }
}
