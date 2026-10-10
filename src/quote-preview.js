import {getDocument,GlobalWorkerOptions} from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import {pdfBytes} from './pdf.js';

// Older Safari lacks this API even when PDF.js uses its compatibility build.
if(typeof Promise.withResolvers!=='function'){
 Promise.withResolvers=function(){let resolve,reject;const promise=new this((res,rej)=>{resolve=res;reject=rej;});return {promise,resolve,reject};};
}
GlobalWorkerOptions.workerSrc=workerUrl;

// Render the exported bytes themselves, keeping review and download identical.
export function mountQuotePreview(root,quote){
 let disposed=false,loadingTask,renderTask;
 const status=root.querySelector('[role="status"]');
 (async()=>{
  try{
   loadingTask=getDocument({data:pdfBytes(quote)});
   const pdf=await loadingTask.promise;
   for(let i=1;i<=pdf.numPages&&!disposed;i++){
    const page=await pdf.getPage(i);if(disposed)break;
    const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');
    const base=page.getViewport({scale:1});const width=root.clientWidth||390;const scale=Math.min(2,Math.max(1,width/base.width*Math.min(window.devicePixelRatio||1,2)));
    const viewport=page.getViewport({scale});canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
    renderTask=page.render({canvasContext:canvas.getContext('2d'),viewport});await renderTask.promise;if(disposed)break;
    const sheet=document.createElement('section');sheet.className='worksheet-page';sheet.setAttribute('aria-label','Worksheet page '+i);sheet.append(canvas);
    const accessible=document.createElement('div');accessible.className='sr-only';accessible.textContent=(await page.getTextContent()).items.map(item=>item.str).join(' ');sheet.append(accessible);
    if(disposed)break;root.append(sheet);
   }
   if(!disposed){status.remove();root.dataset.ready='true';}
  }catch(error){console.error('Worksheet render failed',error);if(!disposed){status.textContent='Worksheet preview could not load. You can still save the PDF.';root.dataset.error='true';}}
 })();
 return ()=>{disposed=true;renderTask?.cancel();loadingTask?.destroy().catch(()=>{});};
}



