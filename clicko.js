/* CLICKO web: satu berkas JS untuk semua halaman (halaman memilih tampilan lewat <body data-p="...">).
   Ganti API_URL dengan URL Web App Apps Script Anda (berakhiran /exec). */
const API_URL='https://script.google.com/macros/s/AKfycb.../exec';
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const rp=n=>'Rp'+Math.round(+n||0).toLocaleString('id-ID');
const P=document.body.dataset.p;
let D={},K={};   // D = seluruh isi Google Sheets, K = tab KONFIG sebagai pasangan kunci:nilai

/* ---- Pembantu media: link Google Drive dan YouTube dari Sheets diubah jadi URL yang bisa ditampilkan ---- */
const gid=u=>(String(u).match(/drive\.google\.com.*?(?:\/d\/|[?&]id=)([\w-]+)/)||[])[1];
const img=u=>gid(u)?`https://drive.google.com/thumbnail?id=${gid(u)}&sz=w800`:String(u||'');
const yt=u=>(String(u).match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/)||[])[1];
const vid=u=>yt(u)?`https://www.youtube.com/embed/${yt(u)}`:gid(u)?`https://drive.google.com/file/d/${gid(u)}/preview`:u;
const tgl=s=>{const d=new Date(s);return isNaN(d)?esc(s):d.toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})};
const pic=(u,a)=>u?`<img loading="lazy" src="${esc(img(u))}" alt="${esc(a)}">`:'';

/* ---- Ambil data dari Google Sheets (GET ke doGet). Salinan terakhir dipakai dulu supaya halaman langsung tampil. ---- */
async function load(){
  try{D=JSON.parse(localStorage.clicko_d||'{}')}catch(e){}
  if(D.konfig)draw();
  try{
    const r=await fetch(API_URL);
    D=await r.json();
    try{localStorage.clicko_d=JSON.stringify(D)}catch(e){}
    draw();
  }catch(e){
    if(!D.konfig)$('#app').innerHTML='<div class="g empty">Data belum bisa dimuat. Periksa koneksi internet, lalu <button class="btn o" onclick="load()">muat ulang</button></div>';
  }
}
const post=p=>fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(p)})
  .then(r=>r.json()).then(j=>{if(!j.ok)throw new Error(j.err||'Server menolak data');return j});

/* ---- Keranjang: disimpan di localStorage, hangus 3 hari setelah perubahan terakhir ---- */
const DAY3=3*864e5;
let C={t:0,i:[]};
function cLoad(){try{C=JSON.parse(localStorage.clicko_cart)}catch(e){}if(!C||!C.i||Date.now()-C.t>DAY3)C={t:Date.now(),i:[]};badge()}
function badge(){const n=$('#cn');if(n)n.textContent=C.i.reduce((a,x)=>a+x.q,0)}
function cSave(){C.t=Date.now();try{localStorage.clicko_cart=JSON.stringify(C)}catch(e){}badge()}
// Harga selalu dibaca ulang dari Sheets; bila macam sudah dihapus admin, dipakai harga saat item ditambahkan
const price=x=>{const m=(D.macam||[]).find(r=>r.macam_id==x.m),d=(D.desain||[]).find(r=>r.desain_id==x.d);return m?+m.harga+(+(d&&d.tambahan)||0):x.h};
function tot(){
  const u=C.i.reduce((a,x)=>a+x.q,0),n=C.i.reduce((a,x)=>a+price(x)*x.q,0);
  // DISKON_TIER sama seperti sistem CLICKO V3: "10:10,5:7,2:3" = jumlah unit:persen
  const pc=(String(K.diskon_tier||'10:10,5:7,2:3').split(',').map(s=>s.split(':').map(Number)).filter(a=>u>=a[0]).sort((a,b)=>b[0]-a[0])[0]||[0,0])[1];
  const fp=parseFloat(K.biaya_layanan_persen),ds=Math.round(n*pc/100),sub=n-ds,fee=Math.round(sub*(isNaN(fp)?0.5:fp)/100);
  return{u,n,pc,ds,sub,fee,total:sub+fee};
}
function qty(i,d,v){const x=C.i[i];x.q=Math.min(999,Math.max(0,v!=null?parseInt(v)||1:x.q+d));if(!x.q)C.i.splice(i,1);cSave();cartOpen(1)}
function add(i){
  const m=S.m,d=S.list[i],q=Math.max(1,parseInt($('#q'+i).value)||1),k=C.i.find(x=>x.m==m.macam_id&&x.d==d.desain_id);
  if(k)k.q+=q;else C.i.push({m:m.macam_id,d:d.desain_id,p:S.p.nama,mn:m.nama,dn:d.nama,h:+m.harga+(+d.tambahan||0),q});
  cSave();cartOpen(1);
}
function cartOpen(o){
  const el=$('#dr');el.classList.toggle('open',!!o);if(!o)return;
  const T=tot();
  el.innerHTML='<div class="row"><b>Keranjang</b><button class="ib" onclick="cartOpen(0)">Tutup</button></div>'+(C.i.length?
    C.i.map((x,i)=>`<div class="g" style="padding:12px;margin:10px 0"><b>${esc(x.p)} ${esc(x.mn)}</b><div class="mut">${esc(x.dn)}</div><div class="row"><span class="mono">${rp(price(x))}</span><span class="q"><button onclick="qty(${i},-1)" aria-label="Kurangi">-</button><input value="${x.q}" inputmode="numeric" onchange="qty(${i},0,this.value)" aria-label="Jumlah"><button onclick="qty(${i},1)" aria-label="Tambah">+</button></span></div><button class="ib" onclick="qty(${i},-999)">Hapus</button></div>`).join('')+
    `<div class="row mut"><span>Subtotal</span><span class="mono">${rp(T.n)}</span></div>`+(T.pc?`<div class="row"><span>Diskon ${T.pc}% untuk ${T.u} unit</span><span class="mono">-${rp(T.ds)}</span></div>`:'')+
    `<div class="row mut"><span>Biaya layanan</span><span class="mono">${rp(T.fee)}</span></div><div class="row"><b>Estimasi total</b><b class="mono">${rp(T.total)}</b></div><p class="mut" style="font-size:13px;margin:8px 0 14px">Belum termasuk ongkos kirim. Total akhir dikonfirmasi admin lewat WhatsApp.</p><button class="btn" style="width:100%" onclick="co()">Isi data pengiriman</button>`
    :'<div class="empty">Keranjang masih kosong. Pilih desain di <a href="katalog.html">katalog</a>.</div>');
}

/* ---- Checkout: form, lalu POST ke Apps Script (masuk ke tab PESANAN_WEB di Sheets Penampung) ---- */
const opt=s=>s.split('|').map(o=>`<option>${esc(o)}</option>`).join('');
function co(){
  cartOpen(0);const m=$('#mo');m.classList.add('open');
  m.innerHTML=`<form class="g" onsubmit="send(event)"><h2 style="margin:0 0 6px;font-size:22px">Data pemesan</h2>
  <label>Nama atau resto</label><input name="nama" required autocomplete="organization">
  <label>No WhatsApp</label><input name="wa" type="tel" required placeholder="0812xxxxxxxx" autocomplete="tel">
  <label>Alamat lengkap</label><textarea name="alamat" rows="3" required></textarea>
  <label>Metode pengiriman</label><select name="kirim">${opt(K.metode_kirim||'JNE|Cirebon Express|Batch Cirebon Standar')}</select>
  <label>Metode pembayaran</label><select name="bayar" onchange="$('#dpw').hidden=!/DP/.test(this.value)">${opt(K.metode_bayar||'Cash|Transfer|DP Cash|DP Transfer')}</select>
  <div id="dpw" hidden><label>Nominal DP (Rp)</label><input name="dp" inputmode="numeric"></div>
  <p id="err" role="alert" style="color:#e88;margin-top:10px"></p>
  <div class="row" style="margin-top:14px"><button type="button" class="btn o" onclick="$('#mo').classList.remove('open')">Batal</button><button class="btn" id="sb">Kirim pesanan</button></div></form>`;
}
let oid=null;
async function send(e){
  e.preventDefault();const b=$('#sb');b.disabled=true;b.textContent='Mengirim...';$('#err').textContent='';
  oid=oid||'WEB-'+Date.now().toString(36).toUpperCase();  // ID tetap selama percobaan ulang, server menolak duplikat
  try{
    const j=await post({type:'order',id:oid,...Object.fromEntries(new FormData(e.target)),items:C.i.map(x=>({m:x.m,d:x.d,p:x.p,mn:x.mn,dn:x.dn,q:x.q}))});
    C={t:Date.now(),i:[]};cSave();oid=null;
    $('#mo').innerHTML=`<div class="g"><h2 style="margin:0 0 8px;font-size:22px">Pesanan terkirim</h2><p>Nomor pesanan <b class="mono">${esc(j.id)}</b>, estimasi total <b class="mono">${rp(j.total)}</b>. Admin menghubungi lewat WhatsApp untuk tagihan dan tautan pembayaran.</p><button class="btn" style="margin-top:14px" onclick="location.href='index.html'">Kembali ke beranda</button></div>`;
  }catch(x){
    $('#err').textContent='Pesanan belum terkirim ('+x.message+'). Keranjang tetap aman, silakan kirim ulang.';
    b.disabled=false;b.textContent='Kirim pesanan';
  }
}

/* ---- Katalog: produk -> macam -> desain. Variasi dihitung dari 3 tab (PRODUK x MACAM x DESAIN), bukan 1.050 baris ---- */
const S={p:null,m:null,list:[]};
const mac=p=>(D.macam||[]).filter(r=>r.produk_id==p.produk_id);
function kat(){
  const ps=D.produk||[];
  if(!ps.length){$('#cl').innerHTML='<div class="g empty">Belum ada produk aktif. Isi tab PRODUK di Google Sheets.</div>';return}
  S.p=ps.find(p=>S.p&&p.produk_id==S.p.produk_id)||ps[0];
  const ms=mac(S.p);S.m=ms.find(m=>S.m&&m.macam_id==S.m.macam_id)||ms[0];
  $('#cnt').textContent=`${(ps.reduce((a,p)=>a+mac(p).length,0)*(D.desain||[]).length).toLocaleString('id-ID')} variasi tersedia. Pilih produk, macam, lalu desain.`;
  $('#cp').innerHTML=ps.map((p,i)=>`<button class="chip ${p===S.p?'on':''}" onclick="S.p=D.produk[${i}];S.m=null;kat()">${esc(p.nama)}</button>`).join('');
  $('#cm').innerHTML=ms.map((m,i)=>`<button class="chip ${m===S.m?'on':''}" onclick="S.m=mac(S.p)[${i}];kat()">${esc(m.nama)} <span class="mono">${rp(m.harga)}</span></button>`).join('')||'<span class="mut">Belum ada macam untuk produk ini. Isi tab MACAM.</span>';
  grid();
}
function grid(){
  const q=($('#sq').value||'').toLowerCase(),m=S.m;
  S.list=(D.desain||[]).filter(d=>(d.nama+' '+(d.kategori||'')+' '+d.desain_id).toLowerCase().includes(q));
  $('#cl').innerHTML=!m?'':S.list.length?S.list.map((d,i)=>`<div class="g card"><div class="im">${pic(d.foto,d.nama)||esc(d.desain_id)}</div><div class="b"><b>${esc(d.nama)}</b><div class="mono mut">${rp(+m.harga+(+d.tambahan||0))}</div><div class="row" style="align-items:center"><input id="q${i}" type="number" min="1" value="1" style="width:64px;padding:6px" aria-label="Jumlah"><button class="btn" style="padding:8px 14px" onclick="add(${i})">Tambah</button></div></div></div>`).join(''):'<div class="g empty">Tidak ada desain yang cocok dengan pencarian.</div>';
}

/* ---- Peta penjualan: bubble per provinsi, koordinat dan angka dari tab WILAYAH ---- */
function map(){
  const el=$('#map'),W=D.wilayah||[];if(!el)return;
  if(!W.length){el.innerHTML='<div class="empty">Belum ada data wilayah. Isi tab WILAYAH di Google Sheets.</div>';return}
  const mx=Math.max(1,...W.map(r=>+r.unit||0)),X=g=>(g-95)*20,Y=t=>(6-t)*20,top=W.slice().sort((a,b)=>b.unit-a.unit).slice(0,6);
  el.innerHTML=`<svg viewBox="0 0 920 340" role="img" aria-label="Peta penjualan per wilayah"><defs><pattern id="dt" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="1" fill="#8BB7BE" opacity=".3"/></pattern></defs><rect width="920" height="340" fill="url(#dt)"/>`+
  W.map(r=>{const v=+r.unit||0;return `<circle cx="${X(r.lng)}" cy="${Y(r.lat)}" r="${v?5+24*Math.sqrt(v/mx):3}" fill="#3C7381" fill-opacity="${v?.6:.4}" stroke="#AED5D5"><title>${esc(r.wilayah)}: ${v} unit${+r.omzet?', '+rp(r.omzet):''}</title></circle>`}).join('')+
  top.filter(r=>+r.unit>0).slice(0,3).map(r=>`<text x="${X(r.lng)}" y="${Y(r.lat)-30}" text-anchor="middle">${esc(r.wilayah)}</text>`).join('')+'</svg>'+
  (top[0]&&+top[0].unit?`<div class="grid" style="margin-top:12px;grid-template-columns:repeat(auto-fill,minmax(160px,1fr))">${top.map(r=>`<div><div class="row"><span>${esc(r.wilayah)}</span><span class="mono">${+r.unit||0}</span></div><div class="bar" style="width:${Math.round(100*(+r.unit||0)/mx)}%"></div></div>`).join('')}</div>`:'<p class="mut">Belum ada penjualan tercatat. Angka diisi di kolom unit pada tab WILAYAH.</p>');
}

/* ---- Halaman. Semua teks dan media berasal dari D (Google Sheets) ---- */
const empty=(t,tab)=>`<div class="g empty">${t} Isi tab ${tab} di Google Sheets.</div>`;
const media=r=>r.tipe=='video'?`<div class="g card"><iframe src="${esc(vid(r.url))}" loading="lazy" allowfullscreen style="width:100%;aspect-ratio:16/9;border:0"></iframe><div class="b"><b>${esc(r.judul)}</b><div class="mut">${esc(r.deskripsi||'')}</div></div></div>`
  :r.tipe=='panduan'?`<a class="g card b" href="${esc(r.url)}" target="_blank" rel="noopener"><b>${esc(r.judul)}</b><div class="mut">${esc(r.deskripsi||'Buka panduan')}</div></a>`
  :`<div class="g card"><div class="im">${pic(r.url,r.judul)}</div><div class="b"><b>${esc(r.judul)}</b><div class="mut">${esc(r.deskripsi||'')}</div></div></div>`;
const news=n=>`<article class="g card two" style="grid-template-columns:${n.foto?'1fr 2fr':'1fr'}">${n.foto?`<div class="im" style="height:100%;aspect-ratio:auto;min-height:160px">${pic(n.foto,n.judul)}</div>`:''}<div class="b"><div class="mut mono">${tgl(n.tanggal)}</div><h3>${esc(n.judul)}</h3><p class="mut">${esc(n.ringkasan)}</p>${n.isi?`<details style="padding:8px 0;margin:0"><summary>Baca selengkapnya</summary><p style="white-space:pre-line">${esc(n.isi)}</p></details>`:''}</div></article>`;
const byDate=a=>(a||[]).slice().sort((x,y)=>new Date(y.tanggal)-new Date(x.tanggal));
const PAGES={
  index:()=>`<section style="padding:20px 0 8px"><h1>${esc(K.hero_judul||'Display NFC dan QR untuk usaha Anda')}</h1><p class="mut" style="margin:14px 0 22px;max-width:36em">${esc(K.hero_sub||'')}</p><a class="btn" href="katalog.html">Lihat katalog</a> <a class="btn o" href="pengaduan.html">Hubungi kami</a></section>
  <h2>Penjualan per wilayah</h2><div class="g" style="padding:18px" id="map"></div>
  <h2>${esc(K.nama_perusahaan||'PT Shale Inovasi Teknologi')}</h2><p style="white-space:pre-line;max-width:48em">${esc(K.profil_teks||'')}</p>
  <h2>Galeri</h2><div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr))">${(D.galeri||[]).map(media).join('')||empty('Belum ada media.','GALERI')}</div>
  <h2>Berita terbaru</h2><div style="display:grid;gap:14px">${byDate(D.berita).slice(0,3).map(news).join('')||empty('Belum ada berita.','BERITA')}</div>`,
  katalog:()=>`<h1 style="font-size:clamp(26px,4vw,40px)">Katalog</h1><p class="mut" id="cnt" style="margin-top:6px"></p><div class="chips" id="cp"></div><div class="chips" id="cm"></div><input id="sq" type="search" placeholder="Cari nama atau nomor desain" oninput="grid()" style="max-width:360px;margin:8px 0 18px"><div class="grid" id="cl"></div>`,
  berita:()=>`<h1 style="font-size:clamp(26px,4vw,40px)">Berita</h1><div style="display:grid;gap:14px;margin-top:18px">${byDate(D.berita).map(news).join('')||empty('Belum ada berita.','BERITA')}</div>`,
  dokumentasi:()=>`<h1 style="font-size:clamp(26px,4vw,40px)">Dokumentasi</h1><p class="mut" style="margin:6px 0 18px">Proses pengerjaan, hasil proyek, dan panduan pemakaian.</p><div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr))">${(D.dokumentasi||[]).map(media).join('')||empty('Belum ada dokumentasi.','DOKUMENTASI')}</div>`,
  faq:()=>`<h1 style="font-size:clamp(26px,4vw,40px)">Pertanyaan yang sering diajukan</h1><div style="margin-top:18px;max-width:760px">${(D.faq||[]).map(f=>`<details class="g"><summary>${esc(f.pertanyaan)}</summary><p style="white-space:pre-line">${esc(f.jawaban)}</p></details>`).join('')||empty('Belum ada pertanyaan.','FAQ')}</div>`,
  pengaduan:()=>`<h1 style="font-size:clamp(26px,4vw,40px)">Pengaduan dan layanan</h1><form class="g f" style="margin-top:18px" onsubmit="aduan(event)"><label>Nama</label><input name="nama" required><label>No WhatsApp</label><input name="wa" type="tel" required><label>Nomor pesanan (jika ada)</label><input name="id_order" placeholder="contoh NOV26-009-CLK"><label>Jenis masalah</label><select name="kategori">${opt(K.kategori_aduan||'Pesanan belum sampai|Produk rusak atau cacat|Pembayaran|Saran|Lainnya')}</select><label>Ceritakan masalahnya</label><textarea name="pesan" rows="5" required></textarea><p id="err" role="alert" style="color:#e88;margin-top:10px"></p><button class="btn" id="sb" style="margin-top:12px">Kirim pengaduan</button></form>`
};
async function aduan(e){
  e.preventDefault();const b=$('#sb');b.disabled=true;b.textContent='Mengirim...';
  try{const j=await post({type:'pengaduan',...Object.fromEntries(new FormData(e.target))});
    e.target.outerHTML=`<div class="g f"><h2 style="margin:0 0 8px;font-size:22px">Pengaduan diterima</h2><p>Nomor tiket <b class="mono">${esc(j.id)}</b>. Kami membalas lewat WhatsApp.</p></div>`;
  }catch(x){$('#err').textContent='Belum terkirim ('+x.message+'). Coba lagi sebentar.';b.disabled=false;b.textContent='Kirim pengaduan'}
}

/* ---- Rangka halaman: navbar konsisten, tema terang/gelap, footer ---- */
const NAV=[['index','Beranda'],['katalog','Katalog'],['berita','Berita'],['dokumentasi','Dokumentasi'],['faq','FAQ'],['pengaduan','Pengaduan']];
const thLabel=()=>$('#th').textContent=document.documentElement.dataset.t==='light'?'Mode gelap':'Mode terang';
function theme(){const t=document.documentElement.dataset.t==='light'?'dark':'light';document.documentElement.dataset.t=t;try{localStorage.clicko_t=t}catch(e){}thLabel()}
function draw(){
  K=Object.fromEntries((D.konfig||[]).map(r=>[r.kunci,r.nilai]));
  $('#app').innerHTML=(PAGES[P]||PAGES.index)();
  if(P==='index')map();if(P==='katalog')kat();
  $('#ft').innerHTML=`<p>${esc(K.nama_perusahaan||'PT Shale Inovasi Teknologi')}</p><p>${esc(K.alamat||'')}</p>${K.wa_admin?`<p><a href="https://wa.me/${esc(String(K.wa_admin).replace(/\D/g,''))}">WhatsApp admin</a></p>`:''}`;
  badge();
}
$('#root').innerHTML=`<nav class="g"><a class="logo" href="index.html"><svg width="30" height="26" viewBox="0 0 32 28" aria-hidden="true"><defs><linearGradient id="lg"><stop offset="0" stop-color="#3C7381"/><stop offset="1" stop-color="#AED5D5"/></linearGradient></defs><path d="M1 27 16 1l15 26z" fill="url(#lg)"/><path d="M6 21c4-3 7 2 11-1s6 0 9 1" stroke="#12222E" fill="none" opacity=".6"/></svg><span>CLICKO</span></a><div class="links">${NAV.map(([k,t])=>`<a href="${k}.html" class="${k===P?'on':''}">${t}</a>`).join('')}</div><button class="ib" id="th" onclick="theme()"></button><button class="ib" onclick="cartOpen(1)">Keranjang<span class="badge" id="cn">0</span></button></nav><main class="wrap" id="app"><div class="grid"><div class="skel"></div><div class="skel"></div><div class="skel"></div></div></main><footer class="wrap" id="ft"></footer><aside id="dr" class="g" aria-label="Keranjang"></aside><div class="mo" id="mo"></div>`;
thLabel();cLoad();load();
