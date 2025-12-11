<?php

namespace ScrollCrafter\Animation;



class Tween_Config_Builder
{
    public function build(
        $element,
        array $parsed,
        array $scrollTrigger,
        string $targetSelector,
        string $targetType
    ): array {
        $anim = $parsed['animation'] ?? [];
        $type = strtolower($anim['type'] ?? 'from');
        
        if (!in_array($type, ['to', 'from', 'fromto', 'set'], true)) {
            $type = 'from';
        }

        $varsFrom = $anim['from'] ?? [];
        $varsTo   = $anim['to'] ?? [];

        $commonParams = [];

        if (isset($anim['duration'])) {
            $commonParams['duration'] = (float)$anim['duration'];
        } else {
            
            if ($type !== 'set') {
                $commonParams['duration'] = 0.8; 
            }
        }

        if (isset($anim['delay'])) {
            $commonParams['delay'] = (float)$anim['delay'];
        }

        if (isset($anim['ease'])) {
            $commonParams['ease'] = $anim['ease'];
        }

        
        if (isset($anim['stagger'])) {
            $commonParams['stagger'] = $anim['stagger'];
        }

        
        $finalConfig = [];

        switch ($type) {
            case 'fromto':
                
                $finalConfig = [
                    'method' => 'fromTo',
                    'vars'   => $varsFrom, 
                    'vars2'  => array_merge($varsTo, $commonParams), 
                ];
                break;

            case 'to':
                
                $finalConfig = [
                    'method' => 'to',
                    'vars'   => array_merge($varsTo, $commonParams),
                ];
                break;

            case 'set':
                
                $finalConfig = [
                    'method' => 'set',
                    'vars'   => $varsTo,
                ];
                break;

            case 'from':
            default:
                
                
                $vars = !empty($varsFrom) ? $varsFrom : $varsTo;
                
                
                if (empty($vars)) {
                    $vars = ['y' => 50, 'opacity' => 0];
                }

                $finalConfig = [
                    'method' => 'from',
                    'vars'   => array_merge($vars, $commonParams),
                ];
                break;
        }

        
        
        
        if (!empty($scrollTrigger)) {
            if ($type === 'fromto') {
                $finalConfig['vars2']['scrollTrigger'] = $scrollTrigger;
            } else {
                $finalConfig['vars']['scrollTrigger'] = $scrollTrigger;
            }
        }

        return [
            'widget' => 'scroll_animation', 
            'id'     => $element->get_id(),
            'target' => [
                'type'     => $targetType,
                'selector' => $targetSelector,
            ],
            
            'animation' => $finalConfig,
        ];
    }
}
