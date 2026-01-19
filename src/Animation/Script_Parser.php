<?php

namespace ScrollCrafter\Animation;

class Script_Parser
{
    private const SECTION_ANIM     = 'animation';
    private const SECTION_SCROLL   = 'scroll';
    private const SECTION_TARGET   = 'target';
    private const SECTION_TIMELINE = 'timeline';

    public function parse(string $script): array
    {
        $lines = preg_split('/\r\n|\r|\n/', $script) ?: [];
        
        $currentSection = self::SECTION_ANIM;
        $currentMedia   = null;

        $result = [
            'animation' => [],
            'scroll'    => [],
            'target'    => [],
            'timeline'  => [
                'defaults' => [],
                'steps'    => [],
            ],
            'media'     => [],
            '_warnings' => [],
        ];

        foreach ($lines as $index => $rawLine) {
            $lineNum = $index + 1;
            $line    = $this->stripInlineComment($rawLine);
            $line    = trim($line);

            if ($line === '') {
                continue;
            }

            if ($this->isSectionHeader($line)) {
                $parsed = $this->parseSectionHeader($line);
                
                if ($parsed === false) {
                    /* translators: %d: Line number in the script */
                    $result['_warnings'][] = [
                        'message' => __("Unknown section header ignored.", 'scrollcrafter'),
                        'line'    => $lineNum
                    ];
                    continue;
                }

                $currentMedia = $parsed['media'] ?? null;
                $currentSection = $parsed['section'];
                
                if ($currentMedia) {
                    if (!isset($result['media'][$currentMedia])) {
                        $result['media'][$currentMedia] = [];
                    }
                    
                    if ($currentSection === self::SECTION_TIMELINE) {
                         if (!isset($result['media'][$currentMedia]['timeline'])) {
                             $result['media'][$currentMedia]['timeline'] = [ 'defaults' => [] ];
                         }
                    } elseif (is_array($currentSection) && ($currentSection['type'] ?? '') === 'step') {
                         if (!isset($result['media'][$currentMedia]['timeline'])) {
                             $result['media'][$currentMedia]['timeline'] = [ 'steps' => [] ];
                         }
                    } else {
                         if (!isset($result['media'][$currentMedia][$currentSection])) {
                             $result['media'][$currentMedia][$currentSection] = [];
                         }
                    }
                }

                continue;
            }

            if (strpos($line, ':') === false) {
                $result['_warnings'][] = [
                    'message' => __("Missing colon separator (:).", 'scrollcrafter'),
                    'line'    => $lineNum
                ];
                continue;
            }

            [$rawKey, $rawValue] = array_map('trim', explode(':', $line, 2));
            
            if ($rawKey === '') {
                continue;
            }

            if (!$currentMedia && str_contains($rawKey, '.')) {
                 if ($this->handleDotNotation($result, $rawKey, $rawValue, $lineNum)) {
                     continue;
                 }
            }

            $key   = strtolower($rawKey);
            $value = $rawValue;

            
            if ($currentMedia) {
                
                if (is_array($currentSection) && ($currentSection['type'] ?? '') === 'step') {
                    $idx = $currentSection['index'];
                    if (!isset($result['media'][$currentMedia]['timeline']['steps'][$idx])) {
                        $result['media'][$currentMedia]['timeline']['steps'][$idx] = [];
                    }
                    $this->assignStepKey($result['media'][$currentMedia]['timeline']['steps'][$idx], $key, $value, $lineNum);
                } 
                elseif ($currentSection === self::SECTION_TIMELINE) {
                     $this->assignSimpleKey($result['media'][$currentMedia]['timeline']['defaults'], $key, $value, $lineNum);
                }
                else {
                    $targetArray = &$result['media'][$currentMedia][$currentSection];
                    
                    if ($currentSection === self::SECTION_ANIM) {
                        $this->assignAnimationKey($targetArray, $key, $value, $lineNum);
                    } elseif ($currentSection === self::SECTION_SCROLL) {
                        $this->assignScrollKey($targetArray, $key, $value, $lineNum);
                    } elseif ($currentSection === self::SECTION_TARGET) {
                        $this->assignTargetKey($targetArray, $key, $value, $lineNum);
                    }
                }

            } else {
                
                if ($currentSection === self::SECTION_ANIM) {
                    $this->assignAnimationKey($result['animation'], $key, $value, $lineNum);
                } elseif ($currentSection === self::SECTION_SCROLL) {
                    $this->assignScrollKey($result['scroll'], $key, $value, $lineNum);
                } elseif ($currentSection === self::SECTION_TARGET) {
                    $this->assignTargetKey($result['target'], $key, $value, $lineNum);
                } elseif (is_array($currentSection) && ($currentSection['type'] ?? '') === 'step') {
                    $idx = $currentSection['index'];
                    if (!isset($result['timeline']['steps'][$idx])) {
                        $result['timeline']['steps'][$idx] = [];
                    }
                    $this->assignStepKey($result['timeline']['steps'][$idx], $key, $value, $lineNum);
                } else {
                    if ($currentSection === self::SECTION_TIMELINE) {
                        /* translators: %d: Line number in the script */
                        $result['_warnings'][] = [
                            'message' => __("Properties in [timeline] must use 'timeline.defaults' prefix.", 'scrollcrafter'),
                            'line'    => $lineNum
                        ];
                    }
                }
            }
        }

        $this->sortSteps($result['timeline']);
        foreach ($result['media'] as &$mediaCfg) {
            if (isset($mediaCfg['timeline'])) {
                $this->sortSteps($mediaCfg['timeline'], true);
            }
        }

        return $result;
    }

    private function sortSteps(array &$timeline, bool $preserveKeys = false): void
    {
        if (!empty($timeline['steps'])) {
            ksort($timeline['steps'], SORT_NUMERIC);
            if (!$preserveKeys) {
                $timeline['steps'] = array_values($timeline['steps']);
            }
        }
    }
    
    private function assignSimpleKey(array &$arr, string $key, string $value, int $line): void {
        $val = $value;
        if (in_array($key, ['duration', 'delay', 'stagger'])) {
            $val = (float)$value;
        }
        $arr[$key] = ['value' => $val, 'line' => $line];
    }


    private function stripInlineComment(string $line): string
    {
        $hashPos = strpos($line, '//');
        return ($hashPos === false) ? $line : substr($line, 0, $hashPos);
    }

    private function isSectionHeader(string $line): bool
    {
        return str_starts_with($line, '[') && str_ends_with($line, ']');
    }

    private function parseSectionHeader(string $line): array|false
    {
        $content = trim($line, '[] ');
        $media = null;
        if (strpos($content, '@') !== false) {
            $parts = explode('@', $content, 2);
            $content = trim($parts[0]);
            $media = trim($parts[1]);
        }

        $name = strtolower($content);
        $basicSections = [self::SECTION_ANIM, self::SECTION_SCROLL, self::SECTION_TARGET, self::SECTION_TIMELINE];
        
        if (in_array($name, $basicSections, true)) {
            return ['section' => $name, 'media' => $media];
        }

        if (str_starts_with($name, 'step.')) {
            $suffix = substr($name, 5);
            if (is_numeric($suffix)) {
                return [
                    'section' => ['type' => 'step', 'index' => (int)$suffix],
                    'media' => $media
                ];
            }
        }

        return false;
    }

    private function handleDotNotation(array &$result, string $rawKey, string $value, int $line): bool
    {
        $parts = explode('.', strtolower($rawKey));
        if (count($parts) === 3 && $parts[0] === 'timeline' && $parts[1] === 'defaults') {
            $prop = $parts[2];
            $numericProps = ['duration', 'delay', 'stagger'];
            $finalVal = $value;
            if (in_array($prop, $numericProps, true)) {
                $finalVal = (float)$value;
            }
            $result['timeline']['defaults'][$prop] = ['value' => $finalVal, 'line' => $line];
            return true;
        }
        return false;
    }

    private function assignAnimationKey(array &$anim, string $key, string $value, int $line): void
    {
        // Handle dot notation
        if (str_contains($key, '.')) {
            [$main, $sub] = explode('.', $key, 2);
            if ($main === 'stagger') {
                 if (!isset($anim['stagger']) || !is_array($anim['stagger'])) $anim['stagger'] = [];
                 $anim['stagger'][$sub] = ['value' => $this->parseSmartValue($value), 'line' => $line];
                 return;
            }
            if ($main === 'text') {
                 if (!isset($anim['text']) || !is_array($anim['text'])) $anim['text'] = [];
                 $anim['text'][$sub] = ['value' => $this->parseSmartValue($value), 'line' => $line];
                 return;
            }
        }

        switch ($key) {
            case 'type': 
            case 'method':
                $anim['type'] = ['value' => $value, 'line' => $line]; 
                break;
            
            case 'split': // New: SplitText
                 $anim['split'] = ['value' => $value, 'line' => $line];
                 break;

            case 'from': 
            case 'to': 
                $anim[$key] = ['value' => $this->parseVarsList($value), 'line' => $line]; 
                break;
                
            case 'duration': 
            case 'delay': 
                $anim[$key] = ['value' => (float) $value, 'line' => $line]; 
                break;

            case 'stagger': 
                $anim[$key] = ['value' => (float) $value, 'line' => $line]; 
                break;
                
            case 'ease': 
                $anim['ease'] = ['value' => $value, 'line' => $line]; 
                break;
            
            case 'strict': $anim['strict'] = ['value' => $this->parseBool($value), 'line' => $line]; break;
            case 'repeat': $anim['repeat'] = ['value' => (int)$value, 'line' => $line]; break;
            case 'yoyo':   $anim['yoyo'] = ['value' => $this->parseBool($value), 'line' => $line]; break;

            default:
                break;
        }
    }

    private function assignScrollKey(array &$scroll, string $key, string $value, int $line): void
    {
        $map = [ 'toggleactions' => 'toggleActions', 'pinspacing' => 'pinSpacing', 'anticipatepin' => 'anticipatePin' ];
        $realKey = $map[$key] ?? $key;
        $parsedVal = $value;

        if (in_array($key, ['scrub', 'snap'], true)) {
             $parsedVal = $this->parseBoolOrNumberOrString($value);
        } elseif (in_array($key, ['once', 'pin', 'pinspacing', 'markers'], true)) {
             $parsedVal = $this->parseBool($value);
        } elseif ($key === 'anticipatepin') {
             $parsedVal = (float) $value;
             
        } elseif ($key === 'strict') {
             $parsedVal = $this->parseBool($value);
        
        }
        
        $scroll[$realKey] = ['value' => $parsedVal, 'line' => $line];
    }


    private function assignStepKey(array &$step, string $key, string $value, int $line): void
    {
        // Handle dot notation for steps locally
        if (str_contains($key, '.')) {
            [$main, $sub] = explode('.', $key, 2);
            if ($main === 'stagger') {
                 if (!isset($step['stagger']) || !is_array($step['stagger'])) $step['stagger'] = [];
                 $step['stagger'][$sub] = ['value' => $this->parseSmartValue($value), 'line' => $line];
                 return;
            }
            if ($main === 'text') {
                 if (!isset($step['text']) || !is_array($step['text'])) $step['text'] = [];
                 $step['text'][$sub] = ['value' => $this->parseSmartValue($value), 'line' => $line];
                 return;
            }
        }

        switch ($key) {
            case 'type': $step['type'] = ['value' => $value, 'line' => $line]; break;
            case 'selector': $step['selector'] = ['value' => $value, 'line' => $line]; break;
            case 'split': $step['split'] = ['value' => $value, 'line' => $line]; break;
            case 'from': case 'to': case 'startat': $step[$key === 'startat' ? 'startAt' : $key] = ['value' => $this->parseVarsList($value), 'line' => $line]; break;
            case 'duration': case 'delay': 
                 $step[$key] = ['value' => (float) $value, 'line' => $line]; 
                 break;
            case 'stagger': 
                 $step[$key] = ['value' => (float) $value, 'line' => $line]; 
                 break;
            case 'position': $step['position'] = ['value' => $value, 'line' => $line]; break;
            case 'ease': $step['ease'] = ['value' => $value, 'line' => $line]; break;
            case 'label': $step['label'] = ['value' => $value, 'line' => $line]; break; 
        }
    }

    private function assignTargetKey(array &$target, string $key, string $value, int $line): void
    {
        if ($key === 'selector') $target['selector'] = ['value' => $value, 'line' => $line];
    }

    private function parseVarsList(string $value): array
    {
        $vars = [];
        $parts = preg_split("/,(?![^(]*\))/", $value);
        if (!$parts) return [];

        foreach ($parts as $part) {
            $part = trim($part);
            if ($part === '' || strpos($part, '=') === false) continue;
            [$k, $v] = array_map('trim', explode('=', $part, 2));
            if ($k === '') continue;
            $vars[$k] = $this->parseSmartValue($v);
        }
        return $vars;
    }

    private function parseSmartValue(string $v)
    {
        // Try to handle locale-specific decimals (e.g. 0,5 -> 0.5)
        // Only if it doesn't contain multiple commas (not a list)
        if (str_contains($v, ',') && !str_contains($v, '=') && substr_count($v, ',') === 1) {
            $normalized = str_replace(',', '.', $v);
            if (is_numeric($normalized)) {
                return (float)$normalized;
            }
        }

        if (is_numeric($v)) return (float)$v;
        if ($this->isBoolString($v)) return $this->parseBool($v);
        return $v; 
    }

    private function isBoolString(string $v): bool
    {
        return in_array(strtolower($v), ['true', 'false', 'yes', 'no', 'on', 'off'], true);
    }

    private function parseBool(string $v): bool
    {
        return in_array(strtolower($v), ['true', 'yes', 'on', '1'], true);
    }

    private function parseBoolOrNumberOrString(string $value): float|bool|string
    {
        if (is_numeric($value)) return (float)$value;
        if ($this->isBoolString($value)) return $this->parseBool($value);
        return $value;
    }
}
