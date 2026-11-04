'use strict';
const PanelTools = (() => {
  const $=id=>document.getElementById(id);
  const node=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};
  const prompts=[
    ['完成后停止','按当前已授权目标完成本轮任务，固定本轮实施清单和适用审查边界，保留已有成果，不重开历史任务。不得自行缩减明确要求完成的全部范围，也不把所选补丁扩大成全历史扫描。审查先固定候选与总数、分类后再实施；续作报告剩余数量，不边审边补。只修验收必需的问题，新增需求或无关优化另列。写完自行运行相关测试；涉及界面时实际打开浏览器验证，环境不支持则如实标记未覆盖。更新同一份工作流程，汇报改动、验证和阻塞，完成后停止。不得清空数据库、删库、删表或批量删除业务数据；未经明确授权不得连接现有业务库启动服务或迁移。'],
    ['本批收尾','我现在修改目标：只交付本轮已经实施的补丁。立即停止继续扫描上游候选和追加独立补丁，不再实施新项，保留已有成果。核对最终差异，复用有效证据，只做仍必要的相关测试；涉及界面则用隔离环境在真实浏览器验证，无法验证如实说明。本批引入的真实回归仍需修复或明确阻塞，无关旧问题不处理。原范围未覆盖项标为本轮不做/未覆盖，不冒充完整同步。原位更新工作流程的目标、当前项及结果，简短报告后停止。不得连接或修改现有业务数据库，不自动合并 main、发布或部署。'],
    ['只读检查','只读核查当前项目，说明问题、证据和建议，不修改文件，不启动业务服务、连接数据库、运行测试或迁移。保留已有工作流程和成果，查完停止。'],
    ['展示差异','只展示当前项目的 Git 差异、影响和验证状态；区分原有改动与当前任务，有记录基准就按基准核对，没有基准就明确说明不能归属本轮。不继续改文件、不启动业务服务或操作数据库，展示后停止。'],
    ['暂停收尾','暂停当前任务，保留已有代码、清单和测试证据，不回滚已完成成果。简短说明做到哪一步、测试结果、未覆盖项和阻塞，更新同一份工作流程后停止。收到新指令前不继续修改或自行追加下一轮任务。']
  ];
  let project,task,key='',record='',promptRecord='',tab='progress',promptIndex=0,epoch=0,diffEpoch=0,data=null,loading=false;
  const endpoint=(kind,id)=>`/api/${kind}/${encodeURIComponent(project.id)}/${encodeURIComponent(task.id)}${id?`/${encodeURIComponent(id)}`:''}`;
  function renderPrompt() {
    $('prompt-choices').replaceChildren(...prompts.map(([label],index)=>{
      const button=node('button','prompt-choice',label);button.type='button';button.setAttribute('aria-pressed',String(index===promptIndex));
      button.addEventListener('click',()=>{promptIndex=index;renderPrompt();});return button;
    }));
    const context={项目:project?.name||'当前项目',任务:task?.title||'当前任务',清单目标:task?.goal||'未记录',保留:task?.constraints||'未记录',验收与停止:task?.acceptance||'未记录'};
    $('prompt-text').value=`清单记载（仅供定位，以本次指令为准）：${JSON.stringify(context)}\n\n${prompts[promptIndex][1]}`;
    $('prompt-message').textContent='仅复制文字，请粘贴到对应对话；不会执行项目操作。';$('copy-prompt').disabled=!task;
  }
  async function copyPrompt() {
    const selected=key,text=$('prompt-text').value;$('copy-prompt').disabled=true;
    try {
      if(typeof navigator==='undefined'||!navigator.clipboard?.writeText)throw Error('clipboard');
      await navigator.clipboard.writeText(text);
      if(selected===key)$('prompt-message').textContent='提示词已复制，请粘贴到对应对话。';
    }catch{
      if(selected===key){$('prompt-text').focus();$('prompt-text').select();$('prompt-message').textContent='剪贴板不可用，文字已选中，请手动复制。';}
    }finally{if(selected===key)$('copy-prompt').disabled=!task;}
  }
  function renderChanges() {
    const changes=data?.changes;$('changes-source').textContent=changes?.source||'等待 Git 记录';
    $('changes-time').textContent=changes?.observedAt?`读取于 ${new Date(changes.observedAt).toLocaleTimeString('zh-CN',{hour12:false})}`:'';
    $('change-count').textContent=changes?.total??'—';
    if(!changes||changes.status!=='ready'){$('change-categories').replaceChildren();$('change-list').replaceChildren(node('p','context-empty',changes?.error||'选择任务后读取当前项目改动。'));$('changes-note').textContent='';return;}
    const groups=new Map();for(const file of changes.files)groups.set(file.category,(groups.get(file.category)||0)+1);
    $('change-categories').replaceChildren(...[...groups].map(([name,count])=>node('span','category-chip',`${name} ${count}`)));
    $('changes-note').textContent=[changes.baseline?`比较基准 ${changes.baseline.slice(0,10)}`:'仓库尚无提交',changes.hidden?`${changes.hidden} 项敏感或不安全路径已隐藏`:'',changes.truncated?'仅显示前 200 个文件':''].filter(Boolean).join(' · ');
    const files=changes.files.map(file=>{
      const row=node('li','change-row'),label=node('div','change-label');label.append(node('span','change-state',file.status),node('span','change-path',file.path),node('small','',file.category));
      const stage=[file.untracked?'未跟踪':'',file.indexChanged?'已暂存':'',file.worktreeChanged?'未暂存':''].filter(Boolean).join(' / ');if(stage)label.append(node('small','',stage));
      const button=node('button','diff-button',file.preview?'查看差异':'不支持预览');button.type='button';button.disabled=!file.preview;
      button.addEventListener('click',()=>showDiff(file));row.append(label,button);return row;
    });
    $('change-list').replaceChildren(...(files.length?files:[node('p','context-empty','此比较范围没有可展示的改动。')]));
  }
  async function showDiff(file) {
    const version=++diffEpoch,selected=key;$('diff-view').hidden=false;$('diff-title').textContent=file.path;$('diff-text').textContent='读取差异中…';$('diff-note').textContent='';
    try {
      const response=await fetch(endpoint('diff',file.id),{cache:'no-store'});if(!response.ok)throw Error('diff');const result=await response.json();
      if(version!==diffEpoch||selected!==key)return;
      $('diff-text').textContent=result.text||'没有可展示的文本差异。';$('diff-note').textContent=[result.source,result.observedAt?`读取于 ${new Date(result.observedAt).toLocaleTimeString('zh-CN',{hour12:false})}`:'',result.hidden?`${result.hidden} 行可能含秘密，已隐藏`:'',result.truncated?'预览已截断':'' ].filter(Boolean).join(' · ');
    }catch{if(version===diffEpoch&&selected===key)$('diff-text').textContent='差异不可读、已变化或超出预览边界，请重新读取改动。';}
  }
  function renderProof() {
    const attachments=data?.attachments||[],records=task?.items||[];
    $('proof-count').textContent=records.filter(item=>/证据[：:]/.test(item.description)).length;
    const fields=records.flatMap(item=>[...item.description.matchAll(/(?:^|[；;。\n])\s*(QA结果|QA结论|测试结果|验收结果|已测试|未测试|未验证|缺少条件|缺失条件|测试|验收|QA)[：:]\s*([^；;。\n]+)/g)].map(match=>({id:item.id,label:match[1],text:match[2].trim()})));
    const hasResult=fields.some(field=>['QA结果','QA结论','测试结果','验收结果'].includes(field.label));
    $('qa-summary').textContent=fields.length?`${hasResult?'':'测试/验收结果未记录。'}以下内容摘自清单明确字段，保留原文，不推断通过或失败。`:'QA结果未记录。完成勾选和事项名称不能说明测试是否通过。';
    $('qa-records').replaceChildren(...fields.map(field=>{const row=node('div','qa-record');row.append(node('strong','',`${field.label} · ${field.id}`),node('p','',field.text));return row;}));
    const evidence=records.filter(item=>/证据[：:]/.test(item.description)||attachments.some(file=>file.item===item.id));
    const cards=evidence.map(item=>{
      const title=item.description.split(/[；;。]/)[0],card=node('details','proof-card'),heading=node('summary','proof-heading');heading.append(node('strong','',`${item.id} · ${title.length>100?`${title.slice(0,100)}…`:title}`),node('span','proof-state',`清单状态：${item.recordedStatus||item.status}`));
      const text=item.description.split(/证据[：:]/).slice(1).join('证据：');card.append(heading,node('p','proof-text',text||'文字证据未记录；状态标记不等于验收通过。'));
      const files=attachments.filter(file=>file.item===item.id);
      if(files.length){const group=node('div','proof-attachments');group.append(...files.map(attachment));card.append(group);}return card;
    });
    $('proof-list').replaceChildren(...(cards.length?cards:[node('p','context-empty','验证证据未记录。')]));
  }
  function attachment(file) {
    const link=node('a','proof-attachment');link.href=endpoint('evidence',file.id);link.target='_blank';link.rel='noopener noreferrer';
    if(file.kind==='image'){
      link.className='proof-attachment image-attachment';
      const img=node('img');img.src=link.href;img.alt=file.label;img.loading='lazy';
      img.addEventListener('error',()=>{img.hidden=true;link.append(node('span','attachment-error','图片不可用或超出边界'));});link.append(img);
    }
    link.append(node('span','',file.kind==='log'?`查看日志 · ${file.label}`:file.label));return link;
  }
  function setTab(next) {
    tab=['progress','proof','changes','records','prompts'].includes(next)?next:'progress';for(const name of ['progress','proof','changes','records','prompts'])$(`tool-${name}`).hidden=name!==tab;
    document.querySelectorAll('[data-tool-tab]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.toolTab===tab)));
    const insights=['proof','changes'].includes(tab);$('tools-message').hidden=!insights;$('reload-insights').hidden=!insights;
    if(tab==='proof')renderProof();
  }
  async function load() {
    if(!project||!task)return;const selected=key,version=++epoch;loading=true;$('reload-insights').disabled=true;$('tools-message').textContent='正在读取本项目记录…';
    try {
      const response=await fetch(endpoint('insights'),{cache:'no-store'});if(!response.ok)throw Error('read');const result=await response.json();
      if(version!==epoch||selected!==key)return;data=result;renderChanges();if(tab==='proof')renderProof();
      $('tools-message').textContent='Git 展示比较范围内的改动；证据来自清单，面板不运行测试。';
    }catch{if(version===epoch&&selected===key)$('tools-message').textContent=data?'读取失败，保留上次读取的结果，请重新读取。':'读取失败，尚未获取改动或证据附件，请重新读取。';}
    finally{if(version===epoch&&selected===key){loading=false;$('reload-insights').disabled=false;}}
  }
  function select(nextProject,nextTask) {
    const nextKey=`${nextProject?.id||''}:${nextTask?.id||''}:${nextTask?.base||''}`,nextRecord=JSON.stringify(nextTask||null),changed=nextKey!==key;
    project=nextProject;task=nextTask;
    if(changed){key=nextKey;epoch++;diffEpoch++;data=null;loading=false;$('diff-view').hidden=true;$('diff-text').textContent='';$('change-categories').replaceChildren();renderChanges();setTab('progress');}
    const nextPromptRecord=JSON.stringify([project?.name,task?.title,task?.goal,task?.constraints,task?.acceptance]);
    if(changed||nextPromptRecord!==promptRecord){promptRecord=nextPromptRecord;renderPrompt();}
    $('reload-insights').disabled=!task||loading;
    $('proof-count').textContent=(task?.items||[]).filter(item=>/证据[：:]/.test(item.description)).length;
    if(tab==='proof')renderProof();
    if(changed||nextRecord!==record){record=nextRecord;if(task)load();else $('tools-message').textContent='选择有清单记录的任务后可查看。';}
  }
  document.querySelectorAll('[data-tool-tab]').forEach(button=>button.addEventListener('click',()=>setTab(button.dataset.toolTab)));
  $('reload-insights').addEventListener('click',()=>{if(!loading)load();});$('copy-prompt').addEventListener('click',copyPrompt);
  $('close-diff').addEventListener('click',()=>{diffEpoch++;$('diff-view').hidden=true;});
  setTab('progress');
  return {select,show:setTab};
})();
