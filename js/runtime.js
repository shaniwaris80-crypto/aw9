export const Runtime={
  version:'7.0.0',user:null,role:'none',view:'dashboard',unsubscribe:null,syncReady:false,lastSyncAt:'',lastCloudSyncAt:'',
  syncMeta:{online:true,fromCache:false,pendingWrites:0,lastEventAt:''},clientErrors:[],pendingRender:false,
  state:{products:[],clients:[],suppliers:[],orders:[],invoices:[],payments:[],purchases:[],stockMoves:[],expenses:[],routes:[],priceHistory:[],audit:[],settings:[],series:[],closures:[],transfers:[],wastes:[],returns:[],inventoryCounts:[],quotes:[],proformas:[],deliveryNotes:[],cashMovements:[],bankMovements:[],communications:[],containers:[],notifications:[],members:[],fiscalRecords:[],fiscalChain:[]},
  settings(){return this.state.settings?.find(x=>x.id==='main')||{}},
  product(id){return this.state.products?.find(x=>x.id===id)},
  client(id){return this.state.clients?.find(x=>x.id===id)},
  supplier(id){return this.state.suppliers?.find(x=>x.id===id)}
};
