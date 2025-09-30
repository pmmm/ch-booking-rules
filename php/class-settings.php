cat > php/class-settings.php <<'EOF'
<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * CHBR_Settings
 * Responsável pela página de configurações do plugin no WP Admin.
 */
class CHBR_Settings {

    public static function init() {
        add_action( 'admin_menu', array( __CLASS__, 'add_menu' ) );
    }

    public static function add_menu() {
        add_options_page(
            'CH Booking Rules',
            'CH Booking Rules',
            'manage_options',
            'ch-booking-rules',
            array( __CLASS__, 'render_settings_page' )
        );
    }

    public static function render_settings_page() {
        ?>
        <div class="wrap">
            <h1>Configurações — CH Booking Rules</h1>
            <p>Aqui no futuro vais poder configurar épocas, nº mínimo de noites, etc.</p>
        </div>
        <?php
    }
}

CHBR_Settings::init();
EOF
