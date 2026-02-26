<?php

namespace ScrollCrafter\Admin;

if ( ! defined( "ABSPATH" ) ) {
    exit;
}
use ScrollCrafter\Support\Config;

class Settings_Page
{
    private const OPTION_GROUP = 'scrollcrafter_options_group';
    private const OPTION_NAME  = 'scrollcrafter_settings';

    public function hooks(): void
    {
        add_action( 'admin_menu', [ $this, 'add_settings_page' ] );
        add_action( 'admin_init', [ $this, 'register_settings' ] );
        add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_admin_assets' ] );
    }

    public function add_settings_page(): void
    {
        add_options_page(
            'ScrollCrafter Settings',
            'ScrollCrafter',
            'manage_options',
            'scrollcrafter',
            [ $this, 'render_page' ]
        );
    }


    public function enqueue_admin_assets( $hook ): void
    {
        if ( $hook !== 'settings_page_scrollcrafter' ) {
            return;
        }

        wp_enqueue_style(
            'scrollcrafter-admin',
            SCROLLCRAFTER_URL . 'assets/css/scrollcrafter-admin.css',
            [],
            SCROLLCRAFTER_VERSION
        );
    }

    public function register_settings(): void
    {
        register_setting(
            self::OPTION_GROUP,
            self::OPTION_NAME,
            [
                'type'              => 'array',
                'sanitize_callback' => [ $this, 'sanitize_settings' ],
            ]
        );
    }

    public function sanitize_settings( $input ): array
    {
        $output = [];

        $output['debug_mode'] = isset( $input['debug_mode'] ) && '1' === $input['debug_mode'];

        $raw_bp = $input['custom_breakpoints'] ?? '';
        $bp_array = [];
        if ( ! empty( $raw_bp ) ) {
            $lines = explode( "\n", $raw_bp );
            foreach ( $lines as $line ) {
                $line = trim( $line );
                if ( empty( $line ) ) continue;
                
                $parts = explode( ':', $line, 2 );
                if ( count( $parts ) === 2 ) {
                    $key = trim( $parts[0] );
                    $val_raw = trim( $parts[1] );
                    
                    $is_strict = false;
                    if ( stripos( $val_raw, 'strict' ) !== false ) {
                        $is_strict = true;
                        $val_raw = str_ireplace( 'strict', '', $val_raw );
                    }
                    
                    $val = (int) $val_raw;
                    
                    if ( $key && $val > 0 ) {
                        $bp_array[ $key ] = [
                            'width'  => $val,
                            'strict' => $is_strict
                        ];
                    }
                }
            }
        }
        
        $output['custom_breakpoints'] = $bp_array;

        $allowed_modes = [ 'local', 'cdn' ];
        $output['gsap_mode'] = in_array( $input['gsap_mode'] ?? '', $allowed_modes, true ) ? $input['gsap_mode'] : 'local';
        $output['enable_editor_animations'] = isset( $input['enable_editor_animations'] ) && '1' === $input['enable_editor_animations'];
        $output['client_mode'] = isset( $input['client_mode'] ) && '1' === $input['client_mode'];

        $output['smooth_scroll'] = isset( $input['smooth_scroll'] ) && '1' === $input['smooth_scroll'];
        $output['smooth_scroll_lerp'] = isset( $input['smooth_scroll_lerp'] ) ? floatval( $input['smooth_scroll_lerp'] ) : 0.1;

        return $output;
    }

    public function render_page(): void
    {
        if ( ! current_user_can( 'manage_options' ) ) return;
        
        $config = Config::instance();
        $client_mode = (bool) $config->get( 'client_mode', false );
        $active_tab = isset( $_GET['tab'] ) ? sanitize_key( $_GET['tab'] ) : 'general';

        // In client mode, redirect away from hidden tabs
        if ( $client_mode && in_array( $active_tab, ['support'], true ) ) {
            $active_tab = 'general';
        }

        $is_settings_tab = in_array( $active_tab, ['general', 'breakpoints', 'performance'], true );
        ?>
        <div class="sc-settings-wrap">
            <?php $this->render_header(); ?>
            
            <?php $this->render_tabs( $active_tab ); ?>
            
            <?php if ( $is_settings_tab ) : ?>
            <form action="options.php" method="post">
                <?php settings_fields( self::OPTION_GROUP ); ?>
                
                <div class="sc-layout">
                    <div class="sc-main">
                        <?php $this->render_tab_general( $config, $active_tab ); ?>
                        <?php $this->render_tab_breakpoints( $config, $active_tab ); ?>
                        <?php $this->render_tab_performance( $config, $active_tab ); ?>
                        
                        <div class="sc-submit">
                            <?php submit_button( __( 'Save Changes', 'scrollcrafter' ), 'primary', 'submit', false ); ?>
                        </div>
                    </div>
                    
                    <div class="sc-sidebar">
                        <?php $this->render_sidebar(); ?>
                    </div>
                </div>
            </form>
            <?php else : ?>
            <div class="sc-layout">
                <div class="sc-main">
                    <?php $this->render_tab_support( $active_tab ); ?>
                </div>
                <div class="sc-sidebar">
                    <?php $this->render_sidebar(); ?>
                </div>
            </div>
            <?php endif; ?>
        </div>
        <?php
    }

    private function render_header(): void
    {
        ?>
        <div class="sc-settings-header">
            <h1><img src="<?php echo esc_url( SCROLLCRAFTER_URL . 'assets/img/logo.png' ); ?>" alt="ScrollCrafter" class="sc-header-logo"><?php esc_html_e( 'ScrollCrafter', 'scrollcrafter' ); ?></h1>
            <a href="https://buymeacoffee.com/pixelmobs" target="_blank" class="sc-license-badge donation">
                <span class="dashicons dashicons-heart"></span>
                <?php esc_html_e( 'Support Project', 'scrollcrafter' ); ?>
            </a>
        </div>
        <?php
    }

    private function render_tabs( string $active_tab ): void
    {
        $client_mode_tabs = (bool) Config::instance()->get( 'client_mode', false );

        $tabs = [
            'general'     => [ 'icon' => 'admin-generic', 'label' => __( 'General', 'scrollcrafter' ) ],
            'breakpoints' => [ 'icon' => 'smartphone', 'label' => __( 'Breakpoints', 'scrollcrafter' ) ],
            'performance' => [ 'icon' => 'performance', 'label' => __( 'Performance', 'scrollcrafter' ) ],
        ];

        if ( ! $client_mode_tabs ) {
            $tabs['support'] = [ 'icon' => 'editor-help', 'label' => __( 'Support', 'scrollcrafter' ) ];
        }
        ?>
        <div class="sc-tabs">
            <?php foreach ( $tabs as $slug => $tab ) : ?>
                <a href="<?php echo esc_url( add_query_arg( 'tab', $slug ) ); ?>" 
                   class="sc-tab <?php echo $active_tab === $slug ? 'active' : ''; ?>">
                    <span class="dashicons dashicons-<?php echo esc_attr( $tab['icon'] ); ?>"></span>
                    <?php echo esc_html( $tab['label'] ); ?>
                </a>
            <?php endforeach; ?>
        </div>
        <?php
    }

    private function render_tab_general( Config $config, string $active_tab ): void
    {
        $class = $active_tab === 'general' ? 'active' : '';
        ?>
        <div class="sc-tab-content <?php echo $class; ?>" data-tab="general">
            <div class="sc-card">
                <div class="sc-card-header">
                    <div class="sc-card-icon"><span class="dashicons dashicons-admin-tools"></span></div>
                    <div>
                        <h3 class="sc-card-title"><?php esc_html_e( 'Debug Mode', 'scrollcrafter' ); ?></h3>
                        <p class="sc-card-desc"><?php esc_html_e( 'Enable debugging tools for development', 'scrollcrafter' ); ?></p>
                    </div>
                </div>
                <div class="sc-field">
                    <label class="sc-toggle">
                        <input type="checkbox" name="<?php echo self::OPTION_NAME; ?>[debug_mode]" value="1" <?php checked( $config->is_debug() ); ?>>
                        <span class="sc-toggle-track"></span>
                        <span class="sc-toggle-label"><?php esc_html_e( 'Enable Debug Mode', 'scrollcrafter' ); ?></span>
                    </label>
                    <p class="sc-field-desc"><?php esc_html_e( 'Shows GSAP ScrollTrigger markers on frontend and enables detailed console logging.', 'scrollcrafter' ); ?></p>
                </div>
            </div>

            <div class="sc-card">
                <div class="sc-card-header">
                    <div class="sc-card-icon"><span class="dashicons dashicons-edit"></span></div>
                    <div>
                        <h3 class="sc-card-title"><?php esc_html_e( 'Editor Preview', 'scrollcrafter' ); ?></h3>
                        <p class="sc-card-desc"><?php esc_html_e( 'Live animation preview in Elementor', 'scrollcrafter' ); ?></p>
                    </div>
                </div>
                <div class="sc-field">
                    <label class="sc-toggle">
                        <input type="checkbox" name="<?php echo self::OPTION_NAME; ?>[enable_editor_animations]" value="1" <?php checked( $config->get( 'enable_editor_animations' ) ); ?>>
                        <span class="sc-toggle-track"></span>
                        <span class="sc-toggle-label"><?php esc_html_e( 'Enable Editor Animations', 'scrollcrafter' ); ?></span>
                    </label>
                    <p class="sc-field-desc"><?php esc_html_e( 'Play animations live inside Elementor Editor. May affect editor performance on complex pages.', 'scrollcrafter' ); ?></p>
                </div>
            </div>

            <div class="sc-card">
                <div class="sc-card-header">
                    <div class="sc-card-icon"><span class="dashicons dashicons-businessman"></span></div>
                    <div>
                        <h3 class="sc-card-title"><?php esc_html_e( 'Client Mode', 'scrollcrafter' ); ?></h3>
                        <p class="sc-card-desc"><?php esc_html_e( 'Hide developer-facing options for client handoff', 'scrollcrafter' ); ?></p>
                    </div>
                </div>
                <div class="sc-field">
                    <label class="sc-toggle">
                        <input type="checkbox" name="<?php echo self::OPTION_NAME; ?>[client_mode]" value="1" <?php checked( $config->get( 'client_mode', false ) ); ?>>
                        <span class="sc-toggle-track"></span>
                        <span class="sc-toggle-label"><?php esc_html_e( 'Enable Client Mode', 'scrollcrafter' ); ?></span>
                    </label>
                    <p class="sc-field-desc"><?php esc_html_e( 'Hides the Support tab and other developer-facing sections. Ideal for agencies delivering sites to clients.', 'scrollcrafter' ); ?></p>
                </div>
            </div>

            <!-- Smooth Scroll Settings -->
            <?php
            $smooth_enabled = $config->get( 'smooth_scroll', false );
            $smooth_lerp = $config->get( 'smooth_scroll_lerp', 0.1 );
            ?>
            <div class="sc-card">
                <div class="sc-card-header">
                    <div class="sc-card-icon"><span class="dashicons dashicons-controls-play"></span></div>
                    <div>
                        <h3 class="sc-card-title"><?php esc_html_e( 'Smooth Scroll', 'scrollcrafter' ); ?></h3>
                        <p class="sc-card-desc"><?php esc_html_e( 'Buttery smooth scrolling powered by Lenis', 'scrollcrafter' ); ?></p>
                    </div>
                </div>
                <div class="sc-field">
                    <label class="sc-toggle">
                        <input type="checkbox" name="<?php echo self::OPTION_NAME; ?>[smooth_scroll]" value="1" <?php checked( $smooth_enabled ); ?>>
                        <span class="sc-toggle-track"></span>
                        <span class="sc-toggle-label"><?php esc_html_e( 'Enable Smooth Scroll', 'scrollcrafter' ); ?></span>
                    </label>
                    <p class="sc-field-desc"><?php esc_html_e( 'Adds inertia-based scrolling. Makes scroll-linked animations feel smooth on Windows and all browsers.', 'scrollcrafter' ); ?></p>
                </div>
                 <div class="sc-field" style="margin-top: 16px;">
                    <label class="sc-field-label"><?php esc_html_e( 'Smoothness (lerp)', 'scrollcrafter' ); ?></label>
                    <input type="number" name="<?php echo self::OPTION_NAME; ?>[smooth_scroll_lerp]" value="<?php echo esc_attr( $smooth_lerp ); ?>" min="0.01" max="1" step="0.01" class="sc-input-number">
                    <p class="sc-field-desc"><?php esc_html_e( 'Lower = smoother but more laggy. Recommended: 0.08 - 0.12', 'scrollcrafter' ); ?></p>
                </div>
            </div>

            <!-- Advanced Documentation -->
            <div class="sc-card">
                <div class="sc-card-header">
                    <div class="sc-card-icon"><span class="dashicons dashicons-visibility"></span></div>
                    <div>
                        <h3 class="sc-card-title"><?php esc_html_e( 'Special Condition Tags', 'scrollcrafter' ); ?></h3>
                        <p class="sc-card-desc"><?php esc_html_e( 'Advanced responsive conditions', 'scrollcrafter' ); ?></p>
                    </div>
                </div>
                <div class="sc-field">
                    <p><?php esc_html_e( 'You can use these special tags in responsive conditions:', 'scrollcrafter' ); ?></p>
                    <ul style="margin: 12px 0 0 20px; list-style: disc;">
                        <li><code>@dark</code> — <?php esc_html_e( 'User prefers dark color scheme', 'scrollcrafter' ); ?></li>
                        <li><code>@retina</code> — <?php esc_html_e( 'High DPI display (2x+)', 'scrollcrafter' ); ?></li>
                        <li><code>@no-hover</code> — <?php esc_html_e( 'Touch device (no hover capability)', 'scrollcrafter' ); ?></li>
                    </ul>
                </div>
            </div>
        </div>
        <?php
    }

    private function render_tab_breakpoints( Config $config, string $active_tab ): void
    {
        $class = $active_tab === 'breakpoints' ? 'active' : '';
        $custom = $config->get( 'custom_breakpoints', [] );
        $text = '';
        if ( is_array( $custom ) ) {
            foreach ( $custom as $k => $v ) {
                if (is_array($v)) {
                   $width = $v['width'];
                   $strict = !empty($v['strict']) ? ' strict' : '';
                   $text .= "$k: $width$strict\n";
                } else {
                   $text .= "$k: $v\n";
                }
            }
        }
        ?>
        <div class="sc-tab-content <?php echo $class; ?>" data-tab="breakpoints">

            <div class="sc-card">
                <div class="sc-card-header">
                    <div class="sc-card-icon"><span class="dashicons dashicons-smartphone"></span></div>
                    <div>
                        <h3 class="sc-card-title"><?php esc_html_e( 'Custom Breakpoints', 'scrollcrafter' ); ?></h3>
                        <p class="sc-card-desc"><?php esc_html_e( 'Define your own responsive breakpoints', 'scrollcrafter' ); ?></p>
                    </div>
                </div>
                <div class="sc-field">
                    <p class="sc-field-desc" style="margin-bottom: 12px;">
                        <?php esc_html_e( 'Format: slug: width [strict]. Example:', 'scrollcrafter' ); ?><br>
                        <code>mobile: 768</code><br>
                        <code>tablet: 1024 strict</code>
                    </p>
                    <textarea name="<?php echo self::OPTION_NAME; ?>[custom_breakpoints]" 
                              rows="5" 
                              class="sc-textarea" 
                              placeholder="<?php echo esc_attr__( "mobile: 768\ntablet: 1024 strict", 'scrollcrafter' ); ?>"><?php echo esc_textarea( $text ); ?></textarea>
                    <p class="sc-field-desc"><?php esc_html_e( 'If empty, breakpoints from Elementor will be used automatically.', 'scrollcrafter' ); ?></p>
                </div>
            </div>
        </div>
        <?php
    }

    private function render_tab_performance( Config $config, string $active_tab ): void
    {
        $class = $active_tab === 'performance' ? 'active' : '';
        $current_mode = $config->get_gsap_mode();
        ?>
        <div class="sc-tab-content <?php echo $class; ?>" data-tab="performance">
            <div class="sc-card">
                <div class="sc-card-header">
                    <div class="sc-card-icon"><span class="dashicons dashicons-database"></span></div>
                    <div>
                        <h3 class="sc-card-title"><?php esc_html_e( 'GSAP Source', 'scrollcrafter' ); ?></h3>
                        <p class="sc-card-desc"><?php esc_html_e( 'Choose how GSAP library is loaded', 'scrollcrafter' ); ?></p>
                    </div>
                </div>
                <div class="sc-field">
                    <select name="<?php echo self::OPTION_NAME; ?>[gsap_mode]" class="sc-select">
                        <option value="local" <?php selected( $current_mode, 'local' ); ?>><?php esc_html_e( 'Local (bundled with plugin)', 'scrollcrafter' ); ?></option>
                        <option value="cdn" <?php selected( $current_mode, 'cdn' ); ?>><?php esc_html_e( 'CDN (jsDelivr)', 'scrollcrafter' ); ?></option>
                    </select>
                    <p class="sc-field-desc"><?php esc_html_e( 'CDN offers faster global delivery but requires external connection. Local is recommended for GDPR compliance.', 'scrollcrafter' ); ?></p>
                </div>
            </div>
        </div>
        <?php
    }


    private function render_sidebar(): void
    {
        ?>
        <div class="sc-card">
            <div class="sc-card-header">
                <div class="sc-card-icon"><span class="dashicons dashicons-book"></span></div>
                <div>
                    <h3 class="sc-card-title"><?php esc_html_e( 'Resources', 'scrollcrafter' ); ?></h3>
                </div>
            </div>
            <ul class="sc-sidebar-links">
                <li>
                    <a href="https://github.com/scrollcrafter/docs" target="_blank">
                        <span class="dashicons dashicons-book"></span>
                        <?php esc_html_e( 'Documentation', 'scrollcrafter' ); ?>
                    </a>
                </li>
                <li>
                    <a href="https://github.com/scrollcrafter/scrollcrafter/issues" target="_blank">
                        <span class="dashicons dashicons-sos"></span>
                        <?php esc_html_e( 'Get Support', 'scrollcrafter' ); ?>
                    </a>
                </li>
                <li>
                    <a href="https://github.com/scrollcrafter/scrollcrafter/releases" target="_blank">
                        <span class="dashicons dashicons-update"></span>
                        <?php esc_html_e( 'Changelog', 'scrollcrafter' ); ?>
                    </a>
                </li>
                <li>
                    <a href="https://gsap.com/docs/v3/" target="_blank">
                        <span class="dashicons dashicons-external"></span>
                        <?php esc_html_e( 'GSAP Docs', 'scrollcrafter' ); ?>
                    </a>
                </li>
            </ul>
            <div class="sc-version">
                ScrollCrafter v<?php echo esc_html( SCROLLCRAFTER_VERSION ); ?>
            </div>
        </div>
        <?php
    }


    private function render_tab_support( string $active_tab ): void
    {
        if ( $active_tab !== 'support' ) return;
        ?>
        <div class="sc-tab-content active" data-tab="support">
            <div class="sc-card">
                <div class="sc-card-header">
                    <div class="sc-card-icon"><span class="dashicons dashicons-editor-help"></span></div>
                    <div>
                        <h3 class="sc-card-title"><?php esc_html_e( 'Get Help', 'scrollcrafter' ); ?></h3>
                        <p class="sc-card-desc"><?php esc_html_e( 'Need assistance? We\'re here to help.', 'scrollcrafter' ); ?></p>
                    </div>
                </div>
                <div class="sc-field">
                    <div class="sc-support-options">
                        <div class="sc-support-option">
                            <span class="dashicons dashicons-book"></span>
                            <div>
                                <h4><?php esc_html_e( 'Documentation', 'scrollcrafter' ); ?></h4>
                                <p><?php esc_html_e( 'Browse guides, tutorials, and DSL syntax reference.', 'scrollcrafter' ); ?></p>
                                <a href="https://docs.pixelmobs.com/scrollcrafter" target="_blank" class="button"><?php esc_html_e( 'View Docs', 'scrollcrafter' ); ?></a>
                            </div>
                        </div>
                        <div class="sc-support-option">
                            <span class="dashicons dashicons-sos"></span>
                            <div>
                                <h4><?php esc_html_e( 'Support Project', 'scrollcrafter' ); ?></h4>
                                <p><?php esc_html_e( 'ScrollCrafter is now fully open-source. Support our development!', 'scrollcrafter' ); ?></p>
                                <a href="https://buymeacoffee.com/pixelmobs" target="_blank" class="button button-primary"><?php esc_html_e( 'Buy me a coffee', 'scrollcrafter' ); ?></a>
                            </div>
                        </div>
                        <div class="sc-support-option">
                            <span class="dashicons dashicons-groups"></span>
                            <div>
                                <h4><?php esc_html_e( 'Community', 'scrollcrafter' ); ?></h4>
                                <p><?php esc_html_e( 'Join the discussion and share your animations.', 'scrollcrafter' ); ?></p>
                                <a href="https://wordpress.org/support/plugin/scrollcrafter/" target="_blank" class="button"><?php esc_html_e( 'WP Forum', 'scrollcrafter' ); ?></a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <?php
    }
}
