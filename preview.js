const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const colorPicker = document.getElementById("color");
const brushInput = document.getElementById("brush");
const toolbar = document.getElementById("toolbar");

function selectTool(buttonId){
  const buttons = ['draw','line','arrow','crop'];
  buttons.forEach(id=>{
    const btn=document.getElementById(id);
    if(id===buttonId) btn.classList.add('selected');
    else btn.classList.remove('selected');
  });
}

let baseImage = null;
let objects = [];
let undoStack = [];
let redoStack = [];
let historyImages = [];

let currentMode = null;
let drawing = false;
let selectedObject = null;
let startX=0, startY=0;
let draggingHandle = null;
let draggingRotation = false;
let handleSize = 8;

// Load snip
chrome.runtime.sendMessage({action:"getLastSnip"}, (data)=>{
  baseImage = new Image();
  baseImage.onload = ()=>{
    canvas.width = baseImage.width;
    canvas.height = baseImage.height;
    redraw();
    historyImages.push(canvas.toDataURL());
  };
  baseImage.src = data;
});

// Toolbar
document.getElementById("draw").onclick = ()=>{currentMode="draw"; selectTool("draw");};
document.getElementById("line").onclick = ()=>{currentMode="line"; selectTool("line");};
document.getElementById("arrow").onclick = ()=>{currentMode="arrow"; selectTool("arrow");};
document.getElementById("crop").onclick = ()=>{currentMode="crop"; selectTool("crop");};
document.getElementById("applyCrop").onclick = applyCrop;

document.getElementById("undo").onclick = ()=>{
  if(objects.length){
    redoStack.push(objects.pop());
    redraw();
  } else if(historyImages.length>1){
    historyImages.pop();
    const img = new Image();
    img.onload=()=>{
      baseImage = img;
      redraw();
    };
    img.src = historyImages[historyImages.length-1];
  }
};
document.getElementById("redo").onclick = ()=>{
  if(redoStack.length){
    objects.push(redoStack.pop());
    redraw();
  }
};
document.getElementById("clear").onclick = ()=>{
  objects=[];
  undoStack=[];
  redoStack=[];
  redraw();
};
document.getElementById("download").onclick = ()=>{
  canvas.toBlob(blob=>{
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download="snip.png";
    a.click();
  });
};
document.getElementById("copy").onclick = async ()=>{
  canvas.toBlob(async blob=>{
    await navigator.clipboard.write([new ClipboardItem({"image/png": blob})]);
    alert("Copied to clipboard!");
  });
};

// Draw helpers
function redraw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if(baseImage) ctx.drawImage(baseImage,0,0);

  objects.forEach(obj=>{
    ctx.save();
    if(obj.rotation){
      const center = getObjectCenter(obj);
      ctx.translate(center.x, center.y);
      ctx.rotate(obj.rotation);
      ctx.translate(-center.x, -center.y);
    }
    if(obj.type==="line") drawLine(obj);
    else if(obj.type==="arrow") drawArrow(obj);
    else if(obj.type==="draw") drawPath(obj);
    else if(obj.type==="crop") drawCrop(obj);

    if(obj.selected) drawHandles(obj,true);
    ctx.restore();
  });
}

function drawLine(obj){
  ctx.strokeStyle=obj.color;
  ctx.lineWidth=obj.width;
  ctx.beginPath();
  ctx.moveTo(obj.x1,obj.y1);
  ctx.lineTo(obj.x2,obj.y2);
  ctx.stroke();
}

function drawArrow(obj){
  drawLine(obj);
  const {x1,y1,x2,y2} = obj;
  const angle=Math.atan2(y2-y1,x2-x1);
  const len=10;
  ctx.beginPath();
  ctx.moveTo(x2,y2);
  ctx.lineTo(x2-len*Math.cos(angle-Math.PI/6),y2-len*Math.sin(angle-Math.PI/6));
  ctx.lineTo(x2-len*Math.cos(angle+Math.PI/6),y2-len*Math.sin(angle+Math.PI/6));
  ctx.lineTo(x2,y2);
  ctx.fillStyle=obj.color;
  ctx.fill();
}

function drawPath(obj){
  ctx.strokeStyle=obj.color;
  ctx.lineWidth=obj.width;
  ctx.beginPath();
  ctx.moveTo(obj.path[0].x,obj.path[0].y);
  for(let i=1;i<obj.path.length;i++) ctx.lineTo(obj.path[i].x,obj.path[i].y);
  ctx.stroke();
}

function drawCrop(obj){
  ctx.strokeStyle="blue";
  ctx.lineWidth=1;
  ctx.setLineDash([6]);
  ctx.strokeRect(obj.x,obj.y,obj.w,obj.h);
  ctx.setLineDash([]);
}

function drawHandles(obj,drawRotation){
  ctx.fillStyle="green";
  const handles = getHandles(obj);
  handles.forEach(h=>{
    ctx.fillRect(h.x-handleSize/2,h.y-handleSize/2,handleSize,handleSize);
  });
  if(drawRotation){
    const rot = getRotationHandle(obj);
    ctx.fillStyle="orange";
    ctx.beginPath();
    ctx.arc(rot.x,rot.y,handleSize/2,0,2*Math.PI);
    ctx.fill();
  }
}

// Object handles
function getHandles(obj){
  if(obj.type==="draw") return [];
  else if(obj.type==="line"||obj.type==="arrow") return [{x:obj.x1,y:obj.y1},{x:obj.x2,y:obj.y2}];
  else if(obj.type==="crop") return [
    {x:obj.x,y:obj.y},{x:obj.x+obj.w,y:obj.y},{x:obj.x,y:obj.y+obj.h},{x:obj.x+obj.w,y:obj.y+obj.h}
  ];
  return [];
}

function getRotationHandle(obj){
  const c = getObjectCenter(obj);
  return {x:c.x, y:c.y-30};
}

function getObjectCenter(obj){
  if(obj.type==="line"||obj.type==="arrow") return {x:(obj.x1+obj.x2)/2, y:(obj.y1+obj.y2)/2};
  else if(obj.type==="crop") return {x:obj.x+obj.w/2, y:obj.y+obj.h/2};
  return {x:0,y:0};
}

// Canvas events
let offsetX, offsetY;
canvas.onmousedown = (e)=>{
  const rect = canvas.getBoundingClientRect();
  startX = e.clientX - rect.left;
  startY = e.clientY - rect.top;
  drawing=true;
  selectedObject=null;
  draggingHandle=null;
  draggingRotation=false;

  objects.forEach(o=>o.selected=false);

  for(let i=objects.length-1;i>=0;i--){
    const obj=objects[i];
    const h = getHandleAt(startX,startY,obj);
    if(h!==null){ selectedObject=obj; obj.selected=true; draggingHandle=h; redraw(); return; }
    const r = getRotationHandle(obj);
    if(Math.hypot(startX-r.x,startY-r.y)<=handleSize){ selectedObject=obj; obj.selected=true; draggingRotation=true; redraw(); return; }
    if(obj.type==='crop' && pointInRect(startX,startY,obj)){ selectedObject=obj; obj.selected=true; redraw(); return; }
  }

  if(currentMode==="draw"){ selectedObject={type:"draw",path:[{x:startX,y:startY}],color:colorPicker.value,width:parseInt(brushInput.value),selected:true}; objects.push(selectedObject);}
  else if(currentMode==="line"||currentMode==="arrow"){ selectedObject={type:currentMode,x1:startX,y1:startY,x2:startX,y2:startY,color:colorPicker.value,width:parseInt(brushInput.value),selected:true,rotation:0}; objects.push(selectedObject);}
  else if(currentMode==="crop"){ selectedObject={type:"crop",x:startX,y:startY,w:0,h:0,selected:true,rotation:0}; objects.push(selectedObject);}
};

canvas.onmousemove = (e)=>{
  if(!drawing || !selectedObject) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if(draggingRotation){
    const center = getObjectCenter(selectedObject);
    selectedObject.rotation = Math.atan2(y-center.y,x-center.x) + Math.PI/2;
    redraw(); return;
  }

  if(draggingHandle!==null){
    if(selectedObject.type==="line"||selectedObject.type==="arrow"){
      if(draggingHandle===0){ selectedObject.x1=x; selectedObject.y1=y; } else { selectedObject.x2=x; selectedObject.y2=y; }
    } else if(selectedObject.type==="crop"){
      if(draggingHandle===0){ selectedObject.w+=selectedObject.x-x; selectedObject.h+=selectedObject.y-y; selectedObject.x=x; selectedObject.y=y; }
      else if(draggingHandle===1){ selectedObject.w=x-selectedObject.x; selectedObject.h+=selectedObject.y-y; selectedObject.y=y; }
      else if(draggingHandle===2){ selectedObject.w+=selectedObject.x-x; selectedObject.h=y-selectedObject.y; selectedObject.x=x; }
      else if(draggingHandle===3){ selectedObject.w=x-selectedObject.x; selectedObject.h=y-selectedObject.y; }
    }
    redraw();
    return;
  }

  if(selectedObject.type==="draw") selectedObject.path.push({x,y});
  else if(selectedObject.type==="line"||selectedObject.type==="arrow"){ selectedObject.x2=x; selectedObject.y2=y; }
  else if(selectedObject.type==="crop"){ selectedObject.w=x-startX; selectedObject.h=y-startY; }

  redraw();
};

canvas.onmouseup = ()=>{
  drawing=false;
  draggingHandle=null;
  draggingRotation=false;
  selectedObject=null;
  redraw();
};

function getHandleAt(x,y,obj){
  const handles = getHandles(obj);
  for(let i=0;i<handles.length;i++){ if(Math.abs(handles[i].x-x)<=handleSize && Math.abs(handles[i].y-y)<=handleSize) return i; }
  return null;
}

function pointInRect(x,y,obj){
  return x>=obj.x && x<=obj.x+obj.w && y>=obj.y && y<=obj.y+obj.h;
}

// Apply crop function
function applyCrop(){
  const cropObj = objects.find(o=>o.type==='crop' && o.selected);
  if(cropObj){
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = Math.abs(cropObj.w);
    tempCanvas.height = Math.abs(cropObj.h);
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(baseImage, cropObj.x, cropObj.y, cropObj.w, cropObj.h, 0,0,cropObj.w,cropObj.h);

    const croppedImg = new Image();
    croppedImg.onload=()=>{
      baseImage = croppedImg;
      canvas.width = croppedImg.width;
      canvas.height = croppedImg.height;
      objects = objects.filter(o=>o.type!=='crop');
      historyImages.push(canvas.toDataURL());
      redraw();
    };
    croppedImg.src = tempCanvas.toDataURL();
  }
}

// Toolbar draggable
let drag=false, offsetXToolbar, offsetYToolbar;
toolbar.onmousedown = (e)=>{drag=true; offsetXToolbar = e.clientX - toolbar.offsetLeft; offsetYToolbar = e.clientY - toolbar.offsetTop;};
document.onmousemove = (e)=>{if(drag){toolbar.style.left=(e.clientX-offsetXToolbar)+"px"; toolbar.style.top=(e.clientY-offsetYToolbar)+"px";}};
document.onmouseup = ()=>{drag=false;};
