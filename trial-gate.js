(function () {
  var startKey = 'zewail_portage_trial_started_at';
  var lastKey = 'zewail_portage_trial_last_seen_at';
  var duration = 24 * 60 * 60 * 1000;
  var now = Date.now();
  var start = Number(localStorage.getItem(startKey) || 0);
  var lastSeen = Number(localStorage.getItem(lastKey) || 0);
  var expired = start && (now < lastSeen || now - start >= duration);

  if (!start) {
    localStorage.setItem(startKey, String(now));
    localStorage.setItem(lastKey, String(now));
  } else if (!expired) {
    localStorage.setItem(lastKey, String(now));
  }

  window.PORTAGE_TRIAL_EXPIRED = Boolean(expired);
  if (expired) {
    document.addEventListener('DOMContentLoaded', function () {
      document.body.innerHTML = '<main style="min-height:100vh;display:grid;place-items:center;padding:24px;background:#f4fafc;font-family:Tahoma,Arial,sans-serif;direction:rtl;color:#123247"><section style="max-width:520px;background:#fff;border:1px solid #cfe5ed;border-radius:12px;padding:34px;text-align:center;box-shadow:0 10px 26px rgba(18,50,71,.08)"><div style="font-size:44px">⌛</div><h1 style="margin:10px 0;font-size:26px">انتهت النسخة التجريبية</h1><p style="line-height:1.9;color:#5d7480">انتهت مدة التجربة البالغة 24 ساعة. يرجى التواصل للحصول على النسخة الكاملة من برنامج بورتاج.</p><p style="font-weight:bold">مصطفى إبراهيم زويل - 01028057653</p></section></main>';
    });
  }
}());
