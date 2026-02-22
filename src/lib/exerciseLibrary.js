/**
 * Static exercise catalog for lift workouts, templates, and add-activity.
 * Schema: id, name, muscleGroup, equipment, instructions (optional).
 * Muscle groups: chest, back, shoulders, legs, arms, core.
 */
export const MUSCLE_GROUPS = [
  { value: 'chest', label: 'Chest' },
  { value: 'back', label: 'Back' },
  { value: 'shoulders', label: 'Shoulders' },
  { value: 'legs', label: 'Legs' },
  { value: 'arms', label: 'Arms' },
  { value: 'core', label: 'Core' },
];

export const EXERCISE_CATALOG = [
  // Chest
  { id: 'bench_press', name: 'Bench Press', muscleGroup: 'chest', equipment: 'barbell', instructions: 'Lower bar to chest, press up to lockout.' },
  { id: 'incline_bench', name: 'Incline Bench Press', muscleGroup: 'chest', equipment: 'barbell', instructions: 'Set bench to 30–45°, press bar from upper chest.' },
  { id: 'decline_bench', name: 'Decline Bench Press', muscleGroup: 'chest', equipment: 'barbell', instructions: 'Decline bench, press bar from lower chest.' },
  { id: 'dumbbell_press', name: 'Dumbbell Chest Press', muscleGroup: 'chest', equipment: 'dumbbell', instructions: 'Press dumbbells from chest to full extension.' },
  { id: 'incline_dumbbell_press', name: 'Incline Dumbbell Press', muscleGroup: 'chest', equipment: 'dumbbell', instructions: 'Incline bench, press dumbbells from upper chest.' },
  { id: 'dip', name: 'Dip', muscleGroup: 'chest', equipment: 'bodyweight', instructions: 'Lower until upper arms parallel, press up.' },
  { id: 'push_up', name: 'Push-Up', muscleGroup: 'chest', equipment: 'bodyweight', instructions: 'Lower chest to floor, press back up.' },
  { id: 'cable_fly', name: 'Cable Fly', muscleGroup: 'chest', equipment: 'cable', instructions: 'Bring handles together in front of chest.' },
  { id: 'pec_deck', name: 'Pec Deck Fly', muscleGroup: 'chest', equipment: 'machine', instructions: 'Squeeze pads together in front of chest.' },
  { id: 'dumbbell_fly', name: 'Dumbbell Fly', muscleGroup: 'chest', equipment: 'dumbbell', instructions: 'Arc arms open and together with slight bend.' },
  { id: 'incline_fly', name: 'Incline Dumbbell Fly', muscleGroup: 'chest', equipment: 'dumbbell', instructions: 'Incline bench, arc dumbbells up and in.' },
  { id: 'landmine_press', name: 'Landmine Press', muscleGroup: 'chest', equipment: 'barbell', instructions: 'Press one end of barbell from chest.' },
  { id: 'chest_squeeze', name: 'Chest Squeeze Press', muscleGroup: 'chest', equipment: 'dumbbell', instructions: 'Press dumbbells together throughout rep.' },
  { id: 'single_arm_press', name: 'Single-Arm Dumbbell Press', muscleGroup: 'chest', equipment: 'dumbbell', instructions: 'Press one dumbbell at a time for stability.' },
  { id: 'close_grip_bench', name: 'Close-Grip Bench Press', muscleGroup: 'chest', equipment: 'barbell', instructions: 'Hands shoulder-width or closer, press and squeeze triceps.' },
  { id: 'floor_press', name: 'Floor Press', muscleGroup: 'chest', equipment: 'barbell', instructions: 'Press from floor, elbows touch floor at bottom.' },
  { id: 'smith_bench', name: 'Smith Machine Bench Press', muscleGroup: 'chest', equipment: 'machine', instructions: 'Bench press on Smith machine for controlled path.' },
  { id: 'chest_press_machine', name: 'Chest Press Machine', muscleGroup: 'chest', equipment: 'machine', instructions: 'Push handles forward from chest.' },
  // Back
  { id: 'deadlift', name: 'Deadlift', muscleGroup: 'back', equipment: 'barbell', instructions: 'Hinge at hips, drive through heels.' },
  { id: 'row', name: 'Barbell Row', muscleGroup: 'back', equipment: 'barbell', instructions: 'Hinge, pull bar to lower chest.' },
  { id: 'pullup', name: 'Pull-up', muscleGroup: 'back', equipment: 'bodyweight', instructions: 'Hang from bar, pull until chin over bar.' },
  { id: 'chinup', name: 'Chin-up', muscleGroup: 'back', equipment: 'bodyweight', instructions: 'Palms toward you, pull until chin over bar.' },
  { id: 'lat_pulldown', name: 'Lat Pulldown', muscleGroup: 'back', equipment: 'cable', instructions: 'Pull bar to upper chest, control return.' },
  { id: 't_bar_row', name: 'T-Bar Row', muscleGroup: 'back', equipment: 'barbell', instructions: 'Hinge, pull handle to lower chest.' },
  { id: 'dumbbell_row', name: 'Dumbbell Row', muscleGroup: 'back', equipment: 'dumbbell', instructions: 'Support on bench, row dumbbell to hip.' },
  { id: 'single_arm_row', name: 'Single-Arm Cable Row', muscleGroup: 'back', equipment: 'cable', instructions: 'Row handle to hip, squeeze shoulder blade.' },
  { id: 'seated_cable_row', name: 'Seated Cable Row', muscleGroup: 'back', equipment: 'cable', instructions: 'Sit, pull handle to lower chest.' },
  { id: 'pendlay_row', name: 'Pendlay Row', muscleGroup: 'back', equipment: 'barbell', instructions: 'Bar touches floor each rep, explosive pull.' },
  { id: 'inverted_row', name: 'Inverted Row', muscleGroup: 'back', equipment: 'bodyweight', instructions: 'Hang under bar, pull chest to bar.' },
  { id: 'face_pull', name: 'Face Pull', muscleGroup: 'back', equipment: 'cable', instructions: 'Pull rope to face, externally rotate.' },
  { id: 'straight_arm_pulldown', name: 'Straight-Arm Pulldown', muscleGroup: 'back', equipment: 'cable', instructions: 'Arms straight, pull bar to thighs.' },
  { id: 'rack_pull', name: 'Rack Pull', muscleGroup: 'back', equipment: 'barbell', instructions: 'Deadlift from pins above knee.' },
  { id: 'romanian_deadlift', name: 'Romanian Deadlift', muscleGroup: 'back', equipment: 'barbell', instructions: 'Hinge at hips, slight knee bend.' },
  { id: 'good_morning', name: 'Good Morning', muscleGroup: 'back', equipment: 'barbell', instructions: 'Bar on back, hinge at hips.' },
  { id: 'back_extension', name: 'Back Extension', muscleGroup: 'back', equipment: 'bodyweight', instructions: 'Hinge at hips on pad, extend up.' },
  { id: 'reverse_fly', name: 'Reverse Fly', muscleGroup: 'back', equipment: 'dumbbell', instructions: 'Bend forward, raise dumbbells out to sides.' },
  { id: 'cable_row_wide', name: 'Wide-Grip Cable Row', muscleGroup: 'back', equipment: 'cable', instructions: 'Wide grip, pull to lower chest.' },
  { id: 'pull_up_assisted', name: 'Assisted Pull-up', muscleGroup: 'back', equipment: 'machine', instructions: 'Use assist to pull chin over bar.' },
  // Shoulders
  { id: 'ohp', name: 'Overhead Press', muscleGroup: 'shoulders', equipment: 'barbell', instructions: 'Press bar from front rack to lockout overhead.' },
  { id: 'dumbbell_ohp', name: 'Dumbbell Shoulder Press', muscleGroup: 'shoulders', equipment: 'dumbbell', instructions: 'Press dumbbells from shoulders to lockout.' },
  { id: 'arnold_press', name: 'Arnold Press', muscleGroup: 'shoulders', equipment: 'dumbbell', instructions: 'Rotate palms as you press up.' },
  { id: 'lateral_raise', name: 'Lateral Raise', muscleGroup: 'shoulders', equipment: 'dumbbell', instructions: 'Raise dumbbells out to sides to shoulder height.' },
  { id: 'front_raise', name: 'Front Raise', muscleGroup: 'shoulders', equipment: 'dumbbell', instructions: 'Raise dumbbells in front to shoulder height.' },
  { id: 'rear_delt_fly', name: 'Rear Delt Fly', muscleGroup: 'shoulders', equipment: 'dumbbell', instructions: 'Bend forward, raise weights behind you.' },
  { id: 'cable_lateral', name: 'Cable Lateral Raise', muscleGroup: 'shoulders', equipment: 'cable', instructions: 'Raise cable handle out to side.' },
  { id: 'face_pull_shoulder', name: 'Face Pull (Rear Delt)', muscleGroup: 'shoulders', equipment: 'cable', instructions: 'Pull rope to face, squeeze rear delts.' },
  { id: 'push_press', name: 'Push Press', muscleGroup: 'shoulders', equipment: 'barbell', instructions: 'Use leg drive to press bar overhead.' },
  { id: 'landmine_shoulder', name: 'Landmine Shoulder Press', muscleGroup: 'shoulders', equipment: 'barbell', instructions: 'Press angled bar from shoulder.' },
  { id: 'upright_row', name: 'Upright Row', muscleGroup: 'shoulders', equipment: 'barbell', instructions: 'Pull bar to chin, elbows high.' },
  { id: 'dumbbell_upright', name: 'Dumbbell Upright Row', muscleGroup: 'shoulders', equipment: 'dumbbell', instructions: 'Pull dumbbells to chin level.' },
  { id: 'pike_pushup', name: 'Pike Push-Up', muscleGroup: 'shoulders', equipment: 'bodyweight', instructions: 'Hips high, lower head between hands, press up.' },
  { id: 'handstand_pushup', name: 'Handstand Push-Up', muscleGroup: 'shoulders', equipment: 'bodyweight', instructions: 'Handstand, lower and press up.' },
  { id: 'machine_shoulder_press', name: 'Machine Shoulder Press', muscleGroup: 'shoulders', equipment: 'machine', instructions: 'Press handles overhead.' },
  { id: 'reverse_pec_deck', name: 'Reverse Pec Deck', muscleGroup: 'shoulders', equipment: 'machine', instructions: 'Squeeze pads behind you for rear delts.' },
  { id: 'scott_press', name: 'Scott Press', muscleGroup: 'shoulders', equipment: 'dumbbell', instructions: 'Press dumbbells in Y motion.' },
  { id: 'seated_lateral', name: 'Seated Lateral Raise', muscleGroup: 'shoulders', equipment: 'dumbbell', instructions: 'Seated, raise dumbbells to sides.' },
  // Legs
  { id: 'squat', name: 'Back Squat', muscleGroup: 'legs', equipment: 'barbell', instructions: 'Squat to parallel or below, drive up.' },
  { id: 'front_squat', name: 'Front Squat', muscleGroup: 'legs', equipment: 'barbell', instructions: 'Bar on front rack, squat with upright torso.' },
  { id: 'goblet_squat', name: 'Goblet Squat', muscleGroup: 'legs', equipment: 'dumbbell', instructions: 'Hold dumbbell at chest, squat deep.' },
  { id: 'lunge', name: 'Walking Lunge', muscleGroup: 'legs', equipment: 'bodyweight', instructions: 'Step forward, lower back knee, alternate.' },
  { id: 'bulgarian_split', name: 'Bulgarian Split Squat', muscleGroup: 'legs', equipment: 'dumbbell', instructions: 'Rear foot elevated, lower and drive up.' },
  { id: 'leg_press', name: 'Leg Press', muscleGroup: 'legs', equipment: 'machine', instructions: 'Press platform away, control descent.' },
  { id: 'leg_curl', name: 'Leg Curl', muscleGroup: 'legs', equipment: 'machine', instructions: 'Curl heels toward glutes.' },
  { id: 'leg_extension', name: 'Leg Extension', muscleGroup: 'legs', equipment: 'machine', instructions: 'Extend legs against pad.' },
  { id: 'romanian_deadlift_leg', name: 'Romanian Deadlift', muscleGroup: 'legs', equipment: 'barbell', instructions: 'Hinge at hips, feel hamstring stretch.' },
  { id: 'stiff_leg_deadlift', name: 'Stiff-Leg Deadlift', muscleGroup: 'legs', equipment: 'barbell', instructions: 'Minimal knee bend, hinge at hips.' },
  { id: 'hack_squat', name: 'Hack Squat', muscleGroup: 'legs', equipment: 'machine', instructions: 'Squat in hack machine, back on pad.' },
  { id: 'step_up', name: 'Step-Up', muscleGroup: 'legs', equipment: 'dumbbell', instructions: 'Step onto box, drive up, alternate.' },
  { id: 'calf_raise', name: 'Standing Calf Raise', muscleGroup: 'legs', equipment: 'machine', instructions: 'Rise onto toes, lower with control.' },
  { id: 'seated_calf', name: 'Seated Calf Raise', muscleGroup: 'legs', equipment: 'machine', instructions: 'Rise onto toes in seated position.' },
  { id: 'single_leg_rdl', name: 'Single-Leg RDL', muscleGroup: 'legs', equipment: 'dumbbell', instructions: 'Balance on one leg, hinge and extend.' },
  { id: 'lateral_lunge', name: 'Lateral Lunge', muscleGroup: 'legs', equipment: 'bodyweight', instructions: 'Step to side, sit back, drive back to center.' },
  { id: 'box_squat', name: 'Box Squat', muscleGroup: 'legs', equipment: 'barbell', instructions: 'Squat until seated on box, stand.' },
  { id: 'pistol_squat', name: 'Pistol Squat', muscleGroup: 'legs', equipment: 'bodyweight', instructions: 'Single-leg squat, other leg extended.' },
  { id: 'hip_thrust', name: 'Hip Thrust', muscleGroup: 'legs', equipment: 'barbell', instructions: 'Upper back on bench, drive hips up.' },
  { id: 'glute_bridge', name: 'Glute Bridge', muscleGroup: 'legs', equipment: 'bodyweight', instructions: 'Feet flat, drive hips up, squeeze glutes.' },
  { id: 'leg_curl_lying', name: 'Lying Leg Curl', muscleGroup: 'legs', equipment: 'machine', instructions: 'Lying face down, curl weight toward glutes.' },
  { id: 'sissy_squat', name: 'Sissy Squat', muscleGroup: 'legs', equipment: 'bodyweight', instructions: 'Lean back while keeping knees over toes.' },
  { id: 'v_squat', name: 'V-Squat', muscleGroup: 'legs', equipment: 'machine', instructions: 'Squat in V-squat machine.' },
  // Arms
  { id: 'curl', name: 'Barbell Curl', muscleGroup: 'arms', equipment: 'barbell', instructions: 'Curl bar to shoulders, control descent.' },
  { id: 'tricep_ext', name: 'Tricep Extension', muscleGroup: 'arms', equipment: 'cable', instructions: 'Extend arms from forehead or cable.' },
  { id: 'dumbbell_curl', name: 'Dumbbell Curl', muscleGroup: 'arms', equipment: 'dumbbell', instructions: 'Curl dumbbells to shoulders.' },
  { id: 'hammer_curl', name: 'Hammer Curl', muscleGroup: 'arms', equipment: 'dumbbell', instructions: 'Neutral grip curl, thumbs up.' },
  { id: 'preacher_curl', name: 'Preacher Curl', muscleGroup: 'arms', equipment: 'barbell', instructions: 'Curl on preacher pad, full stretch.' },
  { id: 'concentration_curl', name: 'Concentration Curl', muscleGroup: 'arms', equipment: 'dumbbell', instructions: 'Elbow on inner thigh, curl up.' },
  { id: 'cable_curl', name: 'Cable Curl', muscleGroup: 'arms', equipment: 'cable', instructions: 'Curl bar or rope to shoulders.' },
  { id: 'tricep_pushdown', name: 'Tricep Pushdown', muscleGroup: 'arms', equipment: 'cable', instructions: 'Push bar or rope down, lock elbows at side.' },
  { id: 'skull_crusher', name: 'Skull Crusher', muscleGroup: 'arms', equipment: 'barbell', instructions: 'Lower bar to forehead, extend.' },
  { id: 'overhead_tricep', name: 'Overhead Tricep Extension', muscleGroup: 'arms', equipment: 'dumbbell', instructions: 'Dumbbell behind head, extend up.' },
  { id: 'tricep_dip', name: 'Tricep Dip', muscleGroup: 'arms', equipment: 'bodyweight', instructions: 'Hands on bench, lower and press.' },
  { id: 'close_grip_pushup', name: 'Close-Grip Push-Up', muscleGroup: 'arms', equipment: 'bodyweight', instructions: 'Hands close, tuck elbows, push up.' },
  { id: 'incline_curl', name: 'Incline Dumbbell Curl', muscleGroup: 'arms', equipment: 'dumbbell', instructions: 'Incline bench, curl with stretch.' },
  { id: 'reverse_curl', name: 'Reverse Curl', muscleGroup: 'arms', equipment: 'barbell', instructions: 'Overhand grip, curl to shoulders.' },
  { id: 'zottman_curl', name: 'Zottman Curl', muscleGroup: 'arms', equipment: 'dumbbell', instructions: 'Curl up supinated, rotate and lower pronated.' },
  { id: 'spider_curl', name: 'Spider Curl', muscleGroup: 'arms', equipment: 'barbell', instructions: 'Lean on incline bench, curl from below.' },
  { id: 'lying_tricep', name: 'Lying Tricep Extension', muscleGroup: 'arms', equipment: 'barbell', instructions: 'Lie flat, lower bar to forehead, extend.' },
  { id: 'diamond_pushup', name: 'Diamond Push-Up', muscleGroup: 'arms', equipment: 'bodyweight', instructions: 'Hands in diamond shape, push up.' },
  { id: 'rope_pushdown', name: 'Rope Pushdown', muscleGroup: 'arms', equipment: 'cable', instructions: 'Push rope down, spread at bottom.' },
  { id: 'kickback', name: 'Tricep Kickback', muscleGroup: 'arms', equipment: 'dumbbell', instructions: 'Hinge, extend arm back, squeeze.' },
  { id: 'machine_curl', name: 'Machine Curl', muscleGroup: 'arms', equipment: 'machine', instructions: 'Curl with machine pad or bar.' },
  { id: 'machine_tricep', name: 'Machine Tricep Extension', muscleGroup: 'arms', equipment: 'machine', instructions: 'Extend arms against machine resistance.' },
  // Core
  { id: 'plank', name: 'Plank', muscleGroup: 'core', equipment: 'bodyweight', instructions: 'Hold push-up position, core tight.' },
  { id: 'crunch', name: 'Crunch', muscleGroup: 'core', equipment: 'bodyweight', instructions: 'Curl shoulders off floor, squeeze abs.' },
  { id: 'leg_raise', name: 'Hanging Leg Raise', muscleGroup: 'core', equipment: 'bodyweight', instructions: 'Hang from bar, raise legs to parallel or higher.' },
  { id: 'russian_twist', name: 'Russian Twist', muscleGroup: 'core', equipment: 'bodyweight', instructions: 'Seated, rotate torso side to side.' },
  { id: 'bicycle_crunch', name: 'Bicycle Crunch', muscleGroup: 'core', equipment: 'bodyweight', instructions: 'Alternate elbow to knee in pedaling motion.' },
  { id: 'dead_bug', name: 'Dead Bug', muscleGroup: 'core', equipment: 'bodyweight', instructions: 'On back, extend opposite arm and leg.' },
  { id: 'bird_dog', name: 'Bird Dog', muscleGroup: 'core', equipment: 'bodyweight', instructions: 'On all fours, extend opposite arm and leg.' },
  { id: 'cable_crunch', name: 'Cable Crunch', muscleGroup: 'core', equipment: 'cable', instructions: 'Pull rope down while crunching.' },
  { id: 'ab_wheel', name: 'Ab Wheel Rollout', muscleGroup: 'core', equipment: 'other', instructions: 'Roll out and back, keep core braced.' },
  { id: 'side_plank', name: 'Side Plank', muscleGroup: 'core', equipment: 'bodyweight', instructions: 'Support on one forearm, stack feet.' },
  { id: 'mountain_climber', name: 'Mountain Climber', muscleGroup: 'core', equipment: 'bodyweight', instructions: 'Drive knees toward chest in plank.' },
  { id: 'v_up', name: 'V-Up', muscleGroup: 'core', equipment: 'bodyweight', instructions: 'Lift arms and legs to touch at top.' },
  { id: 'reverse_crunch', name: 'Reverse Crunch', muscleGroup: 'core', equipment: 'bodyweight', instructions: 'Lift hips and curl legs toward chest.' },
  { id: 'pallof_press', name: 'Pallof Press', muscleGroup: 'core', equipment: 'cable', instructions: 'Hold cable at chest, press out and return.' },
  { id: 'wood_chop', name: 'Wood Chop', muscleGroup: 'core', equipment: 'cable', instructions: 'Rotate and pull cable across body.' },
  { id: 'hollow_hold', name: 'Hollow Hold', muscleGroup: 'core', equipment: 'bodyweight', instructions: 'Arms and legs off floor, hold banana shape.' },
  { id: 'flutter_kick', name: 'Flutter Kick', muscleGroup: 'core', equipment: 'bodyweight', instructions: 'On back, small rapid kicks, arms at sides.' },
  { id: 'toe_touch', name: 'Toe Touch', muscleGroup: 'core', equipment: 'bodyweight', instructions: 'On back, reach hands to toes, crunch up.' },
  { id: 'decline_crunch', name: 'Decline Crunch', muscleGroup: 'core', equipment: 'bodyweight', instructions: 'Decline bench, crunch toward knees.' },
  { id: 'windshield_wiper', name: 'Windshield Wiper', muscleGroup: 'core', equipment: 'bodyweight', instructions: 'Hang, rotate legs side to side.' },
];

export function getExerciseById(id) {
  return EXERCISE_CATALOG.find((e) => e.id === id) ?? null;
}

export function getExercisesByMuscleGroup(muscleGroup) {
  if (!muscleGroup) return EXERCISE_CATALOG;
  return EXERCISE_CATALOG.filter((e) => e.muscleGroup === muscleGroup);
}

/**
 * Search exercises by name (case-insensitive).
 * @param {string} query - Search term
 * @returns {Array} Matching exercises
 */
export function searchExercises(query) {
  if (!query || typeof query !== 'string') return EXERCISE_CATALOG;
  const q = query.trim().toLowerCase();
  if (!q) return EXERCISE_CATALOG;
  return EXERCISE_CATALOG.filter(
    (e) =>
      e.name.toLowerCase().includes(q) ||
      (e.muscleGroup && e.muscleGroup.toLowerCase().includes(q)) ||
      (e.equipment && e.equipment.toLowerCase().includes(q))
  );
}
