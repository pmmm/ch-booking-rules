/* CH Booking Rules – Frontend
 * Lê config de CH_BOOKING_CFG (passada via wp_localize_script no PHP)
 * - valida datas (passado, out>in)
 * - calcula nº de noites
 * - aplica mínimos por época e por promoção
 * - mostra mensagens localizadas (CFG.texts)
 * - calcula total com base em CFG.prices e promo code
 */
;(function ($, w, d) {
  'use strict';

  // --------- CONFIG ---------
  var CFG = w.CH_BOOKING_CFG || {};
  var FID = Number(CFG.form_id || 3);

  // map dos names (permite renomear no FluentForms)
  var F = $.extend({
    check_in:       'check_in',
    check_out:      'check_out',
    nights:         'nights_number',
    total:          'total',
    accommodation:  'accommodation',
    promo_code:     'promo_code'
  }, (CFG.fields || {}));

  var TXT = $.extend({
    label_daily:      'Preço por noite: {{PRICE}} €',
    hint_normal:      'Estadia mínima de {{MIN}} noites.',
    hint_promo:       'Promoção ativa: {{NAME}} ({{DISCOUNT}}). Noites mínimas: {{MIN}}.',
    hint_promo_code:  'Código promocional aplicado: {{NAME}} ({{DISCOUNT}}). Noites mínimas: {{MIN}}.',
    err_past_date:    'Não pode selecionar datas anteriores à data de hoje.',
    err_out_before_in:'A data de saída deve ser posterior à data de chegada.',
    err_min_nights:   'Esta reserva requer um mínimo de {{MIN}} noite(s) para as datas escolhidas.'
  }, (CFG.texts || {}));

  var ENFORCE_TODAY = CFG.enforceTodayMin !== false;
  var RESET_ON_IN   = CFG.resetCheckoutOnCheckinChange !== false;

  var SEASONS = Array.isArray(CFG.seasons) ? CFG.seasons : [];
  var PROMOS  = Array.isArray(CFG.promos)  ? CFG.promos  : [];
  var PRICES  = CFG.prices || {}; // { "Carvalha Serra":160, ... }

  // --------- HELPERS ---------
  function formSel() { return '#fluentform_' + FID; }
  function $form()   { return $(formSel()); }
  function $byName(n){ return $form().find('[name="'+ n +'"]'); }

  function tpl(str, obj){
    return String(str).replace(/\{\{(\w+)\}\}/g, function(_, k){ return (obj && obj[k] != null) ? obj[k] : ''; });
  }

  function dOnly(dt){ return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()); }

  // aceita DD/MM/YYYY, DD-MM-YYYY e YYYY-MM-DD
  function parseDate(s){
    if(!s) return null;
    s = String(s).trim();
    var m;
    if (m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)) {
      var y = +m[1], mo = +m[2]-1, d = +m[3];
      var dt = new Date(y, mo, d);
      if (dt.getFullYear()===y && dt.getMonth()===mo && dt.getDate()===d) return dt;
      return null;
    }
    if (m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/)) {
      var d2 = +m[1], mo2 = +m[2]-1, y2 = +m[3];
      var dt2 = new Date(y2, mo2, d2);
      if (dt2.getFullYear()===y2 && dt2.getMonth()===mo2 && dt2.getDate()===d2) return dt2;
      return null;
    }
    return null;
  }

  function nightsBetween(a,b){
    var MS = 24*60*60*1000;
    return Math.round( (dOnly(b)-dOnly(a))/MS );
  }

  function fmtDiscount(o){
    if(!o || typeof o!=='object') return '';
    if(o.type==='percent') return o.value + '%';
    if(o.type==='fixed')   return (o.value||0) + '€';
    return '';
  }

  // checa se uma data (M/D ignorando ano) está num intervalo de época
  // season: {from:'MM-DD', to:'MM-DD', minNights: X}
  function dateInSeason(date, season){
    if(!season || !season.from || !season.to) return false;
    var y = date.getFullYear();
    var from = new Date(y, (+season.from.split('-')[0])-1, +season.from.split('-')[1]);
    var to   = new Date(y, (+season.to.split('-')[0])-1,   +season.to.split('-')[1]);

    // intervalos que atravessam o ano (ex.: 10-01 a 03-31)
    if (to < from) {
      // pertence se >= from (no ano Y) ou <= to (no ano Y+1)
      var toNext = new Date(y+1, to.getMonth(), to.getDate());
      return (dOnly(date) >= dOnly(from)) || (dOnly(date) <= dOnly(toNext));
    }
    return dOnly(date) >= dOnly(from) && dOnly(date) <= dOnly(to);
  }

  // devolve o mínimo de noites exigido para um intervalo (considera cada noite)
  function minNightsForStay(checkIn, checkOut){
    if (!SEASONS.length) return 1;
    var min = 1, n = nightsBetween(checkIn, checkOut);
    for (var i=0;i<n;i++){
      var d = new Date(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate()+i);
      SEASONS.forEach(function(s){
        if (dateInSeason(d, s) && s.minNights){
          min = Math.max(min, Number(s.minNights));
        }
      });
    }
    return min;
  }

  // acha uma promo ativa para o intervalo e/ou por código
  function findActivePromo(checkIn, checkOut, code){
    var active = null;
    var spanNights = nightsBetween(checkIn, checkOut);

    PROMOS.forEach(function(p){
      // datas são MM-DD; uma promo é válida se QUALQUER dia da estadia cair no intervalo
      var matchAny = false;
      for (var i=0;i<spanNights;i++){
        var d = new Date(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate()+i);
        if (dateInSeason(d, {from:p.from, to:p.to})) { matchAny = true; break; }
      }
      if (!matchAny) return;

      // se for promo por código, matcha código
      if (p.code && code && String(code).trim().toUpperCase() === String(p.code).trim().toUpperCase()) {
        if (!active || (p.priority||0) > (active.priority||0)) active = p;
        return;
      }
      // se não exigir código, pode ser promo “aberta”
      if (!p.code) {
        if (!active || (p.priority||0) > (active.priority||0)) active = p;
      }
    });
    return active;
  }

  function showError($el, msg){
    clearError($el);
    var $h = $('<div class="chbr-field-error" />').text(msg);
    $el.attr('aria-invalid','true').addClass('ff-el-is-error');
    $el.closest('.ff-el-form-control, .ff-el-group').append($h);
  }
  function clearError($el){
    $el.attr('aria-invalid','false').removeClass('ff-el-is-error');
    $el.closest('.ff-el-form-control, .ff-el-group').find('.chbr-field-error').remove();
  }

  function getAccomName(){
    var $a = $byName(F.accommodation);
    if(!$a.length) return null;
    // select/radio/text
    if ($a.is('select')) return $a.find('option:selected').text().trim() || $a.val();
    if ($a.is(':radio')) return $a.filter(':checked').val();
    return $a.val();
  }

  function pricePerNight(){
    var name = getAccomName();
    if(!name) return 0;
    var p = PRICES[name];
    return Number(p || 0);
  }

  function renderDailyRate(){
    var price = pricePerNight();
    var $a = $byName(F.accommodation);
    if(!$a.length) return;

    // container alvo
    var $wrap = $a.closest('.ff-el-form-control, .ff-el-group');
    $wrap.find('.chbr-daily-rate').remove();

    if (price > 0 && TXT.label_daily){
      var $lbl = $('<div class="chbr-daily-rate" />').text(
        tpl(TXT.label_daily, {PRICE: price})
      );
      $wrap.append($lbl);
    }
  }

  function computeAndValidate(){
    var $in  = $byName(F.check_in);
    var $out = $byName(F.check_out);
    var $n   = $byName(F.nights);
    var $tot = $byName(F.total);
    var $code= $byName(F.promo_code);

    // limpar
    clearError($in); clearError($out);

    var din  = parseDate($in.val());
    var dout = parseDate($out.val());
    var today = dOnly(new Date());

    if (ENFORCE_TODAY) {
      if (din && dOnly(din) < today) showError($in, TXT.err_past_date);
      if (dout && dOnly(dout) < today) showError($out, TXT.err_past_date);
    }

    if (din && dout && dout <= din) {
      showError($out, TXT.err_out_before_in);
    }

    var nights = (din && dout) ? nightsBetween(din, dout) : 0;
    if ($n.length && nights>=0) $n.val(nights);

    // mínimos por época/promo
    if (din && dout && nights > 0) {
      var minSeason = minNightsForStay(din, dout);
      var promo = findActivePromo(din, dout, $code.val());

      var minRequired = minSeason;
      var hintTxt = tpl(TXT.hint_normal, {MIN:minSeason});

      if (promo && promo.minNights) {
        minRequired = Math.max(minSeason, Number(promo.minNights));
        var disc = fmtDiscount(promo.discount);
        hintTxt = promo.code
          ? tpl(TXT.hint_promo_code, {NAME: promo.name || '', DISCOUNT: disc, MIN:minRequired})
          : tpl(TXT.hint_promo,      {NAME: promo.name || '', DISCOUNT: disc, MIN:minRequired});
      }

      // mostra/atualiza hint junto ao check-out
      var $wrap = $out.closest('.ff-el-form-control, .ff-el-group');
      $wrap.find('.chbr-minnights-hint').remove();
      $('<div class="chbr-minnights-hint" />').text(hintTxt).appendTo($wrap);

      if (nights < minRequired){
        showError($out, tpl(TXT.err_min_nights, {MIN:minRequired}));
      }

      // total: pricePerNight * nights, aplicando promo (se for percent/fixed)
      var pNight = pricePerNight();
      var subtotal = pNight * nights;
      var total = subtotal;

      if (promo && promo.discount){
        if (promo.discount.type === 'percent'){
          total = Math.max(0, subtotal * (1 - (Number(promo.discount.value||0)/100)));
        } else if (promo.discount.type === 'fixed'){
          total = Math.max(0, subtotal - Number(promo.discount.value||0));
        }
      }

      if ($tot.length){
        // garantir 2 casas decimais se for numérico
        var val = isFinite(total) ? (Math.round(total*100)/100).toFixed(2) : total;
        $tot.val(val);
      }
    } else {
      // sem datas válidas remove hint
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

  function bind(){
    var $f = $form();
    if (!$f.length) return;

    // render preço por noite ao entrar e quando muda alojamento
    renderDailyRate();
    $f.on('change', '[name="'+F.accommodation+'"]', function(){
      renderDailyRate();
      computeAndValidate();
    });

    // reagir a mudanças de datas e promo code
    $f.on('change blur', '[name="'+F.check_in+'"], [name="'+F.check_out+'"], [name="'+F.promo_code+'"]', function(e){
      if (RESET_ON_IN && e && e.target && $(e.target).attr('name')===F.check_in){
        // se mudou check-in e houver check-out preenchido, limpa para forçar reescolha válida
        var $out = $byName(F.check_out);
        if ($out.val()) { $out.val(''); $form().find('.chbr-minnights-hint').remove(); }
      }
      computeAndValidate();
    });

    // ao submeter, bloqueia se houver erros
    $f.on('submit', preventIfErrors);

    // 1ª validação
    computeAndValidate();
  }

  $(bind);

})(jQuery, window, document);
