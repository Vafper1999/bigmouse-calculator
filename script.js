// ⚠️ LIFF ID (ใส่ไว้เหมือนเดิม ไม่เสียหายครับ เผื่ออนาคตใช้ดึงโปรไฟล์แอดมิน)
const LIFF_ID = "2008984741-8hcXjikx"; 

// ---- Data (ชุดเดิมของคุณ) ----
const DATA = {
  mice: [
    ["3XS", 8.00, 7.00], ["2XS", 11.00, 10.00], ["XS", 13.00, 11.00],
    ["S", 18.00, 15.00], ["M", 23.00, 21.00], ["L", 28.00, 26.00],
    ["XL", 34.00, 31.00], ["2XL", 38.00, 35.00], ["3XL", 42.00, 40.00],
  ],
  rat: [
    ["S", 35.00, 33.00], ["M1", 40.00, 38.00], ["M2", 45.00, 43.00], ["M3", 50.00, 48.00],
    ["L1", 55.00, 53.00], ["L2", 60.00, 58.00], ["XL", 65.00, 63.00], ["2XL", 70.00, 68.00],
    ["3XL", 75.00, 73.00], ["4XL", 85.00, 83.00], ["5XL", 95.00, 93.00], ["JB", 100.00, 98.00],
  ]
};

// ---- Helpers ----
const $ = s => document.querySelector(s);
const fmt = n => Number(n).toLocaleString("th-TH", {minimumFractionDigits:(n%1?2:0), maximumFractionDigits:2});
const getSelectedAnimals = () => Array.from(document.querySelectorAll('input[name="animal"]:checked')).map(i=>i.value);
const animalLabel = key => key === 'mice' ? 'Mice' : 'Rat';
let qtyInputs = [];

function getDiscount(sub){
  const type = $('#promoType')?.value || 'none';
  const raw = parseFloat($('#promoValue')?.value || '0') || 0;
  let d = 0;
  if(type==='baht') d = Math.max(0, Math.min(raw, sub));
  else if(type==='percent') d = Math.max(0, Math.min(100, raw))*sub/100;
  return d;
}

// ---- Build Table (ฟังก์ชันเดิม 100%) ----
function buildTable(){
  const animals = getSelectedAnimals();
  const ptype = document.querySelector('input[name="ptype"]:checked').value;
  const priceIdx = ptype==='retail'?1:2;
  qtyInputs=[];

  if(animals.length===0){
    $("#tableWrap").innerHTML='<div class="hint">โปรดเลือกอย่างน้อย 1 ประเภท (Mice/Rat)</div>';
    return;
  }

  let html='';
  animals.forEach(animal=>{
    const rows=DATA[animal].map(([size,ret,whl])=>{
      const unit=priceIdx===1?ret:whl;
      return `
        <tr>
          <td>${size}</td>
          <td class="muted">${fmt(unit)}</td>
          <td><input type="number" min="0" step="1" data-animal="${animal}" data-type="fresh" data-size="${size}" data-unit="${unit}" class="qty" placeholder="0"></td>
          <td><input type="number" min="0" step="1" data-animal="${animal}" data-type="frozen" data-size="${size}" data-unit="${unit}" class="qty" placeholder="0"></td>
          <td class="line" data-animal="${animal}" data-size="${size}">0</td>
        </tr>`;
    }).join("");
    html += `
      <div class="head" style="margin-top:6px"><h2>${animalLabel(animal)}</h2></div>
      <table><thead><tr>
        <th>ไซส์</th><th>ราคา</th><th>แช่ (ตัว)</th><th>เป็น (ตัว)</th><th>รวม</th>
      </tr></thead><tbody>${rows}</tbody></table>`;
  });

  $("#tableWrap").innerHTML=html;
  qtyInputs=Array.from(document.querySelectorAll(".qty"));
  qtyInputs.forEach(i=> i.addEventListener("input", recalc));
  recalc();
}

// ---- Recalc (ฟังก์ชันเดิม 100%) ----
function recalc(){
  const shipMethod = $("#shipMethod").value;
  const shipCostEl = $("#shipCost");
  if (shipMethod === "รับเอง"){ shipCostEl.value = 0; shipCostEl.disabled = true; }
  else { shipCostEl.disabled = false; }

  if (!$("#shipCost").value) $("#shipCost").value = 0;

  let sub = 0;
  const animals = getSelectedAnimals();
  animals.forEach(a=>{
    DATA[a].forEach(([size])=>{
      const f = document.querySelector(`input.qty[data-animal="${a}"][data-size="${size}"][data-type="fresh"]`);
      const z = document.querySelector(`input.qty[data-animal="${a}"][data-size="${size}"][data-type="frozen"]`);
      const qf = parseInt(f?.value||0,10)||0;
      const qz = parseInt(z?.value||0,10)||0;
      const unit = parseFloat(f?.dataset.unit||z?.dataset.unit||0);
      const line = (qf+qz)*unit;
      sub+=line;
      const cell=document.querySelector(`.line[data-animal="${a}"][data-size="${size}"]`);
      if(cell) cell.textContent=fmt(line);
    });
  });

  const discount=getDiscount(sub);
  const ship=parseFloat($("#shipCost").value||0);
  const grand=sub-discount+ship;
  $("#subTotal").textContent=fmt(sub);
  $("#promoTotal").textContent=fmt(discount);
  $("#shipTotal").textContent=fmt(ship);
  $("#grandTotal").textContent=fmt(grand);
  buildMessage(sub,ship,discount);
}

// ---- Build Message (ฟังก์ชันเดิม 100%) ----
function buildMessage(sub, ship, discount){
  const prefix=$("#msgPrefix").value.trim();
  const suffixTpl=$("#msgSuffix").value.trim();
  const shipMethod=$("#shipMethod").value;
  const ptype=document.querySelector('input[name="ptype"]:checked').value;
  const pLabel=ptype==='retail'?'ปลีก':'ส่ง';
  const animals=getSelectedAnimals();
  const header=`${prefix} (${pLabel}) ${animals.map(animalLabel).join(' + ')}`;
  const body=[];
  animals.forEach(a=>{
    DATA[a].forEach(([size])=>{
      const f=document.querySelector(`input.qty[data-animal="${a}"][data-size="${size}"][data-type="fresh"]`);
      const z=document.querySelector(`input.qty[data-animal="${a}"][data-size="${size}"][data-type="frozen"]`);
      const unit=parseFloat(f?.dataset.unit||z?.dataset.unit||0);
      const qf=parseInt(f?.value||0,10)||0;
      const qz=parseInt(z?.value||0,10)||0;
      if(qf) body.push(`[${animalLabel(a)}] ${size} (แช่) ${qf} ตัว ราคา ${fmt(qf*unit)} บาท`);
      if(qz) body.push(`[${animalLabel(a)}] ${size} (เป็น) ${qz} ตัว ราคา ${fmt(qz*unit)} บาท`);
    });
  });
  if(discount>0) body.push(`ส่วนลด ${fmt(discount)} บาท`);
  if(ship>0 && shipMethod!=="รับเอง") body.push(`ขนส่ง ${shipMethod} ${fmt(ship)} บาท`);
  const totalText=suffixTpl.replace("{TOTAL}",fmt(sub-discount+ship));
  $("#messageBox").textContent=`${header}\n${body.join("\n")}\n\n${totalText}`.trim();
}

// ---- Receipt Modal (ฟังก์ชันเดิม) ----
function openReceipt(){ $("#billContent").innerHTML=buildReceiptHTML(); $("#billModal").classList.add("open"); }
function closeReceipt(){ $("#billModal").classList.remove("open"); }
async function copyReceipt(){ await navigator.clipboard.writeText($("#billContent").innerText); }
function buildReceiptHTML(){
    const now=new Date();
    let html=`<div class="meta">วันที่ ${now.toLocaleDateString('th-TH')}</div><table><thead><tr><th>รายการ</th><th>ยอด</th></tr></thead><tbody>`;
    let sub=0;
    const animals=getSelectedAnimals();
    animals.forEach(a=>{
        DATA[a].forEach(([size])=>{
        const f=document.querySelector(`input.qty[data-animal="${a}"][data-size="${size}"][data-type="fresh"]`);
        const z=document.querySelector(`input.qty[data-animal="${a}"][data-size="${size}"][data-type="frozen"]`);
        const unit=parseFloat(f?.dataset.unit||z?.dataset.unit||0);
        const qf=parseInt(f?.value||0,10)||0;
        const qz=parseInt(z?.value||0,10)||0;
        if(qf){const line=qf*unit;sub+=line;html+=`<tr><td>[${animalLabel(a)}] ${size} (แช่) × ${qf}</td><td>${fmt(line)}</td></tr>`;}
        if(qz){const line=qz*unit;sub+=line;html+=`<tr><td>[${animalLabel(a)}] ${size} (เป็น) × ${qz}</td><td>${fmt(line)}</td></tr>`;}
        });
    });
    const discount=getDiscount(sub);
    const ship=parseFloat($("#shipCost").value||0);
    const shipMethod=$("#shipMethod").value;
    const grand=sub-discount+ship;
    html+=`</tbody><tfoot><tr><td>รวม</td><td>${fmt(sub)}</td></tr>${discount>0?`<tr><td>ส่วนลด</td><td>-${fmt(discount)}</td></tr>`:''}${ship>0?`<tr><td>ค่าส่ง</td><td>${fmt(ship)}</td></tr>`:''}<tr><td class="grand">สุทธิ</td><td class="grand">${fmt(grand)}</td></tr></tfoot></table>`;
    return html;
}

// --------------------------------------------------------
// 🔥 ส่วนที่แก้ไข: ดึงรายชื่อลูกค้า + ให้บอทส่ง Flex Message
// --------------------------------------------------------

// 1. ฟังก์ชันโหลดรายชื่อลูกค้าจาก Google Sheet
function loadCustomers() {
  google.script.run.withSuccessHandler(function(customers) {
    var select = document.getElementById("customerSelect");
    select.innerHTML = '<option value="" selected disabled>-- เลือกรายชื่อลูกค้า --</option>';
    customers.forEach(function(c) {
      var option = document.createElement("option");
      option.value = c.id;
      option.text = c.name;
      select.add(option);
    });
  }).getCustomerList();
}

// 2. ฟังก์ชันส่งบิล (OA เป็นคนส่ง)
function sendFlexBill() {
    // เช็คว่าเลือกลูกค้าหรือยัง
    var customerId = $("#customerSelect").value;
    var customerName = $("#customerSelect").options[$("#customerSelect").selectedIndex]?.text;

    if (!customerId) {
        Swal.fire('แจ้งเตือน', 'กรุณาเลือกลูกค้าที่จะส่งบิลก่อนครับ', 'warning');
        return;
    }

    // สร้างเนื้อหาบิล
    let itemContents = [];
    const animals = getSelectedAnimals();
    
    animals.forEach(a => {
        DATA[a].forEach(([size]) => {
            const f = document.querySelector(`input.qty[data-animal="${a}"][data-size="${size}"][data-type="fresh"]`);
            const z = document.querySelector(`input.qty[data-animal="${a}"][data-size="${size}"][data-type="frozen"]`);
            const unit = parseFloat(f?.dataset.unit || z?.dataset.unit || 0);
            
            const qf = parseInt(f?.value || 0, 10) || 0;
            if (qf > 0) itemContents.push(createFlexRow(animalLabel(a), `${size} (แช่)`, qf, qf * unit));

            const qz = parseInt(z?.value || 0, 10) || 0;
            if (qz > 0) itemContents.push(createFlexRow(animalLabel(a), `${size} (เป็น)`, qz, qz * unit));
        });
    });

    if (itemContents.length === 0) {
        Swal.fire('แจ้งเตือน', 'กรุณาระบุจำนวนสินค้าอย่างน้อย 1 รายการ', 'warning');
        return;
    }

    // เพิ่มค่าส่ง & ส่วนลด
    const ship = parseFloat($("#shipCost").value || 0);
    const shipMethod = $("#shipMethod").value;
    if (ship > 0) itemContents.push(createFlexRow("ค่าส่ง", shipMethod, "", ship));

    const discountStr = $("#promoTotal").innerText;
    if (discountStr !== "0") {
        itemContents.push({
            "type": "box", "layout": "baseline",
            "contents": [
                { "type": "text", "text": "ส่วนลด", "size": "sm", "color": "#ff3333", "flex": 1 },
                { "type": "text", "text": "-" + discountStr, "size": "sm", "color": "#ff3333", "align": "end", "flex": 0 }
            ]
        });
    }

    const grandTotal = $("#grandTotal").innerText;

    // สร้าง JSON Message
    const flexMessage = {
        "type": "bubble",
        "header": {
            "type": "box", "layout": "vertical",
            "contents": [{ "type": "image", "url": "https://image2url.com/r2/default/images/1769504171528-44fb59f7-c558-4d57-bb8e-820f68ccd885.png", "margin": "md", "size": "sm" }]
        },
        "body": {
            "type": "box", "layout": "vertical",
            "contents": [
                { "type": "text", "text": "บิลแจ้งยอดชำระ", "weight": "bold", "size": "xl" },
                { "type": "box", "layout": "vertical", "margin": "lg", "spacing": "sm", "contents": [
                    { "type": "box", "layout": "baseline", "spacing": "sm", "contents": [ { "type": "text", "text": "วันที่:", "color": "#aaaaaa", "size": "sm", "flex": 1 }, { "type": "text", "text": new Date().toLocaleDateString('th-TH'), "color": "#666666", "size": "sm", "flex": 5 } ] },
                    { "type": "box", "layout": "baseline", "spacing": "sm", "contents": [ { "type": "text", "text": "ลูกค้า:", "color": "#aaaaaa", "size": "sm", "flex": 1 }, { "type": "text", "text": customerName, "color": "#666666", "size": "sm", "flex": 5 } ] }
                ]},
                { "type": "separator", "margin": "xxl" },
                { "type": "box", "layout": "vertical", "margin": "xxl", "spacing": "sm", "contents": itemContents },
                { "type": "separator", "margin": "xxl" },
                { "type": "box", "layout": "horizontal", "margin": "md", "contents": [
                    { "type": "text", "text": "ยอดรวมสุทธิ", "size": "md", "color": "#555555", "weight": "bold" },
                    { "type": "text", "text": grandTotal + " ฿", "size": "xl", "color": "#111111", "align": "end", "weight": "bold" }
                ]}
            ]
        },
        "footer": {
            "type": "box", "layout": "vertical", "spacing": "sm",
            "contents": [{ "type": "button", "style": "primary", "height": "sm", "color": "#06c755", "action": { "type": "uri", "label": "แจ้งโอนเงิน", "uri": "https://line.me/ti/p/@450tzdfe" } }] // ⚠️ อย่าลืมแก้ลิงก์ตรงนี้
        }
    };

    // ส่งให้ Backend จัดการ (ส่งผ่าน OA)
    Swal.fire({ title: 'กำลังส่งบิล...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
    
    google.script.run.withSuccessHandler(function(res) {
        if (res.status === 'success') {
            Swal.fire('สำเร็จ!', 'บอทส่งบิลเรียบร้อยแล้วครับ', 'success');
        } else {
            Swal.fire('Error', 'เกิดข้อผิดพลาด: ' + res.message, 'error');
        }
    }).sendFlexMessageToUser(customerId, flexMessage);
}

// Helper สร้างแถวรายการ
function createFlexRow(col1, col2, col3, total) {
    return {
        "type": "box", "layout": "baseline",
        "contents": [
            { "type": "text", "text": col1, "size": "sm", "color": "#555555", "flex": 0 },
            { "type": "text", "text": col2, "size": "sm", "color": "#555555", "margin": "sm", "flex": 1, "wrap": true },
            { "type": "text", "text": col3 ? String(col3) : "", "size": "sm", "margin": "md", "flex": 0, "align": "center" },
            { "type": "text", "text": fmt(total), "size": "sm", "color": "#111111", "align": "end", "flex": 0 }
        ]
    };
}

// ---- Events ----
function wireEvents(){
  document.querySelectorAll('input[name="animal"]').forEach(cb=>cb.addEventListener('change',buildTable));
  document.querySelectorAll('input[name="ptype"]').forEach(r=>r.addEventListener('change',buildTable));
  $("#shipMethod").addEventListener('change',recalc);
  $("#shipCost").addEventListener('input',recalc);
  $("#msgPrefix").addEventListener('input',recalc);
  $("#msgSuffix").addEventListener('input',recalc);
  $("#promoType").addEventListener('change',recalc);
  $("#promoValue").addEventListener('input',recalc);
  $("#copyBtn").addEventListener('click',async()=>{
    await navigator.clipboard.writeText($("#messageBox").textContent);
    Swal.fire({ icon: 'success', title: 'คัดลอกข้อความแล้ว', timer: 1500, showConfirmButton: false });
  });
  
  // ปุ่มดูบิล
  $("#showReceiptBtn").addEventListener('click',openReceipt);
  $("#billClose").addEventListener('click',closeReceipt);
  $("#billDone").addEventListener('click',closeReceipt);
  $("#billCopy").addEventListener('click',copyReceipt);
  document.querySelector('#billModal .modal-backdrop').addEventListener('click',closeReceipt);

  // ปุ่มส่งไลน์ (เชื่อมกับฟังก์ชันใหม่)
  const lineBtn = document.getElementById('sendLineFlexBtn');
  if(lineBtn) lineBtn.addEventListener('click', sendFlexBill);
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', async () => {
  buildTable();
  wireEvents();
  loadCustomers(); // 🔥 เรียกโหลดชื่อลูกค้าทันทีที่เปิดเว็บ
  
  // Init LIFF (เผื่อใช้ในอนาคต)
  try {
      await liff.init({ liffId: LIFF_ID });
  } catch (err) { console.error(err); }
});