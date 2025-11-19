<?php

namespace ScrollCrafter\Animation;

use Elementor\Element_Base;

class Tween_Config_Builder
{
    /**
     * Buduje config dla widgetu 'scroll_animation' na podstawie wyniku Script_Parser.
     *
     * @param Element_Base $element
     * @param array<string,mixed> $parsed
     * @param array<string,mixed> $scrollTrigger
     * @param string $targetSelector
     * @param string $targetType
     *
     * @return array<string,mixed>
     */
    public function build(
        Element_Base $element,
        array $parsed,
        array $scrollTrigger,
        string $targetSelector,
        string $targetType
    ): array {
        $anim = $parsed['animation'] ?? [];

        $type     = $anim['type'] ?? 'from';
        $fromVars = $anim['from'] ?? [ 'y' => 50.0, 'opacity' => 0.0 ];
        $toVars   = $anim['to']   ?? [ 'y' => 0.0,  'opacity' => 1.0 ];
        $duration = isset( $anim['duration'] ) ? (float) $anim['duration'] : 0.8;
        $delay    = isset( $anim['delay'] ) ? (float) $anim['delay'] : 0.0;
        $ease     = $anim['ease'] ?? 'power2.out';
        $stagger  = isset( $anim['stagger'] ) ? (float) $anim['stagger'] : 0.0;

        return [
            'widget'        => 'scroll_animation',
            'id'            => $element->get_id(),
            'target'        => [
                'type'     => $targetType,
                'selector' => $targetSelector,
            ],
            'animation'     => [
                'type'     => $type,
                'from'     => $fromVars,
                'to'       => $toVars,
                'duration' => $duration,
                'delay'    => $delay,
                'ease'     => $ease,
                'stagger'  => $stagger,
            ],
            'scrollTrigger' => $scrollTrigger,
        ];
    }
}
