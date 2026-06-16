
import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import "./src/style.css";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);


function parseCSV(text) {
  const rows = [];
  let row = [], cur = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], next = text[i + 1];
    if (ch === '"' && inQuotes && next === '"') { cur += '"'; i++; }
    else if (ch === '"') inQuotes = !inQuotes;
    else if (ch === "," && !inQuotes) { row.push(cur.trim()); cur = ""; }
    else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (cur || row.length) { row.push(cur.trim()); rows.push(row); row = []; cur = ""; }
      if (ch === "\r" && next === "\n") i++;
    } else cur += ch;
  }
  if (cur || row.length) { row.push(cur.trim()); rows.push(row); }
  return rows.filter(r => r.some(c => c));
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function App() {
  const [tab, setTab] = useState("office");
  const [drivers, setDrivers] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [driverView, setDriverView] = useState("Driver 1");
 const [driverLoggedIn, setDriverLoggedIn] = useState(localStorage.getItem("driverLoggedIn") || "");
const [driverCode, setDriverCode] = useState("");
  const [search, setSearch] = useState("");
  const [previewOrders, setPreviewOrders] = useState([]);
 const [form, setForm] = useState({ order_no:"", customer_name:"", address:"", phone:"", driver:"", notes:"" });

  async function load() {
    const { data, error } = await supabase.from("deliveries").select("*").order("created_at", { ascending:false });
    if (error) alert(error.message);
    else setDeliveries(data || []);
    const { data: driverData } = await supabase
  .from("drivers")
  .select("*")
  .eq("active", true);

setDrivers(driverData || []);
  }

  useEffect(() => { load(); }, []);

  const duplicateToday = (orderNo) => deliveries.some(d => d.order_no === orderNo && d.delivery_date === todayISO());

  async function addDelivery(e) {
    e.preventDefault();
    if (!form.order_no || !form.customer_name || !form.address) return alert("Order number, customer, and address are required.");
    if (duplicateToday(form.order_no) && !confirm(`Order #${form.order_no} already exists today. Continue anyway?`)) return;
    const { error } = await supabase.from("deliveries").insert({ ...form, delivery_date: todayISO(), status:"New" });
    if (error) alert(error.message);
    else {
      setForm({ order_no:"", customer_name:"", address:"", phone:"", driver:"Driver 1", notes:"" });
      load();
    }
  }

  async function editDelivery(d) {
    const order_no = prompt("Order number:", d.order_no); if (order_no === null) return;
    const customer_name = prompt("Customer name:", d.customer_name); if (customer_name === null) return;
    const address = prompt("Address:", d.address); if (address === null) return;
    const phone = prompt("Phone:", d.phone || ""); if (phone === null) return;
    const driver = prompt("Driver:", d.driver); if (driver === null) return;
    const notes = prompt("Notes:", d.notes || ""); if (notes === null) return;
    const { error } = await supabase.from("deliveries").update({
      order_no, customer_name, address, phone, driver: drivers.includes(driver) ? driver : d.driver, notes
    }).eq("id", d.id);
    if (error) alert(error.message); else load();
  }

  async function deleteDelivery(id) {
    if (!confirm("Delete this order?")) return;
    const { error } = await supabase.from("deliveries").delete().eq("id", id);
    if (error) alert(error.message); else load();
  }

  async function setStatus(id, status) {
    const { error } = await supabase.from("deliveries").update({ status }).eq("id", id);
    if (error) alert(error.message); else load();
  }

  async function confirmDelivered(d) {
    const receiver = document.getElementById(`receiver_${d.id}`)?.value.trim();
    const file = document.getElementById(`photo_${d.id}`)?.files?.[0];

    if (!receiver && !file) return alert("Proof is required: enter receiver name or upload/take a photo.");

    let proof_photo_url = d.proof_photo_url;
    if (file) {
      const path = `${d.id}/${Date.now()}-${file.name}`;
      const up = await supabase.storage.from("delivery-proofs").upload(path, file);
      if (up.error) return alert(up.error.message);
      const pub = supabase.storage.from("delivery-proofs").getPublicUrl(path);
      proof_photo_url = pub.data.publicUrl;
    }

    const { error } = await supabase.from("deliveries").update({
      status:"Delivered",
      receiver_name: receiver || null,
      proof_photo_url,
      completed_at: new Date().toISOString()
    }).eq("id", d.id);

    if (error) alert(error.message);
    else {
      if (d.phone) alert(`Text preview: Lakewood's Gingerbread House: Your order #${d.order_no} has been delivered. Thank you.`);
      load();
    }
  }

  async function markFailed(d) {
    const reason = prompt("Reason for failed delivery?");
    if (reason === null) return;
    if (!reason.trim()) return alert("Reason is required.");
    const { error } = await supabase.from("deliveries").update({
      status:"Failed",
      failed_reason: reason.trim(),
      completed_at: new Date().toISOString()
    }).eq("id", d.id);
    if (error) alert(error.message); else load();
  }

  function buildPreview(text) {
    const rows = parseCSV(text);
    const header = rows[0]?.map(h => h.toLowerCase()) || [];
    const hasHeader = header.some(h => h.includes("order")) || header.some(h => h.includes("customer"));
    const dataRows = hasHeader ? rows.slice(1) : rows;
    const orders = dataRows.map(r => ({
      order_no: r[0]?.trim() || "",
      customer_name: r[1]?.trim() || "",
      address: r[2]?.trim() || "",
      phone: r[3]?.trim() || "",
      driver: drivers.includes(r[4]?.trim()) ? r[4].trim() : "Driver 1",
      notes: r[5]?.trim() || ""
    })).filter(o => o.order_no && o.customer_name && o.address);
    setPreviewOrders(orders);
  }

  async function addPreviewedOrders() {
    if (!previewOrders.length) return alert("Preview orders first.");
    const duplicateCount = previewOrders.filter(o => duplicateToday(o.order_no)).length;
    const payload = previewOrders.map(o => ({ ...o, delivery_date: todayISO(), status:"New" }));
    const { error } = await supabase.from("deliveries").insert(payload);
    if (error) alert(error.message);
    else {
      alert(`${previewOrders.length} orders added.` + (duplicateCount ? `\nWarning: ${duplicateCount} duplicate(s) for today.` : ""));
      setPreviewOrders([]);
      load();
    }
  }

  function OrderCard({ d, driverMode=false }) {
    return <div className="card">
      <div className="orderTitle"><h3>#{d.order_no} · {d.customer_name}</h3><span className={`pill ${d.status}`}>{d.status}</span></div>
      <p><b>Address:</b> {d.address}</p>
      <p><b>Driver:</b> {d.driver}</p>
      {d.phone && <p><b>Phone:</b> {d.phone}</p>}
      {d.notes && <p><b>Notes:</b> {d.notes}</p>}
      {d.completed_at && <p><b>{d.status}:</b> {new Date(d.completed_at).toLocaleString()}</p>}
      {d.receiver_name && <p><b>Receiver:</b> {d.receiver_name}</p>}
      {d.failed_reason && <p><b>Reason:</b> {d.failed_reason}</p>}
      {d.proof_photo_url && <p><a href={d.proof_photo_url} target="_blank">View proof photo</a></p>}

      <button className="btn secondary" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.address)}`)}>Open Maps</button>

      {!driverMode && <>
        <button className="btn secondary" onClick={() => editDelivery(d)}>Edit Order</button>
        <button className="btn danger" onClick={() => deleteDelivery(d.id)}>Delete Order</button>
      </>}

      {d.status !== "Delivered" && d.status !== "Failed" && <>
        {d.status !== "Out for Delivery" && <button className="btn out" onClick={() => setStatus(d.id, "Out for Delivery")}>Out for Delivery</button>}
        <div className="proofBox">
          <label>Receiver name</label>
          <input id={`receiver_${d.id}`} placeholder="Name of receiver" />
          <label>Photo proof</label>
          <input id={`photo_${d.id}`} type="file" accept="image/*" capture="environment" />
          <button className="btn delivered" onClick={() => confirmDelivered(d)}>Confirm Delivered</button>
          <button className="btn danger" onClick={() => markFailed(d)}>Failed Delivery</button>
        </div>
      </>}
    </div>
  }

  const active = deliveries.filter(d => d.status !== "Delivered" && d.status !== "Failed");
 function driverLogin() {
  const driver = drivers.find(d => d.pin === driverCode.trim());

  if (!driver) return alert("Invalid driver code.");

  localStorage.setItem("driverLoggedIn", driver.name);
  setDriverLoggedIn(driver.name);
  setDriverView(driver.name);
  setTab("driver");
}
function driverLogout() {
  localStorage.removeItem("driverLoggedIn");
  setDriverLoggedIn("");
  setDriverCode("");
  }
const driverOrders = active.filter(d => d.driver === driverView);
  const history = deliveries.filter(d => ["Delivered","Failed"].includes(d.status)).filter(d =>
    [d.order_no,d.customer_name,d.address,d.driver,d.status,d.failed_reason,d.receiver_name].join(" ").toLowerCase().includes(search.toLowerCase())
  );

  return <div>
    <header><h1>Lakewood’s Gingerbread House</h1><p>Delivery App · 732.370.7933 · lakewoodbaskets.com</p></header>
    <nav>
  {!driverLoggedIn && (
    <>
      <button className={tab==="office"?"active":""} onClick={()=>setTab("office")}>Office</button>
      <button className={tab==="history"?"active":""} onClick={()=>setTab("history")}>History</button>
    </>
  )}

  <button className={tab==="driver"?"active":""} onClick={()=>setTab("driver")}>Driver</button>
</nav>

    <main>
      {tab === "office" && <>
        <div className="snapshot">
          <div><b>{deliveries.filter(d=>d.status==="New").length}</b><span>New</span></div>
          <div><b>{deliveries.filter(d=>d.status==="Out for Delivery").length}</b><span>Out</span></div>
          <div><b>{deliveries.filter(d=>d.status==="Delivered" && d.delivery_date===todayISO()).length}</b><span>Delivered today</span></div>
          <div><b>{deliveries.filter(d=>d.status==="Failed" && d.delivery_date===todayISO()).length}</b><span>Failed today</span></div>
        </div>

        <form className="card" onSubmit={addDelivery}>
          <h2>Add Delivery</h2>
          <label>Order Number</label><input value={form.order_no} onChange={e=>setForm({...form, order_no:e.target.value})}/>
          <label>Customer Name</label><input value={form.customer_name} onChange={e=>setForm({...form, customer_name:e.target.value})}/>
          <label>Address</label><input value={form.address} onChange={e=>setForm({...form, address:e.target.value})}/>
          <label>Customer Phone</label><input value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})}/>
          <label>Driver</label><select value={form.driver} onChange={e=>setForm({...form, driver:e.target.value})}>{drivers.map(x => <option key={x.id} value={x.name}>{x.name}</option>)}</select>
          <label>Notes</label><textarea value={form.notes} onChange={e=>setForm({...form, notes:e.target.value})}/>
          <button className="btn primary">Add Delivery</button>
        </form>

        <div className="card">
          <h2>Bulk Upload Preview</h2>
          <input type="file" accept=".csv" onChange={e=>{
            const file = e.target.files?.[0]; if(!file) return;
            const reader = new FileReader();
            reader.onload = ev => buildPreview(ev.target.result);
            reader.readAsText(file);
          }}/>
          <textarea placeholder='Or paste CSV orders here...' onChange={e=>buildPreview(e.target.value)} />
          {!!previewOrders.length && <>
            <h3>Preview {previewOrders.length} Orders</h3>
            <table><tbody>{previewOrders.map((o,i)=><tr key={i}><td>{o.order_no}{duplicateToday(o.order_no) ? " ⚠️" : ""}</td><td>{o.customer_name}</td><td>{o.address}</td><td>{o.driver}</td></tr>)}</tbody></table>
            <button className="btn primary" onClick={addPreviewedOrders}>Add Previewed Orders to Delivery</button>
          </>}
        </div>

        <h2>Active Deliveries</h2>
        {active.map(d => <OrderCard key={d.id} d={d} />)}
      </>}

    {tab === "driver" && <>
  {!driverLoggedIn ? (
    <div className="card">
      <h2>Driver Login</h2>
      <label>Enter Driver Code</label>
      <input
        value={driverCode}
        onChange={e=>setDriverCode(e.target.value)}
        placeholder="Enter code"
        inputMode="numeric"
      />
      <button className="btn primary" onClick={driverLogin}>Login</button>
    </div>
  ) : (
    <>
      <div className="card">
        <h2>{driverLoggedIn}</h2>
        <p>Showing only your assigned deliveries.</p>
        <button className="btn secondary" onClick={driverLogout}>Logout</button>
      </div>
      {active.filter(d => d.driver === driverLoggedIn).map(d => <OrderCard key={d.id} d={d} driverMode />)}
    </>
  )}
</>}

      {tab === "history" && <>
        <input className="search" placeholder="Search history..." value={search} onChange={e=>setSearch(e.target.value)} />
        {history.map(d => <OrderCard key={d.id} d={d} />)}
      </>}
    </main>
  </div>
}

createRoot(document.getElementById("root")).render(<App />);
