import assert from 'node:assert/strict';
import {evaluateExpression,answersEquivalent,gradeDeterministicRows,comparePassRows} from '../base44/shared/deterministicMath.js';

const cases=[
 ['7 × 8',56],['12 ÷ 3',4],['1/2 + 1/4',0.75],['2.5 * 4',10],['25% of 80',20],['x + 3 = 7',4],['3x = 12',4],['2x + 3 = 9',3]
];
for(const [expr,want] of cases) assert.ok(Math.abs(evaluateExpression(expr)-want)<1e-9,`${expr} should equal ${want}`);
assert.equal(answersEquivalent('3/4',0.75),true);
assert.equal(answersEquivalent('0.75',0.75),true);
assert.equal(answersEquivalent('54',56),false);

const fixture=[
 {item:'1',problem_text:'6 × 4',student_response:'24'},
 {item:'2',problem_text:'7 × 8',student_response:'54'},
 {item:'3',problem_text:'9 × 5',student_response:'45'},
 {item:'4',problem_text:'8 × 8',student_response:''}
];
const graded=gradeDeterministicRows(fixture);
assert.equal(graded.possible,4);
assert.equal(graded.earned,2);
assert.equal(graded.percentage,50);
assert.equal(graded.rows[1].correct_answer,'56');
assert.equal(graded.rows[3].status,'blank');

const d=comparePassRows(graded.rows,[...graded.rows.slice(0,1),{...graded.rows[1],student_response:'56'},...graded.rows.slice(2)]);
assert.ok(d.some(x=>x.type==='student_answer'));

console.log('Smart Grader deterministic regression tests: PASS');
