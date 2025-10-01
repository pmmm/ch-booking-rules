jQuery(function($){
  /**
   * Solução Final para Tradução do Calendário Flatpickr do Fluent Forms
   * Este código "ouve" o evento 'ff_flatpickr_init' que o Fluent Forms dispara.
   * Quando o calendário é criado, nós definimos o idioma correto.
   */
  $(document).on('ff_flatpickr_init', function (event, form, field, config) {
      var lang = window.CHBR_LOCALE ? window.CHBR_LOCALE.lang : 'default';
      var flatpickrInstance = field[0]._flatpickr;
      
      // Verifica se a instância do calendário e a tradução existem antes de aplicar
      if (flatpickrInstance && typeof flatpickr.l10ns[lang] !== 'undefined') {
          flatpickrInstance.set('locale', lang);
      }
  });

  // --- Lógica Principal de Reservas ---
  var CFG = window.CH_BOOKING_CFG || {};
  var F = CFG.fields || {};
  var formSel = '#fluentform_' + (CFG.form_id || 3);
  var $form = $(formSel);
  if(!$form.length) return;

  function parseDMY(s){
      if(!s) return null;
      var m = String(s).trim().match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/); 
      if(!m) return null;
      // Formato dd/mm/yyyy -> new Date(yyyy, mm-1, dd)
      return new Date(m[3].length==2?('20'+m[3]):m[3], m[2]-1, m[1]); 
  }

  function daysBetween(d1,d2){ return Math.round((d2-d1)/(1000*60*60*24)); }

  var $checkIn = $form.find('input[name="'+F.check_in+'"]');
  var $checkOut = $form.find('input[name="'+F.check_out+'"]');
  var $promoCode = $form.find('input[name="'+F.promo_code+'"]'); 
  
  // Inicializar elementos de mensagem
  if (!$('#chbr-promo-success').length) { $promoCode.closest('.ff-el-group').after('<div id="chbr-promo-success"></div>'); }
  var $promoSuccessMsg = $('#chbr-promo-success');

  if (!$('#chbr-promo-error').length) { $promoCode.closest('.ff-el-group').after('<div id="chbr-promo-error"></div>'); }
  var $promoErrorMsg = $('#chbr-promo-error');
  
  if (!$('#chbr-minnights-error').length) { $checkOut.closest('.ff-el-group').after('<div id="chbr-minnights-error" class="ff-error-message"></div>'); }
  var $minNightsErrorMsg = $('#chbr-minnights-error');

  function update(){
      var ci = parseDMY($checkIn.val());
      var co = parseDMY($checkOut.val());
      
      // Atualiza dinamicamente o minDate do check-out usando a API do Flatpickr
      if ($checkOut[0] && $checkOut[0]._flatpickr) {
          var checkOutPicker = $checkOut[0]._flatpickr;
          if (ci) {
              var min_co_date = new Date(ci);
              min_co_date.setDate(ci.getDate() + 1);
              checkOutPicker.set('minDate', min_co_date);
              if (co && co <= ci) {
                  if(CFG.resetCheckoutOnCheckinChange){ checkOutPicker.clear(); co = null; }
              }
          } else {
              checkOutPicker.set('minDate', new Date());
          }
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
              if (checkInMonthDay >= season.from && checkInMonthDay <= season.to) {
                  if (min > minNightsRequired) minNightsRequired = min;
              }
          });
      }

      if (promoCodeValue && dailyRate > 0 && nights > 0 && CFG.promos && CFG.promos.length) {
          CFG.promos.forEach(function(promo){
              if(promo.code && promo.code.toUpperCase() === promoCodeValue) {
                  if (nights >= (parseInt(promo.minNights) || 1)) { activePromo = promo; }
              }
          });
          if (activePromo) {
              var discountValue = parseFloat(activePromo.discount.value);
              if (activePromo.discount.type === 'percent') total *= (1 - discountValue / 100);
              else if (activePromo.discount.type === 'fixed') total = Math.max(0, total - discountValue);
              promoApplied = true;
          }
      }

      var nightsValid = (nights === 0 || nights >= minNightsRequired);
      if (!nightsValid) {
          total = 0;
          $minNightsErrorMsg.text(CFG.texts.err_min_nights.replace('{{MIN}}', minNightsRequired)).show();
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
          $totalField.val((accom && dailyRate > 0) ? dailyRate.toFixed(2) : '0.00');
      }
  }

  $form.find('[name="'+F.total+'"]').attr('readonly', 'readonly'); 

  // Eventos que disparam o recálculo
  // Usamos 'change' para as datas porque o Flatpickr dispara este evento
  $form.on('change', 'input[name="'+F.check_in+'"], input[name="'+F.check_out+'"]', update);
  $form.on('click', '[name="'+F.accommodation+'"]', update); 
  $form.on('input', 'input[name="'+F.promo_code+'"]', update);

  setTimeout(update, 500); // Execução inicial com um pequeno delay
});