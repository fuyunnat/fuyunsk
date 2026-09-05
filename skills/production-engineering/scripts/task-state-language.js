'use strict';
// 内部键与旧状态协议保持英文；仅人可读标签和有限状态显示中文。
const labels={
  "Task ID": "任务编号",
  "Updated at": "更新时间",
  "Latest user goal": "最新用户目标",
  "Acceptance criteria": "验收标准",
  "Task status": "任务状态",
  "Implementation status": "实现状态",
  "Verification status": "验证状态",
  "Current mode": "当前模式",
  "Current lane and reason": "当前通道与原因",
  "Repository/path": "项目路径",
  "Branch and stable point": "分支与稳定点",
  "Current fingerprint": "当前指纹",
  "Verified fingerprint": "已验证指纹",
  "Existing user changes": "用户已有改动",
  "Authorization": "授权",
  "Do-not-touch": "禁止触碰",
  "Source references": "来源依据",
  "Migration manifest": "迁移台账",
  "Migration baseline": "迁移盘点锁定值",
  "Migration history": "迁移基线历史",
  "Decisions": "决定",
  "Changed/planned files": "修改与计划文件",
  "Validation evidence": "验证证据",
  "Current blockers": "阻塞原因",
  "Next step": "下一步",
  "PR/CI/remote state": "评审与远端状态",
  "Rollback": "回滚",
  "Unverified risk": "未验证风险"
};

const reverse=Object.fromEntries(Object.entries(labels).map(([a,b])=>[b,a]));
const states={active:'进行中',blocked:'阻塞',complete:'已完成',pending:'待验证',passed:'已通过',failed:'未通过',unavailable:'无法验证','not started':'未开始','in progress':'进行中',implementation:'实现','read-only':'只读'};
const stateFields=new Set(['Task status','Implementation status','Verification status','Current mode']);
function valueOut(key,value){return stateFields.has(key)&&Object.hasOwn(states,value)?states[value]:value;}
function valueIn(key,value){
 if(!stateFields.has(key))return value;
 if(value==='进行中')return key==='Task status'?'active':'in progress';
 const found=Object.entries(states).find(([,v])=>v===value);return found?found[0]:value;
}
module.exports={labels,reverse,valueOut,valueIn};
