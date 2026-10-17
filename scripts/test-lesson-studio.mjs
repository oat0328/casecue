import assert from 'node:assert/strict';
import {makeWordSearch} from '../src/lib/wordSearch.mjs';
import {normalizePlan} from '../src/lib/lessonPlanSchema.js';
import {downloadAdminPlan} from '../src/lib/adminLesson.js';
import {jsPDF} from 'jspdf';
const words='evidence,inference,detail,summary,passage,context,purpose,compare,contrast,explain';
const puzzle=makeWordSearch(words);assert.equal(puzzle.words.length,10);
for(const x of puzzle.placements)assert.equal(puzzle.grid[x.row].slice(x.col,x.col+x.word.length).join(''),x.word);
assert.deepEqual(puzzle,makeWordSearch(words));assert.throws(()=>makeWordSearch('one,two'));assert.throws(()=>makeWordSearch(words+',eleven'));
assert.equal(normalizePlan({admin_plan:'public',teacher_walkaround:'private',word_search_words:words}).admin_plan,'public');
let pdf;const save=jsPDF.API.save;jsPDF.API.save=function(){pdf=this.output();};
try{downloadAdminPlan({plan:{title:'Lesson',teacher:'Teacher',date:'2026-10-28',admin_plan:'Objective: justify an inference using evidence.',mini_lecture:'PRIVATE_SCRIPT',answer_key:'PRIVATE_ANSWER'}});assert.ok(pdf.includes('Objective: justify'));assert.ok(!pdf.includes('PRIVATE_SCRIPT'));assert.ok(!pdf.includes('PRIVATE_ANSWER'));assert.ok(pdf.includes('Page 1 of 1'));assert.throws(()=>downloadAdminPlan({plan:{admin_plan:'Highly effective rubric coaching'}}));assert.throws(()=>downloadAdminPlan({plan:{}}));}finally{jsPDF.API.save=save;}
console.log('Lesson Studio checks passed: deterministic puzzle, input validation, saved plan fields, private/admin separation and numbered PDF.');
