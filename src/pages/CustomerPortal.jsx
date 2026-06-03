import { useState } from "react";

const T = {
  km: {
    subtitle:"តាមដានរថយន្តរបស់អ្នក",plate:"ផ្លាកលេខ",cust:"អតិថិជន",phone:"ទូរស័ព្ទ",
    tabStatus:"ស្ថានភាព",tabInvoice:"វិក្កយបត្រ",tabBooking:"ណាត់ជួប",tabHistory:"ប្រវត្តិ",tabPoints:"ពិន្ទុ",
    currentJob:"ការងារបច្ចុប្បន្ន",mechanic:"មេការ",estDone:"ព្រំថ្ងៃ",items:"សេវា / គ្រឿង",total:"សរុប",
    selectService:"ជ្រើសសេវា",selectTime:"ជ្រើសម៉ោង",note:"កំណត់សម្គាល់",confirm:"បញ្ជាក់ណាត់ជួប",
    bookSuccess:"ណាត់ជួបជោគជ័យ!",newBook:"ណាត់ជួបថ្មី",selectDate:"ជ្រើសកាលបរិច្ឆេទ",
    ptsBalance:"ពិន្ទុសរុប",ptsEarned:"ទទួលបាន",ptsUsed:"ប្រើប្រាស់",redeem:"ប្ដូរពិន្ទុ",
    paid:"បានបង់",noJob:"គ្មានការងារបច្ចុប្បន្នទេ",
    ptsnote:"$1 = 1 ពិន្ទុ · 100 ពិន្ទុ = $1 បញ្ចុះ",
    statusMap:{pending:"រង់ចាំ",checked_in:"បានចូល",in_progress:"កំពុងជួសជុល",qc:"ត្រួតពិនិត្យ",ready:"រួចរាល់",completed:"ចប់"},
    services:["ប្ដូរប្រេង","ពិនិត្យទូទៅ","ជួសជុល Brake","ប្ដូរ Tyre","AC Service","Engine Check","Other"],
  },
  en: {
    subtitle:"Track your vehicle service",plate:"Plate",cust:"Customer",phone:"Phone",
    tabStatus:"Status",tabInvoice:"Invoice",tabBooking:"Booking",tabHistory:"History",tabPoints:"Points",
    currentJob:"Current Job",mechanic:"Mechanic",estDone:"Est. Done",items:"Services / Parts",total:"Total",
    selectService:"Select Service",selectTime:"Select Time",note:"Notes",confirm:"Confirm Booking",
    bookSuccess:"Booking Confirmed!",newBook:"New Appointment",selectDate:"Select Date",
    ptsBalance:"Points Balance",ptsEarned:"Earned",ptsUsed:"Used",redeem:"Redeem Points",
    paid:"Paid",noJob:"No active job",
    ptsnote:"$1 = 1 pt · 100 pts = $1 off",
    statusMap:{pending:"Pending",checked_in:"Checked In",in_progress:"In Progress",qc:"QC Check",ready:"Ready",completed:"Completed"},
    services:["Oil Change","General Check","Brake Repair","Tyre Change","AC Service","Engine Check","Other"],
  },
};

const STATUS_CFG = {
  pending:    {color:"#92400E",bg:"#FEF3C7",icon:"⏳",bar:"#F59E0B"},
  checked_in: {color:"#1E40AF",bg:"#DBEAFE",icon:"🔑",bar:"#3B82F6"},
  in_progress:{color:"#92400E",bg:"#FEF3C7",icon:"🔧",bar:"#F59E0B"},
  qc:         {color:"#5B21B6",bg:"#EDE9FE",icon:"🔍",bar:"#8B5CF6"},
  ready:      {color:"#065F46",bg:"#D1FAE5",icon:"✅",bar:"#10B981"},
  completed:  {color:"#065F46",bg:"#D1FAE5",icon:"🎉",bar:"#10B981"},
};
const STATUS_ORDER = ["pending","checked_in","in_progress","qc","ready","completed"];

const MOCK = {
  customer:{name:"លោក សុខ ដារ៉ា",phone:"012 345 678",plate:"1AA-2202",points:245},
  currentJob:{id:"JC-2026-0042",status:"in_progress",mechanic:"Sok Pheap",service:"Engine Check + Oil Change",estDone:"03/06 17:00",notes:"Found oil leak at gasket",items:[{name:"Oil Filter",qty:1,price:8},{name:"Engine Oil 5W30",qty:4,price:12},{name:"Labour",qty:1,price:25}]},
  invoices:[
    {id:"INV-0038",date:"28 May 2026",status:"paid",total:85,items:[{name:"Brake Pad",qty:2,price:18},{name:"Labour",qty:1,price:30},{name:"Brake Fluid",qty:1,price:7}]},
    {id:"INV-0031",date:"10 May 2026",status:"paid",total:45,items:[{name:"Oil Change",qty:1,price:30},{name:"Filter",qty:1,price:15}]},
  ],
  history:[
    {date:"28 May",service:"Brake Repair",mechanic:"Chea Vannak",total:85,status:"completed"},
    {date:"10 May",service:"Oil Change",mechanic:"Sok Pheap",total:45,status:"completed"},
    {date:"15 Apr",service:"Tyre Change x2",mechanic:"Sok Pheap",total:120,status:"completed"},
  ],
  ptsHistory:[
    {date:"28 May",desc:"Brake Repair",delta:+85},
    {date:"10 May",desc:"Oil Change",delta:+45},
    {date:"15 Apr",desc:"Redeem discount",delta:-100},
    {date:"15 Apr",desc:"Tyre Change",delta:+120},
  ],
};

export default function CustomerPortal() {
  const [lang, setLang] = useState("km");
  const [tab, setTab] = useState("status");
  const [openInv, setOpenInv] = useState(null);
  const [selTime, setSelTime] = useState("");
  const [date, setDate] = useState("");
  const [svc, setSvc] = useState("");
  const [note, setNote] = useState("");
  const [booked, setBooked] = useState(false);
  const t = T[lang];
  const d = MOCK;
  const times = ["08:00","09:00","10:00","11:00","13:00","14:00","15:00","16:00"];
  const cur = STATUS_ORDER.indexOf(d.currentJob.status);
  const jobTotal = d.currentJob.items.reduce((s,i)=>s+i.qty*i.price,0);
  const earned = d.ptsHistory.filter(p=>p.delta>0).reduce((s,p)=>s+p.delta,0);
  const used = Math.abs(d.ptsHistory.filter(p=>p.delta<0).reduce((s,p)=>s+p.delta,0));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
        html,body,#root{
          height:100%;
          height:100dvh;
          overflow:hidden;
          background:#111110;
        }
        .wrap{
          font-family:'Kantumruy Pro',sans-serif;
          max-width:430px;
          margin:0 auto;
          height:100%;
          height:100dvh;
          display:flex;
          flex-direction:column;
          background:#F2F1EE;
          overflow:hidden;
        }
        /* HEADER */
        .hdr{
          background:#111110;
          padding:16px 16px 0;
          flex-shrink:0;
        }
        .hdr-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;}
        .logo{display:flex;align-items:center;gap:10px;}
        .logo-box{width:40px;height:40px;border-radius:10px;background:#F5B400;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px;color:#111110;flex-shrink:0;}
        .logo-name{color:#FAFAF8;font-size:16px;font-weight:700;letter-spacing:0.01em;}
        .logo-sub{color:#888884;font-size:12px;margin-top:1px;}
        .lang-btn{background:#1E1E1C;border:1px solid #333330;color:#FAFAF8;font-size:13px;font-weight:600;padding:7px 16px;border-radius:20px;cursor:pointer;font-family:'Kantumruy Pro',sans-serif;}
        .car-row{display:flex;border-top:1px solid #1E1E1C;padding:12px 0;}
        .car-col{flex:1;}
        .car-col:not(:last-child){border-right:1px solid #1E1E1C;padding-right:12px;margin-right:12px;}
        .car-lbl{font-size:11px;color:#333331;font-weight:500;text-transform:uppercase;letter-spacing:0.05em;}
        .car-val{font-size:14px;font-weight:700;color:#FAFAF8;margin-top:3px;}
        /* CONTENT */
        .content{
          flex:1;
          overflow-y:auto;
          -webkit-overflow-scrolling:touch;
          overscroll-behavior:contain;
          padding:14px 14px 20px;
        }
        /* TAB BAR - sticky bottom using flex */
        .tabbar{
          flex-shrink:0;
          display:flex;
          background:#FFFFFF;
          border-top:1px solid #E5E5E0;
          padding-bottom:env(safe-area-inset-bottom,0px);
        }
        .tab-btn{
          flex:1;
          padding:12px 4px 10px;
          border:none;
          background:transparent;
          cursor:pointer;
          display:flex;
          flex-direction:column;
          align-items:center;
          gap:4px;
          border-top:2.5px solid transparent;
          transition:border-color 0.15s;
        }
        .tab-btn.on{border-top-color:#F5B400;}
        .tab-ico{font-size:22px;line-height:1;}
        .tab-lbl{font-size:11px;color:#666663;font-family:'Kantumruy Pro',sans-serif;font-weight:400;}
        .tab-btn.on .tab-lbl{color:#111110;font-weight:700;}
        /* CARDS */
        .card{background:#FFF;border-radius:16px;padding:18px;margin-bottom:12px;}
        .card-ttl{font-size:11px;font-weight:600;color:#555552;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:14px;}
        /* STATUS */
        .badge{display:inline-flex;align-items:center;gap:5px;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:600;}
        .job-top{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:18px;}
        .job-id{font-size:20px;font-weight:800;color:#111110;}
        .job-svc{font-size:14px;color:#444442;margin-top:4px;}
        .timeline{display:flex;align-items:center;margin:18px 0;overflow-x:auto;padding-bottom:6px;scrollbar-width:none;}
        .timeline::-webkit-scrollbar{display:none;}
        .tl-col{display:flex;flex-direction:column;align-items:center;min-width:54px;}
        .tl-dot{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid #E5E5E0;background:#F2F1EE;}
        .tl-dot.on{border-color:transparent;}
        .tl-dot.active{box-shadow:0 0 0 5px rgba(245,180,0,0.18);}
        .tl-lbl{font-size:10px;color:#555552;margin-top:5px;text-align:center;line-height:1.3;white-space:nowrap;font-family:'Kantumruy Pro',sans-serif;}
        .tl-lbl.on{font-weight:700;}
        .tl-line{flex:1;height:2px;background:#E5E5E0;margin-bottom:22px;}
        .tl-line.on{background:#F5B400;}
        .info2{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:6px;}
        .info-lbl{font-size:11px;color:#444442;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;}
        .info-val{font-size:15px;font-weight:700;color:#111110;margin-top:3px;}
        .note-box{margin-top:14px;padding:12px 14px;background:#F8F7F4;border-radius:10px;font-size:14px;color:#444442;line-height:1.6;}
        .item-row{display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #F0F0EB;}
        .item-row:last-of-type{border-bottom:none;}
        .item-name{font-size:15px;font-weight:500;color:#111110;}
        .item-qty{font-size:12px;color:#555552;margin-top:3px;}
        .item-price{font-size:15px;font-weight:700;color:#F5B400;}
        .total-row{display:flex;justify-content:space-between;align-items:center;padding-top:14px;border-top:2px solid #F0F0EB;margin-top:2px;}
        .total-lbl{font-size:16px;font-weight:700;color:#111110;}
        .total-amt{font-size:24px;font-weight:800;color:#F5B400;}
        /* INVOICE */
        .inv-row{display:flex;justify-content:space-between;align-items:center;padding:16px 0;border-bottom:1px solid #F0F0EB;cursor:pointer;}
        .inv-row:last-child{border-bottom:none;}
        .inv-id{font-size:16px;font-weight:700;color:#111110;}
        .inv-date{font-size:13px;color:#555552;margin-top:3px;}
        .inv-amt{font-size:18px;font-weight:800;color:#F5B400;}
        .inv-detail{padding:10px 0 6px;background:#F8F7F4;border-radius:10px;margin-top:4px;padding:12px;}
        .inv-detail-row{display:flex;justify-content:space-between;font-size:14px;padding:5px 0;color:#333331;}
        /* BOOKING */
        .field-lbl{display:block;font-size:13px;font-weight:600;color:#333331;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.04em;}
        .field-in{width:100%;padding:14px;border:1.5px solid #E5E5E0;border-radius:12px;background:#F8F7F4;color:#111110;font-family:'Kantumruy Pro',sans-serif;font-size:15px;outline:none;margin-bottom:16px;}
        .field-in:focus{border-color:#F5B400;}
        .time-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px;}
        .time-btn{padding:11px 4px;border-radius:10px;border:1.5px solid #E5E5E0;background:#F8F7F4;color:#111110;font-size:14px;font-weight:500;cursor:pointer;font-family:'Kantumruy Pro',sans-serif;}
        .time-btn.on{border-color:#F5B400;background:#FFFBEB;color:#92400E;font-weight:700;}
        .confirm-btn{width:100%;padding:16px;background:#111110;color:#FFF;border:none;border-radius:14px;font-size:16px;font-weight:700;cursor:pointer;font-family:'Kantumruy Pro',sans-serif;margin-top:4px;}
        .confirm-btn:disabled{opacity:0.3;cursor:not-allowed;}
        .success-box{text-align:center;padding:60px 20px;}
        .new-btn{margin-top:24px;padding:14px 32px;background:#111110;color:#FFF;border:none;border-radius:14px;font-size:15px;font-weight:700;cursor:pointer;font-family:'Kantumruy Pro',sans-serif;}
        /* HISTORY */
        .hist-row{display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-bottom:1px solid #F0F0EB;}
        .hist-row:last-child{border-bottom:none;}
        .hist-svc{font-size:15px;font-weight:600;color:#111110;}
        .hist-meta{font-size:13px;color:#555552;margin-top:4px;}
        .hist-amt{font-size:17px;font-weight:800;color:#F5B400;}
        /* POINTS */
        .pts-hero{background:#111110;border-radius:20px;padding:28px 24px;text-align:center;margin-bottom:12px;}
        .pts-lbl{font-size:12px;color:#444442;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;}
        .pts-num{font-size:72px;font-weight:800;color:#F5B400;line-height:1;margin:8px 0;}
        .pts-note{font-size:13px;color:#333331;margin-top:6px;}
        .pts-bar-bg{background:#1E1E1C;border-radius:20px;height:7px;margin:16px 0 8px;overflow:hidden;}
        .pts-bar{height:100%;background:#F5B400;border-radius:20px;}
        .pts-sub{font-size:12px;color:#333331;}
        .pts-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;}
        .pts-card{background:#FFF;border-radius:14px;padding:18px;text-align:center;}
        .pts-n{font-size:28px;font-weight:800;}
        .pts-l{font-size:12px;color:#555552;margin-top:4px;text-transform:uppercase;letter-spacing:0.04em;}
        .txn-row{display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #F0F0EB;}
        .txn-row:last-child{border-bottom:none;}
        .txn-name{font-size:15px;font-weight:500;color:#111110;}
        .txn-date{font-size:12px;color:#555552;margin-top:3px;}
        .redeem-btn{width:100%;padding:16px;background:#F5B400;color:#111110;border:none;border-radius:14px;font-size:16px;font-weight:800;cursor:pointer;font-family:'Kantumruy Pro',sans-serif;}
      `}</style>

      <div className="wrap">
        {/* HEADER */}
        <div className="hdr">
          <div className="hdr-top">
            <div className="logo">
              <div className="logo-box">G</div>
              <div>
                <div className="logo-name">GARAGE OS</div>
                <div className="logo-sub">{t.subtitle}</div>
              </div>
            </div>
            <button className="lang-btn" onClick={()=>setLang(lang==="km"?"en":"km")}>
              {lang==="km"?"EN":"ខ្មែរ"}
            </button>
          </div>
          <div className="car-row">
            <div className="car-col"><div className="car-lbl">{t.plate}</div><div className="car-val">{d.customer.plate}</div></div>
            <div className="car-col"><div className="car-lbl">{t.cust}</div><div className="car-val">{d.customer.name}</div></div>
            <div className="car-col"><div className="car-lbl">{t.phone}</div><div className="car-val">{d.customer.phone}</div></div>
          </div>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div className="content">

          {tab==="status" && <>
            <div className="card" style={{borderLeft:`4px solid ${STATUS_CFG[d.currentJob.status]?.bar}`}}>
              <div className="job-top">
                <div>
                  <div className="card-ttl">{t.currentJob}</div>
                  <div className="job-id">{d.currentJob.id}</div>
                  <div className="job-svc">{d.currentJob.service}</div>
                </div>
                <span className="badge" style={{color:STATUS_CFG[d.currentJob.status]?.color,background:STATUS_CFG[d.currentJob.status]?.bg}}>
                  {STATUS_CFG[d.currentJob.status]?.icon} {t.statusMap[d.currentJob.status]}
                </span>
              </div>
              <div className="timeline">
                {STATUS_ORDER.map((s,i)=>{
                  const cfg=STATUS_CFG[s];const done=i<=cur;const active=i===cur;
                  return(
                    <div key={s} style={{display:"flex",alignItems:"center",flex:i<STATUS_ORDER.length-1?1:0}}>
                      <div className="tl-col">
                        <div className={`tl-dot${done?" on":""}${active?" active":""}`} style={done?{background:cfg.bg,borderColor:cfg.bar}:{}}>
                          {done?cfg.icon:"○"}
                        </div>
                        <div className={`tl-lbl${done?" on":""}`} style={done?{color:cfg.color}:{}}>{t.statusMap[s]}</div>
                      </div>
                      {i<STATUS_ORDER.length-1&&<div className={`tl-line${i<cur?" on":""}`}/>}
                    </div>
                  );
                })}
              </div>
              <div className="info2">
                <div><div className="info-lbl">{t.mechanic}</div><div className="info-val">{d.currentJob.mechanic}</div></div>
                <div><div className="info-lbl">{t.estDone}</div><div className="info-val">{d.currentJob.estDone}</div></div>
              </div>
              {d.currentJob.notes&&<div className="note-box">💬 {d.currentJob.notes}</div>}
            </div>
            <div className="card">
              <div className="card-ttl">{t.items}</div>
              {d.currentJob.items.map((item,i)=>(
                <div className="item-row" key={i}>
                  <div><div className="item-name">{item.name}</div><div className="item-qty">x{item.qty}</div></div>
                  <div className="item-price">${(item.qty*item.price).toFixed(2)}</div>
                </div>
              ))}
              <div className="total-row">
                <div className="total-lbl">{t.total}</div>
                <div className="total-amt">${jobTotal.toFixed(2)}</div>
              </div>
            </div>
          </>}

          {tab==="invoice" && <div className="card">
            <div className="card-ttl">{t.tabInvoice}</div>
            {d.invoices.map(inv=>(
              <div key={inv.id}>
                <div className="inv-row" onClick={()=>setOpenInv(openInv===inv.id?null:inv.id)}>
                  <div><div className="inv-id">{inv.id}</div><div className="inv-date">{inv.date}</div></div>
                  <div style={{textAlign:"right"}}>
                    <span className="badge" style={{color:"#065F46",background:"#D1FAE5",fontSize:12}}>✅ {t.paid}</span>
                    <div className="inv-amt">${inv.total}</div>
                  </div>
                </div>
                {openInv===inv.id&&(
                  <div className="inv-detail">
                    {inv.items.map((it,i)=>(
                      <div className="inv-detail-row" key={i}>
                        <span>{it.name} x{it.qty}</span>
                        <span style={{color:"#F5B400",fontWeight:700}}>${(it.qty*it.price).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>}

          {tab==="booking" && (booked?(
            <div className="success-box">
              <div style={{fontSize:68}}>🎉</div>
              <div style={{fontSize:24,fontWeight:800,color:"#111110",margin:"16px 0 8px"}}>{t.bookSuccess}</div>
              <div style={{fontSize:15,color:"#777774"}}>{date} · {selTime}</div>
              <div style={{fontSize:15,fontWeight:600,color:"#F5B400",marginTop:4}}>{svc}</div>
              <button className="new-btn" onClick={()=>{setBooked(false);setDate("");setSvc("");setSelTime("");setNote("");}}>
                + {t.newBook}
              </button>
            </div>
          ):(
            <div className="card">
              <div className="card-ttl">{t.newBook}</div>
              <label className="field-lbl">{t.selectDate}</label>
              <input type="date" className="field-in" value={date} onChange={e=>setDate(e.target.value)} min={new Date().toISOString().split("T")[0]}/>
              <label className="field-lbl">{t.selectService}</label>
              <select className="field-in" value={svc} onChange={e=>setSvc(e.target.value)}>
                <option value="">—</option>
                {t.services.map(s=><option key={s}>{s}</option>)}
              </select>
              <label className="field-lbl">{t.selectTime}</label>
              <div className="time-grid">
                {times.map(tm=>(
                  <button key={tm} className={`time-btn${selTime===tm?" on":""}`} onClick={()=>setSelTime(tm)}>{tm}</button>
                ))}
              </div>
              <label className="field-lbl">{t.note}</label>
              <textarea className="field-in" rows={3} value={note} onChange={e=>setNote(e.target.value)} style={{resize:"none"}}/>
              <button className="confirm-btn" disabled={!date||!svc||!selTime} onClick={()=>setBooked(true)}>{t.confirm}</button>
            </div>
          ))}

          {tab==="history" && <div className="card">
            <div className="card-ttl">{t.tabHistory}</div>
            {d.history.map((j,i)=>(
              <div className="hist-row" key={i}>
                <div><div className="hist-svc">{j.service}</div><div className="hist-meta">{j.date} · {j.mechanic}</div></div>
                <div style={{textAlign:"right"}}>
                  <div className="hist-amt">${j.total}</div>
                  <span className="badge" style={{color:"#065F46",background:"#D1FAE5",fontSize:11,marginTop:4,display:"inline-flex"}}>🎉 {t.statusMap[j.status]}</span>
                </div>
              </div>
            ))}
          </div>}

          {tab==="points" && <>
            <div className="pts-hero">
              <div className="pts-lbl">{t.ptsBalance}</div>
              <div className="pts-num">{d.customer.points}</div>
              <div className="pts-note">{t.ptsnote}</div>
              <div className="pts-bar-bg">
                <div className="pts-bar" style={{width:`${Math.min((d.customer.points/500)*100,100)}%`}}/>
              </div>
              <div className="pts-sub">{d.customer.points} / 500 pts</div>
            </div>
            <div className="pts-grid">
              <div className="pts-card"><div className="pts-n" style={{color:"#065F46"}}>+{earned}</div><div className="pts-l">{t.ptsEarned}</div></div>
              <div className="pts-card"><div className="pts-n" style={{color:"#DC2626"}}>-{used}</div><div className="pts-l">{t.ptsUsed}</div></div>
            </div>
            <div className="card">
              <div className="card-ttl">Transactions</div>
              {d.ptsHistory.map((p,i)=>(
                <div className="txn-row" key={i}>
                  <div><div className="txn-name">{p.desc}</div><div className="txn-date">{p.date}</div></div>
                  <div style={{fontWeight:800,fontSize:17,color:p.delta>0?"#065F46":"#DC2626"}}>{p.delta>0?"+":""}{p.delta}</div>
                </div>
              ))}
            </div>
            <button className="redeem-btn">🎁 {t.redeem} · {d.customer.points} pts = ${(d.customer.points/100).toFixed(2)}</button>
          </>}

        </div>

        {/* TAB BAR - flex bottom, never moves */}
        <div className="tabbar">
          {[["status","🔧",t.tabStatus],["invoice","🧾",t.tabInvoice],["booking","📅",t.tabBooking],["history","📋",t.tabHistory],["points","⭐",t.tabPoints]].map(([key,icon,label])=>(
            <button key={key} className={`tab-btn${tab===key?" on":""}`} onClick={()=>setTab(key)}>
              <span className="tab-ico">{icon}</span>
              <span className="tab-lbl">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
