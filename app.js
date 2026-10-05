function $(i){return document.getElementById(i)}
var MN=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],WD=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],WO=[1,2,3,4,5,6,0];
var PAL=["#0f9d6b","#3b82f6","#f59e0b","#ef4444","#8b5cf6","#14b8c4","#94a3b8"];
var MON=/revenue|sales|amount|total|profit|income|salary|spend|expense|price|cost|fee|value|pay|wage|budget|fund/i,AVG=/rate|rating|score|age|percent|%|ratio|temperature|price|marks|grade|cgpa|gpa|margin|weight|height|satisfaction/i;
var RAW=[],FN="",OV={},CFG={},COLS=[],CL=[],S={},CH=[],turns=[],busy=false,ctl=null,smp=null,smpTried=false,CTX="";
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function fmt(n){if(n==null||isNaN(n))return "-";var a=Math.abs(n),s=n<0?"-":"",p=CFG.m&&MON.test(CFG.m)?"₹":"";return s+p+(a>=1e7?(a/1e7).toFixed(2)+"Cr":a>=1e5?(a/1e5).toFixed(1)+"L":(a>=1000||Number.isInteger(a)?Math.round(a).toLocaleString("en-IN"):a.toFixed(2)))}
function bl(k){return k.length===7?MN[+k.slice(5)-1]+" "+k.slice(2,4):k.length===10?(+k.slice(8))+" "+MN[+k.slice(5,7)-1]:k}
function cv(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim()}
function num(v){if(typeof v==="number")return isFinite(v)?v:null;if(typeof v==="string"){var t=v.replace(/[₹$,%\s]/g,"");return /^-?\d+(\.\d+)?$/.test(t)?parseFloat(t):null}return null}
function pd(v){if(v instanceof Date)return isNaN(v)?null:v;if(typeof v!=="string")return null;v=v.trim();var m=v.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);if(m){var y=+m[3];if(y<100)y+=2000;return new Date(y,+m[2]-1,+m[1])}
if(/^\d{4}-\d{1,2}-\d{1,2}/.test(v)||/^\d{1,2}\s+[A-Za-z]{3,9}\.?,?\s+\d{4}$/.test(v)||/^[A-Za-z]{3,9}\.?\s+\d{1,2},?\s+\d{4}$/.test(v)){var d=new Date(v);return isNaN(d)?null:d}return null}
function err(m){$("err").textContent=m}
function mm(a,f){var r=a[0];for(var i=1;i<a.length;i++)r=f(r,a[i]);return r}
function topk(m,n,asc){return Object.keys(m).sort(function(a,b){return asc?m[a]-m[b]:m[b]-m[a]}).slice(0,n)}
function fc(n){return COLS.filter(function(c){return c.n===n})[0]||null}
function sh(t,n){t=String(t);return t.length>n?t.slice(0,n-1)+"…":t}
/* sample data */
function sampleRows(){var s=11;function rnd(){s=(s*1664525+1013904223)%4294967296;return s/4294967296}
var P=[["Cotton kurta",1499,.5],["Linen shirt",1899,.48],["Silk dupatta",2499,.55],["Denim jacket",3499,.8],["Canvas tote",799,1.1],["Wool shawl",2999,.58]],
C=["Aarav Mehta","Isha Kulkarni","Rohan Patil","Sneha Joshi","Vikram Shah","Anita Desai","Karan Malhotra","Neha Iyer","Rahul Verma","Pooja Nair","Amit Kale","Divya Rao","Sanjay More","Meera Pillai","Nikhil Jain","Priya Gupta","Arjun Reddy","Kavya Menon","Tanvi Shetty","Yash Bhatt"],G=["West","South","North","East"],rows=[];
for(var m=0;m<12;m++){var y=2025+Math.floor((9+m)/12),mo=(9+m)%12,n=38+m*4+Math.floor(rnd()*10);
for(var i=0;i<n;i++){var p=P[Math.floor(Math.pow(rnd(),1.5)*6)];if(p[0]==="Linen shirt"&&m===10&&rnd()<.85)continue;
var q=1+Math.floor(rnd()*3),rev=Math.round(p[1]*q*(.9+rnd()*.2)),d=new Date(y,mo,1+Math.floor(rnd()*28));
rows.push({"Order Date":d,"Product":p[0],"Customer":C[Math.floor(Math.pow(rnd(),1.6)*C.length)],"Region":G[Math.floor(rnd()*rnd()*4)],"Quantity":q,"Revenue":rev,"Cost":Math.round(rev*p[2]*(.95+rnd()*.1))})}
if(m===5)rows.push({"Order Date":new Date(y,mo,14),"Product":"Wool shawl","Customer":"Sanjay More","Region":"West","Quantity":30,"Revenue":85000,"Cost":50000})}
for(var k=0;k<6;k++)rows.push(rows[10+k*20]);return rows}
/* reading */
function handle(f){err("");if(!f)return;if(f.size>10*1048576)return err("This file is over 10 MB. Try a smaller file.");
if(typeof XLSX==="undefined")return err("The file reader did not load. Check your internet and refresh.");
var r=new FileReader();r.onload=function(e){try{var wb=XLSX.read(e.target.result,{type:"array",cellDates:true});start(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:null}),f.name)}catch(x){err("Could not read this file. Please use .xlsx or .csv.")}};r.readAsArrayBuffer(f)}
function start(rows,name){rows=rows.filter(function(r){return Object.keys(r).some(function(k){return r[k]!==null&&r[k]!==""})});if(rows.length<2)return err("This file needs a header row and at least one row of data.");RAW=rows;FN=name;OV={};CFG={};analyze(true)}
function profile(){var keys=Object.keys(CL[0]);
COLS=keys.map(function(k){var vals=CL.map(function(r){return r[k]}),nn=vals.filter(function(v){return v!==null&&v!==undefined&&v!==""}),c={n:k,miss:1-nn.length/CL.length};
if(!nn.length){c.t="text";c.uniq=0;c.v=vals.map(function(){return null});return c}
var set={};nn.forEach(function(v){set[String(v)]=1});c.uniq=Object.keys(set).length;c.ex=String(nn[0] instanceof Date?nn[0].toLocaleDateString("en-IN"):nn[0]);
var nd=nn.filter(function(v){return pd(v)!==null}).length/nn.length,nu=nn.filter(function(v){return num(v)!==null}).length/nn.length,
idn=/(^|[\s_\-.])(id|no|number|code|phone|mobile|zip|pin|pincode|roll|sr|sno|serial|index)($|[\s_\-.])/i.test(k),
yr=/year/i.test(k)&&nu>.8&&nn.every(function(v){var x=num(v);return x>=1900&&x<=2100});
if(nd>.8)c.t="date";else if(yr)c.t="cat";
else if(nu>.8){c.t=(idn||(c.uniq>.98*nn.length&&nn.length>20&&nn.every(function(v){return Number.isInteger(num(v))})&&(function(){var lo=Infinity,hi=-Infinity;nn.forEach(function(v){var x=num(v);if(x<lo)lo=x;if(x>hi)hi=x});return hi-lo<=nn.length*1.5})()))?"id":"num";if(c.t==="num"&&c.uniq<=2)c.t="cat"}
else c.t=(c.uniq<=60||c.uniq/nn.length<.5)?"cat":"text";
if(OV[k])c.t=OV[k];
c.v=vals.map(function(v){return v===null||v===undefined||v===""?null:c.t==="num"?num(v):c.t==="date"?pd(v):String(v)});return c})}
function roles(){var nums=COLS.filter(function(c){return c.t==="num"}),dims=COLS.filter(function(c){return c.t==="cat"&&c.uniq>=2}),dts=COLS.filter(function(c){return c.t==="date"});
var PRI=/revenue|sales|amount|total|profit|income|salary|spend|expense|price|cost|value|score|marks|qty|quantity|count|fee|rating|weight|height|temperature|age/i,DIM=/product|category|item|dept|department|region|segment|type|status|city|state|country|branch|class|gender|channel|group|team|name/i;
function ok(n,l){return l.some(function(c){return c.n===n})}
if(CFG.m!==null&&!ok(CFG.m,nums)){CFG.m=undefined}
if(CFG.m===undefined){var PO=[/revenue|sales/i,/amount|total|income|salary|spend|expense|fee/i,/profit|price|value/i],p=null;for(var pi=0;pi<PO.length&&!p;pi++)p=nums.filter(function(c){return PO[pi].test(c.n)})[0];p=p||nums.filter(function(c){return PRI.test(c.n)})[0]||nums[0];CFG.m=p?p.n:null;CFG.aset=false}
var pool=dims.filter(function(c){return c.uniq<=40}),pref=pool.filter(function(c){return DIM.test(c.n)})[0]||pool.slice().sort(function(a,b){return a.uniq-b.uniq})[0]||dims[0];
if(CFG.g===undefined||(CFG.g!==null&&!ok(CFG.g,dims)))CFG.g=pref?pref.n:null;
var rest=pool.filter(function(c){return c.n!==CFG.g});if(CFG.g2===undefined||CFG.g2===CFG.g||(CFG.g2!==null&&!ok(CFG.g2,dims)))CFG.g2=(rest.filter(function(c){return DIM.test(c.n)})[0]||rest[0]||{}).n||null;
if(CFG.t===undefined||(CFG.t!==null&&!ok(CFG.t,dts)))CFG.t=dts.length?dts[0].n:null;
if(!CFG.aset)CFG.a=CFG.m?(AVG.test(CFG.m)?"avg":"sum"):"count"}
function pr(a,b){var n=0,sx=0,sy=0,sxy=0,sxx=0,syy=0;for(var i=0;i<a.length;i++){if(a[i]==null||b[i]==null)continue;n++;sx+=a[i];sy+=b[i];sxy+=a[i]*b[i];sxx+=a[i]*a[i];syy+=b[i]*b[i]}if(n<5)return null;var d=Math.sqrt((n*sxx-sx*sx)*(n*syy-sy*sy));return d?(n*sxy-sx*sy)/d:null}
function calc(){var mc=fc(CFG.m),gc=fc(CFG.g),g2=fc(CFG.g2),tc=fc(CFG.t),N=CL.length,s={mc:mc,gc:gc,g2:g2,tc:tc},V=mc?mc.v:CL.map(function(){return 1}),ids=[];
for(var i=0;i<N;i++)if(V[i]!=null)ids.push(i);s.ids=ids;s.n=ids.length;s.V=V;s.ml=mc?mc.n:"Records";var A=mc?CFG.a:"count";s.A=A;
var ag=function(l){if(A==="count")return l.length;var t=0,c=0;l.forEach(function(i){if(V[i]!=null){t+=V[i];c++}});return A==="avg"?(c?t/c:0):t};s.ag=ag;s.al=A==="sum"?"Total":A==="avg"?"Average":"Count of";
var vals=ids.map(function(i){return V[i]}).sort(function(a,b){return a-b});s.avg=vals.length?vals.reduce(function(a,b){return a+b},0)/vals.length:0;s.med=vals[Math.floor(vals.length/2)];s.min=vals[0];s.max=vals[vals.length-1];s.vals=vals;s.total=ag(ids);
s.T=null;s.proj=[];s.g=null;s.W=null;
if(tc){var dd=ids.filter(function(i){return tc.v[i]});if(dd.length>1){var tm=dd.map(function(i){return +tc.v[i]}),mn=mm(tm,Math.min),mx=mm(tm,Math.max),span=(mx-mn)/864e5;
if(span>=1){var bk=span>2200?"y":span>=75?"m":"d",kf=function(i){var d=tc.v[i];return bk==="y"?String(d.getFullYear()):d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+(bk==="d"?"-"+("0"+d.getDate()).slice(-2):"")},G={};
dd.forEach(function(i){var k=kf(i);(G[k]=G[k]||[]).push(i)});var ks=Object.keys(G).sort();if(ks.length>60)ks=ks.slice(-60);var vs=ks.map(function(k){return ag(G[k])});s.T={ks:ks,vs:vs,bk:bk,span:span};
var L=ks.length;if(L>1&&vs[L-2]){s.g=(vs[L-1]/vs[L-2]-1)*100}
if(bk==="m"&&L>=4){var ys=vs.slice(-12),n=ys.length,sx=0,sy=0,sxy=0,sxx=0;ys.forEach(function(y,i){sx+=i;sy+=y;sxy+=i*y;sxx+=i*i});var sl=(n*sxy-sx*sy)/(n*sxx-sx*sx),ic=(sy-sl*sx)/n,l=ks[L-1],yy=+l.slice(0,4),m2=+l.slice(5);
for(var i2=1;i2<=3;i2++){m2++;if(m2>12){m2=1;yy++}s.proj.push({k:yy+"-"+("0"+m2).slice(-2),v:Math.max(0,ic+sl*(n-1+i2))})}}
if(span>=14){var WG=[[],[],[],[],[],[],[]];dd.forEach(function(i){WG[tc.v[i].getDay()].push(i)});s.W=WG.map(function(l){return l.length?ag(l):0})}}}}
function brk(c){if(!c)return null;var G={};ids.forEach(function(i){var k=c.v[i];if(k==null)k="(blank)";(G[k]=G[k]||[]).push(i)});var ks=Object.keys(G),v={};ks.forEach(function(k){v[k]=ag(G[k])});ks.sort(function(a,b){return v[b]-v[a]});return {ks:ks,v:v,G:G}}
s.B1=brk(gc);s.B2=brk(g2);
var nm=COLS.filter(function(c){return c.t==="num"}).slice(0,8),co=[];for(var a=0;a<nm.length;a++)for(var b=a+1;b<nm.length;b++){var r=pr(nm[a].v,nm[b].v);if(r!==null&&Math.abs(r)>=.5)co.push({a:nm[a].n,b:nm[b].n,r:Math.round(r*100)/100})}
co.sort(function(x,y){return Math.abs(y.r)-Math.abs(x.r)});s.co=co.slice(0,4);
s.sc=null;if(mc){var best=null;COLS.filter(function(c){return c.t==="num"&&c.n!==mc.n}).forEach(function(c){var r=pr(c.v,mc.v);if(r!==null&&(!best||Math.abs(r)>Math.abs(best.r)))best={c:c,r:r}});s.sc=best}
var lc=COLS.filter(function(c){return c.t==="text"||c.t==="id"})[0]||gc;s.lc=lc;s.lab=function(i){return lc&&lc.v[i]!=null?lc.v[i]:"Row "+(i+2)};
var an=[];if(mc&&vals.length>=8){var q1=vals[Math.floor(vals.length*.25)],q3=vals[Math.floor(vals.length*.75)],iq=q3-q1,hi=q3+3*iq,lo=q1-3*iq,out=ids.filter(function(i){return iq>0&&(V[i]>hi||V[i]<lo)});
if(out.length){out.sort(function(x,y){return Math.abs(V[y]-s.avg)-Math.abs(V[x]-s.avg)});an.push(out.length+" unusual value"+(out.length>1?"s":"")+" in "+mc.n+". Most extreme: "+fmt(V[out[0]])+" ("+s.lab(out[0])+").")}}
if(s.T&&s.T.vs.length>=6){var tv=s.T.vs,mu=tv.reduce(function(a,b){return a+b},0)/tv.length,sd=Math.sqrt(tv.reduce(function(a,v){return a+(v-mu)*(v-mu)},0)/tv.length);
s.T.ks.forEach(function(k,i){var z=(tv[i]-mu)/(sd||1);if(Math.abs(z)>1.7&&mu)an.push(bl(k)+": "+fmt(tv[i])+" is "+Math.abs(Math.round((tv[i]/mu-1)*100))+"% "+(z>0?"above":"below")+" the usual level.")})}
if(mc&&s.min<0&&COLS.length)an.push(ids.filter(function(i){return V[i]<0}).length+" rows have negative "+mc.n+" values.");
COLS.filter(function(c){return c.miss>.05}).forEach(function(c){an.push(c.n+" is "+Math.round(c.miss*100)+"% empty.")});s.an=an.slice(0,6);
var I=[];if(s.B1&&s.B1.ks.length>1){var k0=s.B1.ks[0],sum=s.B1.ks.reduce(function(a,k){return a+Math.max(0,s.B1.v[k])},0);I.push("<b>"+esc(k0)+"</b> leads "+esc(gc.n)+" with "+fmt(s.B1.v[k0])+(A!=="avg"&&sum>0?" ("+Math.round(s.B1.v[k0]/sum*100)+"% of the total)":"")+", while <b>"+esc(s.B1.ks[s.B1.ks.length-1])+"</b> is lowest at "+fmt(s.B1.v[s.B1.ks[s.B1.ks.length-1]])+".")}
if(s.g!==null)I.push("Latest "+(s.T.bk==="m"?"month":s.T.bk==="y"?"year":"day")+" is <b class='"+(s.g>=0?"up":"dn")+"'>"+(s.g>=0?"up ":"down ")+Math.abs(s.g).toFixed(1)+"%</b> versus the one before.");
if(s.W){var bi=s.W.indexOf(mm(s.W,Math.max));I.push("<b>"+WD[bi]+"</b> is the strongest weekday.")}
if(s.proj.length)I.push("At the current trend, <b>"+bl(s.proj[0].k)+"</b> could be near "+fmt(s.proj[0].v)+".");
if(s.co.length)I.push("<b>"+esc(s.co[0].a)+"</b> and <b>"+esc(s.co[0].b)+"</b> are "+(s.co[0].r>0?"positively":"negatively")+" related (r = "+s.co[0].r+").");
if(!mc)I.push("No numeric column found, so Mirai is counting records by category.");
s.ins=I.slice(0,5);return s}
/* dashboard */
function spark(v,c){if(v.length<2)return"";var mx=mm(v,Math.max),mn=mm(v,Math.min),pts=v.map(function(y,i){return (i/(v.length-1)*110).toFixed(1)+","+(28-(y-mn)/((mx-mn)||1)*24).toFixed(1)}).join(" ");return '<svg viewBox="0 0 110 30"><polyline fill="none" stroke="'+c+'" stroke-width="2.5" stroke-linejoin="round" points="'+pts+'"/></svg>'}
function kc(l,v,d,sp,sm){return '<div class="kc"><small>'+l+'</small><strong'+(sm?' style="font-size:20px;line-height:1.5"':'')+'>'+v+'</strong><span class="dl '+(d&&d[1]||"")+'">'+(d?d[0]:"&nbsp;")+'</span>'+(sp||"")+'</div>'}
function mkc(id,cfg){var c=$(id);if(!c)return;var ch=new Chart(c,cfg);CH.push(ch);return ch}
function hide(id,on){$(id).closest(".cd").style.display=on?"none":""}
function gradf(c){return function(x){var a=x.chart.chartArea;if(!a)return c+"33";var g=x.chart.ctx.createLinearGradient(0,a.top,0,a.bottom);g.addColorStop(0,c+"55");g.addColorStop(1,c+"00");return g}}
function sel(id,l,opts,cur){return '<label>'+l+'<select id="'+id+'">'+opts.map(function(o){return '<option value="'+esc(o[0])+'"'+(o[0]===cur?" selected":"")+'>'+esc(o[1])+'</option>'}).join("")+'</select></label>'}
function toolbar(){var nums=COLS.filter(function(c){return c.t==="num"}),dims=COLS.filter(function(c){return c.t==="cat"&&c.uniq>=2}),dts=COLS.filter(function(c){return c.t==="date"});
$("tool").innerHTML=sel("sm","Measure",[["","Count of rows"]].concat(nums.map(function(c){return [c.n,c.n]})),CFG.m||"")+sel("sg","Group by",[["","(none)"]].concat(dims.map(function(c){return [c.n,c.n]})),CFG.g||"")+
sel("sa","Calculate",[["sum","Sum"],["avg","Average"],["count","Count"]],CFG.a)+sel("st","Date column",[["","(none)"]].concat(dts.map(function(c){return [c.n,c.n]})),CFG.t||"");
function ch(){CFG.m=$("sm").value||null;CFG.g=$("sg").value||null;CFG.g2=undefined;CFG.a=$("sa").value;CFG.aset=true;CFG.t=$("st").value||null;if(!CFG.m)CFG.a="count";roles();S=calc();S.dup=DUP;render();resetChat("Setup changed: now looking at "+S.al.toLowerCase()+" "+S.ml+(S.gc?" by "+S.gc.n:"")+".")}
["sm","sg","sa","st"].forEach(function(i){$(i).onchange=ch})}
function render(){CH.forEach(function(c){c.destroy()});CH=[];var mu=cv("--mute"),gl=cv("--line"),g=PAL[0];
Chart.defaults.font.family='"Instrument Sans",system-ui,sans-serif';Chart.defaults.color=mu;toolbar();
var T=S.T,B1=S.B1,B2=S.B2,ml=S.ml,al=S.al,pu=T?(T.bk==="m"?"month":T.bk==="y"?"year":"day"):"";
$("kp").innerHTML=kc(al+" "+esc(ml),fmt(S.total),S.g!==null?[(S.g>=0?"▲ ":"▼ ")+Math.abs(S.g).toFixed(1)+"% vs previous "+pu,S.g>=0?"up":"dn"]:null,T?spark(T.vs,g):"")+
(S.mc?kc("Average per record",fmt(S.avg),["Median "+fmt(S.med)],""):kc("Records",S.n.toLocaleString("en-IN"),null,""))+
(B1?kc("Top "+esc(S.gc.n),esc(sh(B1.ks[0],22)),[fmt(B1.v[B1.ks[0]])+(B1.ks.length>1?" of "+B1.ks.length+" groups":"")],"",1):kc("Highest value",fmt(S.max),["Lowest "+fmt(S.min)],""))+
kc("Records",S.n.toLocaleString("en-IN"),[COLS.length+" columns"],"");
$("ins").innerHTML=S.ins.map(function(t){return "<div>"+t+"</div>"}).join("");
document.querySelectorAll(".cd").forEach(function(c){c.style.display=""});
var sc=function(f){return {x:{grid:{display:false},ticks:{color:mu,maxRotation:0,autoSkip:true}},y:{grid:{color:gl},border:{display:false},ticks:{color:mu,callback:f||function(v){return fmt(v)}}}}};
if(T){var ks=T.ks.slice(-24),vs=T.vs.slice(-24),nn=ks.length,pl=S.proj.map(function(p){return bl(p.k)}),ds=[{label:al+" "+ml,data:vs.concat(pl.map(function(){return null})),borderColor:g,backgroundColor:gradf(g),fill:true,tension:.35,pointRadius:vs.length>40?0:3}];
if(S.proj.length){var pj=vs.map(function(){return null});pj[nn-1]=vs[nn-1];ds.push({label:"Projection",data:pj.concat(S.proj.map(function(p){return p.v})),borderColor:PAL[2],borderDash:[6,5],tension:.35,pointRadius:3,fill:false})}
$("h1").textContent=al+" "+ml+" by "+pu+(S.proj.length?", with 3-month projection":"");
mkc("ch1",{type:"line",data:{labels:ks.map(bl).concat(pl),datasets:ds},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:"index",intersect:false},plugins:{legend:{position:"bottom",labels:{usePointStyle:true,boxWidth:8}},tooltip:{callbacks:{label:function(c){return c.dataset.label+": "+fmt(c.parsed.y)}}}},scales:sc()}})}else hide("ch1",1);
function bar2(id,hid,B,c,t){if(!B||B.ks.length<2){hide(id,1);return}$(hid).textContent=t;var k=B.ks.slice(0,8);mkc(id,{type:"bar",data:{labels:k.map(function(x){return sh(x,14)}),datasets:[{data:k.map(function(x){return B.v[x]}),backgroundColor:k.map(function(x){return B.v[x]<0?PAL[3]:PAL[1]}),borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:function(c){return fmt(c.parsed.y)}}}},scales:sc()}})}
var donut=B1&&B1.ks.length>=2&&S.A!=="avg"&&B1.ks.every(function(k){return B1.v[k]>=0});
if(donut){var t5=B1.ks.slice(0,5),tot=B1.ks.reduce(function(a,k){return a+B1.v[k]},0),ot=tot-t5.reduce(function(a,k){return a+B1.v[k]},0),dl=t5.map(function(k){return sh(k,18)}),dv=t5.map(function(k){return B1.v[k]});if(ot>0&&B1.ks.length>5){dl.push("Others");dv.push(ot)}
$("h2").textContent="Share of "+ml+" by "+S.gc.n;mkc("ch2",{type:"doughnut",data:{labels:dl,datasets:[{data:dv,backgroundColor:PAL,borderColor:cv("--surface"),borderWidth:3}]},options:{responsive:true,maintainAspectRatio:false,cutout:"62%",plugins:{legend:{position:"right",labels:{usePointStyle:true,boxWidth:8}},tooltip:{callbacks:{label:function(c){return c.label+": "+fmt(c.parsed)+" ("+Math.round(c.parsed/tot*100)+"%)"}}}}}})}
else if(B2)bar2("ch2","h2",B2,S.g2,al+" "+ml+" by "+S.g2.n);else hide("ch2",1);
if(B1&&B1.ks.length>=2){var tp=B1.ks.slice(0,10);$("h3").textContent="Top "+S.gc.n+" by "+al.toLowerCase()+" "+ml;mkc("ch3",{type:"bar",data:{labels:tp.map(function(k){return sh(k,16)}),datasets:[{data:tp.map(function(k){return B1.v[k]}),backgroundColor:tp.map(function(k){return B1.v[k]<0?PAL[3]:g}),borderRadius:6}]},options:{indexAxis:"y",responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:function(c){return fmt(c.parsed.x)}}}},scales:{x:{grid:{color:gl},border:{display:false},ticks:{color:mu,callback:function(v){return fmt(v)}}},y:{grid:{display:false},ticks:{color:mu}}}}})}else hide("ch3",1);
if(S.W){var mx=mm(S.W,Math.max);$("h4").textContent=al+" "+ml+" by weekday";mkc("ch4",{type:"bar",data:{labels:WO.map(function(i){return WD[i]}),datasets:[{data:WO.map(function(i){return S.W[i]}),backgroundColor:WO.map(function(i){return S.W[i]===mx?g:g+"66"}),borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:function(c){return fmt(c.parsed.y)}}}},scales:sc()}})}
else if(B2&&donut)bar2("ch4","h4",B2,S.g2,al+" "+ml+" by "+S.g2.n);else hide("ch4",1);
var vs2=S.vals,hi=vs2.length?vs2[Math.floor(vs2.length*.95)]:0,lo=vs2.length?vs2[0]:0,nb=8,w=(hi-lo)/nb;
if(S.mc&&w>0){var cn=[],lb=[];for(var i=0;i<nb;i++){cn.push(0);lb.push(fmt(lo+i*w))}vs2.forEach(function(v){cn[Math.max(0,Math.min(nb-1,Math.floor((v-lo)/w)))]++});$("h5").textContent="Distribution of "+ml;
mkc("ch5",{type:"bar",data:{labels:lb,datasets:[{data:cn,backgroundColor:PAL[4]+"cc",borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{title:function(c){return "From "+c[0].label},label:function(c){return c.parsed.y+" records"}}}},scales:sc(function(v){return v})}})}else hide("ch5",1);
if(S.sc){var pts=[],st=Math.max(1,Math.floor(S.ids.length/500));S.ids.forEach(function(i,j){if(j%st===0&&S.sc.c.v[i]!=null)pts.push({x:S.sc.c.v[i],y:S.V[i]})});$("h6").textContent=ml+" vs "+S.sc.c.n+" (correlation r = "+S.sc.r.toFixed(2)+")";
mkc("ch6",{type:"scatter",data:{datasets:[{data:pts,backgroundColor:PAL[5]+"99",pointRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:function(c){return S.sc.c.n+": "+c.parsed.x+", "+ml+": "+fmt(c.parsed.y)}}}},scales:{x:{title:{display:true,text:S.sc.c.n,color:mu},grid:{color:gl},ticks:{color:mu}},y:{title:{display:true,text:ml,color:mu},grid:{color:gl},ticks:{color:mu,callback:function(v){return fmt(v)}}}}}})}else hide("ch6",1);
var tr=S.mc?S.ids.slice().sort(function(a,b){return S.V[b]-S.V[a]}).slice(0,6):S.ids.slice(0,6);
$("tc").innerHTML='<table class="tbl"><tr><th>Record</th>'+(S.gc&&S.lc!==S.gc?"<th>"+esc(S.gc.n)+"</th>":"")+"<th>"+esc(ml)+"</th></tr>"+tr.map(function(i){return "<tr><td>"+esc(sh(S.lab(i),24))+"</td>"+(S.gc&&S.lc!==S.gc?"<td>"+esc(sh(S.gc.v[i]==null?"":S.gc.v[i],18))+"</td>":"")+"<td>"+(S.mc?fmt(S.V[i]):"1")+"</td></tr>"}).join("")+"</table>";
$("an").innerHTML=S.an.length?"<ul>"+S.an.map(function(t){return "<li>"+esc(t)+"</li>"}).join("")+"</ul>":"<p class='note'>Nothing unusual found in this file.</p>";
$("rep").innerHTML="<ul><li>"+RAW.length+" rows read, "+S.n+" used</li><li>"+DUP+" exact duplicate rows removed</li><li>"+COLS.length+" columns: "+COLS.filter(function(c){return c.t==="num"}).length+" numeric, "+COLS.filter(function(c){return c.t==="cat"}).length+" category, "+COLS.filter(function(c){return c.t==="date"}).length+" date</li><li>Dates written as text are read as day/month/year</li></ul>";
$("mp").innerHTML='<table class="tbl"><tr><th>Column</th><th>Type</th><th>Empty</th><th>Unique</th><th>Example</th></tr>'+COLS.map(function(c,i){return "<tr><td>"+esc(c.n)+'</td><td><select data-i="'+i+'">'+[["num","Number"],["date","Date"],["cat","Category"],["text","Text"],["id","ID"]].map(function(o){return '<option value="'+o[0]+'"'+(c.t===o[0]?" selected":"")+">"+o[1]+"</option>"}).join("")+"</select></td><td>"+Math.round(c.miss*100)+"%</td><td>"+c.uniq+"</td><td>"+esc(sh(c.ex||"",24))+"</td></tr>"}).join("")+"</table>";
document.querySelectorAll("#mp select").forEach(function(x){x.onchange=function(){OV[COLS[+x.dataset.i].n]=x.value;analyze(false)}});
var keys=COLS.map(function(c){return c.n});$("pv").innerHTML='<table class="tbl"><tr>'+keys.map(function(k){return "<th>"+esc(k)+"</th>"}).join("")+"</tr>"+CL.slice(0,8).map(function(r){return "<tr>"+keys.map(function(k){var v=r[k];return "<td>"+esc(sh(v instanceof Date?v.toLocaleDateString("en-IN"):v==null?"":v,24))+"</td>"}).join("")+"</tr>"}).join("")+"</table>"}
var DUP=0;
function analyze(first){var seen={},dup=0;CL=[];RAW.forEach(function(r){var sg=JSON.stringify(r);if(seen[sg]){dup++;return}seen[sg]=1;CL.push(r)});DUP=dup;profile();roles();S=calc();
if(!S.n)return err("No usable rows found.");err("");$("drop").style.display="none";$("app").hidden=false;$("barname").textContent=FN;render();resetChat()}
document.querySelectorAll(".tb").forEach(function(b){b.onclick=function(){document.querySelectorAll(".tb").forEach(function(x){x.classList.toggle("on",x===b)});document.querySelectorAll(".tp").forEach(function(p){p.hidden=p.id!==b.dataset.t})}});
/* Ask Mirai */
function md(t){var h=esc(t).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>"),o="",u=false;h.split("\n").forEach(function(l){var m=l.match(/^\s*(?:[-*]|\d+\.)\s+(.*)/);if(m){if(!u){o+="<ul>";u=true}o+="<li>"+m[1]+"</li>"}else{if(u){o+="</ul>";u=false}if(l.trim())o+="<p>"+l.replace(/^#+\s*/,"")+"</p>"}});return o+(u?"</ul>":"")}
function addB(c,h){var d=document.createElement("div");d.className="b "+c;d.innerHTML=h;$("msgs").appendChild(d);$("msgs").scrollTop=1e9;return d}
function chips(a){$("chips").innerHTML="";a.forEach(function(q){var b=document.createElement("button");b.className="q";b.textContent=q;b.onclick=function(){ask(q)};$("chips").appendChild(b)})}
function buildCtx(){var m=S.mc;function B(b){return b?b.ks.slice(0,10).map(function(k){return {name:k,value:Math.round(b.v[k]*100)/100,rows:b.G[k].length}}):null}
return "You are Mirai, an AI data analyst for small and medium businesses and teams in India, chatting inside a website. The user uploaded a spreadsheet that can be about ANY topic (sales, students, HR, expenses, inventory, surveys, and so on). Sound like a sharp, friendly analyst.\nRules:\n- Start with the direct answer, then key numbers, then the likely reason only if the data supports it, then one concrete action.\n- Use the query_data tool for any figure not in the summary. Never invent numbers. If the data cannot answer, say so and say what data would help.\n- Money columns are in rupees; format with L (lakh) and Cr (crore). Plain language, under 170 words unless asked for more.\n- Use **bold** for key figures and short bullet lists starting with '- '. No tables, no headings.\n- For small talk or general questions, answer briefly and steer back to the data.\n- Finish with one line: FOLLOWUPS: question one | question two | question three\n\nDATA SUMMARY (JSON):\n"+JSON.stringify({file:FN,rows:CL.length,columns:COLS.slice(0,40).map(function(c){return {name:c.n,type:c.t,empty_pct:Math.round(c.miss*100),unique:c.uniq,example:c.ex}}),
view:{measure:m?m.n:"count of rows",calculation:S.A,group_by:S.gc?S.gc.n:null,date_column:S.tc?S.tc.n:null},overall:{total:Math.round(S.total*100)/100,average:Math.round(S.avg*100)/100,median:S.med,min:S.min,max:S.max},
time_series:S.T?S.T.ks.map(function(k,i){return {period:k,value:Math.round(S.T.vs[i]*100)/100}}).slice(-36):null,by_primary_group:B(S.B1),by_second_group:B(S.B2),correlations:S.co,warnings:S.an,
projection_next_3_months:S.proj.map(function(p){return {month:p.k,value:Math.round(p.v)}}),is_demo:FN.indexOf("sample")===0})+"\n\nConversation follows. User question: "}
function resetChat(note){turns=[];$("chips").innerHTML="";
if(note){addB("a","<p class='note'>"+esc(note)+"</p>")}else{$("msgs").innerHTML="";addB("a","<p>Hi, I'm Mirai. I've read <b>"+esc(FN)+"</b> ("+CL.length+" rows, "+COLS.length+" columns). Ask me anything about this data, like what stands out, what is driving a number, or what to do next.</p>")}
var q=["Give me a summary of this data"];if(S.gc)q.push("Which "+S.gc.n+" stands out, and which is weakest?");if(S.T)q.push("What is the trend over time?");if(S.co.length||COLS.filter(function(c){return c.t==="num"}).length>1)q.push("What relationships do you see between columns?");q.push("Are there any outliers or data quality problems?");q.push("What should I do next based on this data?");chips(q);CTX=buildCtx()}
function quick(q){var t=q.toLowerCase();if(S.B1&&/top|best|stand|weak|which|lead/.test(t))return "Top "+S.gc.n+" by "+S.al.toLowerCase()+" "+S.ml+": "+S.B1.ks.slice(0,3).map(function(k){return k+" ("+fmt(S.B1.v[k])+")"}).join(", ")+". Weakest: "+S.B1.ks[S.B1.ks.length-1]+".";
if(S.T&&/trend|time|grow|month/.test(t)&&S.g!==null)return "Latest period is "+(S.g>=0?"up ":"down ")+Math.abs(S.g).toFixed(1)+"% versus the one before.";if(/outlier|quality|problem|empty|missing/.test(t))return S.an.length?S.an.join(" "):"I found no unusual values or data problems.";
return S.al+" "+S.ml+" is "+fmt(S.total)+" across "+S.n+" records."}
function runQuery(a){a=a||{};var nums=COLS.filter(function(c){return c.t==="num"}).map(function(c){return c.n}),m=a.measure?fc(a.measure):null;
if(a.measure&&(!m||m.t!=="num"))throw new Error("Unknown numeric column '"+a.measure+"'. Numeric columns: "+nums.join(", "));
var rs=[];for(var i=0;i<CL.length;i++)rs.push(i);
(a.filters||[]).forEach(function(f){var c=fc(f.column);if(!c)throw new Error("Unknown column '"+f.column+"'. Columns: "+COLS.map(function(x){return x.n}).join(", "));var op=f.op||"eq",val=f.value,vn=Number(val),vd=pd(String(val));
rs=rs.filter(function(i){var x=c.v[i];if(x==null)return false;if(c.t==="date"){var xd=+x,vv=vd?+vd:NaN;return op==="gt"||op==="gte"?xd>=vv:op==="lt"||op==="lte"?xd<=vv:xd===vv}
if(c.t==="num")return op==="gt"?x>vn:op==="gte"?x>=vn:op==="lt"?x<vn:op==="lte"?x<=vn:x===vn;var xs=String(x).toLowerCase(),vs=String(val).toLowerCase();return op==="contains"?xs.indexOf(vs)>=0:xs===vs})});
var g=a.group_by||"none",tc=S.tc,gk=null;
if(g==="month"||g==="year"||g==="weekday"){if(!tc)throw new Error("This file has no date column.");gk=function(i){var d=tc.v[i];if(!d)return null;return g==="year"?String(d.getFullYear()):g==="weekday"?WD[d.getDay()]:d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)}}
else if(g!=="none"){var gcn=fc(g);if(!gcn)throw new Error("Unknown column '"+g+"'. Columns: "+COLS.map(function(x){return x.n}).join(", "));gk=function(i){var x=gcn.v[i];return x==null?null:x instanceof Date?x.toLocaleDateString("en-IN"):String(x)}}
var G={};rs.forEach(function(i){var k=gk?gk(i):"All";if(k==null)k="(blank)";var x=m?m.v[i]:1;if(x==null)return;(G[k]=G[k]||[]).push(x)});
var ag=a.agg||(m?"sum":"count"),out=Object.keys(G).map(function(k){var l=G[k].slice().sort(function(p,q){return p-q}),t=l.reduce(function(p,q){return p+q},0);return [k,ag==="avg"?t/l.length:ag==="count"?l.length:ag==="min"?l[0]:ag==="max"?l[l.length-1]:ag==="median"?l[Math.floor(l.length/2)]:t]});
if(a.sort==="chronological"||(!a.sort&&(g==="month"||g==="year")))out.sort(function(x,y){return x[0]<y[0]?-1:1});else out.sort(function(x,y){return a.sort==="asc"?x[1]-y[1]:y[1]-x[1]});
return {matching_rows:rs.length,rows:out.slice(0,Math.min(+a.limit||10,30)).map(function(x){return [x[0],Math.round(x[1]*100)/100]})}}
var TOOL={name:"query_data",description:"Run a calculation on the user's spreadsheet rows. Returns [group, value] rows. Use it for any number not in the summary. measure must be a numeric column (omit to count rows). group_by is a column name, or month/year/weekday for the date column, or none.",inputSchema:{type:"object",properties:{measure:{type:"string"},agg:{type:"string",enum:["sum","avg","count","min","max","median"]},group_by:{type:"string"},filters:{type:"array",items:{type:"object",properties:{column:{type:"string"},op:{type:"string",enum:["eq","contains","gt","gte","lt","lte"]},value:{type:"string"}}}},sort:{type:"string",enum:["desc","asc","chronological"]},limit:{type:"integer"}}},
execute:function(a){var st=$("msgs").lastChild.querySelector(".stt");if(st)st.textContent="Running calculations…";return runQuery(a)}};
function getSmp(){if(smpTried)return Promise.resolve(smp);smpTried=true;try{return (window.claude&&claude.use?claude.use("sample"):Promise.resolve(null)).then(function(s){smp=s;return s},function(){return null})}catch(e){return Promise.resolve(null)}}
function setSend(b){busy=b;$("sb").textContent=b?"Stop":"Send";$("sb").className="btn "+(b?"s":"p")}
function ask(q){q=(q||"").trim();if(!q)return;if(busy)return;$("qi").value="";$("chips").innerHTML="";addB("u",esc(q));var bub=addB("a",'<span class="stt">Thinking…</span>');setSend(true);ctl=new AbortController();
getSmp().then(function(sm){
if(!sm){bub.innerHTML=md(quick(q))+"<p class='note'>Free-form AI answers work when this page is opened inside Claude. These are quick built-in answers.</p>";setSend(false);return}
turns.push({role:"user",content:(turns.length?"":CTX)+q});if(turns.length>13)turns.splice(1,2);
return sm(turns,{cache:false,signal:ctl.signal,tools:[TOOL],onText:function(o){bub.innerHTML=md(o.text.split("FOLLOWUPS:")[0])||'<span class="stt">Thinking…</span>'}}).then(function(r){
var p=r.text.split("FOLLOWUPS:");bub.innerHTML=md(p[0].trim())+(r.truncated?"<p class='note'>Answer cut short. Ask me to continue.</p>":"");turns.push({role:"assistant",content:r.text});
if(p[1])chips(p[1].split("|").map(function(x){return x.trim()}).filter(Boolean).slice(0,3));$("msgs").scrollTop=1e9},function(e){turns.pop();var c=e&&e.code;
if(c==="cancelled"){bub.innerHTML=md((e.text||"").split("FOLLOWUPS:")[0])||"<p class='note'>Stopped.</p>"}
else bub.innerHTML="<p class='note'>"+(c==="not_granted"?"Mirai AI needs your permission to run. Send your question again and allow it when asked.":c==="rate_limited"?"Too many requests at once. Wait a moment and try again.":"Something went wrong. Please try again.")+"</p>"})}).then(function(){setSend(false)},function(){setSend(false)})}
$("sb").onclick=function(){if(busy){ctl&&ctl.abort()}else ask($("qi").value)};
$("qi").onkeydown=function(e){if(e.key==="Enter"){e.preventDefault();if(!busy)ask($("qi").value)}};
$("exp").onclick=function(){var csv=XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(CL));
var go=window.claude&&claude.use?claude.use("downloads"):Promise.resolve(null);go.then(function(d){if(d)d.save({filename:"mirai-cleaned-data.csv",data:csv}).catch(function(){});else{var a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="mirai-cleaned-data.csv";a.click()}},function(){})};
$("again").onclick=function(){if(ctl)ctl.abort();$("app").hidden=true;$("drop").style.display="";$("file").value="";$("barname").textContent="Try it with your own Excel or CSV file";err("")};
$("load").onclick=function(){start(sampleRows(),"sample-store-sales.xlsx")};
$("pick").onclick=function(){$("file").click()};
$("file").onchange=function(e){handle(e.target.files[0])};
var dz=$("drop");["dragover","dragenter"].forEach(function(ev){dz.addEventListener(ev,function(e){e.preventDefault();dz.style.background="var(--hl)"})});
dz.addEventListener("dragleave",function(){dz.style.background=""});dz.addEventListener("drop",function(e){e.preventDefault();dz.style.background="";handle(e.dataTransfer.files[0])});

function send(e){e.preventDefault();var f=e.target;
var body="Name: "+f.n.value+"\nCompany: "+f.c.value+"\nEmail: "+f.e.value+"\nWhatsApp: "+f.w.value+"\n\n"+f.m.value;
location.href="mailto:miraiaianalyst@gmail.com?subject="+encodeURIComponent("Free data audit request")+"&body="+encodeURIComponent(body);
return false;}