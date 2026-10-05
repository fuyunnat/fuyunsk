'use strict';
const assert = require('node:assert/strict');
// Agent 只调用入口；具体领域规则在入口、读取器和专项验证，避免要求三份副本。
function assertAgentDelegates(body) {
  assert.match(body, /default_prompt: .*\$production-engineering/);
  assert.match(body, /按 SKILL\.md/);
  assert.match(body, /allow_implicit_invocation: true/);
  assert.ok(Buffer.byteLength(body) <= 2200);
}
module.exports = { assertAgentDelegates };
