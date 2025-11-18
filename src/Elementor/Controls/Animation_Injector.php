<?php

namespace ScrollCrafter\Elementor\Controls;

use Elementor\Controls_Manager;
use Elementor\Element_Base;
use ScrollCrafter\Support\Logger;

class Animation_Injector
{
    public function hooks(): void
    {
        // Kontenery (flex/grid) – po sekcji Advanced.
        add_action(
            'elementor/element/container/_section_responsive/after_section_end',
            [ $this, 'add_section_for_container' ],
            10,
            2
        );

        // Wszystkie widgety (common-optimized) – po sekcji Responsive.
        add_action(
            'elementor/element/common-optimized/_section_responsive/after_section_end',
            [ $this, 'add_section_for_common' ],
            10,
            2
        );

        Logger::log( 'Animation_Injector specific hooks registered', 'elementor' );
    }

    public function add_section_for_container( Element_Base $element, array $args ): void
{
    Logger::log(
        'add_section_for_container called for: ' . $element->get_name(),
        'elementor'
    );

    $this->add_scrollcrafter_section( $element );
}

    public function add_section_for_common( Element_Base $element, array $args ): void
    {
        Logger::log(
            'add_section_for_common called for: ' . $element->get_name(),
            'elementor'
        );

        $this->add_scrollcrafter_section( $element );
    }

    /**
     * Minimalna sekcja: enable + script DSL.
     */
    private function add_scrollcrafter_section( Element_Base $element ): void
    {
        $element->start_controls_section(
            'scrollcrafter_section_animation',
            [
                'label' => esc_html__( 'ScrollCrafter Animations', 'scrollcrafter' ),
                'tab'   => Controls_Manager::TAB_ADVANCED,
            ]
        );

        $element->add_control(
            'scrollcrafter_enable',
            [
                'label'        => esc_html__( 'Enable ScrollCrafter', 'scrollcrafter' ),
                'type'         => Controls_Manager::SWITCHER,
                'label_on'     => esc_html__( 'Yes', 'scrollcrafter' ),
                'label_off'    => esc_html__( 'No', 'scrollcrafter' ),
                'return_value' => 'yes',
                'default'      => '',
            ]
        );

        $element->add_control(
            'scrollcrafter_script',
            [
                'label'       => esc_html__( 'Animation script', 'scrollcrafter' ),
                'type'        => Controls_Manager::TEXTAREA,
                'rows'        => 10,
                'placeholder' => "type: from\nfrom: y=50, opacity=0\nto: y=0, opacity=1\nduration: 0.8\nease: power2.out\nstart: top 80%\nend: bottom 20%\nscrub: true\nonce: false",
                'description' => esc_html__( 'ScrollCrafter DSL v1. Each line: key: value. Use from/to, duration, ease, start, end, scrub, once, toggleActions, selector.', 'scrollcrafter' ),
                'condition'   => [
                    'scrollcrafter_enable' => 'yes',
                ],
            ]
        );

        $element->end_controls_section();
    }
}
