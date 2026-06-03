import { useState, useEffect } from "react";

const T = {
  km: {
    subtitle:"តាមដានរថយន្តរបស់អ្នក",plate:"ផ្លាកលេខ",cust:"អតិថិជន",phone:"ទូរស័ព្ទ",
    tabStatus:"ស្ថានភាព",tabInvoice:"វិក្កយបត្រ",tabBooking:"ណាត់ជួប",tabHistory:"ប្រវត្តិ",tabPoints:"ពិន្ទុ",
    currentJob:"ការងារបច្ចុប្បន្ន",mechanic:"មេការ",estDone:"ព្រំថ្ងៃ",items:"សេវា/គ្រឿង",total:"សរុប",
    selectService:"ជ្រើសសេវា",selectTime:"ជ្រើសម៉ោង",note:"កំណត់សម្គាល់",confirm:"បញ្ជាក់ណាត់ជួប",
    bookSuccess:"ណាត់ជួបជោគជ័យ!",newBook:"ណាត់ជួបថ្មី",selectDate:"ជ្រើសកាលបរិច្ឆេទ",
    histTitle:"ប្រវត្តិជួសជុល",ptsBalance:"ពិន្ទុសរុប",ptsEarned:"ទទួលបាន",ptsUsed:"ប្រើប្រាស់",
    redeem:"ប្ដូរពិន្ទុ",paid:"បានបង់",unpaid:"មិនទាន់បង់",loading:"កំពុងផ្ទុក...",
    ptsnote:"ចំណាយ $1 = 1 ពិន្ទុ · 100 ពិន្ទុ = $1 បញ្ចុះ",noJob:"គ្មានការងារបច្ចុប្បន្នទេ",
    statusMap:{pending:"រង់ចាំ",checked_in:"បានចូល",in_progress:"កំពុងជួសជុល",qc:"ត្រួតពិនិត្យ",ready:"រួចរាល់",completed:"ចប់"},
    services:["ប្ដូរប្រេង","ពិនិត្យទូទៅ","Brake","Tyre","AC Service","Engine","Other"],
  },
  en: {
    subtitle:"Track your vehicle service",plate:"Plate",cust:"Customer",phone:"Phone",
    tabStatus:"Status",tabInvoice:"Invoice",tabBooking:"Booking",tabHistory:"History",tabPoints:"Points",
    currentJob:"Current Job",mechanic:"Mechanic",estDone:"Est. Done",items:"Services/Parts",total:"Total",
    selectService:"Select Service",selectTime:"Select Time",note:"Notes",confirm:"Confirm Booking",
    bookSuccess:"Booking Confirmed!",newBook:"New Appointment",selectDate:"Select Date",
    histTitle:"Service History",ptsBalance:"Points Balance",ptsEarned:"Earned",ptsUsed:"Used",
    redeem:"Redeem Points",paid:"Paid",unpaid:"Unpaid",loading:"Loading...",
    ptsnote:"Spend $1 = 1 pt · 100 pts = $1 off",noJob:"No active job",
    statusMap:{pending:"Pending",checked_in:"Checked In",in_progress:"In Progress",qc:"QC Check",ready:"Ready",completed:"Completed"},
    services:["Oil Change","General Check","Brake Repair","Tyre Change","AC Service","Engine Check","Other"],
  },
};

const STATUS_CFG = {
  pending:{color:"#888780",bg:"#F1EFE8",icon:"⏳"},
  checked_in:{color:"#185FA5",bg:"#E6F1FB",icon:"🔑"},
  in_progress:{color:"#854F0B",bg:"#FAEEDA",icon:"🔧"},
  qc:{color:"#534AB7",bg:"#EEEDFE",icon:"🔍"},
  ready:{color:"#3B6D11",bg:"#EAF3DE",icon:"✅"},
  completed:{color:"#0F6E56",bg:"#E1F5EE",icon:"🎉"},
};
const STATUS_ORDER = ["pending","checked_in","in_progress","qc","ready","completed"];

const MOCK = {
  customer:{name:"លោក សុខ ដារ៉ា",phone:"012 345 678",plate:"1AA-2202",points:245},
  currentJob:{id:"JC-2026-0042",status:"in_progress",mechanic:"Sok Pheap",service:"Engine Check + Oil Change",estDone:"03/06/2026 17:00",notes:"Found oil leak at gasket",items:[{name:"Oil Filter",qty:1,price:8},{name:"Engine Oil 5W30",qty:4,price:12},{name:"Labour",qty:1,price:25}]},
  invoices:[
    {id:"INV-2026-0038",date:"2026-05-28",status:"paid",total:85,items:[{name:"Brake Pad",qty:2,price:18},{name:"Labour",qty:1,price:30},{name:"Brake Fluid",qty:1,price:7}]},
    {id:"INV-2026-0031",date:"2026-05-10",status:"paid",total:45,items:[{name:"Oil Change",qty:1,price:30},{name:"Filter",qty:1,price:15}]},
  ],
  history:[
    {id:"JC-2026-0038",date:"2026-05-28",service:"Brake Repair",mechanic:"Chea Vannak",total:85,status:"completed"},
    {id:"JC-2026-0031",date:"2026-05-10",service:"Oil Change",mechanic:"Sok Pheap",total:45,status:"completed"},
    {id:"JC-2026-0018",date:"2026-04-15",service:"Tyre Change x2",mechanic:"Sok Pheap",total:120,status:"completed"},
  ],
  ptsHistory:[
    {date:"2026-05-28",desc:"Brake Repair",delta:+85},{date:"2026-05-10",desc:"Oil Change",delta:+45},
    {date:"2026-04-15",desc:"Redeem",delta:-100},{date:"2026-04-15",desc:"Tyre Change",delta:+120},
  ],
};

function Badge({status,t}){
  const c=STATUS_CFG[status]||STATUS_CFG.pending;
  return <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:20,fontSize:12,fontWeight:600,color:c.color,background:c.bg}}>{c.icon} {t.statusMap[status]||status}</span>;
}

export default function CustomerPortal(){
  const [lang,setLang]=useState("km");
  const [tab,setTab]=useState("status");
  const [openInv,setOpenInv]=useState(null);
  const [selTime,setSelTime]=useState("");
  const [date,setDate]=useState("");
  const [svc,setSvc]=useState("");
  const [note,setNote]=useState("");
  const [booked,setBooked]=useState(false);
  const t=T[lang];
  const d=MOCK;
  const times=["08:00","09:00","10:00","11:00","13:00","14:00","15:00","16:00"];

  const s={
    wrap:{fontFamily:"'Kantumruy Pro',sans-serif",background:"#F8F7F4",minHeight:"100vh",maxWidth:480,margin:"0 auto"},
    hdr:{background:"#1A1A18",padding:"14px 14px 0"},
    logoRow:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12},
    logoBox:{width:32,height:32,borderRadius:7,background:"#F5B400",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:16,color:"#1A1A18"},
    carInfo:{background:"rgba(255,255,255,0.07)",borderRadius:10,padding:"10px 12px",display:"flex",gap:16,marginBottom:12},
    tabs:{display:"flex",background:"#fff",borderTop:"1px solid #E3E1D8",position:"sticky",bottom:0},
    tab:(active)=>({flex:1,padding:"9px 4px 10px",border:"none",background:"transparent",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,borderTop:active?"2.5px solid #E09000":"2.5px solid transparent",fontFamily:"'Kantumruy Pro',sans-serif"}),
    card:{background:"#fff",border:"1px solid #E3E1D8",borderRadius:12,padding:14,marginBottom:10},
    btn:{width:"100%",padding:12,background:"#E09000",color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'Kantumruy Pro',sans-serif"},
    input:{width:"100%",padding:"9px 10px",border:"1.5px solid #E3E1D8",borderRadius:8,background:"#F8F7F4",color:"#2C2C2A",fontFamily:"'Kantumruy Pro',sans-serif",fontSize:13,outline:"none",marginBottom:10,boxSizing:"border-box"},
    lbl:{display:"block",fontSize:11,fontWeight:600,color:"#888",textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:5},
  };

  const cur=STATUS_ORDER.indexOf(d.currentJob.status);

  return(
    <div style={s.wrap}>
      <link href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@400;600;700&display=swap" rel="stylesheet"/>
      <div style={s.hdr}>
        <div style={s.logoRow}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={s.logoBox}>G</div>
            <div>
              <div style={{color:"#fff",fontWeight:700,fontSize:14}}>GARAGE OS</div>
              <div style={{color:"#888",fontSize:11}}>{t.subtitle}</div>
            </div>
          </div>
          <button onClick={()=>setLang(lang==="km"?"en":"km")} style={{padding:"4px 10px",borderRadius:20,border:"1.5px solid #3A3A36",background:"transparent",color:"#E8E6DF",fontSize:11,fontWeight:600,cursor:"pointer"}}>
            {lang==="km"?"EN":"ខ្មែរ"}
          </button>
        </div>
        <div style={s.carInfo}>
          {[["plate","1AA-2202"],["cust",d.customer.name],["phone",d.customer.phone]].map(([k,v])=>(
            <div key={k}><div style={{fontSize:9,color:"rgba(255,255,255,0.45)",fontWeight:600,textTransform:"uppercase"}}>{t[k]}</div><div style={{fontSize:12,fontWeight:700,color:"#fff"}}>{v}</div></div>
          ))}
        </div>
      </div>

      <div style={{padding:"12px 14px 80px"}}>
        {tab==="status"&&(
          <div>
            <div style={{...s.card,borderLeft:"4px solid #854F0B"}}>
              <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:6}}>
                <div>
                  <div style={{fontSize:12,color:"#888"}}>{t.currentJob}</div>
                  <div style={{fontSize:17,fontWeight:800,color:"#2C2C2A"}}>{d.currentJob.id}</div>
                  <div style={{fontSize:13,color:"#2C2C2A",marginTop:2}}>{d.currentJob.service}</div>
                </div>
                <Badge status={d.currentJob.status} t={t}/>
              </div>
              <div style={{display:"flex",alignItems:"center",margin:"14px 0",overflowX:"auto",paddingBottom:2}}>
                {STATUS_ORDER.map((s2,i)=>{
                  const cfg=STATUS_CFG[s2];const done=i<=cur;const active=i===cur;
                  return(
                    <div key={s2} style={{display:"flex",alignItems:"center",flex:i<STATUS_ORDER.length-1?1:0}}>
                      <div style={{display:"flex",flexDirection:"column",alignItems:"center",minWidth:46}}>
                        <div style={{width:30,height:30,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,border:`2px solid ${done?cfg.color:"#ccc"}`,background:done?cfg.bg:"#F1EFE8",boxShadow:active?`0 0 0 4px ${cfg.bg}`:"none"}}>{done?cfg.icon:"○"}</div>
                        <div style={{fontSize:9,color:done?cfg.color:"#888",marginTop:3,textAlign:"center",lineHeight:1.2}}>{t.statusMap[s2]}</div>
                      </div>
                      {i<STATUS_ORDER.length-1&&<div style={{flex:1,height:2,margin:"0 2px",marginBottom:16,background:i<cur?"#1D9E75":"#E3E1D8"}}/>}
                    </div>
                  );
                })}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {[[t.mechanic,d.currentJob.mechanic],[t.estDone,d.currentJob.estDone]].map(([l,v])=>(
                  <div key={l}><div style={{fontSize:10,color:"#888",fontWeight:600,textTransform:"uppercase"}}>{l}</div><div style={{fontSize:13,fontWeight:600,color:"#2C2C2A",marginTop:2}}>{v}</div></div>
                ))}
              </div>
              {d.currentJob.notes&&<div style={{marginTop:10,padding:"8px 10px",background:"#F8F7F4",borderRadius:8,fontSize:12,color:"#888",fontStyle:"italic"}}>💬 {d.currentJob.notes}</div>}
            </div>
            <div style={s.card}>
              <div style={{fontWeight:600,marginBottom:8,color:"#2C2C2A"}}>{t.items}</div>
              {d.currentJob.items.map((item,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:i<d.currentJob.items.length-1?"1px solid #F1EFE8":"none",fontSize:13}}>
                  <span style={{color:"#2C2C2A"}}>{item.name}</span>
                  <span style={{color:"#888"}}>x{item.qty} · <strong style={{color:"#E09000"}}>${(item.qty*item.price).toFixed(2)}</strong></span>
                </div>
              ))}
              <div style={{display:"flex",justifyContent:"space-between",marginTop:10,paddingTop:10,borderTop:"2px solid #E3E1D8",fontWeight:700}}>
                <span style={{color:"#2C2C2A"}}>{t.total}</span>
                <span style={{color:"#E09000",fontSize:17}}>${d.currentJob.items.reduce((s,i)=>s+i.qty*i.price,0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {tab==="invoice"&&(
          <div style={s.card}>
            {d.invoices.map((inv)=>(
              <div key={inv.id}>
                <div onClick={()=>setOpenInv(openInv===inv.id?null:inv.id)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #F1EFE8",cursor:"pointer"}}>
                  <div><div style={{fontWeight:700,fontSize:14,color:"#2C2C2A"}}>{inv.id}</div><div style={{fontSize:11,color:"#888",marginTop:2}}>{inv.date}</div></div>
                  <div style={{textAlign:"right"}}><Badge status={inv.status} t={t}/><div style={{fontWeight:700,color:"#E09000",marginTop:4}}>${inv.total}</div></div>
                </div>
                {openInv===inv.id&&(
                  <div style={{padding:"10px 0"}}>
                    {inv.items.map((it,i)=>(
                      <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"4px 0"}}>
                        <span style={{color:"#2C2C2A"}}>{it.name}</span>
                        <span style={{color:"#E09000",fontWeight:600}}>${(it.qty*it.price).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab==="booking"&&(
          booked?(
            <div style={{textAlign:"center",padding:"40px 20px"}}>
              <div style={{fontSize:52}}>🎉</div>
              <div style={{fontSize:18,fontWeight:800,color:"#2C2C2A",margin:"10px 0 6px"}}>{t.bookSuccess}</div>
              <button className="portal-btn" style={{...s.btn,maxWidth:200,marginTop:20}} onClick={()=>{setBooked(false);setDate("");setSvc("");setSelTime("");setNote("");}}>+ {t.newBook}</button>
            </div>
          ):(
            <div style={s.card}>
              <div style={{fontWeight:700,fontSize:15,color:"#2C2C2A",marginBottom:14}}>{t.newBook}</div>
              <label style={s.lbl}>{t.selectDate}</label>
              <input type="date" style={s.input} value={date} onChange={e=>setDate(e.target.value)} min={new Date().toISOString().split("T")[0]}/>
              <label style={s.lbl}>{t.selectService}</label>
              <select style={s.input} value={svc} onChange={e=>setSvc(e.target.value)}>
                <option value="">—</option>
                {t.services.map(sv=><option key={sv}>{sv}</option>)}
              </select>
              <label style={s.lbl}>{t.selectTime}</label>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:10}}>
                {times.map(tm=>(
                  <button key={tm} onClick={()=>setSelTime(tm)} style={{padding:"7px 4px",borderRadius:7,border:`1.5px solid ${selTime===tm?"#E09000":"#E3E1D8"}`,background:selTime===tm?"#FAEEDA":"#F8F7F4",color:selTime===tm?"#633806":"#2C2C2A",fontWeight:selTime===tm?700:400,cursor:"pointer",fontSize:12}}>{tm}</button>
                ))}
              </div>
              <label style={s.lbl}>{t.note}</label>
              <textarea style={{...s.input,resize:"none"}} rows={2} value={note} onChange={e=>setNote(e.target.value)}/>
              <button style={{...s.btn,opacity:(!date||!svc||!selTime)?0.45:1}} disabled={!date||!svc||!selTime} onClick={()=>setBooked(true)}>{t.confirm}</button>
            </div>
          )
        )}

        {tab==="history"&&(
          <div style={s.card}>
            {d.history.map((j)=>(
              <div key={j.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #F1EFE8"}}>
                <div><div style={{fontWeight:600,fontSize:13,color:"#2C2C2A"}}>{j.service}</div><div style={{fontSize:11,color:"#888",marginTop:2}}>{j.date} · {j.mechanic}</div></div>
                <div style={{textAlign:"right"}}><Badge status={j.status} t={t}/><div style={{fontWeight:700,color:"#E09000",marginTop:4}}>${j.total}</div></div>
              </div>
            ))}
          </div>
        )}

        {tab==="points"&&(
          <div>
            <div style={{background:"linear-gradient(135deg,#F5B400,#E09000)",borderRadius:12,padding:18,textAlign:"center",marginBottom:10}}>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.8)",fontWeight:500}}>{t.ptsBalance}</div>
              <div style={{fontSize:46,fontWeight:800,color:"#fff",lineHeight:1}}>{d.customer.points}</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.75)",marginTop:4}}>{t.ptsnote}</div>
              <div style={{background:"rgba(255,255,255,0.3)",borderRadius:20,height:7,marginTop:10,overflow:"hidden"}}>
                <div style={{width:`${Math.min((d.customer.points/500)*100,100)}%`,height:"100%",background:"#fff",borderRadius:20}}/>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
              <div style={s.card}><div style={{fontSize:22,fontWeight:700,color:"#3B6D11",textAlign:"center"}}>+{d.ptsHistory.filter(p=>p.delta>0).reduce((s,p)=>s+p.delta,0)}</div><div style={{fontSize:11,color:"#888",textAlign:"center"}}>{t.ptsEarned}</div></div>
              <div style={s.card}><div style={{fontSize:22,fontWeight:700,color:"#A32D2D",textAlign:"center"}}>-{Math.abs(d.ptsHistory.filter(p=>p.delta<0).reduce((s,p)=>s+p.delta,0))}</div><div style={{fontSize:11,color:"#888",textAlign:"center"}}>{t.ptsUsed}</div></div>
            </div>
            <div style={s.card}>
              {d.ptsHistory.map((p,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:i<d.ptsHistory.length-1?"1px solid #F1EFE8":"none",fontSize:12}}>
                  <div><div style={{color:"#2C2C2A",fontWeight:500}}>{p.desc}</div><div style={{color:"#888",fontSize:10}}>{p.date}</div></div>
                  <div style={{fontWeight:700,color:p.delta>0?"#3B6D11":"#A32D2D"}}>{p.delta>0?"+":""}{p.delta}</div>
                </div>
              ))}
            </div>
            <button style={{...s.btn,background:"#F5B400",color:"#412402"}}>🎁 {t.redeem} ({d.customer.points} pts = ${(d.customer.points/100).toFixed(2)})</button>
          </div>
        )}
      </div>

      <div style={s.tabs}>
        {[["status","🔧",t.tabStatus],["invoice","🧾",t.tabInvoice],["booking","📅",t.tabBooking],["history","📋",t.tabHistory],["points","⭐",t.tabPoints]].map(([key,icon,label])=>(
          <button key={key} onClick={()=>setTab(key)} style={s.tab(tab===key)}>
            <span style={{fontSize:16}}>{icon}</span>
            <span style={{fontSize:9,fontWeight:tab===key?700:400,color:tab===key?"#E09000":"#888"}}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
