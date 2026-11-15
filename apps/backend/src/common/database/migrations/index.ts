import { Baseline1900000000000 } from './1900000000000-baseline.js';
import { TechnologyPortal1900000000001 } from './1900000000001-technology-portal.js';
import { AiStyles1900000000002 } from './1900000000002-ai-styles.js';

/** Every migration, in order. A fresh installation applies the baseline; later changes are appended here. */
export const DATABASE_MIGRATIONS = [Baseline1900000000000, TechnologyPortal1900000000001, AiStyles1900000000002];
