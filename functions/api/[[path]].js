const enc = new TextEncoder();

function clean(value){
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
}
function json(data,status=200,headers={}){
  return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});
}
function getCookie(request,name){
  const raw=request.headers.get('cookie')||'';
  for(const part of raw.split(';')){ const [k,...v]=part.trim().split('='); if(k===name) return decodeURIComponent(v.join('=')); }
  return '';
}
async function sha256(text){
  const h=await crypto.subtle.digest('SHA-256',enc.encode(text));
  return [...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
function randomHex(bytes=16){
  const a=new Uint8Array(bytes); crypto.getRandomValues(a);
  return [...a].map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function createSession(DB,user){
  const token=randomHex(32);
  const tokenHash=await sha256(token);
  const expires=new Date(Date.now()+8*60*60*1000).toISOString().replace('T',' ').slice(0,19);
  await DB.prepare("DELETE FROM sessions WHERE expires_at <= CURRENT_TIMESTAMP").run();
  await DB.prepare("INSERT INTO sessions(id,user_id,token_hash,expires_at,creado) VALUES(?,?,?,?,CURRENT_TIMESTAMP)")
    .bind(`SES-${crypto.randomUUID()}`,user.id,tokenHash,expires).run();
  return token;
}
async function readSession(request,env){
  if(!env.DB) return null;
  const token=getCookie(request,'uc_session'); if(!token) return null;
  const tokenHash=await sha256(token);
  let row;
  try{
    row=await env.DB.prepare(`SELECT u.id AS uid,u.rol,u.usuario,u.nombre,s.expires_at
      FROM sessions s JOIN users u ON u.id=s.user_id
      WHERE s.token_hash=? AND u.activo=1 AND s.expires_at>CURRENT_TIMESTAMP LIMIT 1`).bind(tokenHash).first();
  }catch(_){ return null; }
  if(!row) return null;
  return {uid:row.uid,rol:row.rol,usuario:row.usuario,nombre:row.nombre,exp:row.expires_at};
}
async function requireSession(context,role){
  const session=await readSession(context.request,context.env);
  if(!session) return {error:json({error:'NO_AUTORIZADO'},401)};
  if(role && session.rol!==role) return {error:json({error:'PERMISO_DENEGADO'},403)};
  return {session};
}
async function bumpRevision(DB){
  await DB.prepare("UPDATE app_meta SET revision=revision+1, updated_at=CURRENT_TIMESTAMP WHERE id=1").run();
  const r=await DB.prepare("SELECT revision FROM app_meta WHERE id=1").first(); return Number(r?.revision||0);
}
function imageUrl(id){ return `/api/image?id=${encodeURIComponent(id)}`; }


async function ensureSchema(DB){
  const statements = [
    DB.prepare(`CREATE TABLE IF NOT EXISTS app_meta (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      revision INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    DB.prepare(`INSERT OR IGNORE INTO app_meta (id, revision) VALUES (1, 0)`),
    DB.prepare(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      usuario TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      rol TEXT NOT NULL CHECK (rol IN ('ADMIN','VISITA')),
      activo INTEGER NOT NULL DEFAULT 1,
      creado TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    DB.prepare(`CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      creado TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    DB.prepare(`CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`),
    DB.prepare(`CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at)`),
    DB.prepare(`CREATE TABLE IF NOT EXISTS tallas (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL UNIQUE,
      tipo TEXT NOT NULL,
      creado TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    DB.prepare(`CREATE TABLE IF NOT EXISTS stocks (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      fecha TEXT NOT NULL,
      cantidad INTEGER NOT NULL,
      costo_total REAL NOT NULL DEFAULT 0,
      costo_unitario REAL NOT NULL DEFAULT 0,
      proveedor TEXT NOT NULL DEFAULT '',
      proveedor_celular TEXT NOT NULL DEFAULT '',
      proveedor_ciudad TEXT NOT NULL DEFAULT '',
      proveedor_detalle TEXT NOT NULL DEFAULT '',
      observaciones TEXT NOT NULL DEFAULT '',
      creado TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    DB.prepare(`CREATE INDEX IF NOT EXISTS idx_stocks_fecha ON stocks(fecha)`),
    DB.prepare(`CREATE TABLE IF NOT EXISTS prendas (
      id TEXT PRIMARY KEY,
      stock_id TEXT NOT NULL,
      detalle TEXT NOT NULL,
      marca TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT '',
      genero TEXT NOT NULL DEFAULT 'MUJER',
      talla TEXT NOT NULL DEFAULT '',
      costo_unitario REAL NOT NULL DEFAULT 0,
      precio_venta REAL NOT NULL DEFAULT 0,
      estado_prenda TEXT NOT NULL DEFAULT 'DISPONIBLE',
      creado TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    DB.prepare(`CREATE INDEX IF NOT EXISTS idx_prendas_stock ON prendas(stock_id)`),
    DB.prepare(`CREATE INDEX IF NOT EXISTS idx_prendas_estado ON prendas(estado_prenda)`),
    DB.prepare(`CREATE INDEX IF NOT EXISTS idx_prendas_talla ON prendas(talla)`),
    DB.prepare(`CREATE TABLE IF NOT EXISTS ventas (
      id TEXT PRIMARY KEY,
      prenda_id TEXT NOT NULL,
      stock_id TEXT NOT NULL,
      cliente TEXT NOT NULL,
      celular TEXT NOT NULL DEFAULT '',
      fecha_venta TEXT NOT NULL,
      fecha_entrega TEXT NOT NULL DEFAULT '',
      estado_entrega TEXT NOT NULL DEFAULT 'ENTREGADO',
      metodo_pago TEXT NOT NULL DEFAULT 'EFECTIVO',
      precio_venta REAL NOT NULL DEFAULT 0,
      costo_unitario REAL NOT NULL DEFAULT 0,
      margen REAL NOT NULL DEFAULT 0,
      creado TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    DB.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_ventas_prenda_unique ON ventas(prenda_id)`),
    DB.prepare(`CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha_venta)`),
    DB.prepare(`CREATE INDEX IF NOT EXISTS idx_ventas_stock ON ventas(stock_id)`),
    DB.prepare(`CREATE INDEX IF NOT EXISTS idx_ventas_cliente ON ventas(cliente)`),
    DB.prepare(`CREATE TABLE IF NOT EXISTS garment_images (
      id TEXT PRIMARY KEY,
      prenda_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
      size_bytes INTEGER NOT NULL DEFAULT 0,
      image_data BLOB NOT NULL,
      creado TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    DB.prepare(`CREATE INDEX IF NOT EXISTS idx_images_prenda ON garment_images(prenda_id)`)
  ];
  await DB.batch(statements);
  const sizes=[['SZ-XS','XS','LETRA'],['SZ-S','S','LETRA'],['SZ-M','M','LETRA'],['SZ-L','L','LETRA'],['SZ-XL','XL','LETRA'],['SZ-XXL','XXL','LETRA'],['SZ-34','34','NUMERICA'],['SZ-36','36','NUMERICA'],['SZ-38','38','NUMERICA'],['SZ-40','40','NUMERICA'],['SZ-42','42','NUMERICA']];
  const sizeStatements=sizes.map(x=>DB.prepare(`INSERT OR IGNORE INTO tallas(id,nombre,tipo,creado,updated_at) VALUES(?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`).bind(...x));
  await DB.batch(sizeStatements);
}

async function schemaStatus(DB){
  const required=['app_meta','users','sessions','tallas','stocks','prendas','ventas','garment_images'];
  const r=await DB.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all();
  const names=new Set((r.results||[]).map(x=>x.name));
  const missing=required.filter(x=>!names.has(x));
  return {ok:missing.length===0,missing};
}

async function ensureFixedAdmin(DB){
  const salt='URBANCLICKADMIN2026';
  const hash=await sha256(`${salt}:ADMIN`);
  await DB.batch([
    DB.prepare("DELETE FROM users WHERE usuario='ADMIN' OR id='USR-ADMIN'"),
    DB.prepare("INSERT INTO users(id,nombre,usuario,password_hash,password_salt,rol,activo,creado,updated_at) VALUES('USR-ADMIN','MONICA FELIX ERQUICIA','ADMIN',?,?, 'ADMIN',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").bind(hash,salt)
  ]);
}

async function handleLogin(context){
  if(!context.env.DB) return json({error:'D1_NO_VINCULADA',message:'FALTA EL BINDING DB EN CLOUDFLARE PAGES'},500);
  try{ await ensureSchema(context.env.DB); }catch(err){ return json({error:'BASE_NO_INICIALIZADA',message:'NO SE PUDO PREPARAR LA BASE D1',detail:String(err?.message||err)},500); }
  const body=await context.request.json().catch(()=>({})); const usuario=clean(body.usuario), clave=clean(body.clave);
  if(!usuario||!clave) return json({error:'DATOS_INCOMPLETOS'},400);
  // La cuenta fija solicitada por la propietaria se repara automaticamente si la base viene de una version anterior.
  if(usuario==='ADMIN' && clave==='ADMIN'){
    try{ await ensureFixedAdmin(context.env.DB); }
    catch(err){ return json({error:'BASE_NO_INICIALIZADA',message:'EJECUTA schema.sql EN LA BASE D1',detail:String(err?.message||err)},500); }
  }
  let u;
  try{
    u=await context.env.DB.prepare("SELECT id,nombre,usuario,password_hash,password_salt,rol,activo FROM users WHERE usuario=? LIMIT 1").bind(usuario).first();
  }catch(err){
    return json({error:'BASE_NO_INICIALIZADA',message:'EJECUTA schema.sql EN LA BASE D1',detail:String(err?.message||err)},500);
  }
  if(!u||!u.activo) return json({error:'CREDENCIALES_INVALIDAS'},401);
  const hash=await sha256(`${u.password_salt}:${clave}`); if(hash!==u.password_hash) return json({error:'CREDENCIALES_INVALIDAS'},401);
  let token;
  try{ token=await createSession(context.env.DB,u); }
  catch(err){ return json({error:'SESIONES_NO_INICIALIZADAS',message:'EJECUTA MIGRACION_SESIONES.sql EN D1',detail:String(err?.message||err)},500); }
  return json({ok:true,user:{id:u.id,nombre:u.nombre,usuario:u.usuario,rol:u.rol}},200,{'set-cookie':`uc_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`});
}
async function handleMe(context){
  const a=await requireSession(context); if(a.error) return a.error; return json({ok:true,user:a.session});
}
async function handleLogout(context){
  try{
    const token=getCookie(context.request,'uc_session');
    if(token && context.env.DB){ const tokenHash=await sha256(token); await context.env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(tokenHash).run(); }
  }catch(_){}
  return json({ok:true},200,{'set-cookie':'uc_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'});
}

async function handleBootstrap(context){
  const a=await requireSession(context); if(a.error) return a.error; const DB=context.env.DB;
  try{ await ensureSchema(DB); }catch(err){ return json({error:'BASE_NO_INICIALIZADA',message:'NO SE PUDO PREPARAR LA BASE D1',detail:String(err?.message||err)},500); }
  const meta=await DB.prepare("SELECT revision FROM app_meta WHERE id=1").first(); const revision=Number(meta?.revision||0);
  const etag=`\"uc-${revision}\"`; if(context.request.headers.get('if-none-match')===etag) return new Response(null,{status:304,headers:{etag,'cache-control':'no-store'}});
  const queries=[
    DB.prepare("SELECT id,nombre,fecha,cantidad,costo_total,costo_unitario,proveedor,proveedor_celular,proveedor_ciudad,proveedor_detalle,observaciones,creado FROM stocks ORDER BY fecha DESC, creado DESC"),
    DB.prepare("SELECT id,nombre,tipo,creado FROM tallas ORDER BY CASE tipo WHEN 'LETRA' THEN 0 WHEN 'NUMERICA' THEN 1 ELSE 2 END, nombre"),
    DB.prepare("SELECT id,stock_id,detalle,marca,color,genero,talla,costo_unitario,precio_venta,estado_prenda,creado FROM prendas ORDER BY creado DESC"),
    DB.prepare("SELECT id,prenda_id,stock_id,cliente,celular,fecha_venta,fecha_entrega,estado_entrega,metodo_pago,precio_venta,costo_unitario,margen,creado FROM ventas ORDER BY fecha_venta DESC, creado DESC"),
    DB.prepare("SELECT id,prenda_id,file_name,mime_type,size_bytes,creado FROM garment_images ORDER BY creado"),
  ];
  if(a.session.rol==='ADMIN') queries.push(DB.prepare("SELECT id,nombre,usuario,rol,activo,creado FROM users WHERE rol='VISITA' ORDER BY creado DESC"));
  const res=await DB.batch(queries);
  const [stocksR,tallasR,prendasR,ventasR,imagesR,usersR]=res;
  const imagesBy=new Map(); for(const im of (imagesR?.results||[])){ const arr=imagesBy.get(im.prenda_id)||[]; arr.push({id:im.id,name:im.file_name,dataUrl:imageUrl(im.id),mimeType:im.mime_type,size:Number(im.size_bytes||0)}); imagesBy.set(im.prenda_id,arr); }
  const data={version:7,
    stocks:(stocksR?.results||[]).map(s=>({id:s.id,nombre:s.nombre,fecha:s.fecha,cantidad:Number(s.cantidad),costoTotal:Number(s.costo_total),costoUnitario:Number(s.costo_unitario),proveedor:s.proveedor,proveedorCelular:s.proveedor_celular,proveedorCiudad:s.proveedor_ciudad,proveedorDetalle:s.proveedor_detalle,observaciones:s.observaciones,creado:s.creado})),
    tallas:(tallasR?.results||[]).map(t=>({id:t.id,nombre:t.nombre,tipo:t.tipo,creado:t.creado})),
    prendas:(prendasR?.results||[]).map(p=>({id:p.id,stockId:p.stock_id,detalle:p.detalle,marca:p.marca,color:p.color,genero:p.genero,talla:p.talla,costoUnitario:Number(p.costo_unitario),precioVenta:Number(p.precio_venta),estadoPrenda:p.estado_prenda,images:imagesBy.get(p.id)||[],creado:p.creado})),
    ventas:(ventasR?.results||[]).map(v=>({id:v.id,prendaId:v.prenda_id,stockId:v.stock_id,cliente:v.cliente,celular:v.celular,fechaVenta:v.fecha_venta,fechaEntrega:v.fecha_entrega,estadoEntrega:v.estado_entrega,metodoPago:v.metodo_pago,precioVenta:Number(v.precio_venta),costoUnitario:Number(v.costo_unitario),margen:Number(v.margen),creado:v.creado})),
    users:a.session.rol==='ADMIN'?(usersR?.results||[]).map(u=>({id:u.id,nombre:u.nombre,usuario:u.usuario,clave:'',rol:'VISITA',activo:Boolean(u.activo),creado:u.creado})):[]
  };
  return json({ok:true,revision,data,user:a.session},200,{etag});
}
async function handleRevision(context){ const a=await requireSession(context); if(a.error)return a.error; const r=await context.env.DB.prepare("SELECT revision,updated_at FROM app_meta WHERE id=1").first(); return json({revision:Number(r?.revision||0),updatedAt:r?.updated_at||''}); }

function deleteStmt(DB,table,id){ return DB.prepare(`DELETE FROM ${table} WHERE id=?`).bind(id); }
async function handleSync(context){
  const a=await requireSession(context,'ADMIN'); if(a.error)return a.error; const DB=context.env.DB;
  const body=await context.request.json().catch(()=>({})); const expected=Number(body.revision); const changes=body.changes||{};
  const meta=await DB.prepare("SELECT revision FROM app_meta WHERE id=1").first(); const current=Number(meta?.revision||0);
  if(Number.isFinite(expected)&&expected!==current) return json({error:'REVISION_CONFLICT',revision:current},409);
  const stmts=[];
  for(const id of changes.stocks?.delete||[]) stmts.push(deleteStmt(DB,'stocks',id));
  for(const s of changes.stocks?.upsert||[]) stmts.push(DB.prepare(`INSERT INTO stocks(id,nombre,fecha,cantidad,costo_total,costo_unitario,proveedor,proveedor_celular,proveedor_ciudad,proveedor_detalle,observaciones,creado,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET nombre=excluded.nombre,fecha=excluded.fecha,cantidad=excluded.cantidad,costo_total=excluded.costo_total,costo_unitario=excluded.costo_unitario,proveedor=excluded.proveedor,proveedor_celular=excluded.proveedor_celular,proveedor_ciudad=excluded.proveedor_ciudad,proveedor_detalle=excluded.proveedor_detalle,observaciones=excluded.observaciones,updated_at=CURRENT_TIMESTAMP`).bind(s.id,clean(s.nombre),s.fecha,Number(s.cantidad||0),Number(s.costoTotal||0),Number(s.costoUnitario||0),clean(s.proveedor),clean(s.proveedorCelular),clean(s.proveedorCiudad),clean(s.proveedorDetalle),clean(s.observaciones),s.creado||new Date().toISOString()));
  for(const id of changes.tallas?.delete||[]) stmts.push(deleteStmt(DB,'tallas',id));
  for(const t of changes.tallas?.upsert||[]) stmts.push(DB.prepare(`INSERT INTO tallas(id,nombre,tipo,creado,updated_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET nombre=excluded.nombre,tipo=excluded.tipo,updated_at=CURRENT_TIMESTAMP`).bind(t.id,clean(t.nombre),clean(t.tipo),t.creado||new Date().toISOString()));
  for(const id of changes.prendas?.delete||[]){ stmts.push(DB.prepare("DELETE FROM garment_images WHERE prenda_id=?").bind(id)); stmts.push(deleteStmt(DB,'prendas',id)); }
  for(const p of changes.prendas?.upsert||[]) stmts.push(DB.prepare(`INSERT INTO prendas(id,stock_id,detalle,marca,color,genero,talla,costo_unitario,precio_venta,estado_prenda,creado,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET stock_id=excluded.stock_id,detalle=excluded.detalle,marca=excluded.marca,color=excluded.color,genero=excluded.genero,talla=excluded.talla,costo_unitario=excluded.costo_unitario,precio_venta=excluded.precio_venta,estado_prenda=excluded.estado_prenda,updated_at=CURRENT_TIMESTAMP`).bind(p.id,p.stockId,clean(p.detalle),clean(p.marca),clean(p.color),clean(p.genero),clean(p.talla),Number(p.costoUnitario||0),Number(p.precioVenta||0),clean(p.estadoPrenda),p.creado||new Date().toISOString()));
  for(const id of changes.ventas?.delete||[]) stmts.push(deleteStmt(DB,'ventas',id));
  for(const v of changes.ventas?.upsert||[]) stmts.push(DB.prepare(`INSERT INTO ventas(id,prenda_id,stock_id,cliente,celular,fecha_venta,fecha_entrega,estado_entrega,metodo_pago,precio_venta,costo_unitario,margen,creado,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET prenda_id=excluded.prenda_id,stock_id=excluded.stock_id,cliente=excluded.cliente,celular=excluded.celular,fecha_venta=excluded.fecha_venta,fecha_entrega=excluded.fecha_entrega,estado_entrega=excluded.estado_entrega,metodo_pago=excluded.metodo_pago,precio_venta=excluded.precio_venta,costo_unitario=excluded.costo_unitario,margen=excluded.margen,updated_at=CURRENT_TIMESTAMP`).bind(v.id,v.prendaId,v.stockId,clean(v.cliente),clean(v.celular),v.fechaVenta,v.fechaEntrega||'',clean(v.estadoEntrega),clean(v.metodoPago),Number(v.precioVenta||0),Number(v.costoUnitario||0),Number(v.margen||0),v.creado||new Date().toISOString()));
  for(const id of changes.users?.delete||[]) stmts.push(DB.prepare("DELETE FROM users WHERE id=? AND rol='VISITA'").bind(id));
  for(const u of changes.users?.upsert||[]){
    const clave=clean(u.clave||'');
    if(clave){ const salt=randomHex(16), hash=await sha256(`${salt}:${clave}`); stmts.push(DB.prepare(`INSERT INTO users(id,nombre,usuario,password_hash,password_salt,rol,activo,creado,updated_at) VALUES(?,?,?,?,?,'VISITA',?,?,CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET nombre=excluded.nombre,usuario=excluded.usuario,password_hash=excluded.password_hash,password_salt=excluded.password_salt,activo=excluded.activo,updated_at=CURRENT_TIMESTAMP`).bind(u.id,clean(u.nombre),clean(u.usuario),hash,salt,u.activo?1:0,u.creado||new Date().toISOString())); }
    else stmts.push(DB.prepare("UPDATE users SET nombre=?,usuario=?,activo=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND rol='VISITA'").bind(clean(u.nombre),clean(u.usuario),u.activo?1:0,u.id));
  }
  if(!stmts.length) return json({ok:true,revision:current});
  stmts.push(DB.prepare("UPDATE app_meta SET revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=1"));
  try{ await DB.batch(stmts); }catch(err){ return json({error:'SYNC_ERROR',message:String(err?.message||err)},400); }
  const next=await DB.prepare("SELECT revision FROM app_meta WHERE id=1").first(); return json({ok:true,revision:Number(next?.revision||current+1)});
}

async function handleImageUpload(context){
  const a=await requireSession(context,'ADMIN'); if(a.error)return a.error;
  const form=await context.request.formData();
  const prendaId=String(form.get('prendaId')||'');
  const file=form.get('file');
  const name=clean(form.get('name')||file?.name||'FOTO.JPG');
  if(!prendaId||!file||typeof file==='string') return json({error:'IMAGEN_INVALIDA'},400);
  if(!String(file.type||'').startsWith('image/')) return json({error:'TIPO_NO_PERMITIDO'},400);
  // La interfaz comprime las fotos antes de subirlas. Este tope protege el limite de 2 MB por fila de D1.
  if(Number(file.size||0)>850*1024) return json({error:'IMAGEN_MUY_GRANDE',message:'LA FOTO DEBE QUEDAR POR DEBAJO DE 850 KB'},413);
  const exists=await context.env.DB.prepare("SELECT id FROM prendas WHERE id=? LIMIT 1").bind(prendaId).first();
  if(!exists) return json({error:'PRENDA_NO_EXISTE'},404);
  const id=`IMG-${crypto.randomUUID()}`;
  const bytes=await file.arrayBuffer();
  await context.env.DB.prepare("INSERT INTO garment_images(id,prenda_id,file_name,mime_type,size_bytes,image_data,creado) VALUES(?,?,?,?,?,?,CURRENT_TIMESTAMP)")
    .bind(id,prendaId,name,file.type||'image/jpeg',Number(file.size||bytes.byteLength||0),bytes).run();
  const revision=await bumpRevision(context.env.DB);
  return json({ok:true,revision,ref:{id,name,dataUrl:imageUrl(id),mimeType:file.type||'image/jpeg',size:Number(file.size||bytes.byteLength||0)}});
}
async function handleImageGet(context){
  const a=await requireSession(context); if(a.error)return a.error;
  const url=new URL(context.request.url); const id=url.searchParams.get('id')||'';
  if(!id.startsWith('IMG-')) return new Response('Not found',{status:404});
  const row=await context.env.DB.prepare("SELECT mime_type,size_bytes,image_data FROM garment_images WHERE id=? LIMIT 1").bind(id).first();
  if(!row||!row.image_data) return new Response('Not found',{status:404});
  const body=new Uint8Array(row.image_data);
  const headers=new Headers({'content-type':row.mime_type||'image/jpeg','content-length':String(row.size_bytes||body.byteLength),'cache-control':'private, max-age=86400','etag':`"${id}"`});
  return new Response(body,{headers});
}
async function handleReset(context){
  const a=await requireSession(context,'ADMIN'); if(a.error)return a.error;
  const DB=context.env.DB;
  const stmts=[DB.prepare("DELETE FROM garment_images"),DB.prepare("DELETE FROM ventas"),DB.prepare("DELETE FROM prendas"),DB.prepare("DELETE FROM stocks"),DB.prepare("DELETE FROM tallas"),DB.prepare("DELETE FROM users WHERE rol='VISITA'")];
  const sizes=[['SZ-XS','XS','LETRA'],['SZ-S','S','LETRA'],['SZ-M','M','LETRA'],['SZ-L','L','LETRA'],['SZ-XL','XL','LETRA'],['SZ-XXL','XXL','LETRA'],['SZ-34','34','NUMERICA'],['SZ-36','36','NUMERICA'],['SZ-38','38','NUMERICA'],['SZ-40','40','NUMERICA'],['SZ-42','42','NUMERICA']];
  for(const s of sizes) stmts.push(DB.prepare("INSERT INTO tallas(id,nombre,tipo,creado,updated_at) VALUES(?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").bind(...s));
  stmts.push(DB.prepare("UPDATE app_meta SET revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=1"));
  await DB.batch(stmts);
  const r=await DB.prepare("SELECT revision FROM app_meta WHERE id=1").first();
  return json({ok:true,revision:Number(r?.revision||0)});
}

export async function onRequest(context){
  try{
    const parts=Array.isArray(context.params.path)?context.params.path:[context.params.path].filter(Boolean); const route=parts.join('/'); const method=context.request.method.toUpperCase();
    if(route==='auth/login'&&method==='POST') return handleLogin(context);
    if(route==='auth/logout'&&method==='POST') return handleLogout(context);
    if(route==='auth/me'&&method==='GET') return handleMe(context);
    if(route==='bootstrap'&&method==='GET') return handleBootstrap(context);
    if(route==='revision'&&method==='GET') return handleRevision(context);
    if(route==='sync'&&method==='POST') return handleSync(context);
    if(route==='images'&&method==='POST') return handleImageUpload(context);
    if(route==='image'&&method==='GET') return handleImageGet(context);
    if(route==='reset'&&method==='POST') return handleReset(context);
    if(route==='health'){ if(!context.env.DB) return json({ok:true,service:'URBAN CLICK API',db:false,sessions:'D1',schema:false}); try{ await ensureSchema(context.env.DB); const st=await schemaStatus(context.env.DB); return json({ok:true,service:'URBAN CLICK API',db:true,sessions:'D1',schema:st.ok,missing:st.missing}); }catch(err){ return json({ok:false,service:'URBAN CLICK API',db:true,sessions:'D1',schema:false,error:String(err?.message||err)},500); } }
    return json({error:'NO_ENCONTRADO'},404);
  }catch(err){ return json({error:'SERVER_ERROR',message:String(err?.message||err)},500); }
}
