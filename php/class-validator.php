<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * CHBR_Validator
 * Responsável por validar datas e regras de reserva.
 */
class CHBR_Validator {

    public static function validate_dates( $check_in, $check_out ) {
        // Exemplo simples: impedir datas no passado
        $today = strtotime( 'today' );

        if ( strtotime( $check_in ) < $today ) {
            return new WP_Error( 'chbr_invalid_checkin', __( 'A data de check-in não pode ser no passado.', 'ch-booking-rules' ) );
        }

clear
exit
cd
cd
ls -la php
