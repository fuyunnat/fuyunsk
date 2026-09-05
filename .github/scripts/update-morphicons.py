"""在固定源码基线上加入图标规则；只修改已审查的六个文件。"""
import hashlib
import pathlib
import sys

root = pathlib.Path(sys.argv[1]).resolve()
expected = {
    'README.md': 'c1b966d8f5cd4f19fc0158addd53991d3073815d',
    'global-AGENTS.example.md': 'c9df28a7055c90708d3b565f0911365eb5785dab',
    'docs/personal-custom-instructions.md': 'f75a7967659e88f2aaa8b41fd80c50717fa3e957',
    'skills/production-engineering/SKILL.md': '5aa60737218bc13d892ce39c63ff07a26baf5879',
    'skills/production-engineering/references/frontend-stack.md': 'c093c95f32f99de93bca4634fd08524a9e2f0152',
    'tests/frontend-stack.test.js': 'e72cac3a166314ce18cac641abc687a0ff29b1c4',
}
texts = {}
for name, sha in expected.items():
    data = (root / name).read_bytes()
    actual = hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()
    if actual != sha:
        raise SystemExit(f'基线不符，拒绝覆盖：{name} {actual}')
    texts[name] = data.decode('utf-8')

def replace(name, before, after):
    if texts[name].count(before) != 1:
        raise SystemExit(f'替换位置不唯一：{name}: {before[:60]}')
    texts[name] = texts[name].replace(before, after, 1)

policy = '''## 图标统一使用 Morphicons

所有新设计页面及明确要求新增、替换的界面图标，统一通过 [Morphicons 官网](https://www.morphicons.com/) 对应方案接入，包括导航、按钮、表格操作、表单、状态提示及组件内的箭头、勾选、关闭图标。不是仅在 README 写个链接，也不能保留新组件的另一套默认图标渲染就声称已经接入。

**先区分图标数据与渲染库。** 官网将 Morphicons 定义为描边 SVG 的渲染与变形方案，不是独立的全量图标素材库。官方包名是 `morphicons`；图形可来自官网示例采用的 Lucide、Tabler、Heroicons 等兼容数据，或项目已有且获得许可的描边路径。允许使用这些图形数据，不等于允许绕过 Morphicons 另起一套渲染方案。不得虚构 Morphicons 专属图标名称、包、CDN 或接口。

### 按实际项目接入，不改变用户指定框架

- React 使用 `morphicons/react` 的 `MorphIcon`；Vue 使用 `morphicons/vue` 的 `MorphIcon`；普通 JavaScript 按已安装版本使用 `morphicons/dom`。其他宿主先查对应官方入口，不为图标换框架、不把 React 组件塞进 Vue。
- `icon` 接收图形数据，不是组件实例。例如官方 Lucide 路径使用 `lucide` 的数据导出，不把 `lucide-react` 或 `lucide-vue-next` 的组件当数据传入。实际导出、宿主兼容条件及参数以锁文件、类型与对应版本官方文档为准。
- 先复用已有 Morphicons 接入与图形数据，缺失时才按业务项目的包管理器添加需要的依赖并更新锁文件。同类图标统一图形系列、尺寸、描边、颜色和对齐；接入 shadcn/ui 时保留按钮、焦点、ARIA 和状态逻辑，仅在授权范围替换图标渲染。不要全库导入、整库复制或为了图标重新初始化组件库。
- 不用 Emoji、临时手绘路径或未经同意的另一图标组件库顶替缺失图标。找不到合适图形、版本不兼容、资源或许可缺失时先查已有资料，再提出具体阻塞问题；不得假装已接入。品牌标识、复杂填充图形或要求原样保留的资源不能硬改成描边版本，无法同时满足时暂停该处并澄清。

### 原貌、可访问性与速度边界

- **原样迁移保留原图标与原交互。** 未明确要求更换时，不为统一库而改变形状、大小、布局或动效；可先评估以相同图形数据接入，无法等价保持就保留基线并询问冲突。当前更具体的保留要求优先，本条不授权全项目批量替换或重新设计。
- 统一用库不等于所有图标都要动画。只有真实状态切换需要且未违反保留要求时才变形，不自动循环、不阻塞点击。动效显式设置 `reducedMotion="user"` 尊重系统偏好；禁止动画或必须保持静态时使用已核实版本的 `reducedMotion="always"` 或等价静态方式，不能假定库默认尊重减少动画偏好。
- 图标按钮必须有可访问名称；装饰图标不重复朗读。验证键盘、焦点、主题、不同尺寸、减少动画和状态切换；涉及服务端渲染时检查初始 SVG 与客户端一致。构建通过不等于视觉或交互已经验收。
- 保留 Morphicons 及所用图形数据各自的许可证要求；不得把官网 MIT 标注理解为所有外部素材都采用相同许可。
- **安装技能不安装业务依赖。** 本仓库只保存规则，不把 `morphicons` 装进技能，不增加 MCP、后台服务或每轮联网取图。规则随现有前端批量读取一起返回；业务项目按需导入，静态图标不制造持续动画或额外模型调用。

技术事实核对于 2026-09-06，来源：[官网 AI 使用说明](https://www.morphicons.com/llms.txt)、[完整说明](https://www.morphicons.com/llms-full.txt)、[官方源码](https://github.com/guillermolg00/morphicons)。接入前确认项目实际版本，不按日期强制升级。

'''
stack = 'skills/production-engineering/references/frontend-stack.md'
replace(stack, '## 不变的原规范\n', policy + '## 不变的原规范\n')
replace(stack, '本修改只替换上述技术栈默认值，其他要求继续执行：',
        '本修改只替换上述技术栈与图标默认方案（含原稿第九章的旧图标选择），其他要求继续执行：')
entry = 'skills/production-engineering/SKILL.md'
replace(entry, '无宿主用 React + Vite，详见 `references/frontend-stack.md`。',
        '无宿主用 React + Vite；图标统一 Morphicons，原样迁移不擅换，详见 `references/frontend-stack.md`。')
old = '无相反要求的新设计用 shadcn/ui + Tailwind CSS，默认栈不得覆盖指定框架或源码原貌。'
new = '无相反要求的新设计用 shadcn/ui + Tailwind CSS，图标统一 Morphicons；默认栈不得覆盖指定框架或源码原貌。'
for name in ['global-AGENTS.example.md', 'docs/personal-custom-instructions.md']:
    replace(name, old, new)
readme_note = '''## 图标统一方案

图标统一通过 [Morphicons](https://www.morphicons.com/) 接入；它负责描边 SVG 的渲染与变形，图形数据仍可来自官网兼容的 Lucide、Tabler、Heroicons 等来源，不是只改一个依赖名称。React、Vue 和普通 JavaScript 按真实框架选择官方入口，不为图标迁移框架。完整边界见[前端选型中的图标规则](skills/production-engineering/references/frontend-stack.md#图标统一使用-morphicons)。

新设计与授权新增/替换的图标执行统一方案；原样迁移不擅自改变旧图标、样式或交互。不强制增加动画，明确处理减少动画偏好；找不到兼容图形或确实与保留要求冲突时，先查证再问，不偷换其他库。

AI 安装或升级技能时，同步更新前端规则和个性化短块中的 Morphicons 要求，但**不安装业务依赖**、不改当前业务项目、不另加后台服务。实际开发需要时才在目标业务项目接入，具体版本与许可证按对应来源核实。这里的规则检查不等于已在用户项目验证实际图标效果。

'''
replace('README.md', '## 减少实际等待\n', readme_note + '## 减少实际等待\n')
# 原文、读取器、迁移门禁均不改；扩展已有测试文件，由主自检自动运行。
tests = r'''

test('前端各读取路径都携带 Morphicons 图标规则且只附带一次', () => {
  for (const args of [
    ['--topic', '前端'],
    ['--id', '09-00'],
    ['--id', '09-00', '--source', '补充稿'],
    ['--stage', '实现', '--topic', '前端,接口'],
  ]) {
    const out = reader.readBatch(reader.parse(args));
    const rules = Array.isArray(out) ? out : out.rules;
    const frontend = rules.find(e => e.id === '09-00');
    assert.equal(frontend.amendments.length, 1);
    const policy = frontend.amendments[0].text;
    assert.equal(policy, raw('frontend-stack.md'));
    assert.equal(policy.split('## 图标统一使用 Morphicons').length - 1, 1);
    assert.match(policy, /https:\/\/www\.morphicons\.com\//);
    assert.equal(frontend.text, raw(frontend.file), '历史原文保持原样');
  }
});

test('图标文案区分数据和组件，遵守真实宿主与无障碍边界', () => {
  const policy = raw('frontend-stack.md');
  for (const value of ['图标数据与渲染库', 'morphicons/react', 'morphicons/vue', 'morphicons/dom',
    '不是组件实例', 'lucide-react', 'reducedMotion="user"', 'reducedMotion="always"',
    '原样迁移保留原图标与原交互', '不授权全项目批量替换']) {
    assert.ok(policy.includes(value), `图标规则缺少：${value}`);
  }
  assert.match(policy, /不得假装已接入/);
  assert.match(policy, /先查已有资料，再提出具体阻塞问题/);
  assert.match(policy, /各自的许可证/);
});

test('入口、自述文件与个人模板同时包含图标方案，短模板保持一致', () => {
  for (const file of ['README.md', 'global-AGENTS.example.md', 'docs/personal-custom-instructions.md',
    'skills/production-engineering/SKILL.md']) {
    assert.match(fs.readFileSync(path.join(root, file), 'utf8'), /Morphicons/);
  }
  const global = fs.readFileSync(path.join(root, 'global-AGENTS.example.md'), 'utf8').trim();
  const personal = fs.readFileSync(path.join(root, 'docs/personal-custom-instructions.md'), 'utf8');
  assert.equal(personal.match(/```markdown\n([\s\S]*?)\n```/)[1].trim(), global);
  assert.ok(Buffer.byteLength(global) <= 1800);
  assert.ok(Buffer.byteLength(fs.readFileSync(path.join(skill, 'SKILL.md'))) <= 6000);
});

test('图标规则不注入非前端读取，不增加技能运行依赖', () => {
  const out = reader.readBatch(reader.parse(['--stage', '只读', '--topic', '接口']));
  assert.doesNotMatch(JSON.stringify(out), /Morphicons|morphicons\//);
  const policy = raw('frontend-stack.md');
  assert.match(policy, /安装技能不安装业务依赖/);
  assert.match(policy, /不增加 MCP、后台服务或每轮联网取图/);
  assert.match(policy, /规则随现有前端批量读取一起返回/);
});
'''
texts['tests/frontend-stack.test.js'] += tests
for name, text in texts.items():
    if name == entry and len(text.encode()) > 6000:
        raise SystemExit('入口超出原体积预算，不写入')
    if name == 'global-AGENTS.example.md' and len(text.encode()) > 1800:
        raise SystemExit('短模板超出原体积预算，不写入')
for name, text in texts.items():
    (root / name).write_text(text, encoding='utf-8')
    print(f'已更新：{name}（{len(text.encode())} 字节）')
