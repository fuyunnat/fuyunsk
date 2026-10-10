#!/usr/bin/env node
'use strict';

// 仓库内便捷入口；随技能安装使用 skills/production-engineering/scripts/doctor.js。
const { main } = require('../skills/production-engineering/scripts/doctor');
try { main(process.argv.slice(2)); }
catch (error) { process.stderr.write('诊断失败：' + error.message + '\n'); process.exitCode = 2; }
