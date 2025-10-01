jQuery(function($){
  var CFG = window.CH_BOOKING_CFG || {};
  var F = CFG.fields || {};
  var formSel = '#fluentform_' + (CFG.form_id || 3);
  var $form = $(formSel);
  if(!$form.length) return;

  function parseDMY(s){
    if(!s) return null;
    var m = String(s).trim().match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/); 
    if(!m) return null;
    return new Date(m[3].length==2?('20'+m[3]):m[3], m[2]-1, m[1]); 
  }

  function daysBetween(d1,d2){ return Math.round((d2-d1)/(1000*60*60*24)); }

  var $checkIn = $form.find('[name="'+F.check_in+'"]');
  var $checkOut = $form.find('[name="'+F.check_out+'"]');
  var $promoCode = $form.find('[name="'+F.promo_code+'"]'); 
  
  var $promoCodeGroup = $promoCode.closest('.ff-el-group');
  if (!$('#chbr-promo-success').length) { $promoCodeGroup.after('<div id="chbr-promo-success"></div>'); }
  var $promoSuccessMsg = $('#chbr-promo-success');

  if (!$('#chbr-promo-error').length) { $promoCodeGroup.after('<div id="chbr-promo-error"></div>'); }
  var $promoErrorMsg = $('#chbr-promo-error');
  
  if (!$('#chbr-minnights-error').length) { $checkOut.closest('.ff-el-group').after('<div id="chbr-minnights-error" class="ff-error-message"></div>'); }
  var $minNightsErrorMsg = $('#chbr-minnights-error');

  function update(){
    var ci = parseDMY($checkIn.val());
    var co = parseDMY($checkOut.val());
    
    // Atualiza dinamicamente o minDate do check-out via jQuery UI API
    if (ci) {
        var min_co_date = new Date(ci);
        min_co_date.setDate(ci.getDate() + 1);
        // Usa o método do datepicker para definir a opção, mesmo que não o tenhamos inicializado
        $checkOut.datepicker('option', 'minDate', min_co_date);
        if (co && co <= ci) {
             if(CFG.resetCheckoutOnCheckinChange){ 
                $checkOut.val('');
                co = null; 
             }
        }
    } else {
        // Se o check-in for limpo, o check-out volta a ter o mínimo definido pelo Fluent Forms (hoje)
        $checkOut.datepicker('option', 'minDate', 0);
    }

    var nights = ci && co && co > ci ? daysBetween(ci,co) : 0;
    var promoCodeValue = $promoCode.val().trim().toUpperCase(); 
    var activePromo = null; 
    var dailyRate = 0;
    var total = 0;
    var promoApplied = false;
    var minNightsRequired = 1;

    var accom = $form.find('[name="'+F.accommodation+'"]:checked').val() || ''; 
    dailyRate = CFG.prices && CFG.prices[accom] ? CFG.prices[accom] : 0;
    
    total = nights * dailyRate;

    if (ci && CFG.seasons && CFG.seasons.length) {
        var checkInMonthDay = (ci.getMonth() + 1).toString().padStart(2, '0') + '-' + ci.getDate().toString().padStart(2, '0');
        CFG.seasons.forEach(function(season){
            var min = parseInt(season.minNights || 1);
            var from = season.from;
            var to = season.to;
            if (from > to) { 
                if (checkInMonthDay >= from || checkInMonthDay <= to) { if (min > minNightsRequired) minNightsRequired = min; }
            } else {
                if (checkInMonthDay >= from && checkInMonthDay <= to) { if (min > minNightsRequired) minNightsRequired = min; }
            }
        });
    }

    if (promoCodeValue && dailyRate > 0 && nights > 0 && CFG.promos && CFG.promos.length) {
        CFG.promos.forEach(function(promo){
            if(promo.code && promo.code.toUpperCase() === promoCodeValue) {
                var minNightsReqPromo = parseInt(promo.minNights || 1);
                if (nights >= minNightsReqPromo) { activePromo = promo; }
            }
        });
        if (activePromo) {
            var discountValue = parseFloat(activePromo.discount.value);
            if (activePromo.discount.type === 'percent') {
                total = total * (1 - discountValue / 100);
            } else if (activePromo.discount.type === 'fixed') {
                total = Math.max(0, total - discountValue); 
            }
            promoApplied = true;
        }
    }

    var nightsValid = (nights === 0 || nights >= minNightsRequired);
    if (!nightsValid) {
        total = 0;
        var msg = CFG.texts.err_min_nights.replace('{{MIN}}', minNightsRequired);
        $minNightsErrorMsg.text(msg).show();
    } else {
        $minNightsErrorMsg.hide().text('');
    }

    if (promoApplied) {
        $promoSuccessMsg.text(CFG.texts.hint_promo_code.replace('{{NAME}}', activePromo.name).replace('{{DISCOUNT}}', activePromo.discount.value + (activePromo.discount.type === 'percent' ? '%' : '€')).replace('{{MIN}}', activePromo.minNights)).show();
        $promoErrorMsg.hide().text('');
    } else if (promoCodeValue) {
        $promoErrorMsg.text('O código promocional é inválido ou não cumpre as noites mínimas.').show();
        $promoSuccessMsg.hide().text('');
    } else {
        $promoSuccessMsg.hide().text('');
        $promoErrorMsg.hide().text('');
    }

    var $nightsField = $form.find('[name="'+F.nights+'"]');
    var $totalField = $form.find('[name="'+F.total+'"]');
    
    if (nights > 0 && nightsValid) {
        $nightsField.val(nights);
        $totalField.val(total.toFixed(2));
    } else {
        $nightsField.val('');
        if (accom && dailyRate > 0) {
            $totalField.val(dailyRate.toFixed(2));
        } else {
            $totalField.val('0.00');
        }
    }
  }
  
  // O nosso script já não inicializa o datepicker, apenas reage a ele.
  // Isto torna o código mais seguro e compatível.
  
  $form.find('[name="'+F.total+'"]').attr('readonly', 'readonly'); 
  
  // Detetores de Eventos
  $checkIn.on('change', update);
  $checkOut.on('change', update);
  $form.find('[name="'+F.accommodation+'"]').on('click', update); 
  $promoCode.on('input', update);

  // Espera um instante para garantir que o datepicker do Fluent Forms foi inicializado antes da primeira execução
  setTimeout(update, 100);
});