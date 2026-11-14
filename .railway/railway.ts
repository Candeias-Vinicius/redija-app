/**
 * Infraestrutura do RedijaApp no Railway (Infrastructure as Code).
 *
 * Só o serviço de importação (Pandoc) roda no Railway; o front fica na Vercel.
 * Este arquivo é lido apenas pela CLI do Railway — nunca durante os deploys:
 *
 *   railway link            # escolha o projeto e o ambiente (production ou dev)
 *   railway config plan     # mostra o que vai mudar, sem aplicar
 *   railway config apply    # aplica (pede confirmação)
 *
 * Passo a passo completo em server/README.md.
 */
import { defineRailway, github, project, service } from 'railway/iac';

const REPO = 'Candeias-Vinicius/redija-app';

/** Origens do front liberadas no CORS de cada ambiente. */
const FRONT_ORIGINS = {
  production: ['https://app.redija.com.br'],
  dev: ['https://dev.redija.com.br', 'http://localhost:3000', 'http://localhost:5173'],
};

export default defineRailway((ctx) => {
  const prod = ctx.isEnvironment('production');

  const importService = service('redija-import', {
    // production acompanha a main; dev acompanha a develop
    source: github(REPO, { branch: prod ? 'main' : 'develop', rootDirectory: 'server' }),
    build: {
      builder: 'DOCKERFILE',
      // Só rebuilda quando algo em server/ muda (pushes que só mexem no front não geram deploy)
      watchPatterns: ['/server/**'],
    },
    deploy: {
      healthcheckPath: '/health',
      healthcheckTimeout: 60,
      restartPolicyType: 'ON_FAILURE',
      restartPolicyMaxRetries: 5,
      // App Sleeping: dorme sem tráfego e acorda na próxima importação (alguns segundos a mais)
      sleepApplication: true,
      // Teto de memória para um documento gigante não estourar o custo
      limitOverride: { containers: { memoryBytes: 1024 * 1024 * 1024 } },
    },
    // Exigem um CNAME no DNS de redija.com.br apontando para o alvo que o Railway mostrar
    domains: [prod ? 'api.redija.com.br' : 'api-dev.redija.com.br'],
    env: {
      // Mesma porta para a qual o domínio próprio encaminha o tráfego
      PORT: '8080',
      ALLOWED_ORIGINS: (prod ? FRONT_ORIGINS.production : FRONT_ORIGINS.dev).join(','),
    },
  });

  return project(ctx.projectName ?? 'redija', { resources: [importService] });
});
