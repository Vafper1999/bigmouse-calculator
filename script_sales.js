// ⚠️ URL ล่าสุดของคุณ (ตรวจสอบให้ตรงกับตัวที่ Deploy ใหม่ล่าสุด)
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxwcfYozMfzchT98X2rOZnT_9otOFrkGMxosTixCBUMJvIsAhN62CUaZoH8gM_L3Ol_mA/exec';

const $ = (id) => document.getElementById(id);

// --- ฐานข้อมูลราคา ---
const PRICES = {
  Mice: {
    retail:    { '3XS':8, '2XS':11, 'XS':13, 'S':18, 'M':23, 'L':28, 'XL':34, '2XL':38, '3XL':42 },
    wholesale: { '3XS':7, '2XS':10, 'XS':11, 'S':15, 'M':21, 'L':26, 'XL':31, '2XL':35, '3XL':40 }
  },
  Rat: {
    retail:    { 'S':35, 'M1':40, 'M2':45, 'M3':50, 'L1':55, 'L2':60, 'XL':65, '2XL':70, '3XL':75, '4XL':85, '5XL':95, 'JB':100 },
    wholesale: { 'S':33, 'M1':38, 'M2':43, 'M3':48, 'L1':53, 'L2':58, 'XL':63, '2XL':68, '3XL':73, '4XL':83, '5XL':93, 'JB':98 }
  }
};

const MICE_SIZES = Object.keys(PRICES.Mice.retail);
const RAT_SIZES  = Object.keys(PRICES.Rat.retail);

let cart = []; 

function init() {
  $('sale-date').value = new Date().toISOString().split('T')[0];
  updateSizeList();
  loadSalesHistory();
}

// --- ส่วนจัดการ Settings (ปุ่มเฟือง) ---
function openSettings() {
  $('settings-modal').style.display = 'flex';
}

function closeSettings() {
  $('settings-modal').style.display = 'none';
}

async function saveSettings() {
  const salesUrl = $('sheet-url-input').value; // ลิงก์ไฟล์ขาย
  const walletUrl = $('wallet-url-input') ? $('wallet-url-input').value : ""; // 🌟 ลิงก์ไฟล์รายจ่าย (กระเป๋าเงิน)
  
  if (!salesUrl) return alert('กรุณาวางลิงก์ Google Sheet สำหรับบันทึกยอดขาย');
  
  const btn = event.target;
  const oldTxt = btn.innerText;
  btn.innerText = 'กำลังบันทึก...';
  btn.disabled = true;

  try {
    const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ 
        action: 'setSheetUrl', 
        url: salesUrl,
        walletUrl: walletUrl // 🌟 ส่งลิงก์กระเป๋าเงินไปเก็บด้วย
      })
    });
    
    const result = await res.json();
    if (result.status === 'success') {
      alert('✅ ' + result.message);
      closeSettings();
    } else {
      throw new Error(result.message);
    }
  } catch (err) {
    alert('❌ Error: ' + err.message);
  } finally {
    btn.innerText = oldTxt;
    btn.disabled = false;
  }
}

// ------------------------------------

function updateSizeList() {
  const animal = $('prod-animal').value;
  const sizeSel = $('prod-size');
  sizeSel.innerHTML = '';
  
  const list = (animal === 'Mice') ? MICE_SIZES : RAT_SIZES;
  list.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    sizeSel.appendChild(opt);
  });
  updatePrice();
}

function updatePrice() {
  const animal = $('prod-animal').value;
  const size = $('prod-size').value;
  const isWholesale = $('type-wholesale').checked;
  const priceType = isWholesale ? 'wholesale' : 'retail';
  const price = PRICES[animal][priceType][size] || 0;
  $('prod-price').value = price;
}

function addToCart() {
  const animal = $('prod-animal').value;
  let size     = $('prod-size').value;
  const price  = parseFloat($('prod-price').value);
  const qty    = parseInt($('prod-qty').value);
  const isLive = $('prod-live').checked; 
  const isWholesale = $('type-wholesale').checked;
  
  if (isWholesale) { size = size + ' w'; }

  let promVal = parseFloat($('prom-val').value) || 0;
  const promType = $('prom-type').value;

  if (!price || !qty || qty <= 0) {
    alert('กรุณาระบุราคาและจำนวน');
    return;
  }

  let discountBaht = 0;
  let totalRaw = price * qty;
  
  if (promVal > 0) {
    if (promType === 'percent') {
      discountBaht = totalRaw * (promVal / 100);
    } else {
      discountBaht = promVal;
    }
  }

  cart.push({ 
    animal, size, price, qty, isLive,
    discount: discountBaht,
    promDisplay: promVal > 0 ? `(ลด ${promVal} ${promType === 'percent'?'%':'บ.'})` : ''
  });

  $('prod-qty').value = '';
  $('prom-val').value = '';
  $('prod-live').checked = false; 
  renderCart();
}

function renderCart() {
  const container = $('cart-items');
  const wrapper = $('cart-container');
  container.innerHTML = '';
  
  if (cart.length === 0) {
    wrapper.style.display = 'none';
    $('grand-total').textContent = '0';
    return;
  }
  
  wrapper.style.display = 'block';
  let totalNet = 0;

  cart.forEach((item, index) => {
    const sum = (item.price * item.qty) - item.discount;
    totalNet += sum;
    const condition = item.isLive ? '<span style="color:green">[เป็น]</span>' : '<span style="color:blue">[แช่]</span>';
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <div>
        <b>${item.animal} ${item.size}</b> ${condition}<br>
        ${item.price} x ${item.qty} = ${(item.price * item.qty).toLocaleString()} 
        <span style="color:red; font-size:12px;">${item.promDisplay ? '- ' + item.discount + ' บ.' : ''}</span>
      </div>
      <div style="font-weight:bold;">${sum.toLocaleString()} บ.</div>
      <div class="cart-del" onclick="remItem(${index})">×</div>
    `;
    container.appendChild(div);
  });
  $('grand-total').textContent = totalNet.toLocaleString();
}

function remItem(index) {
  cart.splice(index, 1);
  renderCart();
}

async function submitSaleOrder() {
  if (cart.length === 0) return alert('ตะกร้าว่างเปล่า');
  const date = $('sale-date').value;
  const no   = $('sale-no').value;
  if (!date) return alert('กรุณาเลือกวันที่');

  const btn = $('btn-save');
  const oldTxt = btn.textContent;
  btn.disabled = true;
  btn.textContent = '⏳...';

  try {
    const payload = {
      action: 'saveSales',
      date: date,
      orderNo: no,
      items: cart,
      paymentType: $('pay-type').value,
      shipMethod: $('ship-method').value,
      shipCost: parseFloat($('ship-cost').value) || 0,
      shipPaid: parseFloat($('ship-paid').value) || 0
    };

    const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (result.status === 'success') {
      alert('✅ บันทึกสำเร็จ!');
      cart = [];
      renderCart();
      $('sale-no').value = '';
      loadSalesHistory(); 
    } else {
      throw new Error(result.message);
    }
  } catch (err) {
    alert('❌ Error: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = oldTxt;
  }
}

// ==========================================
// 📊 ส่วนประวัติการขาย (Sales History)
// ==========================================

async function loadSalesHistory() {
  const monthSelect = $('history-month-filter');
  const selectedMonth = monthSelect ? monthSelect.value : "";
  const tbody = $('history-body');
  if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: gray;">กำลังโหลดข้อมูลประวัติ... ⏳</td></tr>';

  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'getSalesHistory', month: selectedMonth === 'current' ? '' : selectedMonth })
    });
    const result = await response.json();
    if (result.status === 'success') {
      const data = result.data;
      if (monthSelect && (monthSelect.options.length <= 1 || selectedMonth === 'current' || selectedMonth === '')) {
        monthSelect.innerHTML = "";
        data.months.forEach(m => {
          const option = document.createElement("option");
          option.value = m.value; option.text = m.label;
          if (m.value === data.selectedMonth) option.selected = true;
          monthSelect.appendChild(option);
        });
      }
      renderHistoryTable(data.records);
    }
  } catch (error) {
    console.error(error);
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:red; padding:20px;">เกิดข้อผิดพลาด</td></tr>';
  }
}

function renderHistoryTable(records) {
  const tbody = $('history-body');
  const summary = $('history-summary');
  if (!tbody) return;
  tbody.innerHTML = '';
  let sumPrice = 0; let sumShipProfit = 0;

  if (!records || records.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px; color:gray;">ไม่มีข้อมูล</td></tr>';
    if (summary) summary.style.display = 'none';
    return;
  }

  records.forEach(item => {
    const tr = document.createElement('tr');
    tr.style.borderBottom = "1px solid #eee";
    const shipCharge = parseFloat(item.shipCharge) || 0;
    const shipActual = parseFloat(item.shipActual) || 0;
    const shipProfit = shipCharge - shipActual;
    const price = parseFloat(item.price) || 0;
    sumPrice += price; sumShipProfit += shipProfit;

    const typeLabel = (item.type === 'เป็น' || item.type === 'Live') 
      ? '<span style="color:green; font-weight:bold;">[เป็น]</span>' 
      : '<span style="color:blue; font-weight:bold;">[แช่]</span>';

    tr.innerHTML = `
      <td style="padding:10px 8px;">${item.date}</td>
      <td style="padding:10px 8px;">${item.animal} ${item.size}</td>
      <td style="padding:10px 8px;">${typeLabel}</td>
      <td style="padding:10px 8px;">${item.qty}</td>
      <td style="padding:10px 8px; font-weight:bold;">${price.toLocaleString()}</td>
      <td style="padding:10px 8px; color:gray;">${shipCharge.toLocaleString()}</td>
      <td style="padding:10px 8px; color:gray;">${shipActual.toLocaleString()}</td>
    `;
    tbody.appendChild(tr);
  });

  if (summary) {
    summary.style.display = 'block';
    if ($('sum-monthly-price')) $('sum-monthly-price').textContent = sumPrice.toLocaleString();
    if ($('sum-monthly-ship')) $('sum-monthly-ship').textContent = sumShipProfit.toLocaleString();
  }
}

window.addEventListener('DOMContentLoaded', init);