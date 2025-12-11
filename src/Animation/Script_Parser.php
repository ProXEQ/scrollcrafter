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

        $result = [
            'animation' => [],
            'scroll'    => [],
            'target'    => [],
            'timeline'  => [
                'defaults' => [],
                'steps'    => [],
            ],
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
                $section = $this->parseSectionHeader($line);
                if ($section === '') {
                    $result['_warnings'][] = "Line $lineNum: Unknown section header ignored.";
                } else {
                    $currentSection = $section;
                }
                continue;
            }

            if (!str_contains($line, ':')) {
                $result['_warnings'][] = "Line $lineNum: Missing colon separator (:).";
                continue;
            }

            [$rawKey, $rawValue] = array_map('trim', explode(':', $line, 2));
            
            if ($rawKey === '') {
                continue;
            }

            if (str_contains($rawKey, '.')) {
                 if ($this->handleDotNotation($result, $rawKey, $rawValue)) {
                     continue;
                 }
            }

            $key   = strtolower($rawKey);
            $value = $rawValue;

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
                    $result['_warnings'][] = "Line $lineNum: Properties in [timeline] must use 'timeline.defaults' prefix or be inside a [step.N] section.";
                }
            }
        }

        if (!empty($result['timeline']['steps'])) {
            ksort($result['timeline']['steps'], SORT_NUMERIC);
            $result['timeline']['steps'] = array_values($result['timeline']['steps']);
        }

        return $result;
    }

    

    private function stripInlineComment(string $line): string
    {
        $hashPos = strpos($line, '#');
        return ($hashPos === false) ? $line : substr($line, 0, $hashPos);
    }

    private function isSectionHeader(string $line): bool
    {
        return str_starts_with($line, '[') && str_ends_with($line, ']');
    }

    private function parseSectionHeader(string $line): string|array
    {
        $name = strtolower(trim($line, '[] '));
        
        $basicSections = [self::SECTION_ANIM, self::SECTION_SCROLL, self::SECTION_TARGET, self::SECTION_TIMELINE];
        if (in_array($name, $basicSections, true)) {
            return $name;
        }

        if (str_starts_with($name, 'step.')) {
            $suffix = substr($name, 5);
            if (is_numeric($suffix)) {
                return ['type' => 'step', 'index' => (int)$suffix];
            }
        }

        return '';
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
        }
    }

    private function assignStepKey(array &$step, string $key, string $value): void
    {
        switch ($key) {
            case 'type':
                $step['type'] = $value;
                break;
            case 'selector': 
                $step['selector'] = $value;
                break;
            case 'from':
            case 'to':
            case 'startat': 
                $step[$key === 'startat' ? 'startAt' : $key] = $this->parseVarsList($value);
                break;
            case 'duration':
            case 'delay':
            case 'stagger':
                $step[$key] = (float) $value;
                break;
            case 'position': 
                $step['position'] = $value;
                break;
            case 'ease':
                $step['ease'] = $value;
                break;
        }
    }

    private function assignScrollKey(array &$scroll, string $key, string $value): void
    {
        
        
        $map = [
            'toggleactions' => 'toggleActions',
            'pinspacing'    => 'pinSpacing',
            'anticipatepin' => 'anticipatePin',
        ];

        $realKey = $map[$key] ?? $key;

        if (in_array($key, ['scrub', 'snap'], true)) {
             $scroll[$realKey] = $this->parseBoolOrNumberOrString($value);
        } elseif (in_array($key, ['once', 'pin', 'pinspacing', 'markers'], true)) {
             $scroll[$realKey] = $this->parseBool($value);
        } elseif ($key === 'anticipatepin') {
             $scroll[$realKey] = (float) $value;
        } else {
             $scroll[$realKey] = $value;
        }
    }

    private function assignTargetKey(array &$target, string $key, string $value): void
    {
        if ($key === 'selector') {
            $target['selector'] = $value;
        }
    }
    private function parseVarsList(string $value): array
    {
        $vars = [];
        
        
        
        $parts = preg_split("/,(?![^(]*\))/", $value);

        if (!$parts) { 
            return []; 
        }

        foreach ($parts as $part) {
            $part = trim($part);
            if ($part === '' || !str_contains($part, '=')) {
                continue;
            }

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
