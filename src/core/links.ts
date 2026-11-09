export const APP_PUBLIC_URL = 'https://app.redija.com.br';
export const APP_DOCS_URL = 'https://app.redija.com.br/docs';
export const GITHUB_REPO_URL = 'https://github.com/Candeias-Vinicius/redija-app';
export const GITHUB_ISSUES_URL = 'https://github.com/Candeias-Vinicius/redija-app/issues';
export const GITHUB_CONTRIBUTING_URL =
  'https://github.com/Candeias-Vinicius/redija-app/blob/develop/CONTRIBUTING.md';
export const GITHUB_LICENSE_URL =
  'https://github.com/Candeias-Vinicius/redija-app/blob/main/LICENSE';
export const GITHUB_THIRD_PARTY_NOTICES_URL =
  'https://github.com/Candeias-Vinicius/redija-app/blob/develop/THIRD_PARTY_NOTICES.md';

export interface DeveloperProfile {
  name: string;
  role: string;
  githubUrl: string;
  linkedinUrl: string;
}

export const DEVELOPERS: DeveloperProfile[] = [
  {
    name: 'Vinícius Candeias',
    role: 'Engenharia de Software',
    githubUrl: 'https://github.com/Candeias-Vinicius',
    linkedinUrl: 'https://www.linkedin.com/in/candeias-vinicius',
  },
  {
    name: 'Elias Reis',
    role: 'Sistemas de Informação',
    githubUrl: 'https://github.com/EliasReis13',
    linkedinUrl: 'https://www.linkedin.com/in/elias-reis-/',
  },
  {
    name: 'Rodrigo Fernandes',
    role: 'Análise e Desenvolvimento de Sistemas',
    githubUrl: 'https://github.com/DigoFernandes',
    linkedinUrl: 'https://www.linkedin.com/in/sfernandes-rodrigo/',
  },
];
