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

            // 1. Nagłówek sekcji
            if ($this->isSectionHeader($line)) {
                $parsed = $this->parseSectionHeader($line);
                
                if ($parsed === false) {
                    $result['_warnings'][] = "Line $lineNum: Unknown section header ignored.";
                    continue;
                }

                $currentMedia = $parsed['media'] ?? null;
                $currentSection = $parsed['section'];
                
                // Inicjalizacja struktury dla mediów
                if ($currentMedia) {
                    if (!isset($result['media'][$currentMedia])) {
                        $result['media'][$currentMedia] = [];
                    }
                    
                    // Timeline w mediach wymaga specjalnej struktury
                    if ($currentSection === self::SECTION_TIMELINE) {
                         if (!isset($result['media'][$currentMedia]['timeline'])) {
                             $result['media'][$currentMedia]['timeline'] = [ 'defaults' => [] ];
                         }
                    } elseif (is_array($currentSection) && ($currentSection['type'] ?? '') === 'step') {
                         if (!isset($result['media'][$currentMedia]['timeline'])) {
                             $result['media'][$currentMedia]['timeline'] = [ 'steps' => [] ];
                         }
                    } else {
                         // Proste sekcje (animation, scroll, target)
                         if (!isset($result['media'][$currentMedia][$currentSection])) {
                             $result['media'][$currentMedia][$currentSection] = [];
                         }
                    }
                }

                continue;
            }

            // 2. Pary klucz: wartość
            if (!str_contains($line, ':')) {
                $result['_warnings'][] = "Line $lineNum: Missing colon separator (:).";
                continue;
            }

            [$rawKey, $rawValue] = array_map('trim', explode(':', $line, 2));
            
            if ($rawKey === '') {
                continue;
            }

            // Obsługa dot notation (np. timeline.defaults.ease) - tylko dla Global
            if (!$currentMedia && str_contains($rawKey, '.')) {
                 if ($this->handleDotNotation($result, $rawKey, $rawValue)) {
                     continue;
                 }
            }

            $key   = strtolower($rawKey);
            $value = $rawValue;

            // --- KLUCZOWA POPRAWKA: Przełączanie między Global a Media ---
            
            if ($currentMedia) {
                // *** LOGIKA DLA MEDIA QUERY ***
                
                // 1. Timeline Step
                if (is_array($currentSection) && ($currentSection['type'] ?? '') === 'step') {
                    $idx = $currentSection['index'];
                    if (!isset($result['media'][$currentMedia]['timeline']['steps'][$idx])) {
                        $result['media'][$currentMedia]['timeline']['steps'][$idx] = [];
                    }
                    $this->assignStepKey($result['media'][$currentMedia]['timeline']['steps'][$idx], $key, $value);
                } 
                // 2. Timeline Defaults
                elseif ($currentSection === self::SECTION_TIMELINE) {
                     // Zakładamy, że w media [timeline] to defaults (albo trzeba obsłużyć prefiks timeline.defaults)
                     // Dla uproszczenia w media: [timeline @mobile] -> duration: 0.5
                     $this->assignSimpleKey($result['media'][$currentMedia]['timeline']['defaults'], $key, $value);
                }
                // 3. Animation / Scroll / Target
                else {
                    $targetArray = &$result['media'][$currentMedia][$currentSection];
                    
                    if ($currentSection === self::SECTION_ANIM) {
                        $this->assignAnimationKey($targetArray, $key, $value);
                    } elseif ($currentSection === self::SECTION_SCROLL) {
                        $this->assignScrollKey($targetArray, $key, $value);
                    } elseif ($currentSection === self::SECTION_TARGET) {
                        $this->assignTargetKey($targetArray, $key, $value);
                    }
                }

            } else {
                // *** LOGIKA GLOBALNA (STARA) ***
                
                if ($currentSection === self::SECTION_ANIM) {
                    $this->assignAnimationKey($result['animation'], $key, $value);
                } elseif ($currentSection === self::SECTION_SCROLL) {
                    $this->assignScrollKey($result['scroll'], $key, $value);
                } elseif ($currentSection === self::SECTION_TARGET) {
                    $this->assignTargetKey($result['target'], $key, $value);
                } elseif (is_array($currentSection) && ($currentSection['type'] ?? '') === 'step') {
                    $idx = $currentSection['index'];
                    if (!isset($result['timeline']['steps'][$idx])) {
                        $result['timeline']['steps'][$idx] = [];
                    }
                    $this->assignStepKey($result['timeline']['steps'][$idx], $key, $value);
                } else {
                    if ($currentSection === self::SECTION_TIMELINE) {
                        $result['_warnings'][] = "Line $lineNum: Properties in [timeline] must use 'timeline.defaults' prefix.";
                    }
                }
            }
        }

        // Sortowanie
        $this->sortSteps($result['timeline']);
        foreach ($result['media'] as &$mediaCfg) {
            if (isset($mediaCfg['timeline'])) {
                $this->sortSteps($mediaCfg['timeline'], true); // true = zachowaj klucze
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
    
    // Helper dla prostych wartości w timeline defaults
    private function assignSimpleKey(array &$arr, string $key, string $value): void {
        // Obsługa duration, delay itp.
        if (in_array($key, ['duration', 'delay', 'stagger'])) {
            $arr[$key] = (float)$value;
        } else {
            $arr[$key] = $value;
        }
    }

    // --- METODY POMOCNICZE (bez zmian) ---

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
        if (str_contains($content, '@')) {
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

    private function handleDotNotation(array &$result, string $rawKey, string $value): bool
    {
        $parts = explode('.', strtolower($rawKey));
        if (count($parts) === 3 && $parts[0] === 'timeline' && $parts[1] === 'defaults') {
            $prop = $parts[2];
            $numericProps = ['duration', 'delay', 'stagger'];
            if (in_array($prop, $numericProps, true)) {
                $result['timeline']['defaults'][$prop] = (float)$value;
            } else {
                $result['timeline']['defaults'][$prop] = $value;
            }
            return true;
        }
        return false;
    }

        private function assignAnimationKey(array &$anim, string $key, string $value): void
    {
        switch ($key) {
            case 'type': 
            case 'method':
                $anim['type'] = $value; 
                break;
                
            case 'from': 
            case 'to': 
                $anim[$key] = $this->parseVarsList($value); 
                break;
                
            case 'duration': 
            case 'delay': 
            case 'stagger': 
                $anim[$key] = (float) $value; 
                break;
                
            case 'ease': 
                $anim['ease'] = $value; 
                break;
            
            case 'strict': $anim['strict'] = $this->parseBool($value); break;
            case 'repeat': $anim['repeat'] = (int)$value; break;
            case 'yoyo':   $anim['yoyo'] = $this->parseBool($value); break;

            default:
                break;
        }
    }

    private function assignScrollKey(array &$scroll, string $key, string $value): void
    {
        $map = [ 'toggleactions' => 'toggleActions', 'pinspacing' => 'pinSpacing', 'anticipatepin' => 'anticipatePin' ];
        $realKey = $map[$key] ?? $key;

        if (in_array($key, ['scrub', 'snap'], true)) {
             $scroll[$realKey] = $this->parseBoolOrNumberOrString($value);
        } elseif (in_array($key, ['once', 'pin', 'pinspacing', 'markers'], true)) {
             $scroll[$realKey] = $this->parseBool($value);
        } elseif ($key === 'anticipatepin') {
             $scroll[$realKey] = (float) $value;
             
        } elseif ($key === 'strict') {
             $scroll['strict'] = $this->parseBool($value);
        // ---------------------------------
        
        } else {
             $scroll[$realKey] = $value;
        }
    }


    private function assignStepKey(array &$step, string $key, string $value): void
    {
        switch ($key) {
            case 'type': $step['type'] = $value; break;
            case 'selector': $step['selector'] = $value; break;
            case 'from': case 'to': case 'startat': $step[$key === 'startat' ? 'startAt' : $key] = $this->parseVarsList($value); break;
            case 'duration': case 'delay': case 'stagger': $step[$key] = (float) $value; break;
            case 'position': $step['position'] = $value; break;
            case 'ease': $step['ease'] = $value; break;
            case 'label': $step['label'] = $value; break; 
        }
    }

    private function assignTargetKey(array &$target, string $key, string $value): void
    {
        if ($key === 'selector') $target['selector'] = $value;
    }

    private function parseVarsList(string $value): array
    {
        $vars = [];
        $parts = preg_split("/,(?![^(]*\))/", $value);
        if (!$parts) return [];

        foreach ($parts as $part) {
            $part = trim($part);
            if ($part === '' || !str_contains($part, '=')) continue;
            [$k, $v] = array_map('trim', explode('=', $part, 2));
            if ($k === '') continue;
            $vars[$k] = $this->parseSmartValue($v);
        }
        return $vars;
    }

    private function parseSmartValue(string $v)
    {
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
