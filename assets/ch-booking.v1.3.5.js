
/* v1.3.5: daily-rate badge + placeholder + all rules/validations */
(function($){
  var CFG = window.CH_BOOKING_CFG || {};
  var F = CFG.fields || {};
  var formId = '#fluentform_' + (CFG.form_id || 3);
  function byName(name){ return $(formId).find('[name="'+name+'"]'); }
  var N = {
    check_in:  F.check_in  || 'check_in',
    check_out: F.check_out || 'check_out',
    nights:    F.nights    || 'nights_number',
    total:     F.total     || 'total',
    accom:     F.accommodation || 'accommodation',
    code:      F.promo_code || 'promo_code'
  };
  function dOnly(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function parseDMY(s){
    if(!s) return null;
    var m = String(s).trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if(m){ return new Date(+m[3], +m[2]-1, +m[1]); }
    var d = new Date(s); return isNaN(d) ? null : dOnly(d);
  }
  function nightsBetween(a,b){ return (!a||!b)?0:Math.round((dOnly(b)-dOnly(a))/86400000); }
  function overlaps(aStart,aEnd,bStart,bEnd){ return (aStart < bEnd) && (aEnd > bStart); }
  function expandYearless(fromMD,toMD,year){
    var fm=+fromMD.split('-')[0], fd=+fromMD.split('-')[1];
    var tm=+toMD.split('-')[0],   td=+toMD.split('-')[1];
    var s=new Date(year,fm-1,fd), e=new Date(year,tm-1,td+1);
    if(e<s) e=new Date(year+1,tm-1,td+1);
    return {start:s,endEx:e};
  }
  function seasonalMin(ci,co){
    if(!ci||!co) return 0;
    var seasons=CFG.seasons||[], min=0, yrs={};
    yrs[ci.getFullYear()]=1; yrs[co.getFullYear()]=1; yrs[ci.getFullYear()-1]=1; yrs[co.getFullYear()+1]=1;
    Object.keys(yrs).forEach(function(y){
      y=+y; seasons.forEach(function(s){
        var r=expandYearless(s.from,s.to,y);
        if(overlaps(ci,co,r.start,r.endEx)) min=Math.max(min, s.minNights||0);
      });
    });
    return min;
  }
  function bestPromo(ci,co,nights,code){
    var promos=CFG.promos||[], best=null, yrs={};
    if(ci){yrs[ci.getFullYear()]=1;yrs[ci.getFullYear()-1]=1;yrs[ci.getFullYear()+1]=1;}
    if(co){yrs[co.getFullYear()]=1;yrs[co.getFullYear()-1]=1;yrs[co.getFullYear()+1]=1;}
    Object.keys(yrs).forEach(function(y){
      y=+y; promos.forEach(function(p){
        var r=expandYearless(p.from,p.to,y);
        var rule=p.applyRule||'full_stay';
        var ok = rule==='checkin_only' ? (ci>=r.start && ci<r.endEx) : (ci>=r.start && co<=r.endEx);
        if(!ok) return;
        var need=!!p.code, codeOk=!need || (code && code.toUpperCase()===String(p.code).toUpperCase());
        if(codeOk && (!p.minNights || nights>=p.minNights)){
          if(!best || (p.priority||0)>(best.priority||0)) best=JSON.parse(JSON.stringify(p));
        }
      });
    });
    return best;
  }
  function getFP($el){ var el=$el && $el[0]; return el && el._flatpickr ? el._flatpickr : null; }
  function today0(){ var d=new Date(); d.setHours(0,0,0,0); return d; }

  function enforceMinDates(){
    if(!CFG.enforceTodayMin) return;
    var fi=getFP(byName(N.check_in)), fo=getFP(byName(N.check_out));
    if(fi) fi.set('minDate', today0());
    if(fo) fo.set('minDate', today0());
  }
  function setCheckoutMinFromCheckin(){
    var $in=byName(N.check_in), $out=byName(N.check_out);
    var fi=getFP($in), fo=getFP($out);
    if(!fi || !fo) return;
    var ci=parseDMY($in.val()); var min=today0();
    if(ci && ci>min) min=ci;
    fo.set('minDate', min);
    if(CFG.resetCheckoutOnCheckinChange){ $out.val('').trigger('change'); }
  }

  // === PREÇO POR NOITE (badge) + placeholder no TOTAL ===
  function pricePerNight(){
    var $r = $(formId).find('input[name="'+N.accom+'"]:checked');
    if($r.length){
      var direct=parseFloat($r.val());
      if(!isNaN(direct)) return direct;
      var cands=[$r.attr('data-calc'),$r.data('calc'),$r.attr('data-calc-value'),$r.data('calcValue'),$r.attr('data-calc_value'),$r.data('calc_value')];
      for(var i=0;i<cands.length;i++){ var n=parseFloat(cands[i]); if(!isNaN(n)) return n; }
      var $wrap=$r.closest('.ff-el-form-check, .ff_item, .ff-el-form-check-input, .ff-item-group');
      if($wrap.length){
        var w=[$wrap.attr('data-calc'),$wrap.data('calc'),$wrap.find('[data-calc]').attr('data-calc'),$wrap.find('[data-calc-value]').attr('data-calc-value')];
        for(var j=0;j<w.length;j++){ var wn=parseFloat(w[j]); if(!isNaN(wn)) return wn; }
      }
      var label = $(formId).find('label[for="'+$r.attr('id')+'"]').text().trim();
      var valStr = String($r.val()||'').trim();
      if(CFG.prices){
        if(!isNaN(parseFloat(CFG.prices[label])))   return parseFloat(CFG.prices[label]);
        if(!isNaN(parseFloat(CFG.prices[valStr])))  return parseFloat(CFG.prices[valStr]);
      }
    }
    var $s = $(formId).find('[name="'+N.accom+'"] option:selected');
    if($s.length){
      var sc = [$s.attr('data-calc'), $s.data('calc'), $s.attr('data-calc-value'), $s.val()];
      for (var k=0;k<sc.length;k++){ var sv = parseFloat(sc[k]); if(!isNaN(sv)) return sv; }
    }
    return 0;
  }
  function updateDailyRateBadge(){
    var $group = $(formId).find('[name="'+N.accom+'"]').first().closest('.ff-el-group');
    if(!$group.length) return;
    var id = 'ff-daily-rate';
    var $badge = $group.find('#'+id);
    if(!$badge.length){
      var $container = $group.find('.ff-el-input--content').last();
      $badge = $('<div id="'+id+'" class="chbr-daily-rate" aria-live="polite"></div>');
      ($container.length ? $container : $group).append($badge);
    }
    var p = pricePerNight();
    if(p > 0){
      var text = (CFG.texts && CFG.texts.label_daily) || 'Preço por noite: {PRICE} €';
      $badge.text(text.replace('{PRICE}', p.toLocaleString('pt-PT')));
      $badge.show();
    } else {
      $badge.hide();
    }
  }
  // =======================================================

  function setHint(txt){
    var id='ff-minnights-hint', $el = $(formId).find('#'+id);
    if(!$el.length){
      var $out = byName(N.check_out);
      var $wrap = $out.closest('.ff-el-group');
      $el = $('<div id="'+id+'" aria-live="polite" style="margin:.25rem 0 .5rem 0;font-size:.95em;color:#334155;background:#f1f5f9;border:1px dashed #cbd5e1;padding:.5rem .75rem;border-radius:.5rem;"></div>');
      ($wrap.length?$wrap:$(formId)).append($el);
    }
    $el.text(txt||'');
  }

  function applyTotals(){
    var $in  = byName(N.check_in);
    var $out = byName(N.check_out);
    var $n   = byName(N.nights);
    var $tot = byName(N.total);
    var $code= byName(N.code);

    var ci=parseDMY($in.val()), co=parseDMY($out.val());
    var nights=nightsBetween(ci,co);
    if($n.length){ $n.val(nights).trigger('input').trigger('change'); }

    var req = seasonalMin(ci,co)||0;
    var promo = (ci&&co) ? bestPromo(ci,co,nights, ($code.val()||'')) : null;
    if(promo) req=Math.max(req, promo.minNights||0);

    if(ci&&co){
      if(promo){
        var tpl=(CFG.texts && (promo.code?CFG.texts.hint_promo_code:CFG.texts.hint_promo)) || 'Promo: {NAME} ({DISCOUNT}). Min: {MIN}';
        var disc = promo.discount && promo.discount.type==='percent' ? (promo.discount.value+'%')
                   : (promo.discount ? ('-'+Number(promo.discount.value||0).toFixed(2)+'€') : '');
        setHint(tpl.replace('{NAME}',promo.name).replace('{DISCOUNT}',disc).replace('{MIN}', String(req||0)));
      } else {
        var base=(CFG.texts && CFG.texts.hint_normal) || 'Estadia mínima de {MIN} noites.';
        setHint(base.replace('{MIN}', String(req||0)));
      }
    } else { setHint(''); }

    var price=pricePerNight(), total=price*nights;
    if(promo && total>0){
      if(promo.discount.type==='percent') total = total * (1 - (promo.discount.value/100));
      if(promo.discount.type==='fixed')   total = Math.max(0, total - promo.discount.value);
    }
    if($tot.length){ $tot.val(isFinite(total)? Math.round(total):0).trigger('input').trigger('change'); }

    updateDailyRateBadge();
    if ($tot.length){
      if (nights <= 0){
        var p = pricePerNight();
        $tot.attr('placeholder', p > 0 ? (p.toLocaleString('pt-PT') + ' € / noite') : '');
      } else {
        $tot.attr('placeholder','');
      }
    }
  }

  function clearError($input){
    var $group = $input.closest('.ff-el-group');
    $group.removeClass('ff-el-is-error');
    $group.find('.ff_error_message.chbr').remove();
  }
  function showError($input, msg){
    var $group = $input.closest('.ff-el-group');
    clearError($input);
    $group.addClass('ff-el-is-error');
    var $msg = $('<div class="ff-el-input--content ff_error_message chbr" style="margin-top:6px;"></div>').text(msg);
    ($group.find('.ff-el-input--content').last().length ? $group.find('.ff-el-input--content').last() : $group).append($msg);
  }

  function bindNow(){
    var $f = $(formId);
    if(!$f.length) return false;

    if(CFG.enforceTodayMin){
      var tries=0;(function wait(){
        var fi=getFP(byName(N.check_in)), fo=getFP(byName(N.check_out));
        if(!fi || !fo){ if(++tries<40) { setTimeout(wait,200); } return; }
        enforceMinDates(); setCheckoutMinFromCheckin();
      })();
    }
    $f.on('change input','[name="'+N.check_in+'"]', function(){
      if(CFG.enforceTodayMin) setCheckoutMinFromCheckin();
      applyTotals();
    });
    $f.on('change input','[name="'+N.check_out+'"], [name="'+N.accom+'"], [name="'+N.code+'"]', applyTotals);

    $f.on('submit', function(e){
      var $in  = byName(N.check_in);
      var $out = byName(N.check_out);
      clearError($in); clearError($out);

      var ci=parseDMY($in.val()), co=parseDMY($out.val()), today=today0();
      var nights=nightsBetween(ci,co);
      var req=seasonalMin(ci,co)||0;
      var promo=(ci&&co)?bestPromo(ci,co,nights, (byName(N.code).val()||'')):null;
      if(promo) req=Math.max(req, promo.minNights||0);

      var hasError=false;
      if(!ci || (CFG.enforceTodayMin && ci < today)){
        showError($in, (CFG.texts && CFG.texts.err_past_date) || 'Data inválida.');
        hasError=true;
      }
      if(!co || !ci || co <= ci){
        showError($out, (CFG.texts && CFG.texts.err_out_before_in) || 'Saída deve ser posterior à chegada.');
        hasError=true;
      } else if (CFG.enforceTodayMin && co < today){
        showError($out, (CFG.texts && CFG.texts.err_past_date) || 'Data inválida.');
        hasError=true;
      }
      if(!hasError && req && nights < req){
        showError($out, ((CFG.texts && CFG.texts.err_min_nights) || 'Mínimo {MIN} noites.').replace('{MIN}', String(req)));
        hasError=true;
      }
      if(hasError){ e.preventDefault(); e.stopImmediatePropagation();
        var $first = $f.find('.ff-el-is-error').first();
        if($first.length){ var top=$first.offset().top-120; window.scrollTo({top:top, behavior:'smooth'}); }
        return false;
      }
    });

    applyTotals();
    return true;
  }

  var tries = 0;
  function boot(){
    if(bindNow()) return;
    if(++tries < 60) setTimeout(boot, 250);
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(jQuery);
