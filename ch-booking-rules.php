<?php
/**
 * Plugin Name: CH Booking Rules
 * Description: Épocas, mínimos e promoções (recorrentes) + código promocional para Fluent Forms.
 * Version: 2.0.3
 * Author: Pedro & ChatGPT & Gemini
 * License: GPLv2 or later
 * Text Domain: ch-booking-rules
 */
if (!defined('ABSPATH')) { exit; }

class CH_Booking_Rules {
    const OPT_KEY = 'ch_booking_rules_cfg';
    const VER = '2.0.3'; // VERSÃO CORRIGIDA

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