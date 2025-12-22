<?php

namespace ScrollCrafter\Admin;

use ScrollCrafter\Support\Config;

class Settings_Page
{
	private const OPTION_GROUP = 'scrollcrafter_options_group';
	private const OPTION_NAME  = 'scrollcrafter_settings';

	public function hooks(): void
	{
		add_action( 'admin_menu', [ $this, 'add_settings_page' ] );
		add_action( 'admin_init', [ $this, 'register_settings' ] );
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

		add_settings_section(
			'scrollcrafter_main_section',
			esc_html__( 'General Configuration', 'scrollcrafter' ),
			null,
			'scrollcrafter'
		);

		add_settings_field(
			'debug_mode',
			esc_html__( 'Debug Mode', 'scrollcrafter' ),
			[ $this, 'render_field_debug_mode' ],
			'scrollcrafter',
			'scrollcrafter_main_section'
		);

        add_settings_section(
			'scrollcrafter_breakpoints_section',
			esc_html__( 'Breakpoints', 'scrollcrafter' ),
			[ $this, 'render_breakpoints_section_desc' ],
			'scrollcrafter'
		);

        add_settings_field(
			'custom_breakpoints',
			esc_html__( 'Custom Breakpoints', 'scrollcrafter' ),
			[ $this, 'render_field_custom_breakpoints' ],
			'scrollcrafter',
			'scrollcrafter_breakpoints_section'
		);

		add_settings_section(
			'scrollcrafter_assets_section',
			esc_html__( 'GSAP & Assets', 'scrollcrafter' ),
			[ $this, 'render_assets_section_desc' ],
			'scrollcrafter'
		);

		add_settings_field(
			'gsap_mode',
			esc_html__( 'GSAP Source', 'scrollcrafter' ),
			[ $this, 'render_field_gsap_mode' ],
			'scrollcrafter',
			'scrollcrafter_assets_section'
		);

		add_settings_field(
			'gsap_cdn_url',
			esc_html__( 'Custom GSAP URL', 'scrollcrafter' ),
			[ $this, 'render_field_gsap_cdn_url' ],
			'scrollcrafter',
			'scrollcrafter_assets_section'
		);

		add_settings_field(
			'scrolltrigger_cdn',
			esc_html__( 'Custom ScrollTrigger URL', 'scrollcrafter' ),
			[ $this, 'render_field_scrolltrigger_cdn_url' ],
			'scrollcrafter',
			'scrollcrafter_assets_section'
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
                
                $parts = explode( ':', $line );
                if ( count( $parts ) === 2 ) {
                    $key = trim( $parts[0] );
                    $val = (int) trim( $parts[1] );
                    if ( $key && $val > 0 ) {
                        $bp_array[ $key ] = $val;
                    }
                }
            }
        }
        $output['custom_breakpoints'] = $bp_array;

		$allowed_modes = [ 'local', 'cdn_custom', 'cdn_gsap_docs' ];
		$output['gsap_mode'] = in_array( $input['gsap_mode'] ?? '', $allowed_modes, true ) ? $input['gsap_mode'] : 'local';
		$output['gsap_cdn_url']      = esc_url_raw( $input['gsap_cdn_url'] ?? '' );
		$output['scrolltrigger_cdn'] = esc_url_raw( $input['scrolltrigger_cdn'] ?? '' );

		return $output;
	}

	public function render_page(): void
	{
		if ( ! current_user_can( 'manage_options' ) ) return;
		?>
		<div class="wrap">
			<h1><?php echo esc_html__( 'ScrollCrafter Settings', 'scrollcrafter' ); ?></h1>
			<form action="options.php" method="post">
				<?php
				settings_fields( self::OPTION_GROUP );
				do_settings_sections( 'scrollcrafter' );
				submit_button();
				?>
			</form>
		</div>
		<?php
	}

    public function render_breakpoints_section_desc(): void
    {
        echo '<p>' . esc_html__( 'Define custom breakpoints. Format: slug: width (one per line). Example:', 'scrollcrafter' ) . '<br><code>mobile: 768</code><br><code>tablet: 1024</code></p>';
        echo '<p class="description">' . esc_html__( 'If empty, breakpoints from Elementor will be used automatically.', 'scrollcrafter' ) . '</p>';
    }

    public function render_field_custom_breakpoints(): void
    {
        $config = Config::instance();
        $custom = $config->get( 'custom_breakpoints', [] );
        $text = '';
        if ( is_array( $custom ) ) {
            foreach ( $custom as $k => $v ) {
                $text .= "$k: $v\n";
            }
        }
        ?>
        <textarea name="<?php echo self::OPTION_NAME; ?>[custom_breakpoints]" rows="5" cols="40" class="regular-text code"><?php echo esc_textarea( $text ); ?></textarea>
        <?php
    }

	public function render_assets_section_desc(): void
	{
		echo '<p>' . esc_html__( 'Choose how the GSAP library should be loaded on your site.', 'scrollcrafter' ) . '</p>';
	}

	public function render_field_debug_mode(): void
	{
		$config = Config::instance();
		?>
		<label>
			<input type="checkbox" name="<?php echo self::OPTION_NAME; ?>[debug_mode]" value="1" <?php checked( $config->is_debug() ); ?>>
			<?php echo esc_html__( 'Enable Debug Mode', 'scrollcrafter' ); ?>
		</label>
		<p class="description">
			<?php echo esc_html__( 'Enables GSAP markers on frontend and detailed logging.', 'scrollcrafter' ); ?>
		</p>
		<?php
	}

	public function render_field_gsap_mode(): void
	{
		$config = Config::instance();
		$current = $config->get_gsap_mode();
		?>
		<select name="<?php echo self::OPTION_NAME; ?>[gsap_mode]">
			<option value="local" <?php selected( $current, 'local' ); ?>>Local (bundled)</option>
			<option value="cdn_gsap_docs" <?php selected( $current, 'cdn_gsap_docs' ); ?>>CDN (jsDelivr - Standard)</option>
			<option value="cdn_custom" <?php selected( $current, 'cdn_custom' ); ?>>CDN (Custom URLs)</option>
		</select>
		<?php
	}

	public function render_field_gsap_cdn_url(): void
	{
		$config = Config::instance();
		$val = $config->get( 'gsap_cdn_url' );
		?>
		<input type="url" name="<?php echo self::OPTION_NAME; ?>[gsap_cdn_url]" value="<?php echo esc_attr( $val ); ?>" class="regular-text">
		<?php
	}

	public function render_field_scrolltrigger_cdn_url(): void
	{
		$config = Config::instance();
		$val = $config->get( 'scrolltrigger_cdn' );
		?>
		<input type="url" name="<?php echo self::OPTION_NAME; ?>[scrolltrigger_cdn]" value="<?php echo esc_attr( $val ); ?>" class="regular-text">
		<?php
	}
}
