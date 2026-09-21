const DEFAULT_SIZES = [
  {id:'SZ-XS',nombre:'XS',tipo:'LETRA'}, {id:'SZ-S',nombre:'S',tipo:'LETRA'}, {id:'SZ-M',nombre:'M',tipo:'LETRA'},
  {id:'SZ-L',nombre:'L',tipo:'LETRA'}, {id:'SZ-XL',nombre:'XL',tipo:'LETRA'}, {id:'SZ-XXL',nombre:'XXL',tipo:'LETRA'},
  {id:'SZ-34',nombre:'34',tipo:'NUMERICA'}, {id:'SZ-36',nombre:'36',tipo:'NUMERICA'}, {id:'SZ-38',nombre:'38',tipo:'NUMERICA'},
  {id:'SZ-40',nombre:'40',tipo:'NUMERICA'}, {id:'SZ-42',nombre:'42',tipo:'NUMERICA'}
];
const EMPTY_DB = {version:7, stocks:[], tallas:DEFAULT_SIZES, prendas:[], ventas:[], users:[]};
const ADMIN_CREDENTIALS={usuario:'ADMIN',nombre:'MONICA FELIX ERQUICIA',rol:'ADMIN'};
const SESSION_KEY='urbanClickSessionCloud_v1';

const $ = id => document.getElementById(id);
const money = n => `Bs ${Number(n||0).toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const num = n => Number(n||0).toLocaleString('es-BO',{minimumFractionDigits:0,maximumFractionDigits:0});
const pct = n => `${Number(n||0).toLocaleString('es-BO',{minimumFractionDigits:1,maximumFractionDigits:1})}%`;
const today = () => new Date().toISOString().slice(0,10);
const uid = p => `${p}-${Date.now()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const cleanText = value => String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
const clone = value => JSON.parse(JSON.stringify(value));
const cloneEmpty = () => clone(EMPTY_DB);
const __resourcePromises = {};
function loadScriptOnce(src,key){
  if(__resourcePromises[key]) return __resourcePromises[key];
  __resourcePromises[key]=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=true;s.onload=()=>resolve(true);s.onerror=()=>{delete __resourcePromises[key];reject(new Error('No se pudo cargar '+key))};document.head.appendChild(s)});return __resourcePromises[key];
}
async function ensureXLSX(){ if(window.XLSX)return true; try{await loadScriptOnce('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js','xlsx');return Boolean(window.XLSX)}catch(_){return false} }
async function ensurePDF(){ try{if(!window.jspdf)await loadScriptOnce('https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js','jspdf');if(window.jspdf?.jsPDF&&!window.jspdf.jsPDF.API.autoTable)await loadScriptOnce('https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.4/dist/jspdf.plugin.autotable.min.js','autotable');return Boolean(window.jspdf?.jsPDF)}catch(_){return false} }
function stockByIdFrom(data,id){ return (data.stocks||[]).find(s=>s.id===id); }
function garmentByIdFrom(data,id){ return (data.prendas||[]).find(p=>p.id===id); }
function normalizeDB(data){
  data=data||cloneEmpty(); data.version=7;
  data.stocks=Array.isArray(data.stocks)?data.stocks:[]; data.prendas=Array.isArray(data.prendas)?data.prendas:[]; data.ventas=Array.isArray(data.ventas)?data.ventas:[]; data.tallas=Array.isArray(data.tallas)&&data.tallas.length?data.tallas:clone(DEFAULT_SIZES); data.users=Array.isArray(data.users)?data.users:[];
  data.users=data.users.map(u=>({id:u.id||uid('USR'),nombre:cleanText(u.nombre||'USUARIO VISITA'),usuario:cleanText(u.usuario||''),clave:u.clave||'',rol:'VISITA',activo:u.activo!==false&&u.activo!=='NO',creado:u.creado||new Date().toISOString()})).filter(u=>u.usuario&&u.usuario!=='ADMIN');
  data.tallas=data.tallas.map(t=>({id:t.id||uid('SZ'),nombre:cleanText(t.nombre||''),tipo:cleanText(t.tipo||'OTRA'),creado:t.creado||new Date().toISOString()})).filter(t=>t.nombre);
  data.stocks=data.stocks.map(s=>({id:s.id||uid('STK'),nombre:cleanText(s.nombre||'STOCK SIN NOMBRE'),fecha:s.fecha||today(),cantidad:Number(s.cantidad||0),costoTotal:Number(s.costoTotal||0),costoUnitario:Number(s.costoUnitario||0),proveedor:cleanText(s.proveedor||''),proveedorCelular:cleanText(s.proveedorCelular||''),proveedorCiudad:cleanText(s.proveedorCiudad||''),proveedorDetalle:cleanText(s.proveedorDetalle||''),observaciones:cleanText(s.observaciones||''),creado:s.creado||new Date().toISOString()}));
  data.prendas=data.prendas.map(p=>({id:p.id||uid('PR'),stockId:p.stockId,detalle:cleanText(p.detalle||''),marca:cleanText(p.marca||''),color:cleanText(p.color||''),genero:cleanText(p.genero||'MUJER'),talla:cleanText(p.talla||''),costoUnitario:Number(p.costoUnitario??stockByIdFrom(data,p.stockId)?.costoUnitario??0),precioVenta:Number(p.precioVenta||0),estadoPrenda:['DISPONIBLE','RESERVADO','DANADO'].includes(cleanText(p.estadoPrenda))?cleanText(p.estadoPrenda):'DISPONIBLE',images:Array.isArray(p.images)?p.images:[],creado:p.creado||new Date().toISOString()}));
  for(const p of data.prendas){if(p.talla&&!data.tallas.some(t=>t.nombre===p.talla))data.tallas.push({id:uid('SZ'),nombre:p.talla,tipo:'OTRA',creado:new Date().toISOString()})}
  data.ventas=data.ventas.map(v=>({id:v.id||uid('VEN'),prendaId:v.prendaId,stockId:v.stockId,cliente:cleanText(v.cliente||''),celular:cleanText(v.celular||''),fechaVenta:v.fechaVenta||today(),fechaEntrega:v.fechaEntrega||'',estadoEntrega:cleanText(v.estadoEntrega||'ENTREGADO'),metodoPago:cleanText(v.metodoPago||'EFECTIVO'),precioVenta:Number(v.precioVenta||0),costoUnitario:Number(v.costoUnitario??garmentByIdFrom(data,v.prendaId)?.costoUnitario??0),margen:Number(v.margen??0),creado:v.creado||new Date().toISOString()}));
  return data;
}

let db=cloneEmpty(); let currentSession=null; let dashboardFilter='all'; let dashboardView='resumen'; let financialChart=null,inventoryChart=null,profitChart=null; let saleCart=[]; let tempImages=[]; let modalOnClose=null; let undoStack=[],redoStack=[]; const HISTORY_LIMIT=12;
let serverRevision=0; let lastSynced=cloneEmpty(); let lastPersisted=JSON.stringify(db); let syncQueue=Promise.resolve(); let lastRemoteCheck=0; const uploadedImageMap=new Map();

function apiFetch(url,options={}){ return fetch(url,{credentials:'same-origin',...options,headers:{...(options.body instanceof FormData?{}:{'content-type':'application/json'}),...(options.headers||{})}}); }
async function loadRemoteData(force=true){
  const headers={}; if(!force&&serverRevision)headers['if-none-match']=`\"uc-${serverRevision}\"`;
  const r=await apiFetch('/api/bootstrap',{method:'GET',headers}); if(r.status===304)return true; if(r.status===401){clearSession();showLogin();return false} if(!r.ok)throw new Error('NO SE PUDO LEER LA BASE DE DATOS');
  const payload=await r.json(); db=normalizeDB(payload.data); currentSession={rol:payload.user.rol,usuario:payload.user.usuario,nombre:payload.user.nombre,userId:payload.user.uid}; serverRevision=Number(payload.revision||0); lastSynced=clone(db); lastPersisted=JSON.stringify(db); undoStack=[];redoStack=[];updateHistoryButtons();return true;
}
function syncShape(data){ return {stocks:(data.stocks||[]).map(x=>({...x})),tallas:(data.tallas||[]).map(x=>({...x})),prendas:(data.prendas||[]).map(({images,...x})=>x),ventas:(data.ventas||[]).map(x=>({...x})),users:(data.users||[]).map(x=>({...x}))}; }
function collectionDiff(prev,next){const pm=new Map((prev||[]).map(x=>[x.id,x])),nm=new Map((next||[]).map(x=>[x.id,x])),upsert=[],del=[];for(const [id,row] of nm){const old=pm.get(id);if(!old||JSON.stringify(old)!==JSON.stringify(row))upsert.push(row)}for(const id of pm.keys())if(!nm.has(id))del.push(id);return{upsert,delete:del}}
function computeChanges(prev,next){const a=syncShape(prev),b=syncShape(next);return{stocks:collectionDiff(a.stocks,b.stocks),tallas:collectionDiff(a.tallas,b.tallas),prendas:collectionDiff(a.prendas,b.prendas),ventas:collectionDiff(a.ventas,b.ventas),users:collectionDiff(a.users,b.users)}}
function hasChanges(ch){return Object.values(ch).some(c=>c.upsert.length||c.delete.length)}
function dataUrlToBlob(dataUrl){const [meta,b64]=dataUrl.split(',');const mime=(meta.match(/data:([^;]+)/)||[])[1]||'image/jpeg';const raw=atob(b64);const arr=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)arr[i]=raw.charCodeAt(i);return new Blob([arr],{type:mime})}
async function uploadRawImages(target){
  for(const p of target.prendas||[]){
    const refs=[];
    for(const im of p.images||[]){
      if(!im?.dataUrl?.startsWith('data:')){refs.push(im);continue}
      const localId=im.localId||im.name+'_'+im.dataUrl.length; if(uploadedImageMap.has(localId)){refs.push(uploadedImageMap.get(localId));continue}
      const form=new FormData();form.append('prendaId',p.id);form.append('name',im.name||'FOTO.JPG');form.append('file',dataUrlToBlob(im.dataUrl),im.name||'FOTO.JPG');
      const r=await apiFetch('/api/images',{method:'POST',body:form,headers:{}}); if(!r.ok)throw new Error('NO SE PUDO SUBIR UNA IMAGEN'); const payload=await r.json();serverRevision=Number(payload.revision||serverRevision);uploadedImageMap.set(localId,payload.ref);refs.push(payload.ref);
      const live=garmentById(p.id);if(live){const idx=live.images.findIndex(x=>x.localId===im.localId||x.dataUrl===im.dataUrl);if(idx>=0)live.images[idx]=payload.ref}
    }
    p.images=refs;
  }
}
function splitChanges(changes,maxOps=30){
  const ops=[];for(const [collection,block] of Object.entries(changes)){for(const row of block.upsert)ops.push({collection,type:'upsert',value:row});for(const id of block.delete)ops.push({collection,type:'delete',value:id})}
  const chunks=[];for(let i=0;i<ops.length;i+=maxOps){const ch={stocks:{upsert:[],delete:[]},tallas:{upsert:[],delete:[]},prendas:{upsert:[],delete:[]},ventas:{upsert:[],delete:[]},users:{upsert:[],delete:[]}};for(const op of ops.slice(i,i+maxOps))ch[op.collection][op.type].push(op.value);chunks.push(ch)}return chunks;
}
async function syncTarget(target){
  const changes=computeChanges(lastSynced,target);
  if(hasChanges(changes)){
    for(const chunk of splitChanges(changes,30)){
      const r=await apiFetch('/api/sync',{method:'POST',body:JSON.stringify({revision:serverRevision,changes:chunk})});
      if(r.status===409){const p=await r.json();serverRevision=Number(p.revision||serverRevision);await loadRemoteData(true);renderAll();notify('LOS DATOS CAMBIARON EN OTRO DISPOSITIVO. SE ACTUALIZO LA INFORMACION.');return false}
      if(!r.ok){const e=await r.json().catch(()=>({}));throw new Error(e.message||'ERROR AL GUARDAR')}
      const p=await r.json();serverRevision=Number(p.revision||serverRevision);
    }
  }
  await uploadRawImages(target);
  target.users.forEach(u=>u.clave=''); lastSynced=clone(target); db.users.forEach(u=>u.clave=''); return true;
}
function updateHistoryButtons(){if($('undoBtn'))$('undoBtn').disabled=!isAdmin()||!undoStack.length;if($('redoBtn'))$('redoBtn').disabled=!isAdmin()||!redoStack.length}
function isAdmin(){return currentSession?.rol==='ADMIN'} function requireAdmin(){if(isAdmin())return true;notify('MODO VISITA: ACCION BLOQUEADA.');return false}
function persist(render=true,track=true){
  if(currentSession&&!isAdmin()){if(render)renderAll();notify('MODO VISITA: NO SE PUEDEN MODIFICAR DATOS.');return false}
  const current=JSON.stringify(db);if(track&&current!==lastPersisted){undoStack.push(lastPersisted);if(undoStack.length>HISTORY_LIMIT)undoStack.shift();redoStack=[]}lastPersisted=current;updateHistoryButtons();if(render)renderAll();const target=normalizeDB(clone(db));syncQueue=syncQueue.then(()=>syncTarget(target)).then(ok=>{if(ok)notify('DATOS GUARDADOS EN LA NUBE.')}).catch(err=>{console.error(err);notify('ERROR AL GUARDAR EN LA NUBE. REVISA TU CONEXION.')});return true;
}
function undo(){if(!requireAdmin()||!undoStack.length)return;redoStack.push(lastPersisted);db=normalizeDB(JSON.parse(undoStack.pop()));lastPersisted=JSON.stringify(db);saleCart=[];updateHistoryButtons();renderAll();const target=clone(db);syncQueue=syncQueue.then(()=>syncTarget(target)).catch(()=>notify('NO SE PUDO DESHACER EN LA NUBE.'));notify('ACCION DESHECHA.')}
function redo(){if(!requireAdmin()||!redoStack.length)return;undoStack.push(lastPersisted);db=normalizeDB(JSON.parse(redoStack.pop()));lastPersisted=JSON.stringify(db);saleCart=[];updateHistoryButtons();renderAll();const target=clone(db);syncQueue=syncQueue.then(()=>syncTarget(target)).catch(()=>notify('NO SE PUDO REHACER EN LA NUBE.'));notify('ACCION REHECHA.')}
function notify(text){const t=$('toast');t.textContent=cleanText(text);t.classList.add('show');clearTimeout(notify.timer);notify.timer=setTimeout(()=>t.classList.remove('show'),2600)}
function stockById(id){return db.stocks.find(s=>s.id===id)} function stockName(id){return stockById(id)?.nombre||'SIN STOCK'} function garmentById(id){return db.prendas.find(p=>p.id===id)} function saleForGarment(id){return db.ventas.find(v=>v.prendaId===id)} function isSold(id){return Boolean(saleForGarment(id))} function costOf(p){return Number(p?.costoUnitario||stockById(p?.stockId)?.costoUnitario||0)} function priceOf(p){return Number(p?.precioVenta||0)} function marginOf(p){return priceOf(p)-costOf(p)} function clientKey(v){return cleanText(v?.celular||v?.cliente||'').trim()} function uniqueClients(ventas){return new Set(ventas.map(clientKey).filter(Boolean)).size} function stateClass(s){return s==='DISPONIBLE'?'available':s==='RESERVADO'?'reserved':'damaged'}
if(window.ChartDataLabels&&window.Chart)Chart.register(ChartDataLabels);

function saveSession(s){currentSession=s;sessionStorage.setItem(SESSION_KEY,JSON.stringify(s))} function clearSession(){currentSession=null;sessionStorage.removeItem(SESSION_KEY)}
function showLogin(){$('loginScreen').classList.remove('hidden','login-success');$('appShell').classList.add('auth-locked');$('loginUser').value='';$('loginPass').value='';$('loginError').textContent='';setTimeout(()=>$('loginUser').focus(),80)}
async function enterSystem(session){saveSession(session);$('loginError').textContent='';$('entryMessage').textContent=session.rol==='ADMIN'?'BIENVENIDA · ADMINISTRACION':'BIENVENIDA · MODO VISITA';$('loginScreen').classList.add('login-success');$('entryTransition').classList.remove('hidden');await sleep(450);$('loginScreen').classList.add('hidden');$('appShell').classList.remove('auth-locked');$('appShell').classList.add('app-enter');await sleep(300);$('entryTransition').classList.add('hidden');$('appShell').classList.remove('app-enter');applyRoleUI();renderAll();navigateTo('dashboard')}
function applyRoleUI(){const admin=isAdmin();document.body.classList.toggle('visitor-mode',!admin);document.querySelectorAll('[data-admin-nav]').forEach(el=>el.classList.toggle('role-hidden',!admin));document.querySelectorAll('.admin-only,.admin-only-inline').forEach(el=>el.classList.toggle('role-hidden',!admin));['ventas','respaldos','usuarios'].forEach(id=>{const sec=$(id);if(sec)sec.classList.toggle('role-restricted',!admin)});if($('undoBtn'))$('undoBtn').classList.toggle('role-hidden',!admin);if($('redoBtn'))$('redoBtn').classList.toggle('role-hidden',!admin);if($('quickBackup'))$('quickBackup').classList.toggle('role-hidden',!admin);$('sessionBadge').textContent=admin?`ADMIN · ${currentSession?.usuario||''}`:`VISITA · ${currentSession?.nombre||currentSession?.usuario||''}`;$('sessionBadge').classList.toggle('visitor',!admin);$('accessBanner').classList.toggle('hidden',admin);if(!admin)$('accessBanner').innerHTML='<strong>MODO VISITA · SOLO LECTURA</strong><span>DATOS CENTRALES EN CLOUDFLARE. PUEDES CONSULTAR SIN MODIFICAR.</span>';updateHistoryButtons()}
$('loginForm').addEventListener('submit',async e=>{e.preventDefault();$('loginError').textContent='';const usuario=cleanText($('loginUser').value).trim(),clave=cleanText($('loginPass').value).trim();try{const r=await apiFetch('/api/auth/login',{method:'POST',body:JSON.stringify({usuario,clave})});const p=await r.json().catch(()=>({}));if(!r.ok){const map={D1_NO_VINCULADA:'FALTA VINCULAR LA BASE D1 CON EL NOMBRE DB.',BASE_NO_INICIALIZADA:'LA BASE D1 NO TIENE LAS TABLAS. EJECUTA schema.sql.',SESIONES_NO_INICIALIZADAS:'FALTA LA TABLA DE SESIONES. EJECUTA MIGRACION_SESIONES.sql.',CREDENCIALES_INVALIDAS:'USUARIO O CONTRASENA INCORRECTOS.'};throw new Error(map[p.error]||p.message||'NO SE PUDO INICIAR SESION.')}currentSession={rol:p.user.rol,usuario:p.user.usuario,nombre:p.user.nombre,userId:p.user.id};await loadRemoteData(true);await enterSystem(currentSession)}catch(err){$('loginError').textContent=String(err?.message||'NO SE PUDO INICIAR SESION.').toUpperCase();$('loginScreen').classList.remove('shake');void $('loginScreen').offsetWidth;$('loginScreen').classList.add('shake')}});
$('logoutBtn').addEventListener('click',async()=>{try{await apiFetch('/api/auth/logout',{method:'POST',body:'{}'})}catch(_){}clearSession();$('sidebar').classList.remove('open');showLogin()});
function navigateTo(section){if(!isAdmin()&&['ventas','respaldos','usuarios'].includes(section)){notify('MODO VISITA: SECCION RESTRINGIDA.');section='dashboard'}document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.section===section));document.querySelectorAll('.section').forEach(s=>s.classList.toggle('active',s.id===section));$('sidebar').classList.remove('open');window.scrollTo({top:0,behavior:'smooth'});if(section==='dashboard')setTimeout(renderDashboard,20)}
document.querySelectorAll('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>navigateTo(btn.dataset.section)));document.querySelectorAll('[data-dashboard-view]').forEach(btn=>btn.addEventListener('click',()=>{dashboardView=btn.dataset.dashboardView;renderDashboard()}));$('menuBtn').addEventListener('click',()=>$('sidebar').classList.toggle('open'));document.querySelectorAll('[data-scroll]').forEach(btn=>btn.addEventListener('click',()=>$(btn.dataset.scroll)?.scrollIntoView({behavior:'smooth',block:'start'})));$('todayLabel').textContent=new Intl.DateTimeFormat('es-BO',{weekday:'short',day:'2-digit',month:'short',year:'numeric'}).format(new Date());$('undoBtn').addEventListener('click',undo);$('redoBtn').addEventListener('click',redo);updateHistoryButtons();
document.addEventListener('input',e=>{const el=e.target;if(el.matches('input:not([type]),input[type="text"],input[type="tel"],input[type="search"],textarea')){const start=el.selectionStart,old=el.value,cleaned=cleanText(old);if(old!==cleaned){el.value=cleaned;try{el.setSelectionRange(start,start)}catch(_){}}}});document.querySelectorAll('select option').forEach(o=>{if(o.textContent)o.textContent=cleanText(o.textContent)});
function openModal(title,html,onClose=null){$('modalTitle').textContent=title;$('modalBody').innerHTML=html;$('modal').classList.remove('hidden');modalOnClose=onClose} function closeModal(){$('modal').classList.add('hidden');$('modalBody').innerHTML='';if(typeof modalOnClose==='function'){const fn=modalOnClose;modalOnClose=null;fn()}} $('closeModal').addEventListener('click',closeModal);$('modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal()});
function dataLabelOptions(){return{color:'#7318c9',anchor:'end',align:'top',formatter:v=>typeof v==='number'?(Math.abs(v)>=1000?Number(v).toLocaleString('es-BO'):v):v,font:{weight:'700',size:10}}} function chartCommon(){return{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{boxWidth:12,usePointStyle:true,pointStyle:'circle'}},datalabels:dataLabelOptions()}}}
async function fileToCompressedDataURL(file,maxSide=960,startQuality=.72,targetBytes=280*1024){
  if(!file.type.startsWith('image/'))return null;
  const raw=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)});
  const img=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=raw});
  let scale=Math.min(1,maxSide/Math.max(img.width,img.height));
  let quality=startQuality;
  for(let attempt=0;attempt<8;attempt++){
    const w=Math.max(1,Math.round(img.width*scale)),h=Math.max(1,Math.round(img.height*scale));
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;canvas.getContext('2d').drawImage(img,0,0,w,h);
    const dataUrl=canvas.toDataURL('image/jpeg',quality);
    const approxBytes=Math.floor((dataUrl.length-dataUrl.indexOf(',')-1)*0.75);
    if(approxBytes<=targetBytes||attempt===7)return dataUrl;
    if(quality>.5)quality-=.08;else scale*=.82;
  }
  return null;
}
function renderTempImages(){$('imagePreview').innerHTML=tempImages.length?tempImages.map((img,i)=>`<div class="thumb"><img src="${img.dataUrl}" alt="Foto"><small>Foto ${i+1}</small></div>`).join(''):'<div class="empty-state">Sin imágenes seleccionadas todavía.</div>'}
async function appendImageFiles(files,replace=false){if(replace)tempImages=[];for(const file of [...files]){const dataUrl=await fileToCompressedDataURL(file,960,.72,280*1024);if(dataUrl)tempImages.push({localId:uid('LOCALIMG'),name:cleanText(file.name||`FOTO_${Date.now()}.JPG`),dataUrl})}renderTempImages()}
$('openCameraBtn').addEventListener('click',()=>$('prendaCamara').click());$('openGalleryBtn').addEventListener('click',()=>$('prendaGaleria').click());$('prendaCamara').addEventListener('change',async e=>{await appendImageFiles(e.target.files,false);e.target.value=''});$('prendaGaleria').addEventListener('change',async e=>{await appendImageFiles(e.target.files,false);e.target.value=''});
async function checkRemoteRevision(){if(document.visibilityState==='hidden'||!currentSession||Date.now()-lastRemoteCheck<120000)return;lastRemoteCheck=Date.now();try{const r=await apiFetch('/api/revision',{method:'GET'});if(!r.ok)return;const p=await r.json();if(Number(p.revision)!==serverRevision){await loadRemoteData(true);renderAll();notify('DATOS ACTUALIZADOS DESDE LA NUBE.')}}catch(_){}}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkRemoteRevision()});setInterval(checkRemoteRevision,300000);

// -------- STOCKS --------
function updateStockCostPreview(){
  const qty=Number($('stockCantidad').value||0), total=Number($('stockCosto').value||0);
  const unit = qty>0 ? total/qty : 0;
  $('stockCostoUnitario').value = money(unit);
  $('stockCostPreview').textContent = `Costo unitario: ${money(unit)}`;
}
['stockCantidad','stockCosto'].forEach(id=>$(id).addEventListener('input', updateStockCostPreview));
$('stockForm').addEventListener('reset', ()=> setTimeout(updateStockCostPreview));
$('stockForm').addEventListener('submit', e=>{
  e.preventDefault(); if(!requireAdmin()) return;
  const cantidad=Number($('stockCantidad').value||0), costoTotal=Number($('stockCosto').value||0);
  if(cantidad<1){ notify('La cantidad de prendas debe ser mayor a cero.'); return; }
  db.stocks.push({
    id:uid('STK'), nombre:cleanText($('stockNombre').value.trim()), fecha:$('stockFecha').value || today(), cantidad, costoTotal,
    costoUnitario:costoTotal/cantidad, proveedor:cleanText($('stockProveedor').value.trim()), proveedorCelular:cleanText($('stockProveedorCel').value.trim()),
    proveedorCiudad:cleanText($('stockProveedorCiudad').value.trim()), proveedorDetalle:cleanText($('stockProveedorDetalle').value.trim()),
    observaciones:cleanText($('stockObs').value.trim()), creado:new Date().toISOString()
  });
  e.target.reset(); $('stockFecha').value=today(); updateStockCostPreview(); persist(); notify('Stock registrado correctamente.');
});
window.deleteStock = id => {
  if(!requireAdmin()) return; const st=stockById(id); if(!st) return;
  const garments=db.prendas.filter(p=>p.stockId===id); const ids=new Set(garments.map(p=>p.id)); const sales=db.ventas.filter(v=>v.stockId===id || ids.has(v.prendaId));
  openModal(`ELIMINAR ${st.nombre}`, `<div class="modal-warning"><strong>ADVERTENCIA DE RIESGO</strong><br>AL ELIMINAR ESTE STOCK TAMBIEN SE ELIMINARAN SUS PRENDAS Y VENTAS VINCULADAS. PODRAS USAR DESHACER INMEDIATAMENTE DESPUES SI FUE UN ERROR.</div><div class="danger-summary"><div><strong>${garments.length}</strong><span>PRENDAS</span></div><div><strong>${sales.length}</strong><span>VENTAS</span></div><div><strong>${money(st.costoTotal)}</strong><span>INVERSION</span></div></div><label><span>ESCRIBE ELIMINAR PARA CONFIRMAR</span><input id="confirmDeleteStockText" class="confirm-input" autocomplete="off"></label><div class="gallery-actions"><button id="confirmDeleteStockBtn" class="danger-btn" type="button">ELIMINAR STOCK Y VINCULADOS</button><button id="cancelDeleteStockBtn" class="soft-btn" type="button">CANCELAR</button></div>`);
  $('cancelDeleteStockBtn').addEventListener('click',closeModal);
  $('confirmDeleteStockBtn').addEventListener('click',()=>{
    if(cleanText($('confirmDeleteStockText').value)!=='ELIMINAR'){ notify('ESCRIBE ELIMINAR PARA CONFIRMAR.'); return; }
    db.stocks=db.stocks.filter(s=>s.id!==id); db.prendas=db.prendas.filter(p=>p.stockId!==id); db.ventas=db.ventas.filter(v=>v.stockId!==id && !ids.has(v.prendaId)); saleCart=saleCart.filter(x=>!ids.has(x.prendaId)); if(dashboardFilter===id) dashboardFilter='all'; persist(); closeModal(); notify('STOCK ELIMINADO. USA DESHACER SI FUE UN ERROR.');
  });
};

function stockSummary(stock){
  const prendas = db.prendas.filter(p=>p.stockId===stock.id);
  const ventas = db.ventas.filter(v=>v.stockId===stock.id);
  const soldIds = new Set(ventas.map(v=>v.prendaId));
  const revenue = ventas.reduce((a,v)=>a+Number(v.precioVenta||0),0);
  const realizedProfit = ventas.reduce((a,v)=>a+Number(v.margen||0),0);
  const available = prendas.filter(p=>p.estadoPrenda==='DISPONIBLE' && !soldIds.has(p.id)).length;
  const reserved = prendas.filter(p=>p.estadoPrenda==='RESERVADO' && !soldIds.has(p.id)).length;
  const damaged = prendas.filter(p=>p.estadoPrenda==='DANADO' && !soldIds.has(p.id)).length;
  const sold = prendas.filter(p=>soldIds.has(p.id)).length;
  const pending = Math.max(0, Number(stock.cantidad)-prendas.length);
  const inventoryCost = prendas.filter(p=>!soldIds.has(p.id)).reduce((a,p)=>a+costOf(p),0);
  const potentialRevenue = prendas.filter(p=>!soldIds.has(p.id) && p.estadoPrenda!=='DANADO').reduce((a,p)=>a+priceOf(p),0);
  const potentialProfit = prendas.filter(p=>!soldIds.has(p.id) && p.estadoPrenda!=='DANADO').reduce((a,p)=>a+marginOf(p),0);
  const damagedCost = prendas.filter(p=>!soldIds.has(p.id) && p.estadoPrenda==='DANADO').reduce((a,p)=>a+costOf(p),0);
  const avgCost = prendas.length ? prendas.reduce((a,p)=>a+costOf(p),0)/prendas.length : 0;
  const avgProfit = sold ? realizedProfit/sold : 0;
  const roi = stock.costoTotal ? (realizedProfit/stock.costoTotal)*100 : 0;
  const grossMargin = revenue ? (realizedProfit/revenue)*100 : 0;
  const markup = ventas.reduce((a,v)=>a+Number(v.costoUnitario||0),0) ? (realizedProfit/ventas.reduce((a,v)=>a+Number(v.costoUnitario||0),0))*100 : 0;
  const recovery = stock.costoTotal ? (revenue/stock.costoTotal)*100 : 0;
  const rotation = prendas.length ? (sold/prendas.length)*100 : 0;
  const pendingDeliveries = ventas.filter(v=>v.estadoEntrega && v.estadoEntrega!=='ENTREGADO').length;
  return {stock, prendas, ventas, revenue, realizedProfit, available, reserved, damaged, sold, pending, inventoryCost, potentialRevenue, potentialProfit, damagedCost, avgCost, avgProfit, roi, grossMargin, markup, recovery, rotation, declared:Number(stock.cantidad), registered:prendas.length, clients:uniqueClients(ventas), pendingDeliveries};
}

function metricScope(scope='all'){
  const stocks = scope==='all' ? db.stocks : db.stocks.filter(s=>s.id===scope);
  const summaries = stocks.map(stockSummary);
  const aggregate = {
    declared: summaries.reduce((a,s)=>a+s.declared,0),
    registered: summaries.reduce((a,s)=>a+s.registered,0),
    sold: summaries.reduce((a,s)=>a+s.sold,0),
    available: summaries.reduce((a,s)=>a+s.available,0),
    reserved: summaries.reduce((a,s)=>a+s.reserved,0),
    damaged: summaries.reduce((a,s)=>a+s.damaged,0),
    pending: summaries.reduce((a,s)=>a+s.pending,0),
    investment: summaries.reduce((a,s)=>a+Number(s.stock.costoTotal||0),0),
    revenue: summaries.reduce((a,s)=>a+s.revenue,0),
    realizedProfit: summaries.reduce((a,s)=>a+s.realizedProfit,0),
    inventoryCost: summaries.reduce((a,s)=>a+s.inventoryCost,0),
    potentialRevenue: summaries.reduce((a,s)=>a+s.potentialRevenue,0),
    potentialProfit: summaries.reduce((a,s)=>a+s.potentialProfit,0),
    damagedCost: summaries.reduce((a,s)=>a+s.damagedCost,0),
    clients: uniqueClients(summaries.flatMap(s=>s.ventas)),
    pendingDeliveries: summaries.reduce((a,s)=>a+s.pendingDeliveries,0),
    summaries,
    recentSales: summaries.flatMap(s=>s.ventas).sort((a,b)=>(b.creado||b.fechaVenta).localeCompare(a.creado||a.fechaVenta)).slice(0,6)
  };
  aggregate.roi = aggregate.investment ? (aggregate.realizedProfit/aggregate.investment)*100 : 0;
  aggregate.grossMargin = aggregate.revenue ? (aggregate.realizedProfit/aggregate.revenue)*100 : 0;
  const soldCost = summaries.flatMap(s=>s.ventas).reduce((a,v)=>a+Number(v.costoUnitario||0),0);
  aggregate.markup = soldCost ? (aggregate.realizedProfit/soldCost)*100 : 0;
  aggregate.recovery = aggregate.investment ? (aggregate.revenue/aggregate.investment)*100 : 0;
  aggregate.rotation = aggregate.registered ? (aggregate.sold/aggregate.registered)*100 : 0;
  aggregate.avgCost = aggregate.registered ? (aggregate.summaries.reduce((a,s)=>a+s.prendas.reduce((x,p)=>x+costOf(p),0),0)/aggregate.registered) : 0;
  aggregate.avgProfit = aggregate.sold ? aggregate.realizedProfit/aggregate.sold : 0;
  aggregate.potentialRoi = aggregate.inventoryCost ? (aggregate.potentialProfit/aggregate.inventoryCost)*100 : 0;
  return aggregate;
}

function interpretMetric(label, value){
  switch(label){
    case 'ROI': return value >= 30 ? 'Excelente retorno: el negocio está recuperando capital con buena utilidad.' : value >= 10 ? 'Rentabilidad saludable: la utilidad supera de forma aceptable la inversión.' : value > 0 ? 'Rentabilidad baja: conviene revisar precios y rotación.' : 'Sin rentabilidad o con pérdida: revisar costos y ventas.';
    case 'Margen bruto': return value >= 40 ? 'Margen fuerte: cada venta deja una utilidad comercial atractiva.' : value >= 25 ? 'Margen correcto para una boutique en crecimiento.' : value > 0 ? 'Margen ajustado: quizá el precio es bajo o el costo alto.' : 'Margen nulo o negativo: se vende por debajo del punto esperado.';
    case 'Markup': return value >= 60 ? 'La política de precio agrega valor sólido sobre el costo.' : value >= 30 ? 'Markup estable, competitivo y razonable.' : value > 0 ? 'Markup moderado: puede optimizarse la fijación de precio.' : 'No existe markup positivo; revisar costos o descuentos.';
    case 'Rotación': return value >= 70 ? 'Excelente rotación: el inventario se mueve con rapidez.' : value >= 40 ? 'Rotación media: buen avance, pero todavía hay stock por movilizar.' : value > 0 ? 'Rotación baja: conviene impulsar promoción o catálogo.' : 'Sin rotación todavía: no hay prendas vendidas.';
    case 'Recuperación': return value >= 100 ? 'La inversión ya se recuperó completamente con las ventas registradas.' : value >= 70 ? 'La empresa está cerca de recuperar el capital invertido.' : value > 0 ? 'Aún falta recuperar una parte importante de la inversión.' : 'No hay recuperación aún porque no existen ventas registradas.';
    case 'Rentabilidad potencial': return value >= 40 ? 'El inventario restante aún tiene una capacidad alta de utilidad.' : value >= 20 ? 'El potencial es bueno; mantener estrategias de venta.' : value > 0 ? 'El potencial es limitado; revisar estado y precios del inventario.' : 'El stock restante no está generando utilidad potencial.';
    default: return '';
  }
}

function renderDashboard(){
  const metric = metricScope(dashboardFilter);
  document.querySelectorAll('[data-dashboard-view]').forEach(b=>b.classList.toggle('active',b.dataset.dashboardView===dashboardView));
  $('dashResumen').classList.toggle('active',dashboardView==='resumen'); $('dashFinanzas').classList.toggle('active',dashboardView==='finanzas'); $('dashPrendas').classList.toggle('active',dashboardView==='prendas');
  $('mVentas').textContent = money(metric.revenue);
  $('mVentasSub').textContent = `${metric.sold} prenda(s) vendida(s)`;
  $('mInversion').textContent = money(metric.investment);
  $('mGanancia').textContent = money(metric.realizedProfit);
  $('mGananciaSub').textContent = `Utilidad real ${pct(metric.grossMargin)} sobre ventas`;
  $('mInventarioCosto').textContent = money(metric.inventoryCost);
  $('mPotencial').textContent = money(metric.potentialRevenue);
  $('mGananciaProy').textContent = money(metric.realizedProfit + metric.potentialProfit);
  $('mCostoPromedio').textContent = money(metric.avgCost);
  $('mRotacion').textContent = pct(metric.rotation);
  $('mRotacionSub').textContent = `${metric.sold} vendidas de ${metric.registered} registradas`;
  $('mDisponibles').textContent = num(metric.available);
  $('mReservadas').textContent = num(metric.reserved);
  $('mDanadas').textContent = num(metric.damaged);
  $('mVendidas').textContent = num(metric.sold);
  $('mSinRegistrar').textContent = num(metric.pending);
  $('mClientes').textContent = num(metric.clients);
  $('mROI').textContent = pct(metric.roi); $('mROISub').textContent = interpretMetric('ROI', metric.roi);
  $('mMargenBruto').textContent = pct(metric.grossMargin); $('mMargenBrutoSub').textContent = interpretMetric('Margen bruto', metric.grossMargin);
  $('mMarkup').textContent = pct(metric.markup); $('mMarkupSub').textContent = interpretMetric('Markup', metric.markup);
  $('mRecuperacion').textContent = pct(metric.recovery); $('mRecuperacionSub').textContent = interpretMetric('Recuperación', metric.recovery);
  $('mUtilidadPromedio').textContent = money(metric.avgProfit); $('mUtilidadPromedioSub').textContent = metric.sold ? 'Promedio de utilidad por prenda efectivamente vendida.' : 'Todavía no hay ventas cerradas.';
  $('mRentabilidadPot').textContent = pct(metric.potentialRoi); $('mRentabilidadPotSub').textContent = interpretMetric('Rentabilidad potencial', metric.potentialRoi);
  $('mPendientesEntrega').textContent = num(metric.pendingDeliveries); $('mPendientesEntregaSub').textContent = metric.pendingDeliveries ? 'Se recomienda seguimiento comercial.' : 'No hay pendientes de entrega.';
  $('mCostoDanadas').textContent = money(metric.damagedCost); $('mCostoDanadasSub').textContent = metric.damagedCost ? 'Capital inmovilizado por daño.' : 'No hay costo inmovilizado por daño.';

  const tabs = [{id:'all', label:'General'}].concat(db.stocks.map(s=>({id:s.id,label:s.nombre})));
  $('dashboardTabs').innerHTML = tabs.map(t=>`<button class="stock-tab ${dashboardFilter===t.id?'active':''}" data-stock-tab="${t.id}">${esc(t.label)}</button>`).join('');
  document.querySelectorAll('[data-stock-tab]').forEach(btn=>btn.addEventListener('click',()=>{ dashboardFilter=btn.dataset.stockTab; renderDashboard(); }));

  $('dashboardStockTable').innerHTML = db.stocks.length ? db.stocks.map(s=>{ const x=stockSummary(s); return `<tr><td>${esc(s.nombre)}</td><td>${esc(s.fecha)}</td><td>${s.cantidad}</td><td>${x.registered}</td><td>${x.sold}</td><td>${x.available}</td><td>${money(s.costoTotal)}</td><td>${money(x.revenue)}</td><td>${money(x.realizedProfit)}</td><td>${pct(x.roi)}</td><td>${pct(x.rotation)}</td></tr>`; }).join('') : '<tr><td colspan="11">No hay stocks registrados.</td></tr>';

  const indicators = [
    {label:'ROI', value:pct(metric.roi), text:interpretMetric('ROI', metric.roi)},
    {label:'Margen bruto', value:pct(metric.grossMargin), text:interpretMetric('Margen bruto', metric.grossMargin)},
    {label:'Markup promedio', value:pct(metric.markup), text:interpretMetric('Markup', metric.markup)},
    {label:'Recuperación de inversión', value:pct(metric.recovery), text:interpretMetric('Recuperación', metric.recovery)},
    {label:'Rotación del inventario', value:pct(metric.rotation), text:interpretMetric('Rotación', metric.rotation)},
    {label:'Rentabilidad potencial', value:pct(metric.potentialRoi), text:interpretMetric('Rentabilidad potencial', metric.potentialRoi)},
  ];
  $('extraIndicators').innerHTML = indicators.map(i=>`<div class="indicator-row"><div class="label"><span>${esc(i.label)}</span><span class="value">${esc(i.value)}</span></div><p>${esc(i.text)}</p></div>`).join('');

  $('recentSales').innerHTML = metric.recentSales.length ? metric.recentSales.map(v=>{const p=garmentById(v.prendaId);return `<div class="recent-item"><strong>${esc(v.cliente)}</strong><strong>${money(v.precioVenta)}</strong><span>${esc(p?.detalle||'Prenda')} · ${esc(stockName(v.stockId))}</span><small>${esc(v.fechaVenta)} · margen ${money(v.margen)}</small></div>`;}).join('') : '<div class="empty-state">Aún no hay ventas para mostrar.</div>';

  requestAnimationFrame(()=>renderCharts(metric));
}

function renderCharts(metric){
  if(!window.Chart) return;
  const summaries=(dashboardFilter==='all'?db.stocks.map(stockSummary):metric.summaries);
  const labels=summaries.map(s=>s.stock.nombre), investment=summaries.map(s=>Number(s.stock.costoTotal||0)), revenue=summaries.map(s=>s.revenue), profit=summaries.map(s=>s.realizedProfit);
  if(financialChart){financialChart.destroy();financialChart=null} if(inventoryChart){inventoryChart.destroy();inventoryChart=null} if(profitChart){profitChart.destroy();profitChart=null}
  if(dashboardView==='resumen') financialChart=new Chart($('financialChart'),{type:'bar',data:{labels,datasets:[{label:'INVERSION',data:investment,backgroundColor:'#e7c4d5'},{label:'VENTAS',data:revenue,backgroundColor:'#ef0b67'},{label:'GANANCIA',data:profit,backgroundColor:'#7318c9'}]},options:{...chartCommon(),scales:{y:{beginAtZero:true,ticks:{callback:v=>v.toLocaleString('es-BO')}}},plugins:{...chartCommon().plugins,datalabels:{...dataLabelOptions(),formatter:v=>v?Number(v).toLocaleString('es-BO'):''}}}});
  if(dashboardView==='prendas') inventoryChart=new Chart($('inventoryChart'),{type:'doughnut',data:{labels:['DISPONIBLE','RESERVADO','DANADO','VENDIDO','PENDIENTE DE REGISTRAR'],datasets:[{data:[metric.available,metric.reserved,metric.damaged,metric.sold,metric.pending],backgroundColor:['#57a67e','#d59c51','#d46f78','#171717','#b4a5ae']}]},options:{...chartCommon(),plugins:{...chartCommon().plugins,datalabels:{color:'#fff',formatter:v=>v||'',font:{weight:'800',size:12}}}}});
  if(dashboardView==='finanzas') profitChart=new Chart($('profitChart'),{type:'bar',data:{labels:['ROI','MARGEN BRUTO','MARKUP','RECUPERACION','RENTABILIDAD POTENCIAL'],datasets:[{label:'PORCENTAJE',data:[metric.roi,metric.grossMargin,metric.markup,metric.recovery,metric.potentialRoi],backgroundColor:['#171717','#d49ab5','#c08158','#6f8ba8','#7318c9']}]},options:{...chartCommon(),indexAxis:'y',scales:{x:{beginAtZero:true}},plugins:{...chartCommon().plugins,datalabels:{...dataLabelOptions(),align:'right',anchor:'end',formatter:v=>pct(v)}}}});
}

// -------- TALLAS --------
function optionSizes(selected='', includeAll=false){
  const ordered=[...db.tallas].sort((a,b)=>a.tipo.localeCompare(b.tipo)||a.nombre.localeCompare(b.nombre,undefined,{numeric:true}));
  return (includeAll?'<option value="">TODAS LAS TALLAS</option>':'<option value="">SELECCIONE TALLA...</option>')+ordered.map(t=>`<option value="${esc(t.nombre)}" ${selected===t.nombre?'selected':''}>${esc(t.nombre)} · ${esc(t.tipo)}</option>`).join('');
}
function renderSizes(){
  $('sizeCountBadge').textContent=`${db.tallas.length} TALLA(S)`;
  $('sizesTable').innerHTML=db.tallas.length?db.tallas.slice().sort((a,b)=>a.tipo.localeCompare(b.tipo)||a.nombre.localeCompare(b.nombre,undefined,{numeric:true})).map(t=>{const used=db.prendas.filter(p=>p.talla===t.nombre).length;return `<tr><td><strong>${esc(t.nombre)}</strong></td><td>${esc(t.tipo)}</td><td>${used}</td><td><div class="row-actions">${isAdmin()?`<button class="tiny-btn" onclick="editSize('${t.id}')">EDITAR</button><button class="tiny-btn" onclick="deleteSize('${t.id}')">ELIMINAR</button>`:'<span class="readonly-badge">SOLO LECTURA</span>'}</div></td></tr>`}).join(''):'<tr><td colspan="4">NO HAY TALLAS CATALOGADAS.</td></tr>';
  const current=$('prendaTalla').value; $('prendaTalla').innerHTML=optionSizes(current,false); if([...db.tallas].some(t=>t.nombre===current)) $('prendaTalla').value=current;
  const filterCurrent=$('filterSize').value; $('filterSize').innerHTML=optionSizes(filterCurrent,true); if([...db.tallas].some(t=>t.nombre===filterCurrent)) $('filterSize').value=filterCurrent;
}
$('sizeForm').addEventListener('submit',e=>{e.preventDefault();if(!requireAdmin()) return;const nombre=cleanText($('sizeName').value).trim(),tipo=cleanText($('sizeType').value).trim();if(!nombre){notify('INGRESA UNA TALLA.');return}if(db.tallas.some(t=>t.nombre===nombre)){notify('ESA TALLA YA EXISTE.');return}db.tallas.push({id:uid('SZ'),nombre,tipo});e.target.reset();persist();notify('TALLA AGREGADA AL CATALOGO.');});
window.editSize=id=>{ if(!requireAdmin()) return;const t=db.tallas.find(x=>x.id===id);if(!t)return;openModal(`EDITAR TALLA ${t.nombre}`,`<form id="editSizeForm" class="form-inline"><label><span>NOMBRE</span><input id="editSizeName" value="${esc(t.nombre)}"></label><label><span>CATEGORIA</span><select id="editSizeType"><option ${t.tipo==='LETRA'?'selected':''}>LETRA</option><option ${t.tipo==='NUMERICA'?'selected':''}>NUMERICA</option><option ${t.tipo==='INFANTIL'?'selected':''}>INFANTIL</option><option ${t.tipo==='OTRA'?'selected':''}>OTRA</option></select></label><div class="full gallery-actions"><button class="primary-btn" type="submit">GUARDAR CAMBIOS</button></div></form>`);$('editSizeForm').addEventListener('submit',e=>{e.preventDefault();const old=t.nombre,newName=cleanText($('editSizeName').value).trim();if(!newName)return;if(db.tallas.some(x=>x.id!==id&&x.nombre===newName)){notify('ESA TALLA YA EXISTE.');return}t.nombre=newName;t.tipo=cleanText($('editSizeType').value);db.prendas.forEach(p=>{if(p.talla===old)p.talla=newName});persist();closeModal();notify('TALLA ACTUALIZADA EN TODOS LOS MODULOS.');});};
window.deleteSize=id=>{ if(!requireAdmin()) return;const t=db.tallas.find(x=>x.id===id);if(!t)return;const used=db.prendas.filter(p=>p.talla===t.nombre).length;if(used){alert(`NO SE PUEDE ELIMINAR ${t.nombre}. ESTA EN USO POR ${used} PRENDA(S). EDITALA PARA REASIGNAR EL NOMBRE.`);return}if(confirm(`ELIMINAR LA TALLA ${t.nombre}?`)){db.tallas=db.tallas.filter(x=>x.id!==id);persist();notify('TALLA ELIMINADA.')}};

// -------- PRENDAS --------

function pendingCapacity(stockId){ const s=stockById(stockId); if(!s) return 0; return Math.max(0, Number(s.cantidad)-db.prendas.filter(p=>p.stockId===stockId).length); }
function updatePrendaStockInfo(){
  const s=stockById($('prendaStock').value); const pending=s?pendingCapacity(s.id):0;
  $('prendaCosto').value = money(s?.costoUnitario || 0);
  $('prendaCapacity').textContent = s ? `${pending} de ${s.cantidad} prendas por registrar` : 'Seleccione un stock';
  if(s) $('prendaCantidad').max = Math.max(1, pending);
  updateMarginPreview();
}
function updateMarginPreview(){ const s=stockById($('prendaStock').value); $('prendaMargenPreview').value = money(Number($('prendaPrecio').value||0)-Number(s?.costoUnitario||0)); }
$('prendaStock').addEventListener('change', updatePrendaStockInfo); $('prendaPrecio').addEventListener('input', updateMarginPreview);
$('prendaForm').addEventListener('submit', e=>{ e.preventDefault(); if(!requireAdmin()) return;
  const stock=stockById($('prendaStock').value), cantidad=Number($('prendaCantidad').value||0);
  if(!stock){ notify('Selecciona un stock.'); return; }
  const pending= pendingCapacity(stock.id); if(cantidad<1 || cantidad>pending){ notify(`Solo quedan ${pending} prendas por registrar en este stock.`); return; }
  for(let i=0;i<cantidad;i++){
    db.prendas.push({ id:uid('PR'), stockId:stock.id, detalle:cleanText($('prendaDetalle').value.trim()), marca:cleanText($('prendaMarca').value.trim()), color:cleanText($('prendaColor').value.trim()), genero:cleanText($('prendaGenero').value), talla:cleanText($('prendaTalla').value.trim()), costoUnitario:Number(stock.costoUnitario), precioVenta:Number($('prendaPrecio').value||0), estadoPrenda:$('prendaEstado').value, images: JSON.parse(JSON.stringify(tempImages)), creado:new Date().toISOString()});
  }
  e.target.reset(); $('prendaCantidad').value=1; tempImages=[]; renderTempImages(); persist(); updatePrendaStockInfo(); notify(`${cantidad} prenda(s) registrada(s).`);
});
function filteredGarments(){
  const stock=$('filterStock').value, state=$('filterState').value, sale=$('filterSale').value, talla=cleanText($('filterSize').value).trim(), q=cleanText($('filterSearch').value).trim();
  return db.prendas.filter(p=>{
    const sold=isSold(p.id);
    return (!stock || p.stockId===stock) && (!state || p.estadoPrenda===state) && (!sale || (sale==='si'?sold:!sold)) && (!talla || p.talla===talla) && (!q || cleanText([p.id,p.detalle,p.marca,p.color,p.genero,p.talla,stockName(p.stockId)].join(' ')).includes(q));
  });
}
['filterStock','filterState','filterSale','filterSize','filterSearch'].forEach(id=>$(id).addEventListener('input', renderPrendas));
$('selectAllVisible').addEventListener('change', e=> document.querySelectorAll('.garment-check').forEach(c=> c.checked=e.target.checked));
$('bulkApplyPrice').addEventListener('click', ()=>{ if(!requireAdmin()) return;
  const ids=[...document.querySelectorAll('.garment-check:checked')].map(c=>c.value); const val=Number($('bulkPrice').value||0);
  if(!ids.length){ notify('Selecciona al menos una prenda.'); return; }
  if(!(val>=0)){ notify('Ingresa un precio válido.'); return; }
  ids.forEach(id=>{ const p=garmentById(id); if(p) p.precioVenta = val; const sale=saleForGarment(id); if(sale){ sale.precioVenta=val; sale.costoUnitario=costOf(p); sale.margen = val-costOf(p); } });
  persist(); notify('Precios actualizados en la selección.');
});
function selectedGarmentIds(){ return [...document.querySelectorAll('.garment-check:checked')].map(c=>c.value); }
function addGarmentsToSale(ids){
  if(!requireAdmin()) return; const items = ids.map(garmentById).filter(p=>p && !isSold(p.id) && p.estadoPrenda!=='DANADO');
  if(!items.length){ notify('Las prendas seleccionadas no están disponibles para vender.'); return; }
  items.forEach(p=>{ if(!saleCart.some(x=>x.prendaId===p.id)) saleCart.push({prendaId:p.id, precio:priceOf(p)}); });
  const oneStock = [...new Set(items.map(p=>p.stockId))]; renderSaleSelectors(); if(oneStock.length===1){ $('saleStock').value=oneStock[0]; renderSaleProducts(); }
  renderSaleCart(); navigateTo('ventas'); notify(`${items.length} prenda(s) agregada(s) a la venta.`);
}
$('sellSelected').addEventListener('click', ()=>{ if(!requireAdmin()) return; addGarmentsToSale(selectedGarmentIds()); });
$('downloadSelectedImages').addEventListener('click', async()=>{ const ids=selectedGarmentIds(); if(!ids.length){ notify('Selecciona prendas con imágenes.'); return; } await downloadGarmentImages(ids); });
$('reportDownloadImages').addEventListener('click', async()=>{ const ids=selectedGarmentIds().length?selectedGarmentIds():filteredGarments().map(p=>p.id); if(!ids.length){ notify('No hay prendas seleccionadas o visibles.'); return;} await downloadGarmentImages(ids); });
$('exportCatalogPdf').addEventListener('click', ()=> exportCatalogPdf(selectedGarmentIds().length?selectedGarmentIds():filteredGarments().map(p=>p.id), true));
$('exportAvailableCatalog').addEventListener('click', ()=> exportCatalogPdf(db.prendas.filter(p=>!isSold(p.id) && p.estadoPrenda!=='DANADO').map(p=>p.id), false));
window.sellOne = id => { if(!requireAdmin()) return; addGarmentsToSale([id]); };
window.deleteGarment = id => { if(!requireAdmin()) return; if(confirm('¿Eliminar esta prenda?')){ db.prendas = db.prendas.filter(p=>p.id!==id); db.ventas = db.ventas.filter(v=>v.prendaId!==id); saleCart = saleCart.filter(x=>x.prendaId!==id); persist(); } };
window.cycleState = id => { if(!requireAdmin()) return; const p=garmentById(id); if(!p) return; const order=['DISPONIBLE','RESERVADO','DANADO']; p.estadoPrenda = order[(order.indexOf(p.estadoPrenda)+1)%order.length]; persist(); notify('Estado de prenda actualizado.'); };
window.previewGarment = id => showGarmentModal(id);
window.editGarment = id => { if(!requireAdmin()) return; showEditGarmentModal(id); };

function optionStocks(selected=''){ return '<option value="">SELECCIONE...</option>'+db.stocks.map(s=>`<option value="${esc(s.id)}" ${selected===s.id?'selected':''}>${esc(s.nombre)}</option>`).join(''); }
function renderStocks(){
  const currentPrendaStock=$('prendaStock').value, currentFilterStock=$('filterStock').value;
  $('stockCountBadge').textContent = `${db.stocks.length} stock(s)`;
  $('stocksTable').innerHTML = db.stocks.length ? db.stocks.map(s=>{ const x=stockSummary(s); return `<tr><td>${esc(s.nombre)}</td><td>${esc(s.fecha)}</td><td>${s.cantidad}</td><td>${x.registered}</td><td>${x.pending}</td><td>${money(s.costoTotal)}</td><td>${money(s.costoUnitario)}</td><td>${esc(s.proveedor||'-')}</td><td>${esc(s.proveedorCelular||'-')}</td><td>${esc(s.proveedorCiudad||'-')}</td><td><div class="row-actions"><button class="tiny-btn" onclick="viewStock('${s.id}')">VER</button>${isAdmin()?`<button class="tiny-btn" onclick="deleteStock('${s.id}')">ELIMINAR</button>`:''}</div></td></tr>`; }).join('') : '<tr><td colspan="11">No hay stocks registrados.</td></tr>';
  $('prendaStock').innerHTML = optionStocks(currentPrendaStock); if(db.stocks.some(s=>s.id===currentPrendaStock)) $('prendaStock').value=currentPrendaStock;
  $('filterStock').innerHTML = '<option value="">TODOS LOS STOCKS</option>'+db.stocks.map(s=>`<option value="${esc(s.id)}">${esc(s.nombre)}</option>`).join(''); if(db.stocks.some(s=>s.id===currentFilterStock)) $('filterStock').value=currentFilterStock;
  renderSaleSelectors();
}
window.viewStock = id => { const s=stockById(id); const x=stockSummary(s); openModal(`Detalle de ${s.nombre}`, `<div class="modal-grid"><div class="modal-section"><h4>Proveedor y compra</h4><div class="detail-list"><div><span>Fecha</span><strong>${esc(s.fecha)}</strong></div><div><span>Prendas declaradas</span><strong>${s.cantidad}</strong></div><div><span>Costo total</span><strong>${money(s.costoTotal)}</strong></div><div><span>Costo unitario</span><strong>${money(s.costoUnitario)}</strong></div><div><span>Proveedor</span><strong>${esc(s.proveedor||'-')}</strong></div><div><span>Celular</span><strong>${esc(s.proveedorCelular||'-')}</strong></div><div><span>Ciudad</span><strong>${esc(s.proveedorCiudad||'-')}</strong></div><div><span>Detalle proveedor</span><strong>${esc(s.proveedorDetalle||'-')}</strong></div><div><span>Observaciones</span><strong>${esc(s.observaciones||'-')}</strong></div></div></div><div class="modal-section"><h4>Indicadores del stock</h4><div class="detail-list"><div><span>Registradas</span><strong>${x.registered}</strong></div><div><span>Pendientes</span><strong>${x.pending}</strong></div><div><span>Vendidas</span><strong>${x.sold}</strong></div><div><span>Disponibles</span><strong>${x.available}</strong></div><div><span>Reservadas</span><strong>${x.reserved}</strong></div><div><span>Dañadas</span><strong>${x.damaged}</strong></div><div><span>Ventas</span><strong>${money(x.revenue)}</strong></div><div><span>Ganancia</span><strong>${money(x.realizedProfit)}</strong></div><div><span>ROI</span><strong>${pct(x.roi)}</strong></div><div><span>Rotación</span><strong>${pct(x.rotation)}</strong></div></div></div></div>`); };

function renderPrendas(){
  const rows=filteredGarments(); $('prendaCountBadge').textContent = `${rows.length} visible(s) · ${db.prendas.length} total`;
  $('prendasTable').innerHTML = rows.length ? rows.map(p=>{ const sold=isSold(p.id); const imgs=(p.images||[]); const stack = imgs.length ? imgs.slice(0,2).map(im=>`<img class="mini-photo" src="${im.dataUrl}" alt="foto" loading="lazy" decoding="async">`).join('') + (imgs.length>2?`<span>+${imgs.length-2}</span>`:'') : '<span>0</span>'; return `<tr><td><input class="garment-check" type="checkbox" value="${p.id}"></td><td>${esc(p.id.slice(-7))}</td><td>${esc(stockName(p.stockId))}</td><td><div class="photo-stack">${stack}</div></td><td><strong>${esc(p.detalle)}</strong></td><td>${esc(p.marca||'-')}</td><td>${esc(p.color||'-')}</td><td>${esc(p.talla||'-')}</td><td>${money(costOf(p))}</td><td>${money(priceOf(p))}</td><td>${money(marginOf(p))}</td><td><span class="badge ${stateClass(p.estadoPrenda)}">${esc(p.estadoPrenda)}</span></td><td><span class="badge ${sold?'sold':'unsold'}">${sold?'VENDIDO':'NO VENDIDO'}</span></td><td><div class="row-actions"><button class="tiny-btn" onclick="previewGarment('${p.id}')">VER</button>${isAdmin()?`<button class="tiny-btn" onclick="editGarment('${p.id}')">EDITAR</button>${!sold&&p.estadoPrenda!=='DANADO'?`<button class="tiny-btn" onclick="sellOne('${p.id}')">VENDER</button>`:''}`:''}</div></td></tr>`; }).join('') : '<tr><td colspan="14">No se encontraron prendas.</td></tr>';
  updatePrendaStockInfo();
}

function showGarmentModal(id){
  const p=garmentById(id); if(!p) return; const sale=saleForGarment(id);
  const gallery = (p.images||[]).length ? `<div class="gallery-grid">${p.images.map((im,i)=>`<div class="thumb"><img src="${im.dataUrl}" alt="Foto ${i+1}" loading="lazy" decoding="async"><small>Foto ${i+1}</small></div>`).join('')}</div><div class="gallery-actions"><button class="soft-btn" type="button" onclick="downloadSingleGarmentImages('${p.id}')">Descargar imágenes</button><button class="soft-btn" type="button" onclick="exportCatalogPdf(['${p.id}'], true)">PDF de esta prenda</button></div>` : '<div class="empty-state">No se cargaron fotografías.</div>';
  openModal(`Prenda ${p.id.slice(-7)} · ${p.detalle}`, `<div class="modal-grid"><div class="modal-section"><h4>Detalle general</h4><div class="detail-list"><div><span>Stock</span><strong>${esc(stockName(p.stockId))}</strong></div><div><span>Marca</span><strong>${esc(p.marca||'-')}</strong></div><div><span>Color</span><strong>${esc(p.color||'-')}</strong></div><div><span>Talla</span><strong>${esc(p.talla||'-')}</strong></div><div><span>Género</span><strong>${esc(p.genero||'-')}</strong></div><div><span>Costo</span><strong>${money(costOf(p))}</strong></div><div><span>Precio</span><strong>${money(priceOf(p))}</strong></div><div><span>Margen</span><strong>${money(marginOf(p))}</strong></div><div><span>Estado prenda</span><strong>${esc(p.estadoPrenda)}</strong></div><div><span>Estado venta</span><strong>${sale?'Vendido':'No vendido'}</strong></div></div></div><div class="modal-section"><h4>Datos de venta</h4>${sale?`<div class="detail-list"><div><span>Cliente</span><strong>${esc(sale.cliente)}</strong></div><div><span>Celular</span><strong>${esc(sale.celular||'-')}</strong></div><div><span>Fecha venta</span><strong>${esc(sale.fechaVenta)}</strong></div><div><span>Fecha entrega</span><strong>${esc(sale.fechaEntrega||'-')}</strong></div><div><span>Estado entrega</span><strong>${esc(sale.estadoEntrega)}</strong></div><div><span>Método pago</span><strong>${esc(sale.metodoPago)}</strong></div></div>`:'<div class="empty-state">Todavía no se vendió esta prenda.</div>'}</div><div class="modal-section full"><h4>Galería</h4>${gallery}</div></div>`);
}

function showEditGarmentModal(id){
  const p=garmentById(id); if(!p)return; const sale=saleForGarment(id);
  openModal(`EDITAR PRENDA ${p.id.slice(-7)}`,`<form id="editGarmentForm" class="modal-grid"><div class="modal-section"><h4>DATOS DE PRENDA</h4><div class="form-inline"><label><span>STOCK</span><select id="editStockId">${optionStocks(p.stockId)}</select></label><label><span>DETALLE</span><input id="editDetalle" value="${esc(p.detalle)}"></label><label><span>MARCA</span><input id="editMarca" value="${esc(p.marca)}"></label><label><span>COLOR</span><input id="editColor" value="${esc(p.color)}"></label><label><span>TALLA</span><select id="editTalla">${optionSizes(p.talla,false)}</select></label><label><span>GENERO</span><select id="editGenero"><option ${p.genero==='MUJER'?'selected':''}>MUJER</option><option ${p.genero==='HOMBRE'?'selected':''}>HOMBRE</option><option ${p.genero==='UNISEX'?'selected':''}>UNISEX</option><option ${p.genero==='NINO/A'?'selected':''}>NINO/A</option></select></label><label><span>PRECIO VENTA</span><input id="editPrecio" type="number" min="0" step="0.01" value="${priceOf(p)}"></label><label><span>ESTADO PRENDA</span><select id="editEstadoPrenda"><option ${p.estadoPrenda==='DISPONIBLE'?'selected':''}>DISPONIBLE</option><option ${p.estadoPrenda==='RESERVADO'?'selected':''}>RESERVADO</option><option ${p.estadoPrenda==='DANADO'?'selected':''}>DANADO</option></select></label><label><span>ESTADO VENTA</span><select id="editSaleState"><option value="no" ${sale?'':'selected'}>NO VENDIDO</option><option value="si" ${sale?'selected':''}>VENDIDO</option></select></label></div><div class="camera-zone"><div><span class="field-caption">AGREGAR FOTOGRAFIAS</span><p>USA CAMARA O GALERIA.</p></div><div class="camera-actions"><button id="editCameraBtn" class="primary-btn" type="button">📷 TOMAR FOTO</button><button id="editGalleryBtn" class="soft-btn" type="button">🖼 GALERIA</button></div><input id="editCamera" type="file" accept="image/*" capture="environment" hidden><input id="editGallery" type="file" accept="image/*" multiple hidden></div><div class="gallery-grid" id="existingEditGallery">${(p.images||[]).length?(p.images||[]).map((im,i)=>`<div class="thumb"><img src="${im.dataUrl}" alt="FOTO" loading="lazy" decoding="async"><small>FOTO ${i+1}</small></div>`).join(''):'<div class="empty-state">SIN FOTOS.</div>'}</div></div><div class="modal-section"><h4>VENTA VINCULADA</h4><div class="form-inline"><label><span>CLIENTE</span><input id="editCliente" value="${esc(sale?.cliente||'')}"></label><label><span>CELULAR</span><input id="editCelular" value="${esc(sale?.celular||'')}"></label><label><span>FECHA VENTA</span><input id="editFechaVenta" type="date" value="${esc(sale?.fechaVenta||today())}"></label><label><span>FECHA ENTREGA</span><input id="editFechaEntrega" type="date" value="${esc(sale?.fechaEntrega||'')}"></label><label><span>ESTADO ENTREGA</span><select id="editEstadoEntrega"><option ${sale?.estadoEntrega==='ENTREGADO'?'selected':''}>ENTREGADO</option><option ${sale?.estadoEntrega==='PENDIENTE'?'selected':''}>PENDIENTE</option><option ${sale?.estadoEntrega==='EN COORDINACION'?'selected':''}>EN COORDINACION</option></select></label><label><span>METODO DE PAGO</span><select id="editMetodoPago"><option ${sale?.metodoPago==='EFECTIVO'?'selected':''}>EFECTIVO</option><option ${sale?.metodoPago==='QR'?'selected':''}>QR</option><option ${sale?.metodoPago==='TRANSFERENCIA'?'selected':''}>TRANSFERENCIA</option><option ${sale?.metodoPago==='OTRO'?'selected':''}>OTRO</option></select></label></div><div class="gallery-actions"><button class="primary-btn" type="submit">GUARDAR CAMBIOS</button><button class="soft-btn" type="button" id="deleteSaleLink">QUITAR VENTA VINCULADA</button></div></div></form>`,()=>renderAll());
  let newImages=[]; const process=async files=>{for(const file of [...files]){const dataUrl=await fileToCompressedDataURL(file,960,.72,280*1024);if(dataUrl)newImages.push({localId:uid('LOCALIMG'),name:cleanText(file.name||'FOTO.JPG'),dataUrl})}$('existingEditGallery').innerHTML=(p.images||[]).concat(newImages).map((im,i)=>`<div class="thumb"><img src="${im.dataUrl}" alt="FOTO" loading="lazy" decoding="async"><small>FOTO ${i+1}</small></div>`).join('')};
  $('editCameraBtn').addEventListener('click',()=>$('editCamera').click()); $('editGalleryBtn').addEventListener('click',()=>$('editGallery').click()); $('editCamera').addEventListener('change',async e=>{await process(e.target.files);e.target.value=''}); $('editGallery').addEventListener('change',async e=>{await process(e.target.files);e.target.value=''});
  $('deleteSaleLink').addEventListener('click',()=>{if(confirm('QUITAR LA VENTA VINCULADA?')){db.ventas=db.ventas.filter(v=>v.prendaId!==id);persist(false);$('editSaleState').value='no';notify('VENTA DESVINCULADA.');closeModal();renderAll()}});
  $('editGarmentForm').addEventListener('submit',e=>{e.preventDefault();p.stockId=$('editStockId').value;p.detalle=cleanText($('editDetalle').value.trim());p.marca=cleanText($('editMarca').value.trim());p.color=cleanText($('editColor').value.trim());p.talla=cleanText($('editTalla').value);p.genero=cleanText($('editGenero').value);p.precioVenta=Number($('editPrecio').value||0);p.estadoPrenda=cleanText($('editEstadoPrenda').value);if(newImages.length)p.images=(p.images||[]).concat(newImages);const st=stockById(p.stockId);if(st)p.costoUnitario=Number(st.costoUnitario||p.costoUnitario);const shouldSold=$('editSaleState').value==='si';let v=saleForGarment(id);if(shouldSold){if(!v){v={id:uid('VEN'),prendaId:id,stockId:p.stockId,creado:new Date().toISOString()};db.ventas.push(v)}v.stockId=p.stockId;v.cliente=cleanText($('editCliente').value.trim()||'CLIENTE');v.celular=cleanText($('editCelular').value.trim());v.fechaVenta=$('editFechaVenta').value||today();v.fechaEntrega=$('editFechaEntrega').value;v.estadoEntrega=cleanText($('editEstadoEntrega').value);v.metodoPago=cleanText($('editMetodoPago').value);v.precioVenta=Number($('editPrecio').value||0);v.costoUnitario=costOf(p);v.margen=v.precioVenta-v.costoUnitario}else db.ventas=db.ventas.filter(x=>x.prendaId!==id);persist();notify('PRENDA ACTUALIZADA.');closeModal()});
}

// -------- VENTAS --------

function renderSaleSelectors(){
  const cur=$('saleStock').value;
  $('saleStock').innerHTML = '<option value="">SELECCIONE PRIMERO EL STOCK...</option>' + db.stocks.map(s=>`<option value="${esc(s.id)}">${esc(s.nombre)}</option>`).join('');
  if(db.stocks.some(s=>s.id===cur)) $('saleStock').value = cur;
  renderSaleProducts();
}
$('saleStock').addEventListener('change', renderSaleProducts);
function renderSaleProducts(){
  const stockId=$('saleStock').value;
  const products = db.prendas.filter(p=>p.stockId===stockId && !isSold(p.id) && p.estadoPrenda!=='DANADO' && !saleCart.some(x=>x.prendaId===p.id));
  $('saleProduct').disabled = !stockId;
  $('saleProduct').innerHTML = !stockId ? '<option value="">SELECCIONE UN STOCK PRIMERO</option>' : '<option value="">SELECCIONE UNA PRENDA...</option>' + products.map(p=>`<option value="${p.id}">${esc(p.detalle)} · ${esc(p.marca||'SIN MARCA')} · ${esc(p.color||'-')} · ${esc(p.talla||'-')} · ${money(priceOf(p))}</option>`).join('');
}
$('addSaleItem').addEventListener('click', ()=>{ if(!requireAdmin()) return; const id=$('saleProduct').value; if(!id){ notify('Selecciona una prenda.'); return; } if(!saleCart.some(x=>x.prendaId===id)){ saleCart.push({prendaId:id, precio:priceOf(garmentById(id))}); renderSaleCart(); notify('Prenda agregada a la operación.'); } });
window.updateCartPrice = (id,val)=>{ const item=saleCart.find(x=>x.prendaId===id); if(item){ item.precio=Number(val||0); renderSaleTotals(); } };
window.removeSaleItem = id => { saleCart = saleCart.filter(x=>x.prendaId!==id); renderSaleCart(); };
function renderSaleCart(){
  saleCart = saleCart.filter(x=>garmentById(x.prendaId) && !isSold(x.prendaId));
  $('saleCart').innerHTML = saleCart.length ? saleCart.map(item=>{ const p=garmentById(item.prendaId); const im=(p.images||[])[0]?.dataUrl; return `<div class="cart-row"><div class="cart-info"><strong>${esc(p.detalle)} · ${esc(p.marca||'SIN MARCA')}</strong><small>${esc(stockName(p.stockId))} · ${esc(p.color||'-')} · ${esc(p.talla||'-')} · Costo ${money(costOf(p))}</small></div><label class="cart-price"><span>Precio venta</span><input type="number" min="0" step="0.01" value="${Number(item.precio).toFixed(2)}" onchange="updateCartPrice('${p.id}',this.value)"></label><button class="remove-btn" onclick="removeSaleItem('${p.id}')">×</button></div>`; }).join('') : '<div class="empty-state">No hay prendas agregadas a la venta.</div>';
  renderSaleTotals(); renderSaleProducts();
}
function renderSaleTotals(){ const total=saleCart.reduce((a,x)=>a+Number(x.precio||0),0), profit=saleCart.reduce((a,x)=>a+Number(x.precio||0)-costOf(garmentById(x.prendaId)),0); $('saleTotal').textContent=money(total); $('saleProfit').textContent=`Ganancia estimada: ${money(profit)}`; }
$('saleForm').addEventListener('submit', e=>{ e.preventDefault(); if(!requireAdmin()) return;
  if(!saleCart.length){ notify('Agrega al menos una prenda a la venta.'); return; }
  for(const item of saleCart){
    const p=garmentById(item.prendaId); if(!p) continue;
    db.ventas.push({ id:uid('VEN'), prendaId:p.id, stockId:p.stockId, cliente:cleanText($('saleClient').value.trim()), celular:cleanText($('salePhone').value.trim()), fechaVenta:$('saleDate').value||today(), fechaEntrega:$('deliveryDate').value, estadoEntrega:$('deliveryState').value, metodoPago:$('paymentMethod').value, precioVenta:Number(item.precio||0), costoUnitario:costOf(p), margen:Number(item.precio||0)-costOf(p), creado:new Date().toISOString() });
    p.precioVenta = Number(item.precio||0);
  }
  saleCart=[]; e.target.reset(); $('saleDate').value=today(); $('deliveryDate').value=today(); persist(); renderSaleCart(); notify('Venta registrada con éxito.');
});
function renderSales(){
  $('salesCountBadge').textContent = `${db.ventas.length} venta(s)`;
  $('salesTable').innerHTML = db.ventas.length ? db.ventas.slice().sort((a,b)=>(b.creado||b.fechaVenta).localeCompare(a.creado||a.fechaVenta)).map(v=>{ const p=garmentById(v.prendaId); return `<tr><td>${esc(v.fechaVenta)}</td><td>${esc(stockName(v.stockId))}</td><td><strong>${esc(p?.detalle||v.prendaId)}</strong></td><td>${esc(v.cliente)}</td><td>${esc(v.celular||'-')}</td><td>${money(v.costoUnitario)}</td><td>${money(v.precioVenta)}</td><td>${money(v.margen)}</td><td>${esc(v.fechaEntrega||'-')} · ${esc(v.estadoEntrega||'-')}</td><td>${esc(v.metodoPago||'-')}</td><td><div class="row-actions">${isAdmin()?`<button class="tiny-btn" onclick="editGarment('${v.prendaId}')">EDITAR</button>`:'<span class="readonly-badge">SOLO LECTURA</span>'}</div></td></tr>`; }).join('') : '<tr><td colspan="11">No hay ventas registradas.</td></tr>';
}

// -------- CLIENTES --------
function clientRows(){
  const map = new Map();
  db.ventas.forEach(v=>{
    const key = clientKey(v); if(!key) return;
    const p = garmentById(v.prendaId);
    const row = map.get(key) || {cliente:v.cliente, celular:v.celular, prendas:0, total:0, profit:0, last:v.fechaVenta, items:[]};
    row.prendas++; row.total += Number(v.precioVenta||0); row.profit += Number(v.margen||0); if(v.fechaVenta > row.last) row.last = v.fechaVenta;
    row.items.push({venta:v, prenda:p}); map.set(key,row);
  });
  return [...map.values()].sort((a,b)=>b.total-a.total);
}
function renderClients(){
  const rows=clientRows(); $('cUnique').textContent=num(rows.length); $('cRepeat').textContent=num(rows.filter(c=>c.prendas>1).length); $('cAverage').textContent=money(rows.length ? rows.reduce((a,c)=>a+c.total,0)/rows.length : 0);
  $('clientsTable').innerHTML = rows.length ? rows.map((c,i)=>`<tr><td><strong>${esc(c.cliente)}</strong></td><td>${esc(c.celular||'-')}</td><td>${c.prendas}</td><td>${money(c.total)}</td><td>${money(c.profit)}</td><td>${esc(c.last)}</td><td><button class="tiny-btn" onclick="viewClient(${i})">Ver detalle</button></td></tr>`).join('') : '<tr><td colspan="7">Aún no hay clientes registrados mediante ventas.</td></tr>';
  window.__clientRows = rows;
}
window.viewClient = idx => {
  const c = (window.__clientRows||[])[idx]; if(!c) return;
  const body = `<div class="modal-grid"><div class="modal-section"><h4>Resumen del cliente</h4><div class="detail-list"><div><span>Cliente</span><strong>${esc(c.cliente)}</strong></div><div><span>Celular</span><strong>${esc(c.celular||'-')}</strong></div><div><span>Prendas compradas</span><strong>${c.prendas}</strong></div><div><span>Total comprado</span><strong>${money(c.total)}</strong></div><div><span>Ganancia generada</span><strong>${money(c.profit)}</strong></div><div><span>Última compra</span><strong>${esc(c.last)}</strong></div></div></div><div class="modal-section full"><h4>Detalle de compras</h4><div class="customer-grid">${c.items.map(item=>`<div class="customer-item">${item.prenda?.images?.[0]?.dataUrl?`<img src="${item.prenda.images[0].dataUrl}" alt="Prenda" loading="lazy" decoding="async">`:'<div class="empty-state">Sin foto</div>'}<div><strong>${esc(item.prenda?.detalle||'Prenda')}</strong><div class="detail-list"><div><span>Stock</span><strong>${esc(stockName(item.venta.stockId))}</strong></div><div><span>Marca / color</span><strong>${esc(item.prenda?.marca||'-')} · ${esc(item.prenda?.color||'-')}</strong></div><div><span>Talla</span><strong>${esc(item.prenda?.talla||'-')}</strong></div><div><span>Venta</span><strong>${money(item.venta.precioVenta)}</strong></div><div><span>Margen</span><strong>${money(item.venta.margen)}</strong></div><div><span>Entrega</span><strong>${esc(item.venta.fechaEntrega||'-')} · ${esc(item.venta.estadoEntrega)}</strong></div></div></div></div>`).join('')}</div></div></div>`;
  openModal(`Cliente · ${c.cliente}`, body);
};

// -------- USUARIOS --------
function renderUsers(){
  if(!$('usersTable')) return; const visitors=db.users||[]; $('uVisitorCount').textContent=num(visitors.length); $('uActiveCount').textContent=num(visitors.filter(u=>u.activo).length);
  const adminRow=`<tr><td><span class="badge sold">ADMIN</span></td><td><strong>${ADMIN_CREDENTIALS.nombre}</strong></td><td>${ADMIN_CREDENTIALS.usuario}</td><td>•••••••</td><td><span class="badge available">ACTIVO</span></td><td>CUENTA FIJA</td><td><span class="readonly-badge">PROTEGIDO</span></td></tr>`;
  const visitorRows=visitors.map(u=>`<tr><td><span class="badge unsold">VISITA</span></td><td><strong>${esc(u.nombre)}</strong></td><td>${esc(u.usuario)}</td><td>•••••••</td><td><span class="badge ${u.activo?'available':'damaged'}">${u.activo?'ACTIVO':'INACTIVO'}</span></td><td>${esc((u.creado||'').slice(0,10)||'-')}</td><td><div class="row-actions"><button class="tiny-btn" onclick="editVisitor('${u.id}')">EDITAR</button><button class="tiny-btn" onclick="toggleVisitor('${u.id}')">${u.activo?'DESACTIVAR':'ACTIVAR'}</button><button class="tiny-btn" onclick="deleteVisitor('${u.id}')">ELIMINAR</button></div></td></tr>`).join('');
  $('usersTable').innerHTML=adminRow+visitorRows;
}
$('userForm').addEventListener('submit',e=>{
  e.preventDefault(); if(!requireAdmin()) return; const nombre=cleanText($('visitorName').value).trim(), usuario=cleanText($('visitorUser').value).trim(), clave=cleanText($('visitorPass').value).trim(); const activo=$('visitorActive').value==='SI';
  if(!nombre||!usuario||!clave){notify('COMPLETE TODOS LOS DATOS DEL USUARIO VISITA.');return;} if(usuario===ADMIN_CREDENTIALS.usuario||db.users.some(u=>u.usuario===usuario)){notify('ESE USUARIO YA EXISTE.');return;}
  db.users.push({id:uid('USR'),nombre,usuario,clave,rol:'VISITA',activo,creado:new Date().toISOString()}); e.target.reset(); persist(); notify('USUARIO VISITA CREADO.');
});
window.editVisitor=id=>{ if(!requireAdmin())return; const u=db.users.find(x=>x.id===id);if(!u)return;openModal(`EDITAR USUARIO ${u.usuario}`,`<form id="editVisitorForm" class="form-inline"><label><span>NOMBRE</span><input id="euName" value="${esc(u.nombre)}"></label><label><span>USUARIO</span><input id="euUser" value="${esc(u.usuario)}"></label><label><span>NUEVA CONTRASENA</span><input id="euPass" type="password" value="" placeholder="DEJAR VACIO PARA CONSERVAR"></label><label><span>ESTADO</span><select id="euActive"><option value="SI" ${u.activo?'selected':''}>ACTIVO</option><option value="NO" ${!u.activo?'selected':''}>INACTIVO</option></select></label><div class="full gallery-actions"><button class="primary-btn" type="submit">GUARDAR CAMBIOS</button></div></form>`);$('editVisitorForm').addEventListener('submit',e=>{e.preventDefault();const usuario=cleanText($('euUser').value).trim();if(!usuario||usuario===ADMIN_CREDENTIALS.usuario||db.users.some(x=>x.id!==id&&x.usuario===usuario)){notify('USUARIO NO VALIDO O REPETIDO.');return;}u.nombre=cleanText($('euName').value).trim();u.usuario=usuario;u.clave=cleanText($('euPass').value).trim();u.activo=$('euActive').value==='SI';persist();closeModal();notify('USUARIO ACTUALIZADO.');});};
window.toggleVisitor=id=>{if(!requireAdmin())return;const u=db.users.find(x=>x.id===id);if(!u)return;u.activo=!u.activo;persist();notify(u.activo?'USUARIO ACTIVADO.':'USUARIO DESACTIVADO.');};
window.deleteVisitor=id=>{if(!requireAdmin())return;const u=db.users.find(x=>x.id===id);if(!u)return;if(confirm(`ELIMINAR EL USUARIO VISITA ${u.usuario}?`)){db.users=db.users.filter(x=>x.id!==id);persist();notify('USUARIO ELIMINADO.');}};

// -------- DOWNLOADS / REPORTS --------
async function downloadDataUrl(dataUrl, filename){
  let href=dataUrl, revoke=false;
  if(!String(dataUrl).startsWith('data:')){ const r=await fetch(dataUrl,{credentials:'same-origin'}); if(!r.ok)throw new Error('NO SE PUDO DESCARGAR LA IMAGEN'); href=URL.createObjectURL(await r.blob()); revoke=true; }
  const a=document.createElement('a');a.href=href;a.download=filename;document.body.appendChild(a);a.click();a.remove();if(revoke)setTimeout(()=>URL.revokeObjectURL(href),500);
}
window.downloadSingleGarmentImages = async id => downloadGarmentImages([id]);
async function downloadGarmentImages(ids){
  let count=0;
  for(const id of ids){
    const p=garmentById(id); if(!p || !p.images?.length) continue;
    for(let i=0;i<p.images.length;i++){
      await downloadDataUrl(p.images[i].dataUrl, `${sanitizeFileName(stockName(p.stockId))}_${sanitizeFileName(p.detalle)}_${i+1}.jpg`);
      count++; await sleep(180);
    }
  }
  notify(count ? `${count} imagen(es) preparadas para descarga.` : 'Las prendas seleccionadas no tienen imágenes.');
}
function sanitizeFileName(name){ return String(name||'archivo').replace(/[^a-z0-9_\-]+/gi,'_').slice(0,60); }

$('exportExcel').addEventListener('click', async()=>{
  if(!(await ensureXLSX())){ alert('NO SE PUDO CARGAR EL MODULO DE EXCEL. REVISA TU CONEXION A INTERNET.'); return; }
  const general = metricScope('all');
  const resumen = [
    {Indicador:'Ventas acumuladas', Valor:general.revenue},
    {Indicador:'Inversión', Valor:general.investment},
    {Indicador:'Ganancia realizada', Valor:general.realizedProfit},
    {Indicador:'Inventario a costo', Valor:general.inventoryCost},
    {Indicador:'Venta potencial restante', Valor:general.potentialRevenue},
    {Indicador:'Ganancia proyectada total', Valor:general.realizedProfit+general.potentialProfit},
    {Indicador:'Costo promedio', Valor:general.avgCost},
    {Indicador:'ROI %', Valor:general.roi},
    {Indicador:'Margen bruto %', Valor:general.grossMargin},
    {Indicador:'Markup %', Valor:general.markup},
    {Indicador:'Recuperación %', Valor:general.recovery},
    {Indicador:'Rotación %', Valor:general.rotation},
    {Indicador:'Rentabilidad potencial %', Valor:general.potentialRoi}
  ];
  const stocks = db.stocks.map(s=>{ const x=stockSummary(s); return {Stock:s.nombre, Fecha:s.fecha, Prendas:s.cantidad, Registradas:x.registered, Pendientes:x.pending, Vendidas:x.sold, Disponibles:x.available, Reservadas:x.reserved, Danadas:x.damaged, Inversion:s.costoTotal, Costo_unitario:s.costoUnitario, Proveedor:s.proveedor, Celular_proveedor:s.proveedorCelular, Ciudad:s.proveedorCiudad, Ventas:x.revenue, Ganancia:x.realizedProfit, ROI_porcentaje:x.roi, Rotacion_porcentaje:x.rotation}; });
  const prendas = db.prendas.map(p=>({Codigo:p.id, Stock:stockName(p.stockId), Detalle:p.detalle, Marca:p.marca, Color:p.color, Genero:p.genero, Talla:p.talla, Costo_unitario:costOf(p), Precio_venta:priceOf(p), Margen:marginOf(p), Estado_prenda:p.estadoPrenda, Estado_venta:isSold(p.id)?'Vendido':'No vendido', Fotos:(p.images||[]).length}));
  const ventas = db.ventas.map(v=>({Fecha:v.fechaVenta, Stock:stockName(v.stockId), Prenda:garmentById(v.prendaId)?.detalle||v.prendaId, Cliente:v.cliente, Celular:v.celular, Costo_unitario:v.costoUnitario, Precio_venta:v.precioVenta, Margen:v.margen, Fecha_entrega:v.fechaEntrega, Estado_entrega:v.estadoEntrega, Metodo_pago:v.metodoPago}));
  const clientes = clientRows().map(c=>({Cliente:c.cliente, Celular:c.celular, Prendas:c.prendas, Total:c.total, Ganancia:c.profit, Ultima_compra:c.last}));
  const tallas = db.tallas.map(t=>({Talla:t.nombre,Categoria:t.tipo,Prendas_en_uso:db.prendas.filter(p=>p.talla===t.nombre).length}));
  const wb = XLSX.utils.book_new(); [['Resumen',resumen],['Stocks',stocks],['Tallas',tallas],['Prendas',prendas],['Ventas',ventas],['Clientes',clientes]].forEach(([n,d])=>XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(d), n));
  XLSX.writeFile(wb, `URBAN_CLICK_reporte_${today()}.xlsx`);
});

async function sourceToDataUrl(src){
  if(!src) return null; if(src.startsWith('data:')) return src;
  const r=await fetch(src,{credentials:'same-origin'}); if(!r.ok) throw new Error('NO SE PUDO LEER LA IMAGEN'); const blob=await r.blob();
  return new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=reject;fr.readAsDataURL(blob)});
}
async function addLogoToPdf(doc, x=12, y=8, w=24, h=24){ try{ doc.addImage(window.RS_LOGO_DATA_URL, 'JPEG', x, y, w, h); }catch(err){ console.warn('Logo PDF', err); } }
$('exportPdf').addEventListener('click', async()=>{
  if(!(await ensurePDF())){ alert('NO SE PUDO CARGAR EL MODULO PDF. REVISA TU CONEXION A INTERNET.'); return; }
  const {jsPDF}=window.jspdf; const doc=new jsPDF({orientation:'landscape', unit:'mm', format:'a4'}); const m=metricScope('all');
  doc.setFillColor(115,24,201); doc.rect(0,0,297,28,'F'); await addLogoToPdf(doc,12,2,22,22); doc.setTextColor(255,255,255); doc.setFontSize(17); doc.text('URBAN CLICK · Reporte de ventas', 38, 12); doc.setFontSize(9); doc.text(`Generado: ${new Date().toLocaleString('es-BO')}`, 38, 18); doc.text('GRACIAS POR SU COMPRA', 38, 23); doc.setFontSize(7.5); doc.text('PROPIETARIA: MONICA FELIX ERQUICIA', 180, 23);
  doc.setTextColor(47,36,48); doc.setFontSize(9.5); doc.text(`Inversión: ${money(m.investment)}   Ventas: ${money(m.revenue)}   Ganancia: ${money(m.realizedProfit)}   ROI: ${pct(m.roi)}`, 14, 35);
  doc.autoTable({startY:40, theme:'grid', styles:{fontSize:7.2, cellPadding:2}, headStyles:{fillColor:[91,52,83]}, head:[['Fecha','Stock','Prenda','Cliente','Celular','Costo unit.','Venta','Margen','Entrega','Pago']], body:db.ventas.map(v=>[v.fechaVenta, stockName(v.stockId), garmentById(v.prendaId)?.detalle||v.prendaId, v.cliente, v.celular||'-', money(v.costoUnitario), money(v.precioVenta), money(v.margen), `${v.fechaEntrega||'-'} · ${v.estadoEntrega||'-'}`, v.metodoPago||'-'])});
  doc.save(`URBAN_CLICK_ventas_${today()}.pdf`);
});

window.exportCatalogPdf=async(ids,selectedMode=false)=>{
  let items=ids.map(garmentById).filter(Boolean).filter(p=>!isSold(p.id)&&p.estadoPrenda!=='DANADO');
  if(!items.length){notify('NO HAY PRENDAS COMERCIALIZABLES PARA EL CATALOGO.');return} if(!(await ensurePDF())){alert('NO SE PUDO CARGAR EL MODULO PDF. REVISA TU CONEXION A INTERNET.');return}
  const {jsPDF}=window.jspdf;const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});const perPage=2;
  for(let i=0;i<items.length;i++){
    if(i>0 && i%perPage===0)doc.addPage(); const pos=i%perPage; if(pos===0){doc.setFillColor(115,24,201);doc.rect(0,0,210,27,'F');await addLogoToPdf(doc,10,3,20,20);doc.setTextColor(255,255,255);doc.setFontSize(18);doc.text('URBAN CLICK',36,11);doc.setFontSize(8.5);doc.text('GRACIAS POR SU COMPRA',36,18);doc.setFontSize(7.5);doc.text('CATALOGO PARA CLIENTES',160,17);doc.setFontSize(6.2);doc.text('MONICA FELIX ERQUICIA',126,23)}
    const p=items[i], top=pos===0?34:158; doc.setFillColor(252,247,250);doc.roundedRect(9,top,192,116,6,6,'F');doc.setDrawColor(232,215,224);doc.roundedRect(9,top,192,116,6,6,'S');
    let img=window.RS_LOGO_DATA_URL;try{if(p.images?.[0]?.dataUrl)img=await sourceToDataUrl(p.images[0].dataUrl);doc.addImage(img,'JPEG',14,top+6,78,102)}catch(e){}
    doc.setTextColor(115,24,201);doc.setFontSize(15);doc.text(String(p.detalle||'PRENDA').slice(0,32),100,top+17);doc.setFontSize(9);doc.setTextColor(85,69,80);doc.text(`MARCA: ${p.marca||'-'}`,100,top+30);doc.text(`COLOR: ${p.color||'-'}`,100,top+41);doc.text(`TALLA: ${p.talla||'-'}`,100,top+52);doc.setFontSize(18);doc.setTextColor(115,24,201);doc.text(money(priceOf(p)),100,top+70);doc.setFillColor(p.estadoPrenda==='RESERVADO'?245:229,p.estadoPrenda==='RESERVADO'?232:244,p.estadoPrenda==='RESERVADO'?210:235);doc.roundedRect(100,top+80,42,11,5,5,'F');doc.setFontSize(8);doc.setTextColor(115,24,201);doc.text(p.estadoPrenda,105,top+87);doc.setFontSize(8);doc.setTextColor(126,105,118);doc.text('CONSULTA DISPONIBILIDAD Y ENTREGA CON URBAN CLICK',100,top+103);
  }
  doc.setTextColor(130,110,122);doc.setFontSize(7.5);doc.text('URBAN CLICK · MONICA FELIX ERQUICIA',10,291);doc.save(`URBAN_CLICK_CATALOGO_${today()}.pdf`);
};

// -------- BACKUPS --------
async function exportBackup(){
  if(!requireAdmin())return; notify('PREPARANDO RESPALDO COMPLETO...'); const data=clone(db);
  for(const p of data.prendas){ for(const im of p.images||[]){ if(im.dataUrl&&!im.dataUrl.startsWith('data:')){ try{im.dataUrl=await sourceToDataUrl(im.dataUrl)}catch(_){im.dataUrl=''} } } }
  const blob=new Blob([JSON.stringify({app:'URBAN CLICK',version:7,exportedAt:new Date().toISOString(),source:'CLOUDFLARE D1',data},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`URBAN_CLICK_respaldo_${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);notify('RESPALDO COMPLETO GENERADO.');
}
$('exportBackup').addEventListener('click',exportBackup);$('quickBackup').addEventListener('click',exportBackup);
$('importBackup').addEventListener('change',e=>{const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const obj=JSON.parse(reader.result),data=obj.data||obj;if(!data.stocks||!data.prendas||!data.ventas)throw new Error('FORMATO');db=normalizeDB(data);saleCart=[];persist();notify('RESPALDO ENVIADO A LA BASE DE DATOS.')}catch(err){alert('EL ARCHIVO NO CORRESPONDE A UN RESPALDO VALIDO DE URBAN CLICK.')}};reader.readAsText(file);e.target.value=''});
$('resetData').addEventListener('click',async()=>{if(!requireAdmin())return;if(confirm('ESTA ACCION BORRARA STOCKS, PRENDAS, VENTAS, FOTOS Y USUARIOS VISITA DE LA NUBE. ¿CONTINUAR?')){const typed=prompt('ESCRIBE BORRAR TODO PARA CONFIRMAR');if(cleanText(typed)!=='BORRAR TODO')return;try{const r=await apiFetch('/api/reset',{method:'POST',body:'{}'});if(!r.ok)throw new Error();const p=await r.json();serverRevision=Number(p.revision||0);db=cloneEmpty();lastSynced=clone(db);lastPersisted=JSON.stringify(db);saleCart=[];dashboardFilter='all';tempImages=[];undoStack=[];redoStack=[];renderTempImages();renderAll();notify('BASE DE DATOS RESTAURADA A CERO.')}catch(_){notify('NO SE PUDO REINICIAR LA BASE DE DATOS.')}}});

function renderAll(){ renderStocks(); renderSizes(); renderPrendas(); renderSaleSelectors(); renderSaleCart(); renderSales(); renderClients(); renderUsers(); renderDashboard(); if(currentSession) applyRoleUI(); }
$('stockFecha').value=today();$('saleDate').value=today();$('deliveryDate').value=today();updateStockCostPreview();renderTempImages();renderAll();
(async function boot(){
  try{const r=await apiFetch('/api/auth/me',{method:'GET'});if(!r.ok){showLogin();return}const p=await r.json();currentSession={rol:p.user.rol,usuario:p.user.usuario,nombre:p.user.nombre,userId:p.user.uid};await loadRemoteData(true);$('loginScreen').classList.add('hidden');$('appShell').classList.remove('auth-locked');applyRoleUI();renderAll()}catch(_){showLogin()}
})();
