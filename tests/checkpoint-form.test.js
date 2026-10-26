import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {checkpointForm,checkpointError,checkpointHtmlHeaders,readCheckpointForm,assertAcceptedPrefix} from '../scripts/checkpoint-form.mjs';

const evidence={pages:[{text:'Crème • Sport � 車 😀 & <script>literal</script> + 100%\r\nOriginal OEM color'}],details:[]};
const request=(body,type='application/x-www-form-urlencoded')=>Object.assign(Readable.from(Array.from(Buffer.from(body),byte=>Buffer.from([byte]))),{headers:{'content-type':type}});

test('checkpoint page declares UTF-8 for rendering and form submission and escapes literal evidence',()=>{
 const html=checkpointForm(evidence,'Ready','Dealer <checkpoint>');
 assert.equal(checkpointHtmlHeaders['Content-Type'],'text/html; charset=utf-8');
 assert.match(html,/<meta charset="utf-8">/);
 assert.match(html,/accept-charset="UTF-8"/);
 assert.match(html,/Crème • Sport � 車 😀 &amp; &lt;script&gt;literal&lt;\/script&gt;/);
 assert.doesNotMatch(html,/<script>literal/);
 assert.match(checkpointError('bad <value>'),/bad &lt;value&gt;/);
});

test('UTF-8 evidence survives chunk boundaries and form encoding without normalization',async()=>{
 const encoded=new URLSearchParams({checkpoint:JSON.stringify(evidence)}).toString();
 const accepted=await readCheckpointForm(request(encoded),Buffer.byteLength(encoded));
 assert.deepEqual(accepted,evidence);
 assertAcceptedPrefix(evidence,accepted,['pages','details']);
 // A literal UTF-8 body exercises multibyte characters split between chunks.
 assert.deepEqual(await readCheckpointForm(request('checkpoint='+JSON.stringify({text:'車😀�'})),1024),{text:'車😀�'});
 const altered=structuredClone(accepted);altered.pages[0].text=altered.pages[0].text.replace('�','&#65533;');
 assert.throws(()=>assertAcceptedPrefix(evidence,altered,['pages','details']),/Accepted evidence changed/);
});

test('malformed encoding, oversized and ambiguous form payloads fail rather than alter evidence',async()=>{
 for(const body of ['checkpoint=%7B%22text%22%3A%22%FF%22%7D','checkpoint=%Q0','checkpoint={}&checkpoint={}'])await assert.rejects(readCheckpointForm(request(body),1024));
 await assert.rejects(readCheckpointForm(request(Buffer.from([0x63,0x3d,0xff])),1024));
 await assert.rejects(readCheckpointForm(request('checkpoint={}'),3),/too large/);
 await assert.rejects(readCheckpointForm(request('checkpoint={}','text/plain'),1024),/encoding/);
});

test('loopback HTTP form roundtrip preserves the original Unicode evidence byte-for-byte',async()=>{
 let accepted;
 const server=createServer(async(req,res)=>{try{if(req.method==='POST')accepted=await readCheckpointForm(req,100000);res.writeHead(200,checkpointHtmlHeaders);res.end(checkpointForm(accepted||evidence,'Ready','Fixture'));}catch(error){res.writeHead(400,checkpointHtmlHeaders);res.end(checkpointError(error.message));}});
 server.listen(0,'127.0.0.1');await once(server,'listening');const url='http://127.0.0.1:'+server.address().port;
 try{
  const page=await fetch(url,{headers:{Connection:'close'}});assert.match(page.headers.get('content-type'),/charset=utf-8/);assert.match(await page.text(),/車 😀/);
  const result=await fetch(url,{method:'POST',headers:{Connection:'close','Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({checkpoint:JSON.stringify(evidence)})});
  assert.equal(result.status,200);assert.deepEqual(Buffer.from(JSON.stringify(accepted)),Buffer.from(JSON.stringify(evidence)));
  const html=await result.text();assert.match(html,/� 車 😀/);assert.doesNotMatch(html,/&amp;#65533;/);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
