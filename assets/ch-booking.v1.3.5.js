;(function ($, w, d) {
  'use strict';

  // Config vindas do PHP (wp_localize_script)
  var CFG = w.CH_BOOKING_CFG || {};
  var FORM_ID = CFG.form_id || 3;
  var MIN_NIGHTS = Number(CFG.min_nights || 1);
  var MAX_NIGHTS = Number(CFG.max_nights || 365);

  // Mapeia names dos campos (ajusta se usares outros names)
  var N = {
    check_in:  'check_in',
    check_out: 'check_out',
    nights:    'nights_number',
    total:     'total',
    accom:     'accommodation',
    code:      'promo_code'
  };

  function formSel() { return '#fluentform_' + FORM_ID; }
  function $f() { return $(formSel()); }
  function byName(n) { return $f().find('[name="'+ n +'"]'); }

  function dOnly(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function parseDMY(s) {
    // aceita DD/MM/YYYY ou DD-MM-YYYY
    if (!s) return null;
    var m = String(s).trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (!m) return null;
    var d = parseInt(m[1], 10), mo = parseInt(m[2], 10)-1, y = parseInt(m[3], 10);
    var dt = new Date(y, mo, d);
    // valida datas impossíveis (31/02, etc.)
    if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null;
    return dt;
  }

  function nightsBetween(a, b) {
    var MS = 24*60*60*1000;
    return Math.round( (dOnly(b) - dOnly(a)) / MS );
  }

  function showError($el, msg) {
    clearError($el);
    var $hint = $('<div class="chbr-field-error" />').text(msg);
    $el.attr('aria-invalid', 'true').addClass('ff-el-is-error');
    $el.closest('.ff-el-form-control').append($hint);
  }

  function clearError($el) {
    $el.attr('aria-invalid', 'false').removeClass('ff-el-is-error');
    $el.closest('.ff-el-form-control').find('.chbr-field-error').remove();
  }

  function validateAndCompute() {
    var $in  = byName(N.check_in);
    var $out = byName(N.check_out);
    var $n   = byName(N.nights);

    // limpa erros
    clearError($in); clearError($out);

    var din  = parseDMY($in.val());
    var dout = parseDMY($out.val());
    var today = dOnly(new Date());

    if (din) {
      if (dOnly(din) < today) {
        showError($in, 'A data de check-in não pode ser no passado.');
      }
    }

    if (dout) {
      if (dOnly(dout) < today) {
        showError($out, 'A data de check-out não pode ser no passado.');
      }
    }

    if (din && dout) {
      if (dout <= din) {
        showError($out, 'O check-out deve ser após o check-in.');
      } else {
        var nNights = nightsBetween(din, dout);
        if ($n.length) $n.val(nNights);

        if (nNights < MIN_NIGHTS) {
          showError($out, 'Estadia mínima: ' + MIN_NIGHTS + ' noite(s).');
        } else if (nNights > MAX_NIGHTS) {
          showError($out, 'Estadia máxima: ' + MAX_NIGHTS + ' noite(s).');
        }
      }
    }
  }

  function preventIfErrors(e) {
    // se existir algum .chbr-field-error, bloqueia submissão
    if ($f().find('.chbr-field-error').length) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return false;
    }
    // Valida antes de submeter (caso o utilizador nunca tenha focado os campos)
    validateAndCompute();
    if ($f().find('.chbr-field-error').length) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return false;
    }
    return true;
  }

  function bindHandlers() {
    var f = $f();
    if (!f.length) return;

    // revalida quando o utilizador altera datas
    f.on('change blur', '[name="'+N.check_in+'"], [name="'+N.check_out+'"]', function(){
      validateAndCompute();
    });

    // interseta submit do FluentForms
    f.on('submit', function(e){ preventIfErrors(e); });

    // primeira validação ao carregar (caso haja valores pré-preenchidos)
    validateAndCompute();
  }

  $(bindHandlers);

})(jQuery, window, document);
