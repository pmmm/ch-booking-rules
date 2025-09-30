<?php
/**
 * Plugin Name: CH Booking Rules
 * Description: Épocas, mínimos e promoções (recorrentes) + código promocional para Fluent Forms. v1.3.5: preço por noite visível ao escolher alojamento + melhorias de datas e validação.
 * Version: 1.3.5
 * Author: Pedro & ChatGPT
 * License: GPLv2 or later
 * Text Domain: ch-booking-rules
 */
if (!defined('ABSPATH')) { exit; }

class CH_Booking_Rules {
    const OPT_KEY = 'ch_booking_rules_cfg';
    const VER = '1.3.5';

    public function __construct(){
        add_action('admin_menu', [$this, 'admin_menu']);
        add_action('admin_init', [$this, 'register_settings']);
        add_action('wp_enqueue_scripts', [$this, 'enqueue_frontend']);
        add_action('admin_notices', [$this, 'admin_version_notice']);
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

    public function settings_page(){
        if (!current_user_can('manage_options')) return;
        $cfg = $this->get_config();
        if (isset($_POST['ch_booking_rules_save']) && check_admin_referer('ch_booking_rules_save_nonce')) {
            $raw = wp_unslash($_POST['ch_rules_json'] ?? '');
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                update_option(self::OPT_KEY, $decoded);
                $cfg = $decoded;
                echo '<div class="updated"><p>'.esc_html__('Guardado.','ch-booking-rules').'</p></div>';
            } else {
                echo '<div class="error"><p>'.esc_html__('JSON inválido — não guardado.','ch-booking-rules').'</p></div>';
            }
        }
        $json = esc_textarea(json_encode($cfg, JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE));
        echo '<div class="wrap">';
        echo '<h1>'.esc_html__('Booking Rules','ch-booking-rules').' <span style="font-size:12px;color:#666;">v'.esc_html(self::VER).'</span></h1>';
        echo '<p>'.esc_html__('Edite a configuração em JSON (recorrente por ano).','ch-booking-rules').'</p>';
        echo '<form method="post">';
        wp_nonce_field('ch_booking_rules_save_nonce');
        echo '<textarea name="ch_rules_json" style="width:100%;height:520px;font-family:monospace;">'.$json.'</textarea>';
        echo '<p><button class="button button-primary" name="ch_booking_rules_save" value="1">'.esc_html__('Guardar','ch-booking-rules').'</button></p>';
        echo '<p><em>'.esc_html__('Dica: Não é necessário Custom JS no Fluent Forms.','ch-booking-rules').'</em></p>';
        echo '</form></div>';
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
        wp_register_script('ch-booking-js', plugins_url('assets/ch-booking.v1.3.5.js', __FILE__), ['jquery'], '1.3.5', true);
        wp_enqueue_script('ch-booking-js');
        wp_localize_script('ch-booking-js', 'CH_BOOKING_CFG', $cfg);

        wp_register_style('ch-booking-style', plugins_url('assets/style.css', __FILE__), [], '1.3.5');
        wp_enqueue_style('ch-booking-style');
    }
}

new CH_Booking_Rules();
