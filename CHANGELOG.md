# Changelog — CH Booking Rules

Todas as alterações notáveis a este projeto serão documentadas neste ficheiro.
O formato segue [Keep a Changelog](https://keepachangelog.com/pt-PT/1.0.0/)
e este projeto adota [Semantic Versioning](https://semver.org/lang/pt-PT/).

---
## [2.2.0] - 2025-10-01
### Corrigido
- Resolvido o problema de tradução do calendário de forma definitiva para todos os idiomas (PT, FR, ES).
- Identificada a biblioteca de calendário correta (Flatpickr) usada pelo Fluent Forms, substituindo a abordagem anterior que visava a biblioteca errada (jQuery UI Datepicker).

### Melhorado
- A lógica de tradução agora usa o evento JavaScript nativo do Fluent Forms (`ff_flatpickr_init`), tornando a solução mais robusta, segura e à prova de conflitos.
- O código PHP foi simplificado, removendo as tentativas de localização anteriores que se tornaram obsoletas.

## [2.1.2] - 2025-10-01
### Corrigido
- Adicionados "fallbacks" de tradução para Francês (fr) e Espanhol (es) para garantir o funcionamento do calendário em múltiplos idiomas.

## [2.1.0] - 2025-10-01
### Adicionado
- Suporte à localização nativa do calendário (jQuery UI Datepicker) para resolver conflitos com plugins de tradução (ex: TranslatePress).

### Melhorado
- O bloqueio de datas passadas é agora delegado à configuração nativa do Fluent Forms (`Advanced Date Configuration`), aumentando a compatibilidade e robustez do plugin.

### Removido
- Código de inicialização do datepicker foi removido do `ch-booking.js` para evitar conflitos com o Fluent Forms.

## [2.0.27] - 2025-10-01
### Corrigido
- Corrigido um erro de referência em JavaScript (`ReferenceError`) que impedia a mensagem de sucesso do código promocional de ser exibida.
- Restaurada a lógica de reatividade para que a validação do código promocional seja re-executada quando as datas são alteradas.
- Corrigido o comportamento de reinicialização dos campos de "Noites" e "Total" ao limpar as datas.

## [2.0.26] - 2025-10-01
### Corrigido
- Resolvido um loop infinito (`Maximum call stack size exceeded`) no JavaScript do formulário, que era causado por um detetor de eventos `change` demasiado genérico. Esta correção estabilizou o formulário e eliminou os erros na consola.

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

## [1.3.11] -