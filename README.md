# CH Booking Rules

[![WordPress](https://img.shields.io/badge/WordPress-6.x-blue)](https://wordpress.org)
[![PHP](https://img.shields.io/badge/PHP-8.1%20--%208.3-brightgreen)](https://www.php.net/)
[![License](https://img.shields.io/badge/license-GPL--2.0-orange)](LICENSE)

Plugin para WordPress que adiciona **regras avançadas de reserva** a formulários **FluentForms**:  
validação de datas, cálculo automático de noites, épocas, preços dinâmicos e códigos promocionais.

---

## ✨ Funcionalidades
- ✅ Impede reservas com datas no passado  
- ✅ Cálculo automático de noites (check-in/check-out)  
- ✅ Validação de intervalo: check-out > check-in  
- ✅ Estadia mínima e máxima configurável  
- ✅ Datas bloqueadas (*blackout dates*)  
- ✅ Suporte a códigos promocionais (percentual ou valor fixo)  
- ✅ Integração direta com FluentForms (multi-formulário)  
- 🚧 Preços por época e regras avançadas *(em desenvolvimento)*  

---

## 📦 Instalação

1. Faz download do ficheiro ZIP (ou compila uma release do GitHub).  
2. No WordPress, vai a **Plugins → Adicionar novo → Carregar plugin**.  
3. Sobe o ZIP e ativa o plugin.  
4. Configura as opções em **Definições → CH Booking Rules**.  

---

## ⚙️ Configuração no FluentForms

- Campos necessários (podes renomear os *names* no form, mas devem ser mapeados):  
  - `check_in` → Data de entrada  
  - `check_out` → Data de saída  
  - `nights_number` → Nº de noites  
  - `total` → Valor total  
  - `accommodation` → Tipo de alojamento  
  - `promo_code` → Código promocional  

Exemplo de inicialização JS:
```javascript
(function($){
  var CFG = window.CH_BOOKING_CFG || {};
  var formId = '#fluentform_' + (CFG.form_id || 3);
  // lógica de validação/cálculo...
})(jQuery);
