<?php

namespace ScrollCrafter\Elementor\Widgets;

use Elementor\Controls_Manager;
use ScrollCrafter\Elementor\Widget_Base;

class Scroll_Reveal extends Widget_Base
{
	public function get_name(): string
	{
		return 'scrollcrafter_scroll_reveal';
	}

	public function get_title(): string
	{
		return esc_html__( 'ScrollReveal (ScrollCrafter)', 'scrollcrafter' );
	}

	public function get_icon(): string
	{
		return 'eicon-animation'; // Ikona Elementora.
	}

	public function get_keywords(): array
	{
		return [ 'scroll', 'reveal', 'animation', 'gsap', 'scrolltrigger' ];
	}

	protected function register_controls(): void
	{
		$this->start_controls_section(
			'section_target',
			[
				'label' => esc_html__( 'Target', 'scrollcrafter' ),
				'tab'   => Controls_Manager::TAB_CONTENT,
			]
		);

		$this->add_control(
			'target_type',
			[
				'label'   => esc_html__( 'Target type', 'scrollcrafter' ),
				'type'    => Controls_Manager::SELECT,
				'default' => 'wrapper',
				'options' => [
					'wrapper' => esc_html__( 'This widget wrapper', 'scrollcrafter' ),
					'custom'  => esc_html__( 'Custom selector', 'scrollcrafter' ),
				],
			]
		);

		$this->add_control(
			'target_selector',
			[
				'label'       => esc_html__( 'Custom CSS selector', 'scrollcrafter' ),
				'type'        => Controls_Manager::TEXT,
				'placeholder' => '.my-element',
				'condition'   => [
					'target_type' => 'custom',
				],
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'section_animation',
			[
				'label' => esc_html__( 'Animation', 'scrollcrafter' ),
				'tab'   => Controls_Manager::TAB_CONTENT,
			]
		);

		$this->add_control(
			'anim_type',
			[
				'label'   => esc_html__( 'Animation type', 'scrollcrafter' ),
				'type'    => Controls_Manager::SELECT,
				'default' => 'from',
				'options' => [
					'from'   => esc_html__( 'From', 'scrollcrafter' ),
					'to'     => esc_html__( 'To', 'scrollcrafter' ),
					'fromTo' => esc_html__( 'From → To', 'scrollcrafter' ),
				],
			]
		);

		$this->add_control(
			'from_y',
			[
				'label'   => esc_html__( 'From Y (px)', 'scrollcrafter' ),
				'type'    => Controls_Manager::NUMBER,
				'default' => 50,
				'condition' => [
					'anim_type!' => 'to',
				],
			]
		);

		$this->add_control(
			'from_opacity',
			[
				'label'   => esc_html__( 'From opacity', 'scrollcrafter' ),
				'type'    => Controls_Manager::NUMBER,
				'default' => 0,
				'min'     => 0,
				'max'     => 1,
				'step'    => 0.1,
				'condition' => [
					'anim_type!' => 'to',
				],
			]
		);

		$this->add_control(
			'to_y',
			[
				'label'   => esc_html__( 'To Y (px)', 'scrollcrafter' ),
				'type'    => Controls_Manager::NUMBER,
				'default' => 0,
				'condition' => [
					'anim_type!' => 'from',
				],
			]
		);

		$this->add_control(
			'to_opacity',
			[
				'label'   => esc_html__( 'To opacity', 'scrollcrafter' ),
				'type'    => Controls_Manager::NUMBER,
				'default' => 1,
				'min'     => 0,
				'max'     => 1,
				'step'    => 0.1,
				'condition' => [
					'anim_type!' => 'from',
				],
			]
		);

		$this->add_control(
			'duration',
			[
				'label'   => esc_html__( 'Duration (s)', 'scrollcrafter' ),
				'type'    => Controls_Manager::NUMBER,
				'default' => 0.8,
				'min'     => 0.1,
				'step'    => 0.1,
			]
		);

		$this->add_control(
			'delay',
			[
				'label'   => esc_html__( 'Delay (s)', 'scrollcrafter' ),
				'type'    => Controls_Manager::NUMBER,
				'default' => 0,
				'min'     => 0,
				'step'    => 0.1,
			]
		);

		$this->add_control(
			'ease',
			[
				'label'   => esc_html__( 'Ease', 'scrollcrafter' ),
				'type'    => Controls_Manager::SELECT,
				'default' => 'power2.out',
				'options' => [
					'power1.out' => 'power1.out',
					'power2.out' => 'power2.out',
					'power3.out' => 'power3.out',
					'back.out(1.7)' => 'back.out(1.7)',
					'elastic.out(1, 0.3)' => 'elastic.out(1, 0.3)',
				],
			]
		);

		$this->add_control(
			'stagger',
			[
				'label'   => esc_html__( 'Stagger (s)', 'scrollcrafter' ),
				'type'    => Controls_Manager::NUMBER,
				'default' => 0,
				'min'     => 0,
				'step'    => 0.05,
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'section_scrolltrigger',
			[
				'label' => esc_html__( 'ScrollTrigger', 'scrollcrafter' ),
				'tab'   => Controls_Manager::TAB_CONTENT,
			]
		);

		$this->add_control(
			'trigger_start',
			[
				'label'       => esc_html__( 'Start', 'scrollcrafter' ),
				'type'        => Controls_Manager::TEXT,
				'default'     => 'top 80%',
				'description' => esc_html__( 'GSAP ScrollTrigger start value (e.g. "top 80%").', 'scrollcrafter' ),
			]
		);

		$this->add_control(
			'trigger_end',
			[
				'label'       => esc_html__( 'End', 'scrollcrafter' ),
				'type'        => Controls_Manager::TEXT,
				'default'     => 'bottom 20%',
				'description' => esc_html__( 'GSAP ScrollTrigger end value.', 'scrollcrafter' ),
			]
		);

		$this->add_control(
			'toggle_actions',
			[
				'label'       => esc_html__( 'Toggle actions', 'scrollcrafter' ),
				'type'        => Controls_Manager::TEXT,
				'default'     => 'play none none reverse',
				'description' => esc_html__( 'GSAP toggleActions string.', 'scrollcrafter' ),
			]
		);

		$this->add_control(
			'once',
			[
				'label'        => esc_html__( 'Run only once', 'scrollcrafter' ),
				'type'         => Controls_Manager::SWITCHER,
				'label_on'     => esc_html__( 'Yes', 'scrollcrafter' ),
				'label_off'    => esc_html__( 'No', 'scrollcrafter' ),
				'return_value' => 'yes',
				'default'      => 'yes',
			]
		);

		$this->add_control(
			'scrub',
			[
				'label'        => esc_html__( 'Scrub', 'scrollcrafter' ),
				'type'         => Controls_Manager::SWITCHER,
				'label_on'     => esc_html__( 'On', 'scrollcrafter' ),
				'label_off'    => esc_html__( 'Off', 'scrollcrafter' ),
				'return_value' => 'yes',
				'default'      => '',
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'section_advanced',
			[
				'label' => esc_html__( 'Advanced', 'scrollcrafter' ),
				'tab'   => Controls_Manager::TAB_ADVANCED,
			]
		);

		$this->add_control(
			'child_selector',
			[
				'label'       => esc_html__( 'Child selector (for stagger)', 'scrollcrafter' ),
				'type'        => Controls_Manager::TEXT,
				'placeholder' => '.item',
			]
		);

		$this->add_control(
			'disable_on_mobile',
			[
				'label'        => esc_html__( 'Disable on mobile', 'scrollcrafter' ),
				'type'         => Controls_Manager::SWITCHER,
				'label_on'     => esc_html__( 'Yes', 'scrollcrafter' ),
				'label_off'    => esc_html__( 'No', 'scrollcrafter' ),
				'return_value' => 'yes',
				'default'      => '',
			]
		);

		$this->end_controls_section();
	}

	/**
	 * Zbiera config dla JS.
	 *
	 * @return array<string,mixed>
	 */
	protected function get_config(): array
	{
		$settings = $this->get_settings_for_display();

		$target_selector = 'wrapper' === ( $settings['target_type'] ?? 'wrapper' )
			? '.elementor-element-' . $this->get_id()
			: ( $settings['target_selector'] ?? '' );

		$config = [
			'widget'  => 'scroll_reveal',
			'id'      => $this->get_id(),
			'target'  => [
				'type'     => $settings['target_type'] ?? 'wrapper',
				'selector' => $target_selector,
			],
			'animation' => [
				'type'     => $settings['anim_type'] ?? 'from',
				'from'     => [
					'y'       => isset( $settings['from_y'] ) ? (float) $settings['from_y'] : 50.0,
					'opacity' => isset( $settings['from_opacity'] ) ? (float) $settings['from_opacity'] : 0.0,
				],
				'to'       => [
					'y'       => isset( $settings['to_y'] ) ? (float) $settings['to_y'] : 0.0,
					'opacity' => isset( $settings['to_opacity'] ) ? (float) $settings['to_opacity'] : 1.0,
				],
				'duration' => isset( $settings['duration'] ) ? (float) $settings['duration'] : 0.8,
				'delay'    => isset( $settings['delay'] ) ? (float) $settings['delay'] : 0.0,
				'ease'     => $settings['ease'] ?? 'power2.out',
				'stagger'  => isset( $settings['stagger'] ) ? (float) $settings['stagger'] : 0.0,
			],
			'scrollTrigger' => [
				'start'         => $settings['trigger_start'] ?? 'top 80%',
				'end'           => $settings['trigger_end'] ?? 'bottom 20%',
				'toggleActions' => $settings['toggle_actions'] ?? 'play none none reverse',
				'once'          => ( 'yes' === ( $settings['once'] ?? '' ) ),
				'scrub'         => ( 'yes' === ( $settings['scrub'] ?? '' ) ),
			],
			'advanced' => [
				'childSelector'   => $settings['child_selector'] ?? '',
				'disableOnMobile' => ( 'yes' === ( $settings['disable_on_mobile'] ?? '' ) ),
			],
		];

		/**
		 * Pozwala modyfikować config przed wysłaniem do JS.
		 *
		 * @param array        $config
		 * @param Scroll_Reveal $widget
		 */
		return (array) apply_filters( 'scrollcrafter/scroll_reveal_config', $config, $this );
	}

	protected function render_inner_content(): void
	{
		// Minimalny demo content – użytkownik może dodać własny tekst/HTML.
		echo '<div class="scrollcrafter-scroll-reveal-content">';
		echo esc_html__( 'ScrollReveal demo content – zastąp własną treścią.', 'scrollcrafter' );
		echo '</div>';
	}
}
