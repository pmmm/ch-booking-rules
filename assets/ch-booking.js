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
  // Isso garante que o dia de hoje é sempre selecionável.
  var today_midnight = new Date();
  today_midnight.setHours(0, 0, 0, 0); 

  var $checkIn = $form.find('[name="'+F.check_in+'"]');
  var $checkOut = $form.find('[name="'+F.check_out+'"]');


  function update(){
    var ci = parseDMY($checkIn.val());
    var co = parseDMY($checkOut.val());
    
    // 2. MELHORIA: Lógica para atualizar dinamicamente o minDate do Check-Out
    if (ci) {
        // A data mínima de check-out é o dia seguinte ao check-in (para um mínimo de 1 noite)
        var min_co_date = new Date(ci);
        min_co_date.setDate(ci.getDate() + 1);

        // Aplica o novo minDate ao datepicker de check-out
        $checkOut.datepicker('option', 'minDate', min_co_date);

        // Lógica de reset (referenciando a opção 'resetCheckoutOnCheckinChange' do PHP)
        var nights_calc = daysBetween(ci, co);
        if (nights_calc <= 0 && co) { 
             if(CFG.resetCheckoutOnCheckinChange){ 
                $checkOut.val('');
                co = null; // Reseta co para que o cálculo de noites seja 0
             }
        }
    } else {
        // Se o check-in for limpo, o check-out volta a ter o minDate de hoje.
        $checkOut.datepicker('option', 'minDate', today_midnight);
    }
    // Fim da Lógica de Datas

    var nights = ci && co ? daysBetween(ci,co) : 0;
    if(nights>0) $form.find('[name="'+F.nights+'"]').val(nights).trigger('change');
    
    var accom = $form.find('[name="'+F.accom+'"]').val() || '';
    var total = 0;
    if(accom && CFG.prices && CFG.prices[accom]){
      total = nights * CFG.prices[accom];
    }
    $form.find('[name="'+F.total+'"]').val(total.toFixed(2)).trigger('change');
  }

  // Inicializar datepickers - Inicialização separada para maior controlo do minDate
  
  // 1. Inicializar Check-In: Mínimo é hoje à meia-noite
  $checkIn.datepicker({
    dateFormat: 'dd/mm/yy',
    minDate: today_midnight, // Aplica a correção #1
    onSelect: update
  });
  
  // 2. Inicializar Check-Out: Mínimo INICIAL é hoje à meia-noite (será atualizado pelo update)
  $checkOut.datepicker({
    dateFormat: 'dd/mm/yy',
    minDate: today_midnight, // Mínimo inicial é hoje (antes de o Check-In ser selecionado)
    onSelect: update
  });


  $form.on('change','[name]', update);
  
  // Executar no carregamento para aplicar a lógica dinâmica (útil se o form tiver valores pré-preenchidos)
  update();
});