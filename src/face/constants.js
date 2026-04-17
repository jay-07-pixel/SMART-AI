/** Mirrors the Android FaceDetectionActivity tuning (heuristic web port; not ML Kit binary parity). */

export const FACE_MATCH_THRESHOLD_STRICT = 0.95;
export const FACE_MATCH_THRESHOLD_NORMAL = 0.88;
export const FACE_MATCH_THRESHOLD_RELAXED = 0.85;

export const MAX_HEAD_ANGLE = 35;
export const MIN_EYE_OPEN_PROBABILITY = 0.35;
export const MIN_FACE_SIZE_PIXELS = 120;
export const MIN_FACE_PROPORTION = 0.15;
export const MAX_FACE_PROPORTION = 0.85;

export const GOOD_LIGHTING_THRESHOLD = 180;
export const POOR_LIGHTING_THRESHOLD = 100;

/** Inner gate inside simulateFaceComparison for captured face box */
export const MIN_FACE_SIZE = 80;

export const WEIGHT_RATIO = 8;
export const WEIGHT_EYE = 3;
export const WEIGHT_SMILE = 0.5;
export const WEIGHT_HEAD_ANGLE = 6;

export const BORDERLINE_DELTA = 0.05;
export const BORDERLINE_CRITICAL_MIN = 0.82;
export const MIN_RATIO_SIMILARITY = 0.75;
export const MIN_BEST_FEATURE = 0.7;

export const SIZE_RATIO_MIN = 0.3;
export const SIZE_RATIO_MAX = 3.0;

export const PROPORTIONS_ANGLE_MAX_DIFF = 32;
export const PROPORTIONS_ASPECT_MAX_DIFF = 0.15;
export const PROPORTIONS_EYE_SPACING_MAX_DIFF = 0.12;
export const PROPORTIONS_SMILE_DIFF_FAIL = 0.85;
