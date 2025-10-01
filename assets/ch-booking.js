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

  var today_midnight = new Date();
  today_midnight.setHours(0, 0, 0, 0); 

  var $checkIn = $form.find('[name="'+F.check_in+'"]');
  var $checkOut = $form.find('[name="'+F.check_out+'"]');
  var $promoCode = $form.find('[name="'+F.promo_code+'"]'); 
  
  // --- INICIALIZAÇÃO DAS MENSAGENS ---
  
  // Mensagem de sucesso do código promocional
  var $promoCodeGroup = $promoCode.closest('.ff-el-group');
  if (!$('#chbr-promo-success').length) {
      $promoCodeGroup.after('<div id="chbr-promo-success"></div>');
  }
  var $promoSuccessMsg = $('#chbr-promo-success');

  // Mensagem de ERRO do código promocional (estava em falta)
  if (!$('#chbr-promo-error').length) {
      $promoCodeGroup.after('<div id="chbr-promo-error"></div>');
  }
  var $promoErrorMsg = $('#chbr-promo-error');
  
  // Mensagem de erro de noites mínimas
  if (!$('#chbr-minnights-error').length) {
      $checkOut.closest('.ff-el-group').after('<div id="chbr-minnights-error" class="ff-error-message"></div>');
  }
  var $minNightsErrorMsg = $('#chbr-minnights-error');


  function update(){
    var ci = parseDMY($checkIn.val());
    var co = parseDMY($checkOut.val());
    
    if (ci) {
        var min_co_date = new Date(ci);
        min_co_date.setDate(ci.getDate() + 1);

        $checkOut.datepicker('option', 'minDate', min_co_date);

        var nights_calc = daysBetween(ci, co);
        if (nights_calc <= 0 && co) { 
             if(CFG.resetCheckoutOnCheckinChange){ 
                $checkOut.val('');
                co = null; 
             }
        }
    } else {
        $checkOut.datepicker('option', 'minDate', today_midnight);
    }

    var nights = ci && co ? daysBetween(ci,co) : 0;
    
    var promoCodeValue = $promoCode.val().trim().toUpperCase(); 
    var activePromo = null; 
    var dailyRate = 0;
    var total = 0;
    var promoApplied = false;
    var minNightsRequired = 0;

    var accom = $form.find('[name="'+F.accommodation+'"]:checked').val() || ''; 
    dailyRate = CFG.prices && CFG.prices[accom] ? CFG.prices[accom] : 0;
    
    if (nights === 0 && dailyRate > 0 && accom) {
        total = dailyRate;
    } else {
        total = nights * dailyRate;
    }

    if (ci && CFG.seasons && CFG.seasons.length) {
        var checkInMonthDay = (ci.getMonth() + 1).toString().padStart(2, '0') + '-' + ci.getDate().toString().padStart(2, '0');

        CFG.seasons.forEach(function(season){
            var min = parseInt(season.minNights || 0);
            var from = season.from;
            var to = season.to;
            
            // Lógica de épocas que atravessam o ano (ex: Dezembro a Março)
            if (from > to) { 
                if (checkInMonthDay >= from || checkInMonthDay <= to) {
                    if (min > minNightsRequired) minNightsRequired = min;
                }
            } else {
                if (checkInMonthDay >= from && checkInMonthDay <= to) {
                    if (min > minNightsRequired) minNightsRequired = min;
                }
            }
        });
    }
    
    if (minNightsRequired < 1) { // Mínimo de 1 noite por defeito
        minNightsRequired = 1; 
    }

    if (promoCodeValue && dailyRate > 0 && nights > 0 && CFG.promos && CFG.promos.length) {
        CFG.promos.forEach(function(promo){
            if(promo.code && promo.code.toUpperCase() === promoCodeValue) {
                var minNightsReqPromo = parseInt(promo.minNights || 0);
                if (nights >= minNightsReqPromo) {
                    activePromo = promo;
                }
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

    var nightsValid = true;
    if (nights > 0 && nights < minNightsRequired) {
        total = 0;
        nightsValid = false;
    }
    
    if (!nightsValid && ci && co) {
        var msg = CFG.texts.err_min_nights.replace('{{MIN}}', minNightsRequired);
        $minNightsErrorMsg.text(msg).show();
    } else {
        $minNightsErrorMsg.hide().text('');
    }

    if (promoApplied) {
        $promoSuccessMsg
            .text(CFG.texts.hint_promo_code.replace('{{NAME}}', activePromo.name).replace('{{DISCOUNT}}', activePromo.discount.value + (activePromo.discount.type === 'percent' ? '%' : '€')).replace('{{MIN}}', active-Promo.minNights))
            .show();
        $promoErrorMsg.hide().text('');
    } else if (promoCodeValue && !promoApplied && nights > 0) {
        $promoErrorMsg.text('O código promocional é inválido ou não cumpre as noites mínimas.').show();
        $promoSuccessMsg.hide().text('');
    } else {
        $promoSuccessMsg.hide().text('');
        $promoErrorMsg.hide().text('');
    }

    // ATUALIZAÇÃO DOS CAMPOS (sem disparar "change" para evitar loop)
    var $nightsField = $form.find('[name="'+F.nights+'"]');
    if ($nightsField.val() != nights) {
        $nightsField.val(nights);
    }
    
    var $totalField = $form.find('[name="'+F.total+'"]');
    if ($totalField.val() != total.toFixed(2)) {
        $totalField.val(total.toFixed(2));
    }
  }

  // --- INICIALIZAÇÃO DOS COMPONENTES E EVENTOS ---

  // Inicializar datepickers
  var fields = [$checkIn, $checkOut];
  fields.forEach(function($field) {
      if ($field.hasClass('hasDatepicker')) {
          $field.datepicker('destroy');
      }
      $field.datepicker({
          dateFormat: 'dd/mm/yy',
          minDate: today_midnight, 
          onSelect: update // Apenas o onSelect chama o update
      });
  });

  // Garantir que o campo TOTAL é apenas de leitura
  $form.find('[name="'+F.total+'"]').attr('readonly', 'readonly'); 
  
  // === CORREÇÃO DO LOOP INFINITO ===
  // Removemos o .on('change') genérico e adicionamos detetores específicos
  
  // 1. Detetor para os cartões de alojamento
  $form.find('[name="'+F.accommodation+'"]').on('click', update); 

  // 2. Detetor para o campo de código promocional
  $promoCode.on('input', update);

  // Execução inicial para configurar o estado do formulário
  update();
});