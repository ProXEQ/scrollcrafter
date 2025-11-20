<?php

namespace ScrollCrafter\Animation;

// use Elementor\Element_Base;

class Timeline_Config_Builder
{
    /**
     * Buduje config dla widgetu 'scroll_timeline' na podstawie wyniku Script_Parser.
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
        $element,
        array $parsed,
        array $scrollTrigger,
        string $targetSelector,
        string $targetType
    ): array {
        $timelineDefaults = $parsed['timeline']['defaults'] ?? [];
        $timelineSteps    = $parsed['timeline']['steps'] ?? [];

        return [
            'widget'        => 'scroll_timeline',
            'id'            => $element->get_id(),
            'target'        => [
                'type'     => $targetType,
                'selector' => $targetSelector,
            ],
            'timeline'      => [
                'defaults' => $timelineDefaults,
                'steps'    => $timelineSteps,
            ],
            'scrollTrigger' => $scrollTrigger,
        ];
    }
}
