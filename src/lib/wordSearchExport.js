import {jsPDF} from 'jspdf';
import {makeWordSearch} from './wordSearch.mjs';
import {installLessonFont} from './lessonPdfFont.js';
export function exportWordSearchPdf(plan,key=false){
 const {words,grid,placements}=makeWordSearch(plan.word_search_words),doc=new jsPDF();installLessonFont(doc);
 doc.setFontSize(17);doc.text(key?'Word search — answer key':'Assignment word search',15,20);doc.setFontSize(10);doc.text(`${plan.teacher||''} | ${plan.date||''}`,15,29);const title=doc.splitTextToSize(String(plan.title||'Lesson'),180);doc.text(title[0],15,36);doc.text('Find the ten words. Words run left to right.',15,45);
 doc.setFontSize(13);grid.forEach((row,y)=>row.forEach((letter,x)=>{const hit=placements.some(p=>p.row===y&&x>=p.col&&x<p.col+p.word.length);if(key&&hit){doc.setFillColor(222,235,255);doc.rect(18+x*9,55+y*9,8,8,'F');}doc.setFont('LessonSans',key&&hit?'bold':'normal');doc.setTextColor(key&&!hit?155:20);doc.text(letter,20+x*9,60+y*9);}));
 doc.setTextColor(20);doc.setFont('LessonSans','normal');doc.setFontSize(11);words.forEach((word,i)=>doc.text(word,20+(i%2)*85,70+grid.length*9+Math.floor(i/2)*7));doc.setFontSize(9);doc.text('Page 1 of 1',170,287);doc.save(key?'word-search-answer-key.pdf':'word-search-student.pdf');return doc;
}
