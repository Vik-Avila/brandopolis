import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import * as mammoth from 'mammoth';
import JSZip from 'jszip';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

export type DocumentSegmentKind='page'|'section'|'slide'|'document';

export interface DocumentSegment {
  kind:DocumentSegmentKind;
  index:number;
  label:string;
  text:string;
}

export interface ExtractedDocument {
  text:string;
  segments:DocumentSegment[];
  metadata:{
    format:'PDF'|'DOCX'|'PPTX'|'TXT';
    pages?:number;
    slides?:number;
    characters:number;
    truncated:boolean;
  };
}

export interface ExtractDocumentInput {
  filePath:string;
  mediaType:string;
  originalName?:string;
}

const MAX_TEXT_CHARS=2_000_000;
const MAX_SEGMENT_CHARS=200_000;
const MAX_PPTX_SLIDES=250;
const MAX_XML_BYTES=5*1024*1024;

function normalizeText(value:string):string {
  return value
    .replace(/\r\n?/g,'\n')
    .replace(/[ \t]+\n/g,'\n')
    .replace(/\n{3,}/g,'\n\n')
    .replace(/[ \t]{2,}/g,' ')
    .trim();
}

function truncate(value:string,max:number){
  if(value.length<=max)return {text:value,truncated:false};
  return {
    text:value.slice(0,max),
    truncated:true
  };
}

function xmlDecode(value:string):string {
  return value
    .replace(/&lt;/g,'<')
    .replace(/&gt;/g,'>')
    .replace(/&quot;/g,'"')
    .replace(/&apos;/g,"'")
    .replace(/&amp;/g,'&')
    .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)));
}

function pptxSlideText(xml:string):string {
  const chunks:string[]=[];

  for(const match of xml.matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g))
    chunks.push(xmlDecode(match[1]));

  return normalizeText(chunks.join('\n'));
}

async function extractPdf(buffer:Buffer):Promise<ExtractedDocument> {
  const task=getDocument({
    data:new Uint8Array(buffer),
    useWorkerFetch:false,
    useSystemFonts:true
  });

  const pdf=await task.promise;
  const segments:DocumentSegment[]=[];
  let truncated=false;

  try{
    for(let pageNumber=1;pageNumber<=pdf.numPages;pageNumber++){
      const page=await pdf.getPage(pageNumber);
      const content=await page.getTextContent();

      const raw=content.items
        .map(item=>'str' in item?item.str:'')
        .join(' ');

      const normalized=normalizeText(raw);
      const limited=truncate(normalized,MAX_SEGMENT_CHARS);

      if(limited.truncated)truncated=true;

      segments.push({
        kind:'page',
        index:pageNumber,
        label:`Página ${pageNumber}`,
        text:limited.text
      });
    }
  }finally{
    await task.destroy();
  }

  const joined=normalizeText(
    segments
      .map(segment=>`[${segment.label}]\n${segment.text}`)
      .join('\n\n')
  );

  const limited=truncate(joined,MAX_TEXT_CHARS);

  return {
    text:limited.text,
    segments,
    metadata:{
      format:'PDF',
      pages:pdf.numPages,
      characters:limited.text.length,
      truncated:truncated||limited.truncated
    }
  };
}

async function extractDocx(buffer:Buffer):Promise<ExtractedDocument> {
  const result=await mammoth.extractRawText({buffer});
  const normalized=normalizeText(result.value);
  const limited=truncate(normalized,MAX_TEXT_CHARS);

  return {
    text:limited.text,
    segments:[{
      kind:'document',
      index:1,
      label:'Documento',
      text:limited.text
    }],
    metadata:{
      format:'DOCX',
      characters:limited.text.length,
      truncated:limited.truncated
    }
  };
}

async function extractPptx(buffer:Buffer):Promise<ExtractedDocument> {
  const zip=await JSZip.loadAsync(buffer);
  const names=Object.keys(zip.files)
    .filter(name=>/^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a,b)=>{
      const ai=Number(a.match(/slide(\d+)\.xml/i)?.[1]??0);
      const bi=Number(b.match(/slide(\d+)\.xml/i)?.[1]??0);
      return ai-bi;
    });

  if(names.length>MAX_PPTX_SLIDES)
    throw new Error(`PPTX_TOO_MANY_SLIDES:${names.length}`);

  const segments:DocumentSegment[]=[];
  let truncated=false;

  for(const name of names){
    const entry=zip.file(name);
    if(!entry)continue;

    const raw=await entry.async('uint8array');

    if(raw.byteLength>MAX_XML_BYTES)
      throw new Error(`PPTX_SLIDE_TOO_LARGE:${name}`);

    const xml=new TextDecoder('utf-8').decode(raw);
    const slideNumber=Number(name.match(/slide(\d+)\.xml/i)?.[1]??segments.length+1);
    const normalized=pptxSlideText(xml);
    const limited=truncate(normalized,MAX_SEGMENT_CHARS);

    if(limited.truncated)truncated=true;

    segments.push({
      kind:'slide',
      index:slideNumber,
      label:`Diapositiva ${slideNumber}`,
      text:limited.text
    });
  }

  const joined=normalizeText(
    segments
      .map(segment=>`[${segment.label}]\n${segment.text}`)
      .join('\n\n')
  );

  const limited=truncate(joined,MAX_TEXT_CHARS);

  return {
    text:limited.text,
    segments,
    metadata:{
      format:'PPTX',
      slides:segments.length,
      characters:limited.text.length,
      truncated:truncated||limited.truncated
    }
  };
}

function extractTxt(buffer:Buffer):ExtractedDocument {
  const raw=buffer.toString('utf8');

  if(raw.includes('\uFFFD'))
    throw new Error('TXT_INVALID_UTF8');

  const normalized=normalizeText(raw);
  const limited=truncate(normalized,MAX_TEXT_CHARS);

  return {
    text:limited.text,
    segments:[{
      kind:'document',
      index:1,
      label:'Documento',
      text:limited.text
    }],
    metadata:{
      format:'TXT',
      characters:limited.text.length,
      truncated:limited.truncated
    }
  };
}

export async function extractDocument(
  input:ExtractDocumentInput
):Promise<ExtractedDocument> {
  const buffer=await readFile(input.filePath);
  const mediaType=input.mediaType.split(';')[0].trim().toLowerCase();
  const extension=extname(input.originalName??input.filePath).toLowerCase();

  if(mediaType==='application/pdf'||extension==='.pdf')
    return extractPdf(buffer);

  if(
    mediaType==='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ||extension==='.docx'
  )
    return extractDocx(buffer);

  if(
    mediaType==='application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ||extension==='.pptx'
  )
    return extractPptx(buffer);

  if(mediaType==='text/plain'||extension==='.txt')
    return extractTxt(buffer);

  throw new Error(`UNSUPPORTED_DOCUMENT_TYPE:${mediaType}`);
}
