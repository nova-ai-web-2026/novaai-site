import assert from 'node:assert/strict';
import { pressRoleForBall, pressHome, boundedContainTarget } from './ai-pressure-policy.mjs';

const dir = -1;
assert.equal(pressRoleForBall(-25, 0, dir), 4, 'high press should be striker');
assert.equal(pressRoleForBall(0, 0, dir), 3, 'middle third should hand off to midfielder');
assert.equal(pressRoleForBall(24, -18, dir), 1, 'left defensive lane should hand off to left defender');
assert.equal(pressRoleForBall(24, 18, dir), 2, 'right defensive lane should hand off to right defender');

const path = [[-30,0],[-15,0],[0,0],[15,0],[25,-15],[30,15]];
const roles = path.map(([x,z]) => pressRoleForBall(x, z, dir));
assert.ok(new Set(roles).size >= 4, `expected pressure handoffs, got ${roles.join(',')}`);
assert.notEqual(roles[0], roles.at(-1), 'same player must not chase across the whole pitch');

for (const [x,z] of [[-25,0],[0,0],[20,-20],[20,20],[36,0]]) {
  const role = pressRoleForBall(x, z, dir);
  const t = boundedContainTarget(x, z, 6, 2, dir, role, false);
  const home = pressHome(dir, role);
  const roam = Math.hypot(t.x - home.x, t.z - home.z);
  assert.ok(roam <= t.maxRoam + 1e-9, `role ${role} roamed ${roam} beyond ${t.maxRoam}`);
  const ownGoal = 46;
  assert.ok(Math.hypot(t.x - ownGoal, t.z) <= Math.hypot(x - ownGoal, z) + 0.01, 'presser target must stay goal-side');
}

console.log('PASS ai-pressure-policy');
console.log('roles along test path:', roles.join(' -> '));
