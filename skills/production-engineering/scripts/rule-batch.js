'use strict';

// 只把调用方已判定的阶段与领域组合成读取清单，不识别自然语言、不授权操作。
const stages = {
  '只读': { topics: ['通用', '适用方式'], references: [] },
  '小改': { topics: ['通用', '适用方式', '小改', '实现', '验证', '完成', '报告'], references: [] },
  '实现': {
    topics: ['通用', '适用方式', '完整', '实现'],
    references: ['task-lanes.md', 'context-memory-continuity.md'],
  },
  '验证': { topics: ['验证', '完成', '报告', '禁止行为'], references: [] },
  '提交': { topics: ['Git提交', '验证', '续航'], references: [] },
  '推送': { topics: ['Git推送', '续航'], references: [] },
  '评审': { topics: ['Git评审', '完成', '报告'], references: ['spec-review.md'] },
  '回滚': { topics: ['Git回滚', '灰度回滚', '验证', '报告'], references: [] },
};

// 对齐 routing.md 的领域并集。旧 --topic 仍为原有精确主题，不改变其含义。
const domains = {
  '整项目迁移': { topics: ['代码组织', '接口', '灰度回滚', '日志', '验证'], ids: ['06-00'], references: ['project-migration.md', 'design-testing.md', 'database-upgrade-safety.md', 'configuration-localization.md'] },
  '故障修复': { topics: ['实现', '验证'], references: ['bugfix-fast-loop.md'] },
  '上游同步': { topics: ['代码组织', '验证'], references: ['upstream-sync.md'] },
  'SEO': { topics: ['前端', '性能', '配置部署', '验证'], references: ['seo-engineering.md'] },
  '模板二开': { topics: ['代码组织', '前端', '接口', '验证'], ids: ['06-00'], references: ['parallel-template-development.md', 'frontend-interface-quality.md', 'configuration-localization.md'] },
  '规划清单': { topics: ['续航', '报告'], references: ['planning-persistence.md', 'workflow-checklist.md', 'context-memory-continuity.md'] },
  '代理执行': { topics: ['代码组织', '实现', '验证', 'Git评审', '续航'], references: ['agentic-execution.md', 'spec-review.md'] },
  '工程增强': { topics: ['实现', '验证'], references: ['proven-engineering-methods.md'] },
  '配置化': { topics: ['配置部署', '验证'], references: ['configuration-localization.md'] },
  '前端': { topics: ['代码组织', '前端', '验证'], ids: ['06-00'], references: ['frontend-interface-quality.md', 'ui-design-workflow.md', 'configuration-localization.md'] },
  '后端': { topics: ['代码组织', '后端', '接口', '日志', '验证'], references: ['design-testing.md', 'configuration-localization.md'] },
  '接口': { topics: ['后端', '接口', '并发', '安全', '日志', '验证'], references: ['configuration-localization.md'] },
  '性能': { topics: ['性能'], references: ['diagnosis-feedback-loop.md', 'proven-engineering-methods.md'] },
  '数据库': { topics: ['接口', '灰度回滚', '数据库', '并发', '验证'], references: ['database-upgrade-safety.md'] },
  '并发': { topics: ['并发', '安全', '日志', '验证'], references: [] },
  '配置部署': { topics: ['灰度回滚', '配置部署', '依赖', '日志', '验证'], references: ['database-upgrade-safety.md', 'configuration-localization.md'] },
  '依赖': { topics: ['依赖', '审计'], references: [] },
  '安全': { topics: ['安全', '日志', '审计', '验证'], ids: ['05-00'], references: ['code-risk-review.md'] },
  '审计': { topics: ['依赖', '安全', '日志', '审计', '报告'], references: ['code-risk-review.md'] },
  '内容': { topics: ['内容'], references: ['content-writing-quality.md'] },
};
const referenceNames = new Set([
  'novice-clarification.md', 'behavior-preservation.md', 'database-upgrade-safety.md', 'bugfix-fast-loop.md', 'upstream-sync.md', 'seo-engineering.md', 'parallel-template-development.md', 'planning-persistence.md', 'agentic-execution.md', 'code-craft.md', 'proven-engineering-methods.md', 'configuration-localization.md', 'task-lanes.md', 'context-memory-continuity.md', 'frontend-interface-quality.md', 'ui-design-workflow.md',
  'wrapped-workspace-ui.md', 'design-testing.md', 'diagnosis-feedback-loop.md',
  'code-risk-review.md', 'content-writing-quality.md', 'spec-review.md',
  'project-understanding.md', 'source-policy.md', 'project-migration.md', 'workflow-checklist.md', 'project-write-boundary.md',
]);
const codeCraftStages = new Set(['小改', '实现']);
const nonCodeDomains = new Set(['内容', '规划清单']);

function planBatch(stage, topics = [], references = []) {
  if (!Object.hasOwn(stages, stage)) throw new Error(`未知读取阶段：${stage}`);
  if (stage === '小改' && topics.includes('整项目迁移')) throw new Error('整项目迁移不能使用小改阶段；先只读规划，再按实现阶段执行');
  const chosen = stages[stage];
  const result = {
    stage,
    topics: new Set(chosen.topics),
    ids: new Set(),
    references: new Set(['novice-clarification.md', ...chosen.references, ...(stage === '只读' ? [] : ['behavior-preservation.md', 'workflow-checklist.md', 'project-write-boundary.md'])]),
  };
  for (const topic of topics) {
    const domain = Object.hasOwn(domains, topic) ? domains[topic] : { topics: [topic] };
    for (const name of domain.topics) result.topics.add(name);
    for (const id of domain.ids || []) result.ids.add(id);
    for (const file of domain.references || []) result.references.add(file);
  }
  // 小改/实现通常会写代码；纯内容/规划不加载 Code Craft，避免文档任务无谓变重。
  if (codeCraftStages.has(stage) && (!topics.length || topics.some(topic => !nonCodeDomains.has(topic)))) {
    result.references.add('code-craft.md');
  }
  for (const file of references) result.references.add(file);
  for (const file of result.references) {
    if (!referenceNames.has(file)) throw new Error(`不支持的专项说明：${file}`);
  }
  return {
    stage,
    topics: [...result.topics],
    ids: [...result.ids],
    references: [...result.references],
  };
}

module.exports = { planBatch, stages: Object.keys(stages) };
