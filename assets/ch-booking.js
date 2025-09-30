/* CH Booking Rules – Frontend (v1.3.8)
 * Lê config de CH_BOOKING_CFG (passada via wp_localize_script no PHP).
 * - valida datas (passado, out>in)
 * - calcula nº de noites
 * - mínimos por época e por promoção
 * - preço por noite por alojamento + cálculo do total (aceita label OU value)
 * - textos configuráveis
 * - força minDate=today no(s) datepicker(s) + min do check-out >= check-in+1
 */
;(function ($, w, d) {
  'use strict';

  /* ───────────── CONFIG ───────────── */
  var CFG = w.CH_BOOKING_CFG || {};
  var FID = Number(CFG.form_id || 3);

  // mapeamento de names do FluentForms (podes mudar em Settings > Booking Rules)
  var F = $.extend({
    check_in:       'check_in',
    check_out:      'check_out',
    nights:         'nights_number',
    total:          'total',
    accommodation:  'accommodation',
    promo_code:     'promo_code'
  }, (CFG.fields || {}));

  // textos com placeholders {{MIN}}, {{PRICE}}, {{NAME}}, {{DISCOUNT}}
  var TXT = $.extend({
    label_daily:       'Preço por noite: {{PRICE}} €',
    hint_normal:       'Estadia mínima de {{MIN}} noites.',
    hint_promo:        'Promoção ativa: {{NAME}} ({{DISCOUNT}}). Noites mínimas: {{MIN}}.',
    hint_promo_code:   'Código promocional aplicado: {{NAME}} ({{DISCOUNT}}). Noites mínimas: {{MIN}}.',
    err_past_date:     'Não pode selecionar datas anteriores à data de hoje.',
    err_out_before_in: 'A data de saída deve ser posterior à data de chegada.',
    err_min_nights:    'Esta reserva requer um mínimo de {{MIN}} noite(s) para as datas escolhidas.'
  }, (CFG.texts || {}));

  var ENFORCE_TODAY = CFG.enforceTodayMin !== false;
  var RESET_ON_IN   = CFG.resetCheckoutOnCheckinChange !== false;

  var SEASONS = Array.isArray(CFG.seasons) ? CFG.seasons : [];
  var PROMOS  = Array.isArray(CFG.promos)  ? CFG.promos  : [];
  var PRICES  = CFG.prices || {}; // {"Carvalha Serra":160, ...}

  /* ───────────── HELPERS ───────────── */
  function formSel(){ return '#fluentform_' + FID; }
  function $form(){ return $(formSel()); }
  function $byName(n){ return $form().find('[name="'+ n +'"]'); }

  function tpl(str, obj){
    return String(str).replace(/\{\{(\w+)\}\}/g, function(_, k){ return (obj && obj[k] != null) ? obj[k] : ''; });
  }
  function dOnly(dt){ return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()); }

  // Parser tolerante: YYYY-MM-DD | DD/MM/YYYY | DD-MM-YYYY | DD.MM.YYYY | DD/MM/YY
  function parseDate(s){
    if(!s) return null;
    s = String(s).trim();
    var m;
    if (m = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/)) {       // 2025-10-01
      var y = +m[1], mo = +m[2]-1, d = +m[3]; var dt = new Date(y, mo, d);
      return (dt.getFullYear()===y && dt.getMonth()===mo && dt.getDate()===d) ? dt : null;
    }
    if (m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/)) { // 01/10/2025, 01-10-2025, 01.10.2025
      var d2 = +m[1], mo2 = +m[2]-1, y2 = +m[3]; var dt2 = new Date(y2, mo2, d2);
      return (dt2.getFullYear()===y2 && dt2.getMonth()===mo2 && dt2.getDate()===d2) ? dt2 : null;
    }
    if (m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/)) { // 01/10/25 -> 2025
      var d3 = +m[1], mo3 = +m[2]-1, y3 = 2000 + (+m[3]); var dt3 = new Date(y3, mo3, d3);
      return (dt3.getFullYear()===y3 && dt3.getMonth()===mo3 && dt3.getDate()===d3) ? dt3 : null;
    }
    return null;
  }

  function nightsBetween(a,b){ return Math.round((dOnly(b)-dOnly(a))/(24*60*60*1000)); }

  function fmtDiscount(o){
    if(!o || typeof o!=='object') return '';
    if(o.type==='percent') return o.value + '%';
    if(o.type==='fixed')   return (o.value||0) + '€';
    return '';
  }

  function dateInSeason(date, season){
    if(!season || !season.from || !season.to) return false;
    var y = date.getFullYear();
    var f = season.from.split('-'), t = season.to.split('-');
    var from = new Date(y, +f[0]-1, +f[1]);
    var to   = new Date(y, +t[0]-1, +t[1]);
    if (to < from) { // atravessa o ano
      var toNext = new Date(y+1, to.getMonth(), to.getDate());
      return (dOnly(date) >= dOnly(from)) || (dOnly(date) <= dOnly(toNext));
    }
    return dOnly(date) >= dOnly(from) && dOnly(date) <= dOnly(to);
  }

  function minNightsForStay(checkIn, checkOut){
    if (!SEASONS.length) return 1;
    var min = 1, n = nightsBetween(checkIn, checkOut);
    for (var i=0;i<n;i++){
      var d = new Date(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate()+i);
      SEASONS.forEach(function(s){
        if (dateInSeason(d, s) && s.minNights) min = Math.max(min, Number(s.minNights));
      });
    }
    return min;
  }

  function findActivePromo(checkIn, checkOut, code){
    var active = null, span = nightsBetween(checkIn, checkOut);
    PROMOS.forEach(function(p){
      var matchAny = false;
      for (var i=0;i<span;i++){
        var d = new Date(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate()+i);
        if (dateInSeason(d, {from:p.from, to:p.to})) { matchAny = true; break; }
      }
      if (!matchAny) return;
      if (p.code && code && String(code).trim().toUpperCase() === String(p.code).trim().toUpperCase()){
        if (!active || (p.priority||0) > (active.priority||0)) active = p;
        return;
      }
      if (!p.code){
        if (!active || (p.priority||0) > (active.priority||0)) active = p;
      }
    });
    return active;
  }

  /* ── PRICE / ACCOM (aceita label OU value) ── */
  function getAccomKey(){
    var $a = $byName(F.accommodation);
    if(!$a.length) return null;

    if ($a.is('select')) {
      var txt = $a.find('option:selected').text().trim();
      var val = $a.val();
      if (PRICES.hasOwnProperty(txt)) return txt;
      return val;
    }
    var $r = $a.filter(':radio');
    if ($r.length){
      var $c   = $r.filter(':checked');
      var val  = $c.val();
      var lbl  = $c.closest('label').text().trim();
      if (lbl && PRICES.hasOwnProperty(lbl)) return lbl;
      return val;
    }
    return $a.val();
  }
  function pricePerNight(){
    var key = getAccomKey();
    var p = PRICES[key];
    return Number(p || 0);
  }
  function renderDailyRate(){
    var price = pricePerNight();
    var $a = $byName(F.accommodation);
    if(!$a.length) return;
    var $wrap = $a.closest('.ff-el-form-control, .ff-el-group');
    $wrap.find('.chbr-daily-rate').remove();
    if (price > 0 && TXT.label_daily){
      $('<div class="chbr-daily-rate" />')
        .text(tpl(TXT.label_daily, {PRICE: price}))
        .appendTo($wrap);
    }
  }

  /* ── Datepicker mins (nativo / flatpickr / pikaday) ── */
  function applyDatepickerMins(){
    var $in  = $byName(F.check_in);
    var $out = $byName(F.check_out);
    if (!$in.length || !$out.length) return;

    var today = new Date();
    var isoToday = today.toISOString().slice(0,10); // YYYY-MM-DD
    $in.attr('min', isoToday);
    $out.attr('min', isoToday);

    try { if ($in[0]  && $in[0]._flatpickr)  $in[0]._flatpickr.set('minDate', today); } catch(e){}
    try { if ($out[0] && $out[0]._flatpickr) $out[0]._flatpickr.set('minDate', today); } catch(e){}
    try { if ($in[0]  && $in[0]._pikaday && $in[0]._pikaday.setMinDate)  $in[0]._pikaday.setMinDate(today); } catch(e){}
    try { if ($out[0] && $out[0]._pikaday && $out[0]._pikaday.setMinDate) $out[0]._pikaday.setMinDate(today); } catch(e){}

    $form().on('change', '[name="'+F.check_in+'"]', function(){
      var din = parseDate($in.val());
      if (!din) return;
      var minOut = new Date(din.getFullYear(), din.getMonth(), din.getDate()+1);
      var iso    = minOut.toISOString().slice(0,10);
      $out.attr('min', iso);
      try { if ($out[0] && $out[0]._flatpickr) $out[0]._flatpickr.set('minDate', minOut); } catch(e){}
      try { if ($out[0] && $out[0]._pikaday && $out[0]._pikaday.setMinDate) $out[0]._pikaday.setMinDate(minOut); } catch(e){}
    });
  }

  /* ───────────── VALIDATE & COMPUTE ───────────── */
  function showError($el, msg){
    clearError($el);
    $('<div class="chbr-field-error" />').text(msg)
      .appendTo($el.closest('.ff-el-form-control, .ff-el-group'));
    $el.attr('aria-invalid','true').addClass('ff-el-is-error');
  }
  function clearError($el){
    $el.attr('aria-invalid','false').removeClass('ff-el-is-error');
    $el.closest('.ff-el-form-control, .ff-el-group').find('.chbr-field-error').remove();
  }

  function computeAndValidate(){
    var $in  = $byName(F.check_in);
    var $out = $byName(F.check_out);
    var $n   = $byName(F.nights);
    var $tot = $byName(F.total);
    var $code= $byName(F.promo_code);

    clearError($in); clearError($out);

    var din  = parseDate($in.val());
    var dout = parseDate($out.val());
    var today = dOnly(new Date());

    if (ENFORCE_TODAY) {
      if (din  && dOnly(din)  < today) showError($in,  TXT.err_past_date);
      if (dout && dOnly(dout) < today) showError($out, TXT.err_past_date);
    }
    if (din && dout && dout <= din) showError($out, TXT.err_out_before_in);

    var nights = (din && dout) ? nightsBetween(din, dout) : 0;
    if ($n.length && nights>=0) $n.val(nights);

    if (din && dout && nights > 0) {
      var minSeason   = minNightsForStay(din, dout);
      var promo       = findActivePromo(din, dout, $code.val());
      var minRequired = minSeason;
      var hintTxt     = tpl(TXT.hint_normal, {MIN:minSeason});

      if (promo && promo.minNights) {
        minRequired = Math.max(minSeason, Number(promo.minNights));
        var disc = fmtDiscount(promo.discount);
        hintTxt = promo.code
          ? tpl(TXT.hint_promo_code, {NAME: promo.name||'', DISCOUNT: disc, MIN:minRequired})
          : tpl(TXT.hint_promo,      {NAME: promo.name||'', DISCOUNT: disc, MIN:minRequired});
      }

      var $wrapOut = $out.closest('.ff-el-form-control, .ff-el-group');
      $wrapOut.find('.chbr-minnights-hint').remove();
      $('<div class="chbr-minnights-hint" />').text(hintTxt).appendTo($wrapOut);

      if (nights < minRequired) showError($out, tpl(TXT.err_min_nights, {MIN:minRequired}));

      // total
      var pNight   = pricePerNight();
      var subtotal = pNight * nights;
      var total    = subtotal;

      if (promo && promo.discount){
        if (promo.discount.type === 'percent'){
          total = Math.max(0, subtotal * (1 - (Number(promo.discount.value||0)/100)));
        } else if (promo.discount.type === 'fixed'){
          total = Math.max(0, subtotal - Number(promo.discount.value||0));
        }
      }
      if ($tot.length){
        var val = isFinite(total) ? (Math.round(total*100)/100).toFixed(2) : total;
        $tot.val(val);
      }
    } else {
      $form().find('.chbr-minnights-hint').remove();
    }
  }

  function preventIfErrors(e){
    if ($form().find('.chbr-field-error').length){
      e.preventDefault(); e.stopImmediatePropagation(); return false;
    }
    computeAndValidate();
    if ($form().find('.chbr-field-error').length){
      e.preventDefault(); e.stopImmediatePropagation(); return false;
    }
    return true;
  }

  /* ───────────── INIT / BIND ───────────── */
  function bind(){
    var $f = $form();
    if (!$f.length) return;

    applyDatepickerMins();    // bloqueia datas passadas e ajusta min do check-out
    renderDailyRate();

    $f.on('change', '[name="'+F.accommodation+'"]', function(){
      renderDailyRate();
      computeAndValidate();
    });

    $f.on('change blur', '[name="'+F.check_in+'"], [name="'+F.check_out+'"], [name="'+F.promo_code+'"]', function(e){
      if (RESET_ON_IN && e && e.target && $(e.target).attr('name')===F.check_in){
        var $out = $byName(F.check_out);
        if ($out.val()) { $out.val(''); $form().find('.chbr-minnights-hint').remove(); }
      }
      computeAndValidate();
    });

    $f.on('submit', preventIfErrors);

    // primeira validação
    computeAndValidate();
  }

  $(bind);

})(jQuery, window, document);
