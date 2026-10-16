// Public published-sheet CSV endpoint. This dashboard is independent of any other project.
const PUBLISHED_ID = "2PACX-1vSymM61EmV8uCX0_pcMqO_AXkFf-cng5a2ftjgUnmgfCn03vboD_tw3FgOz34QwGD4gsjMbeG-FO-Je";
const CSV_URL = `https://docs.google.com/spreadsheets/d/e/${PUBLISHED_ID}/pub?output=csv`;
const REFRESH_MS = 60 * 1000;
let allRows = [], headers = [];
const $ = id => document.getElementById(id);
function parseCSV(text){
  const rows=[]; let row=[], cell="", quoted=false;
  for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];
    if(c==='"'&&quoted&&n==='"'){cell+='"';i++}
    else if(c==='"'){quoted=!quoted}
    else if(c===','&&!quoted){row.push(cell);cell=""}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&n==='\n')i++;row.push(cell);if(row.some(v=>v.trim()!==""))rows.push(row);row=[];cell=""}
    else cell+=c;
  }
  if(cell.length||row.length){row.push(cell);if(row.some(v=>v.trim()!==""))rows.push(row)}
  return rows;
}
function norm(s){return String(s||"").toLowerCase().replace(/[^a-z0-9]/g,"")}
function findCol(terms){return headers.findIndex(h=>terms.some(t=>norm(h).includes(norm(t))))}
function num(v){if(v==null)return 0;const s=String(v).replace(/[,₹$%\s]/g,"");const n=Number(s);return Number.isFinite(n)?n:0}
function fmt(n){return new Intl.NumberFormat("en-IN",{maximumFractionDigits:2}).format(n)}
function showError(message){$("error").textContent=message;$("error").classList.remove("hidden");$("status").textContent="Needs attention"}
function hideError(){$("error").classList.add("hidden")}
function updateCards(){
  const stockCol=findCol(["stock","quantity","qty","inventory","openingstock","available"]);
  const dispatchCol=findCol(["dispatch","dispatched","shipment","issued","salesqty"]);
  const balanceCol=findCol(["balance","closingstock","remaining","pendingstock"]);
  $("productsCount").textContent=fmt(allRows.length);
  $("totalStock").textContent=stockCol<0?"—":fmt(allRows.reduce((s,r)=>s+num(r[stockCol]),0));
  $("totalDispatch").textContent=dispatchCol<0?"—":fmt(allRows.reduce((s,r)=>s+num(r[dispatchCol]),0));
  $("totalBalance").textContent=balanceCol<0?"—":fmt(allRows.reduce((s,r)=>s+num(r[balanceCol]),0));
  [["totalStock",stockCol],["totalDispatch",dispatchCol],["totalBalance",balanceCol]].forEach(([id,col])=>{const foot=$(id).parentElement.querySelector(".metric-foot");if(col<0)foot.textContent="No matching column detected";else foot.textContent="Column: "+headers[col]});
}
function drawTable(){
  const q=$("search").value.trim().toLowerCase(), chosen=$("columnFilter").value;
  const rows=allRows.filter(r=>(!chosen||String(r[0]||"")===chosen)&&(!q||r.some(v=>String(v).toLowerCase().includes(q))));
  $("rowCount").textContent=`${rows.length} row${rows.length===1?"":"s"}`;
  $("thead").innerHTML="<tr>"+headers.map(h=>`<th>${escapeHTML(h||"Column")}</th>`).join("")+"</tr>";
  if(!rows.length){$("tbody").innerHTML=`<tr><td class="empty" colspan="${Math.max(headers.length,1)}">No matching records found.</td></tr>`;return}
  $("tbody").innerHTML=rows.slice(0,1500).map(r=>"<tr>"+headers.map((_,i)=>`<td>${escapeHTML(r[i]||"")}</td>`).join("")+"</tr>").join("");
}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
async function loadData(){
  $("status").textContent="Refreshing…";
  try{
    const res=await fetch(CSV_URL+`&cacheBust=${Date.now()}`,{cache:"no-store"});
    if(!res.ok)throw new Error("Google Sheets returned HTTP "+res.status);
    const raw=await res.text();
    if(!raw.trim()||raw.trim().startsWith("<!DOCTYPE")||raw.includes("Sign in - Google Accounts"))throw new Error("The CSV feed was not returned. Check that the spreadsheet is published to the web and that the published link is correct.");
    const parsed=parseCSV(raw);
    if(parsed.length<1)throw new Error("No rows found in the published sheet.");
    headers=parsed[0].map((h,i)=>h.trim()||`Column ${i+1}`);
    allRows=parsed.slice(1).filter(r=>r.some(v=>String(v).trim()!=="")).map(r=>headers.map((_,i)=>r[i]??""));
    updateCards();drawTable();hideError();
    $("lastUpdated").textContent=new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit"});
    $("status").textContent="Connected · auto-refresh 1 min";
    const filter=$("columnFilter");const prior=filter.value;filter.innerHTML='<option value="">All records</option>'+[...new Set(allRows.map(r=>r[0]).filter(Boolean))].slice(0,250).map(v=>`<option value="${escapeHTML(v)}">${escapeHTML(v)}</option>`).join("");filter.value=prior;
  }catch(e){showError("Could not load the published spreadsheet. "+e.message+" If this persists, use the CSV link directly in a browser to check whether it opens.");$("lastUpdated").textContent="Not connected";console.error(e)}
}
$("search").addEventListener("input",drawTable);$("columnFilter").addEventListener("change",drawTable);$("refreshBtn").addEventListener("click",loadData);
loadData();setInterval(loadData,REFRESH_MS);
