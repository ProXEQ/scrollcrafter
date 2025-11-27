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
			'ScrollCrafter Settings', // Title tag
			'ScrollCrafter',          // Menu title
			'manage_options',         // Capability
			'scrollcrafter',          // Menu slug
			[ $this, 'render_page' ]  // Callback
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

		// Sekcja: Główna konfiguracja
		add_settings_section(
			'scrollcrafter_main_section',
			esc_html__( 'General Configuration', 'scrollcrafter' ),
			null,
			'scrollcrafter'
		);

		// Pole: Tryb Debugowania
		add_settings_field(
			'debug_mode',
			esc_html__( 'Debug Mode', 'scrollcrafter' ),
			[ $this, 'render_field_debug_mode' ],
			'scrollcrafter',
			'scrollcrafter_main_section'
		);

		// Sekcja: Ładowanie GSAP
		add_settings_section(
			'scrollcrafter_assets_section',
			esc_html__( 'GSAP & Assets', 'scrollcrafter' ),
			[ $this, 'render_assets_section_desc' ],
			'scrollcrafter'
		);

		// Pole: Tryb ładowania (Local vs CDN)
		add_settings_field(
			'gsap_mode',
			esc_html__( 'GSAP Source', 'scrollcrafter' ),
			[ $this, 'render_field_gsap_mode' ],
			'scrollcrafter',
			'scrollcrafter_assets_section'
		);

		// Pole: Custom CDN URL (GSAP)
		add_settings_field(
			'gsap_cdn_url',
			esc_html__( 'Custom GSAP URL', 'scrollcrafter' ),
			[ $this, 'render_field_gsap_cdn_url' ],
			'scrollcrafter',
			'scrollcrafter_assets_section'
		);

		// Pole: Custom CDN URL (ScrollTrigger)
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

		// Debug Mode
		$output['debug_mode'] = isset( $input['debug_mode'] ) && '1' === $input['debug_mode'];

		// GSAP Mode
		$allowed_modes = [ 'local', 'cdn_custom', 'cdn_gsap_docs' ];
		$output['gsap_mode'] = in_array( $input['gsap_mode'] ?? '', $allowed_modes, true ) 
			? $input['gsap_mode'] 
			: 'local';

		// URLs
		$output['gsap_cdn_url']      = esc_url_raw( $input['gsap_cdn_url'] ?? '' );
		$output['scrolltrigger_cdn'] = esc_url_raw( $input['scrolltrigger_cdn'] ?? '' );

		return $output;
	}

	public function render_page(): void
	{
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
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
			<?php echo esc_html__( 'Enables GSAP markers on frontend and detailed logging to debug.log.', 'scrollcrafter' ); ?>
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
		<p class="description">
			<?php echo esc_html__( 'Use "Local" for GDPR compliance. Use "CDN" for performance.', 'scrollcrafter' ); ?>
		</p>
		<?php
	}

	public function render_field_gsap_cdn_url(): void
	{
		$config = Config::instance();
		$val = $config->get( 'gsap_cdn_url' );
		?>
		<input type="url" name="<?php echo self::OPTION_NAME; ?>[gsap_cdn_url]" value="<?php echo esc_attr( $val ); ?>" class="regular-text" placeholder="https://...">
		<p class="description"><?php echo esc_html__( 'Only used if Mode is "CDN (Custom URLs)".', 'scrollcrafter' ); ?></p>
		<?php
	}

	public function render_field_scrolltrigger_cdn_url(): void
	{
		$config = Config::instance();
		$val = $config->get( 'scrolltrigger_cdn' );
		?>
		<input type="url" name="<?php echo self::OPTION_NAME; ?>[scrolltrigger_cdn]" value="<?php echo esc_attr( $val ); ?>" class="regular-text" placeholder="https://...">
		<?php
	}
}
