'use strict';

const { spawnSync } = require('node:child_process');

function gitEnvironment() {
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (key.toUpperCase().startsWith('GIT_')) delete env[key];
  return { ...env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null',
    GIT_OPTIONAL_LOCKS: '0', GIT_LITERAL_PATHSPECS: '1', GIT_TERMINAL_PROMPT: '0',
    GIT_NO_LAZY_FETCH: '1', GIT_ALLOW_PROTOCOL: '' };
}

function runGit(repo, args, allowFailure = false) {
  // 空值也兼容把 false 解释成外部钩子路径的旧 Git；不用较新的全局选项。
  const fixed = ['--no-pager', '-c', 'core.fsmonitor=', '-c', `core.hooksPath=${process.platform === 'win32' ? 'NUL' : '/dev/null'}`, '-c', 'color.ui=false'];
  const options = { cwd: repo, env: gitEnvironment(), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 15000 };
  // check-ignore 不支持 literal pathspec；调用方只传固定的私有状态文件名。
  if (args[0] === 'check-ignore') delete options.env.GIT_LITERAL_PATHSPECS;
  const config = spawnSync('git', [...fixed, 'config', '--null', '--name-only', '--get-regexp', '^filter\\.'], options);
  if (config.error || ![0, 1].includes(config.status)) return finish(config, args, allowFailure);
  const filters = new Set(config.stdout.split('\0').map(name => name.match(/^filter\.(.+)\.(?:clean|smudge|process|required)$/i)?.[1]).filter(Boolean));
  for (const filter of filters) {
    for (const [name, value] of [['clean', ''], ['smudge', ''], ['process', ''], ['required', 'false']]) {
      fixed.push('-c', `filter.${filter}.${name}=${value}`);
    }
  }
  return finish(spawnSync('git', [...fixed, ...args], options), args, allowFailure);
}

function finish(result, args, allowFailure) {
  if (result.status !== 0 && !allowFailure) {
    const detail = (result.stderr || result.stdout || result.error?.message || '').trim();
    throw new Error(`Git 命令失败：git ${args.join(' ')}${detail ? `\n${detail}` : ''}`);
  }
  return { ...result, stdout: result.stdout || '', stderr: result.stderr || '' };
}

module.exports = { runGit };
