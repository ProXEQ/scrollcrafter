/**
 * Internal dependencies
 */
import type { DistributeSprintfArgs, TranslatableText } from './types';
export declare function sprintf<T extends string>(format: T | TranslatableText<T>, ...args: DistributeSprintfArgs<T>): string;
export declare function sprintf<T extends string>(format: T | TranslatableText<T>, args: DistributeSprintfArgs<T>): string;
//# sourceMappingURL=sprintf.d.ts.map