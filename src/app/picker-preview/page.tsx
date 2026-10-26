"use client";
import { useState } from 'react';
import JournalEditor from '@/features/journal/components/JournalEditor';
import '@/features/journal/styles.css';
export default function Preview() {
 const [open,setOpen]=useState(false);
 return <main style={{padding:30}}><p>Isolated picker test — sample contests, no account writes.</p><button onClick={()=>setOpen(true)}>Add a round</button>{open && <JournalEditor entry={null} candidates={[
 {id:26,title:'Monday Munch - DSA Challenge 026 (Rated)',host:'geeksforgeeks.org',date:'2026-10-26',href:'https://example.test/26',entryId:null},
 {id:25,title:'Monday Munch - DSA Challenge 025 (Rated)',host:'geeksforgeeks.org',date:'2026-10-19',href:'https://example.test/25',entryId:'saved'},
 {id:525,title:'Weekly Contest 525',host:'leetcode.com',date:'2026-10-25',href:'https://example.test/525',entryId:null}
 ]} today='2026-10-26' onClose={()=>setOpen(false)} onSave={async()=>{throw new Error('Sample only')}}/>}</main>
}
