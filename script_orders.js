// ⚠️ ตรวจสอบ URL
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzevDDOgRBy5i4WjKzX72JBeSJc8e44N9kwC3aeVU5PebS3lHIyfi-nmDcHYR4esv5K7Q/exec';

const $ = (id) => document.getElementById(id);

function init() {
  $('order-date').value = new Date().toISOString().split('T')[0];
  
  // เพิ่ม Listener ให้ช่อง Discount
  $('order-price').addEventListener('input', calculateTotal);
  $('order-qty').addEventListener('input', calculateTotal);
  $('order-shipping').addEventListener('input', calculateTotal);
  $('order-discount').addEventListener('input', calculateTotal);
  
  loadDashboard();
}

function calculateTotal() {
  const price = parseFloat($('order-price').value) || 0;
  const qty = parseFloat($('order-qty').value) || 0;
  const shipping = parseFloat($('order-shipping').value) || 0;
  const discount = parseFloat($('order-discount').value) || 0;
  
  // สูตรใหม่: (ราคา x จำนวน) + ค่าส่ง - ส่วนลด
  const total = (price * qty) + shipping - discount;
  
  $('total-display').textContent = total.toLocaleString();
}

async function loadDashboard() {
  const date = $('order-date').value;
  if (!date) return;

  $('dash-sales').innerText = '...';
  $('dash-expenses').innerText = '...';
  $('order-table').querySelector('tbody').innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px;">กำลังโหลด...</td></tr>';

  try {
    const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: 'getDashboard', date: date })
    });
    
    const result = await res.json();
    
    if (result.status === 'success') {
      const sum = result.summary;
      $('dash-sales').innerText = parseFloat(sum.sales).toLocaleString();
      $('dash-expenses').innerText = parseFloat(sum.expenses).toLocaleString();
      
      const profit = parseFloat(sum.profit);
      const profitEl = $('dash-profit');
      profitEl.innerText = profit.toLocaleString();
      profitEl.style.color = profit >= 0 ? '#3b82f6' : '#ef4444';

      $('dash-balance').innerText = parseFloat(sum.balance).toLocaleString();
      
      // 🌟 อัปเดตยอดแยกกระเป๋าเงินสด / บัญชี
      if ($('dash-cash')) $('dash-cash').innerText = parseFloat(sum.cash || 0).toLocaleString();
      if ($('dash-digital')) $('dash-digital').innerText = parseFloat(sum.digital || 0).toLocaleString();

      const tbody = $('order-table').querySelector('tbody');
      tbody.innerHTML = '';
      if (result.orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px; color:gray;">ไม่มีรายการ</td></tr>';
      } else {
        result.orders.forEach(o => {
          let d = new Date(o.date);
          if (isNaN(d.getTime())) d = new Date();
          let dStr = d.getDate() + '/' + (d.getMonth()+1);
          
          let tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${dStr}</td>
            <td>
              <div style="font-weight:bold; color:#111827;">${o.item}</div>
              <div style="font-size:11px; color:#6b7280;">${o.supplier || '-'}</div>
            </td>
            <td style="text-align:right; font-weight:bold;">${parseFloat(o.total).toLocaleString()}</td>
          `;
          tbody.appendChild(tr);
        });
      }
    }
  } catch (err) { console.error(err); }
}

async function submitOrder() {
  const date = $('order-date').value;
  const item = $('order-item').value;
  const supplier = $('order-supplier').value;
  const price = parseFloat($('order-price').value);
  const qty = parseInt($('order-qty').value);
  const shipping = parseFloat($('order-shipping').value) || 0;
  const discount = parseFloat($('order-discount').value) || 0;
  const note = $('order-note').value;
  const payType = $('order-pay-type') ? $('order-pay-type').value : ""; // 🌟 ดึงค่าช่องทางชำระ

  if (!date || !item || !price || !qty) return alert('กรุณากรอกข้อมูลให้ครบ');

  const btn = $('btn-save');
  const oldTxt = btn.innerText;
  btn.disabled = true;
  btn.innerText = '⏳...';

  try {
    const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ 
        action: 'saveOrder', 
        date, item, supplier, price, qty, shipping, discount, note, payType // ส่ง payType ไปด้วย
      })
    });

    const result = await res.json();
    if (result.status === 'success') {
      alert('✅ บันทึกสำเร็จ!');
      $('order-item').value = ''; $('order-price').value = ''; 
      $('order-qty').value = '1'; $('order-shipping').value = ''; 
      $('order-discount').value = ''; 
      $('order-note').value = ''; calculateTotal();
      loadDashboard(); 
    } else {
      alert('Error: ' + result.message);
    }
  } catch (err) { alert('Error: ' + err.message); } 
  finally { btn.disabled = false; btn.innerText = oldTxt; }
}

// ==========================================
// 🌟 ฟังก์ชันจัดการปุ่ม "โยกเงิน" (Transfers)
// ==========================================
function openTransferModal() { 
  $('transfer-modal').style.display = 'flex'; 
  if (!$('transfer-date').value) $('transfer-date').value = new Date().toISOString().split('T')[0];
}

function closeTransferModal() { 
  $('transfer-modal').style.display = 'none'; 
}

async function submitTransfer() {
  const date = $('transfer-date').value;
  const type = $('transfer-type').value;
  const amount = parseFloat($('transfer-amount').value);
  const note = $('transfer-note').value;

  if (!date || !amount) return alert('กรุณากรอกวันที่และจำนวนเงินให้ครบถ้วน');

  const btn = event.target;
  const oldTxt = btn.innerText;
  btn.disabled = true; btn.innerText = '⏳...';

  try {
    const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: 'saveTransfer', date, type, amount, note })
    });
    const result = await res.json();
    if (result.status === 'success') {
      alert('✅ บันทึกประวัติโยกเงินสำเร็จ!');
      $('transfer-amount').value = ''; $('transfer-note').value = '';
      closeTransferModal();
      loadDashboard(); // รีเฟรชยอดเงินให้ด้วย
    } else alert('Error: ' + result.message);
  } catch(e) { alert('Error: ' + e); }
  finally { btn.disabled = false; btn.innerText = oldTxt; }
}

function openSettings() { $('settings-modal').style.display = 'flex'; }
function closeSettings() { $('settings-modal').style.display = 'none'; }
async function saveSettings() {
  const url = $('sheet-url-input').value;
  if (!url) return alert('Link?');
  const btn = event.target; btn.innerText='...';
  try {
      const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: 'setSheetUrl', url: url })
    });
    const r = await res.json();
    if(r.status==='success') { alert('Update Sheet เรียบร้อย'); closeSettings(); loadDashboard(); }
  } catch(e){ alert(e); }
  btn.innerText='บันทึก';
}

window.addEventListener('DOMContentLoaded', init);