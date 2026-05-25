#!/usr/bin/env node
'use strict';

const fs = require('fs-extra');
const path = require('path');

const {
  parseAllAgents,
  normalizeCommands,
  getVisibleCommands,
} = require('../../.aiox-core/infrastructure/scripts/ide-sync/agent-parser');

const AGENTS_DIR = path.join(process.cwd(), '.aiox-core', 'development', 'agents');
const SKILLS_DIR = path.join(process.cwd(), '.agents', 'skills');

const ICONS = {
  architect: 'architect',
  dev: 'dev',
  qa: 'qa',
  pm: 'pm',
  po: 'po',
  sm: 'sm',
  analyst: 'analyst',
  'data-engineer': 'data-engineer',
  devops: 'devops',
  'ux-design-expert': 'ux-design-expert',
  'squad-creator': 'squad-creator',
  'aiox-master': 'aiox-master',
};

function trimText(text, max = 200) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= max) return normalized;
  return normalized.slice(0, max - 3).trim() + '...';
}

function getSkillId(agentId) {
  const id = String(agentId || '').trim();
  if (id.startsWith('aiox-')) return id;
  return 'aiox-' + id;
}

function getTitle(agentData) {
  const agent = agentData.agent || {};
  return agent.title || agentData.id || 'AIOX Agent';
}

function getIcon(agentData) {
  const icons = {
    architect: '\u{1F3D7}\uFE0F',
    dev: '\u{1F4BB}',
    qa: '\u{1F9EA}',
    pm: '\u{1F4CB}',
    po: '\u{1F4E6}',
    sm: '\u{1F504}',
    analyst: '\u{1F50D}',
    'data-engineer': '\u{1F5C4}\uFE0F',
    devops: '\u{2699}\uFE0F',
    'ux-design-expert': '\u{1F3A8}',
    'squad-creator': '\u{1F465}',
    'aiox-master': '\u{1F31F}',
  };
  return icons[agentData.id] || '\u{1F916}';
}

function getDescription(agentData) {
  const agent = agentData.agent || {};
  const whenToUse = agent.whenToUse || '';
  const title = getTitle(agentData);
  const name = agent.name || agentData.id;
  let desc = title + ' (' + name + ')';
  if (whenToUse) {
    desc += '. ' + trimText(whenToUse, 160);
  }
  return trimText(desc, 220);
}

function getStyle(persona) {
  const style = persona && persona.style ? persona.style : '';
  if (style) return trimText(style, 120);
  return 'Concise, professional, detail-oriented';
}

function getSignature(persona) {
  const comm = persona && persona.communication ? persona.communication : {};
  return comm.signature_closing || '';
}

function getBlockedOps(yaml) {
  if (!yaml) return null;
  const git = yaml.git_restrictions || yaml['git_restrictions'];
  if (!git) return null;
  const ops = git.blocked_operations || git['blocked_operations'];
  if (!ops || !Array.isArray(ops)) return null;
  return ops.map(function(o) { return '- `' + o + '`'; }).join('\n');
}

function buildSkillContent(agentData) {
  const agent = agentData.agent || {};
  const name = agent.name || agentData.id;
  const title = getTitle(agentData);
  const icon = getIcon(agentData);
  const whenToUse = agent.whenToUse || 'Use @' + agentData.id + ' for specialized tasks.';
  const persona = agentData.persona_profile || {};
  const comm = persona.communication || {};
  const tone = comm.tone || 'professional';
  const style = getStyle(persona);
  const sig = getSignature(persona);

  const allCommands = normalizeCommands(agentData.commands || []);
  const keyCmds = getVisibleCommands(allCommands, 'key');
  const quickCmds = getVisibleCommands(allCommands, 'quick');
  const topCmds = keyCmds.slice(0, 12);
  for (var i = 0; i < quickCmds.length && topCmds.length < 12; i++) {
    if (!topCmds.some(function(k) { return k.name === quickCmds[i].name; })) {
      topCmds.push(quickCmds[i]);
    }
  }

  var commandsList;
  if (topCmds.length > 0) {
    commandsList = topCmds.map(function(c) {
      return '- `*' + c.name + '` — ' + (c.description || '');
    }).join('\n');
  } else {
    commandsList = '- `*help` — Show available commands';
  }

  var collaboration = agentData.sections && agentData.sections.collaboration
    ? agentData.sections.collaboration : '';

  var skillId = getSkillId(agentData.id);
  var description = getDescription(agentData);
  var yaml = agentData.yaml || {};
  var blockedOps = getBlockedOps(yaml);

  return '---\n' +
    'name: ' + skillId + '\n' +
    'description: ' + description + '\n' +
    'metadata:\n' +
    '  source: aiox-core\n' +
    '  version: "5.0.4"\n' +
    '  icon: ' + icon + '\n' +
    '---\n' +
    '\n' +
    '# ' + icon + ' AIOX ' + title + ' (' + name + ')\n' +
    '\n' +
    '## When To Use\n' +
    '\n' +
    whenToUse + '\n' +
    '\n' +
    '## Activation\n' +
    '\n' +
    '1. Load `.aiox-core/development/agents/' + agentData.filename + '` as source of truth (fallback: `.codex/agents/' + agentData.filename + '`).\n' +
    '2. Adopt the persona: ' + tone + ' tone, style: ' + style + '.\n' +
    '3. Generate greeting via `node .aiox-core/development/scripts/generate-greeting.js ' + agentData.id + '` and show it first.\n' +
    '4. Stay in this persona until the user asks to switch or exit.\n' +
    '\n' +
    '## Key Commands\n' +
    '\n' +
    commandsList + '\n' +
    '\n' +
    '## Behavior\n' +
    '\n' +
    '- **Style**: ' + tone + ', concise, detail-oriented\n' +
    '- **Focus**: Execute tasks with precision, maintain minimal context overhead\n' +
    (sig ? '- **Sign-off**: ' + sig + '\n' : '') +
    (blockedOps ? '- **Cannot perform**:\n' + blockedOps + '\n' : '- **Cannot**: push or create PRs (use @devops)\n') +
    '\n' +
    '## Story-Driven Workflow\n' +
    '\n' +
    '- Always work from stories in `docs/stories/`\n' +
    '- Follow acceptance criteria and task checkboxes\n' +
    '- Update story progress as you go\n' +
    '- Run quality gates before marking complete: lint \u2192 typecheck \u2192 test\n' +
    '\n' +
    '## Quality Gates (required before completion)\n' +
    '\n' +
    '- `npm run lint` \u2014 Must pass without errors\n' +
    '- `npm run typecheck` \u2014 Must pass without errors\n' +
    '- `npm test` \u2014 Must pass without failures\n' +
    '- `npm run build` \u2014 Must complete successfully\n' +
    (collaboration ? '\n## Collaboration\n\n' + collaboration + '\n' : '') +
    '\n## Non-Negotiables\n' +
    '\n' +
    '- Follow `.aiox-core/constitution.md`\n' +
    '- Execute workflows/tasks only from declared dependencies\n' +
    '- Do not invent requirements outside the project artifacts\n' +
    '- Do not execute blocked git operations \u2014 delegate to @devops\n';
}

function buildSkillPlan(agents, skillsDir) {
  return agents
    .filter(function(a) { return !a.error || a.error === 'YAML parse failed, using fallback extraction'; })
    .map(function(agentData) {
      var skillId = getSkillId(agentData.id);
      var targetDir = path.join(skillsDir, skillId);
      var targetFile = path.join(targetDir, 'SKILL.md');
      return {
        agentId: agentData.id,
        skillId: skillId,
        targetDir: targetDir,
        targetFile: targetFile,
        content: buildSkillContent(agentData),
      };
    });
}

function writeSkillPlan(plan, options) {
  var count = 0;
  for (var i = 0; i < plan.length; i++) {
    var item = plan[i];
    if (!options.dryRun) {
      try {
        fs.ensureDirSync(item.targetDir);
        fs.writeFileSync(item.targetFile, item.content, 'utf8');
        count++;
        if (!options.quiet) {
          console.log('  \u2705 ' + item.skillId);
        }
      } catch (error) {
        console.error('  \u274C ' + item.skillId + ': ' + error.message);
      }
    }
  }
  return count;
}

function syncSkills(options) {
  options = options || {};
  var sourceDir = options.sourceDir || AGENTS_DIR;
  var skillsDir = options.skillsDir || SKILLS_DIR;
  var dryRun = options.dryRun || false;
  var quiet = options.quiet || false;

  if (!quiet) {
    console.log('\n\uD83D\uDD0D Scanning agents in: ' + sourceDir);
  }

  var agents = parseAllAgents(sourceDir);

  if (agents.length === 0) {
    console.error('\u274C No agent files found!');
    return { generated: 0 };
  }

  if (!quiet) {
    console.log('\uD83D\uDCCB Found ' + agents.length + ' agent definitions');
  }

  var plan = buildSkillPlan(agents, skillsDir);

  if (!quiet) {
    console.log('\n\uD83D\uDCDD Generating ' + plan.length + ' opencode skills in ' + skillsDir + ':');
  }

  var written = writeSkillPlan(plan, { dryRun: dryRun, quiet: quiet });

  return {
    generated: written,
    skillsDir: skillsDir,
    dryRun: dryRun,
  };
}

function parseArgs(argv) {
  argv = argv || process.argv.slice(2);
  var args = new Set(argv);
  return {
    dryRun: args.has('--dry-run') || args.has('-n'),
    quiet: args.has('--quiet') || args.has('-q'),
  };
}

function main() {
  var options = parseArgs();
  var result = syncSkills(options);

  if (!options.quiet) {
    console.log('\n\u2705 Generated ' + result.generated + ' opencode skills in ' + result.skillsDir);
    if (result.dryRun) {
      console.log('\u2139\uFE0F  Dry-run mode: no files written');
    }
    console.log();
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  buildSkillContent: buildSkillContent,
  buildSkillPlan: buildSkillPlan,
  syncSkills: syncSkills,
  parseArgs: parseArgs,
};
