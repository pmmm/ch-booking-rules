<?php
/**
 * Plugin Name: CH Booking Rules
 * Description: Épocas, mínimos e promoções (recorrentes) + código promocional para Fluent Forms.
 * Version: 2.0.20
 * Author: Pedro & ChatGPT & Gemini
 * License: GPLv2 or later
 * Text Domain: ch-booking-rules
 */
if (!defined('ABSPATH')) { exit; }

class CH_Booking_Rules {
    const OPT_KEY = 'ch_booking_rules_cfg';
    const VER = '2.0.20'; // VERSÃO FINAL

    public function __construct(){
        add_action('admin_menu', [$this, 'admin_menu']);
        add_action('admin_init', [$this, 'register_settings']);
        add_action('wp_enqueue_scripts', [$this, 'enqueue_frontend']);
        add_action('admin_notices', [$this, 'admin_version_notice']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_admin_scripts']); 
    }

    public function admin_menu(){
        add_options_page(__('Booking Rules','ch-booking-rules'), __('Booking Rules','ch-booking-rules'), 'manage_options', 'ch-booking-rules', [$this, 'settings_page']);
    }

    public function register_settings(){
        register_setting('ch_booking_rules_group', self::OPT_KEY);
    }

    public function default_config(){
        return [
            'form_id' => 3,
            'fields' => [
                'check_in' => 'check_in',
                'check_out' => 'check_out',
                'nights' => 'nights_number',
                'total' => 'total',
                'accommodation' => 'accommodation',
                'promo_code' => 'promo_code'
            ],
            'enforceTodayMin' => true,
            'resetCheckoutOnCheckinChange' => true,
            'seasons' => [
                ['name'=>__('Época Baixa','ch-booking-rules'), 'from'=>'10-01','to'=>'03-31','minNights'=>2],
                ['name'=>__('Época Alta','ch-booking-rules'),  'from'=>'07-01','to'=>'08-31','minNights'=>5],
                ['name'=>__('Época Normal','ch-booking-rules'),'from'=>'04-01','to'=>'06-30','minNights'=>3],
                ['name'=>__('Época Normal','ch-booking-rules'),'from'=>'09-01','to'=>'09-30','minNights'=>3]
            ],
            'promos' => [
                ['name'=>__('Campanha de Outono','ch-booking-rules'),'from'=>'10-01','to'=>'11-30','discount'=>['type'=>'percent','value'=>25],'minNights'=>2,'priority'=>10,'applyRule'=>'full_stay','code'=>'OUTONO25']
            ],
            'texts' => [
                'label_daily'      => __('Preço por noite: {{PRICE}} €','ch-booking-rules'),
                'hint_normal'      => __('Estadia mínima de {{MIN}} noites.','ch-booking-rules'),
                'hint_promo'       => __('Promoção ativa: {{NAME}} ({{DISCOUNT}}). Noites mínimas: {{MIN}}.','ch-booking-rules'),
                'hint_promo_code'  => __('Código promocional aplicado: {{NAME}} ({{DISCOUNT}}). Noites mínimas: {{MIN}}.','ch-booking-rules'),
                'err_past_date'    => __('Não pode selecionar datas anteriores à data de hoje.','ch-booking-rules'),
                'err_out_before_in'=> __('A data de saída deve ser posterior à data de chegada.','ch-booking-rules'),
                'err_min_nights'   => __('Esta reserva requer um mínimo de {{MIN}} noite(s) para as datas escolhidas.','ch-booking-rules')
            ],
            'prices' => [
                'Carvalha Serra' => 160,
                'Carvalha Espigueiro' => 150
            ]
        ];
    }

    public function get_config(){
        $cfg = get_option(self::OPT_KEY);
        if (!$cfg) return $this->default_config();
        if (is_string($cfg)) {
            $decoded = json_decode($cfg, true);
            if (is_array($decoded)) return $decoded;
        }
        if (is_array($cfg)) return $cfg;
        return $this->default_config();
    } 
    
    private function save_settings($cfg){
        $save_success = true;
        $save_message = '';
        
        // Processar Épocas
        if (isset($_POST['seasons']) && is_array($_POST['seasons'])) {
            $new_seasons = array_filter(wp_unslash($_POST['seasons']), function($row) {
                return !empty($row['name']) || !empty($row['from']);
            });
            $cfg['seasons'] = array_values($new_seasons); 
        }

        // Processar Promoções
        if (isset($_POST['promos']) && is_array($_POST['promos'])) {
            $new_promos = array_filter(wp_unslash($_POST['promos']), function($row) {
                return !empty($row['name']) || !empty($row['code']);
            });
            $cfg['promos'] = array_values($new_promos);
        }

        // Fallback: Tratar o JSON da aba Avançado
        if (!empty($_POST['ch_rules_json'])) {
            $raw = wp_unslash($_POST['ch_rules_json']);
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                $cfg = $decoded; 
            } else {
                $save_success = false;
                $save_message = __('JSON inválido — as outras configurações foram guardadas, mas o JSON avançado foi ignorado.','ch-booking-rules');
            }
        }
        
        if ($save_success) {
            update_option(self::OPT_KEY, $cfg);
            echo '<div class="updated"><p>'.esc_html__('Guardado.','ch-booking-rules').' '.esc_html($save_message).'</p></div>';
            return $cfg;
        } else {
            echo '<div class="error"><p>'.esc_html__('Dados inválidos ou JSON incorreto — não guardado.','ch-booking-rules').'</p></div>';
            return $cfg;
        }
    }


    public function settings_page(){
        if (!current_user_can('manage_options')) return;
        $cfg = $this->get_config();
        
        if (isset($_POST['ch_booking_rules_save']) && check_admin_referer('ch_booking_rules_save_nonce')) {
            $cfg = $this->save_settings($cfg);
        }

        $json_raw = json_encode($cfg, JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE); 

        $active_tab = isset( $_GET[ 'tab' ] ) ? sanitize_text_field( $_GET[ 'tab' ] ) : 'seasons';
        $tab_url_base = remove_query_arg('settings-updated', admin_url('options-general.php?page=ch-booking-rules'));
        
        echo '<div class="wrap">';
        echo '<h1>'.esc_html__('Booking Rules','ch-booking-rules').' <span style="font-size:12px;color:#666;">v'.esc_html(self::VER).'</span></h1>';

        // NAV TABS
        echo '<h2 class="nav-tab-wrapper">';
        echo '<a href="'.esc_url($tab_url_base.'&tab=seasons').'" class="nav-tab '.($active_tab == 'seasons' ? 'nav-tab-active' : '').'">'.esc_html__('Épocas & Mínimos','ch-booking-rules').'</a>';
        echo '<a href="'.esc_url($tab_url_base.'&tab=promos').'" class="nav-tab '.($active_tab == 'promos' ? 'nav-tab-active' : '').'">'.esc_html__('Promoções & Códigos','ch-booking-rules').'</a>';
        echo '<a href="'.esc_url($tab_url_base.'&tab=advanced').'" class="nav-tab '.($active_tab == 'advanced' ? 'nav-tab-active' : '').'">'.esc_html__('Avançado & Debug','ch-booking-rules').'</a>';
        echo '</h2>';

        echo '<form method="post">';
        wp_nonce_field('ch_booking_rules_save_nonce');
        
        // CONTEÚDO DAS ABAS
        if ( $active_tab == 'seasons' ) {
            $this->render_seasons_tab($cfg);
        } elseif ( $active_tab == 'promos' ) {
            $this->render_promos_tab($cfg);
        } elseif ( $active_tab == 'advanced' ) {
            echo '<h2>'.esc_html__('Configuração JSON','ch-booking-rules').'</h2>';
            echo '<p>'.esc_html__('Edite a configuração completa em JSON. As alterações aqui substituem as outras abas.','ch-booking-rules').'</p>';
            echo '<textarea name="ch_rules_json" style="width:100%;height:450px;font-family:monospace;">'.esc_textarea($json_raw).'</textarea>';
        }

        echo '<p><button class="button button-primary" name="ch_booking_rules_save" value="1">'.esc_html__('Guardar Alterações','ch-booking-rules').'</button></p>';
        echo '</form></div>';
    }
    
    public function enqueue_admin_scripts(){
        if ( ! isset( $_GET['page'] ) || $_GET['page'] !== 'ch-booking-rules' ) {
            return;
        }
        
        wp_enqueue_script('ch-admin-js', plugins_url('assets/ch-admin.js', __FILE__), ['jquery'], self::VER, true);
        
        $css = '.chbr-rule-row { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 15px; align-items: center; } .chbr-rule-row input { padding: 4px; } .chbr-rule-row input[type="number"] { width: 100px; }';
        wp_add_inline_style('wp-admin', $css);
    }
    
    // Renderiza o conteúdo da aba Épocas
    public function render_seasons_tab($cfg){
        $seasons = $cfg['seasons'] ?? [];
        
        echo '<h2>'.esc_html__('Regras de Épocas & Mínimos de Noites','ch-booking-rules').'</h2>';
        echo '<p class="description">'.esc_html__('Defina o nome da época, as datas de início e fim (mês-dia, ex: 07-01), e o número mínimo de noites.','ch-booking-rules').'</p>';
        
        // Títulos das colunas
        echo '<div style="display: flex; gap: 10px; font-weight: bold; margin-bottom: 5px;">';
        echo '<div style="width: 250px;">'.esc_html__('Nome','ch-booking-rules').'</div>';
        echo '<div style="width: 100px;">'.esc_html__('Mês/Dia Início','ch-booking-rules').'</div>';
        echo '<div style="width: 100px;">'.esc_html__('Mês/Dia Fim','ch-booking-rules').'</div>';
        echo '<div style="width: 100px;">'.esc_html__('Min. Noites','ch-booking-rules').'</div>';
        echo '<div>'.esc_html__('Ação','ch-booking-rules').'</div>';
        echo '</div>';


        // CONTAINER ONDE O JAVASCRIPT VAI ADICIONAR AS REGRAS
        echo '<div id="chbr-seasons-container" class="chbr-rules-container">';
        
        foreach ($seasons as $index => $season) {
            $this->render_season_row($index, $season);
        }
        
        echo '</div>'; 
        
        echo '<p><button type="button" class="button chbr-add-rule" data-target="seasons">'.esc_html__('+ Adicionar Nova Época','ch-booking-rules').'</button></p>';
        
        // TEMPLATE
        echo '<template id="chbr-seasons-template">';
        $this->render_season_row('{{INDEX}}', $this->default_season_row());
        echo '</template>';
    }

    private function render_season_row($index, $season){
        $name = esc_attr($season['name'] ?? '');
        $from = esc_attr($season['from'] ?? '');
        $to = esc_attr($season['to'] ?? '');
        $minNights = intval($season['minNights'] ?? 1);
        
        echo '<div class="chbr-rule-row">';
        
        echo '<input type="text" name="seasons['.$index.'][name]" value="'.$name.'" placeholder="'.esc_attr__('Nome da Época','ch-booking-rules').'" style="width: 250px;" required />';
        
        echo '<input type="text" name="seasons['.$index.'][from]" value="'.$from.'" placeholder="'.esc_attr__('MM-DD','ch-booking-rules').'" style="width:100px;" required />';
        
        echo '<input type="text" name="seasons['.$index.'][to]" value="'.$to.'" placeholder="'.esc_attr__('MM-DD','ch-booking-rules').'" style="width:100px;" required />';
        
        echo '<input type="number" name="seasons['.$index.'][minNights]" value="'.$minNights.'" placeholder="'.esc_attr__('Noites','ch-booking-rules').'" style="width:100px;" min="1" required />';
        
        echo '<button type="button" class="button button-secondary chbr-remove-rule">'.esc_html__('Remover','ch-booking-rules').'</button>';
        
        echo '</div>';
    }

    private function default_season_row(){
        return [
            'name' => '', 
            'from' => '', 
            'to' => '', 
            'minNights' => 1
        ];
    }
    
    public function render_promos_tab($cfg){
        $promos = $cfg['promos'] ?? [];
        
        echo '<h2>'.esc_html__('Códigos Promocionais e Descontos','ch-booking-rules').'</h2>';
        echo '<p class="description">'.esc_html__('Defina o nome da campanha, o código promocional, datas de validade (opcional) e o tipo/valor de desconto.','ch-booking-rules').'</p>';

        // Títulos das colunas
        echo '<div style="display: flex; gap: 10px; font-weight: bold; margin-bottom: 5px; align-items: center;">';
        echo '<div style="width: 150px;">'.esc_html__('Nome & Código','ch-booking-rules').'</div>';
        echo '<div style="width: 100px;">'.esc_html__('Mês/Dia Início','ch-booking-rules').'</div>';
        echo '<div style="width: 100px;">'.esc_html__('Mês/Dia Fim','ch-booking-rules').'</div>';
        echo '<div style="width: 150px;">'.esc_html__('Desconto','ch-booking-rules').'</div>';
        echo '<div style="width: 100px;">'.esc_html__('Min. Noites','ch-booking-rules').'</div>';
        echo '<div>'.esc_html__('Ação','ch-booking-rules').'</div>';
        echo '</div>';


        // CONTAINER ONDE O JAVASCRIPT VAI ADICIONar AS REGRAS
        echo '<div id="chbr-promos-container" class="chbr-rules-container">';
        
        foreach ($promos as $index => $promo) {
            $this->render_promo_row($index, $promo);
        }
        
        echo '</div>'; 
        
        // BOTÃO PARA ADICIONAR NOVA REGRA
        echo '<p><button type="button" class="button chbr-add-rule" data-target="promos">'.esc_html__('+ Adicionar Nova Promoção','ch-booking-rules').'</button></p>';
        
        // TEMPLATE
        echo '<template id="chbr-promos-template">';
        $this->render_promo_row('{{INDEX}}', $this->default_promo_row());
        echo '</template>';
    }

    private function render_promo_row($index, $promo){
        $name = esc_attr($promo['name'] ?? '');
        $code = esc_attr($promo['code'] ?? '');
        $from = esc_attr($promo['from'] ?? '');
        $to = esc_attr($promo['to'] ?? '');
        $minNights = intval($promo['minNights'] ?? 1);
        
        $discount_type = esc_attr($promo['discount']['type'] ?? 'percent');
        $discount_value = floatval($promo['discount']['value'] ?? 0);
        
        echo '<div class="chbr-rule-row">';
        
        // Nome e Código (em dois inputs para melhor UX, mas mantendo a estrutura original do JSON)
        echo '<div style="display: flex; flex-direction: column;">';
        echo '<input type="text" name="promos['.$index.'][name]" value="'.$name.'" placeholder="'.esc_attr__('Nome Campanha','ch-booking-rules').'" style="width: 150px; margin-bottom: 5px;" required />';
        echo '<input type="text" name="promos['.$index.'][code]" value="'.$code.'" placeholder="'.esc_attr__('CÓDIGO (Ex: OUTONO25)','ch-booking-rules').'" style="width: 150px; font-weight: bold;" required />';
        echo '</div>';
        
        // Datas
        echo '<input type="text" name="promos['.$index.'][from]" value="'.$from.'" placeholder="'.esc_attr__('MM-DD','ch-booking-rules').'" style="width:100px;" />';
        echo '<input type="text" name="promos['.$index.'][to]" value="'.$to.'" placeholder="'.esc_attr__('MM-DD','ch-booking-rules').'" style="width:100px;" />';
        
        // Desconto
        echo '<div style="display: flex; flex-direction: column;">';
        echo '<select name="promos['.$index.'][discount][type]" style="width: 150px; margin-bottom: 5px;">';
        echo '<option value=\'percent\' '.selected($discount_type, 'percent', false).'>% Percentagem</option>'; 
        echo '<option value=\'fixed\' '.selected($discount_type, 'fixed', false).'>€ Fixo</option>';         
        echo '</select>';
        echo '<input type="number" name="promos['.$index.'][discount][value]" value="'.$discount_value.'" placeholder="'.esc_attr__('Valor','ch-booking-rules').'" style="width:150px;" min="0" required />';
        echo '</div>';

        // Mínimo de Noites
        echo '<input type="number" name="promos['.$index.'][minNights]" value="'.$minNights.'" placeholder="'.esc_attr__('Noites','ch-booking-rules').'" style="width:100px;" min="1" />';
        
        // Campos ocultos necessários para a estrutura JSON original
        echo '<input type="hidden" name="promos['.$index.'][priority]" value="10" />';
        echo '<input type="hidden" name="promos['.$index.'][applyRule]" value="full_stay" />';

        echo '<button type="button" class="button button-secondary chbr-remove-rule">'.esc_html__('Remover','ch-booking-rules').'</button>';
        
        echo '</div>';
    }

    private function default_promo_row(){
        return [
            'name' => '', 
            'from' => '', 
            'to' => '', 
            'discount' => ['type' => 'percent', 'value' => 0],
            'minNights' => 1,
            'priority' => 10,
            'applyRule' => 'full_stay',
            'code' => ''
        ];
    }


    public function admin_version_notice(){
        $screen = get_current_screen();
        if (!$screen || $screen->id !== 'settings_page_ch-booking-rules') return;
        echo '<div class="notice notice-info is-dismissible"><p>';
        echo esc_html__('CH Booking Rules está ativo. Versão: ','ch-booking-rules').'<strong>'.esc_html(self::VER).'</strong>';
        echo '</p></div>';
    }

    public function enqueue_frontend(){
        $cfg = $this->get_config();
        wp_register_script('ch-booking-js', plugins_url('assets/ch-booking.js', __FILE__), ['jquery','jquery-ui-datepicker'], self::VER, true);
        wp_enqueue_script('ch-booking-js');
        wp_localize_script('ch-booking-js', 'CH_BOOKING_CFG', $cfg);

        wp_register_style('ch-booking-style', plugins_url('assets/style.css', __FILE__), [], self::VER);
        wp_enqueue_style('ch-booking-style');
    }
}

new CH_Booking_Rules();