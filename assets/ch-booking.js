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

  // 1. CORREÇÃO: Definir today à meia-noite (00:00:00) para evitar problemas de fuso horário/hora atual.
  var today_midnight = new Date();
  today_midnight.setHours(0, 0, 0, 0); 

  var $checkIn = $form.find('[name="'+F.check_in+'"]');
  var $checkOut = $form.find('[name="'+F.check_out+'"]');


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
    
    // *** CORREÇÃO DO LOOP INFINITO (REMOÇÃO DO .trigger('change')) ***
    if(nights>0) $form.find('[name="'+F.nights+'"]').val(nights);
    
    var accom = $form.find('[name="'+F.accommodation+'"]').val() || ''; // F.accommodation (ajustei com base no PHP)
    if (!accom) { // Se não encontrou pelo nome longo, tenta pelo nome curto
      accom = $form.find('[name="'+F.accom+'"]').val() || ''; 
    }
    var total = 0;
    if(accom && CFG.prices && CFG.prices[accom]){
      total = nights * CFG.prices[accom];
    }
    
    // *** CORREÇÃO DO LOOP INFINITO (REMOÇÃO DO .trigger('change')) ***
    $form.find('[name="'+F.total+'"]').val(total.toFixed(2));
  }

  // Inicializar datepickers - Separado para controlo do minDate
  
  // 1. Inicializar Check-In: Usa today_midnight para bloquear o passado!
  $checkIn.datepicker({
    dateFormat: 'dd/mm/yy',
    minDate: today_midnight, // ÚNICA ENTRADA
    onSelect: update
  });
  
  // 2. Inicializar Check-Out
  $checkOut.datepicker({
    dateFormat: 'dd/mm/yy',
    minDate: today_midnight, // ÚNICA ENTRADA (será atualizada por update())
    onSelect: update
  });


  // Este é o único local onde o update deve ser chamado por um evento de 'change'.
  $form.on('change','[name]', update); 
  
  update();
});