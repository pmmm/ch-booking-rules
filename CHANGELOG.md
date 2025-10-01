# Changelog — CH Booking Rules

Todas as alterações notáveis a este projeto serão documentadas neste ficheiro.  
O formato segue [Keep a Changelog](https://keepachangelog.com/pt-PT/1.0.0/)  
e este projeto adota [Semantic Versioning](https://semver.org/lang/pt-PT/).

---
## [2.0.1] - 2025-10-01
### Corrigido
- Finalizada a implementação da interface de gestão de Promoções e Códigos (Backend UX).
- Corrigida a lógica de guardar dados na função `save_settings` para processar corretamente os dados do novo formulário de Promoções.

## [2.0.0] - 2025-10-01
### Adicionado
- Nova interface gráfica (GUI) para a gestão de regras de reservas.
- Implementação de abas para separar a configuração de "Épocas & Mínimos", "Promoções & Códigos" e "Avançado".
- Campos repetíveis para a gestão de Regras de Épocas, eliminando a necessidade de editar diretamente o código JSON.

### Melhorado
- Migração da gestão de configurações de JSON para um sistema de formulários amigável.
- Código PHP reestruturado para suportar a nova interface.

## [1.3.11] - 2025-10-01
### Corrigido
- Corrigido um loop infinito no cálculo de datas e valores que impedia o datepicker de abrir, causado por disparar o evento 'change' em campos calculados (noites e total).

### Melhorado
- Estabilidade geral do frontend ao calcular o número de noites e o valor total.

## [1.3.10] - 2025-09-30 ### Corrigido 
- Bloqueio de datas no datepicker do check-in (garante que minDate é a meia-noite de hoje). ### Melhorado - minDate do check-out é agora dinâmico, forçando a seleção de datas no dia seguinte ao check-in.

## [1.3.8] - 2025-09-30
- Datepicker: bloqueio visual de datas anteriores à de hoje + `minDate` dinâmico no check-out.
- Alojamento: cálculo do total passa a aceitar o *label* ou o *value* (FluentForms radios/select).
- Parser de datas mais tolerante (DD/MM/YY, `.` como separador, etc.).
- Pequenos ajustes de UX e mensagens.


## [1.3.6] - Em desenvolvimento
### Adicionado
- Validação para impedir reservas com datas no passado.  
- Melhor tratamento de formatos de data (`DD/MM/YYYY` e `DD-MM-YYYY`).  

---

## [1.3.5] - 2025-09-30
### Adicionado
- Primeira versão pública do plugin.  
- Validação básica de check-in / check-out.  
- Cálculo automático do número de noites.  
- Estrutura inicial de integração com FluentForms.  

