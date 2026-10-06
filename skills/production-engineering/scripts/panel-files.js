'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const fileId = value => crypto.createHash('sha256').update(value).digest('hex').slice(0,24);
function safeRoot(project) {
  const stat = fs.statSync(project.root);
  if (fs.realpathSync(project.root) !== project.root || stat.dev !== project.device || stat.ino !== project.inode) throw new Error('项目根发生变化，请重新核实');
}
function allowedPath(value) {
  if (!value || path.isAbsolute(value) || /[\x00-\x1f\\]/.test(value)) return false;
  const parts = value.split('/');
  return !parts.some(part => !part || ['.','..','.git','node_modules','uploads','upload'].includes(part.toLowerCase()) || /^(?:\.env(?:\..*)?|\.npmrc|\.netrc|id_(?:rsa|ed25519)|.*(?:credential|secret|private[-_]?key).*|.*\.(?:pem|key|p12|pfx|db|sqlite3?|sql|gz))$/i.test(part));
}
function safePath(project, value) {
  safeRoot(project); if (!allowedPath(value)) throw new Error('文件不在允许展示的项目路径内');
  let current = project.root, stat = null;
  for (const part of value.split('/')) {
    current = path.join(current,part);
    try { stat = fs.lstatSync(current); }
    catch (error) { if (error.code === 'ENOENT') return { file: path.join(project.root,value), stat: null }; throw error; }
    if (stat.isSymbolicLink() || fs.realpathSync(current)!==current) throw new Error('拒绝符号链接或跨项目文件');
  }
  return { file: current, stat };
}
function readSafeFile(project, value, limit) {
  const { file, stat } = safePath(project,value);
  if (!stat?.isFile() || stat.size > limit) throw new Error('文件缺失、不是普通文件或超过预览大小');
  const fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
  try {
    const current=fs.fstatSync(fd);
    if (!current.isFile() || current.dev!==stat.dev || current.ino!==stat.ino || current.size>limit) throw new Error('文件发生变化或超过预览大小');
    safeRoot(project);if(fs.realpathSync(file)!==file)throw new Error('文件路径发生变化');
    const body=fs.readFileSync(fd);if(body.length>limit)throw new Error('文件超过预览大小');
    return body;
  } finally { fs.closeSync(fd); }
}
function redact(text) {
  let certificate=false, hidden=0;
  const result=text.split('\n').map(line=>{
    if (/-----BEGIN .*PRIVATE KEY-----/.test(line)) certificate=true;
    const sensitive=certificate || /(?:api[_-]?key|access[_-]?token|refresh[_-]?token|secret|password|passwd|authorization|credential)\s*["']?\s*[:=]|bearer\s+\S+|sk-[\w-]{8,}|https?:\/\/[^\s/]+:[^\s/]+@/i.test(line);
    if (/-----END .*PRIVATE KEY-----/.test(line)) certificate=false;
    if(sensitive){hidden++;return `${/^[+-]/.test(line)?line[0]:''}[可能含秘密的行已隐藏]`;}return line;
  }).join('\n');
  return { text:result, hidden };
}
module.exports={safeRoot,allowedPath,safePath,readSafeFile,redact,fileId};
