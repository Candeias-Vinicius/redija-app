// =====================================================================
// RedijaApp — Sincroniza o responsável do épico com as histórias dele
// =====================================================================
//
// Regra: quem é dono do épico (issue com a label `epic`) é dono de todas
// as histórias abertas dele (sub-issues).
//
// - `issues.assigned` em um épico   → adiciona a pessoa às histórias abertas.
// - `issues.unassigned` em um épico → remove a pessoa das histórias abertas.
// - `workflow_dispatch`             → copia os responsáveis atuais de um épico
//   (ou de todos os épicos abertos) para as histórias abertas. Use quando uma
//   história nova entrar num épico que já tem dono.
//
// Histórias fechadas nunca são alteradas, para preservar quem as implementou.
// Com DRY_RUN=true nada é alterado: o script só registra o que faria.
//
// Executado por .github/workflows/epic-assignees.yml via actions/github-script.

const EPIC_LABEL = 'epic';

const labelName = (label) => (typeof label === 'string' ? label : label.name);
const isEpic = (issue) => (issue.labels || []).some((l) => labelName(l) === EPIC_LABEL);

async function listOpenSubIssues(github, owner, repo, issueNumber) {
  const subs = await github.paginate('GET /repos/{owner}/{repo}/issues/{issue_number}/sub_issues', {
    owner,
    repo,
    issue_number: issueNumber,
    per_page: 100,
  });
  return subs.filter((s) => s.state === 'open');
}

async function syncEpic({ github, core, owner, repo, epicNumber, add = [], remove = [], dryRun }) {
  const subs = await listOpenSubIssues(github, owner, repo, epicNumber);
  const changes = [];

  for (const sub of subs) {
    const current = (sub.assignees || []).map((a) => a.login);
    const toAdd = add.filter((login) => !current.includes(login));
    const toRemove = remove.filter((login) => current.includes(login));

    if (toAdd.length) {
      if (!dryRun) {
        await github.request('POST /repos/{owner}/{repo}/issues/{issue_number}/assignees', {
          owner,
          repo,
          issue_number: sub.number,
          assignees: toAdd,
        });
      }
      changes.push(`#${sub.number}: +${toAdd.join(', +')}`);
    }

    if (toRemove.length) {
      if (!dryRun) {
        await github.request('DELETE /repos/{owner}/{repo}/issues/{issue_number}/assignees', {
          owner,
          repo,
          issue_number: sub.number,
          assignees: toRemove,
        });
      }
      changes.push(`#${sub.number}: -${toRemove.join(', -')}`);
    }
  }

  const prefix = dryRun ? '[simulação] ' : '';
  const header = `${prefix}Épico #${epicNumber}`;
  if (changes.length === 0) {
    core.info(`${header}: ${subs.length} histórias abertas já estão sincronizadas.`);
  } else {
    core.info(`${header}: ${changes.length} alteração(ões), ${subs.length} histórias abertas.`);
    changes.forEach((c) => core.info(`  ${prefix}${c}`));
  }
  return changes;
}

module.exports = async ({ github, context, core }) => {
  const { owner, repo } = context.repo;
  const dryRun = String(process.env.DRY_RUN || '').toLowerCase() === 'true';

  // Atribuição ou remoção de responsável em uma issue.
  if (context.eventName === 'issues') {
    const { issue, assignee, action } = context.payload;
    if (!isEpic(issue)) {
      core.info(`#${issue.number} não é um épico (sem a label "${EPIC_LABEL}"). Nada a fazer.`);
      return;
    }
    if (!assignee || !assignee.login) {
      core.info('Evento sem responsável informado. Nada a fazer.');
      return;
    }
    await syncEpic({
      github,
      core,
      owner,
      repo,
      epicNumber: issue.number,
      add: action === 'assigned' ? [assignee.login] : [],
      remove: action === 'unassigned' ? [assignee.login] : [],
      dryRun,
    });
    return;
  }

  // Execução manual: ressincroniza um épico específico ou todos os abertos.
  if (context.eventName === 'workflow_dispatch') {
    const requested = String(context.payload.inputs?.epic || '').replace('#', '').trim();
    let epics;
    if (requested) {
      const { data } = await github.request('GET /repos/{owner}/{repo}/issues/{issue_number}', {
        owner,
        repo,
        issue_number: Number(requested),
      });
      if (!isEpic(data)) {
        core.setFailed(`#${requested} não é um épico (sem a label "${EPIC_LABEL}").`);
        return;
      }
      epics = [data];
    } else {
      const all = await github.paginate('GET /repos/{owner}/{repo}/issues', {
        owner,
        repo,
        labels: EPIC_LABEL,
        state: 'open',
        per_page: 100,
      });
      epics = all.filter((i) => !i.pull_request);
    }

    for (const epic of epics) {
      const owners = (epic.assignees || []).map((a) => a.login);
      if (owners.length === 0) {
        core.info(`Épico #${epic.number} sem responsável. Ignorado.`);
        continue;
      }
      await syncEpic({ github, core, owner, repo, epicNumber: epic.number, add: owners, dryRun });
    }
    return;
  }

  core.info(`Evento "${context.eventName}" não tratado.`);
};
