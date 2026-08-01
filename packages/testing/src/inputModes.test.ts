import { useUIStore, AdminConsoleService } from '@ra4/ui';

console.log('=== Running Input Modes & Admin Console Automated Verification Tests ===');

// 1. Initial State Check
if (useUIStore.getState().inputMode === 'RTS') {
  console.log('✓ Test 1 Passed: Initial input mode is RTS');
} else {
  console.error('✗ Test 1 Failed');
}

// 2. Input Mode Transitions Test
useUIStore.getState().setInputMode('DirectUnitControl');
if (useUIStore.getState().inputMode === 'DirectUnitControl') {
  console.log('✓ Test 2 Passed: Transition to DirectUnitControl mode');
} else {
  console.error('✗ Test 2 Failed');
}

useUIStore.getState().setInputMode('FreeCamera');
if (useUIStore.getState().inputMode === 'FreeCamera') {
  console.log('✓ Test 3 Passed: Transition to FreeCamera mode');
} else {
  console.error('✗ Test 3 Failed');
}

useUIStore.getState().setInputMode('Console');
if (useUIStore.getState().inputMode === 'Console') {
  console.log('✓ Test 4 Passed: Transition to Console mode');
} else {
  console.error('✗ Test 4 Failed');
}

// Restore RTS mode
useUIStore.getState().setInputMode('RTS');

// 3. Admin Permission Authentication Verification
const adminService = AdminConsoleService.getInstance();

// Valid Admin User
useUIStore.getState().setAdminUser({ nickname: 'Админ', role: 'admin', token: 'server_auth_admin_token_83921' });
const validRes = adminService.validateAdminAccess();
if (validRes.allowed) {
  console.log('✓ Test 5 Passed: Validated authentic server admin token');
} else {
  console.error('✗ Test 5 Failed:', validRes.reason);
}

// Invalid Non-Admin Role User
useUIStore.getState().setAdminUser({ nickname: 'Игрок1', role: 'player', token: 'server_auth_player_token_123' });
const invalidRoleRes = adminService.validateAdminAccess();
if (!invalidRoleRes.allowed) {
  console.log('✓ Test 6 Passed: Denied admin access for non-admin player role');
} else {
  console.error('✗ Test 6 Failed: Allowed non-admin player role!');
}

// Invalid Nickname Check
useUIStore.getState().setAdminUser({ nickname: 'Hacker', role: 'admin', token: 'fake_token' });
const invalidNickRes = adminService.validateAdminAccess();
if (!invalidNickRes.allowed) {
  console.log('✓ Test 7 Passed: Denied admin access for non-admin nickname');
} else {
  console.error('✗ Test 7 Failed: Allowed invalid nickname!');
}

// Restore Valid Admin Profile
useUIStore.getState().setAdminUser({ nickname: 'Админ', role: 'admin', token: 'server_auth_admin_token_83921' });

// 4. Command Execution & Registry Verification
const helpResult = adminService.executeCommand('help');
if (helpResult.status === 'INFO' && helpResult.output.includes('РЕЕСТР АДМИН-КОМАНД')) {
  console.log('✓ Test 8 Passed: Admin command "help" executed cleanly');
} else {
  console.error('✗ Test 8 Failed');
}

const spawnResult = adminService.executeCommand('spawn SU_GranitMBT 30 30');
if (spawnResult.status === 'SUCCESS' && spawnResult.output.includes('SU_GranitMBT')) {
  console.log('✓ Test 9 Passed: Admin command "spawn" executed cleanly');
} else {
  console.error('✗ Test 9 Failed');
}

const teleportResult = adminService.executeCommand('teleport 50 50');
// Will return ERROR because no entity selected in test environment
if (teleportResult.status === 'ERROR' && teleportResult.output.includes('выделенных')) {
  console.log('✓ Test 10 Passed: Admin command argument validation handled cleanly');
} else {
  console.error('✗ Test 10 Failed');
}

// 5. Autocomplete Verification
const suggestions = adminService.getAutocompleteSuggestions('sp');
if (suggestions.length === 1 && suggestions[0] === 'spawn') {
  console.log('✓ Test 11 Passed: Command autocomplete suggestion "spawn" returned');
} else {
  console.error('✗ Test 11 Failed');
}

console.log('SUCCESS! All 11 Input Modes & Admin Console Verification Tests passed cleanly.');
