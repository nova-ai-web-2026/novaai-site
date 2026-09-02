export function pressRoleForBall(ballX, ballZ, teamDir) {
  const ownGoal = -teamDir * 46;
  const distFromOwnGoal = (ballX - ownGoal) * teamDir;
  if (distFromOwnGoal > 54) return 4;
  if (distFromOwnGoal > 29) return 3;
  return ballZ < 0 ? 1 : 2;
}

export function pressHome(teamDir, role) {
  const ownGoal = -teamDir * 46;
  const depth = role <= 2 ? 14 : role === 3 ? 27 : 35;
  const z = role === 1 ? -10 : role === 2 ? 10 : 0;
  return { x: ownGoal + teamDir * depth, z };
}

export function boundedContainTarget(ballX, ballZ, ballVx, ballVz, teamDir, role, transition = false) {
  const ownGoal = -teamDir * 46;
  const home = pressHome(teamDir, role);
  const predict = transition ? 0.16 : 0.10;
  const px = ballX + ballVx * predict;
  const pz = ballZ + ballVz * predict;

  const gx = ownGoal - px;
  const gz = -pz;
  const gl = Math.hypot(gx, gz) || 1;
  const containGap = role <= 2 ? 2.7 : role === 3 ? 2.9 : 3.1;
  const rawX = px + (gx / gl) * containGap;
  const rawZ = pz + (gz / gl) * containGap;

  const maxRoam = role <= 2 ? 10.5 : role === 3 ? 9.0 : 10.0;
  const dx = rawX - home.x;
  const dz = rawZ - home.z;
  const d = Math.hypot(dx, dz) || 1;
  const k = Math.min(1, maxRoam / d);
  return { x: home.x + dx * k, z: home.z + dz * k, homeX: home.x, homeZ: home.z, maxRoam };
}
