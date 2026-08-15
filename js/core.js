(() => {
  'use strict';
  const AW = window.AW = {};
  AW.APP_KEY = 'aw9_state_v1';
  AW.CLOUD_PATH = 'companies/aw9/state';
  AW.DEFAULT_EMAIL = 'shaniwaris80@gmail.com';

  AW.uid = (p='id') => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
  AW.today = () => new Date().toISOString().slice(0,10);
  AW.money = n => `${Number(n||0).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})} €`;
  AW.num = (n,d=2) => Number(n||0).toLocaleString('es-ES',{maximumFractionDigits:d});
  AW.round2 = n => Math.round((Number(n||0)+Number.EPSILON)*100)/100;
  AW.esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  AW.monthKey = d => String(d||AW.today()).slice(0,7);
  AW.quarterOf = d => Math.floor((Number(String(d).slice(5,7))-1)/3)+1;

  const seedProducts = [
    ['MACHO MADURO','MM','box_kg','kg',22,1.60,1.90,4],
    ['MACHO VERDE','MV','box_kg','kg',22,1.25,1.55,4],
    ['BANANA','BN','box_kg','kg',19,1.00,1.25,4],
    ['YUCA','YU','kg','kg',0,1.40,1.95,4],
    ['CILANTRO','CL','unit','manojo',0,.40,.60,10],
    ['AGUACATE PREMIUM','AP','box','caja',0,18,20,4],
    ['MANGO','MG','box','caja',0,10.80,12,4]
  ].map(([name,code,mode,unit,kgBox,buyPrice,sellPrice,vat])=>({
    id:AW.uid('prod'),name,code,mode,unit,kgBox,buyPrice,sellPrice,vat,stockQty:0,active:true
  }));

  const seedClients = [
    ['ADNAN ASIF','X7128589S',''],
    ['ABBAS','',''],
    ['NADEEM','',''],
    ['BIBIANA ARBOLEDA','49540238D','ARANDA DE DUERO']
  ].map(([name,nif,address])=>({id:AW.uid('cli'),name,nif,address,phone:'',email:'',paymentTerm:0,active:true}));

  AW.defaultState = () => ({
    version:'aw9-0.1',
    settings:{
      companyName:'Mohammad Arslan Waris',
      companyNif:'',
      companyAddress:'Burgos',
      loginEmail:AW.DEFAULT_EMAIL,
      stockWarnBelow:0
    },
    products:seedProducts,
    clients:seedClients,
    invoices:[],
    payments:[],
    audit:[],
    lastUpdated:Date.now()
  });

  AW.normalize = s => {
    const d = AW.defaultState();
    const x = s && typeof s==='object' ? s : {};
    return {
      ...d,...x,
      settings:{...d.settings,...(x.settings||{})},
      products:Array.isArray(x.products)?x.products:d.products,
      clients:Array.isArray(x.clients)?x.clients:d.clients,
      invoices:Array.isArray(x.invoices)?x.invoices:[],
      payments:Array.isArray(x.payments)?x.payments:[],
      audit:Array.isArray(x.audit)?x.audit:[]
    };
  };

  AW.state = AW.normalize(JSON.parse(localStorage.getItem(AW.APP_KEY)||'null'));
  AW.cloud = {enabled:false,auth:null,db:null,user:null,mode:'local',saveTimer:null};

  AW.saveLocal = () => {
    AW.state.lastUpdated = Date.now();
    localStorage.setItem(AW.APP_KEY, JSON.stringify(AW.state));
    AW.dispatch('aw:saved',{mode:AW.cloud.enabled?'cloud':'local'});
  };

  AW.save = () => {
    AW.saveLocal();
    if(!AW.cloud.enabled || !AW.cloud.db || !AW.cloud.user) return;
    clearTimeout(AW.cloud.saveTimer);
    AW.dispatch('aw:saving',{});
    AW.cloud.saveTimer=setTimeout(async()=>{
      try{
        await AW.cloud.db.ref(AW.CLOUD_PATH).set(AW.state);
        AW.dispatch('aw:saved',{mode:'cloud'});
      }catch(err){AW.dispatch('aw:error',{message:'No se pudo guardar en Firebase: '+err.message});}
    },450);
  };

  AW.dispatch = (name,detail) => window.dispatchEvent(new CustomEvent(name,{detail}));

  AW.firebaseConfigured = () => {
    const c=window.AW9_FIREBASE_CONFIG||{};
    return !!(c.apiKey && c.authDomain && c.databaseURL && c.projectId);
  };

  AW.initFirebase = async () => {
    if(!AW.firebaseConfigured()) return false;
    if(!firebase.apps.length) firebase.initializeApp(window.AW9_FIREBASE_CONFIG);
    AW.cloud.auth=firebase.auth();
    AW.cloud.db=firebase.database();
    return true;
  };

  AW.login = async (email,password,remember=true) => {
    if(!(await AW.initFirebase())) throw new Error('Firebase nuevo todavía no está configurado.');
    await AW.cloud.auth.setPersistence(remember ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION);
    const cred=await AW.cloud.auth.signInWithEmailAndPassword(email,password);
    AW.cloud.user=cred.user; AW.cloud.enabled=true; AW.cloud.mode='cloud';
    await AW.loadCloud();
    return cred.user;
  };

  AW.restoreSession = async () => {
    if(!(await AW.initFirebase())) return null;
    return new Promise(resolve=>{
      const off=AW.cloud.auth.onAuthStateChanged(async user=>{
        off();
        if(user){
          AW.cloud.user=user;AW.cloud.enabled=true;AW.cloud.mode='cloud';
          await AW.loadCloud();
        }
        resolve(user||null);
      });
    });
  };

  AW.logout = async () => {
    if(AW.cloud.auth) await AW.cloud.auth.signOut();
    AW.cloud.user=null;AW.cloud.enabled=false;AW.cloud.mode='local';
  };

  AW.loadCloud = async () => {
    const snap=await AW.cloud.db.ref(AW.CLOUD_PATH).once('value');
    if(snap.exists()){
      AW.state=AW.normalize(snap.val());
      AW.saveLocal();
    }else{
      await AW.cloud.db.ref(AW.CLOUD_PATH).set(AW.state);
    }
  };

  AW.addAudit=(action,meta={})=>{
    AW.state.audit.unshift({id:AW.uid('audit'),date:new Date().toISOString(),action,meta});
    AW.state.audit=AW.state.audit.slice(0,500);
  };

  AW.findClient=id=>AW.state.clients.find(x=>x.id===id);
  AW.findProduct=id=>AW.state.products.find(x=>x.id===id);

  AW.invoiceCalc = inv => {
    let base=0,vat=0;
    (inv.lines||[]).forEach(l=>{
      const lineBase=AW.round2(Number(l.qty||0)*Number(l.price||0));
      base+=lineBase;
      vat+=AW.round2(lineBase*Number(l.vat||0)/100);
    });
    base=AW.round2(base);vat=AW.round2(vat);
    const total=AW.round2(base+vat);
    const paid=AW.round2(Number(inv.paidAmount||0));
    return {base,vat,total,paid,pending:Math.max(0,AW.round2(total-paid))};
  };

  AW.invoiceStatus = inv => {
    if(inv.status==='cancelled') return 'cancelled';
    if(inv.status==='draft') return 'draft';
    const c=AW.invoiceCalc(inv);
    if(c.total>0 && c.pending<=0) return 'paid';
    if(c.paid>0) return 'partial';
    const due=inv.dueDate||inv.date;
    if(due && due<AW.today()) return 'overdue';
    return 'pending';
  };

  AW.activeInvoices = () => AW.state.invoices.filter(i=>i.status!=='cancelled' && i.status!=='draft');

  AW.clientStats = clientId => {
    const invoices=AW.state.invoices.filter(i=>i.clientId===clientId && i.status!=='cancelled' && i.status!=='draft');
    return invoices.reduce((a,i)=>{
      const c=AW.invoiceCalc(i);a.count++;a.base+=c.base;a.vat+=c.vat;a.total+=c.total;a.paid+=c.paid;a.pending+=c.pending;return a;
    },{count:0,base:0,vat:0,total:0,paid:0,pending:0});
  };

  AW.periodStats = (year,month=null,quarter=null) => {
    const invoices=AW.activeInvoices().filter(i=>{
      if(String(i.date).slice(0,4)!==String(year)) return false;
      if(month && Number(String(i.date).slice(5,7))!==Number(month)) return false;
      if(quarter && AW.quarterOf(i.date)!==Number(quarter)) return false;
      return true;
    });
    return invoices.reduce((a,i)=>{
      const c=AW.invoiceCalc(i);a.invoices.push(i);a.count++;a.base+=c.base;a.vat+=c.vat;a.total+=c.total;a.paid+=c.paid;a.pending+=c.pending;return a;
    },{invoices:[],count:0,base:0,vat:0,total:0,paid:0,pending:0});
  };

  AW.stockDisplay = p => {
    const qty=Number(p.stockQty||0);
    if(p.mode==='box_kg' && Number(p.kgBox)>0){
      const full=Math.floor(qty/Number(p.kgBox));
      const rem=AW.round2(qty-full*Number(p.kgBox));
      return {main:`${full} 📦${rem>0?` + ${AW.num(rem)} kg`:''}`,sub:`${AW.num(qty)} kg · ${AW.num(p.kgBox)} kg/caja`,cost:qty*Number(p.buyPrice||0),sale:qty*Number(p.sellPrice||0)};
    }
    if(p.mode==='box') return {main:`${AW.num(qty)} 📦`,sub:`${AW.num(qty)} cajas`,cost:qty*Number(p.buyPrice||0),sale:qty*Number(p.sellPrice||0)};
    return {main:`${AW.num(qty)} ${p.unit||''}`,sub:p.unit||'',cost:qty*Number(p.buyPrice||0),sale:qty*Number(p.sellPrice||0)};
  };

  AW.stockTotals = () => AW.state.products.reduce((a,p)=>{
    const s=AW.stockDisplay(p);a.cost+=s.cost;a.sale+=s.sale;if(p.mode==='box')a.boxes+=Number(p.stockQty||0);if(p.mode==='box_kg'&&p.kgBox)a.boxes+=Math.floor(Number(p.stockQty||0)/Number(p.kgBox));return a;
  },{cost:0,sale:0,boxes:0});

  AW.nextInvoiceNo = () => {
    const year=AW.today().slice(0,4);
    const nums=AW.state.invoices.map(i=>String(i.number||'')).filter(n=>n.startsWith(year+'-')).map(n=>Number(n.split('-')[1])||0);
    return `${year}-${String((Math.max(0,...nums)+1)).padStart(4,'0')}`;
  };

  AW.createInvoice = data => {
    const inv={
      id:AW.uid('inv'),number:data.number||'',date:data.date||AW.today(),dueDate:data.dueDate||data.date||AW.today(),
      clientId:data.clientId,status:data.status||'draft',paidAmount:0,
      lines:(data.lines||[]).map(l=>({...l,id:l.id||AW.uid('line')})),
      notes:data.notes||'',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()
    };
    AW.state.invoices.unshift(inv);AW.addAudit('invoice_created',{id:inv.id});AW.save();return inv;
  };

  AW.emitInvoice = id => {
    const inv=AW.state.invoices.find(i=>i.id===id);if(!inv)return;
    if(!inv.number)inv.number=AW.nextInvoiceNo();
    inv.status='issued';inv.emittedAt=new Date().toISOString();inv.updatedAt=new Date().toISOString();
    AW.addAudit('invoice_emitted',{id,number:inv.number});AW.save();
  };

  AW.deleteDraft = id => {
    const inv=AW.state.invoices.find(i=>i.id===id);if(!inv||inv.status!=='draft')return false;
    AW.state.invoices=AW.state.invoices.filter(i=>i.id!==id);AW.addAudit('draft_deleted',{id});AW.save();return true;
  };

  AW.cancelInvoice = (id,reason='') => {
    const inv=AW.state.invoices.find(i=>i.id===id);if(!inv||inv.status==='draft')return false;
    inv.status='cancelled';inv.cancelReason=reason;inv.cancelledAt=new Date().toISOString();AW.addAudit('invoice_cancelled',{id,reason});AW.save();return true;
  };

  AW.markPaid = id => {
    const inv=AW.state.invoices.find(i=>i.id===id);if(!inv)return;
    inv.paidAmount=AW.invoiceCalc(inv).total;inv.paidAt=new Date().toISOString();AW.addAudit('invoice_paid',{id});AW.save();
  };

  AW.applyBulkPriceChange = (ids,mode,value) => {
    const targets=AW.state.invoices.filter(i=>ids.includes(i.id)&&i.status==='draft');
    let changed=0;
    targets.forEach(inv=>{
      (inv.lines||[]).forEach(l=>{
        const old=Number(l.price||0);
        if(mode==='percent')l.price=AW.round2(old*(1+Number(value)/100));
        if(mode==='fixed')l.price=AW.round2(old+Number(value));
        changed++;
      });
      inv.updatedAt=new Date().toISOString();
    });
    AW.addAudit('bulk_price_change',{invoiceIds:targets.map(i=>i.id),mode,value,lines:changed});AW.save();
    return {invoices:targets.length,lines:changed};
  };

  AW.exportBackup = () => {
    const blob=new Blob([JSON.stringify(AW.state,null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`aw9-backup-${AW.today()}.json`;a.click();URL.revokeObjectURL(a.href);
  };

  AW.importBackup = async file => {
    const text=await file.text();AW.state=AW.normalize(JSON.parse(text));AW.save();return true;
  };
})();
