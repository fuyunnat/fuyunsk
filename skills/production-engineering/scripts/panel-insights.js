'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { safeRoot, allowedPath, safePath, readSafeFile, redact, fileId } = require('./panel-files');
const execute = promisify(execFile);
const textExtensions = /\.(?:[cm]?[jt]sx?|vue|svelte|go|py|rs|java|kt|rb|php|c|cpp|h|cs|sh|css|scss|sass|less|html|md|json|ya?ml|toml|xml)$/i;
const canPreview = value => textExtensions.test(value) || /(?:^|\/)(?:Dockerfile|Makefile|\.gitignore|\.dockerignore)$/.test(value);
function gitEnvironment() {
  const env = {...process.env};for(const key of Object.keys(env))if(key.startsWith('GIT_'))delete env[key];
  return {...env,GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:process.platform==='win32'?'NUL':'/dev/null',GIT_OPTIONAL_LOCKS:'0',GIT_LITERAL_PATHSPECS:'1',GIT_TERMINAL_PROMPT:'0'};
}
async function git(project,args) {
  const fixed=['--no-pager','--no-optional-locks','-c','core.fsmonitor=false','-c','core.hooksPath=/dev/null','-c','color.ui=false'];
  const options={cwd:project.root,env:gitEnvironment(),timeout:4000,maxBuffer:2*1024*1024,encoding:'utf8'};
  let names='';try{names=(await execute('git',[...fixed,'config','--null','--name-only','--get-regexp','^filter\\.'],options)).stdout;}catch(error){if(error.code!==1)throw error;}
  const filters=new Set(names.split('\0').map(name=>name.match(/^filter\.(.+)\.(?:clean|smudge|process|required)$/i)?.[1]).filter(Boolean));
  for(const filter of filters)for(const [name,value] of [['clean',''],['smudge',''],['process',''],['required','false']])fixed.push('-c',`filter.${filter}.${name}=${value}`);
  const result=await execute('git',[...fixed,...args],options);
  return result.stdout;
}
async function repository(project) {
  safeRoot(project);
  const directory=path.join(project.root,'.git');const stat=fs.lstatSync(directory);
  if(!stat.isDirectory() || stat.isSymbolicLink())throw new Error('只展示元数据位于项目内的 Git 仓库；外置工作树暂不支持');
  for(const part of ['objects','refs','index','config','HEAD','packed-refs']) {
    try { if(fs.lstatSync(path.join(directory,part)).isSymbolicLink())throw new Error('Git 元数据不可指向项目外'); }
    catch(error){if(error.code!=='ENOENT')throw error;}
  }
  if(fs.existsSync(path.join(directory,'objects/info/alternates')))throw new Error('外置 Git 对象库暂不读取');
  const top=(await git(project,['rev-parse','--show-toplevel'])).trim();
  if(fs.realpathSync(top)!==project.root)throw new Error('Git 根与指定项目不一致');
}
function category(value) {
  if(/(?:^|\/)(?:web|frontend|client|ui|assets)(?:\/|$)|\.(?:tsx|jsx|vue|css|scss|sass|less|html)$/i.test(value))return '前端';
  if(/(?:^|\/)(?:server|backend|api|model|controller|service)(?:\/|$)|\.(?:go|py|rs|java|php)$/i.test(value))return '后端';
  if(/\.(?:json|ya?ml|toml|xml)$|(?:^|\/)(?:Dockerfile|Makefile|\.gitignore|\.dockerignore)$/.test(value))return '配置';
  return /\.(?:md|txt)$/i.test(value)?'文档':'其他';
}
function statusEntries(source) {
  const cells=source.split('\0'),entries=[];
  for(let i=0;i<cells.length;i++) {
    const cell=cells[i];if(!cell)continue;const code=cell.slice(0,2),value=cell.slice(3);
    if(/[RC]/.test(code))i++;
    entries.push({path:value,code});
  }return entries;
}
async function collect(project,task) {
  await repository(project);
  if(task.base && !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(task.base))throw new Error('任务基准必须为完整提交 SHA，未退回其他范围');
  if(task.base)await git(project,['cat-file','-e',`${task.base}^{commit}`]);
  let head='';try {head=(await git(project,['rev-parse','--verify','HEAD'])).trim();}catch{}
  const baseline=task.base || head, map=new Map(), statuses=statusEntries(await git(project,['status','--porcelain=v1','-z','--untracked-files=all']));
  if(baseline) {
    const parts=(await git(project,['diff','--no-ext-diff','--no-textconv','--no-renames','--name-status','-z',baseline,'--'])).split('\0');
    for(let i=0;i<parts.length-1;i+=2)if(parts[i+1])map.set(parts[i+1],{path:parts[i+1],code:parts[i]});
  }else for(const entry of statuses)map.set(entry.path,entry);
  for(const entry of statuses)if(entry.code==='??')map.set(entry.path,entry);
  const statusByPath=new Map(statuses.map(entry=>[entry.path,entry]));
  let hidden=0;const files=[];
  for(const entry of map.values()) {
    if(!allowedPath(entry.path)){hidden++;continue;}
    try{safePath(project,entry.path);}catch{hidden++;continue;}
    const live=statusByPath.get(entry.path);
    files.push({id:fileId(`${task.id}:${baseline}:${entry.path}`),path:entry.path,category:category(entry.path),status:/D/.test(entry.code)?'删除':/A|\?/.test(entry.code)?'新增':'修改',untracked:entry.code==='??',preview:canPreview(entry.path),indexChanged:!!live&&![' ','?'].includes(live.code[0]),worktreeChanged:!!live&&![' ','?'].includes(live.code[1])});
  }
  return {status:'ready',source:task.base?'任务基准至当前工作区':'项目未提交改动（未归属本轮）',baseline,total:files.length,hidden,truncated:files.length>200,files:files.slice(0,200),observedAt:new Date().toISOString()};
}
async function readChanges(project,task) {
  try{return await collect(project,task);}catch(error){return {status:'unavailable',source:'Git 改动未读取',files:[],total:0,error:!error.code?error.message:'Git 不可用、项目不是仓库或基准无法核实；未读取其他范围'};}
}
async function readDiff(project,task,id) {
  const changes=await collect(project,task),file=changes.files.find(file=>file.id===id);
  if(!file?.preview)throw new Error('没有允许预览的文件');
  safePath(project,file.path);let text;
  if(file.untracked || !changes.baseline)text=`新增文件：${file.path}\n${readSafeFile(project,file.path,128*1024).toString('utf8')}`;
  else text=await git(project,['diff','--no-ext-diff','--no-textconv','--no-renames','--unified=3',changes.baseline,'--',file.path]);
  const result=redact(text);return {path:file.path,source:changes.source,...result,truncated:Buffer.byteLength(result.text)>64*1024,text:Buffer.from(result.text).subarray(0,64*1024).toString('utf8'),observedAt:new Date().toISOString()};
}
function evidenceFiles(task) {
  const files=[];
  for(const item of task.items) {
    const evidence=item.description.split(/证据[：:]/).slice(1).join('证据：');
    for(const match of evidence.matchAll(/!?\[([^\]]*)\]\(([^\s)]+)\)/g)) {
      const value=match[2];if(!allowedPath(value)||! /\.(?:png|jpe?g|webp|txt|log)$/i.test(value))continue;
      const id=fileId(`${task.id}:${item.id}:${value}`);if(files.some(file=>file.id===id))continue;
      files.push({id,item:item.id,path:value,label:match[1]||path.basename(value),kind:/\.(?:txt|log)$/i.test(value)?'log':'image'});
    }
  }return files;
}
function readEvidence(project,task,id) {
  const file=evidenceFiles(task).find(file=>file.id===id);if(!file)throw new Error('证据未在此任务清单中登记');
  const body=readSafeFile(project,file.path,file.kind==='image'?5*1024*1024:64*1024);
  if(file.kind==='log')return {type:'text/plain',body:Buffer.from(redact(body.toString('utf8')).text)};
  const hex=body.subarray(0,12).toString('hex');
  const type=hex.startsWith('89504e470d0a1a0a')?'image/png':hex.startsWith('ffd8ff')?'image/jpeg':body.subarray(0,4).toString()==='RIFF'&&body.subarray(8,12).toString()==='WEBP'?'image/webp':'';
  if(!type)throw new Error('证据不是支持的图片格式');return {type,body};
}
module.exports={readChanges,readDiff,evidenceFiles,readEvidence};
