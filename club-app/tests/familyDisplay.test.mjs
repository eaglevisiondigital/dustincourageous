import test from 'node:test';
import assert from 'node:assert/strict';
import {
  familyRelationship,
  familyRoleLabel,
  familyRoleLower,
  familyControlLabel
} from '../src/lib/familyDisplay.ts';

test('parent relationship drives parent presentation vocabulary', () => {
  assert.equal(familyRelationship('parent'), 'parent');
  assert.equal(familyRoleLabel('parent'), 'Parent');
  assert.equal(familyRoleLower('parent'), 'parent');
  assert.equal(familyControlLabel('parent'), 'Parent Controlled');
});

test('guardian relationship drives guardian presentation vocabulary', () => {
  assert.equal(familyRelationship('guardian'), 'guardian');
  assert.equal(familyRoleLabel('guardian'), 'Guardian');
  assert.equal(familyRoleLower('guardian'), 'guardian');
  assert.equal(familyControlLabel('guardian'), 'Guardian Controlled');
});

test('missing or legacy relationship safely falls back to guardian presentation', () => {
  for (const value of [undefined, null, '', 'adult', 'Parent']) {
    assert.equal(familyRelationship(value), 'guardian');
    assert.equal(familyRoleLabel(value), 'Guardian');
    assert.equal(familyRoleLower(value), 'guardian');
    assert.equal(familyControlLabel(value), 'Guardian Controlled');
  }
});
