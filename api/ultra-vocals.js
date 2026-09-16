const STYLE_MAP={trap:['modern trap','deep 808 bass','tight hi-hats','dark atmospheric synths'],pop:['modern pop','catchy melodic hook','polished drums','warm synth layers'],lofi:['lo-fi hip hop','warm dusty drums','soft keys','relaxed intimate production'],edm:['modern EDM','four on the floor','wide synths','energetic drop'],cinematic:['cinematic pop','wide orchestral textures','emotional build','dramatic percussion']};
const MOOD_MAP={dark:'moody and dark',uplifting:'uplifting and bright',dreamy:'dreamy and airy',epic:'epic and powerful',calm:'calm and intimate'};
const BPM={trap:90,pop:116,lofi:78,edm:128,cinematic:84};

module.exports=async function handler(req,res){
  if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');res.status(204).end();return}
  if(req.method!=='POST'){res.status(405).json({error:'POST only'});return}
  const apiKey=process.env.ELEVENLABS_API_KEY;
  if(!apiKey){res.status(503).json({error:'Ultra 3 neural vocals are not configured on the server yet.'});return}
  try{
    const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
    const lyrics=String(body.lyrics||'').trim();
    const prompt=String(body.prompt||'').trim().slice(0,700);
    const style=STYLE_MAP[body.style]?body.style:'pop';
    const mood=MOOD_MAP[body.mood]?body.mood:'uplifting';
    const duration=Math.max(15,Math.min(120,Number(body.duration)||60));
    if(!lyrics){res.status(400).json({error:'اكتب كلمات الأغنية أولًا.'});return}
    if(lyrics.length>4000){res.status(400).json({error:'الكلمات طويلة جدًا. الحد 4000 حرف.'});return}
    const positive=[...STYLE_MAP[style],MOOD_MAP[mood],`${BPM[style]} BPM`,'natural human lead vocalist','expressive realistic vocal performance','clear diction and believable phrasing','subtle breaths and natural dynamics','minimal pitch correction','studio-grade polished production','balanced vocal-forward mix'];
    if(prompt)positive.push(prompt);
    const plan={chunks:[{text:/^\s*\[/.test(lyrics)?lyrics:`[Song]\n${lyrics}`,duration_ms:Math.round(duration*1000),positive_styles:positive.slice(0,18),negative_styles:['robotic vocals','vocoder','metallic voice','synthetic speech','heavy autotune artifacts','harsh digital lead','chipmunk voice','a cappella'],context_adherence:'high'}]};
    const r=await fetch('https://api.elevenlabs.io/v1/music?output_format=mp3_48000_192',{method:'POST',headers:{'Content-Type':'application/json','xi-api-key':apiKey},body:JSON.stringify({composition_plan:plan,model_id:'music_v2_5',sign_with_c2pa:true})});
    if(!r.ok){let detail='';try{detail=await r.text()}catch{};console.error('ElevenLabs music error',r.status,detail.slice(0,1200));res.status(r.status).json({error:r.status===401?'مفتاح محرك الغناء غير صالح.':'محرك الغناء رفض الطلب. جرّب كلمات أو وصفًا مختلفًا.'});return}
    const audio=Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type',r.headers.get('content-type')||'audio/mpeg');
    res.setHeader('Cache-Control','no-store');
    const songId=r.headers.get('song-id');if(songId)res.setHeader('X-NovaBeat-Song-Id',songId);
    res.status(200).send(audio);
  }catch(err){console.error(err);res.status(500).json({error:'حصل خطأ أثناء توليد Ultra 3 Vocals.'})}
};
