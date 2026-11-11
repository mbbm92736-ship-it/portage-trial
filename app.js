var data = window.PORTAGE_DATA;
var groups = data.age_groups;
var domains = data.domains;
var STORAGE_KEY = "portage-web-case-v3";
var state = { domain: 0, year: 0, autoBefore: 0, scores: {} };
var $ = function (id) { return document.getElementById(id); };

function today() { return new Date().toISOString().slice(0, 10); }
function esc(value) { return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;"); }
function cleanNumber(value) { return Math.max(0, Number(value) || 0); }
function monthsBetween() {
  var birth = $("birthDate").value, assessment = $("assessmentDate").value;
  if (!birth || !assessment) return 0;
  var b = new Date(birth + "T00:00:00"), a = new Date(assessment + "T00:00:00");
  if (isNaN(b) || isNaN(a) || a < b) return 0;
  var result = (a.getFullYear() - b.getFullYear()) * 12 + a.getMonth() - b.getMonth();
  if (a.getDate() < b.getDate()) result--;
  return Math.max(0, result);
}
function ageYearIndex(months) { return Math.min(groups.length - 1, Math.max(0, Math.floor(Math.max(1, months) - 1) / 12 | 0)); }
function updateAge() {
  var age = monthsBetween();
  $("ageMonths").value = $("birthDate").value ? age : "";
  $("ageHint").textContent = $("birthDate").value ? "العمر الزمني: " + age + " شهراً" : "أدخل تاريخ الميلاد";
  return age;
}
function itemsFor(domainIndex, yearIndex) {
  var domain = domains[domainIndex];
  return data.items.filter(function (item) { return item.domain_code === domain.code && item.age_group === groups[yearIndex]; });
}
function scoreValue(item, yearIndex) {
  if (Object.prototype.hasOwnProperty.call(state.scores, item.id)) return Number(state.scores[item.id]);
  return yearIndex < state.autoBefore ? 1 : 0;
}
function hasManualScore(item) { return Object.prototype.hasOwnProperty.call(state.scores, item.id); }
function scoreItem(itemId, value) { state.scores[itemId] = value; render(); }
function resultForDomain(domain, index, activeYear) {
  var passed = 0, total = 0, development = 0, byYear = [];
  groups.forEach(function (group, yearIndex) {
    var items = itemsFor(index, yearIndex), possible = items.length;
    var achieved = items.reduce(function (sum, item) { return sum + scoreValue(item, yearIndex); }, 0);
    var manuallyEvaluated = items.some(function (item) { return hasManualScore(item); });
    if ((yearIndex <= activeYear || manuallyEvaluated) && possible) development += achieved / possible * 12;
    if (yearIndex <= activeYear || manuallyEvaluated) { passed += achieved; total += possible; }
    byYear.push({ passed: achieved, total: possible });
  });
  return { domain: domain.name, code: domain.code, age: development, pct: 0, passed: passed, total: total, byYear: byYear };
}
function calculate() {
  var chronological = updateAge(), activeYear = ageYearIndex(chronological || 1);
  var rows = domains.map(function (domain, index) { return resultForDomain(domain, index, activeYear); });
  rows.forEach(function (row) { row.pct = chronological ? row.age / chronological * 100 : 0; });
  var generalAge = rows.reduce(function (sum, row) { return sum + row.age; }, 0) / rows.length;
  return { ageMonths: chronological, activeYear: activeYear, domains: rows, generalAge: generalAge, generalDQ: chronological ? generalAge / chronological * 100 : 0 };
}
function level(row) {
  if (row.pct < 50) return { label: "احتياج مرتفع", frequency: "4 إلى 5 جلسات أسبوعياً مع تدريب منزلي يومي قصير", method: "تجزئة المهارة إلى خطوات صغيرة، مع مساعدة ثم تخفيفها تدريجياً." };
  if (row.pct < 70) return { label: "احتياج متوسط", frequency: "3 جلسات أسبوعياً مع تدريب منزلي 10 إلى 15 دقيقة", method: "تكرار المهارة في مواقف متنوعة واستخدام التعزيز الفوري." };
  if (row.pct <= 85) return { label: "احتياج بسيط", frequency: "جلسة إلى جلستين أسبوعياً مع دمج المهارة في الروتين", method: "توسيع أداء المهارة تدريجياً داخل المواقف اليومية." };
  return { label: "أداء مناسب", frequency: "متابعة وتعزيز أسبوعي", method: "استخدام المجال القوي لدعم المجالات الأخرى والمحافظة على الأداء." };
}
function summaryInterpretation(dq) {
  if (dq > 85) return "يوجد نمو تطوري مناسب مع حاجة إلى متابعة المجالات التي لم تُقيّم أو التي ظهرت فيها بنود غير مجتازة.";
  if (dq >= 70) return "توجد حاجة إلى تدخل نمائي منظم وتنمية إضافية في المجالات ذات الأولوية.";
  return "توجد حاجة إلى برنامج تدخل مبكر مكثف وخطة فردية مع مراجعة تقدم الطفل بصورة دورية.";
}
function domainAdvice(name) {
  var advice = {
    "النمو الحركي": { parent: "مارسوا أنشطة التوازن والكرة والقص والصلصال والتلوين في جلسات لعب قصيرة.", specialist: "ابدأ بالمهارة غير المجتازة الأسهل، واستعمل نموذجاً حركياً ومساعدة جسدية متدرجة." },
    "المساعدة الذاتية": { parent: "اجعلوا الطفل يشارك يومياً في الطعام واللبس والنظافة بخطوات ثابتة ومبسطة.", specialist: "حلّل مهارات الاستقلال إلى خطوات متتابعة وقلل المساعدة بعد كل نجاح." },
    "المخالطة الاجتماعية": { parent: "نفذوا ألعاب تبادل الأدوار والانتظار وطلب المساعدة والتواصل البصري داخل الروتين اليومي.", specialist: "درّب المبادرة والاستجابة الاجتماعية مع التعزيز الفوري والتعميم مع أشخاص مختلفين." },
    "النمو المعرفي": { parent: "استخدموا المطابقة والتصنيف والبازل والذاكرة والتسلسل في اللعب اليومي.", specialist: "انتقل من خيارين إلى بدائل أكثر، وثبّت الانتباه قبل زيادة صعوبة المهمة." },
    "النمو اللغوي": { parent: "سمّوا الأشياء اليومية واطلبوا من الطفل الاختيار والطلب والتعبير بجمل مناسبة لمستواه.", specialist: "اعمل على الفهم أولاً ثم التعبير، مع نمذجة لغوية وتكرار في مواقف حقيقية." }
  };
  return advice[name] || { parent: "مارسوا أنشطة المجال بصورة يومية متدرجة.", specialist: "نفذوا الخطة مع قياس الأداء أسبوعياً." };
}
function failedItemsByDomain(result) {
  var output = {};
  result.domains.forEach(function (row, domainIndex) {
    var failed = [];
    groups.forEach(function (group, yearIndex) {
      var yearItems = itemsFor(domainIndex, yearIndex);
      var manuallyEvaluated = yearItems.some(function (item) { return hasManualScore(item); });
      if (yearIndex > result.activeYear && !manuallyEvaluated) return;
      yearItems.forEach(function (item) { if (state.scores[item.id] === 0) failed.push(item); });
    });
    if (failed.length) output[row.domain] = failed;
  });
  return output;
}
function renderTabs(result) {
  $("domainTabs").innerHTML = domains.map(function (domain, index) {
    return '<button class="domain-tab ' + (state.domain === index ? 'active' : '') + '" data-domain="' + index + '">' + esc(domain.name) + '</button>';
  }).join("");
  $("yearTabs").innerHTML = groups.map(function (group, index) {
    var future = index > result.activeYear;
    var subtitle = index < state.autoBefore ? 'محسوبة تلقائياً' : index === result.activeYear ? 'سنة التقييم' : future ? 'تقييم اختياري' : 'سنة سابقة';
    return '<button class="year-tab ' + (state.year === index ? 'active ' : '') + (index < state.autoBefore ? 'auto ' : '') + (future ? 'future' : '') + '" data-year="' + index + '">سنة ' + group + '<small>' + subtitle + '</small></button>';
  }).join("");
}
function renderItems(result) {
  var domain = domains[state.domain], items = itemsFor(state.domain, state.year);
  var note = state.year < state.autoBefore ? 'هذه السنة محسوبة تلقائياً، ويمكن تعديل أي بند.' : state.year > result.activeYear ? 'تقييم اختياري: تدخل السنة في النتيجة فقط عند إدخال درجة بند فيها.' : 'سجّل درجة كل بند تم تطبيقه.';
  $("itemTitle").innerHTML = '<h3>' + esc(domain.name) + ' - سنة ' + groups[state.year] + '</h3><span class="auto-label">' + note + '</span>';
  if (!items.length) { $("itemList").innerHTML = '<div class="empty-items">لا توجد بنود لهذه السنة.</div>'; return; }
  $("itemList").innerHTML = items.map(function (item, index) {
    var value = scoreValue(item, state.year), manual = hasManualScore(item), auto = !manual && state.year < state.autoBefore;
    return '<div class="item-row ' + (auto ? 'auto-item' : '') + '" data-item="' + esc(item.id) + '"><span class="item-number">' + (item.item_number || index + 1) + '</span><div class="item-text">' + esc(item.text) + (auto ? '<div class="auto-label">محسوب تلقائياً</div>' : '') + '</div><div class="score-control"><button class="score-choice pass ' + (value === 1 ? 'active' : '') + '" data-score="1">اجتاز</button><button class="score-choice fail ' + (manual && value === 0 ? 'active' : '') + '" data-score="0">لم يجتز</button></div></div>';
  }).join("");
}
function renderResults(result) {
  $("generalResult").textContent = 'العمر التطوري العام: ' + result.generalAge.toFixed(1) + ' شهر | النسبة العامة: ' + result.generalDQ.toFixed(1) + '%';
  $("evaluationSummary").textContent = 'السنة المحددة تلقائياً: ' + groups[result.activeYear] + ' | البنود المكتملة: ' + Object.keys(state.scores).length;
  $("results").innerHTML = result.domains.map(function (row) {
    return '<article class="result-card"><div class="result-card-top"><span>' + esc(row.domain) + '</span><span>' + row.pct.toFixed(1) + '%</span></div><small>' + row.age.toFixed(1) + ' شهر تطوري - اجتاز ' + row.passed + ' من ' + row.total + '</small><div class="meter"><span style="width:' + Math.min(100, row.pct).toFixed(1) + '%"></span></div></article>';
  }).join("");
  var rows = result.domains.map(function (row) { return '<tr><td>' + esc(row.domain) + '</td><td>' + row.age.toFixed(1) + '</td><td>' + row.pct.toFixed(1) + '%</td><td>' + row.passed + ' / ' + row.total + '</td><td>' + esc(level(row).label) + '</td></tr>'; }).join("");
  $("summaryTable").innerHTML = '<table class="result-table"><thead><tr><th>المجال</th><th>العمر التطوري</th><th>النسبة التطورية</th><th>البنود ضمن العمر</th><th>التقدير</th></tr></thead><tbody>' + rows + '<tr class="total"><td>النتيجة العامة</td><td>' + result.generalAge.toFixed(1) + '</td><td>' + result.generalDQ.toFixed(1) + '%</td><td colspan="2">' + esc(summaryInterpretation(result.generalDQ)) + '</td></tr></tbody></table>';
}
function draw(result) {
  var canvas = $("chart"), context = canvas.getContext("2d"), width = canvas.width, height = canvas.height, base = height - 70;
  context.clearRect(0, 0, width, height); context.fillStyle = '#ffffff'; context.fillRect(0, 0, width, height);
  context.fillStyle = '#123247'; context.font = 'bold 24px Tahoma'; context.textAlign = 'right'; context.fillText('الرسم البياني للأعمار التطورية', width - 42, 42);
  context.strokeStyle = '#d7e9ef'; context.lineWidth = 2; context.beginPath(); context.moveTo(55, base); context.lineTo(width - 50, base); context.stroke();
  var max = Math.max(12, result.ageMonths || 1, result.domains.reduce(function (m, row) { return Math.max(m, row.age); }, 0));
  var gap = (width - 130) / result.domains.length, bar = Math.min(95, gap * .55);
  result.domains.forEach(function (row, index) { var h = row.age / max * (base - 115), x = width - 85 - index * gap - bar; context.fillStyle = '#127ea7'; context.fillRect(x, base - h, bar, h); context.fillStyle = '#123247'; context.textAlign = 'center'; context.font = 'bold 17px Tahoma'; context.fillText(row.age.toFixed(1), x + bar / 2, base - h - 10); context.font = '15px Tahoma'; context.fillText(String(index + 1), x + bar / 2, base + 28); });
  context.textAlign = 'right'; context.font = '14px Tahoma'; context.fillStyle = '#5d7480'; context.fillText('1 الحركي  |  2 المساعدة الذاتية  |  3 الاجتماعي  |  4 المعرفي  |  5 اللغوي', width - 42, height - 18);
}
function render() { var result = calculate(); renderTabs(result); renderItems(result); renderResults(result); draw(result); return result; }
function applyAgeSelection() { var result = calculate(); state.autoBefore = result.activeYear; state.year = result.activeYear; render(); alert('تم تحديد السنوات السابقة كسنوات محسوبة تلقائياً، وفتح سنة ' + groups[result.activeYear] + ' للتقييم.'); }
function save() { var result = calculate(); localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 3, savedAt: new Date().toISOString(), childName: $("childName").value, birthDate: $("birthDate").value, assessmentDate: $("assessmentDate").value, rater: $("rater").value, state: state, result: result })); alert('تم حفظ الحالة والبنود التي تم تقييمها.'); }
function openCase() { var raw = localStorage.getItem(STORAGE_KEY); if (!raw) { alert('لا توجد حالة محفوظة بهذه النسخة.'); return; } try { var saved = JSON.parse(raw); ["childName","birthDate","assessmentDate","rater"].forEach(function (key) { $(key).value = saved[key] || ''; }); state = saved.state && saved.state.scores ? saved.state : { domain:0, year:0, autoBefore:0, scores:{} }; updateAge(); render(); alert('تم فتح آخر حالة محفوظة.'); } catch (error) { alert('تعذر فتح الحالة المحفوظة.'); } }
function resetCase() { if (!confirm('سيتم مسح الحقول ودرجات البنود من الشاشة الحالية.')) return; state = { domain:0, year:0, autoBefore:0, scores:{} }; ["childName","birthDate","rater"].forEach(function (key) { $(key).value = ''; }); $("assessmentDate").value = today(); updateAge(); render(); }
function reportSections(result) {
  var failed = failedItemsByDomain(result), rows = result.domains.map(function (row) { return '<tr><td>' + esc(row.domain) + '</td><td>' + row.age.toFixed(1) + ' شهر</td><td>' + row.pct.toFixed(1) + '%</td><td>' + esc(level(row).label) + '</td></tr>'; }).join('');
  var failedHtml = result.domains.map(function (row) { var list = failed[row.domain] || []; if (!list.length) return ''; return '<section class="domain-plan"><h3>' + esc(row.domain) + '</h3><p><b>البنود غير المجتازة المسجلة:</b></p><ol>' + list.map(function (item) { return '<li>' + esc(item.text) + '</li>'; }).join('') + '</ol></section>'; }).join('') || '<p>لم تُسجّل بنود بدرجة «لم يجتز» حتى الآن.</p>';
  var plan = result.domains.filter(function (row) { return row.pct <= 85 || (failed[row.domain] || []).length; }).map(function (row) { var l = level(row), targets = (failed[row.domain] || []).slice(0, 5); var goal = targets.length ? targets.map(function (item) { return item.text; }).join('، ') : 'تعميم المهارات المكتسبة والمحافظة على الأداء.'; return '<tr><td>' + esc(row.domain) + '</td><td>' + esc(l.label) + '</td><td>' + esc(goal) + '</td><td>' + esc(l.frequency) + '</td><td>' + esc(l.method) + '</td></tr>'; }).join('') || '<tr><td colspan="5">يُوصى بالمتابعة الدورية والأنشطة الإثرائية.</td></tr>';
  var recommendations = result.domains.filter(function (row) { return row.pct <= 85 || (failed[row.domain] || []).length; }).map(function (row) { var advice = domainAdvice(row.domain); return '<tr><td>' + esc(row.domain) + '</td><td>' + esc(advice.parent) + '</td><td>' + esc(advice.specialist) + '</td></tr>'; }).join('') || '<tr><td colspan="3">الاستمرار في المتابعة الدورية وتعزيز نقاط القوة.</td></tr>';
  return { rows: rows, failedHtml: failedHtml, plan: plan, recommendations: recommendations, failed: failed };
}
function reportHtml(result) {
  var s = reportSections(result), chart = $("chart").toDataURL('image/png'), name = $("childName").value || 'الحالة', birth = $("birthDate").value || 'غير محدد', assess = $("assessmentDate").value || today(), rater = $("rater").value || 'غير محدد';
  return '<!doctype html><html dir="rtl"><head><meta charset="utf-8"><style>@page{size:A4;margin:1.4cm}body{font-family:Tahoma,Arial;direction:rtl;color:#172f3b;line-height:1.8;font-size:12pt}.cover{border:2px solid #1b718d;text-align:center;padding:28px 18px;background:#edf9fc}.cover h1{margin:0;color:#123247;font-size:27pt}.cover p{margin:5px}.section{margin-top:22px;page-break-inside:avoid}h2{font-size:18pt;color:#123247;background:#e5f6fa;border-right:6px solid #127ea7;padding:8px 12px;margin:0 0 10px}h3{font-size:15pt;color:#123247;margin:13px 0 4px}.meta,table{width:100%;border-collapse:collapse;margin:10px 0}.meta td,th,td{border:1px solid #bcdce6;padding:8px;text-align:right;vertical-align:top}.meta td:nth-child(odd){width:21%;font-weight:bold;background:#eef9fb}th{background:#1b718d;color:#fff;text-align:center}.summary{background:#f4fbfd;border:1px solid #c7e5ec;padding:12px;font-weight:bold}.chart{display:block;width:100%;max-width:680px;margin:10px auto}.domain-plan{border:1px solid #d2e7ed;padding:10px 14px;margin:10px 0;background:#fbfeff}.domain-plan h3{border-bottom:1px solid #d2e7ed;padding-bottom:5px}.footer{text-align:center;margin-top:25px;padding-top:10px;border-top:2px solid #127ea7;color:#56707c;font-size:10pt}</style></head><body><div class="cover"><h1>تقرير تقييم البورتاج النمائي</h1><p>نتائج التقييم وخطة العمل الفردية</p><p>تصميم وبرمجة مصطفى إبراهيم زويل - 01028057653</p></div><section class="section"><h2>بيانات الطفل</h2><table class="meta"><tr><td>اسم الطفل</td><td>' + esc(name) + '</td><td>القائم بالتقييم</td><td>' + esc(rater) + '</td></tr><tr><td>تاريخ الميلاد</td><td>' + esc(birth) + '</td><td>تاريخ التقييم</td><td>' + esc(assess) + '</td></tr><tr><td>العمر الزمني</td><td>' + result.ageMonths + ' شهر</td><td>تاريخ استخراج التقرير</td><td>' + new Date().toLocaleDateString('ar-EG') + '</td></tr></table></section><section class="section"><h2>النتيجة العامة</h2><div class="summary">العمر التطوري العام: ' + result.generalAge.toFixed(1) + ' شهر. النسبة التطورية العامة: ' + result.generalDQ.toFixed(1) + '%.<br>' + esc(summaryInterpretation(result.generalDQ)) + '</div></section><section class="section"><h2>نتائج المجالات</h2><table><thead><tr><th>المجال</th><th>العمر التطوري</th><th>النسبة التطورية</th><th>التقدير</th></tr></thead><tbody>' + s.rows + '</tbody></table></section><section class="section"><h2>الرسم البياني للأعمار التطورية</h2><img class="chart" src="' + chart + '"></section><section class="section"><h2>تحليل البنود غير المجتازة</h2>' + s.failedHtml + '</section><section class="section"><h2>الخطة العلاجية الفردية</h2><table><thead><tr><th>المجال</th><th>الأولوية</th><th>الأهداف التدريبية</th><th>وتيرة التنفيذ</th><th>طريقة التدريب</th></tr></thead><tbody>' + s.plan + '</tbody></table></section><section class="section"><h2>توصيات للوالدين والأخصائي</h2><table><thead><tr><th>المجال</th><th>توصيات لولي الأمر</th><th>توصيات للأخصائي</th></tr></thead><tbody>' + s.recommendations + '</tbody></table></section><section class="section"><h2>ضوابط التنفيذ والمتابعة</h2><div class="summary">تنفذ المهارات من الأسهل إلى الأصعب. يكرر التدريب في مواقف مختلفة مع تعزيز مباشر، وتقلل المساعدة تدريجياً. يقاس التقدم أسبوعياً وتراجع الخطة بعد 8 أسابيع أو عند إتقان الأهداف.</div></section><div class="footer">تم إنشاء هذا التقرير بواسطة برنامج بورتاج للتقييم النمائي<br>تصميم وبرمجة مصطفى إبراهيم زويل - 01028057653</div></body></html>';
}
function androidPayload(result) { var sections = reportSections(result); return { childName: $("childName").value || 'الحالة', birthDate: $("birthDate").value || 'غير محدد', assessmentDate: $("assessmentDate").value || today(), rater: $("rater").value || 'غير محدد', extractedAt: new Date().toLocaleDateString('ar-EG'), ageMonths: result.ageMonths, generalAge: result.generalAge, generalDQ: result.generalDQ, interpretation: summaryInterpretation(result.generalDQ), domains: result.domains.map(function (row) { var l = level(row); return { domain: row.domain, age: row.age, pct: row.pct, passed: row.passed, total: row.total, level: l.label, frequency: l.frequency, method: l.method, targets: (sections.failed[row.domain] || []).map(function (item) { return item.text; }), parentRecommendation: domainAdvice(row.domain).parent, specialistRecommendation: domainAdvice(row.domain).specialist }; }) }; }
function exportWord() { var result = render(), base = ($("childName").value || 'portage-report').replace(/[\\/:*?"<>|]/g, '_'); if (window.AndroidPortage && typeof window.AndroidPortage.saveReportData === 'function') { window.AndroidPortage.saveReportData(base + '.docx', JSON.stringify(androidPayload(result))); return; } var blob = new Blob(['\ufeff', reportHtml(result)], { type: 'application/msword;charset=utf-8' }), link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = base + '.doc'; document.body.appendChild(link); link.click(); link.remove(); setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000); }

$("assessmentDate").value = today();
$("ageSelectBtn").onclick = applyAgeSelection; $("calcBtn").onclick = render; $("saveBtn").onclick = save; $("openBtn").onclick = openCase; $("wordBtn").onclick = exportWord; $("printBtn").onclick = function () { render(); window.print(); }; $("resetBtn").onclick = resetCase;
$("themeBtn").onclick = function () { document.body.classList.toggle('dark'); };
$("passAllBtn").onclick = function () { itemsFor(state.domain, state.year).forEach(function (item) { state.scores[item.id] = 1; }); render(); };
$("clearYearBtn").onclick = function () { itemsFor(state.domain, state.year).forEach(function (item) { delete state.scores[item.id]; }); render(); };
$("birthDate").addEventListener('change', function () { updateAge(); render(); }); $("assessmentDate").addEventListener('change', function () { updateAge(); render(); });
document.addEventListener('click', function (event) { var domainButton = event.target.closest('[data-domain]'), yearButton = event.target.closest('[data-year]'), scoreButton = event.target.closest('[data-score]'); if (domainButton) { state.domain = Number(domainButton.dataset.domain); render(); return; } if (yearButton) { state.year = Number(yearButton.dataset.year); render(); return; } if (scoreButton) { var row = scoreButton.closest('[data-item]'); if (row) scoreItem(row.dataset.item, Number(scoreButton.dataset.score)); } });
updateAge(); render();
