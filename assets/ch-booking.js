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

  // 1. CORREÇÃO: Definir today à meia-noite (00:00:00)
  var today_midnight = new Date();
  today_midnight.setHours(0, 0, 0, 0); 

  var $checkIn = $form.find('[name="'+F.check_in+'"]');
  var $checkOut = $form.find('[name="'+F.check_out+'"]');
  // NOVO: Selecionar o campo do código promocional
  var $promoCode = $form.find('[name="'+F.promo_code+'"]'); 


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
    
    // *** NOVA LINHA: Obter o valor do código promocional ***
    var promoCodeValue = $promoCode.val().trim().toUpperCase(); 

    // *** Lógica de Cálculo (Aqui deve ser implementada a verificação do promoCodeValue contra CFG.promos) ***

    var accom = $form.find('[name="'+F.accommodation+'"]').val() || ''; 
    if (!accom) { 
      accom = $form.find('[name="'+F.accom+'"]').val() || ''; 
    }
    var total = 0;
    if(accom && CFG.prices && CFG.prices[accom]){
      total = nights * CFG.prices[accom];
      // Futuro: Aplicar desconto se promoCodeValue corresponder a uma regra em CFG.promos
    }
    
    // *** CORREÇÃO DO LOOP INFINITO ***
    if(nights>0) $form.find('[name="'+F.nights+'"]').val(nights);
    $form.find('[name="'+F.total+'"]').val(total.toFixed(2));
  }

  // Inicializar datepickers - Separado para controlo do minDate
  
  // NOVO: Adiciona a verificação hasDatepicker para evitar sobreposições
  if (!$checkIn.hasClass('hasDatepicker')) {
    // 1. Inicializar Check-In
    $checkIn.datepicker({
      dateFormat: 'dd/mm/yy',
      minDate: today_midnight, 
      onSelect: update
    });
  }
  
  // NOVO: Adiciona a verificação hasDatepicker para evitar sobreposições
  if (!$checkOut.hasClass('hasDatepicker')) {
    // 2. Inicializar Check-Out
    $checkOut.datepicker({
      dateFormat: 'dd/mm/yy',
      minDate: today_midnight, 
      onSelect: update
    });
  }

  // Este é o único local onde o update deve ser chamado por um evento de 'change'.
  // Incluindo o campo de promo_code!
  $form.on('change','[name]', update); 
  
  update();
});