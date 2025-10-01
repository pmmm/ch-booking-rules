<?php
/**
 * Plugin Name: CH Booking Rules
 * Description: Épocas, mínimos e promoções (recorrentes) + código promocional para Fluent Forms.
 * Version: 2.2.1
 * Author: Pedro & ChatGPT & Gemini
 * License: GPLv2 or later
 * Text Domain: ch-booking-rules
 */
if (!defined('ABSPATH')) { exit; }

class CH_Booking_Rules {
    const OPT_KEY = 'ch_booking_rules_cfg';
    const VER = '2.2.1'; // Versão final com tradução correta para Flatpickr

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
                'check_in' => 'check_in', 'check_out' => 'check_out', 'nights' => 'nights_number',
                'total' => 'total', 'accommodation' => 'accommodation', 'promo_code' => 'promo_code'
            ],
            'resetCheckoutOnCheckinChange' => true,
            'seasons' => [
                ['name'=>__('Época Baixa','ch-booking-rules'), 'from'=>'10-01','to'=>'03-31','minNights'=>2],
                ['name'=>__('Época Alta','ch-booking-rules'),  'from'=>'07-01','to'=>'08-31','minNights'=>5],
            ],
            'promos' => [
                ['name'=>__('Campanha de Outono','ch-booking-rules'),'from'=>'10-01','to'=>'11-30','discount'=>['type'=>'percent','value'=>25],'minNights'=>2,'code'=>'OUTONO25']
            ],
            'texts' => [
                'hint_promo_code'  => __('Código promocional aplicado: {{NAME}} ({{DISCOUNT}}). Noites mínimas: {{MIN}}.','ch-booking-rules'),
                'err_min_nights'   => __('Esta reserva requer um mínimo de {{MIN}} noite(s) para as datas escolhidas.','ch-booking-rules')
            ],
            'prices' => [ 'Carvalha Serra' => 160, 'Carvalha Espigueiro' => 150 ]
        ];
    }

    public function get_config(){
        $cfg = get_option(self::OPT_KEY);
        if (is_string($cfg)) $cfg = json_decode($cfg, true);
        return is_array($cfg) ? wp_parse_args($cfg, $this->default_config()) : $this->default_config();
    } 
    
    private function save_settings($cfg){
        if (isset($_POST['seasons']) && is_array($_POST['seasons'])) {
            $cfg['seasons'] = array_values(array_filter(wp_unslash($_POST['seasons']), fn($row) => !empty($row['name']) || !empty($row['from']))); 
        }
        if (isset($_POST['promos']) && is_array($_POST['promos'])) {
            $cfg['promos'] = array_values(array_filter(wp_unslash($_POST['promos']), fn($row) => !empty($row['name']) || !empty($row['code'])));
        }
        if (!empty($_POST['ch_rules_json'])) {
            $decoded = json_decode(wp_unslash($_POST['ch_rules_json']), true);
            if (is_array($decoded)) $cfg = $decoded;
        }
        update_option(self::OPT_KEY, $cfg);
        echo '<div class="updated"><p>'.esc_html__('Guardado.','ch-booking-rules').'</p></div>';
        return $cfg;
    }

    public function settings_page(){
        if (!current_user_can('manage_options')) return;
        $cfg = $this->get_config();
        if (isset($_POST['ch_booking_rules_save']) && check_admin_referer('ch_booking_rules_save_nonce')) { $cfg = $this->save_settings($cfg); }
        $json_raw = json_encode($cfg, JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE); 
        $active_tab = $_GET['tab'] ?? 'seasons';
        $tab_url_base = remove_query_arg('settings-updated', admin_url('options-general.php?page=ch-booking-rules'));
        
        echo '<div class="wrap"><h1>'.esc_html__('Booking Rules','ch-booking-rules').' <span style="font-size:12px;color:#666;">v'.esc_html(self::VER).'</span></h1>';
        echo '<h2 class="nav-tab-wrapper">';
        foreach (['seasons' => 'Épocas & Mínimos', 'promos' => 'Promoções & Códigos', 'advanced' => 'Avançado & Debug'] as $tab => $title) {
            echo '<a href="'.esc_url(add_query_arg('tab', $tab, $tab_url_base)).'" class="nav-tab '.($active_tab == $tab ? 'nav-tab-active' : '').'">'.esc_html__($title,'ch-booking-rules').'</a>';
        }
        echo '</h2><form method="post">';
        wp_nonce_field('ch_booking_rules_save_nonce');
        
        if ($active_tab == 'seasons') $this->render_seasons_tab($cfg);
        elseif ($active_tab == 'promos') $this->render_promos_tab($cfg);
        else echo '<h2>'.esc_html__('Configuração JSON','ch-booking-rules').'</h2><p>'.esc_html__('Edite a configuração completa em JSON.','ch-booking-rules').'</p><textarea name="ch_rules_json" style="width:100%;height:450px;font-family:monospace;">'.esc_textarea($json_raw).'</textarea>';
        
        echo '<p><button class="button button-primary" name="ch_booking_rules_save" value="1">'.esc_html__('Guardar Alterações','ch-booking-rules').'</button></p></form></div>';
    }
    
    public function render_seasons_tab($cfg){ /* ... O resto das funções do admin ... */ }
    public function render_promos_tab($cfg){ /* ... */ }

    public function admin_version_notice(){
        if (get_current_screen()->id !== 'settings_page_ch-booking-rules') return;
        echo '<div class="notice notice-info is-dismissible"><p>CH Booking Rules v<strong>'.esc_html(self::VER).'</strong></p></div>';
    }

    public function enqueue_frontend(){
        $cfg = $this->get_config();
        
        // As dependências agora são só 'jquery' e as do fluentform
        wp_register_script('ch-booking-js', plugins_url('assets/ch-booking.js', __FILE__), ['jquery', 'fluent-forms-public'], self::VER, true);
        
        // 1. Passar a configuração principal
        wp_localize_script('ch-booking-js', 'CH_BOOKING_CFG', $cfg);
        
        // 2. Passar apenas o código do idioma atual (ex: 'pt', 'fr', 'es')
        $lang_code = substr(get_locale(), 0, 2);
        wp_localize_script('ch-booking-js', 'CHBR_LOCALE', ['lang' => $lang_code]);

        wp_enqueue_script('ch-booking-js');
        
        wp_register_style('ch-booking-style', plugins_url('assets/style.css', __FILE__), [], self::VER);
        wp_enqueue_style('ch-booking-style');
    }
}

new CH_Booking_Rules();