cat > php/helpers.php <<'EOF'
<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Funções utilitárias do plugin
 */

function chbr_format_date( $date ) {
    return date_i18n( get_option( 'date_format' ), strtotime( $date ) );
}
