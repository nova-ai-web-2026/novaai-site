export const STRINGS={
  missionTitle:'هات الفطار',
  objectives:['اخرج من الشقة','روح لمحل عم صابر','استنى الإشارة وافتح الطريق','ادخل المحل','اطلب الفطار','ارجع ناحية البيت'],
  complete:'المهمة خلصت',failed:'المهمة فشلت',enterCar:'اضغط E علشان تركب العربية',exitCar:'اضغط E علشان تنزل',interact:'اضغط E للتفاعل',shop:'اضغط E واطلب الفطار',save:'تم الحفظ',load:'تم تحميل آخر حفظ',noSave:'مفيش حفظ قديم'
};

export const NPC_NAMES=['حسن','منى','عماد','داليا','حسام','سمر','رضا','نهى','مروان','آية','سعيد','كريم'];
export const NPC_LINES=['خلي بالك يا ابني!','إيه يا عم براحة!','مش شايف قدامك؟','صباح الفل.','الدنيا زحمة النهارده.','يا مسهّل.'];

export const MISSION={
  id:'breakfast_run',
  title:'هات الفطار',
  reward:65,
  steps:[
    {id:'leave_apartment',label:'اخرج من الشقة'},
    {id:'reach_shop_side',label:'روح لمحل عم صابر'},
    {id:'cross_safely',label:'استنى الإشارة وافتح الطريق'},
    {id:'enter_shop',label:'ادخل المحل'},
    {id:'buy_breakfast',label:'اطلب الفطار'},
    {id:'return_home',label:'ارجع ناحية البيت'}
  ]
};

export const SHOP={
  name:'فول عم صابر',
  cashier:'عم صابر',
  items:[
    {id:'breakfast',name:'اتنين فول + طعمية + عيش',price:38},
    {id:'juice',name:'عصير قصب',price:18}
  ]
};

export const WORLD={
  startTime:7.75,
  playerStart:{x:-20,y:1.05,z:-9},
  apartmentExit:{x:-14,z:-9},
  shop:{x:18,z:9},
  homeReturn:{x:-16,z:-8},
  road:{z:0,width:8},
  crossingX:7
};
