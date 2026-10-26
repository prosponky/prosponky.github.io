// Small append/replace messages avoid refilling multi-megabyte evidence fields.
export function checkpointDelta(previous,next,path=[]){
 if(JSON.stringify(previous)===JSON.stringify(next))return [];
 if(Array.isArray(previous)&&Array.isArray(next)&&next.length>=previous.length){
  return [...previous.flatMap((value,i)=>checkpointDelta(value,next[i],[...path,i])),...next.slice(previous.length).map((value,i)=>({path:[...path,previous.length+i],value}))];
 }
 if(previous&&next&&typeof previous==='object'&&typeof next==='object'&&!Array.isArray(previous)&&!Array.isArray(next)&&Object.keys(previous).every(key=>Object.hasOwn(next,key))){
  return Object.keys(next).flatMap(key=>Object.hasOwn(previous,key)?checkpointDelta(previous[key],next[key],[...path,key]):[{path:[...path,key],value:next[key]}]);
 }
 return [{path,value:next}];
}
export function applyCheckpointDelta(previous,operations){
 if(!Array.isArray(operations)||operations.length>2000)throw Error('Invalid checkpoint delta');
 let result=structuredClone(previous);
 for(const operation of operations){
  const path=operation?.path;if(!Array.isArray(path)||path.length>20||!Object.hasOwn(operation,'value')||path.some(key=>!['string','number'].includes(typeof key)||['__proto__','prototype','constructor'].includes(String(key))))throw Error('Invalid checkpoint delta path');
  if(!path.length){result=structuredClone(operation.value);continue;}
  let target=result;
  for(const key of path.slice(0,-1)){if(!target||typeof target!=='object'||!Object.hasOwn(target,key))throw Error('Missing delta parent');target=target[key];}
  const key=path.at(-1);if(!target||typeof target!=='object'||Array.isArray(target)&&(!Number.isInteger(key)||key<0||key>target.length))throw Error('Invalid delta destination');
  target[key]=structuredClone(operation.value);
 }
 return result;
}
