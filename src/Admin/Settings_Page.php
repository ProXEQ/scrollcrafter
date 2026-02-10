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
        $this->hide_freemius_submenus();
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

    private function hide_freemius_submenus(): void
    {
        $fs = scr_fs();
        if ( ! $fs ) return;

        $fs->add_filter( 'is_submenu_visible', function ( $is_visible, $menu_id ) {
            if ( in_array( $menu_id, [ 'account', 'contact', 'support', 'pricing' ], true ) ) {
                return false;
            }
            return $is_visible;
        }, 10, 2 );
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
        
        if ( sc_is_pro() ) {
            $output['custom_breakpoints'] = $bp_array;
        } else {
            $output['custom_breakpoints'] = [];
        }

        $allowed_modes = [ 'local', 'cdn' ];
        $output['gsap_mode'] = in_array( $input['gsap_mode'] ?? '', $allowed_modes, true ) ? $input['gsap_mode'] : 'local';
        $output['enable_editor_animations'] = isset( $input['enable_editor_animations'] ) && '1' === $input['enable_editor_animations'];
        $output['client_mode'] = isset( $input['client_mode'] ) && '1' === $input['client_mode'];

        if ( sc_is_pro() ) {
            $output['smooth_scroll'] = isset( $input['smooth_scroll'] ) && '1' === $input['smooth_scroll'];
            $output['smooth_scroll_lerp'] = isset( $input['smooth_scroll_lerp'] ) ? floatval( $input['smooth_scroll_lerp'] ) : 0.1;
        } else {
            $output['smooth_scroll'] = false;
            $output['smooth_scroll_lerp'] = 0.1;
        }

        return $output;
    }

    public function render_page(): void
    {
        if ( ! current_user_can( 'manage_options' ) ) return;
        
        $config = Config::instance();
        $is_pro = sc_is_pro();
        $client_mode = (bool) $config->get( 'client_mode', false );
        $active_tab = isset( $_GET['tab'] ) ? sanitize_key( $_GET['tab'] ) : 'general';

        // In client mode, redirect away from hidden tabs
        if ( $client_mode && in_array( $active_tab, ['account', 'support', 'pro'], true ) ) {
            $active_tab = 'general';
        }

        $is_settings_tab = in_array( $active_tab, ['general', 'breakpoints', 'performance', 'pro'], true );
        ?>
        <div class="sc-settings-wrap">
            <?php $this->render_header( $is_pro ); ?>
            
            <?php $this->render_tabs( $active_tab ); ?>
            
            <?php if ( $is_settings_tab ) : ?>
            <form action="options.php" method="post">
                <?php settings_fields( self::OPTION_GROUP ); ?>
                
                <div class="sc-layout">
                    <div class="sc-main">
                        <?php $this->render_tab_general( $config, $active_tab ); ?>
                        <?php $this->render_tab_breakpoints( $config, $is_pro, $active_tab ); ?>
                        <?php $this->render_tab_performance( $config, $active_tab ); ?>
                        <?php $this->render_tab_pro( $config, $is_pro, $active_tab ); ?>
                        
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
                    <?php $this->render_tab_account( $active_tab ); ?>
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

    private function render_header( bool $is_pro ): void
    {
        ?>
        <div class="sc-settings-header">
            <h1><img src="<?php echo esc_url( SCROLLCRAFTER_URL . 'assets/img/logo.png' ); ?>" alt="ScrollCrafter" class="sc-header-logo"><?php esc_html_e( 'ScrollCrafter', 'scrollcrafter' ); ?></h1>
            <?php $client_mode_header = (bool) Config::instance()->get( 'client_mode', false ); ?>
            <?php if ( $is_pro ) : ?>
                <span class="sc-license-badge pro">
                    <span class="dashicons dashicons-yes-alt"></span>
                    <?php esc_html_e( 'Pro Active', 'scrollcrafter' ); ?>
                </span>
            <?php elseif ( ! $client_mode_header ) : ?>
                <a href="<?php echo esc_url( scr_fs()->get_upgrade_url() ); ?>" class="sc-license-badge free">
                    <span class="dashicons dashicons-star-filled"></span>
                    <?php esc_html_e( 'Upgrade to Pro', 'scrollcrafter' ); ?>
                </a>
            <?php endif; ?>
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
            $tabs['pro']     = [ 'icon' => 'star-filled', 'label' => __( 'Pro Features', 'scrollcrafter' ) ];
            $tabs['account'] = [ 'icon' => 'admin-users', 'label' => __( 'Account', 'scrollcrafter' ) ];
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
                    <p class="sc-field-desc"><?php esc_html_e( 'Hides Account, Support, Pro Features tabs and upgrade prompts. Ideal for agencies delivering sites to clients.', 'scrollcrafter' ); ?></p>
                </div>
            </div>
        </div>
        <?php
    }

    private function render_tab_breakpoints( Config $config, bool $is_pro, string $active_tab ): void
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
            <?php if ( ! $is_pro ) : ?>
            <div class="sc-pro-banner">
                <span class="sc-pro-banner-icon"><span class="dashicons dashicons-star-filled"></span></span>
                <div class="sc-pro-banner-content">
                    <h4 class="sc-pro-banner-title"><?php esc_html_e( 'Pro Feature', 'scrollcrafter' ); ?></h4>
                    <p class="sc-pro-banner-desc"><?php esc_html_e( 'Custom breakpoints are only available in ScrollCrafter Pro.', 'scrollcrafter' ); ?></p>
                </div>
                <a href="<?php echo esc_url( scr_fs()->get_upgrade_url() ); ?>" class="button button-primary"><?php esc_html_e( 'Upgrade', 'scrollcrafter' ); ?></a>
            </div>
            <?php endif; ?>

            <div class="sc-card">
                <div class="sc-card-header">
                    <div class="sc-card-icon"><span class="dashicons dashicons-smartphone"></span></div>
                    <div>
                        <h3 class="sc-card-title"><?php esc_html_e( 'Custom Breakpoints', 'scrollcrafter' ); ?> <?php if ( ! $is_pro ) : ?><span class="sc-pro-badge">PRO</span><?php endif; ?></h3>
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
                              <?php disabled( ! $is_pro ); ?> 
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

    private function render_tab_pro( Config $config, bool $is_pro, string $active_tab ): void
    {
        $class = $active_tab === 'pro' ? 'active' : '';
        $smooth_enabled = $config->get( 'smooth_scroll', false );
        $smooth_lerp = $config->get( 'smooth_scroll_lerp', 0.1 );
        ?>
        <div class="sc-tab-content <?php echo $class; ?>" data-tab="pro">
            <?php if ( ! $is_pro ) : ?>
            <div class="sc-pro-banner">
                <span class="sc-pro-banner-icon"><span class="dashicons dashicons-awards"></span></span>
                <div class="sc-pro-banner-content">
                    <h4 class="sc-pro-banner-title"><?php esc_html_e( 'Unlock Pro Features', 'scrollcrafter' ); ?></h4>
                    <p class="sc-pro-banner-desc"><?php esc_html_e( 'Get smooth scroll, special condition tags, custom breakpoints, and priority support.', 'scrollcrafter' ); ?></p>
                </div>
                <a href="<?php echo esc_url( scr_fs()->get_upgrade_url() ); ?>" class="button button-primary"><?php esc_html_e( 'Upgrade to Pro', 'scrollcrafter' ); ?></a>
            </div>
            <?php endif; ?>

            <div class="sc-card">
                <div class="sc-card-header">
                    <div class="sc-card-icon"><span class="dashicons dashicons-controls-play"></span></div>
                    <div>
                        <h3 class="sc-card-title"><?php esc_html_e( 'Smooth Scroll', 'scrollcrafter' ); ?> <?php if ( ! $is_pro ) : ?><span class="sc-pro-badge">PRO</span><?php endif; ?></h3>
                        <p class="sc-card-desc"><?php esc_html_e( 'Buttery smooth scrolling powered by Lenis', 'scrollcrafter' ); ?></p>
                    </div>
                </div>
                <div class="sc-field">
                    <label class="sc-toggle">
                        <input type="checkbox" name="<?php echo self::OPTION_NAME; ?>[smooth_scroll]" value="1" <?php checked( $smooth_enabled ); ?> <?php disabled( ! $is_pro ); ?>>
                        <span class="sc-toggle-track"></span>
                        <span class="sc-toggle-label"><?php esc_html_e( 'Enable Smooth Scroll', 'scrollcrafter' ); ?></span>
                    </label>
                    <p class="sc-field-desc"><?php esc_html_e( 'Adds inertia-based scrolling. Makes scroll-linked animations feel smooth on Windows and all browsers.', 'scrollcrafter' ); ?></p>
                </div>
                <?php if ( $is_pro ) : ?>
                <div class="sc-field" style="margin-top: 16px;">
                    <label class="sc-field-label"><?php esc_html_e( 'Smoothness (lerp)', 'scrollcrafter' ); ?></label>
                    <input type="number" name="<?php echo self::OPTION_NAME; ?>[smooth_scroll_lerp]" value="<?php echo esc_attr( $smooth_lerp ); ?>" min="0.01" max="1" step="0.01" class="sc-input-number">
                    <p class="sc-field-desc"><?php esc_html_e( 'Lower = smoother but more laggy. Recommended: 0.08 - 0.12', 'scrollcrafter' ); ?></p>
                </div>
                <?php endif; ?>
            </div>

            <div class="sc-card">
                <div class="sc-card-header">
                    <div class="sc-card-icon"><span class="dashicons dashicons-visibility"></span></div>
                    <div>
                        <h3 class="sc-card-title"><?php esc_html_e( 'Special Condition Tags', 'scrollcrafter' ); ?> <?php if ( ! $is_pro ) : ?><span class="sc-pro-badge">PRO</span><?php endif; ?></h3>
                        <p class="sc-card-desc"><?php esc_html_e( 'Advanced responsive conditions', 'scrollcrafter' ); ?></p>
                    </div>
                </div>
                <div class="sc-field">
                    <p><?php esc_html_e( 'Pro users can use these special tags in responsive conditions:', 'scrollcrafter' ); ?></p>
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

    private function render_tab_account( string $active_tab ): void
    {
        if ( $active_tab !== 'account' ) return;
        
        $fs = scr_fs();
        $is_pro = sc_is_pro();
        $user = $fs ? $fs->get_user() : null;
        $license = $fs ? $fs->_get_license() : null;
        $site = $fs ? $fs->get_site() : null;
        $plan_title = $fs ? $fs->get_plan_title() : 'Free';
        ?>
        <div class="sc-tab-content active" data-tab="account">
            <!-- Account Details Card -->
            <div class="sc-card">
                <div class="sc-card-header">
                    <div class="sc-card-icon"><span class="dashicons dashicons-admin-users"></span></div>
                    <div>
                        <h3 class="sc-card-title"><?php esc_html_e( 'Account Details', 'scrollcrafter' ); ?></h3>
                        <p class="sc-card-desc"><?php esc_html_e( 'Your profile and plan information', 'scrollcrafter' ); ?></p>
                    </div>
                </div>
                <div class="sc-field">
                    <table class="sc-account-table">
                        <?php if ( $user ) : ?>
                        <tr>
                            <td class="sc-account-label"><span class="dashicons dashicons-email"></span> <?php esc_html_e( 'Email', 'scrollcrafter' ); ?></td>
                            <td><strong><?php echo esc_html( $user->email ); ?></strong></td>
                        </tr>
                        <?php if ( ! empty( $user->first ) || ! empty( $user->last ) ) : ?>
                        <tr>
                            <td class="sc-account-label"><span class="dashicons dashicons-admin-users"></span> <?php esc_html_e( 'Name', 'scrollcrafter' ); ?></td>
                            <td><?php echo esc_html( trim( ( $user->first ?? '' ) . ' ' . ( $user->last ?? '' ) ) ); ?></td>
                        </tr>
                        <?php endif; ?>
                        <?php endif; ?>
                        <tr>
                            <td class="sc-account-label"><span class="dashicons dashicons-awards"></span> <?php esc_html_e( 'Plan', 'scrollcrafter' ); ?></td>
                            <td>
                                <?php if ( $is_pro ) : ?>
                                    <span class="sc-plan-badge pro"><?php echo esc_html( $plan_title ); ?></span>
                                <?php else : ?>
                                    <span class="sc-plan-badge free"><?php esc_html_e( 'Free', 'scrollcrafter' ); ?></span>
                                <?php endif; ?>
                                <?php if ( $fs && $fs->is_trial() ) : ?>
                                    <span class="sc-plan-badge trial"><?php esc_html_e( 'Trial', 'scrollcrafter' ); ?></span>
                                <?php endif; ?>
                            </td>
                        </tr>
                        <tr>
                            <td class="sc-account-label"><span class="dashicons dashicons-info"></span> <?php esc_html_e( 'Version', 'scrollcrafter' ); ?></td>
                            <td>
                                <?php echo esc_html( SCROLLCRAFTER_VERSION ); ?>
                                <?php if ( $fs && $fs->is_premium() ) : ?>
                                    <span class="sc-version-badge"><?php esc_html_e( 'Premium', 'scrollcrafter' ); ?></span>
                                <?php endif; ?>
                            </td>
                        </tr>
                        <?php if ( $site && ! empty( $site->id ) ) : ?>
                        <tr>
                            <td class="sc-account-label"><span class="dashicons dashicons-admin-site"></span> <?php esc_html_e( 'Site ID', 'scrollcrafter' ); ?></td>
                            <td><code><?php echo esc_html( $site->id ); ?></code></td>
                        </tr>
                        <?php endif; ?>
                    </table>
                </div>
            </div>

            <!-- License Card -->
            <?php if ( $license && is_object( $license ) ) : ?>
            <div class="sc-card">
                <div class="sc-card-header">
                    <div class="sc-card-icon"><span class="dashicons dashicons-lock"></span></div>
                    <div>
                        <h3 class="sc-card-title"><?php esc_html_e( 'License', 'scrollcrafter' ); ?></h3>
                        <p class="sc-card-desc"><?php esc_html_e( 'Your active license details', 'scrollcrafter' ); ?></p>
                    </div>
                    <?php if ( $license->is_active() && ! $license->is_expired() ) : ?>
                        <span class="sc-license-status active"><span class="dashicons dashicons-yes-alt"></span> <?php esc_html_e( 'Active', 'scrollcrafter' ); ?></span>
                    <?php elseif ( $license->is_expired() ) : ?>
                        <span class="sc-license-status expired"><span class="dashicons dashicons-warning"></span> <?php esc_html_e( 'Expired', 'scrollcrafter' ); ?></span>
                    <?php endif; ?>
                </div>
                <div class="sc-field">
                    <table class="sc-account-table">
                        <tr>
                            <td class="sc-account-label"><span class="dashicons dashicons-admin-network"></span> <?php esc_html_e( 'License Key', 'scrollcrafter' ); ?></td>
                            <td><code class="sc-license-key"><?php echo $license->get_html_escaped_masked_secret_key(); ?></code></td>
                        </tr>
                        <tr>
                            <td class="sc-account-label"><span class="dashicons dashicons-calendar"></span> <?php esc_html_e( 'Expiration', 'scrollcrafter' ); ?></td>
                            <td>
                                <?php if ( $license->is_lifetime() ) : ?>
                                    <span class="sc-lifetime-badge"><span class="dashicons dashicons-infinity"></span> <?php esc_html_e( 'Lifetime', 'scrollcrafter' ); ?></span>
                                <?php elseif ( ! empty( $license->expiration ) ) : ?>
                                    <?php echo esc_html( date_i18n( get_option( 'date_format' ), strtotime( $license->expiration ) ) ); ?>
                                    <?php if ( $license->is_expired() ) : ?>
                                        <span class="sc-expired-text">(<?php esc_html_e( 'expired', 'scrollcrafter' ); ?>)</span>
                                    <?php endif; ?>
                                <?php endif; ?>
                            </td>
                        </tr>
                        <tr>
                            <td class="sc-account-label"><span class="dashicons dashicons-admin-multisite"></span> <?php esc_html_e( 'Activations', 'scrollcrafter' ); ?></td>
                            <td>
                                <?php
                                $used = $license->activated + ( isset( $license->activated_local ) ? $license->activated_local : 0 );
                                if ( $license->is_unlimited() ) :
                                    echo esc_html( $used ) . ' / ∞';
                                else :
                                    echo esc_html( $used . ' / ' . $license->quota );
                                endif;
                                ?>
                            </td>
                        </tr>
                    </table>
                </div>
            </div>
            <?php endif; ?>

            <!-- Change License Key Card -->
            <?php if ( $fs ) : ?>
            <div class="sc-card">
                <div class="sc-card-header">
                    <div class="sc-card-icon"><span class="dashicons dashicons-admin-network"></span></div>
                    <div>
                        <h3 class="sc-card-title">
                            <?php echo ( $license && is_object( $license ) )
                                ? esc_html__( 'Change License Key', 'scrollcrafter' )
                                : esc_html__( 'Activate License', 'scrollcrafter' ); ?>
                        </h3>
                        <p class="sc-card-desc">
                            <?php echo ( $license && is_object( $license ) )
                                ? esc_html__( 'Replace your current license with a different key', 'scrollcrafter' )
                                : esc_html__( 'Enter your license key to unlock Pro features', 'scrollcrafter' ); ?>
                        </p>
                    </div>
                </div>
                <div class="sc-field">
                    <div class="sc-license-form" id="sc-license-form">
                        <div class="sc-license-input-wrap">
                            <input type="text"
                                   id="sc-license-key-input"
                                   class="sc-license-input"
                                   placeholder="<?php esc_attr_e( 'sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', 'scrollcrafter' ); ?>"
                                   autocomplete="off"
                                   spellcheck="false" />
                            <button type="button" id="sc-activate-license-btn" class="button button-primary">
                                <span class="sc-btn-text"><?php esc_html_e( 'Activate', 'scrollcrafter' ); ?></span>
                                <span class="sc-btn-spinner spinner" style="display:none;"></span>
                            </button>
                        </div>
                        <div id="sc-license-message" class="sc-license-message" style="display:none;"></div>
                    </div>
                </div>
            </div>
            <script>
            (function() {
                var btn    = document.getElementById('sc-activate-license-btn');
                var input  = document.getElementById('sc-license-key-input');
                var msgEl  = document.getElementById('sc-license-message');

                btn.addEventListener('click', function() {
                    var key = input.value.trim();
                    if ( ! key ) {
                        showMsg('<?php echo esc_js( __( 'Please enter a license key.', 'scrollcrafter' ) ); ?>', 'error');
                        return;
                    }

                    btn.disabled = true;
                    btn.querySelector('.sc-btn-text').style.display = 'none';
                    btn.querySelector('.sc-btn-spinner').style.display = 'inline-block';
                    btn.querySelector('.sc-btn-spinner').classList.add('is-active');
                    msgEl.style.display = 'none';

                    var data = new FormData();
                    data.append('action', '<?php echo esc_js( $fs->get_ajax_action( 'activate_license' ) ); ?>');
                    data.append('security', '<?php echo esc_js( $fs->get_ajax_security( 'activate_license' ) ); ?>');
                    data.append('license_key', key);
                    data.append('module_id', '<?php echo esc_js( $fs->get_id() ); ?>');

                    fetch(ajaxurl, { method: 'POST', body: data, credentials: 'same-origin' })
                        .then(function(r) { return r.json(); })
                        .then(function(res) {
                            if ( res.success ) {
                                showMsg('<?php echo esc_js( __( 'License activated successfully! Reloading…', 'scrollcrafter' ) ); ?>', 'success');
                                setTimeout(function() { location.reload(); }, 1500);
                            } else {
                                showMsg(res.error || '<?php echo esc_js( __( 'Failed to activate license. Please check your key.', 'scrollcrafter' ) ); ?>', 'error');
                                resetBtn();
                            }
                        })
                        .catch(function() {
                            showMsg('<?php echo esc_js( __( 'Network error. Please try again.', 'scrollcrafter' ) ); ?>', 'error');
                            resetBtn();
                        });
                });

                input.addEventListener('keydown', function(e) {
                    if ( e.key === 'Enter' ) { e.preventDefault(); btn.click(); }
                });

                function showMsg(text, type) {
                    msgEl.textContent = text;
                    msgEl.className = 'sc-license-message ' + type;
                    msgEl.style.display = 'block';
                }

                function resetBtn() {
                    btn.disabled = false;
                    btn.querySelector('.sc-btn-text').style.display = '';
                    btn.querySelector('.sc-btn-spinner').style.display = 'none';
                    btn.querySelector('.sc-btn-spinner').classList.remove('is-active');
                }
            })();
            </script>
            <?php endif; ?>

            <!-- Quick Actions Card -->
            <div class="sc-card">
                <div class="sc-card-header">
                    <div class="sc-card-icon"><span class="dashicons dashicons-admin-links"></span></div>
                    <div>
                        <h3 class="sc-card-title"><?php esc_html_e( 'Quick Actions', 'scrollcrafter' ); ?></h3>
                    </div>
                </div>
                <div class="sc-field">
                    <div class="sc-account-actions">
                        <?php if ( $fs ) : ?>
                            <?php if ( ! $is_pro ) : ?>
                            <a href="<?php echo esc_url( $fs->get_upgrade_url() ); ?>" class="button button-primary sc-action-btn">
                                <span class="dashicons dashicons-star-filled"></span>
                                <?php esc_html_e( 'Upgrade to Pro', 'scrollcrafter' ); ?>
                            </a>
                            <?php endif; ?>
                            <?php if ( $fs->is_registered() ) : ?>
                            <a href="<?php echo esc_url( $fs->contact_url() ); ?>" class="button sc-action-btn">
                                <span class="dashicons dashicons-email"></span>
                                <?php esc_html_e( 'Contact Support', 'scrollcrafter' ); ?>
                            </a>
                            <?php endif; ?>
                            <?php if ( $license && $license->is_expired() ) : ?>
                            <a href="<?php echo esc_url( $fs->get_upgrade_url() ); ?>" class="button sc-action-btn">
                                <span class="dashicons dashicons-update"></span>
                                <?php esc_html_e( 'Renew License', 'scrollcrafter' ); ?>
                            </a>
                            <?php endif; ?>
                            <?php if ( $fs->is_registered() ) : ?>
                            <a href="<?php echo esc_url( $fs->get_account_url( 'deactivate_license' ) ); ?>" class="button sc-action-btn sc-action-danger" onclick="return confirm('<?php esc_attr_e( 'Are you sure you want to deactivate the license?', 'scrollcrafter' ); ?>');">
                                <span class="dashicons dashicons-dismiss"></span>
                                <?php esc_html_e( 'Deactivate License', 'scrollcrafter' ); ?>
                            </a>
                            <?php endif; ?>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </div>
        <?php
    }

    private function render_tab_support( string $active_tab ): void
    {
        if ( $active_tab !== 'support' ) return;

        $fs = scr_fs();
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
                                <h4><?php esc_html_e( 'Contact Support', 'scrollcrafter' ); ?></h4>
                                <p><?php esc_html_e( 'Report a bug or ask a question directly.', 'scrollcrafter' ); ?></p>
                                <?php if ( $fs ) : ?>
                                <a href="<?php echo esc_url( $fs->contact_url() ); ?>" class="button button-primary"><?php esc_html_e( 'Open Ticket', 'scrollcrafter' ); ?></a>
                                <?php endif; ?>
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
