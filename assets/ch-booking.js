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
    // CORREÇÃO: Parêntese extra removido (Resolve Uncaught SyntaxError)
    return new Date(m[3].length==2?('20'+m[3]):m[3], m[2]-1, m[1]); 
  }

  function daysBetween(d1,d2){ return Math.round((d2-d1)/(1000*60*60*24)); }

  // 1. CORREÇÃO: Definir today à meia-noite (00:00:00)
  var today_midnight = new Date();
  today_midnight.setHours(0, 0, 0, 0); 

  var $checkIn = $form.find('[name="'+F.check_in+'"]');
  var $checkOut = $form.find('[name="'+F.check_out+'"]');
  var $promoCode = $form.find('[name="'+F.promo_code+'"]'); 
  
  // Adicionar o elemento de mensagem de sucesso para o código promocional
  var $promoCodeGroup = $promoCode.closest('.ff-el-group');
  if (!$('#chbr-promo-success').length) {
      $promoCodeGroup.after('<div id="chbr-promo-success"></div>');
  }
  var $promoSuccessMsg = $('#chbr-promo-success');
  
  // Adicionar o elemento de erro de noites mínimas
  if (!$('#chbr-minnights-error').length) {
      $checkOut.closest('.ff-el-group').after('<div id="chbr-minnights-error" class="ff-error-message"></div>');
  }
  var $minNightsErrorMsg = $('#chbr-minnights-error');


  function update(){
    var ci = parseDMY($checkIn.val());
    var co = parseDMY($checkOut.val());
    
    // 2. Lógica para atualizar dinamicamente o minDate do Check-Out
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
    // Fim da Lógica de Datas

    var nights = ci && co ? daysBetween(ci,co) : 0;
    
    var promoCodeValue = $promoCode.val().trim().toUpperCase(); 
    var activePromo = null; 
    var dailyRate = 0;
    var total = 0;
    var promoApplied = false;
    var minNightsRequired = 0; // Inicializar

    // 1. CÁLCULO BASE (preço normal)
    // CORREÇÃO CRÍTICA: LER O VALOR DO BOTÃO DE RÁDIO SELECIONADO
    var accom = $form.find('[name="'+F.accommodation+'"]:checked').val() || ''; 
    
    dailyRate = CFG.prices && CFG.prices[accom] ? CFG.prices[accom] : 0;
    
    // NOVO: LÓGICA DE UX DO PREÇO INICIAL
    if (nights === 0 && dailyRate > 0 && accom) {
        total = dailyRate; // Se a acomodação for escolhida mas as noites não, mostra o preço por noite
    } else {
        total = nights * dailyRate; // Se as noites forem preenchidas, calcula o total
    }

    // 2. ENCONTRAR O MÍNIMO DE NOITES (LÓGICA CRÍTICA)
    if (ci && CFG.seasons && CFG.seasons.length) {
        var checkInMonthDay = (ci.getMonth() + 1).toString().padStart(2, '0') + '-' + ci.getDate().toString().padStart(2, '0');

        CFG.seasons.forEach(function(season){
            var min = parseInt(season.minNights || 0);
            var from = season.from;
            var to = season.to;
            
            if (from && to && checkInMonthDay >= from && checkInMonthDay <= to) {
                if (min > minNightsRequired) {
                    minNightsRequired = min;
                }
            }
        });
    }
    
    // Regra global (garante mínimo de 2 noites se nenhuma regra for aplicada ou for inferior)
    if (minNightsRequired < 2) {
        minNightsRequired = 2; 
    }

    // 3. APLICAÇÃO DO DESCONTO
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

    // 4. VALIDAÇÃO E MENSAGENS
    var nightsValid = true;
    if (nights > 0 && nights < minNightsRequired) {
        total = 0; // Zera o total para indicar que a reserva é inválida
        nightsValid = false;
    }
    
    // MENSAGEM DE NOITES MÍNIMAS
    if (!nightsValid && ci && co) {
        var msg = CFG.texts.err_min_nights.replace('{{MIN}}', minNightsRequired);
        $minNightsErrorMsg.text(msg).show();
    } else {
        $minNightsErrorMsg.hide().text('');
    }

    // MENSAGEM DE CÓDIGO PROMOCIONAL
    if (promoApplied) {
        $promoSuccessMsg
            .text(CFG.texts.hint_promo_code.replace('{{NAME}}', activePromo.name).replace('{{DISCOUNT}}', activePromo.discount.value + (activePromo.discount.type === 'percent' ? '%' : '€')).replace('{{MIN}}', activePromo.minNights))
            .show();
        $promoErrorMsg.hide().text(''); // Esconder erro se for sucesso
    } else if (promoCodeValue && !promoApplied) {
        // Se inseriu código e não aplicou (código inválido/noites mínimas)
        $promoErrorMsg.text('ERRO: O código promocional é inválido ou as noites mínimas não foram cumpridas.').show();
        $promoSuccessMsg.hide().text('');
    } else {
        // Esconder ambas as mensagens se o campo estiver vazio
        $promoSuccessMsg.hide().text('');
        $promoErrorMsg.hide().text('');
    }

    // *** ATUALIZAÇÃO DOS CAMPOS ***
    if(nights>0) $form.find('[name="'+F.nights+'"]').val(nights);
    $form.find('[name="'+F.total+'"]').val(total.toFixed(2));
  }

  // Inicializar datepickers - SOLUÇÃO FINAL PARA SOBREPOSIÇÃO
  var fields = [$checkIn, $checkOut];
  
  fields.forEach(function($field) {
      if ($field.hasClass('hasDatepicker') && typeof $field.datepicker === 'function') {
          // Destruir qualquer inicialização anterior para evitar sobreposição
          $field.datepicker('destroy');
      }
      
      if (typeof $field.datepicker === 'function') {
        // CORREÇÃO FINAL DA SOBREPOSIÇÃO: Desliga o foco e inicializa
        $field.off('focus').datepicker({
            dateFormat: 'dd/mm/yy',
            minDate: today_midnight, 
            onSelect: update
        });
      }
  });

  // NOVO: Garantir que o campo TOTAL é APENAS DE LEITURA (read-only)
  $form.find('[name="'+F.total+'"]').attr('readonly', 'readonly'); 
  
  // NOVO: Garantir que o clique nos cartões de alojamento dispara o update
  $form.find('[name="'+F.accommodation+'"]').on('click', update); 

  // Este é o único local onde o update deve ser chamado por um evento de 'change'.
  $form.on('change','[name]', update); 
  
  update();
});