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

  function update(){
    var ci = parseDMY($form.find('[name="'+F.check_in+'"]').val());
    var co = parseDMY($form.find('[name="'+F.check_out+'"]').val());
    var nights = ci && co ? daysBetween(ci,co) : 0;
    if(nights>0) $form.find('[name="'+F.nights+'"]').val(nights).trigger('change');
    var accom = $form.find('[name="'+F.accom+'"]').val() || '';
    var total = 0;
    if(accom && CFG.prices && CFG.prices[accom]){
      total = nights * CFG.prices[accom];
    }
    $form.find('[name="'+F.total+'"]').val(total.toFixed(2)).trigger('change');
  }

  // Inicializar datepickers
  var today = new Date();
  $form.find('[name="'+F.check_in+'"],[name="'+F.check_out+'"]').datepicker({
    dateFormat: 'dd/mm/yy',
    minDate: today,
    onSelect: update
  });

  $form.on('change','[name]', update);
});
