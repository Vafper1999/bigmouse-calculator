// ⚠️ LIFF ID (ใส่ไว้เหมือนเดิม ไม่เสียหายครับ เผื่ออนาคตใช้ดึงโปรไฟล์แอดมิน)
const LIFF_ID = "2008984741-8hcXjikx"; 

// ⚠️⚠️⚠️ สำคัญมาก! ใส่ URL ของ Web App ที่ Deploy แล้วตรงนี้ ⚠️⚠️⚠️
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycby4qaEDYaAnWM2qB7Zhd8vJ2nZGbFU-m9D4vOkvyelDIpwIYJrCD18bGKwMH-4QA3UG/exec";

// (Token นี้จริงๆ ต้องใช้ที่หลังบ้าน Code.gs แต่ถ้าจะแปะไว้เป็น Reference ก็ได้ครับ)
// const CHANNEL_ACCESS_TOKEN = '...'; 

// ⚠️ ใส่เบอร์โทร หรือ เลขบัตร ปชช. ที่ผูกพร้อมเพย์ (ห้ามมีขีด)
const PROMPTPAY_ID = "0990063438";

// เก็บข้อมูลลูกค้าที่โหลดมา
let customersData = [];

// ---- Data (ชุดข้อมูลสินค้า) ----
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

// ============================================================
// 🆕 ฟังก์ชันแปลง URL ของ Google Sheet เป็น CSV export URL
// ============================================================
function getSheetIdFromUrl(url) {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

// ============================================================
// 🆕 ฟังก์ชันโหลดข้อมูลจาก Google Sheet (รองรับ Auto Load)
// ============================================================
async function loadCustomersFromSheet(isAutoLoad = false) {
  const sheetUrl = $('#sheetUrlInput').value.trim();
  const select = $('#customerSelect');
  
  if (!sheetUrl) {
    if (!isAutoLoad) Swal.fire('แจ้งเตือน', 'กรุณาใส่ลิงก์ Google Sheet ก่อนครับ', 'warning');
    return;
  }
  
  const sheetId = getSheetIdFromUrl(sheetUrl);
  
  if (!sheetId) {
    if (!isAutoLoad) Swal.fire('ผิดพลาด', 'ลิงก์ไม่ถูกต้อง กรุณาคัดลอกลิงก์จาก Google Sheets ใหม่', 'error');
    return;
  }
  
  try {
    if (isAutoLoad) {
        select.innerHTML = '<option value="" selected>🔄 กำลังโหลดข้อมูลเก่า...</option>';
    } else {
        select.innerHTML = '<option value="" selected>⏳ กำลังโหลดข้อมูล...</option>';
        Swal.fire({ title: 'กำลังโหลดข้อมูล...', didOpen: () => Swal.showLoading() });
    }
    
    // โหลดผ่าน CSV export ของ Google Sheet
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;
    const response = await fetch(csvUrl);
    
    if (!response.ok) {
      throw new Error('ไม่สามารถเข้าถึง Google Sheet ได้\nกรุณาตรวจสอบว่า Sheet เปิดแชร์เป็น "Anyone with the link can view"');
    }
    
    const csvText = await response.text();
    const rows = parseCSV(csvText);
    
    if (rows.length < 2) {
      throw new Error('ไม่พบข้อมูลในชีต');
    }
    
    customersData = [];
    
    // เริ่มอ่านจากแถวที่ 2 (index 1) เพราะแถวแรกเป็น Header
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      // ตรวจสอบว่ามี ID (col 0) และไม่ว่าง
      if (row[0] && row[0].trim() !== '') {
        customersData.push({
          id: row[0].trim(),
          name: row[1] ? row[1].trim() : 'ไม่ระบุชื่อ'
        });
      }
    }
    
    select.innerHTML = '<option value="" selected disabled>-- เลือกรายชื่อลูกค้า --</option>';
    
    if (customersData.length === 0) {
      select.innerHTML = '<option value="" selected>ไม่พบข้อมูลลูกค้า</option>';
      if (!isAutoLoad) Swal.fire('ไม่พบข้อมูล', 'ไม่พบข้อมูลลูกค้าในชีต', 'warning');
      return;
    }
    
    // เติมข้อมูลลง Dropdown
    customersData.forEach(customer => {
      const option = document.createElement('option');
      option.value = customer.id;
      option.textContent = customer.name;
      select.appendChild(option);
    });
    
    // ✅ บันทึกลิงก์ลง localStorage เพื่อใช้ครั้งหน้า
    localStorage.setItem('sheetUrl', sheetUrl);
    
    if (!isAutoLoad) {
        Swal.fire({
          icon: 'success',
          title: 'โหลดข้อมูลสำเร็จ!',
          text: `พบลูกค้า ${customersData.length} คน`,
          timer: 2000,
          showConfirmButton: false
        });
    } else {
        console.log(`✅ Auto-load เสร็จสิ้น: พบ ${customersData.length} คน`);
    }
    
  } catch (error) {
    console.error('🔴 Error:', error);
    select.innerHTML = '<option value="" selected>❌ เกิดข้อผิดพลาด</option>';
    
    if (!isAutoLoad) {
        Swal.fire({
          icon: 'error',
          title: 'ไม่สามารถโหลดข้อมูลได้',
          text: error.message,
          confirmButtonText: 'ตกลง'
        });
    }
  }
}

// ============================================================
// 🆕 ฟังก์ชันแปลง CSV เป็น Array
// ============================================================
function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentField);
      if (currentRow.some(field => field.trim() !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }
  
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some(field => field.trim() !== '')) {
      rows.push(currentRow);
    }
  }
  
  return rows;
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

// ============================================================
// 🚀 ฟังก์ชันส่งบิล Flex Message (แก้บั๊ก undefined)
// ============================================================
async function sendFlexBill() {
    // 1. ดึงข้อมูลลูกค้า
    const customerId = $("#customerSelect").value;
    let customerName = $("#customerSelect").options[$("#customerSelect").selectedIndex]?.text;
    if (!customerName || customerName.includes("เลือกรายชื่อ")) customerName = "คุณลูกค้า";

    if (!customerId) {
        Swal.fire('แจ้งเตือน', 'กรุณาเลือกหรือกรอกรายชื่อลูกค้าก่อนครับ', 'warning');
        return;
    }

    // 2. รวบรวมสินค้าจาก Input (รองรับทั้งชื่อตัวแปรเก่าและใหม่)
    let items = [];
    document.querySelectorAll(".qty").forEach(e => {
        let q = parseInt(e.value) || 0;
        if (q > 0) {
            // 🔥 แก้ตรงนี้: เช็คทั้ง dataset ใหม่ (a,s,t,p) และ dataset เก่า (animal, size, type, unit)
            const animalKey = e.dataset.a || e.dataset.animal;
            const sizeKey   = e.dataset.s || e.dataset.size;
            const typeKey   = e.dataset.t || e.dataset.type;
            const priceKey  = e.dataset.p || e.dataset.unit || 0;

            items.push({
                animal: animalLabel(animalKey),    // Mice / Rat
                size: sizeKey,                     // Size
                type: typeKey,                     // แช่ / เป็น
                qty: q,
                price: q * parseFloat(priceKey)    // ราคารวม
            });
        }
    });

    if (items.length === 0) {
        Swal.fire('เตือน', 'กรุณาเลือกสินค้าอย่างน้อย 1 รายการ', 'warning');
        return;
    }

    // 3. เตรียมตัวเลขสรุป
    const ship = parseFloat($("#shipCost").value || 0);
    const shipMethod = $("#shipMethod").value;
    const type = $('#promoType')?.value || 'none';
    const raw = parseFloat($('#promoValue')?.value || '0') || 0;
    
    // คำนวณ Subtotal
    let subTotal = 0;
    items.forEach(i => subTotal += i.price);

    // คำนวณส่วนลด
    let discVal = 0;
    if (type === 'baht') discVal = Math.max(0, Math.min(raw, subTotal));
    else if (type === 'percent') discVal = Math.max(0, Math.min(100, raw)) * subTotal / 100;

    const total = subTotal - discVal + ship;
    const dateStr = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

    // 4. 🎨 สร้างรายการสินค้า
    let flexItems = items.map(i => ({
        "type": "box",
        "layout": "baseline",
        "contents": [
            { "type": "text", "text": i.animal, "size": "sm", "color": "#555555", "flex": 0 },
            { "type": "text", "text": `${i.size} (${i.type})`, "margin": "sm", "size": "sm", "color": "#555555", "flex": 0 },
            { "type": "text", "text": String(i.qty), "size": "sm", "margin": "md", "flex": 0, "color": "#111111" },
            { "type": "text", "text": fmt(i.price), "size": "sm", "color": "#111111", "align": "end" }
        ]
    }));

    // เพิ่มค่าส่ง
    if (ship > 0) {
        flexItems.push({
            "type": "box", "layout": "baseline",
            "contents": [
                { "type": "text", "text": "ค่าส่ง", "size": "sm", "color": "#555555", "flex": 0 },
                { "type": "text", "text": shipMethod, "margin": "sm", "size": "sm", "color": "#555555", "flex": 1, "wrap": true },
                { "type": "text", "text": fmt(ship), "size": "sm", "color": "#111111", "align": "end" }
            ]
        });
    }

    // เพิ่มส่วนลด
    if (discVal > 0) {
        flexItems.push({
            "type": "box", "layout": "baseline",
            "contents": [
                { "type": "text", "text": "ส่วนลด", "size": "sm", "color": "#ff3333", "flex": 0 },
                { "type": "text", "text": "-" + fmt(discVal), "size": "sm", "color": "#ff3333", "align": "end" }
            ]
        });
    }

    // 🔗 สร้างลิงก์ QR Code (PromptPay) ตามยอดเงินจริง
    // หมายเหตุ: ต้องใส่ตัวแปร PROMPTPAY_ID ไว้ด้านบนสุดของไฟล์ script.js แล้วนะครับ
    const qrUrl = `https://promptpay.io/${PROMPTPAY_ID}/${total}`;

    // 5. 🏗️ ประกอบร่าง JSON Flex Message (แบบมี QR Code)
    const flexMessage = {
        "type": "bubble",
        "header": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                {
                    "type": "image",
                    "url": "https://image2url.com/r2/default/images/1769504171528-44fb59f7-c558-4d57-bb8e-820f68ccd885.png",
                    "margin": "md",
                    "size": "sm"
                }
            ]
        },
        "body": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                { "type": "text", "text": "บิลแจ้งยอดชำระ", "weight": "bold", "size": "xl" },
                {
                    "type": "box",
                    "layout": "vertical",
                    "margin": "lg",
                    "spacing": "sm",
                    "contents": [
                        {
                            "type": "box",
                            "layout": "baseline",
                            "spacing": "sm",
                            "contents": [
                                { "type": "text", "text": "วันที่:", "color": "#aaaaaa", "size": "sm", "flex": 1 },
                                { "type": "text", "text": dateStr, "wrap": true, "color": "#666666", "size": "sm", "flex": 5 }
                            ]
                        },
                        {
                            "type": "box",
                            "layout": "baseline",
                            "spacing": "sm",
                            "contents": [
                                { "type": "text", "text": "ลูกค้า:", "color": "#aaaaaa", "size": "sm", "flex": 1 },
                                { "type": "text", "text": customerName, "wrap": true, "color": "#666666", "size": "sm", "flex": 5 }
                            ]
                        }
                    ]
                },
                { "type": "separator", "margin": "xxl" },
                { "type": "box", "layout": "vertical", "margin": "xxl", "spacing": "sm", "contents": flexItems },
                { "type": "separator", "margin": "xxl" },
                {
                    "type": "box",
                    "layout": "horizontal",
                    "margin": "md",
                    "contents": [
                        { "type": "text", "text": "ยอดรวมสุทธิ", "size": "md", "color": "#555555", "weight": "bold" },
                        { "type": "text", "text": fmt(total) + " ฿", "size": "xl", "color": "#111111", "align": "end", "weight": "bold" }
                    ]
                }
            ]
        },
        "footer": {
            "type": "box",
            "layout": "vertical",
            "spacing": "md",
            "contents": [
                { "type": "text", "text": "สแกนเพื่อชำระเงิน (พร้อมเพย์)", "size": "xs", "align": "center", "color": "#aaaaaa" },
                
                // 👇 QR Code อยู่ตรงนี้
                {
                    "type": "image",
                    "url": qrUrl,
                    "size": "lg",
                    "aspectMode": "cover",
                    "margin": "md"
                },
                
                {
                    "type": "box",
                    "layout": "vertical",
                    "margin": "lg",
                    "spacing": "xs",
                    "contents": [
                        { "type": "text", "text": "ธ.กรุงไทย", "size": "sm", "weight": "bold", "align": "center" },
                        { "type": "text", "text": "983-1-84269-3", "size": "sm", "align": "center", "color": "#555555" },
                        { "type": "text", "text": "ชื่อ: กฤตธนัท สมานเพ็ขร์", "size": "xs", "align": "center", "color": "#aaaaaa" }
                    ]
                }
            ],
            "paddingAll": "20px",
            "backgroundColor": "#ffffff"
        }
    };

    // 6. ส่งข้อมูล
    Swal.fire({ title: 'กำลังส่งบิล...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });

    try {
        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
                action: 'sendFlex',
                userId: customerId,
                flexMessage: flexMessage
            }),
            redirect: 'follow'
        });

        const result = await response.json();

        if (result.status === 'success') {
            Swal.fire('สำเร็จ!', 'ส่งบิลเรียบร้อยแล้วครับ 🐭', 'success');
        } else {
            Swal.fire('Error', 'เกิดข้อผิดพลาด: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('🔴 Error:', error);
        Swal.fire('Error', 'ไม่สามารถส่งบิลได้: ' + error.message, 'error');
    }
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
  
  $("#showReceiptBtn").addEventListener('click',openReceipt);
  $("#billClose").addEventListener('click',closeReceipt);
  $("#billDone").addEventListener('click',closeReceipt);
  $("#billCopy").addEventListener('click',copyReceipt);
  document.querySelector('#billModal .modal-backdrop').addEventListener('click',closeReceipt);

  // 🆕 ปุ่มโหลดข้อมูล (Manual)
  $("#loadSheetBtn").addEventListener('click', () => loadCustomersFromSheet(false));
  
  // 🆕 กด Enter ใน input ก็โหลดได้เลย
  $("#sheetUrlInput").addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      loadCustomersFromSheet(false);
    }
  });
  
  const lineBtn = document.getElementById('sendLineFlexBtn');
  if(lineBtn) lineBtn.addEventListener('click', sendFlexBill);
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 เริ่มต้นระบบ...');
  
  buildTable();
  wireEvents();
  
  // 🔥 ตรวจสอบ localStorage และโหลดข้อมูลทันทีถ้ามีลิงก์เดิม
  const savedUrl = localStorage.getItem('sheetUrl');
  if (savedUrl) {
    $('#sheetUrlInput').value = savedUrl;
    console.log('📌 พบลิงก์เดิม:', savedUrl);
    // สั่งโหลดออโต้ทันที (ส่ง true ไปเพื่อให้ฟังก์ชันรู้ว่าเป็น Auto Load)
    loadCustomersFromSheet(true); 
  }
  
  // Init LIFF
  try {
      await liff.init({ liffId: LIFF_ID });
      console.log('✅ LIFF initialized');
  } catch (err) { 
      console.log('⚠️ LIFF error:', err); 
  }
});