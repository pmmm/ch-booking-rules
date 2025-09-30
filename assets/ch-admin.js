jQuery(function($){
    
    // Contador global para dar a cada nova linha um índice único.
    // Começa alto para não colidir com índices existentes (0, 1, 2...).
    var rule_index = 1000; 

    // Lógica para adicionar uma nova linha de regra (botão "+ Adicionar Nova Época")
    $('.chbr-add-rule').on('click', function(){
        var target = $(this).data('target');
        var container = $('#chbr-'+target+'-container');
        var template_id = 'chbr-'+target+'-template';
        
        // 1. Obter o HTML do template (o campo oculto no PHP)
        var template_html = $('#'+template_id).html();
        
        // 2. Substituir o placeholder '{{INDEX}}' pelo número único
        var new_row = template_html.replace(/\{\{INDEX\}\}/g, rule_index++); 
        
        // 3. Adicionar a nova linha ao container
        container.append(new_row);
    });

    // Lógica para remover uma linha de regra (botão "Remover")
    $(document).on('click', '.chbr-remove-rule', function(){
        // Remove o elemento pai mais próximo com a classe chbr-rule-row
        $(this).closest('.chbr-rule-row').remove();
    });

});