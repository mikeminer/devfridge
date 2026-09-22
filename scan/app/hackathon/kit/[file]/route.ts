import { BUILD_LOG, SCORECARD, SUBMISSION_TEMPLATE, handbookMarkdown } from '@/lib/hackathon';
export function GET(_request: Request, {params}:{params:{file:string}}) {
  const files: Record<string,string> = {'handbook.md':handbookMarkdown(),'submission.md':SUBMISSION_TEMPLATE,'build-log.md':BUILD_LOG,'scorecard.md':SCORECARD};
  const content=Object.prototype.hasOwnProperty.call(files,params.file) ? files[params.file] : undefined;
  if(!content) return new Response('Not found',{status:404});
  return new Response(content,{headers:{'Content-Type':'text/markdown; charset=utf-8','Content-Disposition':`attachment; filename="devfridge-${params.file}"`,'X-Content-Type-Options':'nosniff'}});
}
